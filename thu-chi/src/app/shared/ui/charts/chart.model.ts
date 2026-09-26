/** Một điểm dữ liệu cho các biểu đồ trong `shared/ui/charts`. Không phụ thuộc nghiệp vụ. */
export interface ChartDatum {
  id: string;
  label: string;
  value: number;
  /** Màu CSS, nên là token (vd. `var(--series-1)`) để tự đổi theo giao diện sáng/tối. */
  color: string;
  icon?: string;
  /** Dòng phụ hiển thị trong tooltip, vd. "3 giao dịch". */
  detail?: string;
}

export type ValueFormatter = (value: number) => string;

export const defaultFormatter: ValueFormatter = (v) => v.toLocaleString('vi-VN');

/** Chia trục thành các mốc "tròn" (1, 2, 2.5, 5 × 10^n). */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const n = raw / magnitude;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(Math.round(t));
  return ticks;
}
