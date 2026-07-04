// Shared enums and types used across the app.

export enum Role {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  MEMBER = "MEMBER",
}

export enum Country {
  
  INDIA = "INDIA",
  AMERICA = "AMERICA",
}

export enum OrderStatus {
  CART = "CART", // items added, not yet placed
  PLACED = "PLACED", // checked out and paid
  CANCELLED = "CANCELLED",
}

// The set of protected actions in the system. RBAC is defined against these.
// Each role's set of permissions is stored in the database (Role collection)
// and can be managed live by an Admin — these enum values are the catalogue of
// assignable capabilities.
export enum Permission {
  VIEW_RESTAURANTS = "VIEW_RESTAURANTS",
  CREATE_ORDER = "CREATE_ORDER",
  CHECKOUT_ORDER = "CHECKOUT_ORDER",
  CANCEL_ORDER = "CANCEL_ORDER",
  UPDATE_PAYMENT_METHOD = "UPDATE_PAYMENT_METHOD",
  MANAGE_ACCESS = "MANAGE_ACCESS", // manage roles & their permissions (Admin)
}

// Human-friendly labels + descriptions for the access-management UI.
export const PERMISSION_META: Record<Permission, { label: string; description: string }> = {
  [Permission.VIEW_RESTAURANTS]: { label: "View restaurants & menus", description: "Browse restaurants and their menu items" },
  [Permission.CREATE_ORDER]: { label: "Create order", description: "Create an order and add food items" },
  [Permission.CHECKOUT_ORDER]: { label: "Checkout & pay", description: "Place an order and pay with a saved method" },
  [Permission.CANCEL_ORDER]: { label: "Cancel order", description: "Cancel an existing order" },
  [Permission.UPDATE_PAYMENT_METHOD]: { label: "Manage payment methods", description: "Add, edit or remove payment methods" },
  [Permission.MANAGE_ACCESS]: { label: "Manage access control", description: "Change what each role is allowed to do" },
};

// Shape of the JWT payload / authenticated user.
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  country: Country | null; // null = global (Admin)
}
