import { randomUUID } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { db } from "@/lib/db";
import { LocalSandboxDriver } from "@/lib/execution/drivers/local";
import { RemoteSandboxDriver } from "@/lib/execution/drivers/remote";
import { judge } from "@/lib/execution/judge";
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
export type { SandboxJob, SandboxTestCase } from "@/lib/execution/types";

let driver: SandboxDriver | null = null;

export function getSandboxDriver(): SandboxDriver {
  if (driver) return driver;
  driver =
    serverEnv.executionDriver === "remote" || serverEnv.executionServiceUrl
      ? new RemoteSandboxDriver()
      : new LocalSandboxDriver();
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
  const job: SandboxJob = { jobId: randomUUID(), language, code, testCases, limits };
  return executionQueue.push(async () => {
    const sandbox = await getSandboxDriver().run(job);
    return judge(job, sandbox, { revealHidden: true });
  });
}

export function sandboxStatus() {
  return {
    driver: getSandboxDriver().name,
    queue: executionQueue.stats,
    isolated: getSandboxDriver().name === "remote",
  };
}
