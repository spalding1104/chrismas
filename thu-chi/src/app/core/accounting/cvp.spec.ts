import {
    CostItem,
    CvpBase,
    analyzeCvp,
    applyChange,
    minimumUnits,
    profitBeforeTax,
    sensitivity,
    summarizeCosts,
} from './cvp';
import { coffeeShopPlan, examplePlan } from '../state/cvp.store';

/*
 * Ví dụ tính tay: p = 100.000đ, v = 60.000đ, F = 200 triệu, Q = 8.000 sp,
 * thuế TNDN 20%.
 *   SDĐP đơn vị = 40.000đ, tỷ lệ SDĐP = 40%
 *   Doanh thu = 800tr, biến phí = 480tr, SDĐP = 320tr
 *   LN trước thuế = 120tr, thuế = 24tr, LN sau thuế = 96tr
 *   Hòa vốn = 200tr / 40.000 = 5.000 sp = 500tr doanh thu
 *   Số dư an toàn = 300tr (37,5%), DOL = 320 / 120 = 2,67
 */
const base: CvpBase = {
    unitPrice: 100_000,
    unitVariableCost: 60_000,
    fixedCost: 200_000_000,
    volume: 8_000,
    taxRate: 20,
};

describe('summarizeCosts', () => {
    it('adds per-unit variable costs and period fixed costs separately', () => {
        const items: CostItem[] = [
            {
                id: '1',
                name: 'NVL trực tiếp',
                behavior: 'variable',
                amount: 35_000,
            },
            {
                id: '2',
                name: 'NC trực tiếp',
                behavior: 'variable',
                amount: 20_000,
            },
            {
                id: '3',
                name: 'Hoa hồng bán hàng',
                behavior: 'variable',
                amount: 5_000,
            },
            {
                id: '4',
                name: 'Thuê nhà xưởng',
                behavior: 'fixed',
                amount: 120_000_000,
            },
            {
                id: '5',
                name: 'Khấu hao',
                behavior: 'fixed',
                amount: 80_000_000,
            },
        ];
        expect(summarizeCosts(items)).toEqual({
            unitVariableCost: 60_000,
            fixedCost: 200_000_000,
        });
        expect(summarizeCosts([])).toEqual({
            unitVariableCost: 0,
            fixedCost: 0,
        });
    });
});

describe('analyzeCvp', () => {
    it('builds the contribution-margin income statement', () => {
        const r = analyzeCvp(base);
        expect(r.unitContribution).toBe(40_000);
        expect(r.contributionRatio).toBeCloseTo(0.4);
        expect(r.revenue).toBe(800_000_000);
        expect(r.variableCost).toBe(480_000_000);
        expect(r.contribution).toBe(320_000_000);
        expect(r.operatingProfit).toBe(120_000_000);
        expect(r.tax).toBe(24_000_000);
        expect(r.netProfit).toBe(96_000_000);
    });

    it('finds break-even, margin of safety and operating leverage', () => {
        const r = analyzeCvp(base);
        expect(r.breakEvenUnits).toBe(5_000);
        expect(r.breakEvenRevenue).toBe(500_000_000);
        expect(r.marginOfSafety).toBe(300_000_000);
        expect(r.marginOfSafetyRatio).toBeCloseTo(0.375);
        expect(r.operatingLeverage).toBeCloseTo(320 / 120);
    });

    it('profit is exactly zero at the break-even volume', () => {
        const atBreakEven = analyzeCvp({ ...base, volume: 5_000 });
        expect(atBreakEven.operatingProfit).toBe(0);
        expect(atBreakEven.marginOfSafety).toBe(0);
        expect(atBreakEven.operatingLeverage).toBeNull();
    });

    it('solves for a pre-tax or after-tax target profit', () => {
        const preTax = analyzeCvp(base, {
            profit: 100_000_000,
            afterTax: false,
        });
        expect(preTax.target).toEqual({
            profitBeforeTax: 100_000_000,
            units: 7_500,
            revenue: 750_000_000,
        });

        // 120tr sau thuế ⇔ 150tr trước thuế ⇒ (200 + 150)tr / 40.000 = 8.750 sp
        const afterTax = analyzeCvp(base, {
            profit: 120_000_000,
            afterTax: true,
        });
        expect(afterTax.target?.profitBeforeTax).toBeCloseTo(150_000_000);
        expect(afterTax.target?.units).toBeCloseTo(8_750);
        expect(afterTax.target?.revenue).toBeCloseTo(875_000_000);
    });

    it('charges no tax on a loss and reports no leverage', () => {
        const r = analyzeCvp({ ...base, volume: 4_000 });
        expect(r.operatingProfit).toBe(-40_000_000);
        expect(r.tax).toBe(0);
        expect(r.netProfit).toBe(-40_000_000);
        expect(r.marginOfSafety).toBe(-100_000_000);
        expect(r.operatingLeverage).toBeNull();
    });

    it('never breaks even when price does not cover variable cost', () => {
        const r = analyzeCvp(
            { ...base, unitVariableCost: 100_000 },
            { profit: 1, afterTax: false },
        );
        expect(r.unitContribution).toBe(0);
        expect(r.breakEvenUnits).toBeNull();
        expect(r.breakEvenRevenue).toBeNull();
        expect(r.marginOfSafety).toBeNull();
        expect(r.target?.units).toBeNull();
    });

    it('handles a zero price and a 100% tax rate without NaN', () => {
        const free = analyzeCvp({ ...base, unitPrice: 0 });
        expect(free.contributionRatio).toBeNull();
        expect(free.marginOfSafetyRatio).toBeNull();

        expect(profitBeforeTax({ profit: 1, afterTax: true }, 100)).toBe(
            Number.POSITIVE_INFINITY,
        );
        const r = analyzeCvp(
            { ...base, taxRate: 100 },
            { profit: 1, afterTax: true },
        );
        expect(r.target?.units).toBeNull();
    });
});

