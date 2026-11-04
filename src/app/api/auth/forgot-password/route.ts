import { NextRequest } from "next/server";
import { data } from "@/lib/data";
import { successResponse, errorResponse } from "@/lib/api-response";
import { generateResetToken, rateLimit, sanitizeEmail, logSecurityEvent } from "@/lib/security";

// API routes must not pre-render
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`forgot-password:${ip}`, 3, 60_000);
    if (!rl.allowed) {
      logSecurityEvent("rate_limited", { ip, endpoint: "forgot-password" });
      return errorResponse("Too many requests. Please try again later.", 429);
    }

    const body = await request.json();
    const email = sanitizeEmail(body.email || "");

    if (!email || !email.includes("@")) {
      return errorResponse("Invalid email address", 400);
    }

    // Always return success to prevent user enumeration
    const user = await data.users.findByEmail(email);

    if (user) {
      const { token, expiresAt } = generateResetToken(user.id);
      logSecurityEvent("password_reset_request", { userId: user.id });

      // In production, send email with reset link. In dev, log without leaking passwords.
      console.log(`[DEV] Password reset token generated for ${email} (expires ${new Date(expiresAt).toISOString()})`);
    }

    return successResponse({
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return errorResponse("Internal server error", 500);
  }
}
