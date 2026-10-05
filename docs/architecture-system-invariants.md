# Architecture & System Invariants — Voney

## 1. System Overview & Technology Stack

Voney is a high-performance, mobile-first personal financial management web application with native Android mobile packaging capabilities.

### Core Stack Profile

| Layer | Technology | Specification / Package | Notes |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | v26.8.1 | Native TypeScript strip-types & test runner support |
| **Language** | TypeScript | ^5.0 (Strict mode) | `@/*` path mapping to `src/*` |
| **Framework** | Next.js | 16.3.1 (App Router) | Server components by default, `'use client'` for interactive UI |
| **UI Library** | React | 19.2.8 | Concurrent features, Server Actions integration |
| **Styling** | Tailwind CSS | v4.x (@tailwindcss/postcss) | CSS variables, Emerald primary theme, dark-mode ready |
| **State Management** | Zustand | ^5.0.15 | In-memory cache + optimistic mutation store |
| **Database** | PostgreSQL | Supabase Hosted | Direct pooling connection via `postgres.js` |
| **ORM** | Drizzle ORM | ^0.45.2 (`drizzle-kit ^0.31`) | Schema at `src/lib/db/schema.ts` |
| **Authentication** | Supabase Auth | `@supabase/ssr` (^0.12.4) | Cookie-based session validation & RLS enforcement |
| **Validation** | Zod | ^4.4.3 | Strict input validation schemas in `src/lib/validations/` |
| **Animations** | Motion & GSAP | `motion ^13.1.1` | Smooth gesture animations, sheet transitions, micro-interactions |
| **Charts** | Recharts | ^3.10.1 | Financial health, spending breakdown, budget gauges |
| **Mobile Shell** | Capacitor | `@capacitor/core ^8.5.0` | Native Android build integration, haptics, status bar |
| **Test Runner** | Node Test + tsx | `tsx --test` | Sub-second execution (<500ms) with zero compilation overhead |

---

## 2. Codebase Organization & Architectural Boundaries

```text
src/
├── app/
│   ├── (auth)/                  # Unauthenticated routes (login, register, reset-password)
│   ├── (main)/                  # Authenticated routes with shared layout & bottom nav
│   │   ├── accounts/            # Financial accounts management
│   │   ├── add/                 # Speed-optimized transaction & transfer intake
│   │   ├── budgets/             # Category budget tracking & detail views
│   │   ├── profile/             # User settings, security, export, and preferences
│   │   ├── recurring/           # Subscriptions & recurring bill schedules
│   │   └── transactions/        # Historical ledger, filter sheets, transaction edit
│   ├── actions/                 # Next.js Server Actions (RPC mutation & query layer)
│   ├── auth/                    # OAuth & auth redirect handlers
│   └── globals.css              # Tailwind v4 theme variables & base reset
├── components/                  # Domain & layout components
├── constants/                   # Static categories, defaults, and system metadata
├── lib/
│   ├── __tests__/               # High-speed unit tests (tsx --test)
│   ├── db/                      # Drizzle instance (`index.ts`) & database schema (`schema.ts`)
│   ├── store/                   # Zustand client state store (`use-app-store.ts`)
│   ├── supabase/                # SSR server client & browser client factories
│   ├── validations/             # Zod input schemas (account, auth, budget, recurring, tx)
│   ├── financial-health.ts      # Deterministic score & savings forecast calculation engine
│   ├── offline-sync.ts          # LocalStorage queue, dead-letter queue & background sync
│   └── utils.ts                 # Currency formatter, cents math, UUID generator, cn()
```

### Architectural Invariants & Rules

1. **Single Source of Truth (SSOT)**:
   - Database tables and inferred TypeScript domain entities live exclusively in `src/lib/db/schema.ts` (re-exported via `src/lib/db/index.ts`).
   - User input validation schemas live exclusively in `src/lib/validations/`.
   - Ad-hoc, duplicate type definitions across components or server actions are strictly prohibited.

2. **Currency & Financial Arithmetic Precision**:
   - Stored in PostgreSQL as `decimal(12,2)`.
   - Client and server calculations MUST avoid binary floating-point drift by converting amounts to integer cents via `toCents(amount)` and converting back via `fromCents(cents)`.
   - Formatting is centralized via `formatCurrency()` (Indonesian Rupiah `id-ID`).

3. **Strangler Pattern on God Files**:
   Coordinator components and actions must remain under ~250 lines. The following identified monolithic files are slated for modular strangler extraction:
   - `src/components/dashboard-client.tsx` (1,184 lines)
   - `src/app/actions/transactions.ts` (933 lines)
   - `src/components/accounts-client.tsx` (883 lines)
   - `src/app/(main)/transactions/page.tsx` (726 lines)
   - `src/app/(main)/add/page.tsx` (661 lines)
   - `src/components/category-manager-sheet.tsx` (658 lines)
   - `src/components/recurring-bills-client.tsx` (596 lines)
   - `src/app/(main)/transactions/[id]/edit/page.tsx` (536 lines)
   - `src/components/financial-health-card.tsx` (520 lines)
   - `src/lib/offline-sync.ts` (508 lines)
   - `src/components/budgets-client.tsx` (508 lines)
   - `src/components/profile-client.tsx` (464 lines)

