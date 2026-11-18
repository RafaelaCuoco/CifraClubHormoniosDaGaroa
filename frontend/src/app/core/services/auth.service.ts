import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { getApiBaseUrl } from '../helpers/api-config.helper';
import {
  TransicionaisLoginResponse,
  TransicionaisUserSession,
  TransicionaisRegisterPayload,
  TransicionaisRegisterResponse,
  PendingRegistrationItem,
  Voter
} from '../models/playlist.model';

const STORAGE_KEY = 'cifratrans_transicionais_session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${getApiBaseUrl()}/auth/transicionais`;

  private currentUserSubject = new BehaviorSubject<TransicionaisUserSession | null>(this.loadStoredSession());
  public currentUser$ = this.currentUserSubject.asObservable();

  private loginModalOpenSubject = new BehaviorSubject<boolean>(false);
  public loginModalOpen$ = this.loginModalOpenSubject.asObservable();

  private authModalModeSubject = new BehaviorSubject<'login' | 'register' | 'pending'>('login');
  public authModalMode$ = this.authModalModeSubject.asObservable();

  // Intenção pendente pós-login (executa automaticamente a tela/ação clicada pelo usuário antes de logar)
  private pendingActionCallback: (() => void) | null = null;

  public getCurrentUserValue(): TransicionaisUserSession | null {
    return this.currentUserSubject.getValue();
  }

  public isLoggedIn(): boolean {
    return !!this.currentUserSubject.getValue();
  }

  public getAuthHeaders(): HttpHeaders {
    const token = this.currentUserSubject.getValue()?.token;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  public requireAuthOrRun(action: () => void, mode: 'login' | 'register' | 'pending' = 'login'): void {
    if (this.isLoggedIn()) {
      action();
      return;
    }
    this.pendingActionCallback = action;
    this.openLoginModal(mode);
  }

  public openLoginModal(mode: 'login' | 'register' | 'pending' = 'login', pendingAction?: () => void): void {
    if (pendingAction) {
      this.pendingActionCallback = pendingAction;
    }
    this.authModalModeSubject.next(mode);
    this.loginModalOpenSubject.next(true);
  }

  public setModalMode(mode: 'login' | 'register' | 'pending'): void {
    this.authModalModeSubject.next(mode);
  }

  public closeLoginModal(clearPending = true): void {
    if (clearPending) {
      this.pendingActionCallback = null;
    }
    this.loginModalOpenSubject.next(false);
  }

  public consumePendingAction(): void {
    const fn = this.pendingActionCallback;
    this.pendingActionCallback = null;
    if (fn) {
      setTimeout(() => fn(), 50);
    }
  }

  public register(payload: TransicionaisRegisterPayload): Observable<TransicionaisRegisterResponse> {
    return this.http.post<TransicionaisRegisterResponse>(`${this.baseUrl}/register`, payload);
  }

  public checkRegistrationStatus(usernameOrEmail: string, inviteToken?: string): Observable<any> {
    let url = `${this.baseUrl}/registration-status?usernameOrEmail=${encodeURIComponent(usernameOrEmail)}`;
    if (inviteToken) {
      url += `&inviteToken=${encodeURIComponent(inviteToken)}`;
    }
    return this.http.get<any>(url);
  }

  public validateRegistration(
    usernameOrEmail: string,
    code: string,
    inviteToken?: string,
    password?: string
  ): Observable<TransicionaisLoginResponse> {
    return this.http.post<TransicionaisLoginResponse>(`${this.baseUrl}/validate-registration`, {
      usernameOrEmail,
      code,
      inviteToken: inviteToken || null,
      password: password || null
    }).pipe(
      tap(res => {
        if (res && res.token) {
          this.saveSession(res);
        }
      })
    );
  }

  public getPendingRegistrations(): Observable<PendingRegistrationItem[]> {
    return this.http.get<PendingRegistrationItem[]>(
      `${this.baseUrl}/pending-registrations`,
      { headers: this.getAuthHeaders() }
    );
  }

  public approveRegistration(id: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/approve-registration/${id}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  public login(
    username: string,
    password: string,
    customId?: string,
    displayName?: string
  ): Observable<TransicionaisLoginResponse> {
    return this.http.post<TransicionaisLoginResponse>(`${this.baseUrl}/login`, {
      username,
      password,
      customId: customId || null,
      displayName: displayName || null
    }).pipe(
      tap(res => {
        if (!res.requiresOrgSelection && !res.requiresValidation && res.token) {
          this.saveSession(res);
        }
      })
    );
  }

  public selectOrganization(selectionToken: string, customId: string): Observable<TransicionaisLoginResponse> {
    return this.http.post<TransicionaisLoginResponse>(`${this.baseUrl}/login`, {
      selectionToken,
      customId
    }).pipe(
      tap(res => {
        if (!res.requiresOrgSelection && !res.requiresValidation && res.token) {
          this.saveSession(res);
        }
      })
    );
  }

  public refreshSession(): Observable<TransicionaisUserSession> {
    const current = this.currentUserSubject.getValue();
    return this.http.post<TransicionaisUserSession>(`${this.baseUrl}/refresh`, {
      refreshToken: current?.refresh || ''
    }).pipe(
      tap(res => {
        if (res && res.token) {
          this.saveSession(res);
        }
      })
    );
  }

  public logout(): void {
    const current = this.currentUserSubject.getValue();
    if (current?.token) {
      this.http.post(`${this.baseUrl}/logout`, {}, { headers: this.getAuthHeaders() }).subscribe({ error: () => {} });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.currentUserSubject.next(null);
  }

  public syncOrganizationMembers(): Observable<{ importedCount: number; voters: Voter[] }> {
    return this.http.post<{ importedCount: number; voters: Voter[] }>(
      `${this.baseUrl}/sync-members`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  private saveSession(session: TransicionaisUserSession): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    this.currentUserSubject.next(session);
  }

  private loadStoredSession(): TransicionaisUserSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as TransicionaisUserSession;
    } catch {
      return null;
    }
  }
}
