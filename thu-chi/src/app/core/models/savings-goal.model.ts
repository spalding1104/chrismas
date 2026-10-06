/**
 * Mục tiêu tiết kiệm đặt ở tháng `month`, áp dụng cho tháng đó và các tháng
 * sau cho tới mục tiêu kế tiếp (xem goalFor). `amount = 0` = bỏ mục tiêu.
 * Giữ đồng bộ với bodySchema trong server/src/savings-goals.ts.
 */
export interface SavingsGoal {
    /** yyyy-MM */
    month: string;
    amount: number;
}
