# Architecture & Design

## 1. Overview

A single-codebase full-stack application built on **Next.js 14 (App Router)**.
The same server renders the React UI and serves the JSON API (Route Handlers
under `src/app/api`), backed by **MongoDB** via **Mongoose**. Authentication is
**stateless JWT**; authorization is a two-layer model (role + country) enforced
entirely server-side.

The backend follows a **layered architecture** so each concern is isolated and
testable:

```
HTTP layer            Application layer        Domain / Data
────────────          ──────────────────       ───────────────
Route handler   ──▶   Service                ──▶  Mongoose model  ──▶  MongoDB
(controller)          (business logic)            (schema)
  │  guard (RBAC)       │  country scoping
  │  validate (zod)     │  domain errors
  └─ envelope response  └─ logging
```

- **Route handlers** (`src/app/api/**`) are *thin controllers*: authenticate &
  authorize (`requireAuth`), validate input (`parseBody` + zod), call a service,
  and shape the response. No business logic lives here.
- **Services** (`src/services/**`) hold all business logic and enforce
  country-scoping. They are framework-agnostic (take plain args, return data or
  throw domain errors) — which makes them unit-testable without HTTP.
- **Models** (`src/models/**`) define the Mongoose schemas and are the only
  place that talks to the database.

```
┌──────────────┐  fetch + Bearer JWT   ┌───────────────────────────┐  Mongoose  ┌──────────┐
│  React UI     │ ────────────────────▶ │  Route handler (controller)│           │           │
│ (client pages)│                       │    ├─ requireAuth (RBAC)    │           │           │
│               │ ◀──────────────────── │    ├─ parseBody (zod)       │──────────▶│ MongoDB   │
└──────────────┘  { success, data } /   │    └─ Service (logic +      │◀──────────│           │
                  { success:false,       │        country scoping)     │           └──────────┘
                    error:{code,message}} └───────────────────────────┘
```

## 2. Directory layout

```
src/
├─ app/
│  ├─ api/                      # HTTP layer — thin controllers (route.ts)
│  │  ├─ auth/{login,me}
│  │  ├─ restaurants/[id]
│  │  ├─ orders/[id]/checkout
│  │  ├─ payment-methods/[id]
│  │  └─ health                 # liveness/readiness probe
│  ├─ (pages)/                  # login, dashboard, restaurants, orders, settings
│  └─ layout.tsx, globals.css
├─ services/                    # business logic (auth/restaurant/order/payment)
├─ models/                      # Mongoose schemas
├─ lib/                         # cross-cutting: auth, rbac, db, validation,
│                               #   errors, logger, rateLimit, apiResponse, apiClient
├─ config/env.ts                # validated, typed configuration (single source)
├─ components/                  # reusable UI (Navbar, Toast, Icons, …)
├─ types/                       # shared enums (Role, Country, Permission, …)
└─ scripts/seed.ts              # database seeding

tests/
├─ unit/                        # vitest — pure logic (RBAC, scoping)
└─ e2e/                         # API integration suite (all roles, both countries)
```

## 3. Configuration (`src/config/env.ts`)

All environment variables are declared, typed and validated **once** with zod,
with safe development defaults. The app fails fast with a readable message if
configuration is invalid, and refuses to boot in production with an insecure
default `JWT_SECRET`. Nothing else in the codebase reads `process.env` directly.

## 4. Authentication flow

1. `POST /api/auth/login` — rate-limited by IP; validates credentials against a
   bcrypt hash (constant-time compare, no user-enumeration leak).
2. On success a JWT (`id, name, email, role, country`) is signed and returned.
3. The client stores the token and sends `Authorization: Bearer <token>`.
4. Each protected handler calls `requireAuth(req, permission?)`, which throws
   `UnauthorizedError` (401) or `ForbiddenError` (403) as appropriate.

Because role and country are inside the signed token and every check runs
server-side, the UI (hiding buttons) is a convenience only — it cannot be used
to bypass access control.

## 5. Authorization — the two layers

