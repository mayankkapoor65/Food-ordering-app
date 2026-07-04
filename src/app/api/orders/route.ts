import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { orderService } from "@/services/order.service";
import { parseBody, CreateOrderSchema } from "@/lib/validation";
import { ok, created, handleError } from "@/lib/apiResponse";
import { Permission } from "@/types";

// GET /api/orders — orders visible to the caller (country-scoped).
export async function GET(req: NextRequest) {
  try {
    const user = await requireAccess(req, Permission.VIEW_RESTAURANTS);
    const orders = await orderService.list(user);
    return ok(orders);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/orders — create an order (CART) and add food items to it.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAccess(req, Permission.CREATE_ORDER);
    const input = await parseBody(req, CreateOrderSchema);
    const order = await orderService.create(user, input);
    return created(order);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
