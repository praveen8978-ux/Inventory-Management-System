# StockFlow

A small multi-tenant inventory management app. Each organization signs up, manages its own
products, adjusts stock, and sees a dashboard with low-stock items.

**Live demo:** LIVE_LINK_HERE
**Demo login:** `demo@stockflow.dev` / `Demo@12345`

## Features
- Sign up with an organization, log in and log out (JWT in an httpOnly cookie, bcrypt passwords)
- Product create, read, update and delete with unique SKU per organization
- Search by name or SKU (case-insensitive)
- Adjust stock by +/- N units with an optional note; stock can never go below zero
- Dashboard: total products, units on hand and a low-stock table
- Settings: default low-stock threshold (a product's own threshold overrides it)

## Tech stack
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, Zod
- Frontend: React (Vite), TypeScript, React Router, Tailwind CSS

## Run locally
Requires Node 20+ and a PostgreSQL database (a free Neon database works).

    npm run install:all
    cp server/.env.example server/.env      # then fill in DATABASE_URL and JWT_SECRET
    cd server
    npx prisma migrate dev
    npm run db:seed                         # optional demo data
    cd ..
    npm run dev:server                      # terminal 1, API on :4000
    npm run dev:client                      # terminal 2, app on :5173

## Scripts (in `server/`)
- `npm run db:seed` creates the demo store and 12 products
- `npm run test:isolation` runs 14 checks that one organization cannot read or change another's data

## Design notes
- **Tenant isolation:** `organizationId` always comes from the verified token, never from the
  request. Every product query includes it, and updates and deletes check it in the same query.
- **Low stock:** a product is low when `quantity <= (its own threshold ?? organization default)`.
  A threshold of 0 is respected, and a quantity of 0 always counts as low.
- **Stock adjustments** use one atomic update, so concurrent requests cannot drive stock negative.
- **Deployment:** one service serves the API and the built React app from the same origin.

## Out of scope (per the PRD)
Multi-warehouse, variants, integrations, purchase orders, notifications, CSV import,
roles and invites, audit log, billing, password reset.