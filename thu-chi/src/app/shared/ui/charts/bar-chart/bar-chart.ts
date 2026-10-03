import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    TemplateRef,
    computed,
    input,
    output,
    signal,
} from '@angular/core';

import {
    ChartDatum,
    ValueFormatter,
    defaultFormatter,
    niceTicks,
} from '../chart.model';

/**
 * Biểu đồ cột ngang so sánh độ lớn. Mỗi hàng có nhãn và giá trị bằng chữ,
 * nên đọc được cả khi không phân biệt được màu.
 */
@Component({
    selector: 'app-bar-chart',
    imports: [NgTemplateOutlet],
    templateUrl: './bar-chart.html',
    styleUrl: './bar-chart.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChart {
    readonly data = input.required<readonly ChartDatum[]>();
    readonly formatValue = input<ValueFormatter>(defaultFormatter);
    readonly formatTick = input<ValueFormatter>(defaultFormatter);
    readonly ariaLabel = input('Biểu đồ cột');
    /** Hàng đang được chọn (bấm vào để xem chi tiết) — tô đậm nếu có. */
    readonly selectedId = input<string | null>(null);
    /** Bấm vào một hàng. Component cha quyết định bật/tắt lựa chọn. */
    readonly select = output<string>();
    /**
     * Nội dung đổ ra ngay dưới hàng đang chọn (vd. chi tiết giao dịch).
     * Component này không biết nội dung đó là gì — chỉ render template của
     * component cha, kèm context là `ChartDatum` của hàng đang chọn.
     */
    readonly detailTemplate = input<TemplateRef<{
        $implicit: ChartDatum;
    }> | null>(null);

    protected readonly total = computed(() =>
        this.data().reduce((s, d) => s + d.value, 0),
    );
    protected readonly ticks = computed(() =>
        niceTicks(Math.max(0, ...this.data().map((d) => d.value))),
    );
    protected readonly axisMax = computed(() => this.ticks().at(-1) || 1);

    protected readonly activeId = signal<string | null>(null);

    protected width(value: number): number {
        return (value / this.axisMax()) * 100;
    }

    protected share(value: number): string {
        const total = this.total();
        return total ? `${Math.round((value / total) * 100)}%` : '0%';
    }
}
