import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Prisma client for the command-line scripts in this folder.
 *
 * The scripts have to reach whichever database the operator is pointing at —
 * the local file during development, or a remote libsql database (Turso) when
 * seeding or inspecting a deployment. That is the only difference between the
 * two, so it lives here rather than being repeated in every script.
 */

export const DATABASE_URL =
  process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "file:./prisma/dsaforge.db";

export const DATABASE_AUTH_TOKEN =
  process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

/** True for a database that is a file on this machine rather than a service. */
export function isFileDatabase(url = DATABASE_URL) {
  return url.startsWith("file:") || (!url.includes("://") && !url.startsWith(":memory:"));
}

/** Short, safe description of the target, for a script's opening line. */
export function describeTarget(url = DATABASE_URL) {
  if (isFileDatabase(url)) return `local file ${url.replace(/^file:/, "")}`;
  try {
    return `remote ${new URL(url).host}`;
  } catch {
    return "remote database";
  }
}

export function createScriptClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaLibSql({
      url: DATABASE_URL,
      // A file database rejects an auth token, so only send one to a service.
      ...(DATABASE_AUTH_TOKEN && !isFileDatabase() ? { authToken: DATABASE_AUTH_TOKEN } : {}),
    }),
  });
}
