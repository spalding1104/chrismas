import {
    ChangeDetectionStrategy,
    Component,
    computed,
    model,
} from '@angular/core';

@Component({
    selector: 'app-year-picker',
    template: `
        <button
            type="button"
            class="nav"
            (click)="year.set(year() - 1)"
            aria-label="Năm trước"
        >
            ‹
        </button>
        <span class="label label--box" aria-live="polite"
            >Năm {{ year() }}</span
        >
        <button
            type="button"
            class="nav"
            (click)="year.set(year() + 1)"
            aria-label="Năm sau"
        >
            ›
        </button>
        @if (!isCurrent()) {
            <button type="button" class="today" (click)="year.set(thisYear)">
                Năm nay
            </button>
        }
    `,
    styleUrl: '../month-picker/month-picker.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearPicker {
    readonly year = model.required<number>();

    protected readonly thisYear = new Date().getFullYear();
    protected readonly isCurrent = computed(
        () => this.year() === this.thisYear,
    );
}
