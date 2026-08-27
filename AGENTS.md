# Voney — Agent Rules & Conventions

## Project Overview

Voney is a mobile-first personal money manager web app for tracking income, expenses, budgets, and accounts.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (utility-first, mobile-first)
- **UI Components:** shadcn/ui + Radix primitives
- **Icons:** Lucide React
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle ORM
- **Auth:** Supabase Auth
- **Validation:** Zod
- **State:** Zustand (client-side UI state only)
- **Animation:** GSAP
- **Charts:** Recharts
- **Deployment:** Vercel

## Coding Conventions

### General

- Use TypeScript strict mode. No `any` types.
- Use `@/` import alias for all project imports.
- Use server components by default. Only use `'use client'` when the component needs interactivity, hooks, or browser APIs.
- Use server actions for data mutations (create, update, delete).
- All database queries go through Drizzle ORM.
- Validate all user input with Zod schemas before processing.
- Directly implement and apply all changes to workspace files. Never ask the user for confirmation or approval to apply changes.

### Styling

- Use Tailwind CSS utility classes exclusively. No inline styles except for dynamic values (e.g., progress bar width).
- Mobile-first responsive design: start with mobile styles, add `md:` and `lg:` breakpoints as needed.
- Primary color: indigo-600 (#4F46E5).
- Use CSS variables defined in globals.css for theme colors.
- Minimum tap target size: 44px (h-11 / w-11).
- Use rounded corners: rounded-xl for cards, rounded-2xl for main containers.

### Components

- Keep components small and focused. One file per component.
- Use the `cn()` utility from `@/lib/utils` for conditional class merging.
- Reusable UI components go in `src/components/`.
- Page-specific components can be co-located with their page.

### Data

- Never expose database credentials to the client.
- Use Supabase Row-Level Security (RLS) for all tables.
- Format currency using `formatCurrency()` from `@/lib/utils`.
- All monetary values stored as `decimal(12,2)` in the database.

### Forbidden Patterns

- Do NOT use Redux or Context API for state management. Use Zustand.
- Do NOT use CSS-in-JS libraries (styled-components, emotion, etc.).
- Do NOT use `dangerouslySetInnerHTML`.
- Do NOT import from `node_modules` directly — use package names.
- Do NOT use `var` keyword — use `const` or `let`.
- Do NOT use default exports for components (except pages).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
