import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtIconName, IconComponent } from './icon.component';
import { IconButtonComponent } from './icon-button.component';

@Component({
  selector: 'ct-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, IconButtonComponent],
  template: `
    @if (open) {
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title"
        class="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm"
        style="z-index: var(--ct-z-modal); background: var(--ct-bg-overlay);"
        (click)="onBackdropClick($event)">
        <div
          class="w-full border rounded-[var(--ct-radius-2xl)] p-5 sm:p-6 space-y-4 my-8"
          [ngClass]="size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'"
          style="background: var(--ct-bg-surface); border-color: var(--ct-border-strong); box-shadow: var(--ct-shadow-lg);"
          (click)="$event.stopPropagation()">
          <div
            class="flex items-start justify-between gap-3 pb-3 border-b"
            style="border-color: var(--ct-border-default);">
            <div class="min-w-0">
              <h3
                class="text-base sm:text-lg font-black flex items-center gap-2"
                style="color: var(--ct-text-primary);">
                @if (icon) {
                  <ct-icon [name]="icon" [size]="18"></ct-icon>
                }
                <span>{{ title }}</span>
              </h3>
              @if (subtitle) {
                <p class="text-xs mt-0.5" style="color: var(--ct-text-muted);">
                  {{ subtitle }}
                </p>
              }
            </div>
            <ct-icon-button
              icon="x"
              ariaLabel="Fechar janela"
              variant="ghost"
              size="sm"
              (pressed)="close()">
            </ct-icon-button>
          </div>
          <div>
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() icon?: CtIconName;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() closeOnBackdrop = true;

  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  public onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop && event.target === event.currentTarget) {
      this.close();
    }
  }

  public close(): void {
    this.closed.emit();
  }
}
