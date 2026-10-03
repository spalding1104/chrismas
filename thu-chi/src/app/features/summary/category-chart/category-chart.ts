import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    signal,
} from '@angular/core';

import { CATEGORIES } from '../../../core/constants/categories';
import { CategoryTotal, Transaction } from '../../../core/models';
import {
    DayLabelPipe,
    VndPipe,
    formatVnd,
    formatVndCompact,
} from '../../../shared/pipes';
import {
    BarChart,
    ChartDatum,
    EmptyState,
    StackedBar,
} from '../../../shared/ui';

/**
 * Biểu đồ danh mục: thanh cơ cấu 100% + biểu đồ cột ngang xếp theo số tiền.
 * Bấm vào một danh mục trong biểu đồ cột để xem các giao dịch thuộc danh
 * mục đó ngay bên dưới (cần truyền `transactions` thì mới có gì để lọc).
 */
@Component({
    selector: 'app-category-chart',
    imports: [StackedBar, BarChart, EmptyState, DayLabelPipe, VndPipe],
    templateUrl: './category-chart.html',
    styleUrl: './category-chart.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryChart {
    /** Tổng theo danh mục (đã sắp giảm dần). */
    readonly items = input.required<CategoryTotal[]>();
    readonly emptyMessage = input('Chưa có dữ liệu cho tháng này.');
    /**
     * Toàn bộ giao dịch của cùng kỳ (tháng/năm) đang hiển thị, để lọc ra chi
     * tiết khi bấm vào một danh mục. Bỏ trống thì không bấm chọn được.
     * Mã danh mục thu/chi không trùng nhau nên chỉ cần lọc theo categoryId,
     * không cần lọc thêm theo loại thu/chi.
     */
    readonly transactions = input<readonly Transaction[]>([]);

    protected readonly formatValue = (v: number) => formatVnd(v);
    protected readonly formatTick = formatVndCompact;

    /** Xếp hạng theo số tiền để so sánh. */
    protected readonly ranked = computed<ChartDatum[]>(() =>
        this.items().map(toDatum),
    );

    /**
     * Thanh cơ cấu giữ thứ tự danh mục cố định, để màu kề nhau luôn là
     * cặp đã kiểm tra.
     */
    protected readonly composition = computed<ChartDatum[]>(() =>
        [...this.items()]
            .sort(
                (a, b) =>
                    CATEGORIES.indexOf(a.category) -
                    CATEGORIES.indexOf(b.category),
            )
            .map(toDatum),
    );

    /** Danh mục đang xem chi tiết; `null` nghĩa là chưa chọn gì. */
    protected readonly selectedId = signal<string | null>(null);
    protected readonly detailItems = computed(() => {
        const id = this.selectedId();
        return id ? this.transactions().filter((t) => t.categoryId === id) : [];
    });

    constructor() {
        // Đổi tháng/năm hoặc chuyển tab Thu/Chi thì items() đổi theo — bỏ
        // chọn để không còn tô đậm/hiện chi tiết một danh mục đã biến mất
        // khỏi biểu đồ.
        effect(() => {
            this.items();
            this.selectedId.set(null);
        });
    }

    protected toggleSelection(id: string): void {
        this.selectedId.update((cur) => (cur === id ? null : id));
    }
}

function toDatum({ category, total, count }: CategoryTotal): ChartDatum {
    return {
        id: category.id,
        label: category.name,
        icon: category.icon,
        color: category.color,
        value: total,
        detail: `${count} giao dịch`,
    };
}
