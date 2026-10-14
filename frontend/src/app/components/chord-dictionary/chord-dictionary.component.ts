import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, map } from 'rxjs';
import { SongService } from '../../core/services/song.service';

export interface DisplayChord {
  originalName: string;
  transposedName: string;
  diagram: string;
  baseFret: number;
}

const STANDARD_CHORD_DIAGRAMS: Record<string, string> = {
  'C': 'x,3,2,0,1,0',
  'C#': 'x,4,6,6,6,4',
  'Db': 'x,4,6,6,6,4',
  'D': 'x,x,0,2,3,2',
  'D#': 'x,6,8,8,8,6',
  'Eb': 'x,6,8,8,8,6',
  'E': '0,2,2,1,0,0',
  'F': '1,3,3,2,1,1',
  'F#': '2,4,4,3,2,2',
  'Gb': '2,4,4,3,2,2',
  'G': '3,2,0,0,0,3',
  'G#': '4,6,6,5,4,4',
  'Ab': '4,6,6,5,4,4',
  'A': 'x,0,2,2,2,0',
  'A#': 'x,1,3,3,3,1',
  'Bb': 'x,1,3,3,3,1',
  'B': 'x,2,4,4,4,2',
  'Cm': 'x,3,5,5,4,3',
  'C#m': 'x,4,6,6,5,4',
  'Dbm': 'x,4,6,6,5,4',
  'Dm': 'x,x,0,2,3,1',
  'D#m': 'x,6,8,8,7,6',
  'Ebm': 'x,6,8,8,7,6',
  'Em': '0,2,2,0,0,0',
  'Fm': '1,3,3,1,1,1',
  'F#m': '2,4,4,2,2,2',
  'Gbm': '2,4,4,2,2,2',
  'Gm': '3,5,5,3,3,3',
  'G#m': '4,6,6,4,4,4',
  'Abm': '4,6,6,4,4,4',
  'Am': 'x,0,2,2,1,0',
  'A#m': 'x,1,3,3,2,1',
  'Bbm': 'x,1,3,3,2,1',
  'Bm': 'x,2,4,4,3,2',
  'C7': 'x,3,2,3,1,0',
  'D7': 'x,x,0,2,1,2',
  'E7': '0,2,0,1,0,0',
  'F7': '1,3,1,2,1,1',
  'G7': '3,2,0,0,0,1',
  'A7': 'x,0,2,0,2,0',
  'B7': 'x,2,1,2,0,2'
};

