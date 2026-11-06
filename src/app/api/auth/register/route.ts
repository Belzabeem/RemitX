import { NextRequest } from "next/server";
import { data } from "@/lib/data";
import { hashPassword, signToken, setSessionCookie, toSafeUser } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  rateLimit,
  sanitizeInput,
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
    const rl = rateLimit(`register:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      logSecurityEvent("rate_limited", { ip, endpoint: "register" });
      return errorResponse("Too many registration attempts. Please try again later.", 429);
    }

    const body = (await readBodyWithLimit(request)) as Record<string, unknown>;
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid registration data", 400);
    }

    const { firstName, lastName, email, password, turnstileToken } = parsed.data;

    // Sanitize inputs before storing
    const cleanFirstName = sanitizeInput(firstName, 50);
    const cleanLastName = sanitizeInput(lastName, 50);
    const cleanEmail = sanitizeEmail(email);

    const turnstile = await verifyTurnstileToken(turnstileToken);
    if (!turnstile.success) {
      return errorResponse(`Verification failed: ${turnstile.reason}`, 400);
    }

    // Check if user already exists
    const existing = await data.users.findByEmail(cleanEmail);
    if (existing) {
      return errorResponse("Email already registered", 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await data.users.create({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: cleanEmail,
      passwordHash,
      // A wallet is linked later by signing a SEP-10 challenge; the server never generates keys.
      stellarPublicKey: null,
      kycStatus: "pending",
      sessionVersion: 1,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    logSecurityEvent("register", { userId: user.id });

    const safeUser = toSafeUser(user);
    const token = signToken(safeUser, 1);
    await setSessionCookie(token);

    return successResponse({ user: safeUser }, 201);
  } catch (err) {
    console.error("Registration error:", err);
    return errorResponse("Internal server error", 500);
  }
}
