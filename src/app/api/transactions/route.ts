import { NextRequest } from "next/server";
import { data } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

// API routes must not pre-render
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { transactions, total } = await data.transactions.findByUserId(user.id, {
      limit,
      offset,
    });

    return successResponse({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Transactions fetch error:", err);
    return errorResponse("Failed to fetch transactions", 500);
  }
}
