import { NextRequest } from "next/server";
import { data } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isDemoRequest } from "@/lib/demo-mode";
import { getDemoTransactions } from "@/lib/demo-mode";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";

// API routes must not pre-render
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // In demo mode, serve the rich demo activity instead of the
    // authenticated user's personal (and potentially empty) history.
    if (await isDemoRequest()) {
      const demoTransactions = await getDemoTransactions();
      return successResponse({
        transactions: demoTransactions.slice(0, 50),
        total: demoTransactions.length,
        limit: 50,
        offset: 0,
        demo: true,
      });
    }

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
