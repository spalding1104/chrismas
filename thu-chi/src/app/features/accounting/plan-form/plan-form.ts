import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    FormArray,
    FormControl,
    FormGroup,
    NonNullableFormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import {
    CostBehavior,
    CostItem,
    summarizeCosts,
} from '../../../core/accounting/cvp';
import { CvpPlanInput } from '../../../core/models';
import { VndPipe } from '../../../shared/pipes';
import { InfoTip } from '../../../shared/ui';
import { FIELD_HELP } from '../field-help';

type CostItemGroup = FormGroup<{
    id: FormControl<string>;
    name: FormControl<string>;
    behavior: FormControl<CostBehavior>;
    amount: FormControl<number>;
}>;

type Field =
    'name' | 'unitLabel' | 'unitPrice' | 'volume' | 'taxRate' | 'targetProfit';

/** Ô số để trống cho giá trị null; coi như 0 khi tính. */
const num = (value: number | null | undefined): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

/**
 * Form nhập một phương án CVP. Phát `draftChange` mỗi lần sửa để trang
 * tính kết quả ngay (chưa cần lưu), `save` khi bấm Lưu.
 */
@Component({
    selector: 'app-plan-form',
    imports: [ReactiveFormsModule, VndPipe, InfoTip],
    templateUrl: './plan-form.html',
    styleUrl: './plan-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanForm {
    /** Phương án đang chọn; đổi phương án thì form nạp lại số liệu. */
    readonly plan = input.required<CvpPlanInput>();
    readonly unsaved = input(false);
    readonly saving = input(false);

    readonly draftChange = output<CvpPlanInput>();
    readonly save = output<CvpPlanInput>();

    protected readonly help = FIELD_HELP;

    private readonly fb = inject(NonNullableFormBuilder);

    protected readonly form = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(80)]],
        unitLabel: ['sp', [Validators.required, Validators.maxLength(20)]],
        unitPrice: [0, [Validators.required, Validators.min(0)]],
        volume: [0, [Validators.required, Validators.min(0)]],
        taxRate: [
            20,
            [Validators.required, Validators.min(0), Validators.max(100)],
        ],
        targetProfit: this.fb.control<number | null>(null, Validators.min(0)),
        targetAfterTax: [true],
        costItems: this.fb.array<CostItemGroup>([]),
    });

    protected readonly submitted = signal(false);
    protected readonly value = signal<CvpPlanInput | null>(null);
    /** Hai mục chi phí hiển thị riêng: biến phí và định phí. */
    protected readonly sections = computed(() => {
        const items = this.value()?.costItems ?? [];
        const unit = this.value()?.unitLabel || 'sp';
        const totals = summarizeCosts(items);
        const count = (b: CostBehavior) =>
            items.filter((c) => c.behavior === b).length;
        return [
            {
                behavior: 'variable' as const,
                title: 'Biến phí (v)',
                shortTitle: 'biến phí',
                otherTitle: 'định phí',
                hint: `Tăng theo sản lượng · nhập cho mỗi ${unit}`,
                unit: `đ / ${unit}`,
                totalLabel: `Cộng / ${unit}`,
                total: totals.unitVariableCost,
                count: count('variable'),
                empty: 'Chưa có biến phí (nguyên liệu, bao bì, hoa hồng…).',
            },
            {
                behavior: 'fixed' as const,
                title: 'Định phí (F)',
                shortTitle: 'định phí',
                otherTitle: 'biến phí',
                hint: 'Không đổi theo sản lượng · nhập tổng cả kỳ',
                unit: 'đ / kỳ',
                totalLabel: 'Cộng cả kỳ',
                total: totals.fixedCost,
                count: count('fixed'),
                empty: 'Chưa có định phí (thuê mặt bằng, lương cố định…).',
            },
        ];
    });

    constructor() {
        effect(() => {
            const plan = this.plan();
            untracked(() => this.load(plan));
        });
        this.form.valueChanges
            .pipe(takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(() => {
                const draft = this.toInput();
                this.value.set(draft);
                this.draftChange.emit(draft);
            });
    }

    protected get costItems(): FormArray<CostItemGroup> {
        return this.form.controls.costItems;
    }

    protected addCost(behavior: CostBehavior): void {
        this.costItems.push(
            this.costGroup({
                id: crypto.randomUUID().slice(0, 8),
                name: '',
                behavior,
                amount: 0,
            }),
        );
    }

    protected removeCost(index: number): void {
        this.costItems.removeAt(index);
    }

    /** Xếp nhầm mục: chuyển khoản chi phí giữa biến phí và định phí. */
    protected toggleBehavior(index: number): void {
        const behavior = this.costItems.at(index).controls.behavior;
        behavior.setValue(behavior.value === 'variable' ? 'fixed' : 'variable');
    }

    protected invalid(name: Field): boolean {
        const control = this.form.controls[name];
        return control.invalid && (control.touched || this.submitted());
    }

    protected submit(): void {
        this.submitted.set(true);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.save.emit(this.toInput());
    }

    private load(plan: CvpPlanInput): void {
        this.submitted.set(false);
        const { costItems, ...fields } = plan;
        this.costItems.clear({ emitEvent: false });
        for (const item of costItems) {
            this.costItems.push(this.costGroup(item), { emitEvent: false });
        }
        this.form.reset(fields);
    }

    private costGroup(item: CostItem): CostItemGroup {
        return this.fb.group({
            id: [item.id],
            name: [item.name, Validators.maxLength(80)],
            behavior: this.fb.control<CostBehavior>(item.behavior),
            amount: [item.amount, [Validators.required, Validators.min(0)]],
        });
    }

    private toInput(): CvpPlanInput {
        const v = this.form.getRawValue();
        return {
            name: v.name.trim(),
            unitLabel: v.unitLabel.trim() || 'sp',
            unitPrice: num(v.unitPrice),
            volume: num(v.volume),
            taxRate: num(v.taxRate),
            targetProfit:
                v.targetProfit === null || Number.isNaN(v.targetProfit)
                    ? null
                    : v.targetProfit,
            targetAfterTax: v.targetAfterTax,
            costItems: v.costItems.map((c) => ({
                id: c.id,
                name: c.name.trim(),
                behavior: c.behavior,
                amount: num(c.amount),
            })),
        };
    }
}
