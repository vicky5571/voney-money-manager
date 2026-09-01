import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PWAProvider } from "@/components/pwa-provider";
import "./globals.css";

// Analytics + Sentry placeholder — install @vercel/analytics & @sentry/nextjs when ready
// import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voney — Money Manager",
  description:
    "A mobile-first personal money manager. Track income, expenses, budgets, and accounts.",
  applicationName: "Voney",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Voney",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#059669",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PWAProvider>{children}</PWAProvider>
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
