import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
});

/** "2026-09-14" → "Thứ Hai, 14/09" */
@Pipe({ name: 'dayLabel' })
export class DayLabelPipe implements PipeTransform {
    transform(dateKey: string): string {
        const [y, m, d] = dateKey.split('-').map(Number);
        const text = formatter.format(new Date(y, m - 1, d));
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}
