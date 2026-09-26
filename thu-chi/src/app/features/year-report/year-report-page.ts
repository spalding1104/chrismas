import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { TransactionType } from '../../core/models';
import { TransactionStore } from '../../core/state/transaction.store';
import { formatMonth } from '../../core/utils/date.util';
import { VndPipe, formatVnd, formatVndCompact } from '../../shared/pipes';
import {
    Card,
    ChartGroup,
    ChartSeries,
    ColumnChart,
    EmptyState,
    SegmentOption,
    SegmentedControl,
} from '../../shared/ui';
import { CategoryChart, SummaryOverview } from '../summary';

/** Trang thống kê theo năm (container/smart component). */
@Component({
    selector: 'app-year-report-page',
    imports: [
        Card,
        CategoryChart,
        ColumnChart,
        EmptyState,
        SegmentedControl,
        SummaryOverview,
        VndPipe,
    ],
    templateUrl: './year-report-page.html',
    styleUrl: './year-report-page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearReportPage {
    protected readonly store = inject(TransactionStore);
    private readonly router = inject(Router);

    protected readonly formatValue = (v: number) => formatVnd(v);
    protected readonly formatTick = formatVndCompact;

    // Xanh dương/cam thay vì xanh lá/đỏ: cặp này phân biệt được với
    // người mù màu đỏ-lục, kể cả ở giao diện tối.
    protected readonly series: ChartSeries[] = [
        { id: 'income', label: 'Thu', color: 'var(--series-1)' },
        { id: 'expense', label: 'Chi', color: 'var(--series-2)' },
    ];

    protected readonly hasData = computed(
        () => this.store.yearTransactions().length > 0,
    );

    protected readonly incomeCount = computed(() => this.countOf('income'));
    protected readonly expenseCount = computed(() => this.countOf('expense'));

    protected readonly months = computed(() =>
        this.store.monthlyTotals().map((m) => ({
            ...m,
            label: `Tháng ${Number(m.month.slice(5))}`,
            balance: m.income - m.expense,
            empty: !m.income && !m.expense,
        })),
    );

    protected readonly groups = computed<ChartGroup[]>(() =>
        this.months().map((m) => ({
            id: m.month,
            label: `T${Number(m.month.slice(5))}`,
            title: formatMonth(m.month),
            values: [m.income, m.expense],
            detail: m.empty
                ? 'Chưa có giao dịch'
                : `Còn lại ${formatVnd(m.balance)}`,
        })),
    );

    protected readonly breakdownType = signal<TransactionType>('expense');
    protected readonly breakdownOptions: SegmentOption<TransactionType>[] = [
        { value: 'expense', label: 'Chi' },
        { value: 'income', label: 'Thu' },
    ];
    protected readonly breakdownItems = computed(() =>
        this.breakdownType() === 'expense'
            ? this.store.yearExpenseByCategory()
            : this.store.yearIncomeByCategory(),
    );
    protected readonly breakdownSubheading = computed(() =>
        this.breakdownType() === 'expense'
            ? `Tổng chi ${formatVnd(this.store.yearExpense())}`
            : `Tổng thu ${formatVnd(this.store.yearIncome())}`,
    );

    protected openMonth(month: string): void {
        this.store.selectedMonth.set(month);
        void this.router.navigateByUrl('/');
    }

    private countOf(type: TransactionType): number {
        return this.store.yearTransactions().filter((t) => t.type === type)
            .length;
    }
}
