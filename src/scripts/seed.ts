/**
 * Seed script — populates the database with the exact users from the
 * assignment plus a rich set of sample restaurants, menus, payment methods AND
 * pre-made orders (across every status & both countries) so all screens show
 * real data immediately.
 *
 * Run with:  npm run seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Restaurant } from "@/models/Restaurant";
import { PaymentMethod } from "@/models/PaymentMethod";
import { Order } from "@/models/Order";
import { Role as RoleModel } from "@/models/Role";
import { DEFAULT_ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from "@/lib/rbac";
import { Country, OrderStatus, Role } from "@/types";
import { env } from "@/config/env";

const DEFAULT_PASSWORD = "password123";
const HOUR = 60 * 60 * 1000;

async function seed() {
  await connectDB();
  console.log("Connected. Clearing existing collections...");

  await Promise.all([
    User.deleteMany({}),
    Restaurant.deleteMany({}),
    PaymentMethod.deleteMany({}),
    Order.deleteMany({}),
    RoleModel.deleteMany({}),
  ]);

  // ---- Roles (permissions stored in DB — the database-driven RBAC source) ----
  await RoleModel.insertMany(
    Object.values(Role).map((name) => ({
      name,
      description: ROLE_DESCRIPTIONS[name],
      permissions: DEFAULT_ROLE_PERMISSIONS[name],
      isSystem: true,
    }))
  );
  console.log(`Inserted ${Object.values(Role).length} roles.`);

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, env.BCRYPT_ROUNDS);

  // ---- Users (straight from the problem statement) ----
  const userDocs = await User.insertMany(
    [
      { name: "Nick Fury", email: "nick.fury@slooze.xyz", role: Role.ADMIN, country: null },
      { name: "Captain Marvel", email: "captain.marvel@slooze.xyz", role: Role.MANAGER, country: Country.INDIA },
      { name: "Captain America", email: "captain.america@slooze.xyz", role: Role.MANAGER, country: Country.AMERICA },
      { name: "Thanos", email: "thanos@slooze.xyz", role: Role.MEMBER, country: Country.INDIA },
      { name: "Thor", email: "thor@slooze.xyz", role: Role.MEMBER, country: Country.INDIA },
      { name: "Travis", email: "travis@slooze.xyz", role: Role.MEMBER, country: Country.AMERICA },
    ].map((u) => ({ ...u, password: hash }))
  );
  const byName = (n: string) => userDocs.find((u) => u.name === n)!;
  console.log(`Inserted ${userDocs.length} users.`);

  // ---- Restaurants + menus (tagged by country) ----
  const restaurantDocs = await Restaurant.insertMany([
    // ---------- INDIA ----------
    {
      name: "Spice of India", description: "Authentic North Indian thalis and curries.",
      cuisine: "North Indian", country: Country.INDIA, imageEmoji: "🍛",
      menu: [
        { name: "Paneer Tikka", description: "Char-grilled cottage cheese", price: 260, category: "Starter" },
        { name: "Butter Chicken", description: "Creamy tomato gravy", price: 320, category: "Main" },
        { name: "Dal Makhani", description: "Slow-cooked black lentils", price: 240, category: "Main" },
        { name: "Garlic Naan", description: "Tandoor-baked flatbread", price: 60, category: "Bread" },
        { name: "Gulab Jamun", description: "Warm milk dumplings", price: 90, category: "Dessert" },
        { name: "Masala Chai", description: "Spiced milk tea", price: 40, category: "Drink" },
      ],
    },
    {
      name: "Mumbai Street Kitchen", description: "Vada pav, dosas and chaat.",
      cuisine: "Street Food", country: Country.INDIA, imageEmoji: "🥘",
      menu: [
        { name: "Vada Pav", description: "Mumbai's favourite slider", price: 50, category: "Snack" },
        { name: "Masala Dosa", description: "Crispy crepe with potato", price: 140, category: "Main" },
        { name: "Pav Bhaji", description: "Spiced mashed veg with buns", price: 160, category: "Main" },
        { name: "Pani Puri", description: "Six crispy shells", price: 70, category: "Snack" },
        { name: "Falooda", description: "Rose vermicelli dessert drink", price: 110, category: "Dessert" },
      ],
    },
    {
      name: "Dakshin Diner", description: "South Indian tiffin & filter coffee.",
      cuisine: "South Indian", country: Country.INDIA, imageEmoji: "🍚",
      menu: [
        { name: "Idli Sambar", description: "Steamed rice cakes, 3 pcs", price: 90, category: "Main" },
        { name: "Medu Vada", description: "Crispy lentil doughnuts", price: 80, category: "Starter" },
        { name: "Curd Rice", description: "Comforting yogurt rice", price: 120, category: "Main" },
        { name: "Filter Coffee", description: "Strong South Indian brew", price: 50, category: "Drink" },
      ],
    },
    {
      name: "Tandoor Nights", description: "Kebabs, biryani and grills.",
      cuisine: "Mughlai", country: Country.INDIA, imageEmoji: "🍢",
      menu: [
        { name: "Seekh Kebab", description: "Minced lamb skewers", price: 300, category: "Starter" },
        { name: "Chicken Biryani", description: "Fragrant basmati rice", price: 280, category: "Main" },
        { name: "Mutton Rogan Josh", description: "Kashmiri lamb curry", price: 360, category: "Main" },
        { name: "Kulfi", description: "Traditional frozen dessert", price: 100, category: "Dessert" },
      ],
    },
    // ---------- AMERICA ----------
    {
      name: "Liberty Burgers", description: "Classic American smash burgers and shakes.",
      cuisine: "American", country: Country.AMERICA, imageEmoji: "🍔",
      menu: [
        { name: "Classic Cheeseburger", description: "Beef patty, cheddar", price: 9.5, category: "Main" },
        { name: "BBQ Bacon Burger", description: "Smoky bacon stack", price: 12.0, category: "Main" },
        { name: "Crispy Fries", description: "Hand-cut fries", price: 4.0, category: "Side" },
        { name: "Onion Rings", description: "Golden battered rings", price: 5.0, category: "Side" },
        { name: "Vanilla Shake", description: "Thick classic shake", price: 5.5, category: "Drink" },
      ],
    },
    {
      name: "New York Pizza Co.", description: "Wood-fired New York style pizzas.",
      cuisine: "Italian-American", country: Country.AMERICA, imageEmoji: "🍕",
      menu: [
        { name: "Pepperoni Pizza", description: "12-inch classic", price: 14.0, category: "Main" },
        { name: "Margherita Pizza", description: "Fresh basil & mozzarella", price: 12.5, category: "Main" },
        { name: "Garlic Knots", description: "Six buttery knots", price: 6.0, category: "Side" },
        { name: "Tiramisu", description: "Espresso-soaked classic", price: 7.0, category: "Dessert" },
      ],
    },
    {
      name: "Sunrise Diner", description: "All-day American breakfast & brunch.",
      cuisine: "Breakfast", country: Country.AMERICA, imageEmoji: "🥞",
      menu: [
        { name: "Buttermilk Pancakes", description: "Stack of three", price: 8.0, category: "Main" },
        { name: "Eggs Benedict", description: "Poached eggs, hollandaise", price: 11.0, category: "Main" },
        { name: "Hash Browns", description: "Crispy golden potatoes", price: 4.5, category: "Side" },
        { name: "Fresh Orange Juice", description: "Cold-pressed", price: 4.0, category: "Drink" },
      ],
    },
    {
      name: "El Toro Cantina", description: "Tex-Mex tacos, burritos & bowls.",
      cuisine: "Tex-Mex", country: Country.AMERICA, imageEmoji: "🌮",
      menu: [
        { name: "Carne Asada Tacos", description: "Three street tacos", price: 10.5, category: "Main" },
        { name: "Chicken Burrito", description: "Loaded flour tortilla", price: 11.5, category: "Main" },
        { name: "Loaded Nachos", description: "Cheese, jalapeños, salsa", price: 8.5, category: "Starter" },
        { name: "Churros", description: "Cinnamon sugar, 5 pcs", price: 6.0, category: "Dessert" },
      ],
    },
  ]);
  const rest = (name: string) => restaurantDocs.find((r) => r.name === name)!;
  console.log(`Inserted ${restaurantDocs.length} restaurants.`);

  // ---- Payment methods (scoped by country; Admin manages all) ----
  const pmDocs = await PaymentMethod.insertMany([
    { label: "Corporate Visa (India)", type: "CARD", last4: "4242", country: Country.INDIA, isDefault: true },
    { label: "Company UPI (India)", type: "UPI", last4: "@slooze", country: Country.INDIA, isDefault: false },
    { label: "HDFC Amex (India)", type: "CARD", last4: "7781", country: Country.INDIA, isDefault: false },
    { label: "Corporate Amex (USA)", type: "CARD", last4: "1005", country: Country.AMERICA, isDefault: true },
    { label: "Company ACH (USA)", type: "NET_BANKING", last4: "8890", country: Country.AMERICA, isDefault: false },
    { label: "Chase Visa (USA)", type: "CARD", last4: "3312", country: Country.AMERICA, isDefault: false },
  ]);
  const pm = (label: string) => pmDocs.find((p) => p.label.startsWith(label))!;
  console.log(`Inserted ${pmDocs.length} payment methods.`);

  // ---- Sample orders ----
  // Helper: build order line items from a restaurant using [menuIndex, qty] pairs.
  type Line = [number, number];
  const buildOrder = (opts: {
    userName: string;
    restaurantName: string;
    lines: Line[];
    status: OrderStatus;
    paymentLabel?: string;
    hoursAgo: number;
  }) => {
    const r = rest(opts.restaurantName);
    const u = byName(opts.userName);
    const items = opts.lines.map(([idx, qty]) => {
      const mi = r.menu[idx];
      return { menuItemId: mi._id, name: mi.name, price: mi.price, quantity: qty };
    });
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      user: u._id,
      restaurant: r._id,
      restaurantName: r.name,
      country: r.country,
      items,
      totalAmount: Number(total.toFixed(2)),
      status: opts.status,
      paymentMethod: opts.paymentLabel ? pm(opts.paymentLabel)._id : null,
      createdAt: new Date(Date.now() - opts.hoursAgo * HOUR),
      updatedAt: new Date(Date.now() - opts.hoursAgo * HOUR),
    };
  };

  const orders = [
    // ----- INDIA -----
    buildOrder({ userName: "Thanos", restaurantName: "Spice of India", lines: [[1, 2], [3, 4]], status: OrderStatus.PLACED, paymentLabel: "Corporate Visa (India)", hoursAgo: 26 }),
    buildOrder({ userName: "Thor", restaurantName: "Tandoor Nights", lines: [[1, 1], [0, 2]], status: OrderStatus.PLACED, paymentLabel: "Company UPI (India)", hoursAgo: 20 }),
    buildOrder({ userName: "Captain Marvel", restaurantName: "Dakshin Diner", lines: [[0, 3], [3, 3]], status: OrderStatus.PLACED, paymentLabel: "Corporate Visa (India)", hoursAgo: 8 }),
    buildOrder({ userName: "Thanos", restaurantName: "Mumbai Street Kitchen", lines: [[2, 1], [0, 2]], status: OrderStatus.CART, hoursAgo: 3 }),
    buildOrder({ userName: "Thor", restaurantName: "Spice of India", lines: [[1, 1], [4, 2]], status: OrderStatus.CART, hoursAgo: 1 }),
    buildOrder({ userName: "Thanos", restaurantName: "Tandoor Nights", lines: [[2, 1]], status: OrderStatus.CANCELLED, hoursAgo: 40 }),

    // ----- AMERICA -----
    buildOrder({ userName: "Travis", restaurantName: "Liberty Burgers", lines: [[0, 2], [2, 2]], status: OrderStatus.PLACED, paymentLabel: "Corporate Amex (USA)", hoursAgo: 30 }),
    buildOrder({ userName: "Captain America", restaurantName: "New York Pizza Co.", lines: [[0, 1], [2, 2]], status: OrderStatus.PLACED, paymentLabel: "Chase Visa (USA)", hoursAgo: 12 }),
    buildOrder({ userName: "Travis", restaurantName: "El Toro Cantina", lines: [[0, 1], [3, 1]], status: OrderStatus.PLACED, paymentLabel: "Corporate Amex (USA)", hoursAgo: 6 }),
    buildOrder({ userName: "Travis", restaurantName: "Sunrise Diner", lines: [[0, 1], [3, 1]], status: OrderStatus.CART, hoursAgo: 2 }),
    buildOrder({ userName: "Captain America", restaurantName: "Liberty Burgers", lines: [[1, 2]], status: OrderStatus.CART, hoursAgo: 1 }),
    buildOrder({ userName: "Travis", restaurantName: "New York Pizza Co.", lines: [[1, 1]], status: OrderStatus.CANCELLED, hoursAgo: 34 }),
  ];
  await Order.insertMany(orders);
  console.log(`Inserted ${orders.length} orders.`);

  console.log("\n✅ Seed complete!");
  console.log("All accounts use password:", DEFAULT_PASSWORD);
  console.table(
    userDocs.map((u) => ({ name: u.name, email: u.email, role: u.role, country: u.country ?? "GLOBAL" }))
  );
  const summary = {
    India: {
      restaurants: restaurantDocs.filter((r) => r.country === Country.INDIA).length,
      orders: orders.filter((o) => o.country === Country.INDIA).length,
    },
    America: {
      restaurants: restaurantDocs.filter((r) => r.country === Country.AMERICA).length,
      orders: orders.filter((o) => o.country === Country.AMERICA).length,
    },
  };
  console.table(summary);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
