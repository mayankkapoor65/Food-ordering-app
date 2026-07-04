import { z } from "zod";
import { NextRequest } from "next/server";
import { BadRequestError } from "@/lib/errors";
import { Country, Permission } from "@/types";

/**
 * Request validation schemas (single source of truth for API input shapes).
 * Routes call `parseBody(req, Schema)` to get a typed, validated payload — or a
 * 400 BadRequestError with field-level details.
 */

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateOrderSchema = z.object({
  restaurantId: z.string().min(1, "restaurantId is required"),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(50),
      })
    )
    .min(1, "At least one item is required"),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const CheckoutSchema = z.object({
  paymentMethodId: z.string().min(1).optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

export const CreatePaymentMethodSchema = z.object({
  label: z.string().trim().min(1, "label is required"),
  type: z.enum(["CARD", "UPI", "NET_BANKING"]),
  last4: z.string().trim().max(16).optional(),
  country: z.nativeEnum(Country),
  isDefault: z.boolean().optional().default(false),
});
export type CreatePaymentMethodInput = z.infer<typeof CreatePaymentMethodSchema>;

export const UpdatePaymentMethodSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    type: z.enum(["CARD", "UPI", "NET_BANKING"]).optional(),
    last4: z.string().trim().max(16).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdatePaymentMethodInput = z.infer<typeof UpdatePaymentMethodSchema>;

export const UpdateRoleSchema = z.object({
  permissions: z.array(z.nativeEnum(Permission)),
});
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

/** Parse & validate a JSON request body, throwing BadRequestError on failure. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  let raw: unknown;
  const text = await req.text();
  if (!text.trim()) {
    raw = {}; // empty body — let the schema decide if that's valid
  } else {
    try {
      raw = JSON.parse(text);
    } catch {
      throw new BadRequestError("Request body must be valid JSON");
    }
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    throw new BadRequestError("Validation failed", details);
  }
  return result.data;
}
