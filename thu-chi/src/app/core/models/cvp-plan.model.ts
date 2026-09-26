import { CostItem } from '../accounting/cvp';

/** Số liệu nhập của một phương án CVP; khớp planSchema ở server/src/cvp-plans.ts. */
export interface CvpPlanInput {
    name: string;
    /** Đơn vị tính sản lượng, vd. "sp", "ổ", "kg". */
    unitLabel: string;
    unitPrice: number;
    volume: number;
    /** Thuế suất thuế TNDN, %. */
    taxRate: number;
    targetProfit: number | null;
    targetAfterTax: boolean;
    costItems: CostItem[];
}

export interface CvpPlan extends CvpPlanInput {
    id: string;
    updatedAt: string;
}
