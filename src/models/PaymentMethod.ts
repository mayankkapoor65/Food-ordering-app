import mongoose, { Schema, model, models } from "mongoose";
import { Country } from "@/types";

export interface IPaymentMethod {
  _id: mongoose.Types.ObjectId;
  label: string; // e.g. "Corporate Visa"
  type: string; // CARD | UPI | NET_BANKING
  last4: string; // masked identifier
  country: Country; // scoped by country like everything else
  isDefault: boolean;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    label: { type: String, required: true },
    type: { type: String, required: true },
    last4: { type: String, default: "0000" },
    country: {
      type: String,
      enum: Object.values(Country),
      required: true,
      index: true,
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PaymentMethod =
  models.PaymentMethod ||
  model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema);
