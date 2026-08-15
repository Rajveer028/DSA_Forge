import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { serverEnv } from "@/lib/env";
import { LANGUAGE_SPECS, localRunCommand } from "@/lib/execution/languages";
import type {
  SandboxCaseOutcome,
  SandboxDriver,
  SandboxJob,
  SandboxResult,
} from "@/lib/execution/types";
import type { Language } from "@/generated/prisma/enums";

/**
 * Local development execution driver.
 *
 * It compiles and runs submitted code in a throwaway directory with a stripped
 * environment, argv-only commands (never a shell string containing user data),
 * a hard wall-clock kill, an stdout cap and — on POSIX — address-space, CPU and
 * process-count rlimits.
 *
 * It is NOT a security boundary: it shares the host kernel, filesystem and
 * network namespace with the app. Production must run EXECUTION_DRIVER=remote
 * against the containerised worker in `sandbox/` (see sandbox/README.md), which
 * adds filesystem, network and PID isolation. `assertLocalDriverAllowed()`
 * refuses to let this driver start in a production deployment.
 */

const IS_WINDOWS = process.platform === "win32";

export function assertLocalDriverAllowed() {
  if (serverEnv.isProduction) {
    throw new Error(
      "EXECUTION_DRIVER=local is refused in production. Point EXECUTION_SERVICE_URL at the sandboxed worker service.",
    );
  }
}

/** Minimal environment handed to submitted code — no secrets, ever. */
function sandboxEnv(): Record<string, string | undefined> {
  const base: Record<string, string | undefined> = {
    PATH: process.env.PATH ?? "",
    LANG: "C.UTF-8",
    HOME: ".",
    TMPDIR: ".",
    PYTHONIOENCODING: "utf-8",
    PYTHONDONTWRITEBYTECODE: "1",
  };
  if (IS_WINDOWS) {
    // Windows needs these for process creation; none of them carry app secrets.
    base.SystemRoot = process.env.SystemRoot;
    base.COMSPEC = process.env.COMSPEC;
    base.TEMP = ".";
    base.TMP = ".";
  }
  return base;
}

interface RunOptions {
  cwd: string;
  command: string;
  args: string[];
  stdin?: string;
  timeoutMs: number;
  outputLimitBytes: number;
  memoryMb: number;
  processLimit: number;
  applyRlimits: boolean;
}

interface RawRun {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  runtimeMs: number;
  timedOut: boolean;
  outputTruncated: boolean;
  memoryKb: number | null;
}

/** Shell-quote a value we control (never user code) for the POSIX rlimit wrapper. */
function sq(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function runOnce(options: RunOptions): Promise<RawRun> {
  const started = Date.now();
  const memFile = path.join(options.cwd, ".__maxrss");

  let command = options.command;
  let args = options.args;
  let usesTimeWrapper = false;

  if (!IS_WINDOWS && options.applyRlimits) {
    // Wrap in `sh` purely to apply rlimits before exec'ing. The script text is
    // built only from our own constants and resolved paths.
    const kb = Math.max(65536, options.memoryMb * 1024);
    const cpuSeconds = Math.max(1, Math.ceil(options.timeoutMs / 1000) + 1);
    const parts = [
      `ulimit -t ${cpuSeconds}`,
      `ulimit -f ${Math.ceil(options.outputLimitBytes / 512) + 2048}`,
      `ulimit -u ${options.processLimit}`,
      `ulimit -c 0`,
    ];
    // Address-space caps break the JVM's reservation model, so skip it there.
    if (!options.command.startsWith("java")) parts.push(`ulimit -v ${kb}`);

    const target = [sq(options.command), ...options.args.map(sq)].join(" ");
    const timeBin = "/usr/bin/time";
    const script = `${parts.join("; ")}; exec ${timeBin} -f %M -o ${sq(memFile)} ${target} 2>/dev/null || exec ${target}`;
    command = "/bin/sh";
    args = ["-c", script];
    usesTimeWrapper = true;
  }

  return await new Promise<RawRun>((resolve) => {
    // turbopackIgnore keeps the bundler from tracing the whole project just
    // because the command and cwd are computed at runtime.
    const child = spawn(/* turbopackIgnore: true */ command, args, {
      cwd: options.cwd,
      env: sandboxEnv() as NodeJS.ProcessEnv,
      shell: false,
      windowsHide: true,
      detached: !IS_WINDOWS,
    });

    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let outputTruncated = false;
    let timedOut = false;
    let settled = false;

    const kill = () => {
      try {
        if (!IS_WINDOWS && child.pid) {
          process.kill(-child.pid, "SIGKILL");
        } else {
          child.kill("SIGKILL");
        }
      } catch {
        /* already gone */
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, options.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > options.outputLimitBytes) {
        outputTruncated = true;
        stdout += chunk.toString("utf8");
        stdout = stdout.slice(0, options.outputLimitBytes);
        kill();
        return;
      }
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 8192) stderr += chunk.toString("utf8");
    });

    const finish = async (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      let memoryKb: number | null = null;
      if (usesTimeWrapper) {
        try {
          const raw = (await readFile(memFile, "utf8")).trim().split("\n").pop();
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed > 0) memoryKb = parsed;
        } catch {
          /* /usr/bin/time not available */
        }
      }

      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        runtimeMs: Date.now() - started,
        timedOut,
        outputTruncated,
        memoryKb,
      });
    };

    child.on("error", (error) => {
      stderr += `\n${(error as Error).message}`;
      void finish(null, null);
    });
    child.on("close", (code, signal) => void finish(code, signal));

    if (options.stdin !== undefined) {
      child.stdin.on("error", () => {
        /* the program may exit without reading stdin */
      });
      child.stdin.end(options.stdin);
    } else {
      child.stdin.end();
    }
  });
}

