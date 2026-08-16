import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Prisma client for the command-line scripts in this folder.
 *
 * The scripts reach whichever database DATABASE_URL points at, so seeding and
 * verifying a deployment differ from local work by that one variable and
 * nothing else.
 */

export const DATABASE_URL = process.env.DATABASE_URL ?? "";

/** True for the old on-disk SQLite default, which no longer works. */
export function isFileDatabase(url = DATABASE_URL) {
  return url.startsWith("file:") || (url.length > 0 && !url.includes("://"));
}

/** Short, safe description of the target, for a script's opening line. */
export function describeTarget(url = DATABASE_URL) {
  if (!url) return "no DATABASE_URL set";
  if (isFileDatabase(url)) return `local file ${url.replace(/^file:/, "")}`;
  try {
    const parsed = new URL(url);
    // Never print the password.
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return "remote database";
  }
}

export function createScriptClient(): PrismaClient {
  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at your PostgreSQL database.",
    );
  }
  if (isFileDatabase()) {
    throw new Error(
      `DATABASE_URL is "${DATABASE_URL}", a file path. This project now stores its data in PostgreSQL — ` +
        "set a postgresql:// connection string instead.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
}
