import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient as SqliteClient } from "../src/generated/prisma-sqlite/client";
import { createScriptClient, describeTarget } from "./client";

/**
 * One-way copy of the SQLite database into PostgreSQL.
 *
 * Both sides are read and written through Prisma rather than raw SQL, which is
 * what makes the type differences a non-issue: SQLite stores booleans as 0/1,
 * timestamps as integers and JSON as text, and Prisma decodes all of that on
 * the way out and re-encodes it correctly on the way in.
 *
 * Rows keep their original ids. That matters more than it looks: every foreign
 * key in the database — a submission pointing at a question, a test pointing at
 * its paper — stays valid without any remapping.
 *
 * Tables are copied parents-first, so no insert can reference a row that has
 * not arrived yet.
 *
 *   npx tsx prisma/migrate-to-postgres.ts [--source file:./prisma/dsaforge.db]
 */

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

const SOURCE_URL = arg("source") ?? "file:./prisma/dsaforge.db";
const BATCH = 500;

/** Parents before children. Names are the Prisma client accessors. */
const ORDER = [
  "topic",
  "userAccount",
  "userProfile",
  "authSession",
  "userPreferences",
  "learningProgress",
  "userTopicInterest",
  "topicProgress",
  "question",
  "questionTopic",
  "testCase",
  "company",
  "companyQuestion",
  "companyTopicWeight",
  "userCompanyPrep",
  "achievement",
  "userAchievement",
  "university",
  "universityMember",
  "universityClass",
  "universityClassMember",
  "universityQuestion",
  "universityTestCase",
  "universityTest",
  "universityTestQuestion",
  "universityTestStudent",
  "submission",
  "codeExecution",
  "questionAttempt",
  "aIQuestion",
  "aIRecommendation",
  "aIHint",
  "universitySubmission",
  "universityResult",
  "codeSimilarityReport",
  "testSchedule",
  "notification",
] as const;

type Delegate = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  createMany: (args: { data: unknown[] }) => Promise<{ count: number }>;
  count: () => Promise<number>;
};

async function main() {
  const source = new SqliteClient({ adapter: new PrismaLibSql({ url: SOURCE_URL }) });
  const target = createScriptClient();

  console.log(`\n  from  ${SOURCE_URL}`);
  console.log(`  to    ${describeTarget()}\n`);

  let copied = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const model of ORDER) {
    const from = (source as unknown as Record<string, Delegate>)[model];
    const to = (target as unknown as Record<string, Delegate>)[model];
    if (!from || !to) {
      failures.push(`${model}: no such model on one of the clients`);
      continue;
    }

    const rows = await from.findMany();
    if (rows.length === 0) {
      console.log(`  ${model.padEnd(24)} —`);
      continue;
    }

    // Anything already present is left alone, so the copy can be re-run after
    // fixing a failure without duplicating what already landed.
    const existing = await to.count();
    if (existing > 0) {
      console.log(`  ${model.padEnd(24)} ${rows.length} rows — target already has ${existing}, skipped`);
      skipped += rows.length;
      continue;
    }

    let written = 0;
    try {
      for (let index = 0; index < rows.length; index += BATCH) {
        const batch = rows.slice(index, index + BATCH);
        const result = await to.createMany({ data: batch });
        written += result.count;
      }
      copied += written;
      console.log(`  ${model.padEnd(24)} ${written} rows`);
    } catch (error) {
      const message = (error as Error).message.split("\n").slice(0, 3).join(" ").slice(0, 300);
      failures.push(`${model}: ${message}`);
      console.log(`  ${model.padEnd(24)} FAILED after ${written}`);
    }
  }

  console.log(`\n  copied ${copied} rows${skipped ? `, skipped ${skipped}` : ""}`);

  if (failures.length) {
    console.log(`\n  ${failures.length} table(s) failed:`);
    for (const failure of failures) console.log(`    x ${failure}`);
  }

  await source.$disconnect();
  await target.$disconnect();
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