async function toolchainAvailable(language: Language): Promise<boolean> {
  const spec = LANGUAGE_SPECS[language];
  const probe = spec.compile?.command ?? (IS_WINDOWS && language === "PYTHON" ? "python" : spec.run.command);
  if (probe.startsWith("./")) return true;
  return await new Promise((resolve) => {
    const child = spawn(probe, ["--version"], { shell: false, windowsHide: true });
    child.on("error", () => resolve(false));
    child.on("close", () => resolve(true));
    setTimeout(() => {
      child.kill();
      resolve(false);
    }, 4000);
  });
}

export class LocalSandboxDriver implements SandboxDriver {
  readonly name = "local";

  async supports(language: Language) {
    return toolchainAvailable(language);
  }

  async run(job: SandboxJob): Promise<SandboxResult> {
    assertLocalDriverAllowed();
    const spec = LANGUAGE_SPECS[job.language];
    const root = serverEnv.executionWorkDir ?? tmpdir();
    await mkdir(root, { recursive: true }).catch(() => undefined);
    const dir = await mkdtemp(path.join(root, "forge-exec-"));

    try {
      await writeFile(path.join(dir, spec.fileName), job.code, "utf8");

      // ---- compile ----
      let compileLog: string | null = null;
      if (spec.compile) {
        const compiled = await runOnce({
          cwd: dir,
          command: spec.compile.command,
          args: spec.compile.args,
          timeoutMs: 15_000,
          outputLimitBytes: 32 * 1024,
          memoryMb: 1024,
          processLimit: 128,
          applyRlimits: false,
        });
        compileLog = [compiled.stdout, compiled.stderr].filter(Boolean).join("\n").trim() || null;

        if (compiled.exitCode !== 0) {
          if (compiled.exitCode === null && !compiled.timedOut) {
            return {
              compiled: false,
              compileLog,
              cases: [],
              fatal: {
                status: "INTERNAL_ERROR",
                message: `The ${spec.label} toolchain (${spec.compile.command}) is not installed on this machine. Install it or set EXECUTION_DRIVER=remote.`,
              },
            };
          }
          return {
            compiled: false,
            compileLog: compileLog ?? "Compilation failed.",
            cases: [],
          };
        }
      }

      // ---- run each test case ----
      const runCmd = localRunCommand(spec, IS_WINDOWS, dir);
      const cases: SandboxCaseOutcome[] = [];

      for (const testCase of job.testCases) {
        const result = await runOnce({
          cwd: dir,
          command: runCmd.command,
          args: runCmd.args,
          stdin: testCase.input.endsWith("\n") ? testCase.input : `${testCase.input}\n`,
          timeoutMs: job.limits.timeoutMs + spec.startupOverheadMs,
          outputLimitBytes: job.limits.outputLimitBytes,
          memoryMb: job.limits.memoryMb,
          processLimit: job.limits.processLimit,
          applyRlimits: true,
        });

        const memoryExceeded =
          (result.memoryKb !== null && result.memoryKb > job.limits.memoryMb * 1024) ||
          /std::bad_alloc|OutOfMemoryError|MemoryError|Cannot allocate memory/i.test(result.stderr);

        cases.push({
          index: testCase.index,
          id: testCase.id,
          kind: testCase.kind,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          runtimeMs: Math.max(0, result.runtimeMs - spec.startupOverheadMs),
          memoryKb: result.memoryKb,
          timedOut: result.timedOut,
          outputTruncated: result.outputTruncated,
          memoryExceeded,
        });
      }

      return { compiled: true, compileLog: null, cases };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
