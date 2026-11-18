import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SongStore } from '../core/stores/song.store';
import { UiStore } from '../core/stores/ui.store';
import { PlayerStore } from '../core/stores/player.store';
import { SynthEngine } from '../core/engines/synth-engine.service';
import { AutoScroll } from '../core/engines/auto-scroll.service';
import { PlaylistService } from '../core/services/playlist.service';
import { ToolboxComponent } from '../components/toolbox/toolbox.component';
import { LyricsViewerComponent } from '../components/lyrics-viewer/lyrics-viewer.component';
import { ChordDictionaryComponent } from '../components/chord-dictionary/chord-dictionary.component';
import { BadgeComponent, ButtonComponent, IconComponent, PT_BR_GLOSSARY } from '../design-system';

@Component({
  selector: 'app-stage-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToolboxComponent,
    LyricsViewerComponent,
    ChordDictionaryComponent,
    ButtonComponent,
    BadgeComponent,
    IconComponent
  ],
  template: `
    <div class="space-y-4">
      <!-- Barra Contextual de Playlist quando aberta por uma playlist -->
      @if (uiStore.playlistContext$ | async; as ctx) {
        <div
          class="border rounded-[var(--ct-radius-xl)] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          style="background: var(--ct-bg-surface); border-color: var(--ct-success-border); box-shadow: var(--ct-shadow-md);">
          <div class="flex items-center gap-2 text-xs sm:text-sm">
            <ct-badge variant="success" size="sm" icon="headphones">Playlist Ativa</ct-badge>
            <span class="font-bold truncate" style="color: var(--ct-text-primary);">{{ ctx.name }}</span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <ct-button variant="secondary" size="sm" leftIcon="skip-back" (pressed)="navigatePlaylistSong('prev')">
              Anterior
            </ct-button>
            <ct-button variant="secondary" size="sm" rightIcon="skip-forward" (pressed)="navigatePlaylistSong('next')">
              Próxima
            </ct-button>
            <ct-button variant="primary" size="sm" leftIcon="arrow-left" (pressed)="router.navigate(['/playlists'])">
              Voltar para Playlist
            </ct-button>
          </div>
        </div>
      }

      <!-- Seletor único responsivo de música no Modo Palco (substitui duplicação header desktop vs mobile) -->
      <div
        class="border rounded-[var(--ct-radius-xl)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
        style="background: var(--ct-bg-surface); border-color: var(--ct-border-default); box-shadow: var(--ct-shadow-sm);">
        <div class="flex items-center justify-between gap-2">
          <label for="stage-song-selector" class="text-xs font-bold uppercase tracking-wider" style="color: var(--ct-text-muted);">
            Música no {{ glossary.areas.palco }}
          </label>
          <button
            type="button"
            (click)="router.navigate(['/mural'])"
            class="sm:hidden text-xs font-bold cursor-pointer bg-transparent border-0 inline-flex items-center gap-1"
            style="color: var(--ct-accent-highlight);">
            <ct-icon name="home" [size]="12"></ct-icon>
            <span>{{ glossary.areas.mural }}</span>
          </button>
        </div>

        <div class="relative inline-flex items-center flex-1 sm:max-w-md">
          <select
            id="stage-song-selector"
            name="stageSongSelector"
            [ngModel]="selectedSongId"
            (ngModelChange)="onSongSelectChange($event)"
            class="ct-native-select w-full border rounded-[var(--ct-radius-md)] px-3 py-2 pr-8 text-xs sm:text-sm font-semibold cursor-pointer"
            style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">
            <option [ngValue]="null" disabled>Selecionar música...</option>
            @for (song of (songStore.songsList$ | async); track song.id) {
              <option [ngValue]="song.id">
                [{{ song.isPublic === false ? glossary.visibility.private : glossary.visibility.public }}] {{ song.title }} - {{ song.artist }} ({{ glossary.player.key }}: {{ song.originalKey }})
              </option>
            }
          </select>
          <span class="pointer-events-none absolute right-2.5 inline-flex" style="color: var(--ct-text-muted);">
            <ct-icon name="chevron-down" [size]="14"></ct-icon>
          </span>
        </div>
      </div>

      <!-- Barra de Ferramentas: Transposição única + Badge instrumento + Rolagem automática -->
      <app-toolbox></app-toolbox>

      <!-- Grade Principal: Cifra (protagonista) + Dicionário SVG -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        <div class="lg:col-span-8 space-y-6">
          <app-lyrics-viewer (editSong)="onEditSong()"></app-lyrics-viewer>
        </div>

        <div class="lg:col-span-4 sticky top-20 sm:top-24 space-y-6">
          <app-chord-dictionary></app-chord-dictionary>
        </div>
      </div>
    </div>
  `
})
export class StagePageComponent implements OnInit, OnDestroy {
  public readonly songStore = inject(SongStore);
  public readonly uiStore = inject(UiStore);
  private readonly playerStore = inject(PlayerStore);
  private readonly synthEngine = inject(SynthEngine);
  private readonly autoScroll = inject(AutoScroll);
  private readonly playlistService = inject(PlaylistService);
  private readonly route = inject(ActivatedRoute);
  public readonly router = inject(Router);
  public readonly glossary = PT_BR_GLOSSARY;

