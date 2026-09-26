import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';

import { CvpResult, minimumUnits } from '../../../core/accounting/cvp';
import { VndPipe } from '../../../shared/pipes';
import { formatQuantity, formatRatio, formatTimes } from '../format';

interface StatementRow {
    label: string;
    formula: string;
    total: number;
    perUnit: number | null;
    /** Tỷ lệ trên doanh thu. */
    ratio: number | null;
    kind?: 'subtotal' | 'result';
}

/**
 * Kết quả phân tích CVP: chỉ số chính, báo cáo kết quả kinh doanh theo
 * số dư đảm phí và lợi nhuận mục tiêu. Mỗi chỉ tiêu kèm công thức.
 */
@Component({
    selector: 'app-cvp-report',
    imports: [VndPipe],
    templateUrl: './cvp-report.html',
    styleUrl: './cvp-report.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvpReport {
    readonly result = input.required<CvpResult>();
    readonly unitLabel = input('sp');
    readonly taxRate = input(0);
    readonly targetAfterTax = input(true);
    readonly targetProfit = input<number | null>(null);

    protected readonly quantity = (v: number) =>
        formatQuantity(v, this.unitLabel());
    protected readonly ratio = formatRatio;
    protected readonly times = formatTimes;
    protected readonly minimumUnits = minimumUnits;

    protected readonly noBreakEven = computed(
        () => this.result().breakEvenUnits === null,
    );

    protected readonly rows = computed<StatementRow[]>(() => {
        const r = this.result();
        const ofRevenue = (v: number) => (r.revenue > 0 ? v / r.revenue : null);
        const perUnit = (v: number) => (r.volume > 0 ? v / r.volume : null);
        return [
            {
                label: 'Doanh thu',
                formula: 'p × Q',
                total: r.revenue,
                perUnit: r.unitPrice,
                ratio: ofRevenue(r.revenue),
            },
            {
                label: 'Biến phí',
                formula: 'v × Q',
                total: r.variableCost,
                perUnit: r.unitVariableCost,
                ratio: ofRevenue(r.variableCost),
            },
            {
                label: 'Số dư đảm phí',
                formula: 'Doanh thu − Biến phí',
                total: r.contribution,
                perUnit: r.unitContribution,
                ratio: ofRevenue(r.contribution),
                kind: 'subtotal',
            },
            {
                label: 'Định phí',
                formula: 'F',
                total: r.fixedCost,
                perUnit: perUnit(r.fixedCost),
                ratio: ofRevenue(r.fixedCost),
            },
            {
                label: 'Lợi nhuận trước thuế',
                formula: 'SDĐP − Định phí',
                total: r.operatingProfit,
                perUnit: perUnit(r.operatingProfit),
                ratio: ofRevenue(r.operatingProfit),
                kind: 'subtotal',
            },
            {
                label: `Thuế TNDN (${this.taxRate()}%)`,
                formula: 'LN trước thuế × t (khi có lãi)',
                total: r.tax,
                perUnit: perUnit(r.tax),
                ratio: ofRevenue(r.tax),
            },
            {
                label: 'Lợi nhuận sau thuế',
                formula: 'LN trước thuế − Thuế',
                total: r.netProfit,
                perUnit: perUnit(r.netProfit),
                ratio: ofRevenue(r.netProfit),
                kind: 'result',
            },
        ];
    });
}
