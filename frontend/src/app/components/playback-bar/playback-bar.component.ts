import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerStore, STUDY_SPEED_OPTIONS } from '../../core/stores/player.store';
import { BadgeComponent, ButtonComponent, IconButtonComponent, IconComponent, PT_BR_GLOSSARY } from '../../design-system';

/**
 * Barra única de reprodução integrada à aba do Sintetizador & Tablatura Interativa.
 * Centraliza Tocar/Pausar/Parar, Repetir, Metrônomo, BPM, Velocidade de estudo e compasso atual.
 */
@Component({
  selector: 'app-playback-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, IconButtonComponent, BadgeComponent, IconComponent],
  template: `
    <div
      class="w-full border rounded-[var(--ct-radius-lg)] px-3 sm:px-3.5 py-2.5"
      style="background: var(--ct-bg-surface); border-color: var(--ct-border-default);">
      <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-3">

        <!-- Transporte Principal -->
        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <ct-button
            [variant]="(playerStore.isPlaying$ | async) ? 'secondary' : 'primary'"
            size="sm"
            [leftIcon]="(playerStore.isPlaying$ | async) ? 'pause' : 'play'"
            (pressed)="playerStore.togglePlay()">
            {{ (playerStore.isPlaying$ | async) ? glossary.player.pause : glossary.player.play }}
          </ct-button>

          <ct-icon-button
            class="sm:hidden"
            icon="square"
            [ariaLabel]="glossary.player.stop"
            variant="secondary"
            size="sm"
            (pressed)="playerStore.stop()">
          </ct-icon-button>
          <ct-button
            class="hidden sm:inline-flex"
            variant="secondary"
            size="sm"
            leftIcon="square"
            (pressed)="playerStore.stop()">
            {{ glossary.player.stop }}
          </ct-button>

          <button
            type="button"
            (click)="playerStore.toggleLoop()"
            [attr.aria-pressed]="(playerStore.loopEnabled$ | async) === true"
            [attr.aria-label]="glossary.player.loop"
            class="px-2.5 py-1.5 rounded-[var(--ct-radius-md)] text-xs border transition-all cursor-pointer inline-flex items-center gap-1.5 font-bold"
            [style]="(playerStore.loopEnabled$ | async)
              ? { background: 'var(--ct-accent-soft-bg)', color: 'var(--ct-accent-highlight)', 'border-color': 'var(--ct-accent-soft-border)' }
              : { background: 'var(--ct-bg-elevated)', color: 'var(--ct-text-secondary)', 'border-color': 'var(--ct-border-default)' }">
            <ct-icon name="repeat" [size]="14"></ct-icon>
            <span class="hidden md:inline">{{ glossary.player.loop }}</span>
          </button>

          <button
            type="button"
            (click)="playerStore.toggleMetronome()"
            [attr.aria-pressed]="(playerStore.metronomeEnabled$ | async) === true"
            [attr.aria-label]="glossary.player.metronome"
            class="px-2.5 py-1.5 rounded-[var(--ct-radius-md)] text-xs border transition-all cursor-pointer inline-flex items-center gap-1.5 font-bold"
            [style]="(playerStore.metronomeEnabled$ | async)
              ? { background: 'var(--ct-info-bg)', color: 'var(--ct-info-fg)', 'border-color': 'var(--ct-info-border)' }
              : { background: 'var(--ct-bg-elevated)', color: 'var(--ct-text-secondary)', 'border-color': 'var(--ct-border-default)' }">
            <ct-icon name="timer" [size]="14"></ct-icon>
            <span class="hidden md:inline">{{ glossary.player.metronome }}</span>
          </button>
        </div>

        <!-- BPM, Velocidade de estudo e Compasso Atual -->
        <div class="flex items-center gap-2 flex-wrap">
          <div
            class="flex items-center border rounded-[var(--ct-radius-md)] px-2 py-1"
            style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong);">
            <label for="playback-bar-bpm" class="text-[10px] font-bold uppercase mr-1" style="color: var(--ct-text-muted);">
              {{ glossary.player.bpm }}
            </label>
            <input
              id="playback-bar-bpm"
              name="playbackBarBpm"
              type="number"
              min="40"
              max="240"
              [ngModel]="playerStore.bpm$ | async"
              (ngModelChange)="playerStore.setBpm($event)"
              class="w-12 bg-transparent text-xs font-black text-center rounded-[var(--ct-radius-sm)]"
              style="color: var(--ct-text-primary);" />
          </div>

          <div class="flex items-center gap-1">
            <label for="playback-bar-study-speed" class="hidden lg:inline text-[10px] font-bold uppercase" style="color: var(--ct-text-muted);">
              {{ glossary.player.studySpeed }}
            </label>
            <div class="relative inline-flex items-center">
              <select
                id="playback-bar-study-speed"
                name="playbackBarStudySpeed"
                [attr.aria-label]="glossary.player.studySpeed"
                [ngModel]="playerStore.studySpeed$ | async"
                (ngModelChange)="playerStore.setStudySpeed($event)"
                class="ct-native-select border rounded-[var(--ct-radius-md)] px-2.5 py-1.5 pr-7 text-xs font-bold cursor-pointer"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-success-fg);">
                @for (opt of speedOptions; track opt.value) {
                  <option [ngValue]="opt.value">{{ opt.label }}</option>
                }
              </select>
              <span class="pointer-events-none absolute right-2 inline-flex" style="color: var(--ct-text-muted);">
                <ct-icon name="chevron-down" [size]="12"></ct-icon>
              </span>
            </div>
          </div>

          @if (playerStore.state$ | async; as ps) {
            <ct-badge variant="neutral" size="sm">
              Compasso #{{ ps.currentMeasure }}/{{ ps.totalMeasures }} • Tempo {{ ps.currentBeat }}/4
            </ct-badge>
          }
        </div>

      </div>
    </div>
  `
})
export class PlaybackBarComponent {
  public readonly playerStore = inject(PlayerStore);
  public readonly glossary = PT_BR_GLOSSARY;
  public readonly speedOptions = STUDY_SPEED_OPTIONS;
}
