import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtIconName, IconComponent } from './icon.component';
import { IconButtonComponent } from './icon-button.component';
import { CtToastVariant, ToastService } from './toast.service';

@Component({
  selector: 'ct-toast-container',
  standalone: true,
  imports: [CommonModule, IconComponent, IconButtonComponent],
  template: `
    <div
      aria-live="polite"
      aria-atomic="true"
      class="fixed bottom-4 right-4 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      style="z-index: var(--ct-z-toast);">
      @for (toast of (toastService.toasts$ | async) || []; track toast.id) {
        <div
          role="status"
          class="pointer-events-auto border rounded-[var(--ct-radius-lg)] p-3.5 flex items-start gap-3"
          [style]="toastStyles(toast.variant)">
          <ct-icon [name]="iconFor(toast.variant)" [size]="18"></ct-icon>
          <div class="min-w-0 flex-1">
            @if (toast.title) {
              <div class="text-xs font-black">{{ toast.title }}</div>
            }
            <div class="text-xs font-semibold">{{ toast.message }}</div>
          </div>
          <ct-icon-button
            icon="x"
            ariaLabel="Dispensar notificação"
            variant="ghost"
            size="sm"
            (pressed)="toastService.dismiss(toast.id)">
          </ct-icon-button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  public readonly toastService = inject(ToastService);

  public iconFor(variant: CtToastVariant): CtIconName {
    switch (variant) {
      case 'success':
        return 'check-circle';
      case 'error':
      case 'warning':
        return 'alert-triangle';
      case 'info':
      default:
        return 'info';
    }
  }

  public toastStyles(variant: CtToastVariant): Record<string, string> {
    const map: Record<CtToastVariant, { bg: string; fg: string; border: string }> = {
      success: {
        bg: 'var(--ct-bg-surface)',
        fg: 'var(--ct-success-fg)',
        border: 'var(--ct-success-border)'
      },
      error: {
        bg: 'var(--ct-bg-surface)',
        fg: 'var(--ct-danger-fg)',
        border: 'var(--ct-danger-border)'
      },
      warning: {
        bg: 'var(--ct-bg-surface)',
        fg: 'var(--ct-warning-fg)',
        border: 'var(--ct-warning-border)'
      },
      info: {
        bg: 'var(--ct-bg-surface)',
        fg: 'var(--ct-info-fg)',
        border: 'var(--ct-info-border)'
      }
    };
    const token = map[variant];
    return {
      background: token.bg,
      color: token.fg,
      'border-color': token.border,
      'box-shadow': 'var(--ct-shadow-lg)'
    };
  }
}
