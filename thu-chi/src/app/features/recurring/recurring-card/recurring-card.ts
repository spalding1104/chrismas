import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
    signal,
} from '@angular/core';

import { findCategory } from '../../../core/constants/categories';
import {
    RecurringDraft,
    RecurringItem,
    TransactionType,
} from '../../../core/models';
import { formatMonth } from '../../../core/utils/date.util';
import { isActiveIn } from '../../../core/utils/recurring.util';
import { VndPipe } from '../../../shared/pipes';
import { RecurringForm } from '../recurring-form/recurring-form';

interface Group {
    type: TransactionType;
    title: string;
    items: RecurringItem[];
    total: number;
}

/**
 * Danh sách khoản thu/chi cố định áp dụng cho tháng đang xem, kèm thêm/sửa/
 * xóa ngay trong card. Presentational: dữ liệu vào qua input, thao tác ra
 * qua output; component cha quyết định "từ tháng nào" (tháng đang xem).
 */
@Component({
    selector: 'app-recurring-card',
    imports: [RecurringForm, VndPipe],
    templateUrl: './recurring-card.html',
    styleUrl: './recurring-card.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringCard {
    /** Mọi khoản cố định của tài khoản (card tự lọc theo tháng). */
    readonly items = input.required<readonly RecurringItem[]>();
    /** Tháng đang xem, yyyy-MM. */
    readonly month = input.required<string>();
    readonly error = input<string | null>(null);

    readonly create = output<RecurringDraft>();
    readonly update = output<{ id: string; draft: RecurringDraft }>();
    readonly remove = output<string>();

    protected readonly findCategory = findCategory;

    /** `'new'` = đang thêm, id = đang sửa khoản đó, `null` = chỉ xem. */
    protected readonly editing = signal<string | null>(null);
    /** Khoản đang chờ bấm "Xóa" lần hai để chắc chắn. */
    protected readonly confirmingId = signal<string | null>(null);

    protected readonly monthLabel = computed(() => formatMonth(this.month()));

    protected readonly groups = computed<Group[]>(() => {
        const active = this.items().filter((i) => isActiveIn(i, this.month()));
        return (
            [
                ['expense', 'Chi cố định'],
                ['income', 'Thu cố định'],
            ] as const
        )
            .map(([type, title]) => {
                const items = active
                    .filter((i) => i.type === type)
                    .sort((a, b) => a.day - b.day);
                return {
                    type,
                    title,
                    items,
                    total: items.reduce((s, i) => s + i.amount, 0),
                };
            })
            .filter((g) => g.items.length);
    });

    protected readonly editingItem = computed(
        () => this.items().find((i) => i.id === this.editing()) ?? null,
    );

    protected startAdd(): void {
        this.confirmingId.set(null);
        this.editing.set('new');
    }

    protected startEdit(id: string): void {
        this.confirmingId.set(null);
        this.editing.set(id);
    }

    protected onSaved(draft: RecurringDraft): void {
        const id = this.editing();
        if (id === 'new') this.create.emit(draft);
        else if (id) this.update.emit({ id, draft });
        this.editing.set(null);
    }

    /** Xóa cần bấm 2 lần để tránh bấm nhầm. */
    protected onRemove(id: string): void {
        if (this.confirmingId() === id) {
            this.confirmingId.set(null);
            this.remove.emit(id);
        } else {
            this.confirmingId.set(id);
        }
    }
}
