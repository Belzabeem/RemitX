import { describe, it, expect, vi, afterEach } from "vitest";
import { getRate, RateUnavailableError } from "../rates";

afterEach(() => vi.unstubAllGlobals());

describe("rates never invent a number", () => {
  it("throws when no live source and nothing was ever fetched", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(getRate("ZZZ", "YYY")).rejects.toBeInstanceOf(RateUnavailableError);
  });

  it("returns 1 for identical assets without a network call", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await getRate("USD", "USD")).rate).toMatch(/^1(\.0+)?$/);
    expect(f).not.toHaveBeenCalled();
  });
});