### Layer 1: RBAC — database-driven
Each role's permission set is stored in the **`Role` collection**, not hard-coded,
so an Admin can change what a role may do at runtime (Access Control screen /
`PUT /api/roles/:name`). `requireAccess(req, permission)` loads the role's
*current* permissions through `access.service` — which caches per role (15s TTL)
and **invalidates on write**, so changes apply live. `DEFAULT_ROLE_PERMISSIONS`
in `src/lib/rbac.ts` seeds the collection and drives the unit tests; the pure
`hasPermission(perms, permission)` is the membership check. The Admin role is
prevented from dropping `MANAGE_ACCESS` (lockout guard).

### Layer 2: Country scoping (bonus)
- `buildCountryFilter(user)` → `{}` for Admin, else `{ country }` — merged into
  every list query so out-of-region rows never leave the database.
- `canAccessCountry(user, country)` → guards single-document reads/writes.

The two layers **compose**: e.g. checkout requires the `CHECKOUT_ORDER`
permission (role) *and* `canAccessCountry` on the order (country). Failing
either returns 403.

## 6. Validation & error handling

- **Input:** every write endpoint validates its body with a zod schema
  (`src/lib/validation.ts`); failures return `400` with field-level details.
- **Errors:** services throw a typed `HttpError` hierarchy
  (`BadRequest/Unauthorized/Forbidden/NotFound/Conflict/TooManyRequests`). A
  single `handleError` translator maps them to the consistent envelope:
  `{ success:false, error:{ code, message, details? } }`. Unexpected errors are
  logged and returned as a generic `500` (no internals leaked).

## 7. Data model

```
User                Restaurant              Order                     PaymentMethod
────                ──────────              ─────                     ─────────────
name                name                    user        → User        label
email (unique)      description             restaurant  → Restaurant   type
password (bcrypt)   cuisine                 restaurantName             last4
role (enum)         country (enum,idx)      country (enum, idx)        country (enum, idx)
country (enum|null) menu[] {name,price,     items[] {name,price,qty}   isDefault
                      description,category}   totalAmount
                                             status (CART/PLACED/
                                               CANCELLED)
                                             paymentMethod → PaymentMethod
```

Plus a **`Role`** collection — `{ name, description, permissions[], isSystem }` —
that stores each role's permission set for the database-driven RBAC layer.

Notes: `country` is indexed on every scoped collection; menu items and order
line-items are embedded; order items store a **price snapshot**; order totals
are always computed **server-side** from the authoritative menu.

## 8. Order lifecycle

```
CREATE_ORDER            CHECKOUT_ORDER          CANCEL_ORDER
   │                        │                       │
   ▼                        ▼                       ▼
 CART  ──────────────────▶ PLACED                CANCELLED
 (any role)               (Admin/Manager,        (Admin/Manager)
                            pays via method)
```

## 9. Security

- Passwords bcrypt-hashed (configurable cost); never returned by the API.
- All authorization enforced server-side; UI mirrors it only for UX.
- Login endpoint rate-limited (fixed-window) to slow brute force.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS) via `next.config.js`;
  `X-Powered-By` disabled.
- Prices/totals computed from trusted data, never the client.

## 10. Testing

- **Unit** (`vitest`) — pure RBAC & country-scoping logic (`tests/unit`).
- **Integration** (`tests/e2e`) — drives the running API across every role and
  both countries, asserting the full permission matrix, cross-country blocks,
  validation and auth (15 checks).
- **CI** (`.github/workflows/ci.yml`) — lint, typecheck, unit tests and build on
  every push; a second job spins up MongoDB, seeds, and runs the integration
  suite.

## 11. Deployment

- `output: "standalone"` produces a minimal self-contained build.
- **Docker:** multi-stage `Dockerfile` (non-root, health-checked) +
  `docker-compose.yml` bringing up MongoDB and the app together — `docker
  compose up --build`.
- Horizontal scaling note: the in-memory rate limiter would move to Redis (same
  interface) for multi-instance deployments.
