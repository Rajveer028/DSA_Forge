import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/session";
import { RateLimitError } from "@/lib/rate-limit";
import { QueueOverflowError } from "@/lib/execution/queue";
import { ExecutionUnavailableError } from "@/lib/execution/errors";
import { AIRequestError, AIUnavailableError } from "@/lib/ai/provider";
import { MissingEnvError } from "@/lib/env";

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

/** Maps every known failure mode onto an honest status + user-readable message. */
export function apiError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? "That request was not valid.",
        code: "VALIDATION_ERROR",
        details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message, code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message, code: "FORBIDDEN" }, { status: 403 });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, code: "RATE_LIMITED" },
      { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } },
    );
  }
  if (error instanceof QueueOverflowError) {
    return NextResponse.json({ error: error.message, code: "QUEUE_FULL" }, { status: 429 });
  }
  if (error instanceof ExecutionUnavailableError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  if (error instanceof AIUnavailableError) {
    return NextResponse.json({ error: error.message, code: "AI_UNAVAILABLE" }, { status: 503 });
  }
  if (error instanceof AIRequestError) {
    return NextResponse.json({ error: error.message, code: "AI_ERROR" }, { status: 502 });
  }
  if (error instanceof MissingEnvError) {
    return NextResponse.json(
      { error: error.message, code: "CONFIG_ERROR" },
      { status: 503 },
    );
  }

  const message = error instanceof Error ? error.message : "Something went wrong.";
  if (/prisma|database|connect|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    console.error("[db]", error);
    return NextResponse.json(
      {
        error: "The database is unreachable right now. Check DATABASE_URL and try again.",
        code: "DATABASE_ERROR",
      },
      { status: 503 },
    );
  }

  console.error("[api]", error);
  return NextResponse.json(
    { error: "Something went wrong on our side. Please try again.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Wraps a route handler so every thrown error becomes a typed JSON response. */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
      }
      return apiError(error);
    }
  };
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
