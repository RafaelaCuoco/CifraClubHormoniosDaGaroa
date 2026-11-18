import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ct-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2" aria-hidden="true">
      @if (variant === 'text') {
        @for (line of lineArray; track $index) {
          <div
            class="h-3.5 rounded-[var(--ct-radius-sm)] animate-pulse"
            [style.width]="$last && lineArray.length > 1 ? '68%' : width"
            style="background: var(--ct-bg-subtle);">
          </div>
        }
      } @else if (variant === 'circle') {
        <div
          class="rounded-full animate-pulse"
          [style.width]="width || '40px'"
          [style.height]="height || '40px'"
          style="background: var(--ct-bg-subtle);">
        </div>
      } @else {
        <div
          class="rounded-[var(--ct-radius-lg)] animate-pulse"
          [style.width]="width || '100%'"
          [style.height]="height || (variant === 'card' ? '120px' : '44px')"
          style="background: var(--ct-bg-subtle);">
        </div>
      }
    </div>
  `
})
export class SkeletonComponent {
  @Input() variant: 'text' | 'card' | 'circle' | 'rect' = 'text';
  @Input() lines = 3;
  @Input() width = '100%';
  @Input() height?: string;

  public get lineArray(): number[] {
    return Array.from({ length: Math.max(1, this.lines) });
  }
}
