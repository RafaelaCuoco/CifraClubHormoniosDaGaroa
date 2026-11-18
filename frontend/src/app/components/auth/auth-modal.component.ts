import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../../core/stores/auth.store';
import { PlaylistService } from '../../core/services/playlist.service';
import {
  PendingRegistrationItem,
  TransicionaisOrganizationOption
} from '../../core/models/playlist.model';
import {
  BadgeComponent,
  ButtonComponent,
  IconComponent,
  ModalComponent,
  PT_BR_GLOSSARY
} from '../../design-system';

@Component({
  selector: 'ct-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, BadgeComponent, IconComponent],
  template: `
    <ct-modal
      [open]="(authStore.modalOpen$ | async) === true"
      title="Acesso à Conta"
      [subtitle]="(authStore.gateReason$ | async)?.explanation || 'Entre, crie sua conta ou acompanhe a validação do seu acesso.'"
      icon="lock"
      (closed)="onClose()">

      <!-- Abas do Modal -->
      <div
        class="grid grid-cols-3 gap-1.5 p-1 rounded-[var(--ct-radius-md)] border mb-4"
        style="background: var(--ct-bg-canvas); border-color: var(--ct-border-default);">
        <button
          type="button"
          (click)="clearMessages(); authStore.setModalMode('login')"
          class="py-2 rounded-[var(--ct-radius-sm)] text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
          [style]="(authStore.modalMode$ | async) === 'login'
            ? { background: 'var(--ct-accent-secondary)', color: 'var(--ct-accent-secondary-fg)' }
            : { background: 'transparent', color: 'var(--ct-text-muted)' }">
          <ct-icon name="log-in" [size]="13"></ct-icon>
          <span>{{ glossary.auth.login }}</span>
        </button>
        <button
          type="button"
          (click)="clearMessages(); authStore.setModalMode('register')"
          class="py-2 rounded-[var(--ct-radius-sm)] text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
          [style]="(authStore.modalMode$ | async) === 'register'
            ? { background: 'var(--ct-accent-primary)', color: 'var(--ct-accent-primary-fg)' }
            : { background: 'transparent', color: 'var(--ct-text-muted)' }">
          <ct-icon name="user-plus" [size]="13"></ct-icon>
          <span>{{ glossary.auth.register }}</span>
        </button>
        <button
          type="button"
          (click)="clearMessages(); authStore.setModalMode('pending'); loadPendingRegistrationsForAdmin()"
          class="py-2 rounded-[var(--ct-radius-sm)] text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
          [style]="(authStore.modalMode$ | async) === 'pending'
            ? { background: 'var(--ct-warning-bg)', color: 'var(--ct-warning-fg)' }
            : { background: 'transparent', color: 'var(--ct-text-muted)' }">
          <ct-icon name="clock" [size]="13"></ct-icon>
          <span>{{ glossary.auth.validation }}</span>
        </button>
      </div>

      @if (loginError) {
        <div
          class="px-3.5 py-2.5 rounded-[var(--ct-radius-md)] border text-xs font-semibold mb-3 flex items-center gap-2"
          style="background: var(--ct-danger-soft-bg); border-color: var(--ct-danger-border); color: var(--ct-danger-fg);">
          <ct-icon name="alert-triangle" [size]="15"></ct-icon>
          <span>{{ loginError }}</span>
        </div>
      }

      @if (loginFeedback) {
        <div
          class="px-3.5 py-2.5 rounded-[var(--ct-radius-md)] border text-xs font-semibold mb-3 flex items-center gap-2"
          style="background: var(--ct-success-bg); border-color: var(--ct-success-border); color: var(--ct-success-fg);">
          <ct-icon name="check-circle" [size]="15"></ct-icon>
          <span>{{ loginFeedback }}</span>
        </div>
      }

      <!-- ABA 1: ENTRAR -->
      @if ((authStore.modalMode$ | async) === 'login') {
        @if (pendingSelectionToken && availableOrganizations.length > 0) {
          <div class="space-y-3">
            <p class="text-xs sm:text-sm font-semibold" style="color: var(--ct-text-secondary);">
              Sua conta possui vínculo com mais de uma organização. Escolha com qual perfil deseja entrar:
            </p>
            <div class="space-y-2">
              @for (org of availableOrganizations; track org.customId) {
                <button
                  type="button"
                  (click)="onSelectTransicionaisOrg(org.customId)"
                  [disabled]="isLoggingIn"
                  class="w-full p-3 rounded-[var(--ct-radius-md)] border flex items-center justify-between text-left transition-all cursor-pointer"
                  style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong);">
                  <div>
                    <div class="text-sm font-black" style="color: var(--ct-text-primary);">{{ org.name }}</div>
                    <div class="text-xs" style="color: var(--ct-text-muted);">ID: {{ org.customId }}</div>
                  </div>
                  <ct-badge variant="success" size="sm">{{ org.role }}</ct-badge>
                </button>
              }
            </div>
          </div>
        } @else {
          <div class="space-y-3">
            @if (isLocalDev) {
              <div
                class="flex items-center justify-between border rounded-[var(--ct-radius-md)] px-3 py-2"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default);">
                <span class="text-[11px]" style="color: var(--ct-text-muted);">
                  Atalho local de desenvolvimento:
                </span>
                <button
                  type="button"
                  (click)="fillDocsCredentials()"
                  class="text-xs font-black hover:underline cursor-pointer bg-transparent border-0"
                  style="color: var(--ct-success-fg);">
                  Preencher usuário docs
                </button>
              </div>
            }

            <div>
              <label for="modal-login-username" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">
                Usuário ou E-mail
              </label>
              <input
                id="modal-login-username"
                name="loginUsername"
                type="text"
                [(ngModel)]="loginUsername"
                (keyup.enter)="onSubmitTransicionaisLogin()"
                placeholder="Seu usuário ou e-mail"
                class="w-full border rounded-[var(--ct-radius-md)] px-3.5 py-2.5 text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="modal-login-password" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">
                Senha
              </label>
              <input
                id="modal-login-password"
                name="loginPassword"
                type="password"
                [(ngModel)]="loginPassword"
                (keyup.enter)="onSubmitTransicionaisLogin()"
                placeholder="Digite sua senha"
                class="w-full border rounded-[var(--ct-radius-md)] px-3.5 py-2.5 text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label for="modal-login-display-name" class="block text-xs font-bold mb-1" style="color: var(--ct-text-muted);">
                  Nome do Perfil (Opcional)
                </label>
                <input
                  id="modal-login-display-name"
                  name="loginDisplayName"
                  type="text"
                  [(ngModel)]="loginDisplayName"
                  placeholder="Ex: Rafaela Cuoco"
                  class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs"
                  style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default); color: var(--ct-text-primary);" />
              </div>

              <div>
                <label for="modal-login-custom-id" class="block text-xs font-bold mb-1" style="color: var(--ct-text-muted);">
                  Organização (<code>customId</code>)
                </label>
                <input
                  id="modal-login-custom-id"
                  name="loginCustomId"
                  type="text"
                  [(ngModel)]="loginCustomId"
                  placeholder="Ex: Hormônios da Garoa"
                  class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs"
                  style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default); color: var(--ct-text-primary);" />
              </div>
            </div>

            <div class="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                (click)="authStore.setModalMode('register')"
                class="text-xs font-bold hover:underline cursor-pointer bg-transparent border-0 inline-flex items-center gap-1"
                style="color: var(--ct-accent-highlight);">
                <span>Não tem conta? {{ glossary.auth.register }}</span>
                <ct-icon name="arrow-right" [size]="13"></ct-icon>
              </button>
              <ct-button
                variant="primary"
                leftIcon="log-in"
                [loading]="isLoggingIn"
                (pressed)="onSubmitTransicionaisLogin()">
                {{ isLoggingIn ? 'Autenticando...' : glossary.auth.login }}
              </ct-button>
            </div>
          </div>
        }
      }

      <!-- ABA 2: CRIAR CONTA -->
      @if ((authStore.modalMode$ | async) === 'register') {
        <div class="space-y-3">
          <p class="text-xs" style="color: var(--ct-text-muted);">
            Preencha seus dados para criar sua conta. Após o envio, o acesso entrará na fila de validação.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label for="modal-reg-name" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">Nome Completo / Artístico *</label>
              <input
                id="modal-reg-name"
                name="regName"
                type="text"
                [(ngModel)]="regName"
                placeholder="Ex: Carol Oliveira"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs sm:text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="modal-reg-username" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">Usuário *</label>
              <input
                id="modal-reg-username"
                name="regUsername"
                type="text"
                [(ngModel)]="regUsername"
                placeholder="Ex: carol.oliveira"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs sm:text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label for="modal-reg-email" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">E-mail *</label>
              <input
                id="modal-reg-email"
                name="regEmail"
                type="email"
                [(ngModel)]="regEmail"
                placeholder="Ex: carol@email.com"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs sm:text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="modal-reg-phone" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">Telefone / WhatsApp</label>
              <input
                id="modal-reg-phone"
                name="regPhone"
                type="text"
                [(ngModel)]="regPhone"
                placeholder="Ex: 11999990000"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs sm:text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label for="modal-reg-password" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">Senha *</label>
              <input
                id="modal-reg-password"
                name="regPassword"
                type="password"
                [(ngModel)]="regPassword"
                placeholder="Crie uma senha"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs sm:text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="modal-reg-confirm-password" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">Confirmar Senha *</label>
              <input
                id="modal-reg-confirm-password"
                name="regConfirmPassword"
                type="password"
                [(ngModel)]="regConfirmPassword"
                placeholder="Repita a senha"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs sm:text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label for="modal-reg-custom-id" class="block text-xs font-bold mb-1" style="color: var(--ct-text-muted);">Organização / Bloco</label>
              <input
                id="modal-reg-custom-id"
                name="regCustomId"
                type="text"
                [(ngModel)]="regCustomId"
                placeholder="Ex: Hormônios da Garoa"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="modal-reg-invite-code" class="block text-xs font-bold mb-1" style="color: var(--ct-text-muted);">Código de Convite (Opcional)</label>
              <input
                id="modal-reg-invite-code"
                name="regInviteCode"
                type="text"
                [(ngModel)]="regInviteCode"
                placeholder="Ex: 482913"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default); color: var(--ct-text-primary);" />
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2">
            <ct-button
              variant="primary"
              leftIcon="user-plus"
              [loading]="isRegistering"
              (pressed)="onSubmitRegister()">
              {{ isRegistering ? 'Criando conta...' : glossary.auth.register }}
            </ct-button>
          </div>
        </div>
      }

      <!-- ABA 3: VALIDAÇÃO -->
      @if ((authStore.modalMode$ | async) === 'pending') {
        <div class="space-y-4">
          <div
            class="p-4 rounded-[var(--ct-radius-lg)] border space-y-2"
            style="background: var(--ct-warning-bg); border-color: var(--ct-warning-border);">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5" style="color: var(--ct-warning-fg);">
                <ct-icon name="clock" [size]="14"></ct-icon>
                <span>Aguardo de Validação</span>
              </span>
              <ct-badge [variant]="pendingStatus === 'ACTIVE' ? 'success' : 'warning'" size="sm">
                {{ pendingStatus === 'ACTIVE' ? 'VALIDADO (ATIVO)' : 'AGUARDANDO VALIDAÇÃO' }}
              </ct-badge>
            </div>
            <p class="text-xs" style="color: var(--ct-text-secondary);">
              Consulte o status da sua conta ou insira o código de validação de 6 dígitos para liberar seu acesso.
            </p>
            @if (pendingValidationCodeHint) {
              <div
                class="p-2.5 rounded-[var(--ct-radius-md)] border text-xs flex items-center justify-between"
                style="background: var(--ct-bg-surface); border-color: var(--ct-success-border); color: var(--ct-success-fg);">
                <span>Código gerado para <strong>{{ pendingUsernameOrEmail }}</strong>:</span>
                <span class="font-mono font-black text-sm px-2 py-0.5 rounded" style="background: var(--ct-success-bg);">
                  {{ pendingValidationCodeHint }}
                </span>
              </div>
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label for="modal-pending-username" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">
                Seu Usuário ou E-mail
              </label>
              <input
                id="modal-pending-username"
                name="pendingUsername"
                type="text"
                [(ngModel)]="pendingUsernameOrEmail"
                placeholder="Ex: carol.oliveira"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs sm:text-sm"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="modal-validation-code" class="block text-xs font-bold mb-1" style="color: var(--ct-text-secondary);">
                Código de Validação (6 dígitos)
              </label>
              <input
                id="modal-validation-code"
                name="validationCode"
                type="text"
                [(ngModel)]="validationCodeInput"
                placeholder="Ex: 482913"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs sm:text-sm font-mono font-bold"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-success-fg);" />
            </div>
          </div>

          <div>
            <label for="modal-validation-invite-token" class="block text-xs font-bold mb-1" style="color: var(--ct-text-muted);">
              Token de Convite Externo (opcional)
            </label>
            <input
              id="modal-validation-invite-token"
              name="validationInviteToken"
              type="text"
              [(ngModel)]="validationInviteTokenInput"
              placeholder="Opcional: cole o token caso tenha recebido link de convite"
              class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-xs"
              style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default); color: var(--ct-text-primary);" />
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <ct-button
              variant="secondary"
              size="sm"
              leftIcon="refresh-cw"
              [loading]="isCheckingStatus"
              (pressed)="onCheckPendingStatus()">
              {{ isCheckingStatus ? 'Consultando...' : 'Atualizar Status' }}
            </ct-button>

            <ct-button
              variant="primary"
              size="sm"
              leftIcon="check"
              [loading]="isValidatingCode"
              (pressed)="onValidatePendingRegistration()">
              {{ isValidatingCode ? 'Validando...' : 'Validar Código e Entrar' }}
            </ct-button>
          </div>

          @if ((authStore.currentUser$ | async)?.role === 'admin' && pendingRegistrationsList.length > 0) {
            <div class="mt-4 pt-4 border-t space-y-2" style="border-color: var(--ct-border-default);">
              <span class="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style="color: var(--ct-success-fg);">
                <ct-icon name="shield" [size]="14"></ct-icon>
                <span>Painel Administrativo: Solicitações ({{ pendingRegistrationsList.length }})</span>
              </span>
              <div class="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                @for (item of pendingRegistrationsList; track item.id) {
                  <div
                    class="p-2.5 rounded-[var(--ct-radius-md)] border flex items-center justify-between gap-2 text-xs"
                    style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default);">
                    <div class="min-w-0">
                      <div class="font-bold truncate" style="color: var(--ct-text-primary);">
                        {{ item.name }} <span style="color: var(--ct-text-muted);">({{ item.username }})</span>
                      </div>
                      <div class="text-[11px]" style="color: var(--ct-text-muted);">
                        Código: <strong class="font-mono" style="color: var(--ct-warning-fg);">{{ item.validationCode }}</strong> • Status: {{ item.status }}
                      </div>
                    </div>
                    @if (item.status === 'PENDING_VALIDATION') {
                      <ct-button variant="primary" size="sm" leftIcon="check" (pressed)="onAdminApproveRegistration(item.id)">
                        Aprovar
                      </ct-button>
                    } @else {
                      <ct-badge variant="success" size="sm">Ativo</ct-badge>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </ct-modal>
  `
})
export class AuthModalComponent {
  public readonly authStore = inject(AuthStore);
  private readonly playlistService = inject(PlaylistService);
  public readonly glossary = PT_BR_GLOSSARY;

