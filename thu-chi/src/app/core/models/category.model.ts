import { TransactionType } from './transaction.model';

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: TransactionType;
    /**
     * Gợi ý (placeholder) cho ô ghi chú khi chọn danh mục này. Bắt buộc, để
     * danh mục mới không rơi về một gợi ý chung không liên quan.
     */
    noteHint: string;
}

export interface CategoryTotal {
    category: Category;
    total: number;
    /** Số giao dịch thuộc danh mục. */
    count: number;
    /** Tỷ lệ trên tổng của cùng loại (0–100). */
    percent: number;
}
