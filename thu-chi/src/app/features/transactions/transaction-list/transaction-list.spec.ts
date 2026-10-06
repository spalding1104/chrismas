import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Transaction } from '../../../core/models';
import { TransactionList } from './transaction-list';

describe('TransactionList', () => {
    let fixture: ComponentFixture<TransactionList>;
    let el: HTMLElement;

    const tx = (id: string, date: string, extra: Partial<Transaction> = {}) =>
        ({
            id,
            type: 'expense',
            amount: 50_000,
            categoryId: 'food',
            note: id,
            date,
            ...extra,
        }) as Transaction;

    const sections = () =>
        [...el.querySelectorAll('section.day')].map((s) => ({
            title: s.querySelector('.day__title')!.textContent!.trim(),
            notes: [...s.querySelectorAll('.info__title')].map((n) =>
                n.textContent!.trim(),
            ),
        }));

    async function render(list: Transaction[]): Promise<void> {
        fixture = TestBed.createComponent(TransactionList);
        fixture.componentRef.setInput('transactions', list);
        el = fixture.nativeElement;
        await fixture.whenStable();
    }

    it('groups recurring items into their own section, first', async () => {
        await render([
            tx('Ăn tối', '2026-10-09'),
            tx('Spotify', '2026-10-15', { recurringId: 's' }),
            tx('Tiền nhà', '2026-10-01', { recurringId: 'h' }),
            tx('Cà phê', '2026-10-03'),
        ]);

        const [recurring, ...days] = sections();
        expect(recurring).toEqual({
            title: 'Khoản cố định hằng tháng',
            notes: ['Tiền nhà', 'Spotify'],
        });
        expect(days.map((d) => d.notes)).toEqual([['Ăn tối'], ['Cà phê']]);
    });

    it('has no recurring section when there are none', async () => {
        await render([tx('Ăn tối', '2026-10-09')]);
        expect(el.querySelector('.day--recurring')).toBeNull();
        expect(el.querySelector('app-empty-state')).toBeNull();
    });

    it('shows the empty state only when there is nothing at all', async () => {
        await render([]);
        expect(el.querySelector('app-empty-state')).not.toBeNull();

        await render([tx('Spotify', '2026-10-15', { recurringId: 's' })]);
        expect(el.querySelector('app-empty-state')).toBeNull();
    });
});
