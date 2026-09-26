import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { categoriesOf } from '../constants/categories';
import { CategoryTotal, Transaction, TransactionDraft, TransactionType } from '../models';
import { LocalStorageService } from '../services/local-storage.service';
import { monthOf, toMonthKey } from '../utils/date.util';
import { buildSampleData } from './sample-data';

const STORAGE_KEY = 'thu-chi.transactions';
const SAMPLE_KEY = 'thu-chi.is-sample';

/**
 * Nguồn dữ liệu duy nhất của ứng dụng (signal-based store).
 * Component chỉ đọc qua các signal chỉ-đọc và thay đổi qua các phương thức public.
 */
@Injectable({ providedIn: 'root' })
export class TransactionStore {
  private readonly storage = inject(LocalStorageService);

  private readonly _transactions = signal<Transaction[]>([]);
  private readonly _isSample = signal(false);

  readonly transactions = this._transactions.asReadonly();
  readonly isSample = this._isSample.asReadonly();
  readonly selectedMonth = signal(toMonthKey(new Date()));

  readonly monthTransactions = computed(() =>
    this._transactions()
      .filter((t) => monthOf(t.date) === this.selectedMonth())
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  readonly totalIncome = computed(() => this.sumBy('income'));
  readonly totalExpense = computed(() => this.sumBy('expense'));
  readonly balance = computed(() => this.totalIncome() - this.totalExpense());

  readonly incomeByCategory = computed(() => this.groupBy('income'));
  readonly expenseByCategory = computed(() => this.groupBy('expense'));

  constructor() {
    this.hydrate();
    effect(() => {
      this.storage.set(STORAGE_KEY, this._transactions());
      this.storage.set(SAMPLE_KEY, this._isSample());
    });
  }

  add(draft: TransactionDraft): void {
    this._transactions.update((list) => [...list, { ...draft, id: crypto.randomUUID() }]);
  }

  update(id: string, draft: TransactionDraft): void {
    this._transactions.update((list) => list.map((t) => (t.id === id ? { ...draft, id } : t)));
  }

  remove(id: string): void {
    this._transactions.update((list) => list.filter((t) => t.id !== id));
  }

  /** Xóa dữ liệu mẫu để bắt đầu ghi chép thật. */
  clearSample(): void {
    this._transactions.set([]);
    this._isSample.set(false);
  }

  private hydrate(): void {
    const saved = this.storage.get<Transaction[] | null>(STORAGE_KEY, null);
    if (saved) {
      this._transactions.set(saved);
      this._isSample.set(this.storage.get(SAMPLE_KEY, false));
      return;
    }
    buildSampleData(this.selectedMonth()).forEach((draft) => this.add(draft));
    this._isSample.set(true);
  }

  private sumBy(type: TransactionType): number {
    return this.monthTransactions()
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private groupBy(type: TransactionType): CategoryTotal[] {
    const grand = this.sumBy(type);
    return categoriesOf(type)
      .map((category) => {
        const total = this.monthTransactions()
          .filter((t) => t.categoryId === category.id)
          .reduce((sum, t) => sum + t.amount, 0);
        return { category, total, percent: grand ? (total / grand) * 100 : 0 };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }
}
