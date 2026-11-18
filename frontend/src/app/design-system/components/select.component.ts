import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from './icon.component';

export interface CtSelectOption<T = string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface CtSelectGroup<T = string | number> {
  label: string;
  options: CtSelectOption<T>[];
}

let nextSelectId = 1;

@Component({
  selector: 'ct-select',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1">
      @if (label) {
        <label
          [attr.for]="selectId"
          class="text-xs font-bold uppercase tracking-wider"
          style="color: var(--ct-text-muted);">
          {{ label }}
        </label>
      }
      <div class="relative inline-flex items-center w-full">
        <select
          [id]="selectId"
          [name]="name || selectId"
          [disabled]="disabled"
          [attr.aria-label]="ariaLabel || label || placeholder || 'Selecionar opção'"
          [ngModel]="value"
          (ngModelChange)="onValueChange($event)"
          (blur)="onTouched()"
          class="ct-native-select w-full border font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pr-9"
          [ngClass]="size === 'sm' ? 'px-2.5 py-1.5 text-xs rounded-[var(--ct-radius-md)]' : 'px-3.5 py-2 text-xs sm:text-sm rounded-[var(--ct-radius-md)]'"
          style="background: var(--ct-bg-elevated); color: var(--ct-text-primary); border-color: var(--ct-border-strong);">
          @if (placeholder) {
            <option [ngValue]="null" disabled>{{ placeholder }}</option>
          }
          @for (opt of options; track opt.value) {
            <option [ngValue]="opt.value" [disabled]="opt.disabled">{{ opt.label }}</option>
          }
          @for (grp of groups; track grp.label) {
            <optgroup [label]="grp.label">
              @for (opt of grp.options; track opt.value) {
                <option [ngValue]="opt.value" [disabled]="opt.disabled">{{ opt.label }}</option>
              }
            </optgroup>
          }
        </select>
        <span
          class="pointer-events-none absolute right-2.5 inline-flex items-center"
          style="color: var(--ct-text-muted);">
          <ct-icon name="chevron-down" [size]="15"></ct-icon>
        </span>
      </div>
    </div>
  `
})
export class SelectComponent<T = unknown> implements ControlValueAccessor {
  @Input() label?: string;
  @Input() ariaLabel?: string;
  @Input() name?: string;
  @Input() placeholder?: string;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() disabled = false;
  @Input() options: CtSelectOption<T>[] = [];
  @Input() groups: CtSelectGroup<T>[] = [];
  @Input() value: T | null = null;

  @Output() valueChange = new EventEmitter<T>();

  public readonly selectId = `ct-select-${nextSelectId++}`;

  private onChange: (val: T | null) => void = () => {};
  public onTouched: () => void = () => {};

  public writeValue(val: T | null): void {
    this.value = val;
  }

  public registerOnChange(fn: (val: T | null) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  public onValueChange(nextVal: T): void {
    this.value = nextVal;
    this.onChange(nextVal);
    this.valueChange.emit(nextVal);
  }
}
