import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { orderService } from "@/services/order.service";
import { parseBody, CheckoutSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/apiResponse";
import { Permission } from "@/types";

// POST /api/orders/:id/checkout — place the order & pay (requires CHECKOUT_ORDER).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAccess(req, Permission.CHECKOUT_ORDER);
    const { paymentMethodId } = await parseBody(req, CheckoutSchema);
    const result = await orderService.checkout(user, params.id, paymentMethodId);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
