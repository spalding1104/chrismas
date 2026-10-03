import { TransactionType } from './transaction.model';

/**
 * Khoản thu/chi cố định hằng tháng. Không lưu thành giao dịch: mỗi tháng
 * trong [startMonth, endMonth] tự có một khoản (xem expandRecurring).
 * Giữ đồng bộ với draftSchema/COLUMNS trong server/src/recurring.ts.
 */
export interface RecurringItem {
    id: string;
    type: TransactionType;
    amount: number;
    categoryId: string;
    note: string;
    /** Ngày đóng/nhận trong tháng (1–31; tháng ngắn hơn dồn về ngày cuối). */
    day: number;
    /** yyyy-MM, tháng đầu tiên có khoản này. */
    startMonth: string;
    /** yyyy-MM, tháng cuối cùng; `null` = vẫn còn. */
    endMonth: string | null;
}

export type RecurringDraft = Omit<
    RecurringItem,
    'id' | 'startMonth' | 'endMonth'
>;
