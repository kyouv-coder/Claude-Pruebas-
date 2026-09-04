---
name: pyme-saas-scaffold
description: Build a full-stack operations tool (reservas, POS/caja, giftcards, dashboard) for a pyme from scratch, using the stack and patterns proven on the spa reservation project. Use when starting a new pyme digitalization project, or asked to scaffold reservations/caja/giftcards/dashboard for any small business.
---

# PyME SaaS Scaffold

Recipe for building a small-business operations tool end to end: booking/scheduling, point-of-sale, prepaid credit (giftcards), and an owner-facing stats dashboard. Extracted from building a spa reservation system; the domain models generalize to most appointment-based or retail pymes (salons, clinics, gyms, repair shops, etc.) with light renaming.

## Stack (default, don't relitigate unless the user asks)

- **Next.js 14+** (App Router, TypeScript, Tailwind) — one full-stack project, no separate backend.
- **PostgreSQL + Prisma** — relational data, transactional writes for money-moving operations.
- **Resend** — transactional email (daily digest, receipts).
- **Vercel Cron** — scheduled jobs (`vercel.json` + a `Bearer $CRON_SECRET`-protected API route).
- **Neon** — free, zero-install Postgres for dev/demo when the user has no local Postgres or is on a locked-down machine (Chromebook, managed device). Faster than fighting local installs.

## Step 1 — Scaffold

`create-next-app` refuses project names with capital letters/spaces. If the repo dir isn't a valid npm name, scaffold into `/tmp/<valid-name>` and move the contents in (`mv /tmp/x/* /tmp/x/.[^.]* repo-root/`), preserving any existing `README.md`/`.claude/` — `create-next-app` will overwrite `README.md`, so re-save it after.

```bash
npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-git
npm install -D prisma dotenv tsx
npm install @prisma/client resend recharts
npx prisma init --datasource-provider postgresql
```

If `npx prisma init` generates a `prisma.config.ts` that fails type-check (`env` not callable, `migrations` key unknown, `earlyAccess` required) — these are version-skew symptoms, not real config: strip it down to `defineConfig({ earlyAccess: true, schema: "prisma/schema.prisma" })` and keep `import "dotenv/config"` at the top.

If `npm install <pkg>` throws `Cannot read properties of null (reading 'edgesOut')`, that's an npm arborist bug triggered by a package's "latest" being a pre-release with broken peer metadata (seen with `prisma@8.0.0-rc`) — pin an explicit stable version instead of the tag.

## Step 2 — Domain model (Prisma schema)

The reusable core, renaming `Service`→whatever the business sells and `Booking`→whatever gets scheduled:

- `User` (role enum: ADMIN/STAFF) — no auth system needed for an MVP demo; grab `findFirst({ role: 'ADMIN' })` as the acting operator until real auth is built.
- `Service` — name (unique, needed for seed upserts), duration, price.
- `Client` — name, phone/email optional but at least one unique for dedupe (`findOrCreateClient` by phone/email).
- `Booking` — client + service + staff + start/end time + status enum (PENDING/CONFIRMED/COMPLETED/CANCELLED/NO_SHOW). End time computed from service duration, never user-entered.
- `GiftCard` + `GiftCardTransaction` (ISSUE/TOPUP/REDEEM) — code is a short random string (`GC-XXXXXX`), balance decremented atomically inside the same transaction as the Sale.
- `CashRegisterSession` (open/close, opening/closing amount) + `Sale` + `SaleItem` — a `Booking` does NOT create revenue by itself. Revenue only exists once a `Sale` is recorded against an open cash session. Keep these separate: reserving a slot and paying for it are different events in real pyme workflows.

Money fields: `Decimal @db.Decimal(10, 2)`, never `Float`.

Multi-step money-moving writes (charge a booking, sell/redeem a giftcard) MUST run inside `prisma.$transaction(async (tx) => {...})` — partial writes on a sale are worse than a failed one.

## Step 3 — Dashboard stats

One `getDashboardStats()` aggregator, not N separate queries scattered across the page. Compute in one pass: today's bookings, revenue (7d/30d), average ticket, occupancy (booked minutes ÷ staff-capacity minutes), cancellation/no-show ratios, outstanding giftcard liability (`sum(balance) where active`), a 14-day revenue trend array, and a naive projection (`avg(last 14 days) * 30`). Render with `recharts` (`LineChart` for trend, `BarChart` for rankings) — style them with CSS vars (`stroke="var(--accent)"`) so charts follow the design tokens automatically.

