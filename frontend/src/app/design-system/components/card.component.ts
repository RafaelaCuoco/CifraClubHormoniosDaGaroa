import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CtCardVariant = 'default' | 'elevated' | 'interactive';
export type CtCardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'ct-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="border rounded-[var(--ct-radius-xl)] transition-all"
      [ngClass]="paddingClasses"
      [style]="cardStyles">
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  @Input() variant: CtCardVariant = 'default';
  @Input() padding: CtCardPadding = 'md';

  public get paddingClasses(): string {
    switch (this.padding) {
      case 'none':
        return '';
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-5 sm:p-6';
      case 'md':
      default:
        return 'p-4 sm:p-5';
    }
  }

  public get cardStyles(): Record<string, string> {
    const baseBg = this.variant === 'elevated' ? 'var(--ct-bg-elevated)' : 'var(--ct-bg-surface)';
    const shadow = this.variant === 'elevated' ? 'var(--ct-shadow-lg)' : 'var(--ct-shadow-md)';
    return {
      background: baseBg,
      'border-color': 'var(--ct-border-default)',
      'box-shadow': shadow
    };
  }
}
