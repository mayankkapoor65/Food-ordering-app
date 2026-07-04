import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { restaurantService } from "@/services/restaurant.service";
import { ok, handleError } from "@/lib/apiResponse";
import { Permission } from "@/types";

// GET /api/restaurants — list restaurants the caller may see (country-scoped).
export async function GET(req: NextRequest) {
  try {
    const user = await requireAccess(req, Permission.VIEW_RESTAURANTS);
    const restaurants = await restaurantService.list(user);
    return ok(restaurants);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
