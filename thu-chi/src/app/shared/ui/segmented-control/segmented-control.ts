import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Nhóm nút chọn một giá trị. Dùng được theo 2 cách:
 * - Two-way binding: `<app-segmented-control [(value)]="filter" />`
 * - Reactive forms: `<app-segmented-control formControlName="type" />`
 */
@Component({
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SegmentedControl), multi: true },
  ],
  host: { role: 'radiogroup', '[attr.aria-label]': 'ariaLabel()' },
})
export class SegmentedControl<T extends string> implements ControlValueAccessor {
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model<T>();
  readonly ariaLabel = input<string>();

  protected readonly disabled = signal(false);
  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  protected select(value: T): void {
    if (this.disabled() || value === this.value()) return;
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  writeValue(value: T): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
