import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';

import {
    Transaction,
    TransactionDraft,
    TransactionType,
} from '../../core/models';
import { RecurringStore } from '../../core/state/recurring.store';
import { SavingsStore } from '../../core/state/savings.store';
import { TransactionStore } from '../../core/state/transaction.store';
import { goalFor } from '../../core/utils/budget.util';
import { defaultDateFor } from '../../core/utils/date.util';
import { formatVnd } from '../../shared/pipes';
import { Card, SegmentOption, SegmentedControl } from '../../shared/ui';
import { RecurringCard } from '../recurring';
import { SavingsGoalCard } from '../savings';
import { CategoryChart, SummaryOverview } from '../summary';
import { TransactionForm, TransactionList } from '../transactions';

type ListFilter = 'all' | TransactionType;

/**
 * Trang chính (container/smart component): lấy dữ liệu từ store và
 * nối các component trình bày (presentational) lại với nhau.
 */
@Component({
    selector: 'app-dashboard-page',
    imports: [
        Card,
        SegmentedControl,
        SummaryOverview,
        CategoryChart,
        TransactionForm,
        TransactionList,
        RecurringCard,
        SavingsGoalCard,
    ],
    templateUrl: './dashboard-page.html',
    styleUrl: './dashboard-page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
    protected readonly store = inject(TransactionStore);
    protected readonly recurring = inject(RecurringStore);
    protected readonly savings = inject(SavingsStore);

    protected readonly editing = signal<Transaction | null>(null);
    protected readonly listFilter = signal<ListFilter>('all');
    protected readonly breakdownType = signal<TransactionType>('expense');

    protected readonly listFilterOptions: SegmentOption<ListFilter>[] = [
        { value: 'all', label: 'Tất cả' },
        { value: 'income', label: 'Thu' },
        { value: 'expense', label: 'Chi' },
    ];
    protected readonly breakdownOptions: SegmentOption<TransactionType>[] = [
        { value: 'expense', label: 'Chi' },
        { value: 'income', label: 'Thu' },
    ];

    protected readonly defaultDate = computed(() =>
        defaultDateFor(this.store.selectedMonth()),
    );

    protected readonly savingsGoal = computed(() =>
        goalFor(this.savings.goals(), this.store.selectedMonth()),
    );

    /** Chi cố định của tháng (giao dịch ảo từ RecurringStore). */
    protected readonly fixedExpense = computed(() =>
        this.store
            .monthTransactions()
            .filter((t) => t.recurringId && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0),
    );

    protected readonly incomeCount = computed(() => this.countOf('income'));
    protected readonly expenseCount = computed(() => this.countOf('expense'));

    protected readonly visibleTransactions = computed(() => {
        const filter = this.listFilter();
        const list = this.store.monthTransactions();
        return filter === 'all' ? list : list.filter((t) => t.type === filter);
    });

    protected readonly breakdownItems = computed(() =>
        this.breakdownType() === 'expense'
            ? this.store.expenseByCategory()
            : this.store.incomeByCategory(),
    );
    protected readonly breakdownSubheading = computed(() =>
        this.breakdownType() === 'expense'
            ? `Tổng chi ${formatVnd(this.store.totalExpense())}`
            : `Tổng thu ${formatVnd(this.store.totalIncome())}`,
    );

    protected onSave(draft: TransactionDraft): void {
        const current = this.editing();
        if (current) {
            this.store.update(current.id, draft);
            this.editing.set(null);
        } else {
            this.store.add(draft);
        }
    }

    protected onRemove(tx: Transaction): void {
        this.store.remove(tx.id);
        if (this.editing()?.id === tx.id) this.editing.set(null);
    }

    private countOf(type: TransactionType): number {
        return this.store.monthTransactions().filter((t) => t.type === type)
            .length;
    }
}
