import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ThemeMode } from './tokens';

const THEME_STORAGE_KEY = 'cifratrans_theme_mode';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeSubject = new BehaviorSubject<ThemeMode>(this.loadInitialTheme());
  public readonly theme$ = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.getValue());
  }

  public getTheme(): ThemeMode {
    return this.themeSubject.getValue();
  }

  public setTheme(mode: ThemeMode): void {
    this.themeSubject.next(mode);
    this.applyTheme(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {
        // Ignora falha de armazenamento em navegação restrita
      }
    }
  }

  public toggleTheme(): void {
    this.setTheme(this.getTheme() === 'stage' ? 'light' : 'stage');
  }

  private loadInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'stage';
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'stage') {
        return saved;
      }
    } catch {
      // Ignora erro ao ler localStorage
    }
    return 'stage';
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode === 'light' ? 'light' : 'dark';
  }
}
