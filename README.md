# Slooze — Food Ordering App (RBAC + Country-Based Access Control)

A full-stack web-based food ordering application built for the Slooze take-home
assignment. It implements **Role-Based Access Control (RBAC)** and the bonus
**relational / country-based access model** where Managers & Members can only
act on data from their own country.

Built with **Next.js 14 (App Router)** — React frontend + API routes as the
backend — **MongoDB + Mongoose**, **JWT** auth and **bcrypt** password hashing.

---

## Table of Contents
1. [Features](#features)
2. [Access Control Model](#access-control-model)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Run Locally](#run-locally)
6. [Run with Docker](#run-with-docker)
7. [Seed Accounts](#seed-accounts)
8. [API Reference](#api-reference)
9. [Testing](#testing)
10. [Engineering Practices](#engineering-practices)
11. [Project Structure](#project-structure)
12. [How to Demo the Two Access Layers](#how-to-demo-the-two-access-layers)

---

## Features

| # | Function | Implemented |
|---|----------|-------------|
| 1 | View restaurants & menu items | ✅ |
| 2 | Create an order and add food items | ✅ |
| 3 | Checkout cart and pay using an existing payment method | ✅ |
| 4 | Cancel order | ✅ |
| 5 | Modify / manage payment methods | ✅ |
| 6 | **Bonus:** country-based (India / America) data isolation | ✅ |

### UI / UX

A custom, dependency-free design system (no UI kit) built for a polished,
professional feel:

- **Light & dark themes** with a one-click toggle (persisted, no flash on load).
- **Toast notifications** for every action (order created, payment, cancel…).
- **Skeleton loaders** and friendly **empty states** instead of blank screens.
- **Role-aware UI** — actions the current role can't perform are hidden, with a
  clear inline explanation (e.g. Members see why checkout is unavailable).
- **Country-aware UI** — Admin gets a region filter; others see only their region.
- Inline **SVG icon set**, animated sticky cart bar, quantity steppers, status
  pills, responsive layout, and reduced-motion support.

---

## Access Control Model

There are **two independent layers**, and both are enforced on every request in
the backend (never trusted from the client):

### Layer 1 — RBAC (what you can *do*), per the assignment matrix

| Function | ADMIN | MANAGER | MEMBER |
|----------|:-----:|:-------:|:------:|
| View restaurants & menu | ✅ | ✅ | ✅ |
| Create order (add items) | ✅ | ✅ | ✅ |
| Place order (checkout & pay) | ✅ | ✅ | ❌ |
| Cancel order | ✅ | ✅ | ❌ |
| Update payment method | ✅ | ❌ | ❌ |
| Manage access control | ✅ | ❌ | ❌ |

**Database-driven & manageable live.** These permissions are **stored in the
database** (`Role` collection), not hard-coded. An Admin can change what any role
is allowed to do from the **Access Control** screen and it applies immediately —
no redeploy. The default matrix above seeds the DB (see
[`DEFAULT_ROLE_PERMISSIONS`](src/lib/rbac.ts)); at runtime every request checks
the role's *current* permissions via `requireAccess(req, permission)` in
[`src/lib/auth.ts`](src/lib/auth.ts), backed by a cached
[`access.service`](src/services/access.service.ts). The Admin role's
"Manage access control" is locked to prevent a lockout.

### Layer 2 — Country scoping (whose *data* you can see) — the bonus

- **Admin** (Nick Fury) → country is `null` → sees & acts on **all** data.
- **Manager / Member** → restricted to **their own country** (India or America).

Implemented with `buildCountryFilter(user)` (adds `{ country }` to DB queries)
and `canAccessCountry(user, country)` (guards single-document access), both in
[`src/lib/rbac.ts`](src/lib/rbac.ts). Example: Captain America (Manager, America)
can checkout orders — but only America orders; he can never see India data.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 App Router, React 18 (client components) |
| Backend | Next.js Route Handlers (`src/app/api/**`) |
| Database | MongoDB + Mongoose |
| Auth | JWT (`jsonwebtoken`) + bcrypt password hashing |
| Language | TypeScript |

---

## Prerequisites

- **Node.js** ≥ 18 (tested on v22)
- **MongoDB** running locally on `mongodb://localhost:27017`
  (any MongoDB works — local install, Docker, or MongoDB Atlas; just update
  `MONGODB_URI` in `.env.local`)

Start MongoDB (pick one):

```bash
# Option A — Windows service (run once, as admin)
net start MongoDB

# Option B — run mongod manually with a local data folder (no admin needed)
mongod --dbpath ./.mongodb-data --port 27017
```

---

## Run Locally

```bash
# 1. install dependencies
npm install

# 2. configure environment (safe defaults work out of the box)
cp .env.example .env.local

# 3. seed the database (6 users, 8 restaurants, menus, payment methods, 12 orders)
npm run seed

# 4. start the app
npm run dev
```

Open **http://localhost:3000** → you land on the login page. Use the
**Quick login** dropdown to switch roles instantly.

### Available scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run seed` | Populate the database with demo data |
| `npm run typecheck` | TypeScript type checking (no emit) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier formatting |
| `npm test` | Unit tests (vitest) |
| `npm run test:e2e` | API integration tests (needs app running + seeded) |

### Environment variables

Configuration is centralised and validated in [`src/config/env.ts`](src/config/env.ts).
See [`.env.example`](.env.example) for the full list. Key ones:

```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/food-ordering-db
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
LOGIN_RATE_LIMIT=10
LOGIN_RATE_WINDOW_SEC=60
```

---

## Run with Docker

Bring up MongoDB **and** the app with a single command — no local Node or Mongo
install required:

```bash
docker compose up --build

# then, once, in another terminal — seed the database:
docker compose exec app npm run seed
```

The app will be at **http://localhost:3000**. The container runs as a non-root
user and exposes a Docker `HEALTHCHECK` against `/api/health`.

---

## Seed Accounts

All accounts use the password **`password123`**.

| Name | Email | Role | Country |
|------|-------|------|---------|
| Nick Fury | nick.fury@slooze.xyz | ADMIN | Global |
| Captain Marvel | captain.marvel@slooze.xyz | MANAGER | India |
| Captain America | captain.america@slooze.xyz | MANAGER | America |
| Thanos | thanos@slooze.xyz | MEMBER | India |
| Thor | thor@slooze.xyz | MEMBER | India |
| Travis | travis@slooze.xyz | MEMBER | America |

---

## API Reference

All `/api` routes (except `login` and `health`) require an
`Authorization: Bearer <token>` header. Responses use a consistent envelope:
`{ success: true, data }` on success, or
`{ success: false, error: { code, message, details? } }` on failure.

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/health` | public | Liveness/readiness probe (app + DB status) |
| POST | `/api/auth/login` | public | Log in, returns JWT + user (rate-limited) |
| GET | `/api/auth/me` | authenticated | Current user + granted permissions |
| GET | `/api/restaurants` | VIEW_RESTAURANTS | List restaurants (country-scoped) |
| GET | `/api/restaurants/:id` | VIEW_RESTAURANTS | Single restaurant + menu (guarded) |
| GET | `/api/orders` | VIEW_RESTAURANTS | List orders (country-scoped) |
| POST | `/api/orders` | CREATE_ORDER | Create an order / cart with items |
| GET | `/api/orders/:id` | VIEW_RESTAURANTS | Single order (guarded) |
| POST | `/api/orders/:id/checkout` | CHECKOUT_ORDER | Place order & pay |
| DELETE | `/api/orders/:id` | CANCEL_ORDER | Cancel an order |
| GET | `/api/payment-methods` | authenticated | List payment methods (scoped) |
| POST | `/api/payment-methods` | UPDATE_PAYMENT_METHOD | Add a payment method |
| PUT | `/api/payment-methods/:id` | UPDATE_PAYMENT_METHOD | Modify a payment method |
| DELETE | `/api/payment-methods/:id` | UPDATE_PAYMENT_METHOD | Remove a payment method |
| GET | `/api/roles` | MANAGE_ACCESS | List roles + permission catalogue |
| PUT | `/api/roles/:name` | MANAGE_ACCESS | Update a role's permissions (live) |

A ready-to-import **Postman collection** is included:
[`docs/postman_collection.json`](docs/postman_collection.json). It auto-saves the
JWT after login into a collection variable, so subsequent requests are
authenticated automatically.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design write-up and
data model.

---

## Testing

Two layers of automated tests, wired into CI:

```bash
npm test          # unit tests — pure RBAC & country-scoping logic (vitest)

# integration — drives the live API across all roles & both countries:
npm run seed && npm run dev      # terminal 1
npm run test:e2e                 # terminal 2  → 15/15 checks
```

- **Unit** (`tests/unit`) asserts the exact permission matrix and the
  country-filter logic in isolation — fast, no DB required.
- **Integration** (`tests/e2e`) proves end-to-end that: Admin sees all regions;
  Managers/Members are country-scoped; Members are blocked (403) from
  checkout/cancel/payments; cross-country actions are blocked; invalid input is
  rejected (400); unauthenticated requests are blocked (401).
- **CI** (`.github/workflows/ci.yml`) runs lint → typecheck → unit tests → build,
  and a second job spins up MongoDB, seeds, and runs the integration suite.

---

## Engineering Practices

Built the way a production service would be, not just to pass the brief:

- **Layered architecture** — thin route *controllers* → *services* (business
  logic) → *models* (data). Business logic is framework-agnostic and unit-testable.
- **Centralised, validated config** (`src/config/env.ts`) — one typed source of
  truth; fails fast on bad config; refuses insecure defaults in production.
- **Schema validation** — every write endpoint validates input with zod and
  returns field-level `400`s.
- **Typed error hierarchy** + a single translator to a consistent JSON envelope;
  internals never leak to clients.
- **Structured logging** (JSON in production, readable in dev).
- **Security** — bcrypt passwords, server-side authz, login rate limiting,
  hardened HTTP headers, `X-Powered-By` disabled.
- **Ops** — `/api/health` probe, Docker + docker-compose, standalone build,
  GitHub Actions CI, ESLint/Prettier/EditorConfig, `.env.example`.

---

## Project Structure

```
food-ordering-app/
├─ src/
│  ├─ app/
│  │  ├─ api/                 # HTTP layer — thin controllers (route.ts)
│  │  │  ├─ auth/{login,me}   #   authenticate, authorize, validate, respond
│  │  │  ├─ restaurants/[id]
│  │  │  ├─ orders/[id]/checkout
│  │  │  ├─ payment-methods/[id]
│  │  │  └─ health            #   liveness/readiness probe
│  │  ├─ login|dashboard|restaurants/[id]|orders|settings   # pages
│  │  └─ layout.tsx, globals.css
│  ├─ services/              # business logic (auth/restaurant/order/payment)
│  ├─ models/                # Mongoose schemas (User, Restaurant, Order, …)
│  ├─ lib/                   # cross-cutting concerns
│  │  ├─ auth.ts             #   JWT + requireAuth guard (RBAC)
│  │  ├─ rbac.ts             #   permission matrix + country scoping
│  │  ├─ validation.ts       #   zod schemas + parseBody
│  │  ├─ errors.ts           #   HttpError hierarchy
│  │  ├─ apiResponse.ts      #   response envelope + error translator
│  │  ├─ logger.ts           #   structured logger
│  │  ├─ rateLimit.ts        #   login throttling
│  │  ├─ db.ts               #   cached mongoose connection
│  │  ├─ apiClient.ts, useAuth.ts   # client helpers
│  ├─ config/env.ts          # validated, typed configuration
│  ├─ components/            # reusable UI (Navbar, Toast, Icons, ui, …)
│  ├─ types/index.ts         # enums (Role, Country, Permission, …)
│  └─ scripts/seed.ts        # database seeding
├─ tests/
│  ├─ unit/                  # vitest — RBAC & scoping logic
│  └─ e2e/                   # API integration suite
├─ docs/{ARCHITECTURE.md, postman_collection.json}
├─ Dockerfile, docker-compose.yml
└─ .github/workflows/ci.yml
```

---

## How to Demo the Two Access Layers

1. **Login as Nick Fury (Admin)** → Restaurants page shows **all 8** restaurants
   (India + America) with a region filter. Payments tab visible; can checkout & cancel.
2. **Login as Captain Marvel (Manager, India)** → sees **only the 4 India**
   restaurants. Can checkout & cancel India orders. No Payments tab.
3. **Login as Thanos (Member, India)** → sees only India restaurants. Can create
   an order, but **Checkout / Cancel buttons are hidden** and the API returns
   `403` if called directly.
4. **Login as Captain America (Manager, America)** → sees **only the 4 America**
   restaurants; cannot see or act on any India data.

The automated proof of all of the above lives in the integration suite
(**15/15 checks passing** — `npm run test:e2e`), described in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
