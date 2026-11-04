import { data } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-response";
import { transactionIdSchema } from "@/lib/validations";

// API routes must not pre-render
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse();

  const parsed = transactionIdSchema.safeParse(await params);
  if (!parsed.success) {
    return errorResponse("Invalid transaction ID", 400);
  }

  const { id } = parsed.data;

  const tx = await data.transactions.findById(id);
  if (!tx || tx.userId !== user.id) {
    return errorResponse("Transaction not found", 404);
  }

  const escrow = await data.escrows.findByTransactionId(tx.id);

  return successResponse({ transaction: tx, escrow: escrow || null });
}
