import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import os from "node:os";
import { createScriptClient } from "./client";
import { LANGUAGE_SPECS, localRunCommand } from "../src/lib/execution/languages";
import { outputMatches } from "../src/lib/execution/judge";
import { QUESTION_CATALOG, SPARE_QUESTIONS } from "./seed-data";

/**
 * Answer-key verification.
 *
 * Two independent checks, because a problem can be wrong in two different ways:
 *
 *  1. Drift — the test cases stored in the database no longer match what the
 *     catalogue's JavaScript reference produces for the same input. This finds
 *     a stale seed or a hand-edited expected output.
 *
 *  2. Reference solutions — every per-language solution shown by "Reveal
 *     Answer" is compiled and run against every stored test case through the
 *     same toolchain and the same comparison the judge uses. A solution a user
 *     cannot paste into the editor and get ACCEPTED for is a catalogue bug.
 *
 *   npm run db:verify:solutions
 *   npm run db:verify:solutions -- --lang CPP --slug two-sum
 */

type Language = "C" | "CPP" | "JAVA" | "PYTHON";
const ALL: Language[] = ["C", "CPP", "JAVA", "PYTHON"];
const IS_WINDOWS = process.platform === "win32";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  return inline?.split("=").slice(1).join("=");
}
const flag = (name: string) => process.argv.includes(`--${name}`);

interface Failure {
  slug: string;
  number: number;
  language?: Language;
  stage: "drift" | "compile" | "run";
  detail: string;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

function runOnce(
  cwd: string,
  command: string,
  args: string[],
  stdin: string | undefined,
  timeoutMs: number,
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: {
        PATH: process.env.PATH ?? "",
        LANG: "C.UTF-8",
        HOME: ".",
        PYTHONIOENCODING: "utf-8",
        PYTHONDONTWRITEBYTECODE: "1",
        ...(IS_WINDOWS
          ? {
              SystemRoot: process.env.SystemRoot,
              COMSPEC: process.env.COMSPEC,
              TEMP: ".",
              TMP: ".",
            }
          : {}),
      } as unknown as NodeJS.ProcessEnv,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < 200_000) stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 20_000) stderr += chunk.toString("utf8");
    });

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, timedOut });
    };

    child.on("error", (error) => {
      stderr += `\n${(error as Error).message}`;
      finish(null);
    });
    child.on("close", (code) => finish(code));

    child.stdin.on("error", () => {
      /* the program may exit without reading stdin */
    });
    child.stdin.end(stdin ?? "");
  });
}

async function toolchainAvailable(language: Language): Promise<boolean> {
  const spec = LANGUAGE_SPECS[language];
  const probe =
    spec.compile?.command ?? (IS_WINDOWS && language === "PYTHON" ? "python" : spec.run.command);
  const result = await runOnce(process.cwd(), probe, ["--version"], undefined, 8000);
  return result.exitCode === 0;
}

interface Job {
  slug: string;
  number: number;
  language: Language;
  code: string;
  timeLimitMs: number;
  cases: { index: number; kind: string; input: string; expectedOutput: string }[];
}

