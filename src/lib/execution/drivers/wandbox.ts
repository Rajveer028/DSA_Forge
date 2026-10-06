import { LANGUAGE_SPECS } from "@/lib/execution/languages";
import type {
  SandboxCaseOutcome,
  SandboxDriver,
  SandboxJob,
  SandboxResult,
} from "@/lib/execution/types";
import type { Language } from "@/generated/prisma/enums";

const WANDBOX_API = "https://wandbox.org/api";
const COMPILER_CACHE_MS = 60 * 60_000;

interface WandboxCompiler {
  name: string;
  language: string;
  version?: string;
}

interface WandboxResponse {
  status?: string | number;
  compiler_output?: string | null;
  compiler_error?: string | null;
  program_output?: string | null;
  program_error?: string | null;
  signal?: string | null;
  time?: string | number | null;
}

let compilerCache: { fetchedAt: number; compilers: WandboxCompiler[] } | null = null;

async function listCompilers(): Promise<WandboxCompiler[]> {
  if (compilerCache && Date.now() - compilerCache.fetchedAt < COMPILER_CACHE_MS) {
    return compilerCache.compilers;
  }

  const response = await fetch(`${WANDBOX_API}/list.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Compiler list request failed (${response.status}).`);
  const compilers = (await response.json()) as WandboxCompiler[];
  compilerCache = { fetchedAt: Date.now(), compilers };
  return compilers;
}

function compilerFor(compilers: WandboxCompiler[], language: Language): WandboxCompiler | undefined {
  const stable = (name: string) => !/head|trunk|snapshot|nightly/i.test(name);
  const byNewest = (items: WandboxCompiler[]) =>
    [...items].sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

  if (language === "C") {
    return byNewest(
      compilers.filter((item) => item.language === "C" && /^gcc-\d.+-c$/.test(item.name) && stable(item.name)),
    )[0];
  }
  if (language === "CPP") {
    return byNewest(
      compilers.filter((item) => item.language === "C++" && /^gcc-\d/.test(item.name) && stable(item.name)),
    )[0];
  }
  if (language === "JAVA") {
    const candidates = byNewest(
      compilers.filter((item) => item.language === "Java" && /^openjdk-/.test(item.name) && stable(item.name)),
    );
    return candidates.find((item) => /jdk-21\+/.test(item.name)) ?? candidates[0];
  }

  const candidates = byNewest(
    compilers.filter((item) => item.language === "Python" && /^cpython-3\./.test(item.name) && stable(item.name)),
  );
  return candidates.find((item) => /cpython-3\.10\./.test(item.name)) ?? candidates[0];
}

function codeFor(job: SandboxJob) {
  if (job.language === "JAVA") {
    // Wandbox launches a source file named prog.java; Java requires a public
    // top-level class to match that filename. Our starter and judge contract
    // use Main, so make that class package-private for source-file mode.
    return job.code.replace(/\bpublic\s+class\s+Main\b/, "class Main");
  }
  return job.code;
}

async function executeCase(
  compiler: WandboxCompiler,
  job: SandboxJob,
  stdin: string,
): Promise<{ response?: WandboxResponse; error?: string; aborted?: boolean }> {
  const controller = new AbortController();
  const timeout = Math.max(20_000, job.limits.timeoutMs + LANGUAGE_SPECS[job.language].startupOverheadMs + 10_000);
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${WANDBOX_API}/compile.json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        compiler: compiler.name,
        code: codeFor(job),
        stdin,
        save: false,
      }),
    });
    if (!response.ok) return { error: `Compiler service error (${response.status}).` };
    return { response: (await response.json()) as WandboxResponse };
  } catch (error) {
    const aborted = (error as Error)?.name === "AbortError";
    return {
      aborted,
      error: aborted
        ? "The compiler service did not finish in time."
        : "Could not reach the public compiler service. Try again or configure a private worker.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function runtimeError(stderr: string) {
  return /time.?limit|killed|timeout/i.test(stderr);
}

export class WandboxSandboxDriver implements SandboxDriver {
  readonly name = "wandbox";

  async supports(language: Language) {
    try {
      return Boolean(compilerFor(await listCompilers(), language));
    } catch {
      return false;
    }
  }

  async run(job: SandboxJob): Promise<SandboxResult> {
    let compilers: WandboxCompiler[];
    try {
      compilers = await listCompilers();
    } catch (error) {
      return {
        compiled: false,
        compileLog: null,
        cases: [],
        fatal: { status: "INTERNAL_ERROR", message: (error as Error).message },
      };
    }

    const compiler = compilerFor(compilers, job.language);
    if (!compiler) {
      return {
        compiled: false,
        compileLog: null,
        cases: [],
        fatal: {
          status: "INTERNAL_ERROR",
          message: `The public compiler service has no available ${LANGUAGE_SPECS[job.language].label} compiler.`,
        },
      };
    }

    const cases: SandboxCaseOutcome[] = [];
    let compileLog: string | null = null;
    for (const testCase of job.testCases) {
      const result = await executeCase(compiler, job, testCase.input);
      if (result.error || !result.response) {
        return {
          compiled: false,
          compileLog,
          cases: [],
          fatal: {
            status: result.aborted ? "TIME_LIMIT_EXCEEDED" : "INTERNAL_ERROR",
            message: result.error ?? "The compiler service returned an invalid response.",
          },
        };
      }

      const data = result.response;
      const compilerError = data.compiler_error?.trim() ?? "";
      if (compilerError) {
        compileLog = [data.compiler_output, compilerError].filter(Boolean).join("\n").slice(0, 4000);
        return { compiled: false, compileLog, cases: [] };
      }
      if (compileLog === null) compileLog = data.compiler_output?.trim() || null;

      const stdout = data.program_output ?? "";
      const stderr = data.program_error ?? "";
      const exitCode = Number(data.status);
      const timedOut = Boolean(data.signal) || runtimeError(stderr);
      const outputTruncated = stdout.length >= job.limits.outputLimitBytes;
      const memoryExceeded = /std::bad_alloc|OutOfMemoryError|MemoryError|Cannot allocate memory/i.test(stderr);
      const runtimeMs = Number(data.time);

      cases.push({
        index: testCase.index,
        id: testCase.id,
        kind: testCase.kind,
        stdout: stdout.slice(0, job.limits.outputLimitBytes),
        stderr,
        exitCode: Number.isFinite(exitCode) ? exitCode : null,
        runtimeMs: Number.isFinite(runtimeMs) ? runtimeMs * 1000 : 0,
        memoryKb: null,
        timedOut,
        outputTruncated,
        memoryExceeded,
      });
    }

    return { compiled: true, compileLog, cases };
  }
}
