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
    /**
     * Dòng do `npm run db:seed` tạo ra, xóa được bằng nút
     * "Xóa dữ liệu mẫu".
     */
    isSample?: boolean;
}

export type TransactionDraft = Omit<Transaction, 'id' | 'isSample'>;

export interface MonthTotal {
    /** yyyy-MM */
    month: string;
    income: number;
    expense: number;
}