async function verifySolution(job: Job): Promise<Failure[]> {
  const spec = LANGUAGE_SPECS[job.language];
  const dir = await mkdtemp(path.join(tmpdir(), "forge-verify-"));
  const failures: Failure[] = [];

  try {
    await writeFile(path.join(dir, spec.fileName), job.code, "utf8");

    if (spec.compile) {
      const compiled = await runOnce(
        dir,
        spec.compile.command,
        spec.compile.args,
        undefined,
        30_000,
      );
      if (compiled.exitCode !== 0) {
        return [
          {
            slug: job.slug,
            number: job.number,
            language: job.language,
            stage: "compile",
            detail: [compiled.stdout, compiled.stderr]
              .filter(Boolean)
              .join("\n")
              .trim()
              .slice(0, 1200),
          },
        ];
      }
    }

    const runCmd = localRunCommand(spec, IS_WINDOWS, dir);
    for (const testCase of job.cases) {
      const stdin = testCase.input.endsWith("\n") ? testCase.input : `${testCase.input}\n`;
      const result = await runOnce(
        dir,
        runCmd.command,
        runCmd.args,
        stdin,
        job.timeLimitMs + spec.startupOverheadMs + 4000,
      );

      if (result.timedOut) {
        failures.push({
          slug: job.slug,
          number: job.number,
          language: job.language,
          stage: "run",
          detail: `case ${testCase.index} (${testCase.kind}): timed out`,
        });
        break;
      }
      if (result.exitCode !== 0) {
        failures.push({
          slug: job.slug,
          number: job.number,
          language: job.language,
          stage: "run",
          detail:
            `case ${testCase.index} (${testCase.kind}): exit ${result.exitCode}\n` +
            result.stderr.trim().slice(0, 600),
        });
        break;
      }
      if (!outputMatches(testCase.expectedOutput, result.stdout)) {
        failures.push({
          slug: job.slug,
          number: job.number,
          language: job.language,
          stage: "run",
          detail:
            `case ${testCase.index} (${testCase.kind}) wrong answer\n` +
            `input:    ${JSON.stringify(testCase.input.slice(0, 200))}\n` +
            `expected: ${JSON.stringify(testCase.expectedOutput.slice(0, 200))}\n` +
            `actual:   ${JSON.stringify(result.stdout.trim().slice(0, 200))}`,
        });
        break;
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }

  return failures;
}

async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const db = createScriptClient();

  const slugFilter = arg("slug");
  const langFilter = arg("lang")?.toUpperCase() as Language | undefined;
  const limit = Number(arg("limit") ?? 0) || undefined;
  const concurrency =
    Number(arg("concurrency") ?? 0) || Math.max(2, Math.min(8, os.cpus().length - 1));

  const questions = await db.question.findMany({
    where: slugFilter ? { slug: slugFilter } : undefined,
    select: {
      slug: true,
      number: true,
      title: true,
      solutions: true,
      timeLimitMs: true,
      testCases: {
        select: { kind: true, orderIndex: true, input: true, expectedOutput: true },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { number: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  const failures: Failure[] = [];

  // ---- 1. drift: stored expected outputs vs the catalogue reference --------
  const catalog = new Map([...QUESTION_CATALOG, ...SPARE_QUESTIONS].map((q) => [q.slug, q]));
  let driftChecked = 0;
  for (const question of questions) {
    const seed = catalog.get(question.slug);
    if (!seed) {
      failures.push({
        slug: question.slug,
        number: question.number,
        stage: "drift",
        detail: "in the database but not in the catalogue source",
      });
      continue;
    }
    if (question.testCases.length !== seed.testCases.length) {
      failures.push({
        slug: question.slug,
        number: question.number,
        stage: "drift",
        detail: `database holds ${question.testCases.length} test cases, the catalogue defines ${seed.testCases.length}`,
      });
      continue;
    }
    for (const [index, testCase] of question.testCases.entries()) {
      const reference = seed.testCases[index];
      driftChecked += 1;
      if (testCase.input.trim() !== reference.input.trim()) {
        failures.push({
          slug: question.slug,
          number: question.number,
          stage: "drift",
          detail: `case ${index + 1}: input differs from the catalogue`,
        });
      } else if (testCase.expectedOutput.trim() !== reference.expectedOutput.trim()) {
        failures.push({
          slug: question.slug,
          number: question.number,
          stage: "drift",
          detail:
            `case ${index + 1}: stored answer differs from the reference\n` +
            `stored:    ${JSON.stringify(testCase.expectedOutput.slice(0, 160))}\n` +
            `reference: ${JSON.stringify(reference.expectedOutput.slice(0, 160))}`,
        });
      }
    }
  }

  // ---- 2. reference solutions ---------------------------------------------
  const wanted = langFilter ? [langFilter] : ALL;
  const available: Language[] = [];
  for (const language of wanted) {
    if (await toolchainAvailable(language)) available.push(language);
    else console.log(`  ! ${LANGUAGE_SPECS[language].label} toolchain not installed — skipping`);
  }

  const jobs: Job[] = [];
  let noSolution = 0;
  const coverage: Record<Language, number> = { C: 0, CPP: 0, JAVA: 0, PYTHON: 0 };

  for (const question of questions) {
    const solutions = (question.solutions ?? {}) as Partial<Record<Language, string>>;
    const have = ALL.filter(
      (l) => typeof solutions[l] === "string" && solutions[l]!.trim().length > 0,
    );
    for (const language of have) coverage[language] += 1;
    if (!have.length) noSolution += 1;

    for (const language of available) {
      const code = solutions[language];
      if (typeof code !== "string" || !code.trim()) continue;
      jobs.push({
        slug: question.slug,
        number: question.number,
        language,
        code,
        timeLimitMs: question.timeLimitMs,
        cases: question.testCases.map((t, i) => ({
          index: i + 1,
          kind: t.kind,
          input: t.input,
          expectedOutput: t.expectedOutput,
        })),
      });
    }
  }

  console.log(
    `\nVerifying ${questions.length} problems — ${driftChecked} test cases against the reference, ` +
      `${jobs.length} solution runs across ${available.join(", ") || "no toolchains"}\n`,
  );

  let done = 0;
  const solutionFailures = await pool(jobs, concurrency, async (job) => {
    const result = await verifySolution(job);
    done += 1;
    if (done % 5 === 0 || done === jobs.length) {
      process.stdout.write(`\r  ran ${done}/${jobs.length} solutions`);
    }
    if (result.length && flag("verbose")) {
      process.stdout.write(`\n  x ${job.number} ${job.slug} [${job.language}]\n`);
    }
    return result;
  });
  if (jobs.length) process.stdout.write("\n");
  failures.push(...solutionFailures.flat());

  // ---- report -------------------------------------------------------------
  const drift = failures.filter((f) => f.stage === "drift");
  const compile = failures.filter((f) => f.stage === "compile");
  const wrong = failures.filter((f) => f.stage === "run");

  const section = (title: string, list: Failure[]) => {
    if (!list.length) return;
    console.log(`\n${title} (${list.length})`);
    for (const f of list) {
      console.log(`  x ${f.number} ${f.slug}${f.language ? ` [${f.language}]` : ""}`);
      for (const line of f.detail.split("\n")) console.log(`      ${line.trimEnd()}`);
    }
  };

  section("Answer-key drift", drift);
  section("Reference solutions that do not compile", compile);
  section("Reference solutions that produce a wrong answer", wrong);

  console.log("\n---------------------------------------------------------------");
  console.log(`  problems checked        ${questions.length}`);
  console.log(`  test cases verified     ${driftChecked}`);
  console.log(`  solution runs           ${jobs.length}`);
  console.log(`  drift failures          ${drift.length}`);
  console.log(`  compile failures        ${compile.length}`);
  console.log(`  wrong answers           ${wrong.length}`);
  console.log(
    `  solution coverage       C ${coverage.C}  C++ ${coverage.CPP}  Java ${coverage.JAVA}  Python ${coverage.PYTHON}`,
  );
  console.log(`  problems with no reference solution   ${noSolution}/${questions.length}`);
  console.log("---------------------------------------------------------------\n");

  await db.$disconnect();
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
