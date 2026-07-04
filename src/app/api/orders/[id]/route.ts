import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { orderService } from "@/services/order.service";
import { ok, handleError } from "@/lib/apiResponse";
import { Permission } from "@/types";

// GET /api/orders/:id — single order (country-guarded).
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAccess(req, Permission.VIEW_RESTAURANTS);
    const order = await orderService.getById(user, params.id);
    return ok(order);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/orders/:id — cancel an order (requires CANCEL_ORDER).
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAccess(req, Permission.CANCEL_ORDER);
    const order = await orderService.cancel(user, params.id);
    return ok(order);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
