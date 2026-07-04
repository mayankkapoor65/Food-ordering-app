import { connectDB } from "@/lib/db";
import { Order, type IOrder } from "@/models/Order";
import { Restaurant } from "@/models/Restaurant";
import { PaymentMethod } from "@/models/PaymentMethod";
import { buildCountryFilter, canAccessCountry } from "@/lib/rbac";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { OrderStatus } from "@/types";
import type { AuthUser } from "@/types";
import type { CreateOrderInput } from "@/lib/validation";

/**
 * Order lifecycle business logic: create (CART) -> checkout (PLACED) / cancel
 * (CANCELLED). Enforces country access on every operation. RBAC (who may
 * checkout/cancel) is enforced by the route guard before these run.
 */
export const orderService = {
  async list(user: AuthUser) {
    await connectDB();
    return Order.find(buildCountryFilter(user))
      .populate("user", "name email role")
      .populate("paymentMethod", "label type last4")
      .sort({ createdAt: -1 })
      .lean();
  },

  async getById(user: AuthUser, id: string) {
    await connectDB();
    const order = await Order.findById(id)
      .populate("user", "name email role")
      .populate("paymentMethod", "label type last4")
      .lean<IOrder>();
    if (!order) throw new NotFoundError("Order not found.");
    if (!canAccessCountry(user, order.country)) {
      throw new ForbiddenError("This order is outside your region.");
    }
    return order;
  },

  /** Create a CART order. Prices are taken from the authoritative menu. */
  async create(user: AuthUser, input: CreateOrderInput) {
    await connectDB();

    const restaurant = await Restaurant.findById(input.restaurantId);
    if (!restaurant) throw new NotFoundError("Restaurant not found.");
    if (!canAccessCountry(user, restaurant.country)) {
      throw new ForbiddenError("You cannot order from another region.");
    }

    const items = input.items.map((line) => {
      const menuItem = restaurant.menu.id(line.menuItemId);
      if (!menuItem) {
        throw new BadRequestError(`Menu item ${line.menuItemId} not found.`);
      }
      return {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: line.quantity,
      };
    });
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await Order.create({
      user: user.id,
      restaurant: restaurant._id,
      restaurantName: restaurant.name,
      country: restaurant.country,
      items,
      totalAmount: Number(total.toFixed(2)),
      status: OrderStatus.CART,
      paymentMethod: null,
    });
    logger.info("Order created", { orderId: order._id.toString(), userId: user.id });
    return order.toObject();
  },

  /** Place & pay for a CART order using an existing payment method. */
  async checkout(user: AuthUser, id: string, paymentMethodId?: string) {
    await connectDB();

    const order = await Order.findById(id);
    if (!order) throw new NotFoundError("Order not found.");
    if (!canAccessCountry(user, order.country)) {
      throw new ForbiddenError("This order is outside your region.");
    }
    if (order.status !== OrderStatus.CART) {
      throw new BadRequestError(`Cannot checkout an order in status ${order.status}.`);
    }

    const pm = paymentMethodId
      ? await PaymentMethod.findById(paymentMethodId)
      : await PaymentMethod.findOne({ country: order.country, isDefault: true });
    if (!pm) throw new BadRequestError("No valid payment method available.");
    if (!canAccessCountry(user, pm.country)) {
      throw new ForbiddenError("That payment method belongs to another region.");
    }

    order.status = OrderStatus.PLACED;
    order.paymentMethod = pm._id;
    await order.save();
    logger.info("Order placed", { orderId: id, paymentMethod: pm.label });

    return {
      message: `Payment of ${order.totalAmount} processed via ${pm.label}.`,
      order: order.toObject(),
    };
  },

  /** Cancel a CART order. */
  async cancel(user: AuthUser, id: string) {
    await connectDB();

    const order = await Order.findById(id);
    if (!order) throw new NotFoundError("Order not found.");
    if (!canAccessCountry(user, order.country)) {
      throw new ForbiddenError("This order is outside your region.");
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError("Order is already cancelled.");
    }

    order.status = OrderStatus.CANCELLED;
    await order.save();
    logger.info("Order cancelled", { orderId: id, userId: user.id });
    return order.toObject();
  },
};
