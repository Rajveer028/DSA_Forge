/**
 * Execution errors, kept in a leaf module.
 *
 * `src/lib/api.ts` maps this onto a status code and is imported by every route
 * handler. Declaring the class here means those routes do not drag the sandbox
 * drivers — and `node:child_process` with them — into their module graph just
 * to name an error type.
 */

/**
 * Raised when this deployment cannot run code at all, as opposed to running it
 * and getting a bad verdict. It is a configuration state, not a user error, so
 * it becomes a 503 rather than a 500.
 */
export class ExecutionUnavailableError extends Error {
  readonly status = 503;
  readonly code = "EXECUTION_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "ExecutionUnavailableError";
  }
}
