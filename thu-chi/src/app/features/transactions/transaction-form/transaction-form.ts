import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { categoriesOf, findCategory } from '../../../core/constants/categories';
import { Transaction, TransactionDraft, TransactionType } from '../../../core/models';
import { VndPipe } from '../../../shared/pipes';
import { SegmentOption, SegmentedControl } from '../../../shared/ui';

const MIN_AMOUNT = 1_000;

@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule, SegmentedControl, VndPipe],
  templateUrl: './transaction-form.html',
  styleUrl: './transaction-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionForm {
  /** Giao dịch đang sửa; `null` nghĩa là đang thêm mới. */
  readonly editing = input<Transaction | null>(null);
  /** Ngày điền sẵn khi thêm mới (yyyy-MM-dd). */
  readonly defaultDate = input.required<string>();

  readonly saved = output<TransactionDraft>();
  readonly cancelled = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    type: this.fb.control<TransactionType>('expense'),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(MIN_AMOUNT)]),
    categoryId: this.fb.control(categoriesOf('expense')[0].id, Validators.required),
    date: this.fb.control('', Validators.required),
    note: this.fb.control('', Validators.maxLength(80)),
  });

  protected readonly typeOptions: SegmentOption<TransactionType>[] = [
    { value: 'expense', label: 'Khoản chi' },
    { value: 'income', label: 'Khoản thu' },
  ];
  protected readonly quickAmounts = [50_000, 100_000, 200_000, 500_000];
  protected readonly minAmount = MIN_AMOUNT;

  private readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  protected readonly amount = toSignal(this.form.controls.amount.valueChanges, { initialValue: null });
  protected readonly selectedCategory = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  protected readonly categories = computed(() => categoriesOf(this.type()));
  protected readonly isEditing = computed(() => this.editing() !== null);

  constructor() {
    // Đổi loại thu/chi thì chọn lại danh mục phù hợp.
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      if (findCategory(this.form.controls.categoryId.value).type !== type) {
        this.form.controls.categoryId.setValue(categoriesOf(type)[0].id);
      }
    });

    // Nạp giao dịch cần sửa, hoặc làm mới form khi đổi tháng.
    effect(() => {
      const tx = this.editing();
      const date = this.defaultDate();
      untracked(() => {
        if (tx) {
          const { type, amount, categoryId, date: txDate, note } = tx;
          this.form.setValue({ type, amount, categoryId, date: txDate, note });
        } else {
          this.resetForm(date);
        }
      });
    });
  }

  protected selectCategory(id: string): void {
    this.form.controls.categoryId.setValue(id);
  }

  protected addAmount(value: number): void {
    const control = this.form.controls.amount;
    control.setValue((control.value ?? 0) + value);
    control.markAsTouched();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { type, amount, categoryId, date, note } = this.form.getRawValue();
    this.saved.emit({ type, amount: amount!, categoryId, date, note: note.trim() });
    if (!this.isEditing()) this.resetForm(date);
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected showError(control: 'amount' | 'date' | 'note'): boolean {
    const c = this.form.controls[control];
    return c.invalid && c.touched;
  }

  private resetForm(date: string): void {
    const type = this.form.controls.type.value;
    this.form.reset({ type, amount: null, categoryId: categoriesOf(type)[0].id, date, note: '' });
  }
}
