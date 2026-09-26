import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    signal,
} from '@angular/core';

import {
    CvpBase,
    CvpChange,
    CvpFactor,
    CvpResult,
    NO_CHANGE,
    analyzeCvp,
    applyChange,
    sensitivity,
} from '../../../core/accounting/cvp';
import { VndPipe, formatVnd } from '../../../shared/pipes';
import { InfoTip } from '../../../shared/ui';
import { FIELD_HELP } from '../field-help';
import { formatQuantity, formatSignedPercent } from '../format';

const FACTORS: { key: CvpFactor; label: string }[] = [
    { key: 'unitPricePct', label: 'Giá bán' },
    { key: 'unitVariableCostPct', label: 'Biến phí đơn vị' },
    { key: 'fixedCostPct', label: 'Định phí' },
    { key: 'volumePct', label: 'Sản lượng' },
];

const LABEL = Object.fromEntries(FACTORS.map((f) => [f.key, f.label]));

interface CompareRow {
    label: string;
    before: number | null;
    after: number | null;
    format: (v: number) => string;
    /** Tăng là tốt (lợi nhuận) hay xấu (điểm hòa vốn). */
    higherIsBetter: boolean;
}

/** Phân tích "nếu… thì…" và độ nhạy của lợi nhuận. */
@Component({
    selector: 'app-what-if',
    imports: [VndPipe, InfoTip],
    templateUrl: './what-if.html',
    styleUrl: './what-if.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatIf {
    readonly base = input.required<CvpBase>();
    readonly unitLabel = input('sp');

    protected readonly factors = FACTORS;
    protected readonly help = FIELD_HELP.whatIf;
    protected readonly change = signal<CvpChange>(NO_CHANGE);
    protected readonly changed = computed(() =>
        FACTORS.some((f) => this.change()[f.key] !== 0),
    );

    private readonly before = computed(() => analyzeCvp(this.base()));
    private readonly after = computed(() =>
        analyzeCvp(applyChange(this.base(), this.change())),
    );

    protected readonly rows = computed<CompareRow[]>(() => {
        const money = (v: number) => formatVnd(v);
        const qty = (v: number) => formatQuantity(v, this.unitLabel());
        const pick = (
            label: string,
            get: (r: CvpResult) => number | null,
            format: (v: number) => string,
            higherIsBetter = true,
        ): CompareRow => ({
            label,
            before: get(this.before()),
            after: get(this.after()),
            format,
            higherIsBetter,
        });
        return [
            pick('Doanh thu', (r) => r.revenue, money),
            pick('Số dư đảm phí', (r) => r.contribution, money),
            pick('Lợi nhuận trước thuế', (r) => r.operatingProfit, money),
            pick('Lợi nhuận sau thuế', (r) => r.netProfit, money),
            pick('Sản lượng hòa vốn', (r) => r.breakEvenUnits, qty, false),
        ];
    });

    protected readonly sensitivity = computed(() =>
        sensitivity(this.base()).map((s) => ({
            ...s,
            label: LABEL[s.factor],
        })),
    );

    protected readonly signedPercent = formatSignedPercent;

    protected setChange(factor: CvpFactor, raw: string): void {
        const value = Number(raw);
        this.change.update((c) => ({
            ...c,
            [factor]: Number.isFinite(value) ? value : 0,
        }));
    }

    protected reset(): void {
        this.change.set(NO_CHANGE);
    }

    protected diffClass(row: CompareRow): string {
        if (row.before === null || row.after === null) return '';
        const diff = row.after - row.before;
        if (Math.abs(diff) < 1e-6) return '';
        return diff > 0 === row.higherIsBetter ? 'good' : 'bad';
    }

    protected diffText(row: CompareRow): string {
        if (row.before === null || row.after === null) return '—';
        const diff = row.after - row.before;
        if (Math.abs(diff) < 1e-6) return '0';
        return (diff > 0 ? '+' : '−') + row.format(Math.abs(diff));
    }
}
