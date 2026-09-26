import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';

import { CvpBase, analyzeCvp, summarizeCosts } from '../../core/accounting/cvp';
import { CvpPlan, CvpPlanInput } from '../../core/models';
import {
    CvpStore,
    EXAMPLES,
    ExampleId,
    blankPlan,
} from '../../core/state/cvp.store';
import { formatVnd, formatVndCompact } from '../../shared/pipes';
import {
    Card,
    ChartMarker,
    EmptyState,
    LineChart,
    LineSeries,
    niceTicks,
} from '../../shared/ui';
import { CvpReport } from './cvp-report/cvp-report';
import { formatQuantity } from './format';
import { PlanForm } from './plan-form/plan-form';
import { WhatIf } from './what-if/what-if';

/** Bỏ id/updatedAt để so sánh với bản nháp đang sửa. */
function inputOf(plan: CvpPlan): CvpPlanInput {
    return {
        name: plan.name,
        unitLabel: plan.unitLabel,
        unitPrice: plan.unitPrice,
        volume: plan.volume,
        taxRate: plan.taxRate,
        targetProfit: plan.targetProfit,
        targetAfterTax: plan.targetAfterTax,
        costItems: plan.costItems.map((c) => ({
            id: c.id,
            name: c.name,
            behavior: c.behavior,
            amount: c.amount,
        })),
    };
}

/** Phân hệ Kế toán quản trị: phân tích CVP (container). */
@Component({
    selector: 'app-accounting-page',
    imports: [Card, CvpReport, EmptyState, LineChart, PlanForm, WhatIf],
    templateUrl: './accounting-page.html',
    styleUrl: './accounting-page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountingPage {
    protected readonly store = inject(CvpStore);
    protected readonly examples = EXAMPLES;

    /** Số liệu đang sửa trên form (chưa chắc đã lưu); kết quả tính theo nó. */
    protected readonly draft = signal<CvpPlanInput | null>(null);
    protected readonly saving = signal(false);

    protected readonly planInput = computed(() => {
        const plan = this.store.selected();
        return plan ? inputOf(plan) : null;
    });

    protected readonly unsaved = computed(() => {
        const draft = this.draft();
        const saved = this.planInput();
        return (
            !!draft &&
            !!saved &&
            JSON.stringify(draft) !== JSON.stringify(saved)
        );
    });

    protected readonly base = computed<CvpBase | null>(() => {
        const d = this.draft();
        if (!d) return null;
        return {
            unitPrice: d.unitPrice,
            volume: d.volume,
            taxRate: d.taxRate,
            ...summarizeCosts(d.costItems),
        };
    });

    protected readonly analysis = computed(() => {
        const base = this.base();
        const d = this.draft();
        if (!base || !d) return null;
        return analyzeCvp(
            base,
            d.targetProfit === null
                ? null
                : { profit: d.targetProfit, afterTax: d.targetAfterTax },
        );
    });

    protected readonly unitLabel = computed(
        () => this.draft()?.unitLabel ?? 'sp',
    );

    protected readonly chart = computed(() => {
        const r = this.analysis();
        if (!r) return null;
        const reach = Math.max(
            r.volume,
            r.breakEvenUnits ?? 0,
            r.target?.units ?? 0,
        );
        if (reach <= 0) return null;
        const xMax = niceTicks(reach * 1.25, 5).at(-1)!;
        const line = (
            id: string,
            label: string,
            color: string,
            at: (x: number) => number,
        ): LineSeries => ({
            id,
            label,
            color,
            points: [
                { x: 0, y: at(0) },
                { x: xMax, y: at(xMax) },
            ],
        });
        const series = [
            line(
                'revenue',
                'Doanh thu',
                'var(--series-1)',
                (x) => r.unitPrice * x,
            ),
            line(
                'total-cost',
                'Tổng chi phí',
                'var(--series-2)',
                (x) => r.fixedCost + r.unitVariableCost * x,
            ),
            line('fixed', 'Định phí', 'var(--series-other)', () => r.fixedCost),
        ];
        const markers: ChartMarker[] = [];
        if (r.breakEvenUnits !== null) {
            markers.push({
                id: 'break-even',
                x: r.breakEvenUnits,
                y: r.breakEvenRevenue ?? 0,
                label: 'Hòa vốn',
            });
        }
        if (r.volume > 0) {
            markers.push({ id: 'plan', x: r.volume, label: 'Kế hoạch' });
        }
        return { series, markers, xStep: xMax >= 50 ? 1 : 0 };
    });

    protected readonly formatMoney = (v: number) => formatVnd(v);
    /** Nhãn trục rút gọn, dùng cho cả tiền và sản lượng (5k, 1,2tr). */
    protected readonly formatCompact = formatVndCompact;
    protected readonly formatUnits = (x: number) =>
        formatQuantity(x, this.unitLabel());
    protected readonly profitAt = (x: number): string | null => {
        const r = this.analysis();
        if (!r) return null;
        const profit = r.unitContribution * x - r.fixedCost;
        if (Math.abs(profit) < 0.5) return 'Hòa vốn';
        return profit > 0
            ? `Lãi ${formatVnd(profit)}`
            : `Lỗ ${formatVnd(-profit)}`;
    };

    protected select(id: string, picker: HTMLSelectElement): void {
        if (!this.confirmDiscard()) {
            picker.value = this.store.selected()?.id ?? '';
            return;
        }
        this.store.selectedId.set(id);
    }

    protected async create(): Promise<void> {
        if (!this.confirmDiscard()) return;
        const count = this.store.plans().length;
        await this.store.create(blankPlan(`Phương án ${count + 1}`));
    }

    protected async addExample(id: ExampleId): Promise<void> {
        if (!this.confirmDiscard()) return;
        const example = EXAMPLES.find((e) => e.id === id)!;
        await this.store.create(example.build());
    }

    protected async remove(): Promise<void> {
        const plan = this.store.selected();
        if (!plan || !confirm(`Xóa phương án "${plan.name}"?`)) return;
        await this.store.remove(plan.id);
    }

    protected async save(input: CvpPlanInput): Promise<void> {
        const plan = this.store.selected();
        if (!plan) return;
        this.saving.set(true);
        try {
            await this.store.save(plan.id, input);
        } finally {
            this.saving.set(false);
        }
    }

    private confirmDiscard(): boolean {
        return !this.unsaved() || confirm('Bỏ các thay đổi chưa lưu?');
    }
}
