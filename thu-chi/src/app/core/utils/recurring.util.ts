import { RecurringItem, Transaction } from '../models';

/** Khoản cố định có áp dụng cho tháng `month` (yyyy-MM) không. */
export function isActiveIn(item: RecurringItem, month: string): boolean {
    return (
        item.startMonth <= month &&
        (item.endMonth === null || month <= item.endMonth)
    );
}

/** 12 tháng yyyy-MM của một năm. */
export function monthsOfYear(year: number): string[] {
    return Array.from(
        { length: 12 },
        (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`,
    );
}

/**
 * Biến các khoản cố định thành giao dịch "ảo" cho từng tháng được hỏi, để
 * mọi tổng/biểu đồ/thống kê tính luôn mà không cần lưu dòng nào trong DB.
 * Ngày lớn hơn số ngày của tháng (vd. 31 ở tháng 2) dồn về ngày cuối tháng.
 */
export function expandRecurring(
    items: readonly RecurringItem[],
    months: readonly string[],
): Transaction[] {
    const out: Transaction[] = [];
    for (const month of months) {
        const [y, m] = month.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        for (const item of items) {
            if (!isActiveIn(item, month)) continue;
            const day = String(Math.min(item.day, lastDay)).padStart(2, '0');
            out.push({
                id: `recurring:${item.id}:${month}`,
                type: item.type,
                amount: item.amount,
                categoryId: item.categoryId,
                note: item.note,
                date: `${month}-${day}`,
                recurringId: item.id,
            });
        }
    }
    return out;
}