---

## 3. Entity & Data Scoping Matrix

Strict boundary enforcement separates **Global Master Data** (unscoped system defaults) from **Tenant/User Work Items** (strictly scoped to authenticated `userId`).

| Entity | Storage Table | Scoping / Ownership | Cascade Lifecycle | Soft Delete? | Key Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User** | `users` | Root Auth Entity | `id` referenced by all child tables | No | PK (`id`), Unique (`email`) |
| **Account** | `accounts` | User Scoped (`user_id`) | `ON DELETE CASCADE` from `users.id` | No | PK (`id`), FK (`user_id`) |
| **Category (System)** | `categories` | Global Master Data (`user_id = NULL`, `is_default = true`) | Shared across all users; read-only | No | PK (`id`) |
| **Category (Custom)** | `categories` | User Scoped (`user_id`) | `ON DELETE CASCADE` from `users.id` | No | PK (`id`), FK (`user_id`) |
| **Transaction** | `transactions` | User Scoped (`user_id`) | `user_id` CASCADE, `account_id` CASCADE, `category_id` RESTRICT | Yes (`deleted_at`) | `idx_transactions_user_date_desc`<br>`idx_transactions_user_created_desc`<br>`idx_transactions_user_deleted` |
| **Budget** | `budgets` | User Scoped (`user_id`) | `user_id` CASCADE, `category_id` CASCADE | Yes (`deleted_at`) | `idx_budgets_user_month_year_cover`<br>`idx_budgets_user_daterange` |
| **Recurring Bill** | `recurring_bills`| User Scoped (`user_id`) | `user_id` CASCADE, `account_id` CASCADE, `category_id` RESTRICT | Yes (`deleted_at`) | `idx_recurring_user_nextdue_active` |

---

## 4. Persistence Architecture & Offline Synchronization

```text
[User Interaction (UI)]
        │
        ├──> 1. Optimistic Update (Zustand Store) ──> Immediate Screen Re-render (<16ms)
        │
        ├──> 2. Local Persistence (LocalStorage Queue) ──> Durable uncommitted fallback
        │
        └──> 3. Remote Synchronization (Server Action)
                     │
                     ├── [Success] ──> Mark Synced / Remove from Local Queue
                     │
                     └── [Failure / Offline]
                              │
                              ├── Retry with exponential backoff (Max 3 attempts)
                              └── Move to Dead Letter Queue (`voney_offline_dead_letter_queue`)
```

### 1. Client Hydration & Fast Caches
- **Zustand Store (`src/lib/store/use-app-store.ts`)**:
  - `txCache`: Keyed by `"M-YYYY"` (e.g., `"10-2026"`). Prevents refetching transactions when navigating between views.
  - `summaryCache`: Cached monthly income, expense, and net values.
  - `healthCache`: Cached calculation of the financial health scorecard.
  - `countsCache`: Cached counts of total, income, and expense records.
  - `dashboardTotalBalance`: Pre-warmed summary for instantaneous initial paint.

### 2. Offline Queue Protocol (`src/lib/offline-sync.ts`)
- Storage Keys:
  - `voney_offline_transactions_queue`: Uncommitted income/expense transactions.
  - `voney_offline_transfers_queue`: Uncommitted inter-account fund transfers.
  - `voney_offline_dead_letter_queue`: Unprocessable items that exceeded `MAX_RETRY_COUNT = 3`.
- Queue Limits: `MAX_QUEUE_SIZE = 50`, `MAX_NOTE_LEN = 200`.
- Sync Trigger: Automatically invoked when network reconnection (`online` event) occurs or when user opens the app (`initOfflineSyncListeners()`).

### 3. Server Action & Database Layer
- Direct connection via PostgreSQL connection string (`DATABASE_URL`) to Supabase.
- All Server Actions authenticate requests with `@supabase/ssr` cookies before executing Drizzle ORM operations, preventing cross-tenant data contamination.
- Direct database credentials are never bundled into client javascript.

---

## 5. Instant Test Loop (<1s)

All tests execute via Node.js native test runner powered by `tsx`:

```bash
# Run targeted unit test (smoke test)
npm test -- src/lib/__tests__/utils.test.ts

# Fast run directly via tsx
./node_modules/.bin/tsx --test src/lib/__tests__/utils.test.ts

# Run auth validation tests
npm test -- src/lib/__tests__/auth-validation.test.ts
```

- **Execution Speed Target**: < 500ms
- **Zero Configuration**: Uses native assertions (`node:assert/strict`) and runner (`node:test`).
