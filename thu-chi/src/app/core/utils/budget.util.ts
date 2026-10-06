import { SavingsGoal } from '../models';
import { toMonthKey } from './date.util';

/**
 * Mục tiêu đang áp dụng cho `month`: dòng gần nhất có tháng ≤ `month`.
 * `null` khi chưa từng đặt, hoặc đã bỏ (amount = 0) từ một tháng trước đó.
 */
export function goalFor(
    goals: readonly SavingsGoal[],
    month: string,
): SavingsGoal | null {
    let found: SavingsGoal | null = null;
    for (const goal of goals) {
        if (goal.month <= month && (!found || goal.month > found.month)) {
            found = goal;
        }
    }
    return found && found.amount > 0 ? found : null;
}

export interface MonthBudget {
    goal: number;
    income: number;
    /** Tổng các khoản chi cố định của tháng. */
    fixed: number;
    /** Đã chi ngoài các khoản cố định. */
    spent: number;
    /**
     * Được tiêu trong tháng = thu − mục tiêu − chi cố định (âm khi thu
     * chưa đủ).
     */
    limit: number;
    /** Còn được tiêu = hạn mức − đã chi (âm = đã tiêu lố). */
    remaining: number;
    /** Thực tế tiết kiệm được = thu − tổng chi (cả cố định). */
    saved: number;
    /** % hạn mức đã dùng; `null` khi hạn mức ≤ 0. */
    usedPercent: number | null;
    /** Số ngày còn lại, tính cả hôm nay; tháng đã qua = 0. */
    daysLeft: number;
    /** Được tiêu mỗi ngày còn lại (làm tròn xuống); `null` khi không còn. */
    perDay: number | null;
}

export interface BudgetInput {
    /** yyyy-MM */
    month: string;
    income: number;
    /** Tổng chi của tháng, gồm cả các khoản cố định. */
    expense: number;
    /** Phần chi cố định nằm trong `expense`. */
    fixedExpense: number;
    goal: number;
}

export function monthBudget(
    { month, income, expense, fixedExpense, goal }: BudgetInput,
    today = new Date(),
): MonthBudget {
    const spent = expense - fixedExpense;
    const limit = income - goal - fixedExpense;
    const remaining = limit - spent;
    const daysLeft = daysLeftIn(month, today);
    return {
        goal,
        income,
        fixed: fixedExpense,
        spent,
        limit,
        remaining,
        saved: income - expense,
        usedPercent: limit > 0 ? (spent / limit) * 100 : null,
        daysLeft,
        perDay:
            remaining > 0 && daysLeft > 0
                ? Math.floor(remaining / daysLeft)
                : null,
    };
}

/** Tháng này: từ hôm nay tới cuối tháng; tháng sau: cả tháng; đã qua: 0. */
function daysLeftIn(month: string, today: Date): number {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const current = toMonthKey(today);
    if (month < current) return 0;
    if (month > current) return daysInMonth;
    return daysInMonth - today.getDate() + 1;
}
