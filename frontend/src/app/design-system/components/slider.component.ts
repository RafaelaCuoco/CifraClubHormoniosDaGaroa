import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

let nextSliderId = 1;

@Component({
  selector: 'ct-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      <div class="flex items-center justify-between gap-2">
        @if (label) {
          <label
            [attr.for]="sliderId"
            class="text-xs font-bold uppercase tracking-wider"
            style="color: var(--ct-text-muted);">
            {{ label }}
          </label>
        }
        <span
          class="text-xs font-black font-mono px-2 py-0.5 rounded-[var(--ct-radius-sm)] border"
          style="background: var(--ct-bg-elevated); color: var(--ct-text-primary); border-color: var(--ct-border-default);">
          {{ formattedValue }}
        </span>
      </div>
      <input
        [id]="sliderId"
        [name]="name || sliderId"
        type="range"
        [min]="min"
        [max]="max"
        [step]="step"
        [disabled]="disabled"
        [attr.aria-label]="ariaLabel || label || 'Controle deslizante'"
        [ngModel]="value"
        (ngModelChange)="onInputChange($event)"
        class="w-full h-2 rounded-full cursor-pointer accent-[#c2410c] disabled:opacity-50 disabled:cursor-not-allowed"
        style="background: var(--ct-bg-subtle);" />
    </div>
  `
})
export class SliderComponent {
  @Input() label?: string;
  @Input() ariaLabel?: string;
  @Input() name?: string;
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() value = 0;
  @Input() unit = '';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<number>();

  public readonly sliderId = `ct-slider-${nextSliderId++}`;

  public get formattedValue(): string {
    return this.unit ? `${this.value} ${this.unit}` : String(this.value);
  }

  public onInputChange(raw: number | string): void {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      this.value = parsed;
      this.valueChange.emit(parsed);
    }
  }
}
