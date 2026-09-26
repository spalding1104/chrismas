import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    inject,
    input,
    signal,
} from '@angular/core';

import {
    ChartMarker,
    LineSeries,
    ValueFormatter,
    defaultFormatter,
    niceTicks,
} from '../chart.model';

const HEIGHT = 280;
const MARGIN = { top: 36, right: 104, bottom: 44, left: 64 };
/** Khoảng cách tối thiểu giữa hai nhãn cuối đường, px. */
const LABEL_GAP = 14;
/** Hai nhãn mốc gần hơn mức này (px) thì xếp so le hai hàng. */
const MARKER_LABEL_GAP = 90;

/** Giá trị của một đường tại x (nội suy tuyến tính giữa hai điểm). */
function valueAt(points: LineSeries['points'], x: number): number | null {
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!;
        const b = points[i]!;
        if (x >= a.x && x <= b.x) {
            return b.x === a.x
                ? b.y
                : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
        }
    }
    return null;
}

/**
 * Biểu đồ đường (SVG) có crosshair: rê chuột hoặc dùng phím ← → để xem
 * giá trị mọi đường tại một vị trí. Không phụ thuộc nghiệp vụ.
 */
@Component({
    selector: 'app-line-chart',
    templateUrl: './line-chart.html',
    styleUrl: './line-chart.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        tabindex: '0',
        role: 'group',
        '[attr.aria-label]': 'ariaLabel()',
        '(keydown.arrowleft)': 'step(-1, $event)',
        '(keydown.arrowright)': 'step(1, $event)',
        '(blur)': 'hoverX.set(null)',
    },
})
export class LineChart {
    readonly series = input.required<readonly LineSeries[]>();
    readonly markers = input<readonly ChartMarker[]>([]);
    readonly formatX = input<ValueFormatter>(defaultFormatter);
    readonly formatY = input<ValueFormatter>(defaultFormatter);
    readonly formatXTick = input<ValueFormatter>(defaultFormatter);
    readonly formatYTick = input<ValueFormatter>(defaultFormatter);
    readonly xLabel = input('');
    /** Làm tròn vị trí crosshair theo bước này (vd. 1 = số nguyên); 0 = không. */
    readonly xStep = input(0);
    /** Dòng phụ cuối tooltip tại x, vd. "Lãi 12tr". */
    readonly detail = input<(x: number) => string | null>(() => null);
    readonly ariaLabel = input('Biểu đồ đường');

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    protected readonly width = signal(0);
    protected readonly height = HEIGHT;
    protected readonly m = MARGIN;
    protected readonly hoverX = signal<number | null>(null);

    constructor() {
        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            const el = this.host.nativeElement;
            this.width.set(el.clientWidth);
            if (typeof ResizeObserver === 'undefined') return;
            const observer = new ResizeObserver(([entry]) =>
                this.width.set(entry!.contentRect.width),
            );
            observer.observe(el);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    protected readonly plotW = computed(() =>
        Math.max(0, this.width() - MARGIN.left - MARGIN.right),
    );
    protected readonly plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

    protected readonly xMax = computed(
        () =>
            Math.max(
                0,
                ...this.series().flatMap((s) => s.points.map((p) => p.x)),
            ) || 1,
    );
    protected readonly xTicks = computed(() =>
        niceTicks(this.xMax(), 5).filter((t) => t <= this.xMax() + 1e-9),
    );
    protected readonly yTicks = computed(() =>
        niceTicks(
            Math.max(
                0,
                ...this.series().flatMap((s) => s.points.map((p) => p.y)),
            ),
        ),
    );
    private readonly yMax = computed(() => this.yTicks().at(-1) || 1);

    protected sx(x: number): number {
        return MARGIN.left + (x / this.xMax()) * this.plotW();
    }

    protected sy(y: number): number {
        return MARGIN.top + this.plotH - (y / this.yMax()) * this.plotH;
    }

    protected readonly paths = computed(() =>
        this.series().map((s) => ({
            ...s,
            d: s.points
                .map(
                    (p, i) => `${i ? 'L' : 'M'}${this.sx(p.x)},${this.sy(p.y)}`,
                )
                .join(' '),
        })),
    );

    protected readonly markerLabels = computed(() => {
        const sorted = [...this.markers()]
            .map((mk) => ({ ...mk, px: this.sx(mk.x), row: 0 }))
            .sort((a, b) => a.px - b.px);
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]!;
            if (sorted[i]!.px - prev.px < MARKER_LABEL_GAP) {
                sorted[i]!.row = prev.row === 0 ? 1 : 0;
            }
        }
        return sorted.map((mk) => ({
            ...mk,
            y: MARGIN.top - 6 - mk.row * LABEL_GAP,
        }));
    });

    /** Nhãn tên ở cuối mỗi đường, đẩy ra xa nhau nếu chồng lên. */
    protected readonly endLabels = computed(() => {
        const labels = this.series()
            .filter((s) => s.points.length)
            .map((s) => {
                const last = s.points.at(-1)!;
                return { id: s.id, label: s.label, y: this.sy(last.y) };
            })
            .sort((a, b) => a.y - b.y);
        for (let i = 1; i < labels.length; i++) {
            const prev = labels[i - 1]!;
            if (labels[i]!.y - prev.y < LABEL_GAP)
                labels[i]!.y = prev.y + LABEL_GAP;
        }
        return labels;
    });

    protected readonly tooltip = computed(() => {
        const x = this.hoverX();
        if (x === null) return null;
        const px = this.sx(x);
        return {
            left: px,
            flip: px > this.width() - 200,
            title: this.formatX()(x),
            rows: this.series().map((s) => {
                const y = valueAt(s.points, x);
                return {
                    id: s.id,
                    label: s.label,
                    color: s.color,
                    value: y === null ? '—' : this.formatY()(y),
                    cy: y === null ? null : this.sy(y),
                };
            }),
            detail: this.detail()(x),
        };
    });

    protected onPointerMove(event: PointerEvent): void {
        const rect = (
            event.currentTarget as SVGElement
        ).getBoundingClientRect();
        const px = event.clientX - rect.left - MARGIN.left;
        const ratio = Math.min(1, Math.max(0, px / (this.plotW() || 1)));
        this.hoverX.set(this.snap(ratio * this.xMax()));
    }

    protected step(direction: 1 | -1, event: Event): void {
        event.preventDefault();
        const unit = this.xMax() / 40;
        const current =
            this.hoverX() ?? (direction > 0 ? -unit : this.xMax() + unit);
        this.hoverX.set(
            this.snap(
                Math.min(this.xMax(), Math.max(0, current + direction * unit)),
            ),
        );
    }

    private snap(x: number): number {
        const step = this.xStep();
        return step > 0 ? Math.round(x / step) * step : x;
    }
}
