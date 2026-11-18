import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { canEditSong as checkCanEditSong } from '../helpers/permission.helper';
import {
  PendingRegistrationItem,
  TransicionaisLoginResponse,
  TransicionaisRegisterPayload,
  TransicionaisRegisterResponse,
  TransicionaisUserSession
} from '../models/playlist.model';
import { AuthService } from '../services/auth.service';
import { PT_BR_GLOSSARY } from '../../design-system';

export type AuthModalMode = 'login' | 'register' | 'pending';

export interface AuthGateReason {
  actionLabel: string;
  explanation: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  private readonly authService = inject(AuthService);

  public readonly currentUser$: Observable<TransicionaisUserSession | null> = this.authService.currentUser$;
  public readonly modalOpen$: Observable<boolean> = this.authService.loginModalOpen$;
  public readonly modalMode$: Observable<AuthModalMode> = this.authService.authModalMode$;

  private readonly gatePromptOpenSubject = new BehaviorSubject<boolean>(false);
  public readonly gatePromptOpen$ = this.gatePromptOpenSubject.asObservable();

  private readonly gateReasonSubject = new BehaviorSubject<AuthGateReason | null>(null);
  public readonly gateReason$ = this.gateReasonSubject.asObservable();

  private pendingGateCallback: (() => void) | null = null;

  public isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  public getCurrentUser(): TransicionaisUserSession | null {
    return this.authService.getCurrentUserValue();
  }

  /**
   * Garante autenticação antes de executar um recurso controlado.
   * Se o usuário for anônimo, abre o AuthGate com explicação clara antes do modal de acesso.
   */
  public requireAuth(
    actionLabel: string,
    explanation: string,
    action: () => void
  ): void {
    if (this.isLoggedIn()) {
      action();
      return;
    }
    this.pendingGateCallback = action;
    this.gateReasonSubject.next({ actionLabel, explanation });
    this.gatePromptOpenSubject.next(true);
  }

  public proceedFromGateToModal(mode: AuthModalMode = 'login'): void {
    const callback = this.pendingGateCallback;
    this.gatePromptOpenSubject.next(false);
    this.authService.openLoginModal(mode, callback || undefined);
  }

  public dismissGate(): void {
    this.gatePromptOpenSubject.next(false);
    this.gateReasonSubject.next(null);
    this.pendingGateCallback = null;
  }

  public openModal(mode: AuthModalMode = 'login', reason?: AuthGateReason): void {
    if (reason) {
      this.gateReasonSubject.next(reason);
    }
    this.gatePromptOpenSubject.next(false);
    this.authService.openLoginModal(mode);
  }

  public setModalMode(mode: AuthModalMode): void {
    this.authService.setModalMode(mode);
  }

  public closeModal(clearPending = true): void {
    if (clearPending) {
      this.pendingGateCallback = null;
      this.gateReasonSubject.next(null);
    }
    this.authService.closeLoginModal(clearPending);
  }

  public consumePendingAction(): void {
    this.gateReasonSubject.next(null);
    this.pendingGateCallback = null;
    this.authService.consumePendingAction();
  }

  public login(
    username: string,
    password: string,
    customId?: string,
    displayName?: string
  ): Observable<TransicionaisLoginResponse> {
    return this.authService.login(username, password, customId, displayName);
  }

  public selectOrganization(selectionToken: string, customId: string): Observable<TransicionaisLoginResponse> {
    return this.authService.selectOrganization(selectionToken, customId);
  }

  public register(payload: TransicionaisRegisterPayload): Observable<TransicionaisRegisterResponse> {
    return this.authService.register(payload);
  }

  public checkRegistrationStatus(usernameOrEmail: string, inviteToken?: string): Observable<any> {
    return this.authService.checkRegistrationStatus(usernameOrEmail, inviteToken);
  }

  public validateRegistration(
    usernameOrEmail: string,
    code: string,
    inviteToken?: string,
    password?: string
  ): Observable<TransicionaisLoginResponse> {
    return this.authService.validateRegistration(usernameOrEmail, code, inviteToken, password);
  }

  public getPendingRegistrations(): Observable<PendingRegistrationItem[]> {
    return this.authService.getPendingRegistrations();
  }

  public approveRegistration(id: number): Observable<any> {
    return this.authService.approveRegistration(id);
  }

  public logout(): void {
    this.authService.logout();
  }

  public canEditSong(song: { creatorUserId?: string | null } | null): boolean {
    return checkCanEditSong(song, this.getCurrentUser());
  }

  public static readonly REASONS = {
    edit: {
      actionLabel: PT_BR_GLOSSARY.auth.loginToEdit,
      explanation: 'Entre com sua conta para editar letras, acordes, tablaturas e visibilidade desta cifra.'
    },
    vote: {
      actionLabel: PT_BR_GLOSSARY.auth.loginToVote,
      explanation: 'Entre com sua conta para registrar votos nas músicas da playlist.'
    },
    create: {
      actionLabel: PT_BR_GLOSSARY.auth.loginToCreate,
      explanation: 'Entre com sua conta para criar novas cifras, importar playlists ou gerar páginas de notas.'
    }
  } as const;
}
