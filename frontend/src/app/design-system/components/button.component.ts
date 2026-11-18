import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtIconName, IconComponent } from './icon.component';

export type CtButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type CtButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ct-button',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading ? 'true' : null"
      [attr.aria-label]="ariaLabel || null"
      [attr.title]="title || null"
      (click)="handleClick($event)"
      [ngClass]="buttonClasses"
      [style]="buttonStyles">
      @if (loading) {
        <ct-icon name="loader" [size]="iconSize" [spin]="true"></ct-icon>
      } @else if (leftIcon) {
        <ct-icon [name]="leftIcon" [size]="iconSize"></ct-icon>
      }
      <span class="inline-flex items-center gap-1.5">
        <ng-content></ng-content>
      </span>
      @if (!loading && rightIcon) {
        <ct-icon [name]="rightIcon" [size]="iconSize"></ct-icon>
      }
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: CtButtonVariant = 'primary';
  @Input() size: CtButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;
  @Input() leftIcon?: CtIconName;
  @Input() rightIcon?: CtIconName;
  @Input() title?: string;
  @Input() ariaLabel?: string;

  @Output() pressed = new EventEmitter<MouseEvent>();

  public get iconSize(): number {
    if (this.size === 'sm') return 14;
    if (this.size === 'lg') return 18;
    return 16;
  }

  public get buttonClasses(): string {
    const base =
      'inline-flex items-center justify-center gap-2 font-bold border transition-all select-none whitespace-nowrap cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
    const sizeCls =
      this.size === 'sm'
        ? 'px-3 py-1.5 text-xs rounded-[var(--ct-radius-md)]'
        : this.size === 'lg'
          ? 'px-5 py-3 text-sm rounded-[var(--ct-radius-lg)]'
          : 'px-4 py-2 text-xs sm:text-sm rounded-[var(--ct-radius-md)]';
    const widthCls = this.fullWidth ? 'w-full' : '';
    return `${base} ${sizeCls} ${widthCls}`;
  }

  public get buttonStyles(): Record<string, string> {
    switch (this.variant) {
      case 'primary':
        return {
          background: 'var(--ct-accent-primary)',
          color: 'var(--ct-accent-primary-fg)',
          'border-color': 'var(--ct-accent-primary)'
        };
      case 'secondary':
        return {
          background: 'var(--ct-bg-elevated)',
          color: 'var(--ct-text-primary)',
          'border-color': 'var(--ct-border-strong)'
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--ct-text-secondary)',
          'border-color': 'transparent'
        };
      case 'danger':
        return {
          background: 'var(--ct-danger-bg)',
          color: '#ffffff',
          'border-color': 'var(--ct-danger-bg)'
        };
    }
  }

  public handleClick(event: MouseEvent): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.pressed.emit(event);
  }
}
