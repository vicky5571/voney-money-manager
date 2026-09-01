import React from "react";
import {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  FileText,
  Gamepad2,
  Heart,
  BookOpen,
  Package,
  Banknote,
  Laptop,
  Gift,
  DollarSign,
  Coffee,
  Plane,
  Home,
  Wifi,
  Tv,
  Dumbbell,
  Shield,
  Sparkles,
  GraduationCap,
  Film,
  Music,
  Fuel,
  ShoppingCart,
  Briefcase,
  Zap,
  Flame,
  Baby,
  Dog,
  Cat,
  Smartphone,
  CreditCard,
  Tag,
  HelpCircle,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface CategoryDefinition {
  name: string;
  icon: string; // Lucide icon name
  color: string; // hex color
  type: "income" | "expense";
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  // Expense categories
  { name: "Food", icon: "UtensilsCrossed", color: "#EF4444", type: "expense" },
  { name: "Transport", icon: "Car", color: "#3B82F6", type: "expense" },
  { name: "Shopping", icon: "ShoppingBag", color: "#EC4899", type: "expense" },
  { name: "Bills", icon: "FileText", color: "#F59E0B", type: "expense" },
  {
    name: "Entertainment",
    icon: "Gamepad2",
    color: "#8B5CF6",
    type: "expense",
  },
  { name: "Health", icon: "Heart", color: "#10B981", type: "expense" },
  { name: "Education", icon: "BookOpen", color: "#10B981", type: "expense" },
  { name: "Other", icon: "Package", color: "#6B7280", type: "expense" },
  // Income categories
  { name: "Salary", icon: "Banknote", color: "#22C55E", type: "income" },
  { name: "Freelance", icon: "Laptop", color: "#3B82F6", type: "income" },
  { name: "Gift", icon: "Gift", color: "#EC4899", type: "income" },
  {
    name: "Other Income",
    icon: "DollarSign",
    color: "#10B981",
    type: "income",
  },
];

export const AVAILABLE_CATEGORY_ICONS = [
  "UtensilsCrossed",
  "Coffee",
  "Car",
  "Fuel",
  "ShoppingBag",
  "ShoppingCart",
  "FileText",
  "Home",
  "Wifi",
  "Tv",
  "Gamepad2",
  "Film",
  "Music",
  "Heart",
  "Dumbbell",
  "BookOpen",
  "GraduationCap",
  "Briefcase",
  "Plane",
  "Package",
  "Banknote",
  "DollarSign",
  "CreditCard",
  "Laptop",
  "Smartphone",
  "Gift",
  "Sparkles",
  "Shield",
  "Zap",
  "Flame",
  "Baby",
  "Dog",
  "Cat",
  "Tag",
  "SlidersHorizontal",
];

export const AVAILABLE_CATEGORY_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#EAB308", // Yellow
  "#84CC16", // Lime
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#10B981", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#D946EF", // Fuchsia
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#64748B", // Slate
];

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  FileText,
  Gamepad2,
  Heart,
  BookOpen,
  Package,
  Banknote,
  Laptop,
  Gift,
  DollarSign,
  Coffee,
  Plane,
  Home,
  Wifi,
  Tv,
  Dumbbell,
  Shield,
  Sparkles,
  GraduationCap,
  Film,
  Music,
  Fuel,
  ShoppingCart,
  Briefcase,
  Zap,
  Flame,
  Baby,
  Dog,
  Cat,
  Smartphone,
  CreditCard,
  Tag,
  SlidersHorizontal,
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || HelpCircle;
}

export function CategoryIcon({
  name,
  size = 20,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const IconComponent = iconMap[name] || HelpCircle;
  return React.createElement(IconComponent, { size, className, style });
}
