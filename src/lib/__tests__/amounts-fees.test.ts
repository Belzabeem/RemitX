import { describe, it, expect } from "vitest";
import { toStroops, fromStroops, ratio, applySlippageBps } from "../amounts";
import { applyBuffer, stroopsToXlm } from "../fees";

describe("amounts", () => {
  it("round-trips 7-decimal amounts exactly", () => {
    expect(fromStroops(toStroops("0.1234567"))).toBe("0.1234567");
    expect(fromStroops(toStroops("100"))).toBe("100.0000000");
  });
  it("avoids float error (0.1 + 0.2 style)", () => {
    expect(fromStroops(toStroops("0.1") + toStroops("0.2"))).toBe("0.3000000");
  });
  it("rejects more than 7 decimals and negatives", () => {
    expect(() => toStroops("1.12345678")).toThrow();
    expect(() => toStroops("-1")).toThrow();
  });
  it("computes rate and rounds slippage down", () => {
    expect(ratio(toStroops("150"), toStroops("100"))).toBe("1.5000000");
    expect(fromStroops(applySlippageBps(toStroops("100"), 100))).toBe("99.0000000");
    expect(applySlippageBps(BigInt(1), 100)).toBe(BigInt(0));
  });
});

describe("fee buffer", () => {
  it("adds 10% to the resource fee, rounding up", () => {
    expect(applyBuffer({ minResourceFee: 1000, inclusionFee: 100 })).toEqual({
      inclusionFeeStroops: 100,
      resourceFeeStroops: 1100,
      totalFeeStroops: 1200,
    });
    expect(applyBuffer({ minResourceFee: 11, inclusionFee: 0 }).resourceFeeStroops).toBe(13);
  });
  it("never returns negative fees", () => {
    expect(applyBuffer({ minResourceFee: -5, inclusionFee: -1 }).totalFeeStroops).toBe(0);
  });
  it("formats stroops as XLM", () => {
    expect(stroopsToXlm(100)).toBe("0.0000100");
  });
});
