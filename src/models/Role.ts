import mongoose, { Schema, model, models } from "mongoose";
import { Permission, Role as RoleName } from "@/types";

/**
 * Role documents store the permission set for each role IN THE DATABASE, so
 * access rules are data-driven and manageable by an Admin at runtime rather
 * than hard-coded. `name` matches the Role enum used on the User document.
 */
export interface IRole {
  _id: mongoose.Types.ObjectId;
  name: RoleName;
  description: string;
  permissions: Permission[];
  isSystem: boolean; // system roles can be edited but not deleted
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      enum: Object.values(RoleName),
      required: true,
      unique: true,
      index: true,
    },
    description: { type: String, default: "" },
    permissions: [
      { type: String, enum: Object.values(Permission) },
    ],
    isSystem: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Role = models.Role || model<IRole>("Role", RoleSchema);
