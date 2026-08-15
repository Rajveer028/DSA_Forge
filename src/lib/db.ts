import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";

/**
 * Prisma client singleton.
 *
 * Storage is a local SQLite file — no database server, no hosted account, no
 * credentials to configure. `DATABASE_URL` defaults to `file:./prisma/dsaforge.db`
 * and only needs setting if you want the file somewhere else.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const adapter = new PrismaLibSql({ url: serverEnv.databaseUrl });
  return new PrismaClient({
    adapter,
    log: serverEnv.isProduction ? ["error"] : ["error", "warn"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

/**
 * Created on first use rather than on import, so building the app never opens
 * the database file.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[property];
    // Bind methods to the real client so Prisma's private fields resolve.
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(_target, property) {
    return property in (getClient() as object);
  },
});

/** True when the database is reachable — used by health checks / setup guards. */
export async function pingDatabase() {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
