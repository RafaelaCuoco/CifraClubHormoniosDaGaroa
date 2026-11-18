import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent, PT_BR_GLOSSARY } from '../../design-system';

@Component({
  selector: 'ct-visibility-badge',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <ct-badge
      [variant]="isPublic !== false ? 'success' : 'warning'"
      [size]="size"
      [icon]="isPublic !== false ? 'globe' : 'lock'">
      {{ isPublic !== false ? glossary.visibility.public : glossary.visibility.private }}
    </ct-badge>
  `
})
export class VisibilityBadgeComponent {
  @Input() isPublic: boolean | undefined = true;
  @Input() size: 'sm' | 'md' = 'sm';

  public readonly glossary = PT_BR_GLOSSARY;
}
