import "dotenv/config";
import { writeFileSync } from "node:fs";
import { EASY_A } from "./seed-data/easy-a";
import { EASY_B } from "./seed-data/easy-b";
import { EASY_C } from "./seed-data/easy-c";
import { MEDIUM_A } from "./seed-data/medium-a";
import { MEDIUM_B } from "./seed-data/medium-b";
import { HARD_A } from "./seed-data/hard-a";
import { HARD_B } from "./seed-data/hard-b";

/**
 * Dumps every problem's contract — statement, IO format, constraints, the
 * editorial approach and every test case — so reference solutions can be
 * written against the exact behaviour the answer key was generated from.
 *
 *   npx tsx prisma/dump-specs.ts [--missing] [--file easy-a] [--out FILE]
 */

const FILES = {
  "easy-a": EASY_A,
  "easy-b": EASY_B,
  "easy-c": EASY_C,
  "medium-a": MEDIUM_A,
  "medium-b": MEDIUM_B,
  "hard-a": HARD_A,
  "hard-b": HARD_B,
};

const LANGS = ["C", "CPP", "JAVA", "PYTHON"] as const;

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}
const onlyMissing = process.argv.includes("--missing");
const fileFilter = arg("file");
const from = Number(arg("from") ?? 0);
const take = Number(arg("take") ?? 0) || Infinity;
const outFile = arg("out") ?? "specs.txt";

const chunks: string[] = [];
let count = 0;
let index = 0;

for (const [file, questions] of Object.entries(FILES)) {
  if (fileFilter && file !== fileFilter) continue;
  for (const question of questions) {
    const have = LANGS.filter(
      (l) => typeof question.solutions[l] === "string" && question.solutions[l]!.trim(),
    );
    const missing = LANGS.filter((l) => !have.includes(l));
    if (onlyMissing && missing.length === 0) continue;

    index += 1;
    if (index <= from) continue;
    if (count >= take) break;
    count += 1;

    chunks.push(
      [
        `### ${question.slug}  [${file}] (${question.difficulty})  needs: ${missing.join(",") || "none"}`,
        `TITLE: ${question.title}`,
        `STATEMENT: ${question.description.replace(/\n+/g, " ")}`,
        `IN: ${question.inputFormat.replace(/\n/g, " | ")}`,
        `OUT: ${question.outputFormat.replace(/\n/g, " | ")}`,
        `CONSTRAINTS: ${question.constraints.replace(/\n/g, " | ")}`,
        `APPROACH: ${question.approach.replace(/\n+/g, " ")}`,
        `STEPS: ${question.steps.join(" / ")}`,
        `COMPLEXITY: ${question.timeComplexity} time, ${question.spaceComplexity} space`,
        ...question.testCases.map(
          (t, i) =>
            `CASE${i + 1} ${t.kind}: in=${JSON.stringify(t.input)} out=${JSON.stringify(t.expectedOutput)}`,
        ),
        ``,
      ].join("\n"),
    );
  }
}

writeFileSync(outFile, chunks.join("\n"), "utf8");
console.log(`wrote ${count} specs to ${outFile}`);
