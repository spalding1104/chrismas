import { SavingsGoal } from '../models';
import { goalFor, monthBudget } from './budget.util';

describe('goalFor', () => {
    const goals: SavingsGoal[] = [
        { month: '2026-03', amount: 3_000_000 },
        { month: '2026-01', amount: 2_000_000 },
        { month: '2026-06', amount: 0 },
        { month: '2026-08', amount: 5_000_000 },
    ];

    it('uses the latest goal set on or before the month', () => {
        expect(goalFor(goals, '2026-01')?.amount).toBe(2_000_000);
        expect(goalFor(goals, '2026-02')?.amount).toBe(2_000_000);
        expect(goalFor(goals, '2026-05')?.amount).toBe(3_000_000);
        expect(goalFor(goals, '2027-01')).toEqual({
            month: '2026-08',
            amount: 5_000_000,
        });
    });

    it('is null before the first goal and after a goal was cleared', () => {
        expect(goalFor(goals, '2025-12')).toBeNull();
        expect(goalFor(goals, '2026-06')).toBeNull();
        expect(goalFor(goals, '2026-07')).toBeNull();
        expect(goalFor([], '2026-07')).toBeNull();
    });
});

describe('monthBudget', () => {
    // Thu 20tr, muốn tiết kiệm 5tr, chi cố định 3tr → được tiêu 12tr.
    // Tổng chi 9tr (6tr ngoài cố định) → còn 12 − 6 = 6tr, dùng 50%.
    // Hôm nay 5/10: còn 31 − 5 + 1 = 27 ngày → 6.000.000 / 27 = 222.222,2.
    const today = new Date(2026, 9, 5);
    const base = {
        month: '2026-10',
        income: 20_000_000,
        expense: 9_000_000,
        fixedExpense: 3_000_000,
        goal: 5_000_000,
    };

    it('takes the goal and fixed expenses off the limit', () => {
        expect(monthBudget(base, today)).toEqual({
            goal: 5_000_000,
            income: 20_000_000,
            fixed: 3_000_000,
            spent: 6_000_000,
            limit: 12_000_000,
            remaining: 6_000_000,
            saved: 11_000_000,
            usedPercent: 50,
            daysLeft: 27,
            perDay: 222_222,
        });
    });

    it('counts a past month as over and a future month in full', () => {
        const past = monthBudget({ ...base, month: '2026-09' }, today);
        expect(past.daysLeft).toBe(0);
        expect(past.perDay).toBeNull();
        // Tháng 11 có 30 ngày, chưa chi gì ngoài cố định: 12.000.000 / 30.
        const next = monthBudget(
            { ...base, month: '2026-11', expense: 3_000_000 },
            today,
        );
        expect(next.daysLeft).toBe(30);
        expect(next.perDay).toBe(400_000);
    });

    it('goes negative once spending passes the limit', () => {
        const b = monthBudget({ ...base, expense: 16_000_000 }, today);
        expect(b.spent).toBe(13_000_000);
        expect(b.remaining).toBe(-1_000_000);
        expect(b.saved).toBe(4_000_000);
        expect(b.usedPercent).toBeCloseTo(108.33, 2);
        expect(b.perDay).toBeNull();
    });

    it('has no usage percentage when income does not cover the goal', () => {
        const b = monthBudget(
            { ...base, income: 7_000_000, expense: 3_500_000 },
            today,
        );
        expect(b.limit).toBe(-1_000_000);
        expect(b.remaining).toBe(-1_500_000);
        expect(b.usedPercent).toBeNull();
    });
});
