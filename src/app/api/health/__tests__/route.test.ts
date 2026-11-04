import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockUsersList } = vi.hoisted(() => ({
  mockUsersList: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  DATA_MODE: "memory",
  data: {
    users: {
      list: mockUsersList,
    },
  },
}));

vi.mock("@/lib/stellar", () => ({
  HORIZON_URL: "https://horizon-testnet.stellar.org",
}));

import { GET } from "../route";

beforeEach(() => {
  mockUsersList.mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/health", () => {
  it("returns 200 ok when both the data layer and Stellar Horizon are reachable", async () => {
    mockUsersList.mockResolvedValue([]);
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      status: "ok",
      dataMode: "memory",
      checks: { database: true, stellar: true },
    });
  });

  it("returns 503 degraded when the data query throws", async () => {
    mockUsersList.mockRejectedValue(new Error("store unavailable"));
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.data).toEqual({
      status: "degraded",
      dataMode: "memory",
      checks: { database: false, stellar: true },
    });
  });

  it("returns 503 degraded when Horizon responds with a non-2xx status", async () => {
    mockUsersList.mockResolvedValue([]);
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 502 }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.data.checks).toEqual({ database: true, stellar: false });
  });

  it("returns 503 degraded when the Horizon fetch itself throws (network error/timeout)", async () => {
    mockUsersList.mockResolvedValue([]);
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.data.checks).toEqual({ database: true, stellar: false });
  });

  it("returns 503 degraded when both dependencies are down, not just the first one checked", async () => {
    mockUsersList.mockRejectedValue(new Error("store unavailable"));
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.data).toEqual({
      status: "degraded",
      dataMode: "memory",
      checks: { database: false, stellar: false },
    });
  });
});
