import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { ThemeMode, ThemeService } from '../../design-system';

const UI_PREFS_STORAGE_KEY = 'cifratrans_ui_preferences';

export interface PlaylistContext {
  id: number;
  name: string;
}

export interface UiState {
  theme: ThemeMode;
  synthPanelOpen: boolean;
  playlistContext: PlaylistContext | null;
}

interface PersistedUiPrefs {
  synthPanelOpen?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UiStore {
  private readonly themeService = inject(ThemeService);

  private readonly stateSubject = new BehaviorSubject<UiState>({
    theme: this.themeService.getTheme(),
    // Regra canônica 7: Modo Palco inicia com painel do sintetizador recolhido (false)
    synthPanelOpen: this.loadPersistedSynthPanelOpen(),
    playlistContext: null
  });

  public readonly state$ = this.stateSubject.asObservable();
  public readonly theme$ = this.state$.pipe(map(s => s.theme));
  public readonly synthPanelOpen$ = this.state$.pipe(map(s => s.synthPanelOpen));
  public readonly playlistContext$ = this.state$.pipe(map(s => s.playlistContext));

  constructor() {
    this.themeService.theme$.subscribe(theme => {
      if (this.snapshot.theme !== theme) {
        this.patch({ theme });
      }
    });
  }

  public get snapshot(): UiState {
    return this.stateSubject.getValue();
  }

  public setTheme(theme: ThemeMode): void {
    this.themeService.setTheme(theme);
    this.patch({ theme });
  }

  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  public setSynthPanelOpen(open: boolean): void {
    this.patch({ synthPanelOpen: open });
    this.persistPrefs({ synthPanelOpen: open });
  }

  public toggleSynthPanel(): void {
    this.setSynthPanelOpen(!this.snapshot.synthPanelOpen);
  }

  public setPlaylistContext(ctx: PlaylistContext | null): void {
    this.patch({ playlistContext: ctx });
  }

  public clearPlaylistContext(): void {
    this.patch({ playlistContext: null });
  }

  private patch(partial: Partial<UiState>): void {
    this.stateSubject.next({ ...this.snapshot, ...partial });
  }

  private loadPersistedSynthPanelOpen(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(UI_PREFS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as PersistedUiPrefs;
      return parsed.synthPanelOpen === true;
    } catch {
      return false;
    }
  }

  private persistPrefs(prefs: PersistedUiPrefs): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignora indisponibilidade de localStorage
    }
  }
}