## Step 4 — Daily notification (cron)

`vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/daily-bookings", "schedule": "0 11 * * *" }] }
```
The route checks `authorization: Bearer $CRON_SECRET`, queries today's non-cancelled bookings, and emails a summary via Resend. This is a real product feature, not a Claude Code hook/rule — don't confuse "automate a daily report for the business" with "automate my own workflow."

## Step 5 — Design system (don't ship the Tailwind-default look)

A generic black/white/gray Tailwind prototype reads as unfinished to a paying pyme customer. Define real tokens in `globals.css` under `@theme inline` so Tailwind generates matching utilities (`bg-paper`, `text-ink`, `bg-accent-soft`, `border-border`, ...):

```css
:root {
  --paper: #faf7f1; --surface: #fff; --ink: #201d18; --muted: #6f6a5f;
  --accent: #58694a; --accent-soft: #e6ead9; --border: #e6e0d2;
  --danger: #b3261e; --danger-soft: #f8e8e6; --success: #3f6b4b;
}
@theme inline {
  --color-paper: var(--paper); --color-surface: var(--surface);
  --color-ink: var(--ink); --color-muted: var(--muted);
  --color-accent: var(--accent); --color-accent-soft: var(--accent-soft);
  --color-border: var(--border); --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft); --color-success: var(--success);
  --font-display: var(--font-<serif-font>); --font-sans: var(--font-<sans-font>);
}
```

Pick a warm paper + near-black ink + one muted accent (never pure black `#000` + pure white + primary blue — that's the generic AI-slop default). Pair a serif display font (`next/font/google`, e.g. Fraunces) for headings with the existing sans for body/UI. This palette/pairing pattern is generalized from the `editorial-service-booking` skill (warm ivory, near-black chapters, serif+sans pairing, hairline borders, minimal radius, black for decisive actions, one muted accent for selection/status) — load that skill for appointment-based businesses (salons, clinics, studios) specifically; for other pyme verticals pick an equivalently restrained, non-generic palette.

Sidebar nav (not a top bar) for an admin/back-office tool — `usePathname()` in a small client component, `aria-current="page"` on the active link.

## Step 6 — Accessible forms, always

- Every input gets a real `<label htmlFor>`, never placeholder-only text.
- Server actions that validate user input must use `useActionState` and return `{ error?: string }` — **never `throw`** for expected validation failures (empty name, amount ≤ 0, gift card not found). A thrown `Error` in a Server Action surfaces as Next's raw red error overlay, which reads as a broken product to a non-technical pyme owner. Reserve `throw` for truly unexpected/programmer errors.
- Errors render inline via `role="alert"`, near the field, not as a toast that steals focus.
- `:focus-visible` outline using the accent token, not the browser default nor `outline: none`.

## Step 7 — Local/demo database

If the user has no reachable Postgres (locked-down device, no Docker permissions, blocked installs), don't fight it — use **Neon**: free project, copy the pooled connection string into `.env`, `npx prisma migrate dev --name init`, `npm run db:seed`. Works identically to local Postgres for a demo/MVP.

`db:seed` runs via `tsx` **outside** the Prisma CLI, so it does NOT get `.env` loaded automatically the way `prisma migrate`/`generate` do (those go through `prisma.config.ts`'s `import "dotenv/config"`). The seed script needs its own `import "dotenv/config";` as its first line, or it'll fail with `Environment variable not found: DATABASE_URL` despite `.env` being correctly populated.

If the user is on a Chromebook/managed device and file transfer or GitHub access seems blocked: test with `curl -I https://github.com` and `ping github.com` from their terminal before assuming a network-level block — it's frequently a browser-only policy (school/work device management), and `git clone` from the terminal often works fine even when the Chrome browser is filtered. `SendUserFile` (a zip of the repo minus `node_modules`/`.git`/`.next`) is a reliable fallback for getting code onto a machine that can't reach the remote git host at all, but a real `git clone` (once reachable) is strictly better — it keeps history and enables `git pull` for future updates.

## Anti-patterns to avoid

- Don't let a `Booking` imply revenue — always route money through `Sale`.
- Don't scatter dashboard queries across the page component — one aggregator function.
- Don't throw raw errors from Server Actions for expected validation failures.
- Don't ship the default Tailwind gray/black palette as "done" — it reads as a prototype, not a product.
- Don't skip `.env.example` — pyme clients and future-you need a template; remember `.env*` in `.gitignore` also hides `.env.example` unless you add `!.env.example`.
