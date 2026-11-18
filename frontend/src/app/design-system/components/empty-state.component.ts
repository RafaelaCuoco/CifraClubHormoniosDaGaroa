import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtIconName, IconComponent } from './icon.component';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'ct-empty-state',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  template: `
    <div
      class="text-center py-10 px-6 border rounded-[var(--ct-radius-xl)] space-y-3"
      style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default);">
      <div
        class="w-12 h-12 mx-auto rounded-[var(--ct-radius-lg)] border flex items-center justify-center"
        style="background: var(--ct-accent-soft-bg); border-color: var(--ct-accent-soft-border); color: var(--ct-accent-highlight);">
        <ct-icon [name]="icon" [size]="22"></ct-icon>
      </div>
      <div class="space-y-1 max-w-md mx-auto">
        <h3 class="text-base sm:text-lg font-black" style="color: var(--ct-text-primary);">
          {{ title }}
        </h3>
        @if (description) {
          <p class="text-xs sm:text-sm" style="color: var(--ct-text-muted);">
            {{ description }}
          </p>
        }
      </div>
      @if (actionLabel) {
        <div class="pt-1">
          <ct-button variant="primary" size="md" [leftIcon]="actionIcon" (pressed)="action.emit()">
            {{ actionLabel }}
          </ct-button>
        </div>
      }
      <ng-content></ng-content>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon: CtIconName = 'music';
  @Input({ required: true }) title = '';
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Input() actionIcon?: CtIconName;

  @Output() action = new EventEmitter<void>();
}
