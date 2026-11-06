import { describe, it, expect, beforeEach, vi } from "vitest";
import { Asset, Keypair } from "@stellar/stellar-sdk";
import { discoverRoutes, clearRouteCache, type PathFinder, type HorizonPathRecord } from "../routing";

const issuer = Keypair.random().publicKey();
const usdc = new Asset("USDC", issuer);
const xlm = Asset.native();

function fake(records: HorizonPathRecord[], opts: { fail?: boolean; fee?: string } = {}) {
  const call = vi.fn(async () => {
    if (opts.fail) throw new Error("horizon down");
    return { records };
  });
  const finder: PathFinder = {
    strictSendPaths: vi.fn(() => ({ call })),
    feeStats: async () => ({ max_fee: { p70: opts.fee ?? "100" } }),
  };
  return { finder, call };
}

const params = { from: "XLM", to: "USDC", amount: "100", sourceAsset: xlm, destAsset: usdc };

describe("route discovery", () => {
  beforeEach(() => clearRouteCache());

  it("picks the route that delivers the most and reports the full breakdown", async () => {
    const { finder } = fake([
      { source_amount: "100.0000000", destination_amount: "11.2000000", path: [] },
      { source_amount: "100.0000000", destination_amount: "11.9000000", path: [{ asset_type: "credit_alphanum4", asset_code: "EURC", asset_issuer: issuer }] },
      { source_amount: "100.0000000", destination_amount: "11.5000000", path: [] },
    ]);
    const r = await discoverRoutes(params, finder);
    expect(r.best?.receiveAmount).toBe("11.9000000");
    expect(r.best?.hops).toEqual(["XLM", "EURC", "USDC"]);
    expect(r.best?.effectiveRate).toBe("0.1190000");
    expect(r.best?.cost.platformFee).toBe("0");
    expect(r.best?.cost.networkFeeStroops).toBe(100);
    expect(r.alternatives.map((a) => a.receiveAmount)).toEqual(["11.5000000", "11.2000000"]);
  });

  it("prefers fewer hops when two routes deliver the same amount", async () => {
    const { finder } = fake([
      { source_amount: "100", destination_amount: "10.0000000", path: [{ asset_type: "native" }] },
      { source_amount: "100", destination_amount: "10.0000000", path: [] },
    ]);
    expect((await discoverRoutes(params, finder)).best?.hops).toEqual(["XLM", "USDC"]);
  });

  it("returns best=null when Horizon finds no path", async () => {
    const { finder } = fake([]);
    expect((await discoverRoutes(params, finder)).best).toBeNull();
  });

  it("uses the network fee from fee stats when higher than the base fee", async () => {
    const { finder } = fake([{ source_amount: "100", destination_amount: "10", path: [] }], { fee: "450" });
    expect((await discoverRoutes(params, finder)).best?.cost.networkFeeStroops).toBe(450);
  });

  it("caches identical lookups", async () => {
    const { finder, call } = fake([{ source_amount: "100", destination_amount: "10", path: [] }]);
    await discoverRoutes(params, finder);
    const second = await discoverRoutes(params, finder);
    expect(call).toHaveBeenCalledTimes(1);
    expect(second.source).toBe("cache");
  });

  it("propagates Horizon failure instead of inventing a quote", async () => {
    const { finder } = fake([], { fail: true });
    await expect(discoverRoutes(params, finder)).rejects.toThrow("horizon down");
  });

  it("treats same-asset sends as a direct 1:1 payment without calling Horizon", async () => {
    const { finder, call } = fake([]);
    const r = await discoverRoutes({ from: "XLM", to: "XLM", amount: "5", sourceAsset: xlm, destAsset: xlm }, finder);
    expect(call).not.toHaveBeenCalled();
    expect(r.best).toMatchObject({ receiveAmount: "5.0000000", effectiveRate: "1.0000000", hops: ["XLM"] });
  });
});
