import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Injector,
    afterNextRender,
    computed,
    inject,
    model,
    signal,
    viewChild,
} from '@angular/core';

import {
    formatMonth,
    shiftMonth,
    toMonthKey,
} from '../../../core/utils/date.util';

/**
 * Chọn tháng: nút ‹ › để lùi/tiến từng tháng, bấm vào nhãn để mở bảng
 * chọn nhanh 12 tháng theo năm.
 */
@Component({
    selector: 'app-month-picker',
    templateUrl: './month-picker.html',
    styleUrl: './month-picker.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:pointerdown)': 'onDocumentPointerDown($event)',
        '(keydown.escape)': 'close(true)',
    },
})
export class MonthPicker {
    /** Tháng đang chọn, định dạng yyyy-MM. */
    readonly month = model.required<string>();

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    private readonly trigger =
        viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

    protected readonly thisMonth = toMonthKey(new Date());
    protected readonly label = computed(() => formatMonth(this.month()));
    protected readonly isCurrent = computed(
        () => this.month() === this.thisMonth,
    );

    protected readonly open = signal(false);
    /** Năm đang hiển thị trong bảng chọn (có thể khác năm đang chọn). */
    protected readonly panelYear = signal(0);
    protected readonly months = computed(() =>
        Array.from({ length: 12 }, (_, i) => ({
            key: `${this.panelYear()}-${String(i + 1).padStart(2, '0')}`,
            label: `Tháng ${i + 1}`,
        })),
    );

    protected shift(delta: number): void {
        this.month.update((m) => shiftMonth(m, delta));
    }

    protected goToday(): void {
        this.month.set(this.thisMonth);
    }

    protected toggle(): void {
        if (this.open()) {
            this.close();
            return;
        }
        this.panelYear.set(Number(this.month().slice(0, 4)));
        this.open.set(true);
        afterNextRender(
            () =>
                this.host.nativeElement
                    .querySelector<HTMLElement>('.month--selected')
                    ?.focus(),
            { injector: this.injector },
        );
    }

    protected pick(key: string): void {
        this.month.set(key);
        this.close(true);
    }

    protected close(returnFocus = false): void {
        if (!this.open()) return;
        this.open.set(false);
        if (returnFocus) this.trigger().nativeElement.focus();
    }

    protected onDocumentPointerDown(event: PointerEvent): void {
        if (!this.host.nativeElement.contains(event.target as Node)) {
            this.close();
        }
    }
}
