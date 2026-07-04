import { connectDB } from "@/lib/db";
import { PaymentMethod } from "@/models/PaymentMethod";
import { buildCountryFilter, canAccessCountry } from "@/lib/rbac";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AuthUser } from "@/types";
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from "@/lib/validation";

/**
 * Payment-method management. Reads are country-scoped for everyone; writes are
 * gated by the UPDATE_PAYMENT_METHOD permission (enforced in the route) and
 * further constrained to the caller's region here.
 */
export const paymentService = {
  async list(user: AuthUser) {
    await connectDB();
    return PaymentMethod.find(buildCountryFilter(user))
      .sort({ country: 1, isDefault: -1 })
      .lean();
  },

  async create(user: AuthUser, input: CreatePaymentMethodInput) {
    if (!canAccessCountry(user, input.country)) {
      throw new ForbiddenError("Cannot manage another region's payment methods.");
    }
    await connectDB();

    if (input.isDefault) {
      await PaymentMethod.updateMany(
        { country: input.country },
        { $set: { isDefault: false } }
      );
    }
    const created = await PaymentMethod.create({
      label: input.label,
      type: input.type,
      last4: input.last4 || "0000",
      country: input.country,
      isDefault: !!input.isDefault,
    });
    logger.info("Payment method created", { id: created._id.toString(), country: input.country });
    return created.toObject();
  },

  async update(user: AuthUser, id: string, input: UpdatePaymentMethodInput) {
    await connectDB();

    const pm = await PaymentMethod.findById(id);
    if (!pm) throw new NotFoundError("Payment method not found.");
    if (!canAccessCountry(user, pm.country)) {
      throw new ForbiddenError("Cannot manage another region's payment methods.");
    }

    if (input.label !== undefined) pm.label = input.label;
    if (input.type !== undefined) pm.type = input.type;
    if (input.last4 !== undefined) pm.last4 = input.last4;
    if (input.isDefault !== undefined) {
      if (input.isDefault) {
        await PaymentMethod.updateMany(
          { country: pm.country },
          { $set: { isDefault: false } }
        );
      }
      pm.isDefault = input.isDefault;
    }
    await pm.save();
    logger.info("Payment method updated", { id });
    return pm.toObject();
  },

  async remove(user: AuthUser, id: string) {
    await connectDB();

    const pm = await PaymentMethod.findById(id);
    if (!pm) throw new NotFoundError("Payment method not found.");
    if (!canAccessCountry(user, pm.country)) {
      throw new ForbiddenError("Cannot manage another region's payment methods.");
    }
    await pm.deleteOne();
    logger.info("Payment method removed", { id });
    return { deleted: true };
  },
};
