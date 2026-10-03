import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';

import { Transaction } from '../../../core/models';
import { DayLabelPipe } from '../../../shared/pipes';
import { EmptyState } from '../../../shared/ui';
import { TransactionItem } from '../transaction-item/transaction-item';

interface DayGroup {
    date: string;
    items: Transaction[];
}

/** Danh sách giao dịch nhóm theo ngày. */
@Component({
    selector: 'app-transaction-list',
    imports: [TransactionItem, EmptyState, DayLabelPipe],
    templateUrl: './transaction-list.html',
    styleUrl: './transaction-list.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionList {
    /** Danh sách đã sắp xếp theo ngày giảm dần. */
    readonly transactions = input.required<Transaction[]>();
    readonly activeId = input<string | null>(null);
    readonly emptyMessage = input('Chưa có giao dịch nào trong tháng này.');

    readonly edit = output<Transaction>();
    readonly remove = output<Transaction>();

    protected readonly groups = computed<DayGroup[]>(() => {
        const byDate = new Map<string, DayGroup>();
        for (const t of this.transactions()) {
            const group = byDate.get(t.date) ?? { date: t.date, items: [] };
            group.items.push(t);
            byDate.set(t.date, group);
        }
        return [...byDate.values()];
    });
}
