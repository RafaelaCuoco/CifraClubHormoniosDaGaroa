import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, map } from 'rxjs';
import {
  DisplayChord,
  buildDisplayChords,
  parseChordDiagram
} from '../../core/helpers/chord-format.helper';
import { TransposeService } from '../../core/engines/transpose.service';
import { SongStore } from '../../core/stores/song.store';
import { PlayerStore } from '../../core/stores/player.store';
import { BadgeComponent, CardComponent, IconComponent } from '../../design-system';

/**
 * Componente de apresentação puro do Dicionário SVG de Acordes.
 */
@Component({
  selector: 'app-chord-dictionary',
  standalone: true,
  imports: [CommonModule, IconComponent, BadgeComponent, CardComponent],
  template: `
    <ct-card padding="lg">
      @if ((displayChords$ | async); as chordsList) {
        <div
          class="flex items-center justify-between border-b pb-4 mb-4"
          style="border-color: var(--ct-border-default);">
          <div class="flex items-center gap-2.5">
            <div
              class="w-7 h-7 rounded-[var(--ct-radius-sm)] border flex items-center justify-center"
              style="background: var(--ct-accent-soft-bg); border-color: var(--ct-accent-soft-border); color: var(--ct-accent-highlight);">
              <ct-icon name="music" [size]="15"></ct-icon>
            </div>
            <h2 class="text-base font-extrabold" style="color: var(--ct-text-primary);">
              Acordes da Música
            </h2>
          </div>
          <ct-badge variant="neutral" size="sm">{{ chordsList.length }} acordes</ct-badge>
        </div>

        @if (chordsList.length > 0) {
          <div class="grid grid-cols-2 gap-3.5">
            @for (chord of chordsList; track chord.transposedName) {
              <div
                class="flex flex-col items-center border rounded-[var(--ct-radius-lg)] p-2.5 transition-all group"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default); box-shadow: var(--ct-shadow-sm);">

                <div class="flex items-center justify-between w-full px-1 mb-1.5">
                  <span class="text-sm font-black" style="color: var(--ct-text-primary);">
                    {{ chord.transposedName }}
                  </span>
                  @if (chord.transposedName !== chord.originalName) {
                    <span class="text-[10px] font-medium" style="color: var(--ct-text-muted);">
                      (orig. {{ chord.originalName }})
                    </span>
                  }
                </div>

                <div class="w-[88px] h-[98px]">
                  <svg viewBox="0 0 90 100" class="w-full h-full select-none" [attr.aria-label]="'Diagrama do acorde ' + chord.transposedName">
                    <rect x="15" y="14" width="60" height="3" rx="1" [attr.fill]="'var(--ct-text-secondary)'" />

                    @for (fret of [0, 1, 2, 3, 4]; track fret) {
                      <line
                        [attr.x1]="15"
                        [attr.y1]="16 + fret * 18"
                        [attr.x2]="75"
                        [attr.y2]="16 + fret * 18"
                        [attr.stroke]="'var(--ct-border-default)'"
                        stroke-width="1" />
                    }

                    @for (stringIdx of [0, 1, 2, 3, 4, 5]; track stringIdx) {
                      <line
                        [attr.x1]="15 + stringIdx * 12"
                        [attr.y1]="16"
                        [attr.x2]="15 + stringIdx * 12"
                        [attr.y2]="88"
                        [attr.stroke]="'var(--ct-border-strong)'"
                        stroke-width="1.2" />
                    }

                    @for (item of parseDiagram(chord.diagram); track item.stringIdx) {
                      @if (item.fret === 'x') {
                        <text
                          [attr.x]="15 + item.stringIdx * 12"
                          y="10"
                          text-anchor="middle"
                          font-size="9"
                          font-weight="bold"
                          [attr.fill]="'var(--ct-danger-fg)'">
                          ×
                        </text>
                      } @else if (item.fret === 0) {
                        <circle
                          [attr.cx]="15 + item.stringIdx * 12"
                          cy="8"
                          r="3"
                          [attr.stroke]="'var(--ct-chord-fg)'"
                          stroke-width="1.5"
                          fill="none" />
                      } @else if (item.fret > 0) {
                        <circle
                          [attr.cx]="15 + item.stringIdx * 12"
                          [attr.cy]="16 + (item.fret - 0.5) * 18"
                          r="4.5"
                          [attr.fill]="'var(--ct-accent-highlight)'" />
                      }
                    }
                  </svg>
                </div>

              </div>
            }
          </div>
        } @else {
          <div class="py-8 text-center text-xs" style="color: var(--ct-text-muted);">
            Nenhum acorde detectado nesta música.
          </div>
        }
      }
    </ct-card>
  `
})
export class ChordDictionaryComponent {
  private readonly songStore = inject(SongStore);
  private readonly playerStore = inject(PlayerStore);
  private readonly transpose = inject(TransposeService);

  public readonly parseDiagram = parseChordDiagram;

  public displayChords$: Observable<DisplayChord[]> = combineLatest([
    this.songStore.currentSong$,
    this.songStore.activeTrack$,
    this.playerStore.semitoneOffset$
  ]).pipe(
    map(([song, track, offset]) =>
      buildDisplayChords(song?.chords, track?.content, offset, this.transpose)
    )
  );
}
