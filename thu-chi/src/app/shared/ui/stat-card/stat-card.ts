import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { VndPipe } from '../../pipes/vnd.pipe';

export type StatTone = 'income' | 'expense' | 'neutral';

@Component({
  selector: 'app-stat-card',
  imports: [VndPipe],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
})
export class StatCard {
  readonly label = input.required<string>();
  readonly amount = input.required<number>();
  readonly tone = input<StatTone>('neutral');
  readonly icon = input<string>();
  readonly hint = input<string>();
}
