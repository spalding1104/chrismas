import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';

import { ThemeMode } from '../../../core/models';

const VIEW: Record<ThemeMode, { icon: string; label: string }> = {
    auto: { icon: '◐', label: 'Tự động' },
    light: { icon: '☀', label: 'Sáng' },
    dark: { icon: '☾', label: 'Tối' },
};

/** Nút xoay vòng chế độ giao diện: Tự động → Sáng → Tối. */
@Component({
    selector: 'app-theme-toggle',
    template: `
        <button
            type="button"
            class="toggle"
            [attr.aria-label]="'Giao diện: ' + view().label + '. Bấm để đổi.'"
            [title]="'Giao diện: ' + view().label"
            (click)="next.emit()"
        >
            <span class="toggle__icon" aria-hidden="true">{{
                view().icon
            }}</span>
            <span class="toggle__label">{{ view().label }}</span>
        </button>
    `,
    styleUrl: './theme-toggle.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
    readonly mode = input.required<ThemeMode>();
    readonly next = output<void>();

    protected readonly view = computed(() => VIEW[this.mode()]);
}
