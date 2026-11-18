import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtIconName, IconComponent } from './icon.component';

export interface CtSegmentedOption<T = string> {
  value: T;
  label: string;
  icon?: CtIconName;
  disabled?: boolean;
}

@Component({
  selector: 'ct-segmented-control',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div
      role="radiogroup"
      [attr.aria-label]="ariaLabel || 'Opções'"
      class="inline-flex items-center p-1 border gap-1 rounded-[var(--ct-radius-lg)]"
      style="background: var(--ct-bg-canvas); border-color: var(--ct-border-default);">
      @for (opt of options; track opt.value) {
        <button
          type="button"
          role="radio"
          [disabled]="opt.disabled || disabled"
          [attr.aria-checked]="value === opt.value"
          (click)="selectOption(opt)"
          class="inline-flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
          [ngClass]="size === 'sm' ? 'px-2.5 py-1 text-xs rounded-[var(--ct-radius-sm)]' : 'px-3.5 py-1.5 text-xs sm:text-sm rounded-[var(--ct-radius-md)]'"
          [style]="value === opt.value
            ? { background: 'var(--ct-accent-primary)', color: 'var(--ct-accent-primary-fg)' }
            : { background: 'transparent', color: 'var(--ct-text-secondary)' }">
          @if (opt.icon) {
            <ct-icon [name]="opt.icon" [size]="size === 'sm' ? 13 : 15"></ct-icon>
          }
          <span>{{ opt.label }}</span>
        </button>
      }
    </div>
  `
})
export class SegmentedControlComponent<T = string> {
  @Input({ required: true }) options: CtSegmentedOption<T>[] = [];
  @Input() value!: T;
  @Input() ariaLabel?: string;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<T>();

  public selectOption(opt: CtSegmentedOption<T>): void {
    if (this.disabled || opt.disabled || this.value === opt.value) return;
    this.value = opt.value;
    this.valueChange.emit(opt.value);
  }
}
