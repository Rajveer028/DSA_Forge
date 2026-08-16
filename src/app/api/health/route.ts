import { NextResponse } from "next/server";
import { envStatus } from "@/lib/env";
import { pingDatabase } from "@/lib/db";
import { sandboxStatus } from "@/lib/execution";
import { isAIConfigured } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public readiness probe. It reports which subsystems are configured but never
 * leaks a value: booleans only, no URLs, no keys.
 */
export async function GET() {
  const env = envStatus();
  const database = env.database ? await pingDatabase() : false;

  let sandbox: ReturnType<typeof sandboxStatus> | null = null;
  try {
    sandbox = sandboxStatus();
  } catch {
    sandbox = null;
  }

  const ready = database && env.auth;

  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      checks: {
        database: {
          configured: env.database,
          reachable: database,
          // Names the single most common deployment mistakes without printing
          // the URL, which carries credentials. "unset" is its own case: an
          // empty string is not a file path, and calling it "remote" sent people
          // looking for a network problem that did not exist.
          kind: !env.databaseUrl ? "unset" : env.databaseIsFile ? "file" : "remote",
        },
        auth: { configured: env.auth, sessionSecret: env.sessionSecretConfigured },
        ai: { configured: isAIConfigured() },
        execution: {
          driver: sandbox?.driver ?? "unavailable",
          isolated: sandbox?.isolated ?? false,
          // Whether code can actually be run here, and why not when it cannot.
          available: sandbox?.available ?? false,
          ...(sandbox?.reason ? { reason: sandbox.reason } : {}),
          queue: sandbox?.queue ?? null,
        },
      },
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  );
}
