import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetMemoryStore } from "../memory/memory-adapter";

// Ensure zero DB environment variables exist
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;
delete process.env.SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

// Mock next/headers cookies
vi.mock("next/headers", () => {
  const store = new Map<string, { value: string }>();
  return {
    cookies: vi.fn().mockResolvedValue({
      get: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, { value }),
      delete: (key: string) => store.delete(key),
    }),
  };
});

// Mock turnstile verification to succeed in testing
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ success: true, decision: "skip" }),
}));

import { GET as healthGet } from "@/app/api/health/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as registerPost } from "@/app/api/auth/register/route";

describe("API Routes End-to-End without Database Environment Variables", () => {
  beforeEach(() => {
    resetMemoryStore();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("/api/health returns 200 with dataMode=memory and zero DB env vars", async () => {
    const res = await healthGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe("ok");
    expect(json.data.dataMode).toBe("memory");
    expect(json.data.checks.database).toBe(true);
    expect(json.data.checks.stellar).toBe(true);
  });

  it("/api/auth/login succeeds for pre-seeded user without DB credentials", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@remitx.dev",
        password: "Password123!",
        turnstileToken: "test_token",
      }),
    });

    const res = await loginPost(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe("alice@remitx.dev");
    expect(json.data.user.firstName).toBe("Alice");
  });

  it("/api/auth/register creates user in in-memory store without DB credentials", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Test",
        lastName: "Contributor",
        email: "contributor@test.org",
        password: "Password123!",
        confirmPassword: "Password123!",
        turnstileToken: "test_token",
      }),
    });

    const res = await registerPost(req as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe("contributor@test.org");

    // Login immediately with the newly registered user
    const loginReq = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "contributor@test.org",
        password: "Password123!",
        turnstileToken: "test_token",
      }),
    });

    const loginRes = await loginPost(loginReq as any);
    const loginJson = await loginRes.json();
    expect(loginRes.status).toBe(200);
    expect(loginJson.data.user.email).toBe("contributor@test.org");
  });
});
