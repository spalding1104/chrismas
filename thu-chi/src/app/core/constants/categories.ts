import { Category, TransactionType } from '../models';

export const CATEGORIES: readonly Category[] = [
  { id: 'salary', name: 'Lương', icon: '💼', color: '#1f9d6b', type: 'income' },
  { id: 'bonus', name: 'Thưởng', icon: '🎁', color: '#3bb88a', type: 'income' },
  { id: 'side-job', name: 'Làm thêm', icon: '💡', color: '#62c9a3', type: 'income' },
  { id: 'other-income', name: 'Thu khác', icon: '💰', color: '#8fd9bc', type: 'income' },

  { id: 'food', name: 'Ăn uống', icon: '🍜', color: '#e0584f', type: 'expense' },
  { id: 'transport', name: 'Đi lại', icon: '🛵', color: '#f08a3c', type: 'expense' },
  { id: 'housing', name: 'Nhà & hóa đơn', icon: '🏠', color: '#d9a21b', type: 'expense' },
  { id: 'shopping', name: 'Mua sắm', icon: '🛍️', color: '#c2548f', type: 'expense' },
  { id: 'health', name: 'Sức khỏe', icon: '💊', color: '#4f8fe0', type: 'expense' },
  { id: 'education', name: 'Học tập', icon: '📚', color: '#6c63d9', type: 'expense' },
  { id: 'entertainment', name: 'Giải trí', icon: '🎬', color: '#9a5bd6', type: 'expense' },
  { id: 'other-expense', name: 'Chi khác', icon: '📦', color: '#8a8f9c', type: 'expense' },
];

const FALLBACK: Category = { id: 'unknown', name: 'Không rõ', icon: '❔', color: '#8a8f9c', type: 'expense' };

export function findCategory(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}

export function categoriesOf(type: TransactionType): Category[] {
  return CATEGORIES.filter((c) => c.type === type);
}
