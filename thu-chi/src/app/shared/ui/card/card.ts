import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Khung nền trắng có tiêu đề và vùng hành động tùy chọn (`[cardActions]`). */
@Component({
  selector: 'app-card',
  templateUrl: './card.html',
  styleUrl: './card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  readonly heading = input<string>();
  readonly subheading = input<string>();
}
