import { TestBed } from '@angular/core/testing';

import { toMonthKey } from '../utils/date.util';
import { TransactionStore } from './transaction.store';

describe('TransactionStore', () => {
  let store: TransactionStore;
  const month = toMonthKey(new Date());

  beforeEach(() => {
    localStorage.clear();
    store = TestBed.inject(TransactionStore);
    store.clearSample();
  });

  it('computes income, expense and balance for the selected month', () => {
    store.add({
      type: 'income',
      amount: 10_000_000,
      categoryId: 'salary',
      note: '',
      date: `${month}-01`,
    });
    store.add({
      type: 'expense',
      amount: 3_000_000,
      categoryId: 'housing',
      note: '',
      date: `${month}-02`,
    });
    store.add({
      type: 'expense',
      amount: 1_000_000,
      categoryId: 'food',
      note: '',
      date: `${month}-03`,
    });

    expect(store.totalIncome()).toBe(10_000_000);
    expect(store.totalExpense()).toBe(4_000_000);
    expect(store.balance()).toBe(6_000_000);
    expect(store.expenseByCategory().map((c) => c.category.id)).toEqual(['housing', 'food']);
    expect(store.expenseByCategory()[0].percent).toBe(75);
  });

  it('ignores transactions from other months', () => {
    store.add({
      type: 'expense',
      amount: 500_000,
      categoryId: 'food',
      note: '',
      date: '2000-01-15',
    });
    expect(store.totalExpense()).toBe(0);
    store.selectedMonth.set('2000-01');
    expect(store.totalExpense()).toBe(500_000);
  });

  it('updates and removes transactions', () => {
    store.add({
      type: 'expense',
      amount: 100_000,
      categoryId: 'food',
      note: 'Phở',
      date: `${month}-05`,
    });
    const [tx] = store.transactions();
    store.update(tx.id, { ...tx, amount: 150_000 });
    expect(store.totalExpense()).toBe(150_000);
    store.remove(tx.id);
    expect(store.transactions()).toEqual([]);
  });
});
