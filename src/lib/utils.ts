import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parse decimal(12,2) string safely to integer cents — no float drift */
export function toCents(amount: string | number): number {
  const s = typeof amount === "number" ? amount.toFixed(2) : amount.trim();
  const sign = s.startsWith("-") ? -1 : 1;
  const abs = sign === -1 ? s.slice(1) : s;
  const [i, d = ""] = abs.split(".");
  return sign * (Number(i) * 100 + Number((d + "00").slice(0, 2)));
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format as currency. Accepts number or decimal string. Example: formatCurrency("12450.50") => 'Rp 12.451' */
export function formatCurrency(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

/** Sum decimal strings without float drift via cents */
export function sumAmounts(amounts: (string | number)[]): number {
  return amounts.reduce<number>((acc, a) => acc + toCents(a), 0) / 100;
}

/** Get time-based greeting based on location/timezone */
export function getGreeting(
  date: Date = new Date(),
  timeZone?: string,
): string {
  let hour: number;
  if (timeZone) {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone,
      });
      hour = Number(formatter.format(date));
    } catch {
      hour = date.getHours();
    }
  } else {
    hour = date.getHours();
  }

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

/** Format date relative to today */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CATEGORY_ORDER_KEY = "voney_category_order";

/** Retrieve user-customized category ID ordering from localStorage */
export function getSavedCategoryOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CATEGORY_ORDER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save user-customized category ID ordering to localStorage */
export function saveCategoryOrder(orderedIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(orderedIds));
    window.dispatchEvent(
      new CustomEvent("voney:category_order_updated", { detail: orderedIds }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

/** Sort an array of categories by user-customized ID order */
export function sortCategoriesByOrder<T extends { id: string }>(
  categories: T[],
  orderIds?: string[],
): T[] {
  const ids =
    orderIds && orderIds.length > 0 ? orderIds : getSavedCategoryOrder();
  if (!ids.length) return categories;

  const orderMap = new Map<string, number>();
  ids.forEach((id, index) => {
    orderMap.set(id, index);
  });

  return [...categories].sort((a, b) => {
    const aIndex = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const bIndex = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    return aIndex - bIndex;
  });
}
