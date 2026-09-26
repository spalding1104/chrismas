import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <span class="empty__icon" aria-hidden="true">{{ icon() }}</span>
    <p class="empty__text">{{ message() }}</p>
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-4);
      text-align: center;
      color: var(--ink-muted);
    }
    .empty__icon {
      font-size: 32px;
    }
    .empty__text {
      margin: 0;
      font-size: var(--text-sm);
      max-width: 32ch;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input('🗒️');
  readonly message = input.required<string>();
}
