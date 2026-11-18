import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../core/stores/auth.store';
import { ButtonComponent, EmptyStateComponent, ModalComponent, PT_BR_GLOSSARY } from '../../design-system';

/**
 * AuthGate reutilizável em dois modos:
 * - inline: exibido no lugar de uma área controlada (ex: Estúdio, painel de importação).
 * - global (sem inputs): escuta authStore.gatePromptOpen$ para explicar o recurso bloqueado ao clicar.
 */
@Component({
  selector: 'ct-auth-gate',
  standalone: true,
  imports: [CommonModule, ButtonComponent, EmptyStateComponent, ModalComponent],
  template: `
    @if (mode === 'inline') {
      <ct-empty-state
        icon="lock"
        [title]="title"
        [description]="description">
        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <ct-button variant="primary" leftIcon="log-in" (pressed)="authStore.openModal('login', { actionLabel: title, explanation: description })">
            {{ glossary.auth.login }}
          </ct-button>
          <ct-button variant="secondary" leftIcon="user-plus" (pressed)="authStore.openModal('register', { actionLabel: title, explanation: description })">
            {{ glossary.auth.register }}
          </ct-button>
        </div>
      </ct-empty-state>
    } @else {
      @if ((authStore.gateReason$ | async); as reason) {
        <ct-modal
          [open]="(authStore.gatePromptOpen$ | async) === true"
          [title]="reason.actionLabel"
          subtitle="Recurso protegido para usuários autenticados"
          icon="lock"
          size="sm"
          (closed)="authStore.dismissGate()">
          <div class="space-y-4">
            <p class="text-xs sm:text-sm leading-relaxed" style="color: var(--ct-text-secondary);">
              {{ reason.explanation }}
            </p>
            <div class="flex flex-wrap items-center justify-end gap-2 pt-2">
              <ct-button variant="ghost" size="sm" (pressed)="authStore.dismissGate()">
                Agora não
              </ct-button>
              <ct-button variant="secondary" size="sm" leftIcon="user-plus" (pressed)="authStore.proceedFromGateToModal('register')">
                {{ glossary.auth.register }}
              </ct-button>
              <ct-button variant="primary" size="sm" leftIcon="log-in" (pressed)="authStore.proceedFromGateToModal('login')">
                {{ glossary.auth.login }}
              </ct-button>
            </div>
          </div>
        </ct-modal>
      }
    }
  `
})
export class AuthGateComponent {
  public readonly authStore = inject(AuthStore);
  public readonly glossary = PT_BR_GLOSSARY;

  @Input() mode: 'global' | 'inline' = 'global';
  @Input() title: string = PT_BR_GLOSSARY.auth.loginToCreate;
  @Input() description = 'Entre na sua conta para acessar este recurso.';
}
