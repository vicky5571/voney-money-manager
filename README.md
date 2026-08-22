# 💸 Voney — Mobile-First Personal Money Manager

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15%20(App%20Router)-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss)
![Capacitor](https://img.shields.io/badge/Capacitor-v8-119EFF?style=for-the-badge&logo=capacitor)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-v0.45-C5F74F?style=for-the-badge&logo=drizzle)
![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-purple?style=for-the-badge&logo=pwa)

**A sleek, fast, mobile-first personal finance app built for effortless expense tracking, smart budget management, subscription monitoring, and financial health forecasting.**

[Live Demo](https://voney-money-manager.vercel.app) • [📥 Download APK](./android-app/capacitor-debug.apk) • [Features](#-features) • [Installation](#-getting-started) • [Android & Capacitor](#-android-app--capacitor-8)

</div>

---

## ✨ Features

### 🩺 1. Monthly Financial Health Score & Spending Forecast
- **0–100 Financial Health Gauge**: Automatically scored across 4 core pillars:
  - **Savings Rate (35%)**: Progress toward your customizable savings target (e.g. 20%).
  - **Budget Adherence (35%)**: Dynamic pacing vs monthly category limits.
  - **Runway & Buffer (15%)**: Days your current wallet balance sustains daily burn rate.
  - **Bill Punctuality (15%)**: Penalty-free recurring subscription discipline.
- **Customizable Target Savings Goal**: Interactive slider (1–80%) and quick presets (10%, 20%, 30%, 50%) saved to local storage.
- **Velocity Forecast**: Projects month-end spending based on real-time daily burn rate.
- **Historical Support**: Browse past months on `/transactions` to review past health scores and closed-month recap performance.

### ⚡ 2. Speed Numeric Keypad & Native Haptics
- Custom mobile-friendly numeric keypad with instant **`000`** IDR denomination key.
- Built-in arithmetic math evaluation (`+` and `-`) with live result computation.
- **Haptic Vibration Feedback**: Native vibration on key presses (`navigator.vibrate(10)`) with `aria-live="polite"` accessibility for screen readers.

### 📅 3. Recurring Bills & Subscription Manager
- Dedicated `/recurring` hub for monthly, weekly, and yearly recurring expenses (Netflix, Spotify, WiFi, Gym, Rent).
- Real-time countdown badges (`Due in 3 days`, `Due Today`, `Overdue`).
- **1-Tap "Mark Paid"**: Automatically logs the expense to your chosen wallet and calculates the next renewal date.
- Dashboard preview card for upcoming bills.

### 🎨 4. Custom Categories Manager
- Personalize categories with **34+ Lucide icons** and **16 vibrant color themes**.
- Manage default and custom income/expense categories directly from the `/add` screen or `/accounts`.

### 🔁 5. Multi-Wallet Accounts & Inter-Wallet Transfers
- Manage multiple accounts: Cash, Bank BCA, Mandiri, Dana, GoPay, OVO, etc.
- **Transfer Mode**: Transfer funds between wallets with balance checking, note logging, and atomic transaction updates.
- Hide / Show balance toggle with privacy masking (`••••••••`).

### 📊 6. Performance-Optimized Visual Analytics
- Interactive **7-Day & 30-Day Spending Area Charts** powered by Recharts.
- **Lazy Loaded Bundle**: Chart components are dynamically imported with skeleton loaders, reducing initial mobile JS load by ~80KB.
- Month-over-month comparison badge and category-level budget warning alerts.

### 🛡️ 7. Precision Math & Soft Deletes
- **Integer Cents Conversion**: Uses `toCents()` and `fromCents()` integer math in `lib/utils.ts` to prevent IEEE-754 floating-point drift.
- **Soft Deletes (`deleted_at`)**: Safeguards transactions, budgets, and accounts with audit trail protection.
- **Composite DB Indexes**: Optimized PostgreSQL indexes on `(user_id, transaction_date DESC)` and `(user_id, month, year)`.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components & Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Mobile Native**: [Capacitor 8](https://capacitorjs.com/) (Haptics, Status Bar, Splash Screen, Push Notifications)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security & Auth)
- **ORM & Migrations**: [Drizzle ORM](https://orm.drizzle.team/) & custom migration runner
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/) (Dynamic SSR-safe imports)
- **Animation**: [GSAP](https://greensock.com/gsap/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm, pnpm, or yarn
- A [Supabase](https://supabase.com) project

### 1. Clone the repository
```bash
git clone https://github.com/vicky5571/voney-money-manager.git
cd voney-money-manager
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### 4. Run Database Migrations
Apply all schema tables, composite indexes, soft deletes, and triggers:
```bash
npm run db:migrate
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your browser.

---

## 🤖 Android App & Capacitor 8

Voney is powered by **Capacitor 8** to provide a fast native Android app experience wrapping the live production server with native device features.

### Prerequisites for Android Builds
- **Java (JDK 21)**: `brew install --cask temurin@21`
- **Android SDK**: `brew install --cask android-commandlinetools` (or Android Studio)

### 🔨 Building the APK Locally
```bash
# 1. Sync Capacitor configuration & plugins
npm run cap:sync

# 2. Build Debug APK
cd android && ./gradlew assembleDebug
```
The compiled APK will be output to:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### 📥 Download APK (latest build — 5.4 MB)

[![Download APK](https://img.shields.io/badge/Download-APK_5.4_MB-4F46E5?style=for-the-badge&logo=android)](./android-app/capacitor-debug.apk)

| Artifact | Size | Link |
|---|---|---|
| `capacitor-debug.apk` (Capacitor debug) | ~5.4 MB | [⬇️ Download](./android-app/capacitor-debug.apk) |
| `app-release-signed.apk` (TWA legacy) | ~2.1 MB | [⬇️ Download](./android-app/app-release-signed.apk) |

### 📲 Installing on Device
Connect your Android phone with USB Debugging enabled:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```
Or open the Android project in Android Studio:
```bash
npm run cap:open
```

---

## 🧪 Testing & Database

### Running Unit Tests
Voney includes lightweight unit tests for the Financial Health 4-pillar calculation algorithm:
```bash
npx tsx src/lib/__tests__/financial-health.test.ts
```

### Database Schema & Migrations
- Schema definitions: `src/lib/db/schema.ts`
- SQL migrations: `supabase/migrations/`
- Push schema directly to database:
```bash
npm run db:push
```

---

## 📂 Project Structure

```text
voney-money-manager/
├── android/                    # Capacitor native Android project
│   ├── app/                    # Android application module
│   │   └── build/outputs/apk/  # Generated APK binaries
│   └── capacitor.settings.gradle
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (auth)/             # Login & Signup routes
│   │   ├── (main)/             # Main layout & tab routes
│   │   │   ├── page.tsx        # Dashboard page
│   │   │   ├── add/            # Add Transaction & Transfer
│   │   │   ├── transactions/   # Transaction list & Historical Health
│   │   │   ├── budgets/        # Category budgets
│   │   │   ├── accounts/       # Wallets & Account manager
│   │   │   └── recurring/      # Recurring subscriptions manager
│   │   ├── actions/            # Server Actions (CRUD & Mutations)
│   │   ├── manifest.ts         # Web App Manifest
│   │   └── layout.tsx          # Root layout with PWAProvider
│   ├── components/             # Reusable UI & Feature components
│   │   ├── balance-card.tsx
│   │   ├── financial-health-card.tsx
│   │   ├── speed-keypad.tsx
│   │   ├── category-grid.tsx
│   │   └── ...
│   ├── lib/                    # Business logic, helpers & DB
│   │   ├── __tests__/          # Unit tests (financial health, RLS)
│   │   ├── financial-health.ts # Health score & forecast engine
│   │   ├── offline-sync.ts     # Offline queue & auto-sync
│   │   ├── utils.ts            # Cents math & currency formatters
│   │   ├── db/schema.ts        # Drizzle ORM schema with indexes
│   │   └── supabase/           # Server & browser clients
│   └── constants/              # Categories, colors & icons
├── capacitor.config.ts         # Capacitor 8 configuration
├── supabase/
│   └── migrations/             # SQL database migrations
└── public/
    ├── sw.js                   # Service Worker
    └── icons/                  # App icons
```

---

## 📄 License

This project is licensed under the **MIT License**.
