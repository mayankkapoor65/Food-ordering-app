import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { restaurantService } from "@/services/restaurant.service";
import { ok, handleError } from "@/lib/apiResponse";
import { Permission } from "@/types";

// GET /api/restaurants/:id — single restaurant with its full menu (guarded).
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAccess(req, Permission.VIEW_RESTAURANTS);
    const restaurant = await restaurantService.getById(user, params.id);
    return ok(restaurant);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
