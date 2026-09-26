import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { CategoryTotal } from '../../../core/models';
import { VndPipe } from '../../../shared/pipes';
import { EmptyState, ProgressBar } from '../../../shared/ui';

@Component({
  selector: 'app-category-breakdown',
  imports: [ProgressBar, EmptyState, VndPipe, DecimalPipe],
  templateUrl: './category-breakdown.html',
  styleUrl: './category-breakdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBreakdown {
  readonly items = input.required<CategoryTotal[]>();
  readonly emptyMessage = input('Chưa có dữ liệu cho tháng này.');
}
