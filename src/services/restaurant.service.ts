import { connectDB } from "@/lib/db";
import { Restaurant, type IRestaurant } from "@/models/Restaurant";
import { buildCountryFilter, canAccessCountry } from "@/lib/rbac";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { AuthUser } from "@/types";

/**
 * Restaurant queries. The country-scoping (bonus) rules live here so every
 * caller is consistently constrained to the data they may see.
 */
export const restaurantService = {
  /** List restaurants visible to the user (country-scoped; Admin sees all). */
  async list(user: AuthUser) {
    await connectDB();
    return Restaurant.find(buildCountryFilter(user)).sort({ name: 1 }).lean();
  },

  /** Fetch a single restaurant, enforcing country access. */
  async getById(user: AuthUser, id: string) {
    await connectDB();
    const restaurant = await Restaurant.findById(id).lean<IRestaurant>();
    if (!restaurant) throw new NotFoundError("Restaurant not found.");
    if (!canAccessCountry(user, restaurant.country)) {
      throw new ForbiddenError("This restaurant is outside your region.");
    }
    return restaurant;
  },
};
