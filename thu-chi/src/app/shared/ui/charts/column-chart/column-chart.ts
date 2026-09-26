import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    signal,
} from '@angular/core';

import {
    ChartGroup,
    ChartSeries,
    ValueFormatter,
    defaultFormatter,
    niceTicks,
} from '../chart.model';

/**
 * Biểu đồ cột dọc theo nhóm (vd. thu/chi theo tháng). Rê chuột hoặc
 * focus vào một nhóm để xem giá trị mọi chuỗi của nhóm đó.
 */
@Component({
    selector: 'app-column-chart',
    templateUrl: './column-chart.html',
    styleUrl: './column-chart.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnChart {
    readonly series = input.required<readonly ChartSeries[]>();
    readonly groups = input.required<readonly ChartGroup[]>();
    readonly formatValue = input<ValueFormatter>(defaultFormatter);
    readonly formatTick = input<ValueFormatter>(defaultFormatter);
    readonly ariaLabel = input('Biểu đồ cột');

    protected readonly ticks = computed(() =>
        niceTicks(Math.max(0, ...this.groups().flatMap((g) => g.values))),
    );
    protected readonly axisMax = computed(() => this.ticks().at(-1) || 1);

    protected readonly activeId = signal<string | null>(null);

    protected pct(value: number): number {
        return (value / this.axisMax()) * 100;
    }

    protected peak(group: ChartGroup): number {
        return this.pct(Math.max(0, ...group.values));
    }

    protected describe(group: ChartGroup): string {
        const parts = this.series().map(
            (s, i) => `${s.label} ${this.formatValue()(group.values[i])}`,
        );
        return [group.title, ...parts, group.detail].filter(Boolean).join(', ');
    }
}