  public readonly isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  public loginUsername = '';
  public loginPassword = '';
  public loginDisplayName = '';
  public loginCustomId = '';
  public isLoggingIn = false;
  public loginError = '';
  public loginFeedback = '';

  public regName = '';
  public regUsername = '';
  public regEmail = '';
  public regPhone = '';
  public regCustomId = 'Hormônios da Garoa';
  public regPassword = '';
  public regConfirmPassword = '';
  public regInviteToken = '';
  public regInviteCode = '';
  public isRegistering = false;

  public pendingUsernameOrEmail = '';
  public pendingDisplayName = '';
  public pendingStatus = 'PENDING_VALIDATION';
  public pendingValidationCodeHint = '';
  public validationCodeInput = '';
  public validationInviteTokenInput = '';
  public isCheckingStatus = false;
  public isValidatingCode = false;
  public pendingRegistrationsList: PendingRegistrationItem[] = [];

  public pendingSelectionToken = '';
  public availableOrganizations: TransicionaisOrganizationOption[] = [];

  public clearMessages(): void {
    this.loginError = '';
    this.loginFeedback = '';
  }

  public onClose(): void {
    this.resetLoginModal();
    this.authStore.closeModal();
  }

  public fillDocsCredentials(): void {
    this.loginUsername = 'docs';
    this.loginPassword = 'bR@113581321';
    if (!this.loginDisplayName.trim()) {
      this.loginDisplayName = 'Rafaela (Transicionais)';
    }
    this.loginError = '';
  }

