import { serverEnv } from "@/lib/env";
import { LANGUAGE_SPECS } from "@/lib/execution/languages";
import type {
  SandboxCaseOutcome,
  SandboxDriver,
  SandboxJob,
  SandboxResult,
} from "@/lib/execution/types";
import type { Language } from "@/generated/prisma/enums";

/**
 * Production-safe compiler that does not need Docker on the web host.
 *
 * Vercel (and similar serverless hosts) cannot run gcc/javac. This driver posts
 * each job to a Piston API — the same protocol used by the public
 * https://emkc.org/api/v2/piston instance, or any self-hosted Piston server
 * via PISTON_URL.
 *
 * Student code never runs inside the Next.js process. Isolation is whatever
 * the Piston host provides (containers). Prefer a self-hosted instance for
 * exams. Set PISTON_API_KEY to use the public service, or PISTON_URL to use your own instance.
 */

const FALLBACK_RUNTIME: Record<Language, { language: string; version: string }> = {
  C: { language: "c", version: "10.2.0" },
  CPP: { language: "c++", version: "10.2.0" },
  JAVA: { language: "java", version: "15.0.2" },
  PYTHON: { language: "python", version: "3.10.0" },
};

const LANGUAGE_ALIASES: Record<Language, string[]> = {
  C: ["c"],
  CPP: ["c++", "cpp"],
  JAVA: ["java"],
  PYTHON: ["python", "python3", "py"],
};

interface PistonRuntime {
  language: string;
  version: string;
  aliases?: string[];
}

interface PistonStage {
  stdout?: string;
  stderr?: string;
  code?: number | null;
  signal?: string | null;
  output?: string;
}

interface PistonResponse {
  compile?: PistonStage;
  run?: PistonStage;
  message?: string;
}

let runtimeCache: { fetchedAt: number; list: PistonRuntime[] } | null = null;

function pistonBase(): string {
  return (serverEnv.pistonUrl ?? "https://emkc.org/api/v2/piston").replace(/\/$/, "");
}

async function listRuntimes(): Promise<PistonRuntime[]> {
  const now = Date.now();
  if (runtimeCache && now - runtimeCache.fetchedAt < 60 * 60_000) {
    return runtimeCache.list;
  }
  try {
    const response = await fetch(`${pistonBase()}/runtimes`, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const list = (await response.json()) as PistonRuntime[];
    runtimeCache = { fetchedAt: now, list };
    return list;
  } catch {
    return Object.values(FALLBACK_RUNTIME).map((r) => ({
      language: r.language,
      version: r.version,
    }));
  }
}

function pickRuntime(list: PistonRuntime[], language: Language) {
  const aliases = LANGUAGE_ALIASES[language];
  const matches = list.filter((runtime) => {
    const names = [runtime.language, ...(runtime.aliases ?? [])].map((n) => n.toLowerCase());
    return aliases.some((alias) => names.includes(alias));
  });
  if (matches.length === 0) return FALLBACK_RUNTIME[language];
  return matches[matches.length - 1];
}

function pistonHeaders() {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (serverEnv.pistonApiKey) {
    headers.authorization = `Bearer ${serverEnv.pistonApiKey}`;
  }
  return headers;
}

async function executeOnce(
  language: Language,
  code: string,
  stdin: string,
  timeoutMs: number,
  memoryMb: number,
): Promise<{ compile?: PistonStage; run?: PistonStage; error?: string; aborted?: boolean }> {
  const runtimes = await listRuntimes();
  const runtime = pickRuntime(runtimes, language);
  const spec = LANGUAGE_SPECS[language];
  const controller = new AbortController();
  const budget = Math.max(20_000, timeoutMs + 15_000);
  const timer = setTimeout(() => controller.abort(), budget);

  try {
    const response = await fetch(`${pistonBase()}/execute`, {
      method: "POST",
      headers: pistonHeaders(),
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: spec.fileName, content: code }],
        stdin: stdin.endsWith("\n") ? stdin : `${stdin}\n`,
        compile_timeout: 15_000,
        run_timeout: timeoutMs,
        compile_memory_limit: Math.max(128, memoryMb) * 1024 * 1024,
        run_memory_limit: Math.max(64, memoryMb) * 1024 * 1024,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      return {
        error: `Compiler service error (${response.status}). ${text.slice(0, 240)}`,
      };
    }

    const payload = JSON.parse(text) as PistonResponse;
    if (payload.message && !payload.run && !payload.compile) {
      return { error: payload.message };
    }
    return { compile: payload.compile, run: payload.run };
  } catch (error) {
    const aborted = (error as Error)?.name === "AbortError";
    return {
      aborted,
      error: aborted
        ? "The compiler did not finish in time."
        : "Could not reach the compiler service. Check your network and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function compileFailed(stage: PistonStage | undefined) {
  if (!stage) return false;
  return (stage.code ?? 0) !== 0 || Boolean(stage.signal);
}

export class PistonSandboxDriver implements SandboxDriver {
  readonly name = "piston";

  async supports() {
    return true;
  }

  async run(job: SandboxJob): Promise<SandboxResult> {
    const spec = LANGUAGE_SPECS[job.language];
    const cases: SandboxCaseOutcome[] = [];
    let compileLog: string | null = null;

    for (const testCase of job.testCases) {
      const result = await executeOnce(
        job.language,
        job.code,
        testCase.input,
        job.limits.timeoutMs + spec.startupOverheadMs,
        job.limits.memoryMb,
      );

      if (result.error && !result.run && !result.compile) {
        return {
          compiled: false,
          compileLog,
          cases: [],
          fatal: {
            status: result.aborted ? "TIME_LIMIT_EXCEEDED" : "INTERNAL_ERROR",
            message: result.error,
          },
        };
      }

      if (compileFailed(result.compile)) {
        compileLog = [result.compile?.stdout, result.compile?.stderr]
          .filter(Boolean)
          .join("\n")
          .trim();
        return {
          compiled: false,
          compileLog: compileLog || "Compilation failed.",
          cases: [],
        };
      }

      if (result.compile && compileLog === null) {
        const log = [result.compile.stdout, result.compile.stderr].filter(Boolean).join("\n").trim();
        compileLog = log || null;
      }

      const run = result.run ?? {};
      const stdout = run.stdout ?? "";
      const stderr = run.stderr ?? "";
      const signal = run.signal ?? null;
      const timedOut =
        signal === "SIGKILL" ||
        /time.?limit|killed|timeout/i.test(stderr) ||
        Boolean(result.aborted);
      const memoryExceeded = /std::bad_alloc|OutOfMemoryError|MemoryError|Cannot allocate memory/i.test(
        stderr,
      );
      const outputTruncated = stdout.length >= job.limits.outputLimitBytes;

      cases.push({
        index: testCase.index,
        id: testCase.id,
        kind: testCase.kind,
        stdout: stdout.slice(0, job.limits.outputLimitBytes),
        stderr,
        exitCode: run.code ?? (timedOut ? null : 0),
        runtimeMs: 0,
        memoryKb: null,
        timedOut,
        outputTruncated,
        memoryExceeded,
      });
    }

    return { compiled: true, compileLog, cases };
  }
}
