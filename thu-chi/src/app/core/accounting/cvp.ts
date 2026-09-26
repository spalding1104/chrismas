/**
 * Phân tích CVP (Chi phí – Khối lượng – Lợi nhuận) cho một sản phẩm,
 * theo kế toán quản trị. Hàm thuần: không phụ thuộc Angular hay API.
 *
 * Ký hiệu: p = giá bán đơn vị, v = biến phí đơn vị, F = tổng định phí,
 * Q = sản lượng tiêu thụ, t = thuế suất thuế TNDN.
 */

/** Cách ứng xử của chi phí khi sản lượng thay đổi. */
export type CostBehavior = 'variable' | 'fixed';

export interface CostItem {
    id: string;
    name: string;
    behavior: CostBehavior;
    /** Biến phí: tiền trên mỗi đơn vị. Định phí: tổng tiền cả kỳ. */
    amount: number;
}

/** Số liệu gốc để phân tích (đã gộp các khoản chi phí). */
export interface CvpBase {
    unitPrice: number;
    unitVariableCost: number;
    fixedCost: number;
    volume: number;
    /** Thuế suất thuế TNDN, % (vd. 20). */
    taxRate: number;
}

export interface CvpTarget {
    /** Lợi nhuận mong muốn. */
    profit: number;
    /** true: con số trên là lợi nhuận sau thuế. */
    afterTax: boolean;
}

export interface CvpTargetResult {
    profitBeforeTax: number;
    units: number | null;
    revenue: number | null;
}

export interface CvpResult {
    unitPrice: number;
    unitVariableCost: number;
    /** Số dư đảm phí đơn vị = p − v. */
    unitContribution: number;
    /** Tỷ lệ số dư đảm phí = (p − v) / p; null khi giá bán = 0. */
    contributionRatio: number | null;
    fixedCost: number;
    volume: number;

    revenue: number;
    variableCost: number;
    contribution: number;
    /** Lợi nhuận trước thuế (EBIT) = SDĐP − F. */
    operatingProfit: number;
    /** Thuế TNDN, chỉ tính khi có lãi. */
    tax: number;
    netProfit: number;

    /** null khi p ≤ v: bán càng nhiều càng lỗ, không bao giờ hòa vốn. */
    breakEvenUnits: number | null;
    breakEvenRevenue: number | null;
    /** Số dư an toàn = doanh thu thực tế − doanh thu hòa vốn (có thể âm). */
    marginOfSafety: number | null;
    marginOfSafetyRatio: number | null;
    /** Độ lớn đòn bẩy kinh doanh = SDĐP / LN trước thuế; chỉ có nghĩa khi có lãi. */
    operatingLeverage: number | null;

    target: CvpTargetResult | null;
}

/** Gộp các khoản chi phí thành biến phí đơn vị và tổng định phí. */
export function summarizeCosts(items: readonly CostItem[]): {
    unitVariableCost: number;
    fixedCost: number;
} {
    let unitVariableCost = 0;
    let fixedCost = 0;
    for (const item of items) {
        if (item.behavior === 'variable') unitVariableCost += item.amount;
        else fixedCost += item.amount;
    }
    return { unitVariableCost, fixedCost };
}

/** Lợi nhuận trước thuế cần đạt để còn `profit` sau thuế. */
export function profitBeforeTax(target: CvpTarget, taxRate: number): number {
    if (!target.afterTax) return target.profit;
    const keep = 1 - taxRate / 100;
    return keep > 0 ? target.profit / keep : Number.POSITIVE_INFINITY;
}

