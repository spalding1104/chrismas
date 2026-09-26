import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { ChartDatum, ValueFormatter, defaultFormatter } from '../chart.model';

interface Segment extends ChartDatum {
  share: number;
}

/**
 * Thanh 100% thể hiện cơ cấu (part-to-whole). Giữ nguyên thứ tự dữ liệu truyền vào
 * để màu và vị trí mỗi phần không nhảy khi số liệu thay đổi.
 */
@Component({
  selector: 'app-stacked-bar',
  templateUrl: './stacked-bar.html',
  styleUrl: './stacked-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackedBar {
  readonly data = input.required<readonly ChartDatum[]>();
  readonly formatValue = input<ValueFormatter>(defaultFormatter);
  readonly ariaLabel = input('Biểu đồ cơ cấu');

  protected readonly segments = computed<Segment[]>(() => {
    const items = this.data().filter((d) => d.value > 0);
    const total = items.reduce((s, d) => s + d.value, 0);
    return items.map((d) => ({ ...d, share: total ? (d.value / total) * 100 : 0 }));
  });

  protected readonly active = signal<Segment | null>(null);
  protected readonly tipX = signal(0);

  protected point(event: PointerEvent | FocusEvent, segment: Segment): void {
    const target = event.currentTarget as HTMLElement;
    const host = target.parentElement!.getBoundingClientRect();
    const x =
      event instanceof PointerEvent
        ? event.clientX - host.left
        : target.getBoundingClientRect().left - host.left + target.offsetWidth / 2;
    this.tipX.set(Math.min(Math.max(x, 70), host.width - 70));
    this.active.set(segment);
  }

  protected percent(value: number): string {
    return `${Math.round(value)}%`;
  }
}
