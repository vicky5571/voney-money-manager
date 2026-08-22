// Placeholder for Sentry. Install: npm i @sentry/nextjs
// npx @sentry/wizard@latest -i nextjs
// Then init in instrumentation.ts:
// import * as Sentry from "@sentry/nextjs";
// Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 });
export const captureError = (e: unknown) => console.error('[sentry-placeholder]', e);
