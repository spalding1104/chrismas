import { RecurringItem } from '../models';
import { expandRecurring, isActiveIn } from './recurring.util';

describe('recurring.util', () => {
    const item: RecurringItem = {
        id: 'r',
        type: 'expense',
        amount: 100_000,
        categoryId: 'housing',
        note: 'Tiền nhà',
        day: 31,
        startMonth: '2026-02',
        endMonth: '2026-04',
    };

    it('is active only within [startMonth, endMonth]', () => {
        expect(isActiveIn(item, '2026-01')).toBe(false);
        expect(isActiveIn(item, '2026-02')).toBe(true);
        expect(isActiveIn(item, '2026-04')).toBe(true);
        expect(isActiveIn(item, '2026-05')).toBe(false);
        expect(isActiveIn({ ...item, endMonth: null }, '2030-12')).toBe(true);
    });

    it('creates one entry per active month, clamping the day', () => {
        const out = expandRecurring(
            [item],
            ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
        );
        expect(out.map((t) => t.date)).toEqual([
            '2026-02-28',
            '2026-03-31',
            '2026-04-30',
        ]);
        expect(out[0]).toMatchObject({
            id: 'recurring:r:2026-02',
            recurringId: 'r',
            amount: 100_000,
            note: 'Tiền nhà',
        });
    });
});
