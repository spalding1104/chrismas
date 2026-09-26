import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthStore } from '../auth/auth.store';
import { Transaction, User } from '../models';
import { toMonthKey } from '../utils/date.util';
import { TRANSACTIONS_API, TransactionStore } from './transaction.store';

describe('TransactionStore', () => {
    let store: TransactionStore;
    let http: HttpTestingController;
    const month = toMonthKey(new Date());
    const alice: User = { id: 'a', email: 'a@test.vn' };
    const user = signal<User | null>(alice);

    const tx = (id: string, fields: Partial<Transaction>): Transaction => ({
        id,
        type: 'expense',
        amount: 100_000,
        categoryId: 'food',
        note: '',
        date: `${month}-01`,
        ...fields,
    });

    const settle = () => new Promise((resolve) => setTimeout(resolve));

    async function setup(initial: Transaction[]): Promise<void> {
        user.set(alice);
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: AuthStore, useValue: { user } },
            ],
        });
        http = TestBed.inject(HttpTestingController);
        store = TestBed.inject(TransactionStore);
        TestBed.tick();
        http.expectOne(TRANSACTIONS_API).flush(initial);
        await settle();
    }

    afterEach(() => http.verify());

    it('clears data on logout and reloads for the next account', async () => {
        await setup([tx('alice-1', {})]);
        expect(store.transactions().length).toBe(1);

        user.set(null);
        TestBed.tick();
        expect(store.transactions()).toEqual([]);
        http.expectNone(TRANSACTIONS_API);

        user.set({ id: 'b', email: 'b@test.vn' });
        TestBed.tick();
        http.expectOne(TRANSACTIONS_API).flush([tx('bob-1', {})]);
        await settle();
        expect(store.transactions().map((t) => t.id)).toEqual(['bob-1']);
    });

    it('drops a response that arrives after the account changed', async () => {
        await setup([]);
        const reloading = store.load();
        const pending = http.expectOne(TRANSACTIONS_API);

        user.set({ id: 'b', email: 'b@test.vn' });
        TestBed.tick();
        const bobRequest = http.expectOne(TRANSACTIONS_API);

        pending.flush([tx('alice-late', {})]);
        await reloading;
        expect(store.transactions()).toEqual([]);

        bobRequest.flush([tx('bob-1', {})]);
        await settle();
        expect(store.transactions().map((t) => t.id)).toEqual(['bob-1']);
    });

    it('computes income, expense and balance for the selected month', async () => {
        await setup([
            tx('1', {
                type: 'income',
                amount: 10_000_000,
                categoryId: 'salary',
            }),
            tx('2', { amount: 3_000_000, categoryId: 'housing' }),
            tx('3', { amount: 1_000_000, categoryId: 'food' }),
        ]);

        expect(store.totalIncome()).toBe(10_000_000);
        expect(store.totalExpense()).toBe(4_000_000);
        expect(store.balance()).toBe(6_000_000);
        expect(store.expenseByCategory().map((c) => c.category.id)).toEqual([
            'housing',
            'food',
        ]);
        expect(store.expenseByCategory()[0].percent).toBe(75);
    });

    it('aggregates the selected year by month and category', async () => {
        await setup([
            tx('1', { type: 'income', amount: 9_000_000, date: '2025-01-05' }),
            tx('2', { amount: 2_000_000, date: '2025-01-20' }),
            tx('3', {
                amount: 3_000_000,
                categoryId: 'housing',
                date: '2025-12-31',
            }),
            tx('4', { amount: 7_000_000, date: '2024-12-31' }),
        ]);
        store.selectedMonth.set('2025-06');

        expect(store.selectedYear()).toBe(2025);
        expect(store.yearIncome()).toBe(9_000_000);
        expect(store.yearExpense()).toBe(5_000_000);
        const months = store.monthlyTotals();
        expect(months.length).toBe(12);
        expect(months[0]).toEqual({
            month: '2025-01',
            income: 9_000_000,
            expense: 2_000_000,
        });
        expect(months[5]).toEqual({ month: '2025-06', income: 0, expense: 0 });
        expect(months[11].expense).toBe(3_000_000);
        expect(store.yearExpenseByCategory().map((c) => c.category.id)).toEqual(
            ['housing', 'food'],
        );
    });

    it('keeps the month of year when changing year', async () => {
        await setup([]);
        store.selectedMonth.set('2025-06');
        store.setYear(2023);
        expect(store.selectedMonth()).toBe('2023-06');
    });

    it('ignores transactions from other months', async () => {
        await setup([tx('1', { amount: 500_000, date: '2000-01-15' })]);

        expect(store.totalExpense()).toBe(0);
        store.selectedMonth.set('2000-01');
        expect(store.totalExpense()).toBe(500_000);
    });

    it('adds, updates and removes through the API', async () => {
        await setup([]);
        const draft = {
            type: 'expense',
            amount: 100_000,
            categoryId: 'food',
            note: 'Phở',
            date: `${month}-05`,
        } as const;

        const adding = store.add(draft);
        const post = http.expectOne({ method: 'POST', url: TRANSACTIONS_API });
        expect(post.request.body).toEqual(draft);
        post.flush(tx('a', draft));
        await adding;
        expect(store.totalExpense()).toBe(100_000);

        const updating = store.update('a', { ...draft, amount: 150_000 });
        http.expectOne({ method: 'PUT', url: `${TRANSACTIONS_API}/a` }).flush(
            tx('a', { ...draft, amount: 150_000 }),
        );
        await updating;
        expect(store.totalExpense()).toBe(150_000);

        const removing = store.remove('a');
        http.expectOne({
            method: 'DELETE',
            url: `${TRANSACTIONS_API}/a`,
        }).flush(null);
        await removing;
        expect(store.transactions()).toEqual([]);
    });

    it('clears only sample rows', async () => {
        await setup([tx('s', { isSample: true }), tx('mine', {})]);
        expect(store.isSample()).toBe(true);

        const clearing = store.clearSample();
        http.expectOne({
            method: 'DELETE',
            url: `${TRANSACTIONS_API}/sample`,
        }).flush(null);
        await clearing;

        expect(store.transactions().map((t) => t.id)).toEqual(['mine']);
        expect(store.isSample()).toBe(false);
    });

    it('exposes an error and keeps data when the API fails', async () => {
        await setup([tx('1', {})]);

        const removing = store.remove('1');
        http.expectOne(`${TRANSACTIONS_API}/1`).flush(
            { error: 'boom' },
            { status: 500, statusText: 'Server Error' },
        );
        await removing;

        expect(store.error()).toBe('Không xóa được giao dịch');
        expect(store.transactions().length).toBe(1);
    });
});