  public onSubmitTransicionaisLogin(): void {
    if (!this.loginUsername.trim() || !this.loginPassword) {
      this.loginError = 'Informe seu usuário/e-mail e senha.';
      return;
    }

    this.isLoggingIn = true;
    this.clearMessages();

    this.authStore
      .login(
        this.loginUsername.trim(),
        this.loginPassword,
        this.loginCustomId.trim() || undefined,
        this.loginDisplayName.trim() || undefined
      )
      .subscribe({
        next: res => {
          this.isLoggingIn = false;

          if (res.requiresValidation) {
            this.pendingUsernameOrEmail = res.username || this.loginUsername.trim();
            this.pendingDisplayName = res.name || res.username || '';
            this.pendingStatus = res.status || 'PENDING_VALIDATION';
            this.pendingValidationCodeHint = res.validationCode || '';
            this.validationCodeInput = res.validationCode || '';
            this.loginFeedback = res.message || 'Seu cadastro aguarda validação de login.';
            this.authStore.setModalMode('pending');
            return;
          }

          if (res.requiresOrgSelection && res.selectionToken && res.organizations) {
            this.pendingSelectionToken = res.selectionToken;
            this.availableOrganizations = res.organizations;
            return;
          }

          this.resetLoginModal();
          this.authStore.closeModal(false);
          this.playlistService.loadVoters().subscribe();
          this.authStore.consumePendingAction();
        },
        error: err => {
          this.isLoggingIn = false;
          this.loginError = err?.error?.message || 'Credenciais inválidas.';
        }
      });
  }

