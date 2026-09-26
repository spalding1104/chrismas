import { HttpClient } from '@angular/common/http';
import {
    Injectable,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { categoriesOf } from '../constants/categories';
import {
    CategoryTotal,
    MonthTotal,
    Transaction,
    TransactionDraft,
    TransactionType,
} from '../models';
import { monthOf, toMonthKey } from '../utils/date.util';

export const TRANSACTIONS_API = '/api/transactions';

/**
 * Nguồn dữ liệu duy nhất của ứng dụng (signal-based store), đồng bộ với
 * backend. Component chỉ đọc qua các signal chỉ-đọc và thay đổi qua các
 * phương thức public.
 */
@Injectable({ providedIn: 'root' })
export class TransactionStore {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthStore);

    private readonly _transactions = signal<Transaction[]>([]);
    private readonly _error = signal<string | null>(null);

    readonly transactions = this._transactions.asReadonly();
    readonly error = this._error.asReadonly();
    readonly isSample = computed(() =>
        this._transactions().some((t) => t.isSample),
    );
    readonly selectedMonth = signal(toMonthKey(new Date()));

    readonly monthTransactions = computed(() =>
        this._transactions()
            .filter((t) => monthOf(t.date) === this.selectedMonth())
            .sort((a, b) => b.date.localeCompare(a.date)),
    );

    readonly totalIncome = computed(() =>
        sumBy(this.monthTransactions(), 'income'),
    );
    readonly totalExpense = computed(() =>
        sumBy(this.monthTransactions(), 'expense'),
    );
    readonly balance = computed(() => this.totalIncome() - this.totalExpense());

    readonly incomeByCategory = computed(() =>
        groupBy(this.monthTransactions(), 'income'),
    );
    readonly expenseByCategory = computed(() =>
        groupBy(this.monthTransactions(), 'expense'),
    );

    /** Năm của tháng đang chọn; đổi năm sẽ giữ nguyên tháng trong năm. */
    readonly selectedYear = computed(() =>
        Number(this.selectedMonth().slice(0, 4)),
    );

    readonly yearTransactions = computed(() => {
        const prefix = `${this.selectedYear()}-`;
        return this._transactions().filter((t) => t.date.startsWith(prefix));
    });

    readonly yearIncome = computed(() =>
        sumBy(this.yearTransactions(), 'income'),
    );
    readonly yearExpense = computed(() =>
        sumBy(this.yearTransactions(), 'expense'),
    );

    readonly yearIncomeByCategory = computed(() =>
        groupBy(this.yearTransactions(), 'income'),
    );
    readonly yearExpenseByCategory = computed(() =>
        groupBy(this.yearTransactions(), 'expense'),
    );

    /** Đủ 12 tháng của năm đang chọn, kể cả tháng chưa có giao dịch. */
    readonly monthlyTotals = computed<MonthTotal[]>(() => {
        const year = this.selectedYear();
        const totals = Array.from({ length: 12 }, (_, i) => ({
            month: `${year}-${String(i + 1).padStart(2, '0')}`,
            income: 0,
            expense: 0,
        }));
        for (const t of this.yearTransactions()) {
            totals[Number(t.date.slice(5, 7)) - 1][t.type] += t.amount;
        }
        return totals;
    });

    constructor() {
        // Đổi tài khoản: bỏ dữ liệu cũ ngay rồi mới tải của người mới, để
        // không bao giờ hiện giao dịch của người trước.
        effect(() => {
            const user = this.auth.user();
            untracked(() => {
                this._transactions.set([]);
                this._error.set(null);
                if (user) void this.load();
            });
        });
    }

    setYear(year: number): void {
        this.selectedMonth.update((m) => `${year}${m.slice(4)}`);
    }

    load(): Promise<void> {
        const user = this.auth.user();
        return this.run('Không tải được dữ liệu', async () => {
            const list = await firstValueFrom(
                this.http.get<Transaction[]>(TRANSACTIONS_API),
            );
            // Bỏ kết quả về muộn nếu trong lúc chờ đã đổi tài khoản.
            if (this.auth.user() === user) this._transactions.set(list);
        });
    }

    add(draft: TransactionDraft): Promise<void> {
        return this.run('Không lưu được giao dịch', async () => {
            const created = await firstValueFrom(
                this.http.post<Transaction>(TRANSACTIONS_API, draft),
            );
            this._transactions.update((list) => [...list, created]);
        });
    }

    update(id: string, draft: TransactionDraft): Promise<void> {
        return this.run('Không cập nhật được giao dịch', async () => {
            const saved = await firstValueFrom(
                this.http.put<Transaction>(`${TRANSACTIONS_API}/${id}`, draft),
            );
            this._transactions.update((list) =>
                list.map((t) => (t.id === id ? saved : t)),
            );
        });
    }

    remove(id: string): Promise<void> {
        return this.run('Không xóa được giao dịch', async () => {
            await firstValueFrom(
                this.http.delete<void>(`${TRANSACTIONS_API}/${id}`),
            );
            this._transactions.update((list) =>
                list.filter((t) => t.id !== id),
            );
        });
    }

    /** Xóa dữ liệu mẫu để bắt đầu ghi chép thật. */
    clearSample(): Promise<void> {
        return this.run('Không xóa được dữ liệu mẫu', async () => {
            await firstValueFrom(
                this.http.delete<void>(`${TRANSACTIONS_API}/sample`),
            );
            this._transactions.update((list) =>
                list.filter((t) => !t.isSample),
            );
        });
    }

    private async run(
        errorMessage: string,
        action: () => Promise<void>,
    ): Promise<void> {
        try {
            await action();
            this._error.set(null);
        } catch {
            this._error.set(errorMessage);
        }
    }
}

function sumBy(list: Transaction[], type: TransactionType): number {
    return list
        .filter((t) => t.type === type)
        .reduce((sum, t) => sum + t.amount, 0);
}

function groupBy(list: Transaction[], type: TransactionType): CategoryTotal[] {
    const grand = sumBy(list, type);
    return categoriesOf(type)
        .map((category) => {
            const items = list.filter(
                (t) => t.type === type && t.categoryId === category.id,
            );
            const total = items.reduce((sum, t) => sum + t.amount, 0);
            return {
                category,
                total,
                count: items.length,
                percent: grand ? (total / grand) * 100 : 0,
            };
        })
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total);
}
