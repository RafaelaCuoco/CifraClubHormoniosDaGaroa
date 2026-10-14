import { Component, inject, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, map } from 'rxjs';
import { SongService } from '../../core/services/song.service';

export interface LyricSegment {
  chord?: string;
  transposedChord?: string;
  text: string;
}

export interface ParsedLine {
  type: 'section' | 'tab' | 'chords-and-lyrics' | 'empty';
  raw: string;
  segments?: LyricSegment[];
}

@Component({
  selector: 'app-lyrics-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 transition-all">
      
      @if (songService.currentSong$ | async; as song) {
        <!-- Cabeçalho da Música -->
        <div class="border-b border-slate-800/80 pb-5 mb-5 sm:pb-6 sm:mb-6">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div>
              <div class="flex items-center justify-between gap-3">
                <h1 class="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                  {{ song.title }}
                </h1>

                <!-- Botão Editar Cifra no Mobile/Desktop -->
                <button 
                  type="button" 
                  (click)="onEdit()"
                  title="Editar letra, acordes e tablaturas"
                  class="inline-flex sm:hidden items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-[#FF6D3B] border border-orange-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Editar</span>
                </button>
              </div>

              <p class="text-sm sm:text-base md:text-lg font-medium text-slate-400 mt-0.5 sm:mt-1">
                {{ song.artist }}
              </p>
            </div>

            <!-- Badges e Botão Editar no Desktop -->
            <div class="flex flex-wrap items-center gap-2">
              <button 
                type="button" 
                (click)="onEdit()"
                title="Editar letra, acordes e tablaturas desta música"
                class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-[#FF6D3B] border border-orange-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar Cifra</span>
              </button>

              @if (songService.activeTrack$ | async; as track) {
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-500/10 text-[#FF6D3B] font-bold text-xs border border-orange-500/30">
                  {{ track.instrument }}
                </span>
                @if (track.capo > 0) {
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium">
                    Capo: {{ track.capo }}ª
                  </span>
                }
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium">
                  {{ track.tuning }}
                </span>
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium text-xs border border-emerald-500/30">
                  {{ track.difficulty }}
                </span>
              }
            </div>
          </div>
        </div>

        <!-- Área de Renderização da Cifra / Tablatura -->
        <div class="lyrics-container font-mono text-slate-200 leading-relaxed overflow-x-auto select-text">
          @for (line of (parsedLines$ | async) || []; track $index) {
            
            <!-- Linha Vazia (Espaçamento entre estrofes) -->
            @if (line.type === 'empty') {
              <div class="h-5"></div>
            }

            <!-- Título de Seção (Intro, Refrão, Solo) -->
            @else if (line.type === 'section') {
              <div class="my-4">
                <span class="inline-block text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-slate-800 text-slate-300 rounded-md border-l-4 border-[#FF6D3B]">
                  {{ line.raw }}
                </span>
              </div>
            }

            <!-- Linha de Tablatura Pura -->
            @else if (line.type === 'tab') {
              <div class="text-xs sm:text-sm text-emerald-300/90 font-mono whitespace-pre overflow-x-auto py-1 px-3 my-1 tracking-wider bg-slate-950/80 border border-slate-800/80 rounded-xl">
                {{ line.raw }}
              </div>
            }

            <!-- Linha com Cifras e Letra Sincronizada -->
            @else if (line.type === 'chords-and-lyrics') {
              <div class="flex flex-wrap items-end my-1 min-h-[2.85rem] leading-none">
                @for (seg of line.segments; track (seg.transposedChord || '') + seg.text + $index) {
                  <span class="inline-flex flex-col align-bottom mr-0.5">
                    
                    <!-- Acorde Posicionado Acima (Verde Brilhante / Laranja ao Hover) -->
                    <span class="min-h-[1.35rem] flex items-center font-bold text-xs sm:text-sm text-emerald-400 hover:text-[#FF6D3B] cursor-pointer transition-colors select-all">
                      @if (seg.transposedChord) {
                        <span class="bg-emerald-950/50 text-emerald-400 hover:bg-orange-950/50 hover:text-[#FF6D3B] px-1 py-0.2 rounded border border-emerald-500/25 hover:border-orange-500/40">
                          {{ seg.transposedChord }}
                        </span>
                      }
                    </span>

                    <!-- Letra da Música -->
                    <span class="text-sm sm:text-base text-slate-200 font-mono whitespace-pre pt-0.5">
                      {{ seg.text }}
                    </span>
                  </span>
                }
              </div>
            }

          }
        </div>

      } @else {
        <!-- Estado Vazio / Carregando -->
        <div class="text-center py-16">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[#FF6D3B] flex items-center justify-center shadow-lg shadow-orange-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Nenhuma cifra carregada</h2>
          <p class="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Conecte-se à API ou carregue a música de demonstração para testar a sincronização de acordes e transposição em tempo real.
          </p>
          <button 
            type="button"
            (click)="loadDemoSong()"
            class="px-5 py-2.5 rounded-xl bg-[#FF6D3B] hover:bg-[#E64A19] text-white font-bold text-sm shadow-lg shadow-orange-500/30 transition-all cursor-pointer active:scale-95">
            Carregar "Tempo Perdido" (Demo)
          </button>
        </div>
      }

    </div>
  `
})
export class LyricsViewerComponent implements OnInit {
  public songService = inject(SongService);
  private cdr = inject(ChangeDetectorRef);

  @Output() editSong = new EventEmitter<void>();

  public onEdit(): void {
    this.editSong.emit();
  }

  // Observable puramente reativo para a renderização das linhas transpostas
  public parsedLines$: Observable<ParsedLine[]> = combineLatest([
    this.songService.activeTrack$,
    this.songService.semitoneOffset$
  ]).pipe(
    map(([track, offset]) => {
      if (track && track.content) {
        return this.parseContent(track.content, offset);
      }
      return [];
    })
  );

  ngOnInit(): void {
    // Força checagem de renderização em qualquer mudança de transposição
    this.songService.semitoneOffset$.subscribe(() => {
      this.cdr.markForCheck();
    });

    if (!this.songService.currentSong$) {
      this.loadDemoSong();
    }
  }

  public loadDemoSong(): void {
    this.songService.loadSong(1).subscribe({
      next: () => {},
      error: () => {
        this.songService.seedDemoSong().subscribe();
      }
    });
  }

  public parseContent(rawContent: string, offset: number): ParsedLine[] {
    if (!rawContent) return [];
    const lines = rawContent.split(/\r?\n/);

    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        return { type: 'empty', raw: line };
      }

      const sectionMatch = trimmed.match(/^\[([a-zA-ZÀ-ÿ\s0-9\-_:.]+)\]$/);
      if (sectionMatch && sectionMatch[1].length > 4 && !this.isChordName(sectionMatch[1])) {
        return { type: 'section', raw: sectionMatch[1] };
      }

      if (/^[eBGDAE]\|/i.test(trimmed) || (trimmed.includes('|') && trimmed.includes('-'))) {
        return { type: 'tab', raw: line };
      }

      if (/\[[A-G][^\]]*\]/.test(line)) {
        const segments: LyricSegment[] = [];
        const regex = /\[([A-G][^\]]*)\]([^\[]*)/g;

        const firstBracket = line.indexOf('[');
        if (firstBracket > 0) {
          segments.push({
            text: line.substring(0, firstBracket)
          });
        }

        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          const chordName = match[1];
          const text = match[2];
          const transposed = this.songService.transposeChordName(chordName, offset);
          segments.push({
            chord: chordName,
            transposedChord: transposed,
            text: text
          });
        }

        return {
          type: 'chords-and-lyrics',
          raw: line,
          segments: segments.length > 0 ? segments : [{ text: line }]
        };
      }

      return {
        type: 'chords-and-lyrics',
        raw: line,
        segments: [{ text: line }]
      };
    });
  }

  private isChordName(str: string): boolean {
    return /^[A-G][#b]?(m|maj|min|dim|aug|sus|[0-9])*/.test(str.trim());
  }
}