  public onSubmitRegister(): void {
    if (!this.regName.trim() || !this.regUsername.trim() || !this.regEmail.trim() || !this.regPassword) {
      this.loginError = 'Preencha Nome, Usuário, E-mail e Senha.';
      return;
    }

    if (this.regPassword !== this.regConfirmPassword) {
      this.loginError = 'A confirmação de senha não confere.';
      return;
    }

    this.isRegistering = true;
    this.clearMessages();

    this.authStore
      .register({
        name: this.regName.trim(),
        username: this.regUsername.trim(),
        email: this.regEmail.trim(),
        password: this.regPassword,
        confirmPassword: this.regConfirmPassword,
        phone: this.regPhone.trim() || undefined,
        customId: this.regCustomId.trim() || undefined,
        inviteToken: this.regInviteToken.trim() || undefined,
        inviteCode: this.regInviteCode.trim() || undefined
      })
      .subscribe({
        next: res => {
          this.isRegistering = false;
          this.pendingUsernameOrEmail = res.username || this.regUsername.trim();
          this.pendingDisplayName = res.name || this.regName.trim();
          this.pendingStatus = res.status;
          this.pendingValidationCodeHint = res.validationCode || '';
          this.validationCodeInput = res.validationCode || '';
          this.loginFeedback = res.message;
          this.authStore.setModalMode('pending');
          this.loadPendingRegistrationsForAdmin();
        },
        error: err => {
          this.isRegistering = false;
          this.loginError = err?.error?.message || 'Erro ao solicitar criação de conta.';
        }
      });
  }

