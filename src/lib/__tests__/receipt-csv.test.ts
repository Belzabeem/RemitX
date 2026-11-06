import { describe, it, expect, beforeEach } from "vitest";
import { getReceipt, ReceiptNotFoundError, clearReceiptCache, type HorizonLike } from "../receipt";
import { csvCell, toCsv } from "../csv";

const HASH = "a".repeat(64);
const horizon = (opts: { notFound?: boolean } = {}): HorizonLike => ({
  transactions: () => ({
    transaction: () => ({
      call: async () => {
        if (opts.notFound) throw Object.assign(new Error("nf"), { response: { status: 404 } });
        return { successful: true, ledger: 42, created_at: "2026-11-01T00:00:00Z", source_account: "GSRC", fee_charged: "100", memo: "hi" };
      },
    }),
  }),
  operations: () => ({
    forTransaction: () => ({
      call: async () => ({
        records: [{ type: "path_payment_strict_send", from: "GSRC", to: "GDST", source_asset_type: "native", source_amount: "10.0000000", asset_type: "credit_alphanum4", asset_code: "USDC", amount: "1.2000000" }],
      }),
    }),
  }),
});

describe("receipts", () => {
  beforeEach(() => clearReceiptCache());
  it("builds a receipt from Horizon data with an explorer link", async () => {
    const r = await getReceipt(HASH, horizon(), "https://stellar.expert/explorer/testnet");
    expect(r).toMatchObject({ successful: true, ledger: 42, memo: "hi", explorerUrl: `https://stellar.expert/explorer/testnet/tx/${HASH}` });
    expect(r.operations[0]).toMatchObject({ sendAsset: "XLM", sendAmount: "10.0000000", receiveAsset: "USDC", receiveAmount: "1.2000000", to: "GDST" });
  });
  it("rejects malformed hashes before touching the network", async () => {
    await expect(getReceipt("../etc/passwd", horizon(), "x")).rejects.toBeInstanceOf(ReceiptNotFoundError);
  });
  it("maps Horizon 404 to not-found", async () => {
    await expect(getReceipt(HASH, horizon({ notFound: true }), "x")).rejects.toBeInstanceOf(ReceiptNotFoundError);
  });
});

describe("csv", () => {
  it("neutralises formula injection and escapes quotes/commas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("a,b")).toBe("\"a,b\"");
    expect(csvCell(null)).toBe("");
  });
  it("joins rows", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("a,b\n1,x\n");
  });
});
