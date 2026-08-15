import "dotenv/config";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";
import { DATABASE_URL, DATABASE_AUTH_TOKEN, describeTarget, isFileDatabase } from "./client";

/**
 * Applies the migration history to a remote libsql database (Turso).
 *
 * `prisma migrate deploy` is not used here for one concrete reason: Prisma's
 * config file accepts a datasource URL but has nowhere to put an auth token, so
 * the schema engine cannot authenticate against Turso. The migrations are plain
 * SQL, so this runs them over the same libsql client the app uses and records
 * each one in `_prisma_migrations` in the format Prisma expects — leaving the
 * remote database indistinguishable from one Prisma migrated itself.
 *
 *   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:deploy:remote
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

/**
 * Splits a migration into statements.
 *
 * `executeMultiple` would be simpler, but it aborts the whole batch on the
 * first error, which makes a partly-applied migration impossible to diagnose.
 * Running statements one at a time reports exactly which one failed.
 */
function statements(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return withoutComments
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function checksum(contents: string) {
  return createHash("sha256").update(contents).digest("hex");
}

async function main() {
  if (isFileDatabase()) {
    console.error(
      `DATABASE_URL points at ${describeTarget()}. This script is for a remote database —\n` +
        "for the local file use `npm run db:migrate`.",
    );
    process.exit(1);
  }
  if (!DATABASE_AUTH_TOKEN) {
    console.error(
      "DATABASE_AUTH_TOKEN is not set. Turso issues one alongside the database URL:\n" +
        "  turso db tokens create <database>",
    );
    process.exit(1);
  }
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`No migrations found at ${MIGRATIONS_DIR}.`);
    process.exit(1);
  }

  const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });
  console.log(`\nApplying migrations to ${describeTarget()}\n`);

  // Prisma's own bookkeeping table, so `migrate status` agrees with reality.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const applied = new Set(
    (await client.execute(`SELECT migration_name FROM "_prisma_migrations"`)).rows.map(
      (row) => String(row.migration_name),
    ),
  );

  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  let ran = 0;
  for (const folder of folders) {
    const file = path.join(MIGRATIONS_DIR, folder, "migration.sql");
    if (!existsSync(file)) continue;

    if (applied.has(folder)) {
      console.log(`  = ${folder} (already applied)`);
      continue;
    }

    const sql = readFileSync(file, "utf8");
    const parts = statements(sql);
    process.stdout.write(`  + ${folder} — ${parts.length} statement(s)… `);

    let index = 0;
    try {
      for (const statement of parts) {
        index += 1;
        await client.execute(statement);
      }
    } catch (error) {
      console.log("failed");
      console.error(`\nStatement ${index} of ${folder} failed:\n${(error as Error).message}\n`);
      process.exit(1);
    }

    await client.execute({
      sql: `INSERT INTO "_prisma_migrations"
              (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
            VALUES (?, ?, current_timestamp, ?, current_timestamp, ?)`,
      args: [crypto.randomUUID(), checksum(sql), folder, parts.length],
    });

    console.log("done");
    ran += 1;
  }

  const tables = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
  );

  console.log(
    `\n${ran === 0 ? "Already up to date" : `Applied ${ran} migration(s)`} — ` +
      `${tables.rows.length} tables present.\n`,
  );
  console.log("Next: seed the catalogue into it with\n  npm run db:seed\n");

  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
