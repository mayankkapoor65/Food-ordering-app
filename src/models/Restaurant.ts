import mongoose, { Schema, model, models } from "mongoose";
import { Country } from "@/types";

export interface IMenuItem {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface IRestaurant {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  cuisine: string;
  country: Country; // used by the country-scoping (bonus) layer
  imageEmoji: string;
  menu: IMenuItem[];
}

const MenuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
  category: { type: String, default: "Main" },
});

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    cuisine: { type: String, default: "" },
    country: {
      type: String,
      enum: Object.values(Country),
      required: true,
      index: true,
    },
    imageEmoji: { type: String, default: "🍽️" },
    menu: { type: [MenuItemSchema], default: [] },
  },
  { timestamps: true }
);

export const Restaurant =
  models.Restaurant || model<IRestaurant>("Restaurant", RestaurantSchema);