  public selectedSongId: number | null = null;
  private subs = new Subscription();

  ngOnInit(): void {
    // Garante inicialização do SynthEngine mesmo com painel recolhido
    void this.synthEngine.snapshot;

    this.subs.add(
      this.autoScroll.scrollDelta$.subscribe(deltaPx => {
        if (typeof window !== 'undefined') {
          window.scrollBy({ top: deltaPx, behavior: 'auto' });
          if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5) {
            this.autoScroll.notifyReachedEnd();
          }
        }
      })
    );

    this.subs.add(
      this.route.paramMap.subscribe(params => {
        const idParam = Number(params.get('id'));
        if (idParam && idParam > 0) {
          this.selectedSongId = idParam;
          this.songStore.loadSong(idParam).subscribe();
        } else {
          const current = this.songStore.getCurrentSong();
          if (current) {
            this.selectedSongId = current.id;
            this.router.navigate(['/palco', current.id], { replaceUrl: true });
          } else {
            this.songStore.loadSongs().subscribe(songs => {
              if (songs && songs.length > 0) {
                this.selectedSongId = songs[0].id;
                this.router.navigate(['/palco', songs[0].id], { replaceUrl: true });
              }
            });
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.playerStore.stop();
    this.playerStore.stopAutoScroll();
    this.subs.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  public onStageKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (typeof document !== 'undefined' && document.querySelector('[role="dialog"]')) return;

    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toUpperCase();
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target?.isContentEditable
    ) {
      return;
    }

    if (event.code === 'Space') {
      if (tag === 'BUTTON' || tag === 'A' || target?.getAttribute('role') === 'switch') {
        return;
      }
      event.preventDefault();
      this.playerStore.togglePlay();
      return;
    }

    if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
      event.preventDefault();
      this.playerStore.transposeUp();
      return;
    }

    if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
      event.preventDefault();
      this.playerStore.transposeDown();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (this.playerStore.snapshot.isAutoScrolling) {
        this.playerStore.setAutoScrollSpeed(
          this.playerStore.snapshot.autoScrollSpeedPxPerSec + direction * 10
        );
      } else if (typeof window !== 'undefined') {
        const reducedMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollBy({
          top: direction * 96,
          behavior: reducedMotion ? 'auto' : 'smooth'
        });
      }
    }
  }

  public onSongSelectChange(songId: number | null): void {
    if (!songId) return;
    this.uiStore.clearPlaylistContext();
    this.router.navigate(['/palco', Number(songId)]);
  }

  public onEditSong(): void {
    const id = this.selectedSongId || this.songStore.getCurrentSong()?.id;
    if (id) {
      this.router.navigate(['/estudio', id]);
    } else {
      this.router.navigate(['/estudio']);
    }
  }

  public navigatePlaylistSong(direction: 'prev' | 'next'): void {
    const currentPlaylist = this.playlistService.getCurrentPlaylistValue();
    if (!currentPlaylist || !currentPlaylist.tracks) return;

    const importedTracks = currentPlaylist.tracks.filter(t => t.songId != null);
    if (importedTracks.length <= 1) return;

    const currentIndex = importedTracks.findIndex(t => t.songId === this.selectedSongId);
    if (currentIndex === -1) return;

    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % importedTracks.length
        : (currentIndex - 1 + importedTracks.length) % importedTracks.length;

    const nextSongId = importedTracks[nextIndex].songId;
    if (nextSongId) {
      this.router.navigate(['/palco', nextSongId]);
    }
  }
}