describe('what-if and sensitivity', () => {
    it('applies percentage changes to each factor', () => {
        expect(
            applyChange(base, {
                unitPricePct: 10,
                unitVariableCostPct: -5,
                fixedCostPct: 20,
                volumePct: -50,
            }),
        ).toEqual({
            unitPrice: 110_000,
            unitVariableCost: 57_000,
            fixedCost: 240_000_000,
            volume: 4_000,
            taxRate: 20,
        });
    });

    it('ranks factors by their effect on profit (+10% each)', () => {
        const rows = sensitivity(base);
        expect(rows.map((r) => r.factor)).toEqual([
            'unitPricePct',
            'unitVariableCostPct',
            'volumePct',
            'fixedCostPct',
        ]);
        const byFactor = Object.fromEntries(rows.map((r) => [r.factor, r]));
        expect(byFactor['unitPricePct'].profitChange).toBeCloseTo(80_000_000);
        expect(byFactor['unitVariableCostPct'].profitChange).toBeCloseTo(
            -48_000_000,
        );
        expect(byFactor['fixedCostPct'].profitChange).toBeCloseTo(-20_000_000);
        // Sản lượng +10% ⇒ lợi nhuận +DOL × 10% ≈ 26,7%
        expect(byFactor['volumePct'].profitChange).toBeCloseTo(32_000_000);
        expect(byFactor['volumePct'].profitChangePct).toBeCloseTo(
            analyzeCvp(base).operatingLeverage! * 10,
        );
    });
});

describe('coffee shop example (monthly)', () => {
    /*
     * p = 35.000, v = 9.000 + 2.500 + 1.500 = 13.000, F = 45 triệu,
     * Q = 3.000 ly, t = 20%.
     *   SDĐP đơn vị 22.000 ⇒ hòa vốn 45tr / 22.000 = 2.045,45 ly (bán ≥ 2.046)
     *   LN trước thuế = 66tr − 45tr = 21tr; sau thuế = 16,8tr
     *   Mục tiêu 20tr sau thuế ⇔ 25tr trước thuế ⇒ 70tr / 22.000 ≈ 3.181,8 ly
     */
    it('matches the hand-worked numbers', () => {
        const plan = coffeeShopPlan();
        const costs = summarizeCosts(plan.costItems);
        expect(costs).toEqual({
            unitVariableCost: 13_000,
            fixedCost: 45_000_000,
        });

        const r = analyzeCvp(
            {
                ...costs,
                unitPrice: plan.unitPrice,
                volume: plan.volume,
                taxRate: plan.taxRate,
            },
            { profit: plan.targetProfit!, afterTax: plan.targetAfterTax },
        );
        expect(r.breakEvenUnits).toBeCloseTo(2_045.4545, 3);
        expect(minimumUnits(r.breakEvenUnits!)).toBe(2_046);
        expect(r.operatingProfit).toBe(21_000_000);
        expect(r.netProfit).toBe(16_800_000);
        expect(r.target?.units).toBeCloseTo(3_181.818, 2);
    });

    it('the chair example matches the numbers at the top of this file', () => {
        const plan = examplePlan();
        expect(summarizeCosts(plan.costItems)).toEqual({
            unitVariableCost: base.unitVariableCost,
            fixedCost: base.fixedCost,
        });
    });
});
