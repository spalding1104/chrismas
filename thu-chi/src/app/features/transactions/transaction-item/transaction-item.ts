import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { findCategory } from '../../../core/constants/categories';
import { Transaction } from '../../../core/models';
import { VndPipe } from '../../../shared/pipes';

const CONFIRM_TIMEOUT_MS = 3000;

@Component({
  selector: 'app-transaction-item',
  imports: [VndPipe],
  templateUrl: './transaction-item.html',
  styleUrl: './transaction-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-active]': 'active()' },
})
export class TransactionItem {
  readonly transaction = input.required<Transaction>();
  readonly active = input(false);

  readonly edit = output<Transaction>();
  readonly remove = output<Transaction>();

  protected readonly category = computed(() => findCategory(this.transaction().categoryId));
  protected readonly signedAmount = computed(() => {
    const t = this.transaction();
    return t.type === 'income' ? t.amount : -t.amount;
  });

  /** Xóa cần bấm 2 lần để tránh bấm nhầm. */
  protected readonly confirming = signal(false);
  private confirmTimer?: ReturnType<typeof setTimeout>;

  protected onRemove(): void {
    if (this.confirming()) {
      clearTimeout(this.confirmTimer);
      this.remove.emit(this.transaction());
      return;
    }
    this.confirming.set(true);
    this.confirmTimer = setTimeout(() => this.confirming.set(false), CONFIRM_TIMEOUT_MS);
  }
}
