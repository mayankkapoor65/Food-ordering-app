import mongoose, { Schema, model, models } from "mongoose";
import { Country, OrderStatus } from "@/types";

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IOrder {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  restaurant: mongoose.Types.ObjectId;
  restaurantName: string;
  country: Country; // inherited from the ordering user — drives scoping
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: mongoose.Types.ObjectId | null;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    restaurantName: { type: String, required: true },
    country: {
      type: String,
      enum: Object.values(Country),
      required: true,
      index: true,
    },
    items: { type: [OrderItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CART,
    },
    paymentMethod: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
      default: null,
    },
  },
  { timestamps: true }
);

export const Order = models.Order || model<IOrder>("Order", OrderSchema);
