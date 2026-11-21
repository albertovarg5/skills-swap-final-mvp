import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchBooks } from "../services/bookService";

const fast = { delayMs: 1 };
const ok = (docs) => ({ ok: true, status: 200, json: async () => ({ docs }) });
const fail = (status) => ({ ok: false, status });

afterEach(() => vi.unstubAllGlobals());

describe("fetchBooks automatic retry", () => {
  it("retries a network error and then succeeds", async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError("network")).mockResolvedValueOnce(ok([{ key: "a" }]));
    vi.stubGlobal("fetch", f);
    expect(await fetchBooks("js", undefined, fast)).toEqual([{ key: "a" }]);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("retries a 503 twice, then gives up (3 calls)", async () => {
    const f = vi.fn().mockResolvedValue(fail(503));
    vi.stubGlobal("fetch", f);
    await expect(fetchBooks("js", undefined, fast)).rejects.toThrow("Could not load books");
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 404", async () => {
    const f = vi.fn().mockResolvedValue(fail(404));
    vi.stubGlobal("fetch", f);
    await expect(fetchBooks("js", undefined, fast)).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("does not retry a cancelled request", async () => {
    const f = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    vi.stubGlobal("fetch", f);
    await expect(fetchBooks("js", undefined, fast)).rejects.toThrow("Aborted");
    expect(f).toHaveBeenCalledTimes(1);
  });
});
