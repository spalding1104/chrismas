import { TransactionType } from './transaction.model';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface CategoryTotal {
  category: Category;
  total: number;
  /** Tỷ lệ trên tổng của cùng loại (0–100). */
  percent: number;
}
