/**
 * Một điểm dữ liệu cho các biểu đồ trong `shared/ui/charts`.
 * Không phụ thuộc nghiệp vụ.
 */
export interface ChartDatum {
    id: string;
    label: string;
    value: number;
    /**
     * Màu CSS, nên là token (vd. `var(--series-1)`) để tự đổi theo
     * giao diện sáng/tối.
     */
    color: string;
    icon?: string;
    /** Dòng phụ hiển thị trong tooltip, vd. "3 giao dịch". */
    detail?: string;
}

/** Một chuỗi dữ liệu trong biểu đồ cột nhóm, vd. "Thu" hoặc "Chi". */
export interface ChartSeries {
    id: string;
    label: string;
    color: string;
}

/** Một nhóm cột trên trục ngang, vd. một tháng. */
export interface ChartGroup {
    id: string;
    /** Nhãn ngắn dưới trục, vd. "T3". */
    label: string;
    /** Tiêu đề đầy đủ trong tooltip, vd. "Tháng 3, 2026". */
    title: string;
    /** Giá trị theo đúng thứ tự của mảng series. */
    values: readonly number[];
    /** Dòng phụ cuối tooltip. */
    detail?: string;
}

/** Một đường trong biểu đồ đường; các điểm nối thẳng, x tăng dần. */
export interface LineSeries {
    id: string;
    label: string;
    color: string;
    points: readonly { x: number; y: number }[];
}

/** Mốc đánh dấu trên trục ngang, vd. "Hòa vốn"; có y thì vẽ thêm chấm. */
export interface ChartMarker {
    id: string;
    x: number;
    y?: number;
    label: string;
}

export type ValueFormatter = (value: number) => string;

export const defaultFormatter: ValueFormatter = (v) =>
    v.toLocaleString('vi-VN');

/** Chia trục thành các mốc "tròn" (1, 2, 2.5, 5 × 10^n). */
export function niceTicks(max: number, count = 4): number[] {
    if (max <= 0) return [0];
    const raw = max / count;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const n = raw / magnitude;
    const step =
        (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) *
        magnitude;
    const top = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let t = 0; t <= top + step / 2; t += step) ticks.push(Math.round(t));
    return ticks;
}
