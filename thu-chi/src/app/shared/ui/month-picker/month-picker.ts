import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';

import { formatMonth, shiftMonth, toMonthKey } from '../../../core/utils/date.util';

@Component({
  selector: 'app-month-picker',
  templateUrl: './month-picker.html',
  styleUrl: './month-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthPicker {
  /** Tháng đang chọn, định dạng yyyy-MM. */
  readonly month = model.required<string>();

  protected readonly label = computed(() => formatMonth(this.month()));
  protected readonly isCurrent = computed(() => this.month() === toMonthKey(new Date()));

  protected shift(delta: number): void {
    this.month.update((m) => shiftMonth(m, delta));
  }

  protected goToday(): void {
    this.month.set(toMonthKey(new Date()));
  }
}
