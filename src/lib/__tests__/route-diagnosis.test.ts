import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../client-api", () => ({ api: vi.fn() }));
import { api } from "../client-api";
import { explainNoRoute } from "../route-diagnosis";

const mocked = vi.mocked(api);
afterEach(() => mocked.mockReset());

const found = { ok: true as const, data: { best: { sendAmount: "x" } } };
const none = { ok: true as const, data: { best: null } };

describe("explainNoRoute", () => {
  it("reports how much can be sent when a smaller amount has a route", async () => {
    mocked.mockImplementation(async (url: string) => (url.includes("amount=100&") || url.endsWith("amount=100") ? found : url.includes("amount=10") ? found : none) as never);
    const msg = await explainNoRoute("USD", "XLM", "1000");
    expect(msg).toMatch(/too thin/);
    expect(msg).toMatch(/100 USD/);
  });

  it("says nobody is trading the pair when no size has a route", async () => {
    mocked.mockResolvedValue(none as never);
    const msg = await explainNoRoute("USD", "XLM", "55");
    expect(msg).toMatch(/Nobody is trading USD for XLM/);
    expect(mocked).toHaveBeenCalledTimes(3);
  });

  it("does not re-probe the same question twice", async () => {
    mocked.mockResolvedValue(none as never);
    await explainNoRoute("EUR", "XLM", "7");
    const calls = mocked.mock.calls.length;
    await explainNoRoute("EUR", "XLM", "7");
    expect(mocked.mock.calls.length).toBe(calls);
  });
});
