import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { paymentService } from "@/services/payment.service";
import { parseBody, UpdatePaymentMethodSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/apiResponse";
import { Permission } from "@/types";

// PUT /api/payment-methods/:id — modify a method (requires UPDATE_PAYMENT_METHOD).
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAccess(req, Permission.UPDATE_PAYMENT_METHOD);
    const input = await parseBody(req, UpdatePaymentMethodSchema);
    const method = await paymentService.update(user, params.id, input);
    return ok(method);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/payment-methods/:id — remove a method (requires UPDATE_PAYMENT_METHOD).
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAccess(req, Permission.UPDATE_PAYMENT_METHOD);
    const result = await paymentService.remove(user, params.id);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
