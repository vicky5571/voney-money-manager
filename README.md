# 💸 Voney — Mobile-First Personal Money Manager

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15%20(App%20Router)-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-v0.45-C5F74F?style=for-the-badge&logo=drizzle)
![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-purple?style=for-the-badge&logo=pwa)

**A sleek, fast, mobile-first personal finance app built for effortless expense tracking, smart budget management, subscription monitoring, and financial health forecasting.**

[Live Demo](https://voney-money-manager.vercel.app) • [Download APK](https://github.com/vicky5571/voney-money-manager/raw/main/android-app/app-release-signed.apk) • [Features](#-features) • [Installation](#-getting-started) • [PWA Guide](#-pwa--offline-mode)

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

### ⚡ 2. Speed Numeric Keypad & Quick Calculator
- Custom mobile-friendly numeric keypad with instant **`000`** IDR denomination key.
- Built-in arithmetic math evaluation (`+` and `-`) with live result computation.
- One-tap quick switcher between standard keyboard and speed keypad.

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

### 📊 6. Interactive Visual Analytics & Trends
- Interactive **7-Day & 30-Day Spending Area Charts** powered by Recharts.
- Month-over-month comparison badge and category-level budget warning alerts.
- Filterable and searchable transaction history with CSV/Excel export.

### 📱 7. Progressive Web App (PWA) & Offline Logging
- **Install to Home Screen**: Native standalone app experience on iOS Safari and Android Chrome.
- **Offline Logging Queue**: Add transactions and transfers without internet connection.
- **Auto-Sync Engine**: Queued transactions automatically synchronize to Supabase once back online.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components & Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security & Auth)
- **ORM & Migrations**: [Drizzle ORM](https://orm.drizzle.team/) & custom migration runner
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
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
Apply all schema tables, default categories, wallets, and triggers:
```bash
npm run db:migrate
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your browser.

---

## 📱 PWA & Offline Mode

### Installing on Mobile (iOS / Android)

#### 🍏 iPhone (Safari)
1. Open the website in **Safari**.
2. Tap the **Share** button at the bottom (`􀈂`).
3. Scroll down and select **"Add to Home Screen"** (`➕`).
4. Launch Voney directly from your home screen in full-screen standalone mode.

#### 🤖 Android (Chrome)
1. Open the website in **Google Chrome**.
2. Tap **"Install App"** on the bottom prompt (or menu `⋮` $\rightarrow$ **"Install app"**).
3. Voney installs directly into your app drawer.

---

## 📂 Project Structure

```text
voney-money-manager/
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
│   │   ├── pwa-provider.tsx
│   │   └── ...
│   ├── lib/                    # Business logic, helpers & DB
│   │   ├── financial-health.ts # Health score & forecast engine
│   │   ├── offline-sync.ts     # Offline queue & auto-sync
│   │   ├── db/schema.ts        # Drizzle ORM schema
│   │   └── supabase/           # Server & browser clients
│   └── constants/              # Categories, colors & icons
├── supabase/
│   └── migrations/             # SQL database migrations
└── public/
    ├── sw.js                   # Service Worker
    └── icons/                  # PWA app icons
```

---

## 📄 License

This project is licensed under the **MIT License**.
