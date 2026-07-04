/**
 * API integration tests — exercises the running server across every role and
 * both countries to prove RBAC + country isolation end-to-end.
 *
 * Prerequisites: app running (npm run dev) and DB seeded (npm run seed).
 * Run:  npm run test:e2e   [BASE_URL=http://localhost:3000]
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

const results = [];
function check(label, cond, detail = "") {
  results.push(cond);
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function login(email) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`login failed for ${email}: ${JSON.stringify(j.error)}`);
  return j.data.token;
}

async function call(token, path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return { status: r.status, body: await r.json() };
}

async function main() {
  // Health first
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check("Health endpoint reports ok", health?.data?.status === "ok", JSON.stringify(health?.data));

  const admin = await login("nick.fury@slooze.xyz");
  const marvel = await login("captain.marvel@slooze.xyz"); // Manager India
  const america = await login("captain.america@slooze.xyz"); // Manager America
  const thanos = await login("thanos@slooze.xyz"); // Member India

  // ---- Country scoping ----
  const adminR = await call(admin, "/api/restaurants");
  check("Admin sees all restaurants", adminR.body.data.length >= 8, `got ${adminR.body.data.length}`);

  const marvelR = await call(marvel, "/api/restaurants");
  check("Manager-India sees only INDIA restaurants",
    marvelR.body.data.length > 0 && marvelR.body.data.every((x) => x.country === "INDIA"));

  const americaR = await call(america, "/api/restaurants");
  check("Manager-America sees only AMERICA restaurants",
    americaR.body.data.length > 0 && americaR.body.data.every((x) => x.country === "AMERICA"));

  const cross = await call(marvel, `/api/restaurants/${americaR.body.data[0]._id}`);
  check("Manager-India BLOCKED from an America restaurant (403)", cross.status === 403);

  // ---- RBAC: create (all roles) ----
  const indiaRest = marvelR.body.data[0];
  const item = indiaRest.menu[0];
  const createByThanos = await call(thanos, "/api/orders", {
    method: "POST",
    body: JSON.stringify({ restaurantId: indiaRest._id, items: [{ menuItemId: item._id, quantity: 2 }] }),
  });
  check("Member CAN create an order (201)", createByThanos.status === 201);
  const orderId = createByThanos.body.data?._id;

  // ---- RBAC: checkout (Admin/Manager only) ----
  const thanosCheckout = await call(thanos, `/api/orders/${orderId}/checkout`, { method: "POST", body: "{}" });
  check("Member BLOCKED from checkout (403)", thanosCheckout.status === 403);
  const marvelCheckout = await call(marvel, `/api/orders/${orderId}/checkout`, { method: "POST", body: "{}" });
  check("Manager CAN checkout the India order (200)", marvelCheckout.status === 200);

  // ---- RBAC: cancel (Admin/Manager only) ----
  const o2 = await call(thanos, "/api/orders", {
    method: "POST",
    body: JSON.stringify({ restaurantId: indiaRest._id, items: [{ menuItemId: item._id, quantity: 1 }] }),
  });
  const thanosCancel = await call(thanos, `/api/orders/${o2.body.data._id}`, { method: "DELETE" });
  check("Member BLOCKED from cancel (403)", thanosCancel.status === 403);
  const marvelCancel = await call(marvel, `/api/orders/${o2.body.data._id}`, { method: "DELETE" });
  check("Manager CAN cancel (200)", marvelCancel.status === 200);

  // ---- Cross-country checkout blocked ----
  const o3 = await call(thanos, "/api/orders", {
    method: "POST",
    body: JSON.stringify({ restaurantId: indiaRest._id, items: [{ menuItemId: item._id, quantity: 1 }] }),
  });
  const americaCheckIndia = await call(america, `/api/orders/${o3.body.data._id}/checkout`, { method: "POST", body: "{}" });
  check("Manager-America BLOCKED from India order checkout (403)", americaCheckIndia.status === 403);

  // ---- RBAC: payment methods (Admin only) ----
  const marvelPay = await call(marvel, "/api/payment-methods", {
    method: "POST", body: JSON.stringify({ label: "X", type: "CARD", country: "INDIA" }),
  });
  check("Manager BLOCKED from creating payment method (403)", marvelPay.status === 403);
  const adminPay = await call(admin, "/api/payment-methods", {
    method: "POST", body: JSON.stringify({ label: "Test Card", type: "CARD", country: "INDIA" }),
  });
  check("Admin CAN create payment method (201)", adminPay.status === 201);
  if (adminPay.body.data?._id) {
    await call(admin, `/api/payment-methods/${adminPay.body.data._id}`, { method: "DELETE" }); // cleanup
  }

  // ---- Database-driven RBAC: live permission changes ----
  const managerBlocked = await call(marvel, "/api/roles");
  check("Manager BLOCKED from access management (403)", managerBlocked.status === 403);

  const rolesRes = await call(admin, "/api/roles");
  check("Admin can read roles & permission catalogue",
    rolesRes.status === 200 && Array.isArray(rolesRes.body.data.roles));
  const managerRole = rolesRes.body.data.roles.find((r) => r.name === "MANAGER");
  const original = managerRole.permissions;

  // Revoke CHECKOUT_ORDER from MANAGER, then confirm a manager is blocked LIVE.
  const revoked = original.filter((p) => p !== "CHECKOUT_ORDER");
  await call(admin, "/api/roles/MANAGER", { method: "PUT", body: JSON.stringify({ permissions: revoked }) });

  const newOrder = await call(thanos, "/api/orders", {
    method: "POST",
    body: JSON.stringify({ restaurantId: indiaRest._id, items: [{ menuItemId: item._id, quantity: 1 }] }),
  });
  const blockedNow = await call(marvel, `/api/orders/${newOrder.body.data._id}/checkout`, { method: "POST", body: "{}" });
  check("After revoke, Manager checkout is blocked LIVE (403)", blockedNow.status === 403);

  // Restore and confirm it works again.
  await call(admin, "/api/roles/MANAGER", { method: "PUT", body: JSON.stringify({ permissions: original }) });
  const allowedAgain = await call(marvel, `/api/orders/${newOrder.body.data._id}/checkout`, { method: "POST", body: "{}" });
  check("After restore, Manager checkout works again (200)", allowedAgain.status === 200);

  // Lockout guard: Admin cannot drop MANAGE_ACCESS from its own role.
  const lockout = await call(admin, "/api/roles/ADMIN", {
    method: "PUT", body: JSON.stringify({ permissions: ["VIEW_RESTAURANTS"] }),
  });
  check("Admin lockout prevented (400)", lockout.status === 400);

  // ---- Validation ----
  const badOrder = await call(thanos, "/api/orders", { method: "POST", body: JSON.stringify({ items: [] }) });
  check("Invalid order body rejected (400)", badOrder.status === 400);

  // ---- Auth ----
  const noAuth = await fetch(`${BASE}/api/restaurants`);
  check("Unauthenticated request BLOCKED (401)", noAuth.status === 401);

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error("E2E run failed:", err.message);
  process.exit(1);
});