@Component({
  selector: 'app-chord-dictionary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full bg-[#0f172a] border border-slate-800 rounded-3xl p-5 shadow-xl transition-all">
      
      @if ((displayChords$ | async); as chordsList) {
        <!-- Cabeçalho do Dicionário -->
        <div class="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 text-[#FF6D3B] flex items-center justify-center font-bold text-xs">
              ♫
            </div>
            <h2 class="text-base font-extrabold text-white">
              Acordes da Música
            </h2>
          </div>
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {{ chordsList.length }} acordes
          </span>
        </div>

        <!-- Grade de Diagramas -->
        @if (chordsList.length > 0) {
          <div class="grid grid-cols-2 gap-3.5">
            @for (chord of chordsList; track chord.transposedName) {
              <div class="flex flex-col items-center bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-orange-500/40 rounded-2xl p-2.5 transition-all group shadow-sm">
                
                <!-- Nome do Acorde -->
                <div class="flex items-center justify-between w-full px-1 mb-1.5">
                  <span class="text-sm font-black text-white group-hover:text-[#FF6D3B] transition-colors">
                    {{ chord.transposedName }}
                  </span>
                  @if (chord.transposedName !== chord.originalName) {
                    <span class="text-[9px] text-slate-500 font-medium">
                      (orig. {{ chord.originalName }})
                    </span>
                  }
                </div>

                <!-- Diagrama SVG do Acorde (Estilo Dark) -->
                <div class="w-[88px] h-[98px]">
                  <svg viewBox="0 0 90 100" class="w-full h-full select-none">
                    <!-- Pestana superior (nut) -->
                    <rect x="15" y="14" width="60" height="3" rx="1" fill="#cbd5e1" />

                    <!-- 5 Trastes horizontais -->
                    @for (fret of [0, 1, 2, 3, 4]; track fret) {
                      <line 
                        [attr.x1]="15" 
                        [attr.y1]="16 + fret * 18" 
                        [attr.x2]="75" 
                        [attr.y2]="16 + fret * 18" 
                        stroke="#334155" 
                        stroke-width="1" />
                    }

                    <!-- 6 Cordas verticais -->
                    @for (stringIdx of [0, 1, 2, 3, 4, 5]; track stringIdx) {
                      <line 
                        [attr.x1]="15 + stringIdx * 12" 
                        [attr.y1]="16" 
                        [attr.x2]="15 + stringIdx * 12" 
                        [attr.y2]="88" 
                        stroke="#64748b" 
                        stroke-width="1.2" />
                    }

                    <!-- Indicadores de Cordas (o, x, ou bolinhas nos trastes) -->
                    @for (item of parseDiagram(chord.diagram); track item.stringIdx) {
                      @if (item.fret === 'x') {
                        <text 
                          [attr.x]="15 + item.stringIdx * 12" 
                          y="10" 
                          text-anchor="middle" 
                          font-size="9" 
                          font-weight="bold" 
                          fill="#f87171">
                          ×
                        </text>
                      } @else if (item.fret === 0) {
                        <circle 
                          [attr.cx]="15 + item.stringIdx * 12" 
                          cy="8" 
                          r="3" 
                          stroke="#4ade80" 
                          stroke-width="1.5" 
                          fill="none" />
                      } @else if (item.fret > 0) {
                        <circle 
                          [attr.cx]="15 + item.stringIdx * 12" 
                          [attr.cy]="16 + (item.fret - 0.5) * 18" 
                          r="4.5" 
                          fill="#FF6D3B" />
                      }
                    }
                  </svg>
                </div>

              </div>
            }
          </div>
        } @else {
          <div class="py-8 text-center text-xs text-slate-500">
            Nenhum acorde detectado nesta música.
          </div>
        }
      }

    </div>
  `
})
export class ChordDictionaryComponent implements OnInit {
  public songService = inject(SongService);
  private cdr = inject(ChangeDetectorRef);

  // Observable puramente reativo para a lista e diagramas dos acordes transpostos
  public displayChords$: Observable<DisplayChord[]> = combineLatest([
    this.songService.currentSong$,
    this.songService.activeTrack$,
    this.songService.semitoneOffset$
  ]).pipe(
    map(([song, track, offset]) => this.extractAndBuildChords(song, track?.content, offset))
  );

  ngOnInit(): void {
    this.songService.semitoneOffset$.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  private extractAndBuildChords(song: any, content: string | undefined, offset: number): DisplayChord[] {
    const chordNames = new Set<string>();

    if (song?.chords && song.chords.length > 0) {
      song.chords.forEach((c: any) => chordNames.add(c.name));
    }

    if (content) {
      const matches = content.match(/\[([A-G][^\]]*)\]/g);
      if (matches) {
        matches.forEach(m => {
          const raw = m.substring(1, m.length - 1).trim();
          chordNames.add(raw);
        });
      }
    }

    const list: DisplayChord[] = [];
    chordNames.forEach(name => {
      const transposed = this.songService.transposeChordName(name, offset);
      const diagram = STANDARD_CHORD_DIAGRAMS[transposed] || 
                      STANDARD_CHORD_DIAGRAMS[name] || 
                      'x,0,2,2,1,0';

      list.push({
        originalName: name,
        transposedName: transposed,
        diagram: diagram,
        baseFret: 1
      });
    });

    return list;
  }

  public parseDiagram(diagramStr: string): { stringIdx: number; fret: number | 'x' }[] {
    if (!diagramStr) return [];
    const parts = diagramStr.split(',');
    return parts.map((part, index) => {
      const trimmed = part.trim().toLowerCase();
      if (trimmed === 'x') {
        return { stringIdx: index, fret: 'x' };
      }
      const num = parseInt(trimmed, 10);
      return { stringIdx: index, fret: isNaN(num) ? 0 : num };
    });
  }
}
