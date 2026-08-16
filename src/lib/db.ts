import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isFileDatabase, serverEnv } from "@/lib/env";

/**
 * Prisma client singleton.
 *
 * Storage is PostgreSQL, reached through the `pg` driver adapter. Use the
 * pooled Neon host (`...-pooler...`) rather than the direct one: a serverless
 * deployment opens a connection per instance, and the pooler is what keeps that
 * from exhausting the database's connection limit.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const url = serverEnv.databaseUrl;

  // Fail with the actual reason rather than letting every query die one by one
  // inside the driver. A `file:` URL here means DATABASE_URL never arrived and
  // the old SQLite default is still in place.
  if (isFileDatabase(url)) {
    throw new Error(
      `DATABASE_URL is "${url}", which is a file path, but this application now stores its data in PostgreSQL. ` +
        "Set DATABASE_URL to a postgresql:// connection string — see DEPLOYMENT.md.",
    );
  }

  const adapter = new PrismaPg({ connectionString: url });

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
 * a connection.
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
