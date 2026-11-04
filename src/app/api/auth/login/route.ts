import { NextRequest } from "next/server";
import { data } from "@/lib/data";
import { verifyPassword, signToken, setSessionCookie, toSafeUser } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  rateLimit,
  checkAccountLockout,
  recordFailedLogin,
  resetLoginAttempts,
  sanitizeEmail,
  logSecurityEvent,
  readBodyWithLimit,
} from "@/lib/security";

// API routes must not pre-render
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`login:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      logSecurityEvent("rate_limited", { ip, endpoint: "login" });
      return errorResponse("Too many attempts. Please try again later.", 429);
    }

    const body = (await readBodyWithLimit(request)) as Record<string, unknown>;
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid email or password", 400);
    }

    const { email, password, turnstileToken } = parsed.data;
    const normalizedEmail = sanitizeEmail(email);

    // Check account lockout
    const lockout = checkAccountLockout(normalizedEmail);
    if (lockout.locked) {
      logSecurityEvent("login_locked", { email: normalizedEmail });
      return errorResponse(
        `Account temporarily locked. Try again in ${Math.ceil(lockout.retryAfterMs / 60000)} minutes.`,
        429
      );
    }

    const turnstile = await verifyTurnstileToken(turnstileToken);
    if (!turnstile.success) {
      return errorResponse(`Verification failed: ${turnstile.reason}`, 400);
    }

    const user = await data.users.findByEmail(normalizedEmail);

    // Prevent user enumeration - same error for user not found and wrong password
    if (!user) {
      recordFailedLogin(normalizedEmail);
      logSecurityEvent("login_failed", { email: normalizedEmail, reason: "user_not_found" });
      return errorResponse("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      recordFailedLogin(normalizedEmail);
      logSecurityEvent("login_failed", { email: normalizedEmail, reason: "wrong_password" });
      return errorResponse("Invalid email or password", 401);
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return errorResponse("Account temporarily locked. Try again later.", 429);
    }

    // Success - reset attempts and log
    resetLoginAttempts(normalizedEmail);
    logSecurityEvent("login_success", { userId: user.id });

    const safeUser = toSafeUser(user);
    const token = signToken(safeUser, user.sessionVersion || 1);
    await setSessionCookie(token);

    return successResponse({ user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    return errorResponse("Internal server error", 500);
  }
}
