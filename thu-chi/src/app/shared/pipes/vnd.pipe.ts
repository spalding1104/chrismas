import { Pipe, PipeTransform } from '@angular/core';

export type VndSign = 'auto' | 'always';

const formatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/**
 * Định dạng số tiền VND. `sign`:
 * - 'auto'   : chỉ hiện dấu "-" khi âm (mặc định)
 * - 'always' : luôn hiện dấu "+" / "-"
 */
export function formatVnd(value: number | null | undefined, sign: VndSign = 'auto'): string {
  const amount = value ?? 0;
  const text = formatter.format(Math.abs(amount));
  if (amount < 0) return `-${text}`;
  return sign === 'always' && amount > 0 ? `+${text}` : text;
}

/** Dạng rút gọn cho trục biểu đồ: 2500000 → "2,5tr", 500000 → "500k". */
export function formatVndCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${decimal.format(value / 1_000_000)}tr`;
  if (abs >= 1_000) return `${decimal.format(value / 1_000)}k`;
  return decimal.format(value);
}

@Pipe({ name: 'vnd' })
export class VndPipe implements PipeTransform {
  transform(value: number | null | undefined, sign: VndSign = 'auto'): string {
    return formatVnd(value, sign);
  }
}
