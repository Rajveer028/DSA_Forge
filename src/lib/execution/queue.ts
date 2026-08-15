/**
 * Bounded work queue for execution jobs.
 *
 * Submitted code never runs inline in a request handler: the route creates a
 * `code_executions` row, hands the job to this queue and returns the id. The
 * client polls for the result. That keeps a burst of submissions from
 * exhausting the server and gives every job an auditable database record.
 *
 * The queue is per-instance and deliberately simple. When EXECUTION_DRIVER is
 * `remote`, the real fan-out happens in the worker service, which is where
 * horizontal scaling belongs.
 */

type Task<T> = () => Promise<T>;

interface QueuedTask {
  run: () => void;
}

export class WorkQueue {
  private active = 0;
  private readonly pending: QueuedTask[] = [];

  constructor(
    private readonly concurrency: number,
    private readonly maxPending: number,
  ) {}

  get stats() {
    return { active: this.active, pending: this.pending.length };
  }

  push<T>(task: Task<T>): Promise<T> {
    if (this.pending.length >= this.maxPending) {
      return Promise.reject(
        new QueueOverflowError(
          "The judge is at capacity right now. Please try again in a few seconds.",
        ),
      );
    }
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.active += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.active -= 1;
            this.drain();
          });
      };
      if (this.active < this.concurrency) run();
      else this.pending.push({ run });
    });
  }

  private drain() {
    while (this.active < this.concurrency && this.pending.length > 0) {
      this.pending.shift()!.run();
    }
  }
}

export class QueueOverflowError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = "QueueOverflowError";
  }
}

const globalForQueue = globalThis as unknown as { forgeQueue?: WorkQueue };

export const executionQueue: WorkQueue =
  globalForQueue.forgeQueue ??
  (globalForQueue.forgeQueue = new WorkQueue(
    Number(process.env.EXECUTION_CONCURRENCY ?? 4),
    Number(process.env.EXECUTION_MAX_PENDING ?? 120),
  ));
