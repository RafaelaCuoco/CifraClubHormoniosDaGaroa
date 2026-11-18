import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, map } from 'rxjs';
import { ParsedLine, parseChordSheet } from '../../core/helpers/chord-format.helper';
import { canEditSong } from '../../core/helpers/permission.helper';
import { TransposeService } from '../../core/engines/transpose.service';
import { SongStore } from '../../core/stores/song.store';
import { PlayerStore } from '../../core/stores/player.store';
import { AuthStore } from '../../core/stores/auth.store';
import { UiStore } from '../../core/stores/ui.store';
import { GuitarProTabComponent } from '../guitar-pro-tab/guitar-pro-tab.component';
import { VisibilityBadgeComponent } from '../visibility-badge/visibility-badge.component';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  PT_BR_GLOSSARY,
  SkeletonComponent
} from '../../design-system';

/**
 * Componente de apresentação puro do Leitor de Cifras.
 * Delega parsing ao ChordFormatHelper, transposição ao TransposeService e estado aos stores.
 */
@Component({
  selector: 'app-lyrics-viewer',
  standalone: true,
  imports: [
    CommonModule,
    GuitarProTabComponent,
    VisibilityBadgeComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    SkeletonComponent
  ],
  template: `
    <ct-card padding="lg" class="block">
      <div class="space-y-6">
        @if (songStore.loadingSong$ | async) {
          <div class="space-y-4">
            <ct-skeleton variant="text" [lines]="2"></ct-skeleton>
            <ct-skeleton variant="card" height="220px"></ct-skeleton>
            <ct-skeleton variant="text" [lines]="6"></ct-skeleton>
          </div>
        } @else if ((songStore.error$ | async); as errMsg) {
          <ct-empty-state
            icon="alert-triangle"
            title="Erro ao carregar a cifra"
            [description]="errMsg"
            actionLabel="Tentar novamente"
            actionIcon="refresh-cw"
            (action)="loadDemoSong()">
          </ct-empty-state>
        } @else if (songStore.currentSong$ | async; as song) {
          @let currentUser = (authStore.currentUser$ | async);
          @let canEdit = !currentUser || canEditSongFn(song, currentUser);

          <!-- Cabeçalho da Música -->
          <div class="border-b pb-5" style="border-color: var(--ct-border-default);">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div>
                <div class="flex items-center gap-2.5 flex-wrap">
                  <h1 class="text-xl sm:text-2xl md:text-3xl font-black tracking-tight" style="color: var(--ct-text-primary);">
                    {{ song.title }}
                  </h1>
                  <ct-visibility-badge [isPublic]="song.isPublic" size="md"></ct-visibility-badge>
                </div>

                <div class="flex items-center gap-2 flex-wrap mt-1">
                  <p class="text-sm sm:text-base md:text-lg font-medium" style="color: var(--ct-text-secondary);">
                    {{ song.artist }}
                  </p>
                  @if (song.creatorName) {
                    <span class="text-xs" style="color: var(--ct-text-muted);">
                      • Criada por <strong style="color: var(--ct-text-secondary);">{{ song.creatorName }}</strong>
                    </span>
                  }
                </div>
              </div>

              <!-- Ações do Palco -->
              <div class="flex flex-wrap items-center gap-2">
                <ct-button
                  [variant]="(uiStore.synthPanelOpen$ | async) ? 'primary' : 'secondary'"
                  size="sm"
                  leftIcon="guitar"
                  (pressed)="uiStore.toggleSynthPanel()">
                  {{ (uiStore.synthPanelOpen$ | async) ? glossary.player.hideSynth : glossary.player.showSynth }}
                </ct-button>

                @if (canEdit) {
                  <ct-button
                    variant="secondary"
                    size="sm"
                    [leftIcon]="currentUser ? 'pencil' : 'lock'"
                    (pressed)="onEditClick()">
                    {{ currentUser ? 'Editar cifra' : glossary.auth.loginToEdit }}
                  </ct-button>
                } @else {
                  <ct-badge variant="neutral" size="sm" icon="shield">
                    Somente leitura (autor: {{ song.creatorName || 'outro usuário' }})
                  </ct-badge>
                }

                @if (songStore.activeTrack$ | async; as track) {
                  @if (track.capo > 0) {
                    <ct-badge variant="neutral" size="sm">Capotraste: {{ track.capo }}ª</ct-badge>
                  }
                  <ct-badge variant="success" size="sm">{{ track.difficulty }}</ct-badge>
                }
              </div>
            </div>
          </div>

          <!-- Painel retrátil do Sintetizador (SynthEngine permanece ativo em singleton mesmo recolhido) -->
          @if (uiStore.synthPanelOpen$ | async) {
            <app-guitar-pro-tab></app-guitar-pro-tab>
          }

          <!-- Área Principal da Cifra (fonte monoespaçada estrita) -->
          @let activeChord = (playerStore.activePlayingChord$ | async);
          <div class="ct-chord-sheet leading-relaxed overflow-x-auto select-text" style="color: var(--ct-text-primary);">
            @for (line of (parsedLines$ | async) || []; track $index) {

              @if (line.type === 'empty') {
                <div class="h-5"></div>
              }

              @else if (line.type === 'section') {
                <div class="my-4">
                  <span
                    class="inline-block text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-[var(--ct-radius-sm)] border-l-4"
                    style="background: var(--ct-bg-elevated); color: var(--ct-text-secondary); border-left-color: var(--ct-accent-highlight);">
                    {{ line.raw }}
                  </span>
                </div>
              }

              @else if (line.type === 'tab') {
                <div
                  class="text-xs sm:text-sm ct-chord-sheet whitespace-pre overflow-x-auto py-1.5 px-3 my-1 tracking-wider border rounded-[var(--ct-radius-md)]"
                  style="background: var(--ct-bg-canvas); color: var(--ct-chord-fg); border-color: var(--ct-border-default);">
                  {{ line.raw }}
                </div>
              }

              @else if (line.type === 'chords-and-lyrics') {
                <div class="flex flex-wrap items-end my-1 min-h-[2.85rem] leading-none">
                  @for (seg of line.segments; track (seg.transposedChord || '') + seg.text + $index) {
                    <span class="inline-flex flex-col align-bottom mr-0.5 max-w-full">
                      <span class="min-h-[1.35rem] flex items-center font-bold text-xs sm:text-sm cursor-pointer transition-all select-all">
                        @if (seg.transposedChord) {
                          <span
                            class="px-1.5 py-0.5 rounded border transition-all duration-150"
                            [style]="activeChord === seg.transposedChord
                              ? { background: 'var(--ct-chord-active-bg)', color: 'var(--ct-chord-active-fg)', 'border-color': 'var(--ct-chord-active-bg)', transform: 'scale(1.08)' }
                              : { background: 'var(--ct-chord-bg)', color: 'var(--ct-chord-fg)', 'border-color': 'var(--ct-chord-border)' }">
                            {{ seg.transposedChord }}
                          </span>
                        }
                      </span>

                      <span
                        class="text-sm sm:text-base ct-chord-sheet whitespace-pre-wrap break-words pt-0.5"
                        style="color: var(--ct-text-primary);">
                        {{ seg.text }}
                      </span>
                    </span>
                  }
                </div>
              }

            }
          </div>

        } @else {
          <ct-empty-state
            icon="guitar"
            title="Nenhuma cifra carregada"
            description="Selecione uma música no Mural ou carregue a cifra de demonstração."
            actionLabel="Carregar &quot;Tempo Perdido&quot; (Demonstração)"
            actionIcon="play"
            (action)="loadDemoSong()">
          </ct-empty-state>
        }
      </div>
    </ct-card>
  `
})
export class LyricsViewerComponent {
  public readonly songStore = inject(SongStore);
  public readonly playerStore = inject(PlayerStore);
  public readonly authStore = inject(AuthStore);
  public readonly uiStore = inject(UiStore);
  private readonly transpose = inject(TransposeService);
  public readonly glossary = PT_BR_GLOSSARY;
  public readonly canEditSongFn = canEditSong;

  @Output() editSong = new EventEmitter<void>();

  public parsedLines$: Observable<ParsedLine[]> = combineLatest([
    this.songStore.activeTrack$,
    this.playerStore.semitoneOffset$
  ]).pipe(
    map(([track, offset]) =>
      track?.content ? parseChordSheet(track.content, offset, this.transpose) : []
    )
  );

  public onEditClick(): void {
    this.authStore.requireAuth(
      AuthStore.REASONS.edit.actionLabel,
      AuthStore.REASONS.edit.explanation,
      () => this.editSong.emit()
    );
  }

  public loadDemoSong(): void {
    this.songStore.loadSong(1).subscribe({
      next: () => {},
      error: () => {
        this.songStore.seedDemoSong().subscribe();
      }
    });
  }
}
