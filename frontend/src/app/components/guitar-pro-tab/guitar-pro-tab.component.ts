import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  MELODIC_INSTRUMENTS,
  PERCUSSION_INSTRUMENTS
} from '../../core/helpers/instrument-catalog';
import { PlayerStore } from '../../core/stores/player.store';
import { SynthCursorFrame, SynthEngine, SynthFrameState } from '../../core/engines/synth-engine.service';
import { TabColumn, TabNote, TabRenderer } from '../../core/engines/tab-renderer.service';
import { TransposeService } from '../../core/engines/transpose.service';
import { PlaybackBarComponent } from '../playback-bar/playback-bar.component';
import { BadgeComponent, IconComponent, PT_BR_GLOSSARY } from '../../design-system';

/**
 * Componente de apresentação puro do Sintetizador e Grade de Tablatura.
 * Toda síntese Web Audio e cálculo de compassos vivem em SynthEngine e TabRenderer.
 */
@Component({
  selector: 'app-guitar-pro-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, BadgeComponent, PlaybackBarComponent],
  template: `
    @if (frameState) {
      <div
        class="w-full border-2 rounded-[var(--ct-radius-xl)] p-4 sm:p-5 space-y-4"
        style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default); box-shadow: var(--ct-shadow-lg);">

        <!-- Cabeçalho + Seletor Único de Instrumento -->
        <div
          class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3.5 border-b"
          style="border-color: var(--ct-border-default);">
          <div class="flex items-center gap-2.5">
            <div
              class="w-9 h-9 rounded-[var(--ct-radius-md)] flex items-center justify-center font-black text-xs shrink-0"
              style="background: var(--ct-accent-primary); color: var(--ct-accent-primary-fg);">
              <ct-icon name="music" [size]="18"></ct-icon>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-sm sm:text-base font-black tracking-tight" style="color: var(--ct-text-primary);">
                  Sintetizador & Tablatura Interativa
                </h3>
                <ct-badge variant="success" size="sm" [icon]="frameState.config.icon">
                  {{ frameState.config.label }}
                </ct-badge>
                <ct-badge variant="neutral" size="sm">
                  Compasso #{{ frameState.currentMeasureIndex + 1 }}/{{ frameState.measures.length || 1 }} • Tempo {{ frameState.currentBeatInMeasure }}/4
                </ct-badge>
              </div>
              <p class="text-[11px]" style="color: var(--ct-text-muted);">
                Deslize contínuo de acordes e cursor sincronizado por compasso a 60fps respeitando BPM, Velocidade de estudo e Repetir.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label
              for="synth-instrument-select"
              class="text-xs font-bold uppercase tracking-wider"
              style="color: var(--ct-text-muted);">
              {{ glossary.player.instrument }}:
            </label>
            <div class="relative inline-flex items-center">
              <select
                id="synth-instrument-select"
                name="synthInstrument"
                aria-label="Selecionar instrumento do sintetizador"
                [ngModel]="frameState.config.id"
                (ngModelChange)="onInstrumentChange($event)"
                class="ct-native-select border rounded-[var(--ct-radius-md)] px-3 py-2 pr-8 text-xs font-black cursor-pointer"
                style="background: var(--ct-bg-surface); border-color: var(--ct-accent-soft-border); color: var(--ct-text-primary);">
                <optgroup label="Cordas, Teclado e Sopro">
                  @for (inst of melodicInstruments; track inst.id) {
                    <option [value]="inst.id">{{ inst.label }}</option>
                  }
                </optgroup>
                <optgroup label="Bateria e Escola de Samba">
                  @for (inst of percussionInstruments; track inst.id) {
                    <option [value]="inst.id">{{ inst.label }}</option>
                  }
                </optgroup>
              </select>
              <span class="pointer-events-none absolute right-2.5 inline-flex" style="color: var(--ct-text-muted);">
                <ct-icon name="chevron-down" [size]="14"></ct-icon>
              </span>
            </div>
          </div>
        </div>

        <!-- Controles do Player integrados ao Sintetizador -->
        <app-playback-bar></app-playback-bar>

        <!-- Esteira de Deslize Suave de Acordes e Compassos -->
        @if (frameState.measures.length > 0) {
          <div
            class="relative overflow-hidden border rounded-[var(--ct-radius-lg)] h-16 flex items-center select-none shadow-inner"
            style="background: var(--ct-bg-canvas); border-color: var(--ct-border-default);">
            <div class="absolute left-24 sm:left-32 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#1DB954] via-[#FF6D3B] to-amber-400 z-20 shadow-[0_0_12px_#FF6D3B]"></div>
            <div
              class="absolute left-24 sm:left-32 -translate-x-1/2 top-0.5 px-2 py-0.5 rounded-b font-black text-[9px] uppercase tracking-wider z-20 shadow"
              style="background: var(--ct-accent-primary); color: var(--ct-accent-primary-fg);">
              Tocando Agora
            </div>

            <div
              #chordConveyor
              class="flex items-center h-full will-change-transform"
              [style.transform]="'translate3d(' + chordConveyorOffsetPx + 'px, 0, 0)'">
              @for (m of frameState.measures; track m.index) {
                <div
                  (click)="synthEngine.selectAndPreviewColumn(m.columns[0].index)"
                  [ngClass]="frameState.currentMeasureIndex === m.index ? 'border-[#FF6D3B]' : 'opacity-80 hover:opacity-100'"
                  [style]="frameState.currentMeasureIndex === m.index
                    ? { background: 'var(--ct-accent-soft-bg)', 'border-color': 'var(--ct-accent-highlight)' }
                    : { background: 'var(--ct-bg-surface)', 'border-color': 'var(--ct-border-default)' }"
                  class="w-[160px] h-11 mx-1 rounded-[var(--ct-radius-md)] border px-3 flex items-center justify-between shrink-0 cursor-pointer transition-colors relative overflow-hidden">

                  @if (frameState.currentMeasureIndex === m.index) {
                    <div
                      #activeMeasureProgress
                      class="absolute inset-y-0 left-0 pointer-events-none"
                      style="background: var(--ct-accent-soft-bg);"
                      [style.width.%]="cursorFrame.measureProgressPercent">
                    </div>
                  }

                  <div class="flex items-center gap-2 relative z-10">
                    <span class="text-[10px] font-mono font-bold" style="color: var(--ct-text-muted);">
                      #{{ m.index + 1 }}
                    </span>
                    <span
                      class="text-base font-black tracking-tight transition-transform"
                      [style.color]="frameState.currentMeasureIndex === m.index ? 'var(--ct-text-primary)' : 'var(--ct-chord-fg)'">
                      {{ getTransposedChord(m.chordName) }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1 relative z-10">
                    @for (beat of [1, 2, 3, 4]; track beat) {
                      <span
                        [style.background]="frameState.currentMeasureIndex === m.index && frameState.currentBeatInMeasure === beat ? 'var(--ct-accent-highlight)' : 'var(--ct-border-strong)'"
                        class="w-1.5 h-1.5 rounded-full transition-all">
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Grade Interativa de Compassos e Linhas -->
        @if (frameState.allColumns.length > 0) {
          <div
            #tabScrollContainer
            class="overflow-x-auto pb-2 scrollbar-thin scroll-smooth">
            <div
              class="inline-flex items-stretch gap-0 min-w-full border rounded-[var(--ct-radius-lg)] p-3 relative"
              style="background: var(--ct-bg-canvas); border-color: var(--ct-border-default);">

              <div
                class="w-[76px] flex flex-col justify-between pr-2.5 border-r-2 select-none shrink-0 z-20"
                style="background: var(--ct-bg-canvas); border-color: var(--ct-border-strong);">
                <div class="h-6 flex items-center justify-end text-[10px] font-black uppercase" style="color: var(--ct-text-muted);">
                  {{ frameState.config.category === 'percussao' ? 'Tempo' : 'Acorde' }}
                </div>
                @for (lineName of frameState.config.lineNames; track $index) {
                  <div class="h-6 flex items-center justify-end font-mono text-[11px] font-black whitespace-nowrap" style="color: var(--ct-accent-highlight);">
                    {{ lineName }}
                  </div>
                }
                <div class="h-5 flex items-center justify-end text-[9px] font-mono" style="color: var(--ct-text-muted);">
                  4/4
                </div>
              </div>

              <div class="flex items-stretch relative">
                <div
                  #playhead
                  class="absolute top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#1DB954] via-[#FF6D3B] to-amber-400 z-30 pointer-events-none shadow-[0_0_14px_#FF6D3B] will-change-transform"
                  [style.transform]="'translate3d(' + playheadOffsetPx + 'px, 0, 0)'">
                  <div class="w-3 h-3 -ml-[4.5px] -mt-1 rounded-full bg-[#FF6D3B] border-2 border-white shadow"></div>
                </div>

                @for (measure of frameState.measures; track measure.index) {
                  <div
                    class="flex items-stretch border-r-2 relative transition-colors"
                    style="border-color: var(--ct-border-default);">

                    <span
                      class="absolute top-0.5 left-1.5 text-[9px] font-mono select-none font-bold"
                      [style.color]="frameState.currentMeasureIndex === measure.index ? 'var(--ct-accent-highlight)' : 'var(--ct-text-muted)'">
                      #{{ measure.index + 1 }}
                    </span>

                    @for (col of measure.columns; track col.index) {
                      <div
                        (click)="synthEngine.selectAndPreviewColumn(col.index)"
                        class="w-[48px] flex flex-col justify-between items-center cursor-pointer transition-colors relative py-0.5 select-none shrink-0"
                        [style.background]="frameState.activeColumnIndex === col.index ? 'var(--ct-accent-soft-bg)' : 'transparent'">

                        <div class="h-6 flex items-center justify-center">
                          @if (col.chordLabel) {
                            <span
                              class="px-1.5 py-0.5 rounded border font-mono text-[10px] font-black transition-transform"
                              [style]="frameState.activeColumnIndex === col.index
                                ? { background: 'var(--ct-chord-active-bg)', color: 'var(--ct-chord-active-fg)', 'border-color': 'var(--ct-chord-active-bg)' }
                                : { background: 'var(--ct-chord-bg)', color: 'var(--ct-chord-fg)', 'border-color': 'var(--ct-chord-border)' }">
                              {{ frameState.config.category === 'percussao' ? col.chordLabel : getTransposedChord(col.chordLabel) }}
                            </span>
                          }
                        </div>

                        @for (lineName of frameState.config.lineNames; track $index; let sIdx = $index) {
                          <div
                            (click)="onCellClick($event, col, sIdx)"
                            class="w-full h-6 flex items-center justify-center relative group">
                            <div class="w-full h-[1px] absolute inset-x-0" style="background: var(--ct-border-default);"></div>

                            @if (getNoteOnString(col, sIdx); as note) {
                              <span
                                class="relative z-10 px-1.5 min-w-[20px] h-5 rounded-[var(--ct-radius-sm)] font-mono text-xs font-black flex items-center justify-center transition-all duration-75 border"
                                [style]="frameState.activeColumnIndex === col.index
                                  ? { background: 'var(--ct-chord-active-bg)', color: 'var(--ct-chord-active-fg)', 'border-color': 'var(--ct-chord-active-bg)' }
                                  : { background: 'var(--ct-bg-surface)', color: 'var(--ct-chord-fg)', 'border-color': 'var(--ct-border-strong)' }">
                                {{ frameState.config.category === 'percussao' ? (note.label || 'X') : (getTransposedFret(note.fret) + (note.technique || '')) }}
                              </span>
                            } @else if (frameState.config.category === 'percussao') {
                              <span class="relative z-10 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style="background: var(--ct-border-strong);"></span>
                            }
                          </div>
                        }

                        <div class="h-5 flex items-center justify-center">
                          @if (frameState.activeColumnIndex === col.index) {
                            <span class="w-2 h-2 rounded-full" style="background: var(--ct-accent-highlight);"></span>
                          } @else {
                            <span class="w-1 h-1 rounded-full" style="background: var(--ct-border-strong);"></span>
                          }
                        </div>

                      </div>
                    }
                  </div>
                }
              </div>

            </div>
          </div>
        }
      </div>
    }
  `
})
export class GuitarProTabComponent implements OnInit, OnDestroy {
  public readonly playerStore = inject(PlayerStore);
  public readonly synthEngine = inject(SynthEngine);
  private readonly tabRenderer = inject(TabRenderer);
  private readonly transpose = inject(TransposeService);
  private readonly cdr = inject(ChangeDetectorRef);
  public readonly glossary = PT_BR_GLOSSARY;

