import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtButtonSize, CtButtonVariant } from './button.component';
import { CtIconName, IconComponent } from './icon.component';

@Component({
  selector: 'ct-icon-button',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [attr.aria-label]="ariaLabel"
      [attr.title]="title || ariaLabel"
      [attr.aria-pressed]="pressedState !== undefined ? pressedState : null"
      (click)="handleClick($event)"
      [ngClass]="buttonClasses"
      [style]="buttonStyles">
      <ct-icon
        [name]="loading ? 'loader' : icon"
        [size]="iconSize"
        [spin]="loading">
      </ct-icon>
    </button>
  `
})
export class IconButtonComponent {
  @Input({ required: true }) icon!: CtIconName;
  @Input({ required: true }) ariaLabel!: string;
  @Input() variant: CtButtonVariant = 'secondary';
  @Input() size: CtButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() pressedState?: boolean;
  @Input() title?: string;

  @Output() pressed = new EventEmitter<MouseEvent>();

  public get iconSize(): number {
    if (this.size === 'sm') return 14;
    if (this.size === 'lg') return 20;
    return 16;
  }

  public get buttonClasses(): string {
    const base =
      'inline-flex items-center justify-center border transition-all select-none shrink-0 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
    const dim =
      this.size === 'sm'
        ? 'w-7 h-7 rounded-[var(--ct-radius-sm)]'
        : this.size === 'lg'
          ? 'w-10 h-10 rounded-[var(--ct-radius-lg)]'
          : 'w-9 h-9 rounded-[var(--ct-radius-md)]';
    return `${base} ${dim}`;
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
