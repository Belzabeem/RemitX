import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAnchorInfo, isSafePublicHttpsUrl, clearAnchorCache, type Sep24Deps } from "../sep24";

const deps = (over: Partial<Sep24Deps> = {}): Sep24Deps => ({
  resolveToml: async () => ({ TRANSFER_SERVER_SEP0024: "https://api.anchor.example/sep24/" }),
  getJson: (async () => ({
    deposit: { USDC: { enabled: true, fee_fixed: 1, fee_percent: 0.5, min_amount: 10 } },
    withdraw: { USDC: { enabled: false } },
  })) as Sep24Deps["getJson"],
  ...over,
});

describe("SEP-24 anchor info", () => {
  beforeEach(() => clearAnchorCache());

  it("reads fees from the anchor's /info endpoint", async () => {
    const getJson = vi.fn(deps().getJson as (u: string) => Promise<unknown>) as unknown as Sep24Deps["getJson"];
    const r = await getAnchorInfo("a.example", deps({ getJson }));
    expect(r.reachable).toBe(true);
    expect(getJson).toHaveBeenCalledWith("https://api.anchor.example/sep24/info");
    expect(r.deposit?.USDC).toMatchObject({ enabled: true, feeFixed: 1, feePercent: 0.5, minAmount: 10 });
    expect(r.withdraw?.USDC.enabled).toBe(false);
  });

  it("fails soft when the anchor is unreachable", async () => {
    const r = await getAnchorInfo("down.example", deps({ resolveToml: async () => { throw new Error("ENOTFOUND"); } }));
    expect(r.reachable).toBe(false);
    expect(r.error).toMatch(/unreachable/i);
  });

  it("reports anchors without SEP-24", async () => {
    const r = await getAnchorInfo("nosep.example", deps({ resolveToml: async () => ({}) }));
    expect(r.reachable).toBe(false);
    expect(r.error).toMatch(/SEP-24/);
  });

  it("refuses a transfer server that points at internal addresses", async () => {
    const r = await getAnchorInfo("evil.example", deps({ resolveToml: async () => ({ TRANSFER_SERVER_SEP0024: "https://169.254.169.254/latest" }) }));
    expect(r.reachable).toBe(false);
    expect(r.error).toMatch(/unsafe/);
  });

  it("caches a successful lookup", async () => {
    const getJson = vi.fn(deps().getJson as (u: string) => Promise<unknown>) as unknown as Sep24Deps["getJson"];
    await getAnchorInfo("c.example", deps({ getJson }));
    await getAnchorInfo("c.example", deps({ getJson }));
    expect(getJson).toHaveBeenCalledTimes(1);
  });

  it("URL safety rules", () => {
    expect(isSafePublicHttpsUrl("https://anchor.example/x")).toBe(true);
    for (const bad of ["http://anchor.example", "https://localhost/x", "https://10.0.0.5/x", "https://192.168.1.1", "https://[::1]/", "not a url"]) {
      expect(isSafePublicHttpsUrl(bad)).toBe(false);
    }
  });
});
