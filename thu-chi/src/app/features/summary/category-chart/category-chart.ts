import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CATEGORIES } from '../../../core/constants/categories';
import { CategoryTotal } from '../../../core/models';
import { formatVnd, formatVndCompact } from '../../../shared/pipes';
import { BarChart, ChartDatum, EmptyState, StackedBar } from '../../../shared/ui';

/** Biểu đồ danh mục: thanh cơ cấu 100% + biểu đồ cột ngang xếp theo số tiền. */
@Component({
  selector: 'app-category-chart',
  imports: [StackedBar, BarChart, EmptyState],
  templateUrl: './category-chart.html',
  styleUrl: './category-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryChart {
  /** Tổng theo danh mục (đã sắp giảm dần). */
  readonly items = input.required<CategoryTotal[]>();
  readonly emptyMessage = input('Chưa có dữ liệu cho tháng này.');

  protected readonly formatValue = (v: number) => formatVnd(v);
  protected readonly formatTick = formatVndCompact;

  /** Xếp hạng theo số tiền để so sánh. */
  protected readonly ranked = computed<ChartDatum[]>(() => this.items().map(toDatum));

  /** Thanh cơ cấu giữ thứ tự danh mục cố định, để màu kề nhau luôn là cặp đã kiểm tra. */
  protected readonly composition = computed<ChartDatum[]>(() =>
    [...this.items()]
      .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category))
      .map(toDatum),
  );
}

function toDatum({ category, total, count }: CategoryTotal): ChartDatum {
  return {
    id: category.id,
    label: category.name,
    icon: category.icon,
    color: category.color,
    value: total,
    detail: `${count} giao dịch`,
  };
}
