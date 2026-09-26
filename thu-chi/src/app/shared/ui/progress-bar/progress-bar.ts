import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  template: `<span class="bar__fill" [style.width.%]="clamped()" [style.background]="color()"></span>`,
  styles: `
    :host {
      display: block;
      height: 8px;
      border-radius: 999px;
      background: var(--surface-muted);
      overflow: hidden;
    }
    .bar__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      transition: width 0.4s ease;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'clamped()',
  },
})
export class ProgressBar {
  /** Giá trị 0–100. */
  readonly value = input.required<number>();
  readonly color = input('var(--accent)');

  protected readonly clamped = computed(() => Math.round(Math.min(100, Math.max(0, this.value()))));
}
