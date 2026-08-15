import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { isFileDatabase, serverEnv } from "@/lib/env";

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
  const url = serverEnv.databaseUrl;

  // Fail with the actual reason rather than letting every query die one by one
  // with a confusing filesystem error deep inside the driver.
  if (serverEnv.isProduction && isFileDatabase(url)) {
    throw new Error(
      `DATABASE_URL is "${url}", a file on the server's own disk, and this is a production deployment. ` +
        "Serverless hosts have a read-only, per-request filesystem, so a file database cannot be read or written there. " +
        "Point DATABASE_URL at a libsql database (libsql://…) and set DATABASE_AUTH_TOKEN. See DEPLOYMENT.md.",
    );
  }

  const authToken = serverEnv.databaseAuthToken;
  const adapter = new PrismaLibSql({
    url,
    // Only remote databases take a token; passing one to a file URL is an error.
    ...(authToken && !isFileDatabase(url) ? { authToken } : {}),
  });

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
