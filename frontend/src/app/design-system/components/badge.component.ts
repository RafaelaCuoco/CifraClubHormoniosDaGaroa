import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtIconName, IconComponent } from './icon.component';

export type CtBadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'ct-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-full border font-bold whitespace-nowrap"
      [ngClass]="size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'"
      [style]="badgeStyles">
      @if (icon) {
        <ct-icon [name]="icon" [size]="size === 'sm' ? 12 : 13"></ct-icon>
      }
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  @Input() variant: CtBadgeVariant = 'neutral';
  @Input() size: 'sm' | 'md' = 'md';
  @Input() icon?: CtIconName;

  public get badgeStyles(): Record<string, string> {
    switch (this.variant) {
      case 'primary':
        return {
          background: 'var(--ct-accent-soft-bg)',
          color: 'var(--ct-accent-highlight)',
          'border-color': 'var(--ct-accent-soft-border)'
        };
      case 'success':
        return {
          background: 'var(--ct-success-bg)',
          color: 'var(--ct-success-fg)',
          'border-color': 'var(--ct-success-border)'
        };
      case 'warning':
        return {
          background: 'var(--ct-warning-bg)',
          color: 'var(--ct-warning-fg)',
          'border-color': 'var(--ct-warning-border)'
        };
      case 'danger':
        return {
          background: 'var(--ct-danger-soft-bg)',
          color: 'var(--ct-danger-fg)',
          'border-color': 'var(--ct-danger-border)'
        };
      case 'info':
        return {
          background: 'var(--ct-info-bg)',
          color: 'var(--ct-info-fg)',
          'border-color': 'var(--ct-info-border)'
        };
      case 'neutral':
      default:
        return {
          background: 'var(--ct-bg-elevated)',
          color: 'var(--ct-text-secondary)',
          'border-color': 'var(--ct-border-default)'
        };
    }
  }
}
