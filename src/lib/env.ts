import { createHash } from "node:crypto";

/**
 * Server-side environment access.
 *
 * Nothing in this module may be imported from a Client Component — every value
 * here is either a secret or a server-only setting.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/env.ts was imported from client code. Secrets must stay on the server.",
  );
}

function optional(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export class MissingEnvError extends Error {
  constructor(public readonly key: string) {
    super(
      `Missing required environment variable "${key}". Copy .env.example to .env and fill it in — see README.md → Setup.`,
    );
    this.name = "MissingEnvError";
  }
}

/**
 * A stable per-machine development secret, derived from the project path so it
 * survives restarts without asking anyone to configure anything.
 */
let cachedDevSecret: string | undefined;
function developmentSessionSecret(): string {
  if (!cachedDevSecret) {
    cachedDevSecret = createHash("sha256")
      .update(`dsa-forge-dev:${process.cwd()}`)
      .digest("hex");
  }
  return cachedDevSecret;
}

/** No default: a PostgreSQL connection string must be supplied. */
export const DEFAULT_DATABASE_URL = "";

/**
 * True for the old on-disk SQLite default.
 *
 * Storage moved to PostgreSQL, so a `file:` URL now only ever means DATABASE_URL
 * was not supplied and something fell back to a stale default. Naming that is
 * far more useful than the driver error it would otherwise become.
 */
export function isFileDatabase(url: string) {
  return url.startsWith("file:") || (url.length > 0 && !url.includes("://"));
}

export const serverEnv = {
  get databaseUrl() {
    return optional("DATABASE_URL") ?? DEFAULT_DATABASE_URL;
  },
  /**
   * Secret used to sign session cookies. A generated fallback keeps local
   * development zero-config; production must set it so sessions survive a
   * restart and cannot be forged across deployments.
   */
  get sessionSecret() {
    const configured = optional("SESSION_SECRET");
    if (configured) return configured;
    if (process.env.NODE_ENV === "production") {
      throw new MissingEnvError("SESSION_SECRET");
    }
    return developmentSessionSecret();
  },

  // ---- AI provider (swappable via env, never hardcoded) ----
  get aiProvider() {
    return (optional("AI_PROVIDER") ?? "anthropic").toLowerCase();
  },
  get aiApiKey() {
    return optional("AI_API_KEY");
  },
  get aiModel() {
    return optional("AI_MODEL") ?? "claude-sonnet-5";
  },
  get aiBaseUrl() {
    return optional("AI_BASE_URL");
  },
  get aiMaxTokens() {
    return Number(optional("AI_MAX_TOKENS") ?? 2048);
  },

  // ---- Code execution service ----
  get executionDriver() {
    // "local"  – in-process guarded runner (dev only, requires local toolchain)
    // "remote" – dedicated sandbox service (Docker workers) via EXECUTION_SERVICE_URL
    return (optional("EXECUTION_DRIVER") ?? "local").toLowerCase();
  },
  get executionServiceUrl() {
    return optional("EXECUTION_SERVICE_URL");
  },
  get executionServiceToken() {
    return optional("EXECUTION_SERVICE_TOKEN");
  },
  get executionTimeoutMs() {
    return Number(optional("EXECUTION_TIMEOUT_MS") ?? 5000);
  },
  get executionMemoryMb() {
    return Number(optional("EXECUTION_MEMORY_MB") ?? 256);
  },
  get executionOutputLimitBytes() {
    return Number(optional("EXECUTION_OUTPUT_LIMIT_BYTES") ?? 64 * 1024);
  },
  get executionWorkDir() {
    return optional("EXECUTION_WORKDIR");
  },

  // ---- Platform ----
  get adminEmails() {
    return (optional("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  },
  get appUrl() {
    return optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
} as const;

/**
 * Values that look configured but are not. `prisma init` and `.env.example`
 * both leave templates behind, and reporting those as "configured" sends people
 * hunting for the wrong problem.
 */
const PLACEHOLDER =
  /USER:PASSWORD|username:password|johndoe|randompassword|placeholder|xxxx|ep-xxxx|<[^>]+>|pk_test_\.\.\.|sk_test_\.\.\.|^\.\.\.$/i;

function isReal(key: string): boolean {
  const value = optional(key);
  return Boolean(value) && !PLACEHOLDER.test(value!);
}

/**
 * Non-throwing readiness probe used by the health endpoint.
 * Storage and authentication are built in, so they need no configuration.
 */
export function envStatus() {
  const url = serverEnv.databaseUrl;
  const sessionSecretConfigured = isReal("SESSION_SECRET");
  const production = serverEnv.isProduction;

  // In production a file database and a missing session secret are each fatal,
  // so report them as *not configured* rather than as healthy defaults — this
  // probe is the first thing anyone checks when a deployment misbehaves.
  return {
    database: Boolean(url) && !isFileDatabase(url),
    databaseUrl: url,
    databaseIsFile: isFileDatabase(url),
    auth: production ? sessionSecretConfigured : true,
    sessionSecretConfigured,
    ai: isReal("AI_API_KEY"),
    executionRemote: isReal("EXECUTION_SERVICE_URL"),
  };
}
