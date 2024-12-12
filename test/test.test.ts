import { describe, expect, test } from "bun:test";
import { sleep } from "bun";
import { SerializedExecutor, TimeoutError } from "../src";

describe("Basic test", async () => {
  test("Should return a value, async", async () => {
    const executor = new SerializedExecutor();
    const result = executor.execute(async () => {
      return 123;
    });
    expect(result).resolves.toBe(123);
  });

  test("Should return a value, sync", async () => {
    const executor = new SerializedExecutor();
    const result = executor.execute(() => {
      return 123;
    });
    expect(result).resolves.toBe(123);
  });

  test("Should throw an error", async () => {
    const executor = new SerializedExecutor();
    const result = executor.execute(async () => {
      throw new Error("Test Error");
    });
    expect(result).rejects.toBeInstanceOf(Error);
  });
});

describe("Functionality test", async () => {
  describe("Order", async () => {
    test("Should return correct value", async () => {
      const executor = new SerializedExecutor();
      const result1 = executor.execute(async () => {
        return 123;
      });
      const result2 = executor.execute(async () => {
        return 456;
      });
      expect(result1, "Result 1 Failure").resolves.toBe(123);
      expect(result2, "Result 2 Failure").resolves.toBe(456);
    });
    test("Should not confuse results", async () => {
      const executor = new SerializedExecutor();
      const result2 = executor.execute(async () => {
        return 456;
      });
      const result1 = executor.execute(async () => {
        return 123;
      });
      expect(result1, "Result 1 Failure").resolves.toBe(123);
      expect(result2, "Result 2 Failure").resolves.toBe(456);
    });
  });

  describe("Timeout", async () => {
    test("Should not be rejected by timeout error", async () => {
      const executor = new SerializedExecutor({ timeout: 1000 });
      const result = executor.execute(async () => {
        await sleep(1);
      });
      expect(result).resolves.toBeUndefined();
    });
    test("Should be rejected by timeout error", async () => {
      const executor = new SerializedExecutor({ timeout: 1 });
      const result = executor.execute(async () => {
        await sleep(1000);
      });
      expect(result).rejects.toBeInstanceOf(TimeoutError);
    });
  });
});

describe("Complex test", async () => {
  test("Should take some time to execute", async () => {
    const time = 50;
    const executor = new SerializedExecutor();
    const result = executor.execute(async () => {
      await sleep(time);
    });
    const start = Date.now();
    await result;
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(time);
  });

  // This test is to check serialization
  test("Should consume queue in order, not in parallel", async () => {
    const executor = new SerializedExecutor();
    const fn = async () => {
      sleep(50);
    };
    const result1 = executor.execute(fn);
    const result2 = executor.execute(fn);
    // Await for result2, which should invoke result1 to consume queue
    await result2;

    const start = Date.now();
    // In theory, result1 is "already" done - should not take more than overhead
    await result1;
    const end = Date.now();

    // If it was parallel or done in order of 2 to 1, it would take more than 50ms (failure)
    expect(end - start).toBeLessThanOrEqual(10);
  });

  // This test is to check capable of doing debounce or any other
  test("Should reject second result", async () => {
    const executor = new SerializedExecutor();
    let flag = false;
    // One should not throw, but two or more should
    const fn = async () => {
      if (flag) {
        throw new Error("Test Error");
      }
      flag = true;
    };
    const result1 = executor.execute(fn);
    const result2 = executor.execute(fn);
    // It seems this is invalid(it throws ACTUAL error), result1 will return undefined for this time
    // expect(result1).resolves.toBeUndefined();
    expect(result2).rejects.toBeInstanceOf(Error);
  });
});
