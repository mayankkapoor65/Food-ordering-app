import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { paymentService } from "@/services/payment.service";
import { parseBody, CreatePaymentMethodSchema } from "@/lib/validation";
import { ok, created, handleError } from "@/lib/apiResponse";
import { Permission } from "@/types";

// GET /api/payment-methods — list methods visible to the caller (scoped).
export async function GET(req: NextRequest) {
  try {
    const user = await requireAccess(req, Permission.VIEW_RESTAURANTS);
    const methods = await paymentService.list(user);
    return ok(methods);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/payment-methods — create a method (requires UPDATE_PAYMENT_METHOD).
export async function POST(req: NextRequest) {
  try {
    const user = await requireAccess(req, Permission.UPDATE_PAYMENT_METHOD);
    const input = await parseBody(req, CreatePaymentMethodSchema);
    const method = await paymentService.create(user, input);
    return created(method);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
