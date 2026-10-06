import { randomUUID } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { db } from "@/lib/db";
import { LocalSandboxDriver } from "@/lib/execution/drivers/local";
import { RemoteSandboxDriver } from "@/lib/execution/drivers/remote";
import { PistonSandboxDriver } from "@/lib/execution/drivers/piston";
import { WandboxSandboxDriver } from "@/lib/execution/drivers/wandbox";
import { judge } from "@/lib/execution/judge";
import { ExecutionUnavailableError } from "@/lib/execution/errors";
import { executionQueue } from "@/lib/execution/queue";
import type {
  SandboxDriver,
  SandboxJob,
  SandboxLimits,
  SandboxTestCase,
} from "@/lib/execution/types";
import type { ExecutionOutcome } from "@/types";
import type { ExecutionMode, Language } from "@/generated/prisma/enums";

export { judge, scoreSubmission, normalizeOutput, outputMatches } from "@/lib/execution/judge";
export { ExecutionUnavailableError } from "@/lib/execution/errors";
export type { SandboxJob, SandboxTestCase } from "@/lib/execution/types";

export type ExecutionDriverName = "local" | "remote" | "piston" | "wandbox" | "none";

/**
 * Picks the judge backend.
 *
 * - Dedicated Docker worker (`EXECUTION_SERVICE_URL` / `remote`) always wins.
 * - Production uses Piston when configured, otherwise the public Wandbox API.
 * - Local development uses the host toolchain unless a remote driver is selected.
 */
export function resolveExecutionDriver(): ExecutionDriverName {
  const configured = serverEnv.executionDriver;
  if (configured === "none" || configured === "off" || configured === "disabled") {
    return "none";
  }
  if (configured === "remote" || Boolean(serverEnv.executionServiceUrl)) {
    return "remote";
  }
  if (configured === "wandbox") return "wandbox";
  const publicPiston =
    serverEnv.pistonUrl.replace(/\/$/, "") === "https://emkc.org/api/v2/piston";
  if (configured === "piston") {
    return publicPiston && !serverEnv.pistonApiKey ? "wandbox" : "piston";
  }
  if (serverEnv.isProduction) {
    return publicPiston && !serverEnv.pistonApiKey ? "wandbox" : "piston";
  }
  return "local";
}

/**
 * Whether code can actually be executed here.
 *
 * The local driver compiles and runs programs on the host with a stripped
 * environment and hard limits. That is fine on a developer machine and is
 * refused in production on purpose — it shares the kernel and filesystem with
 * the app, so it is not a security boundary.
 *
 * Production uses Piston when its endpoint is configured, and falls back to
 * Wandbox when the public Piston API key is absent.
 */
export function executionAvailability(): { available: boolean; reason?: string } {
  const driver = resolveExecutionDriver();
  if (driver === "none") {
    return {
      available: false,
      reason: "Code execution is disabled (EXECUTION_DRIVER=none).",
    };
  }
  if (driver === "remote") {
    if (!serverEnv.executionServiceUrl) {
      return {
        available: false,
        reason:
          "Code execution is configured to use the sandbox service, but EXECUTION_SERVICE_URL is not set.",
      };
    }
    return { available: true };
  }
  return { available: true };
}

/** Throws the typed error when execution is impossible here. */
export function assertExecutionAvailable() {
  const { available, reason } = executionAvailability();
  if (!available) throw new ExecutionUnavailableError(reason!);
}

let driver: SandboxDriver | null = null;

export function getSandboxDriver(): SandboxDriver {
  if (driver) return driver;
  const name = resolveExecutionDriver();
  if (name === "remote") driver = new RemoteSandboxDriver();
  else if (name === "piston") driver = new PistonSandboxDriver();
  else if (name === "wandbox") driver = new WandboxSandboxDriver();
  else driver = new LocalSandboxDriver();
  return driver;
}

export function limitsFor(timeLimitMs: number, memoryLimitMb: number): SandboxLimits {
  return {
    timeoutMs: Math.min(timeLimitMs, serverEnv.executionTimeoutMs),
    memoryMb: Math.min(memoryLimitMb, serverEnv.executionMemoryMb),
    outputLimitBytes: serverEnv.executionOutputLimitBytes,
    processLimit: 64,
  };
}

export interface CreateExecutionInput {
  userId: string;
  mode: ExecutionMode;
  language: Language;
  code: string;
  testCases: SandboxTestCase[];
  limits: SandboxLimits;
  questionId?: string;
  universityQuestionId?: string;
  revealHidden?: boolean;
}

/**
 * Creates the execution record, queues the sandbox job and resolves once the
 * verdict is stored. Callers that want to stream progress poll the row by id.
 */
export async function createAndRunExecution(
  input: CreateExecutionInput,
): Promise<{ executionId: string; outcome: ExecutionOutcome }> {
  // Checked before the row is created, so a deployment that cannot execute
  // does not accumulate FAILED executions nobody asked for.
  assertExecutionAvailable();

  const execution = await db.codeExecution.create({
    data: {
      userId: input.userId,
      mode: input.mode,
      language: input.language,
      code: input.code,
      questionId: input.questionId,
      universityQuestionId: input.universityQuestionId,
      status: "QUEUED",
      totalTests: input.testCases.length,
    },
    select: { id: true },
  });

  const job: SandboxJob = {
    jobId: randomUUID(),
    language: input.language,
    code: input.code,
    testCases: input.testCases,
    limits: input.limits,
  };

  try {
    const outcome = await executionQueue.push(async () => {
      await db.codeExecution.update({
        where: { id: execution.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });
      const sandbox = await getSandboxDriver().run(job);
      return judge(job, sandbox, { revealHidden: input.revealHidden });
    });

    await db.codeExecution.update({
      where: { id: execution.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        verdict: outcome.verdict,
        passedTests: outcome.passedTests,
        totalTests: outcome.totalTests,
        runtimeMs: outcome.runtimeMs,
        memoryKb: outcome.memoryKb,
        compileLog: outcome.compileLog,
        stderr: outcome.stderr,
        results: outcome.results as never,
        workerId: getSandboxDriver().name,
      },
    });

    return { executionId: execution.id, outcome };
  } catch (error) {
    await db.codeExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        verdict: "INTERNAL_ERROR",
        stderr: (error as Error).message.slice(0, 1000),
      },
    });
    throw error;
  }
}

/** Runs a job without persisting anything — used by the AI validation pipeline. */
export async function runEphemeral(
  language: Language,
  code: string,
  testCases: SandboxTestCase[],
  limits: SandboxLimits,
): Promise<ExecutionOutcome> {
  assertExecutionAvailable();

  const job: SandboxJob = { jobId: randomUUID(), language, code, testCases, limits };
  return executionQueue.push(async () => {
    const sandbox = await getSandboxDriver().run(job);
    return judge(job, sandbox, { revealHidden: true });
  });
}

export function sandboxStatus() {
  const { available, reason } = executionAvailability();
  const name = resolveExecutionDriver();
  if (name === "none") {
    return {
      driver: "none" as const,
      queue: executionQueue.stats,
      isolated: false,
      available,
      ...(reason ? { reason } : {}),
    };
  }
  return {
    driver: getSandboxDriver().name,
    queue: executionQueue.stats,
    isolated:
      getSandboxDriver().name === "remote" ||
      getSandboxDriver().name === "piston" ||
      getSandboxDriver().name === "wandbox",
    available,
    ...(reason ? { reason } : {}),
  };
}
