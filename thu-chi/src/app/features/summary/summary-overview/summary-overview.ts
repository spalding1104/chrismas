import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { StatCard } from '../../../shared/ui';

@Component({
  selector: 'app-summary-overview',
  imports: [StatCard],
  template: `
    <app-stat-card
      label="Tổng thu"
      icon="↓"
      tone="income"
      [amount]="income()"
      [hint]="incomeHint()"
    />
    <app-stat-card
      label="Tổng chi"
      icon="↑"
      tone="expense"
      [amount]="expense()"
      [hint]="expenseHint()"
    />
    <app-stat-card
      label="Còn lại"
      icon="＝"
      [tone]="balanceTone()"
      [amount]="balance()"
      [hint]="savingHint()"
    />
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryOverview {
  readonly income = input.required<number>();
  readonly expense = input.required<number>();
  readonly incomeCount = input(0);
  readonly expenseCount = input(0);

  protected readonly balance = computed(() => this.income() - this.expense());
  protected readonly balanceTone = computed(() => (this.balance() < 0 ? 'expense' : 'neutral'));

  protected readonly incomeHint = computed(() => `${this.incomeCount()} khoản thu`);
  protected readonly expenseHint = computed(() => `${this.expenseCount()} khoản chi`);
  protected readonly savingHint = computed(() => {
    const income = this.income();
    if (!income) return this.expense() ? 'Chưa có khoản thu nào' : 'Chưa có dữ liệu';
    const rate = Math.round((this.balance() / income) * 100);
    return rate >= 0 ? `Tiết kiệm được ${rate}% thu nhập` : `Chi vượt thu ${Math.abs(rate)}%`;
  });
}