  @ViewChild('tabScrollContainer') tabScrollContainerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('playhead') playheadRef?: ElementRef<HTMLDivElement>;
  @ViewChild('chordConveyor') chordConveyorRef?: ElementRef<HTMLDivElement>;
  @ViewChildren('activeMeasureProgress') activeMeasureProgressRefs?: QueryList<ElementRef<HTMLDivElement>>;

  public readonly melodicInstruments = MELODIC_INSTRUMENTS;
  public readonly percussionInstruments = PERCUSSION_INSTRUMENTS;

  public frameState: SynthFrameState | null = null;
  public cursorFrame: SynthCursorFrame = {
    continuousColumnPosition: 0,
    colsPerMeasure: 4,
    measureProgressPercent: 0
  };
  public semitoneOffset = 0;

  private lastScrolledColumnIndex = -1;
  private subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(
      this.playerStore.semitoneOffset$.subscribe(offset => {
        this.semitoneOffset = offset;
        this.cdr.markForCheck();
      })
    );

    this.subs.add(
      this.synthEngine.frameState$.subscribe(state => {
        this.frameState = state;
        if (state.activeColumnIndex !== this.lastScrolledColumnIndex) {
          this.lastScrolledColumnIndex = state.activeColumnIndex;
          this.scrollTabToColumn(state.activeColumnIndex);
        }
        this.cdr.markForCheck();
      })
    );

