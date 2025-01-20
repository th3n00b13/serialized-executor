type SerializedExecutorOptions = {
  /** Specifies timeout (in milliseconds) for the promise. Once the timeout expires, the promise will no longer be resolved and rejected from execution.\
   * Will not apply if `timeout` is `0`.\
   * *Promise itself will still keep going on even after the timeout, there is likely no way to stop it, so it is not recommended to queue something that never resolves or rejects.*
   * @default 0
   */
  timeout?: number;
};

export class TimeoutError extends Error {}

type ExecutionStatus = {
  /** Check the function has been marked as timed out or not */
  timedOut: () => boolean;
};
type AsyncFn<T = unknown> = (status: ExecutionStatus) => T | Promise<T>;

type QueueItem<T, E> = {
  fn: AsyncFn<T>;
  resolve: (result: T) => void;
  reject: (error: E) => void;
};

/**
 * This class
 */
export class SerializedExecutor {
  readonly options: SerializedExecutorOptions;
  queue: QueueItem<unknown, unknown>[] = [];
  #isRunning = false;

  /**
   * Constructs a new `SerializedExecutor`
   * @param options
   */
  constructor(options?: SerializedExecutorOptions) {
    this.options = options || {};
  }

  /**
   * Put a function into the queue, and run it
   * @param fn
   * @returns
   */
  async execute<T extends AsyncFn<unknown>>(
    fn: T
  ): Promise<Awaited<ReturnType<T>>> {
    // This is quite weird type but at least it works
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve: resolve as (result: unknown) => void,
        reject,
      });
      if (!this.#isRunning) this.#run();
    });
  }

  /**
   * Internal function that runs the queue
   * @returns
   */
  async #run() {
    if (this.#isRunning) return;
    this.#isRunning = true;
    do {
      const item = this.queue.shift();
      if (!item) continue;
      const { fn, resolve, reject } = item;

      let timedOut = false;

      // (I think this is not that performant through, but it shouldn't be that much)
      await Promise.race(
        [
          fn({
            timedOut: () => {
              return timedOut;
            },
          }),
          this.options.timeout
            ? new Promise((_, reject) => {
                setTimeout(() => {
                  timedOut = true;
                  reject(new TimeoutError("Timeout"));
                }, this.options.timeout || 0);
              })
            : undefined,
        ].filter((x) => x !== undefined)
      )
        .then(resolve)
        .catch(reject);
    } while (this.queue.length > 0);
    this.#isRunning = false;
  }
}

export default SerializedExecutor;
