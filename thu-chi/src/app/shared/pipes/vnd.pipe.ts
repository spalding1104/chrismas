import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/**
 * Định dạng số tiền VND. `sign`:
 * - 'auto'   : chỉ hiện dấu "-" khi âm (mặc định)
 * - 'always' : luôn hiện dấu "+" / "-"
 */
@Pipe({ name: 'vnd' })
export class VndPipe implements PipeTransform {
  transform(value: number | null | undefined, sign: 'auto' | 'always' = 'auto'): string {
    const amount = value ?? 0;
    const text = formatter.format(Math.abs(amount));
    if (amount < 0) return `-${text}`;
    return sign === 'always' && amount > 0 ? `+${text}` : text;
  }
}