    // Atualiza apenas transform/width dos elementos do cursor a 60fps sem re-renderizar a tablatura inteira
    this.subs.add(
      this.synthEngine.cursorFrame$.subscribe(cursor => {
        this.cursorFrame = cursor;
        const playheadEl = this.playheadRef?.nativeElement;
        if (playheadEl) {
          const px = this.tabRenderer.computePlayheadOffsetPx(cursor.continuousColumnPosition);
          playheadEl.style.transform = `translate3d(${px}px, 0, 0)`;
        }
        const conveyorEl = this.chordConveyorRef?.nativeElement;
        if (conveyorEl) {
          const cx = this.tabRenderer.computeChordConveyorOffsetPx(
            cursor.continuousColumnPosition,
            cursor.colsPerMeasure
          );
          conveyorEl.style.transform = `translate3d(${cx}px, 0, 0)`;
        }
        this.activeMeasureProgressRefs?.forEach(ref => {
          ref.nativeElement.style.width = `${cursor.measureProgressPercent}%`;
        });
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  public get chordConveyorOffsetPx(): number {
    if (!this.frameState) return 0;
    return this.tabRenderer.computeChordConveyorOffsetPx(
      this.cursorFrame.continuousColumnPosition,
      this.frameState.colsPerMeasure
    );
  }

  public get playheadOffsetPx(): number {
    if (!this.frameState) return 24;
    return this.tabRenderer.computePlayheadOffsetPx(this.cursorFrame.continuousColumnPosition);
  }

  public onInstrumentChange(instId: string): void {
    this.playerStore.setInstrument(instId);
  }

  public getTransposedChord(chord: string): string {
    return this.transpose.transposeChord(chord, this.semitoneOffset);
  }

  public getTransposedFret(baseFret: number): number {
    return this.transpose.transposeFret(baseFret, this.semitoneOffset);
  }

  public getNoteOnString(col: TabColumn, stringIndex: number): TabNote | undefined {
    return col.notes.find(n => n.stringIndex === stringIndex);
  }

  public onCellClick(event: MouseEvent, col: TabColumn, lineIdx: number): void {
    if (this.frameState?.config.category !== 'percussao') return;
    event.stopPropagation();
    this.synthEngine.togglePercussionCell(col.index, lineIdx);
  }

  private scrollTabToColumn(colIdx: number): void {
    const container = this.tabScrollContainerRef?.nativeElement;
    if (!container) return;

    const targetX = colIdx * this.tabRenderer.columnWidthPx;
    const viewLeft = container.scrollLeft;
    const viewWidth = container.clientWidth;

    if (targetX > viewLeft + viewWidth - 180 || targetX < viewLeft) {
      const reducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({
        left: Math.max(0, targetX - 120),
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    }
  }
}
