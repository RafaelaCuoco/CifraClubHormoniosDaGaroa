import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

let nextToggleId = 1;

@Component({
  selector: 'ct-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inline-flex items-center gap-3">
      <button
        [id]="toggleId"
        type="button"
        role="switch"
        [disabled]="disabled"
        [attr.aria-checked]="checked"
        [attr.aria-label]="ariaLabel || label || 'Alternar opção'"
        (click)="onToggle()"
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        [style]="checked
          ? { background: 'var(--ct-accent-secondary)', 'border-color': 'var(--ct-accent-secondary)' }
          : { background: 'var(--ct-bg-subtle)', 'border-color': 'var(--ct-border-strong)' }">
        <span
          class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
          [class.translate-x-6]="checked"
          [class.translate-x-1]="!checked">
        </span>
      </button>
      @if (label || description) {
        <label
          [attr.for]="toggleId"
          class="flex flex-col cursor-pointer select-none"
          [class.opacity-50]="disabled">
          @if (label) {
            <span class="text-xs sm:text-sm font-bold" style="color: var(--ct-text-primary);">
              {{ label }}
            </span>
          }
          @if (description) {
            <span class="text-xs" style="color: var(--ct-text-muted);">
              {{ description }}
            </span>
          }
        </label>
      }
    </div>
  `
})
export class ToggleComponent {
  @Input() checked = false;
  @Input() label?: string;
  @Input() description?: string;
  @Input() ariaLabel?: string;
  @Input() disabled = false;

  @Output() checkedChange = new EventEmitter<boolean>();

  public readonly toggleId = `ct-toggle-${nextToggleId++}`;

  public onToggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }
}
