import { NextRequest } from "next/server";
import { data } from "@/lib/data";
import { hashPassword } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  validateResetToken,
  rateLimit,
  logSecurityEvent,
  readBodyWithLimit,
} from "@/lib/security";

// API routes must not pre-render
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`reset-password:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      logSecurityEvent("rate_limited", { ip, endpoint: "reset-password" });
      return errorResponse("Too many attempts. Please try again later.", 429);
    }

    const body = (await readBodyWithLimit(request)) as Record<string, unknown>;
    const { token, newPassword } = body as { token?: string; newPassword?: string };

    if (!token || !newPassword || newPassword.length < 8) {
      return errorResponse("Invalid token or password must be at least 8 characters", 400);
    }

    // Validate the reset token (checks expiry + signature)
    const resetData = validateResetToken(token);
    if (!resetData) {
      logSecurityEvent("password_reset_complete", { reason: "invalid_or_expired_token" });
      return errorResponse("Reset link is invalid or has expired. Please request a new one.", 400);
    }

    // Fetch existing user to increment session version
    const existingUser = await data.users.findById(resetData.userId);
    if (!existingUser) {
      return errorResponse("User not found", 404);
    }

    const nextSessionVersion = (existingUser.sessionVersion ?? 1) + 1;
    const passwordHash = await hashPassword(newPassword);

    await data.users.update(resetData.userId, {
      passwordHash,
      sessionVersion: nextSessionVersion,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    logSecurityEvent("password_reset_complete", { userId: resetData.userId });

    return successResponse({ message: "Password reset successful. Please log in with your new password." });
  } catch (err) {
    console.error("Reset password error:", err);
    return errorResponse("Internal server error", 500);
  }
}
