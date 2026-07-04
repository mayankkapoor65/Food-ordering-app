import mongoose, { Schema, model, models } from "mongoose";
import { Country, Role } from "@/types";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string; // bcrypt hash
  role: Role;
  country: Country | null; // null for Admin (global access)
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(Role), required: true },
    country: {
      type: String,
      enum: [...Object.values(Country), null],
      default: null,
    },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
