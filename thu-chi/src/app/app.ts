import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TransactionStore } from './core/state/transaction.store';
import { DashboardPage } from './features/dashboard/dashboard-page';
import { MonthPicker } from './shared/ui';

@Component({
  selector: 'app-root',
  imports: [DashboardPage, MonthPicker],
  template: `
    <header class="topbar">
      <div class="topbar__inner">
        <div class="brand">
          <span class="brand__mark" aria-hidden="true">₫</span>
          <div>
            <h1 class="brand__name">Sổ Thu Chi</h1>
            <p class="brand__tag">Quản lý tiền vào, tiền ra mỗi tháng</p>
          </div>
        </div>
        <app-month-picker [(month)]="store.selectedMonth" />
      </div>
    </header>
    <main class="page">
      <app-dashboard-page />
    </main>
  `,
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly store = inject(TransactionStore);
}