  public onCheckPendingStatus(): void {
    if (!this.pendingUsernameOrEmail.trim()) {
      this.loginError = 'Informe seu usuário ou e-mail para consultar o status.';
      return;
    }

    this.isCheckingStatus = true;
    this.loginError = '';

    this.authStore
      .checkRegistrationStatus(
        this.pendingUsernameOrEmail.trim(),
        this.validationInviteTokenInput.trim() || undefined
      )
      .subscribe({
        next: res => {
          this.isCheckingStatus = false;
          this.pendingStatus = res.status || 'PENDING_VALIDATION';
          if (res.validationCode) {
            this.pendingValidationCodeHint = res.validationCode;
          }
          if (res.externalInviteCode) {
            this.pendingValidationCodeHint = res.externalInviteCode;
          }
          this.loginFeedback =
            this.pendingStatus === 'ACTIVE'
              ? 'Seu login já foi validado! Você já pode entrar.'
              : 'Seu cadastro ainda está aguardando validação. Insira o código abaixo para ativar.';
        },
        error: err => {
          this.isCheckingStatus = false;
          this.loginError = err?.error?.message || 'Cadastro não encontrado.';
        }
      });
  }

  public onValidatePendingRegistration(): void {
    if (!this.pendingUsernameOrEmail.trim() || !this.validationCodeInput.trim()) {
      this.loginError = 'Informe seu usuário/e-mail e o código de validação.';
      return;
    }

    this.isValidatingCode = true;
    this.loginError = '';

    this.authStore
      .validateRegistration(
        this.pendingUsernameOrEmail.trim(),
        this.validationCodeInput.trim(),
        this.validationInviteTokenInput.trim() || undefined,
        this.regPassword || undefined
      )
      .subscribe({
        next: () => {
          this.isValidatingCode = false;
          this.resetLoginModal();
          this.authStore.closeModal(false);
          this.playlistService.loadVoters().subscribe();
          this.authStore.consumePendingAction();
        },
        error: err => {
          this.isValidatingCode = false;
          this.loginError = err?.error?.message || 'Código de validação inválido.';
        }
      });
  }

