export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Số tiền (VND), luôn là số dương. Chiều thu/chi do `type` quyết định. */
  amount: number;
  categoryId: string;
  note: string;
  /** Ngày giao dịch theo định dạng yyyy-MM-dd. */
  date: string;
}

export type TransactionDraft = Omit<Transaction, 'id'>;
