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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
    NonNullableFormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import { categoriesOf, findCategory } from '../../../core/constants/categories';
import {
    Transaction,
    TransactionDraft,
    TransactionType,
} from '../../../core/models';
import { VndPipe } from '../../../shared/pipes';
import {
    AmountInput,
    SegmentOption,
    SegmentedControl,
} from '../../../shared/ui';

const MIN_AMOUNT = 1_000;
/** Tối đa 9 chữ số (999.999.999 ₫) — gõ, bấm phím số hay chip đều không vượt. */
const MAX_DIGITS = 9;
const MAX_AMOUNT = 10 ** MAX_DIGITS - 1;
/** Hàng phím số dưới ô số tiền, theo thứ tự bàn phím: 1 … 9 rồi 0. */
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
/** Chip "000", "0000": gắn thêm từng ấy số 0 vào cuối số đang nhập. */
const ZERO_KEYS = [3, 4];

@Component({
    selector: 'app-transaction-form',
    imports: [ReactiveFormsModule, SegmentedControl, AmountInput, VndPipe],
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
        amount: this.fb.control<number | null>(null, [
            Validators.required,
            Validators.min(MIN_AMOUNT),
            Validators.max(MAX_AMOUNT),
        ]),
        categoryId: this.fb.control(
            categoriesOf('expense')[0].id,
            Validators.required,
        ),
        date: this.fb.control('', Validators.required),
        note: this.fb.control('', Validators.maxLength(80)),
    });

    protected readonly typeOptions: SegmentOption<TransactionType>[] = [
        { value: 'expense', label: 'Khoản chi' },
        { value: 'income', label: 'Khoản thu' },
    ];
    protected readonly quickAmounts = [50_000, 100_000, 200_000];
    protected readonly digits = DIGITS;
    protected readonly zeroKeys = ZERO_KEYS;
    protected readonly minAmount = MIN_AMOUNT;
    protected readonly maxAmount = MAX_AMOUNT;
    protected readonly maxDigits = MAX_DIGITS;
    /** Đã bấm nút lưu với form chưa hợp lệ (từ lần làm mới form gần nhất). */
    protected readonly submitted = signal(false);

    private readonly type = toSignal(this.form.controls.type.valueChanges, {
        initialValue: this.form.controls.type.value,
    });
    protected readonly amount = toSignal(
        this.form.controls.amount.valueChanges,
        {
            initialValue: null,
        },
    );
    protected readonly selectedCategory = toSignal(
        this.form.controls.categoryId.valueChanges,
        {
            initialValue: this.form.controls.categoryId.value,
        },
    );
    protected readonly categories = computed(() => categoriesOf(this.type()));
    protected readonly notePlaceholder = computed(
        () => findCategory(this.selectedCategory()).noteHint,
    );
    protected readonly isEditing = computed(() => this.editing() !== null);

    constructor() {
        // Đổi loại thu/chi thì chọn lại danh mục phù hợp.
        this.form.controls.type.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe((type) => {
                if (
                    findCategory(this.form.controls.categoryId.value).type !==
                    type
                ) {
                    this.form.controls.categoryId.setValue(
                        categoriesOf(type)[0].id,
                    );
                }
            });

        // Nạp giao dịch cần sửa, hoặc làm mới form khi đổi tháng.
        effect(() => {
            const tx = this.editing();
            const date = this.defaultDate();
            untracked(() => {
                this.submitted.set(false);
                if (tx) {
                    const { type, amount, categoryId, date: txDate, note } = tx;
                    this.form.setValue({
                        type,
                        amount,
                        categoryId,
                        date: txDate,
                        note,
                    });
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
        const next = (control.value ?? 0) + value;
        if (next > MAX_AMOUNT) return;
        control.setValue(next);
    }

    /** Gắn chữ số vào cuối số đang nhập: 5 → bấm 0 → 50 → bấm 0 → 500. */
    protected appendDigit(digit: number): void {
        const control = this.form.controls.amount;
        const next = Number(`${control.value ?? ''}${digit}`);
        if (next > MAX_AMOUNT) return;
        control.setValue(next);
    }

    /**
     * Chip "000"/"0000": 5 → 5.000 / 50.000; 1,5 + "000" → 1.500. Ô trống
     * thì không làm gì; vượt 9 chữ số thì bỏ qua.
     */
    protected appendZeros(count: number): void {
        const control = this.form.controls.amount;
        if (!control.value) return;
        const next = Math.round(control.value * 10 ** count);
        if (next > MAX_AMOUNT) return;
        control.setValue(next);
    }

    /** Nút "Đặt lại": xóa trắng ô số tiền (các ô khác giữ nguyên). */
    protected resetAmount(): void {
        this.form.controls.amount.setValue(null);
    }

    /** Nút ⌫: 50.000 → 5.000; 1,5 → 1; còn một chữ số thì xóa trắng ô. */
    protected removeLastDigit(): void {
        const control = this.form.controls.amount;
        const rest = String(control.value ?? '')
            .slice(0, -1)
            .replace(/\.$/, '');
        control.setValue(rest ? Number(rest) : null);
    }

    protected submit(): void {
        if (this.form.invalid) {
            this.submitted.set(true);
            return;
        }
        const { type, amount, categoryId, date, note } =
            this.form.getRawValue();
        this.saved.emit({
            type,
            amount: amount!,
            categoryId,
            date,
            note: note.trim(),
        });
        if (!this.isEditing()) this.resetForm(date);
    }

    protected cancel(): void {
        this.cancelled.emit();
    }

    /**
     * Lỗi chỉ hiện sau khi đã bấm "Thêm giao dịch"/"Lưu thay đổi" mà form
     * chưa hợp lệ — không hiện khi đang gõ hay khi rời ô — và tự tắt ngay
     * khi sửa lại đúng (vì vẫn đọc `invalid` theo giá trị hiện tại).
     */
    protected showError(control: 'amount' | 'date' | 'note'): boolean {
        return this.submitted() && this.form.controls[control].invalid;
    }

    private resetForm(date: string): void {
        this.submitted.set(false);
        const type = this.form.controls.type.value;
        this.form.reset({
            type,
            amount: null,
            categoryId: categoriesOf(type)[0].id,
            date,
            note: '',
        });
    }
}
