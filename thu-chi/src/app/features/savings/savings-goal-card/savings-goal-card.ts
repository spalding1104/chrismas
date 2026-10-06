import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';
import {
    NonNullableFormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import { SavingsGoal } from '../../../core/models';
import { monthBudget } from '../../../core/utils/budget.util';
import { formatMonth } from '../../../core/utils/date.util';
import { VndPipe, formatVnd } from '../../../shared/pipes';
import { AmountInput, ProgressBar } from '../../../shared/ui';

const MIN_AMOUNT = 1_000;
const MAX_DIGITS = 9;
const MAX_AMOUNT = 10 ** MAX_DIGITS - 1;
/** Gợi ý mục tiêu theo % thu nhập tháng (quy tắc 50/30/20 → 20%). */
const SUGGESTED_RATES = [10, 20, 30];

interface Status {
    tone: 'ok' | 'warn';
    text: string;
}

/**
 * Mục tiêu tiết kiệm của tháng đang xem và hạn mức còn được tiêu:
 * được tiêu = tổng thu − mục tiêu, còn lại = được tiêu − tổng chi.
 * Presentational: component cha truyền mục tiêu đang áp dụng (goalFor) và
 * tổng thu/chi của tháng, nhận lại số tiền mới qua `save` (0 = bỏ mục tiêu).
 */
@Component({
    selector: 'app-savings-goal-card',
    imports: [ReactiveFormsModule, AmountInput, ProgressBar, VndPipe],
    templateUrl: './savings-goal-card.html',
    styleUrl: './savings-goal-card.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavingsGoalCard {
    /** Mục tiêu đang áp dụng cho `month`; `null` = chưa đặt. */
    readonly goal = input.required<SavingsGoal | null>();
    /** Tháng đang xem, yyyy-MM. */
    readonly month = input.required<string>();
    readonly income = input.required<number>();
    /** Tổng chi của tháng, gồm cả các khoản cố định. */
    readonly expense = input.required<number>();
    /** Phần chi cố định trong `expense` — trừ thẳng vào hạn mức. */
    readonly fixedExpense = input(0);
    readonly error = input<string | null>(null);
    /** Hôm nay — để test cố định được ngày. */
    readonly today = input<Date>(new Date());

    readonly save = output<number>();

    private readonly fb = inject(NonNullableFormBuilder);

    protected readonly form = this.fb.group({
        amount: this.fb.control<number | null>(null, [
            Validators.required,
            Validators.min(MIN_AMOUNT),
            Validators.max(MAX_AMOUNT),
        ]),
    });
    protected readonly minAmount = MIN_AMOUNT;
    protected readonly maxAmount = MAX_AMOUNT;
    protected readonly maxDigits = MAX_DIGITS;

    protected readonly editing = signal(false);
    /** Lỗi chỉ hiện sau khi bấm Lưu (giống các form khác). */
    protected readonly submitted = signal(false);

    protected readonly monthLabel = computed(() => formatMonth(this.month()));
    protected readonly sinceLabel = computed(() => {
        const goal = this.goal();
        return goal ? formatMonth(goal.month) : '';
    });

    protected readonly budget = computed(() => {
        const goal = this.goal();
        return goal
            ? monthBudget(
                  {
                      month: this.month(),
                      income: this.income(),
                      expense: this.expense(),
                      fixedExpense: this.fixedExpense(),
                      goal: goal.amount,
                  },
                  this.today(),
              )
            : null;
    });

    protected readonly usedLabel = computed(() => {
        const percent = this.budget()?.usedPercent;
        return percent == null ? '' : `${Math.round(percent)}%`;
    });

    /** Làm tròn tới 10.000đ cho dễ nhớ. */
    protected readonly suggestions = computed(() => {
        const income = this.income();
        if (income <= 0) return [];
        return SUGGESTED_RATES.map((rate) => ({
            rate,
            amount: Math.round((income * rate) / 100 / 10_000) * 10_000,
        })).filter((s) => s.amount >= MIN_AMOUNT && s.amount <= MAX_AMOUNT);
    });

    protected readonly status = computed<Status | null>(() => {
        const b = this.budget();
        if (!b) return null;
        if (b.income <= 0) {
            return {
                tone: 'warn',
                text:
                    'Tháng này chưa có khoản thu nào. Thêm thu nhập (hoặc ' +
                    'lương vào Khoản cố định) để tính hạn mức chi tiêu.',
            };
        }
        if (b.limit <= 0) {
            const fixed = b.fixed
                ? `, trả ${formatVnd(b.fixed)} khoản cố định`
                : '';
            return {
                tone: 'warn',
                text:
                    `Thu nhập tháng này mới ${formatVnd(b.income)}, chưa đủ ` +
                    `để vừa tiết kiệm ${formatVnd(b.goal)}${fixed} vừa chi ` +
                    'tiêu.',
            };
        }
        if (b.remaining < 0) {
            const saved = Math.max(b.saved, 0);
            return {
                tone: 'warn',
                text:
                    `Đã tiêu lố ${formatVnd(-b.remaining)}: tháng này chỉ ` +
                    `tiết kiệm được ${formatVnd(saved)}, thiếu ` +
                    `${formatVnd(b.goal - saved)} so với mục tiêu.`,
            };
        }
        if (b.daysLeft === 0) {
            return {
                tone: 'ok',
                text: `Đạt mục tiêu: tháng này tiết kiệm được ${formatVnd(b.saved)}.`,
            };
        }
        return {
            tone: 'ok',
            text:
                'Đúng kế hoạch — tiêu trong hạn mức thì cuối tháng bạn ' +
                `tiết kiệm được ít nhất ${formatVnd(b.goal)}.`,
        };
    });

    constructor() {
        // Đổi tháng thì đóng form đang mở: mục tiêu sẽ áp dụng từ tháng khác.
        effect(() => {
            this.month();
            untracked(() => this.cancel());
        });
    }

    protected startEdit(): void {
        this.form.setValue({ amount: this.goal()?.amount ?? null });
        this.submitted.set(false);
        this.editing.set(true);
    }

    protected cancel(): void {
        this.editing.set(false);
        this.submitted.set(false);
    }

    protected useSuggestion(amount: number): void {
        this.form.controls.amount.setValue(amount);
    }

    protected showError(): boolean {
        return this.submitted() && this.form.controls.amount.invalid;
    }

    protected submit(): void {
        if (this.form.invalid) {
            this.submitted.set(true);
            return;
        }
        this.save.emit(this.form.controls.amount.value!);
        this.editing.set(false);
    }

    protected clearGoal(): void {
        this.save.emit(0);
        this.editing.set(false);
    }
}