  public loadPendingRegistrationsForAdmin(): void {
    if (this.authStore.getCurrentUser()?.role !== 'admin') return;
    this.authStore.getPendingRegistrations().subscribe({
      next: list => {
        this.pendingRegistrationsList = list || [];
      },
      error: () => {}
    });
  }

  public onAdminApproveRegistration(id: number): void {
    this.authStore.approveRegistration(id).subscribe({
      next: res => {
        this.loginFeedback = res.message || 'Cadastro aprovado!';
        this.loadPendingRegistrationsForAdmin();
        this.playlistService.loadVoters().subscribe();
      }
    });
  }

  public onSelectTransicionaisOrg(customId: string): void {
    if (!this.pendingSelectionToken || !customId) return;

    this.isLoggingIn = true;
    this.loginError = '';

    this.authStore.selectOrganization(this.pendingSelectionToken, customId).subscribe({
      next: () => {
        this.isLoggingIn = false;
        this.resetLoginModal();
        this.authStore.closeModal(false);
        this.playlistService.loadVoters().subscribe();
        this.authStore.consumePendingAction();
      },
      error: err => {
        this.isLoggingIn = false;
        this.loginError = err?.error?.message || 'Não foi possível abrir a sessão para esta organização.';
      }
    });
  }

  public resetLoginModal(): void {
    this.loginPassword = '';
    this.loginError = '';
    this.loginFeedback = '';
    this.pendingSelectionToken = '';
    this.availableOrganizations = [];
  }
}