export function analyzeCvp(
    base: CvpBase,
    target: CvpTarget | null = null,
): CvpResult {
    const { unitPrice: p, unitVariableCost: v, fixedCost: F, volume: Q } = base;
    const cm = p - v;
    const contributionRatio = p > 0 ? cm / p : null;

    const revenue = p * Q;
    const variableCost = v * Q;
    const contribution = cm * Q;
    const operatingProfit = contribution - F;
    const tax = Math.max(operatingProfit, 0) * (base.taxRate / 100);

    const breakEvenUnits = cm > 0 ? F / cm : null;
    const breakEvenRevenue =
        breakEvenUnits === null ? null : breakEvenUnits * p;
    const marginOfSafety =
        breakEvenRevenue === null ? null : revenue - breakEvenRevenue;

    let targetResult: CvpTargetResult | null = null;
    if (target) {
        const needed = profitBeforeTax(target, base.taxRate);
        const units =
            cm > 0 && Number.isFinite(needed) ? (F + needed) / cm : null;
        targetResult = {
            profitBeforeTax: needed,
            units,
            revenue: units === null ? null : units * p,
        };
    }

    return {
        unitPrice: p,
        unitVariableCost: v,
        unitContribution: cm,
        contributionRatio,
        fixedCost: F,
        volume: Q,
        revenue,
        variableCost,
        contribution,
        operatingProfit,
        tax,
        netProfit: operatingProfit - tax,
        breakEvenUnits,
        breakEvenRevenue,
        marginOfSafety,
        marginOfSafetyRatio:
            marginOfSafety !== null && revenue > 0
                ? marginOfSafety / revenue
                : null,
        operatingLeverage:
            operatingProfit > 0 ? contribution / operatingProfit : null,
        target: targetResult,
    };
}

/** Thay đổi giả định, tính theo % so với phương án gốc. */
export interface CvpChange {
    unitPricePct: number;
    unitVariableCostPct: number;
    fixedCostPct: number;
    volumePct: number;
}

export const NO_CHANGE: CvpChange = {
    unitPricePct: 0,
    unitVariableCostPct: 0,
    fixedCostPct: 0,
    volumePct: 0,
};

export function applyChange(base: CvpBase, change: CvpChange): CvpBase {
    // value + value × pct / 100 thay vì value × (1 + pct / 100): tránh sai
    // số dấu phẩy động (100000 × 1.1 = 110000.00000000001).
    const scale = (value: number, pct: number) => value + (value * pct) / 100;
    return {
        ...base,
        unitPrice: scale(base.unitPrice, change.unitPricePct),
        unitVariableCost: scale(
            base.unitVariableCost,
            change.unitVariableCostPct,
        ),
        fixedCost: scale(base.fixedCost, change.fixedCostPct),
        volume: scale(base.volume, change.volumePct),
    };
}

export type CvpFactor = keyof CvpChange;

export interface Sensitivity {
    factor: CvpFactor;
    /** Thay đổi lợi nhuận trước thuế khi yếu tố tăng `step`%. */
    profitChange: number;
    /** % thay đổi lợi nhuận; null khi lợi nhuận gốc bằng 0. */
    profitChangePct: number | null;
}

/**
 * Độ nhạy của lợi nhuận: lần lượt tăng từng yếu tố `step`% (giữ nguyên
 * các yếu tố khác), xếp theo mức ảnh hưởng giảm dần.
 */
export function sensitivity(base: CvpBase, step = 10): Sensitivity[] {
    const baseProfit = analyzeCvp(base).operatingProfit;
    const factors: CvpFactor[] = [
        'unitPricePct',
        'unitVariableCostPct',
        'fixedCostPct',
        'volumePct',
    ];
    return factors
        .map((factor) => {
            const changed = analyzeCvp(
                applyChange(base, { ...NO_CHANGE, [factor]: step }),
            ).operatingProfit;
            const profitChange = changed - baseProfit;
            return {
                factor,
                profitChange,
                profitChangePct:
                    baseProfit !== 0
                        ? (profitChange / Math.abs(baseProfit)) * 100
                        : null,
            };
        })
        .sort((a, b) => Math.abs(b.profitChange) - Math.abs(a.profitChange));
}

/**
 * Sản lượng tối thiểu phải bán khi kết quả là số lẻ: không bán được nửa
 * sản phẩm nên làm tròn lên. Trả null khi đã là số nguyên.
 */
export function minimumUnits(value: number): number | null {
    // Bỏ sai số dấu phẩy động (5000.0000000001 không có nghĩa là 5001).
    const clean = Math.round(value * 1e6) / 1e6;
    return Number.isInteger(clean) ? null : Math.ceil(clean);
}
