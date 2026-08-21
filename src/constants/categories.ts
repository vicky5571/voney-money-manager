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
  HelpCircle,
  LucideIcon
} from 'lucide-react';

export interface CategoryDefinition {
  name: string;
  icon: string; // Lucide icon name
  color: string; // hex color
  type: 'income' | 'expense';
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  // Expense categories
  { name: 'Food', icon: 'UtensilsCrossed', color: '#EF4444', type: 'expense' },
  { name: 'Transport', icon: 'Car', color: '#3B82F6', type: 'expense' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', type: 'expense' },
  { name: 'Bills', icon: 'FileText', color: '#F59E0B', type: 'expense' },
  { name: 'Entertainment', icon: 'Gamepad2', color: '#8B5CF6', type: 'expense' },
  { name: 'Health', icon: 'Heart', color: '#10B981', type: 'expense' },
  { name: 'Education', icon: 'BookOpen', color: '#6366F1', type: 'expense' },
  { name: 'Other', icon: 'Package', color: '#6B7280', type: 'expense' },
  // Income categories
  { name: 'Salary', icon: 'Banknote', color: '#22C55E', type: 'income' },
  { name: 'Freelance', icon: 'Laptop', color: '#3B82F6', type: 'income' },
  { name: 'Gift', icon: 'Gift', color: '#EC4899', type: 'income' },
  { name: 'Other Income', icon: 'DollarSign', color: '#10B981', type: 'income' },
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
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || HelpCircle;
}
