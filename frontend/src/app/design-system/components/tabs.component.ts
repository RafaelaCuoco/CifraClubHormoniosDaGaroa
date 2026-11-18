import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtIconName, IconComponent } from './icon.component';

export interface CtTabItem<T = string> {
  id: T;
  label: string;
  icon?: CtIconName;
  count?: number;
  disabled?: boolean;
}

@Component({
  selector: 'ct-tabs',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div
      role="tablist"
      [attr.aria-label]="ariaLabel || 'Abas de navegação'"
      class="flex items-center gap-1 p-1 border rounded-[var(--ct-radius-lg)] overflow-x-auto scrollbar-thin"
      style="background: var(--ct-bg-canvas); border-color: var(--ct-border-default);">
      @for (tab of items; track tab.id) {
        <button
          type="button"
          role="tab"
          [disabled]="tab.disabled"
          [attr.aria-selected]="activeId === tab.id"
          (click)="selectTab(tab)"
          class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-[var(--ct-radius-md)] transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          [style]="activeId === tab.id
            ? { background: 'var(--ct-accent-primary)', color: 'var(--ct-accent-primary-fg)' }
            : { background: 'transparent', color: 'var(--ct-text-secondary)' }">
          @if (tab.icon) {
            <ct-icon [name]="tab.icon" [size]="15"></ct-icon>
          }
          <span>{{ tab.label }}</span>
          @if (tab.count !== undefined) {
            <span
              class="px-1.5 py-0.5 rounded-full text-[10px] font-black"
              [style]="activeId === tab.id
                ? { background: 'rgba(255,255,255,0.2)', color: '#ffffff' }
                : { background: 'var(--ct-bg-subtle)', color: 'var(--ct-text-primary)' }">
              {{ tab.count }}
            </span>
          }
        </button>
      }
    </div>
  `
})
export class TabsComponent<T = string> {
  @Input({ required: true }) items: CtTabItem<T>[] = [];
  @Input() activeId!: T;
  @Input() ariaLabel?: string;

  @Output() activeIdChange = new EventEmitter<T>();

  public selectTab(tab: CtTabItem<T>): void {
    if (tab.disabled || this.activeId === tab.id) return;
    this.activeId = tab.id;
    this.activeIdChange.emit(tab.id);
  }
}
