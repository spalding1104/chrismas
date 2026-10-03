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
    RecurringDraft,
    RecurringItem,
    TransactionType,
} from '../../../core/models';
import { VndPipe } from '../../../shared/pipes';
import {
    AmountInput,
    SegmentOption,
    SegmentedControl,
} from '../../../shared/ui';

const MIN_AMOUNT = 1_000;
const MAX_DIGITS = 9;
const MAX_AMOUNT = 10 ** MAX_DIGITS - 1;

/** Form thêm/sửa một khoản cố định (nằm gọn trong card Khoản cố định). */
@Component({
    selector: 'app-recurring-form',
    imports: [ReactiveFormsModule, SegmentedControl, AmountInput, VndPipe],
    templateUrl: './recurring-form.html',
    styleUrl: './recurring-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringForm {
    /** Khoản đang sửa; `null` = thêm mới. */
    readonly item = input<RecurringItem | null>(null);

    readonly saved = output<RecurringDraft>();
    readonly cancelled = output<void>();

    private readonly fb = inject(NonNullableFormBuilder);

    protected readonly form = this.fb.group({
        type: this.fb.control<TransactionType>('expense'),
        note: this.fb.control('', Validators.maxLength(80)),
        amount: this.fb.control<number | null>(null, [
            Validators.required,
            Validators.min(MIN_AMOUNT),
            Validators.max(MAX_AMOUNT),
        ]),
        day: this.fb.control(new Date().getDate()),
        categoryId: this.fb.control(categoriesOf('expense')[0].id),
    });

    protected readonly typeOptions: SegmentOption<TransactionType>[] = [
        { value: 'expense', label: 'Khoản chi' },
        { value: 'income', label: 'Khoản thu' },
    ];
    protected readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
    protected readonly minAmount = MIN_AMOUNT;
    protected readonly maxAmount = MAX_AMOUNT;
    protected readonly maxDigits = MAX_DIGITS;
    /** Lỗi chỉ hiện sau khi bấm Lưu (giống form giao dịch). */
    protected readonly submitted = signal(false);

    private readonly type = toSignal(this.form.controls.type.valueChanges, {
        initialValue: this.form.controls.type.value,
    });
    protected readonly categories = computed(() => categoriesOf(this.type()));
    protected readonly notePlaceholder = computed(() =>
        this.type() === 'income'
            ? 'VD: Lương, tiền cho thuê nhà'
            : 'VD: Spotify, cước điện thoại',
    );

    constructor() {
        // Đổi Thu/Chi thì chọn lại danh mục đúng loại.
        this.form.controls.type.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe((type) => {
                const current = this.form.controls.categoryId.value;
                if (findCategory(current).type !== type) {
                    this.form.controls.categoryId.setValue(
                        categoriesOf(type)[0].id,
                    );
                }
            });

        effect(() => {
            const item = this.item();
            untracked(() => {
                if (!item) return;
                const { type, note, amount, day, categoryId } = item;
                this.form.setValue({ type, note, amount, day, categoryId });
            });
        });
    }

    protected showError(control: 'amount'): boolean {
        return this.submitted() && this.form.controls[control].invalid;
    }

    protected submit(): void {
        if (this.form.invalid) {
            this.submitted.set(true);
            return;
        }
        const { type, note, amount, day, categoryId } = this.form.getRawValue();
        this.saved.emit({
            type,
            note: note.trim(),
            amount: amount!,
            day: Number(day),
            categoryId,
        });
    }
}
