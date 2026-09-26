import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { TransactionStore } from '../../core/state/transaction.store';
import { MonthPicker, YearPicker } from '../../shared/ui';

/** Khung của phân hệ Chi tiêu: thanh Tháng/Năm + bộ chọn kỳ, rồi tới trang con. */
@Component({
    selector: 'app-spending-layout',
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        MonthPicker,
        YearPicker,
    ],
    template: `
        <div class="toolbar">
            <nav class="tabs" aria-label="Chế độ xem">
                <a
                    class="tab"
                    routerLink="/"
                    routerLinkActive="tab--active"
                    ariaCurrentWhenActive="page"
                    [routerLinkActiveOptions]="{ exact: true }"
                    >Tháng</a
                >
                <a
                    class="tab"
                    routerLink="/nam"
                    routerLinkActive="tab--active"
                    ariaCurrentWhenActive="page"
                    #yearTab="routerLinkActive"
                    >Năm</a
                >
            </nav>

            @if (yearTab.isActive) {
                <app-year-picker
                    [year]="store.selectedYear()"
                    (yearChange)="store.setYear($event)"
                />
            } @else {
                <app-month-picker [(month)]="store.selectedMonth" />
            }
        </div>
        <router-outlet />
    `,
    styleUrl: './spending-layout.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpendingLayout {
    protected readonly store = inject(TransactionStore);
}
