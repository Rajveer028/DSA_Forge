import { serverEnv } from "@/lib/env";
import type { SandboxDriver, SandboxJob, SandboxResult } from "@/lib/execution/types";
import type { Language } from "@/generated/prisma/enums";

/**
 * Production execution driver.
 *
 * Posts the job to the isolated worker service (see `sandbox/`), which runs
 * each submission inside a single-use container with:
 *   • no network (--network none)
 *   • a read-only root filesystem and a tmpfs workdir
 *   • dropped capabilities and no-new-privileges
 *   • cgroup CPU / memory / PID caps
 *   • wall-clock kill and stdout truncation
 *
 * The worker has no database credentials, no Clerk secret and no AI key; the
 * only thing it ever receives is source code plus test inputs.
 */
export class RemoteSandboxDriver implements SandboxDriver {
  readonly name = "remote";

  private get baseUrl() {
    const url = serverEnv.executionServiceUrl;
    if (!url) {
      throw new Error(
        "EXECUTION_DRIVER=remote requires EXECUTION_SERVICE_URL to point at the sandbox worker service.",
      );
    }
    return url.replace(/\/$/, "");
  }

  async supports(language: Language): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/languages`, {
        headers: this.headers(),
        cache: "no-store",
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { languages?: string[] };
      return (data.languages ?? []).includes(language);
    } catch {
      return false;
    }
  }

  private headers() {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (serverEnv.executionServiceToken) {
      headers.authorization = `Bearer ${serverEnv.executionServiceToken}`;
    }
    return headers;
  }

  async run(job: SandboxJob): Promise<SandboxResult> {
    const controller = new AbortController();
    const budget =
      job.testCases.length * (job.limits.timeoutMs + 1500) + 30_000;
    const timer = setTimeout(() => controller.abort(), budget);

    try {
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(job),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        return {
          compiled: false,
          compileLog: null,
          cases: [],
          fatal: {
            status: "INTERNAL_ERROR",
            message: `Execution service error (${response.status}). ${detail}`,
          },
        };
      }

      return (await response.json()) as SandboxResult;
    } catch (error) {
      const aborted = (error as Error)?.name === "AbortError";
      return {
        compiled: false,
        compileLog: null,
        cases: [],
        fatal: {
          status: aborted ? "TIME_LIMIT_EXCEEDED" : "INTERNAL_ERROR",
          message: aborted
            ? "The execution service did not respond in time."
            : "Could not reach the execution service. Please try again in a moment.",
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
