import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SongService } from '../../core/services/song.service';

@Component({
  selector: 'app-toolbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full bg-[#0f172a] border border-slate-800 rounded-2xl shadow-lg p-3 sm:px-4 sm:py-3.5 mb-5 sm:mb-6 transition-all hover:border-slate-700">
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4">
        
        <!-- Linha 1 no Mobile / Bloco 1 no Desktop: Transposição de Tom & Instrumento -->
        <div class="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4">
          
          <!-- Bloco Tom -->
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 mr-0.5 sm:mr-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-[#FF6D3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Tom
            </span>

            <div class="inline-flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button 
                type="button" 
                (click)="onTransposeDown()"
                title="Diminuir meio tom (-1/2)"
                class="w-8 h-8 flex items-center justify-center font-bold text-slate-100 bg-slate-700/80 hover:bg-slate-600 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer">
                -
              </button>

              <div class="px-2.5 sm:px-3 min-w-[50px] sm:min-w-[56px] text-center">
                <span class="text-sm sm:text-base font-extrabold text-[#FF6D3B] block leading-none">
                  {{ songService.currentKey$ | async }}
                </span>
                <span class="text-[10px] text-slate-400 font-medium">
                  @if ((songService.semitoneOffset$ | async); as offset) {
                    @if (offset > 0) { +{{ offset }} }
                    @else if (offset < 0) { {{ offset }} }
                    @else { Original }
                  } @else {
                    Original
                  }
                </span>
              </div>

              <button 
                type="button" 
                (click)="onTransposeUp()"
                title="Aumentar meio tom (+1/2)"
                class="w-8 h-8 flex items-center justify-center font-bold text-slate-100 bg-slate-700/80 hover:bg-slate-600 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer">
                +
              </button>
            </div>

            @if ((songService.semitoneOffset$ | async) !== 0) {
              <button 
                type="button" 
                (click)="onResetTranspose()"
                class="text-[11px] sm:text-xs text-slate-400 hover:text-[#FF6D3B] underline px-0.5 transition-colors cursor-pointer">
                Reset
              </button>
            }
          </div>

          <!-- Bloco Instrumento -->
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            <span class="hidden sm:inline-flex text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#FF6D3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Instrumento
            </span>

            <div class="relative">
              <select 
                [ngModel]="songService.activeInstrument$ | async"
                (ngModelChange)="onInstrumentChange($event)"
                class="bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold rounded-xl px-2.5 sm:px-3 py-2 pr-7 sm:pr-8 focus:ring-2 focus:ring-[#FF6D3B] focus:outline-none transition-all cursor-pointer">
                @for (inst of availableInstruments; track inst) {
                  <option [value]="inst" class="bg-slate-900 text-slate-100">{{ inst }}</option>
                }
              </select>
            </div>
          </div>

        </div>

        <!-- Linha 2 no Mobile / Bloco 3 no Desktop: Controle de Rolagem Automática -->
        <div class="flex items-center justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FF6D3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            Rolagem
          </span>

          <div class="flex items-center gap-2">
            <!-- Botão Iniciar / Pausar Rolagem -->
            <button 
              type="button" 
              (click)="onToggleAutoScroll()"
              [ngClass]="(songService.isAutoScrolling$ | async) ? 'bg-[#E64A19] text-white shadow-lg shadow-orange-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all active:scale-95 cursor-pointer">
              @if (songService.isAutoScrolling$ | async) {
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Pausar
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 fill-current text-[#FF6D3B]" viewBox="0 0 20 20">
                  <path d="M4.5 3.5v13a.5.5 0 00.75.433l11-6.5a.5.5 0 000-.866l-11-6.5A.5.5 0 004.5 3.5z" />
                </svg>
                Rolar
              }
            </button>

            <!-- Ajuste de Velocidade -->
            <div class="inline-flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button 
                type="button" 
                (click)="onDecreaseSpeed()"
                title="Diminuir velocidade"
                class="w-6 h-6 flex items-center justify-center font-bold text-xs text-slate-100 bg-slate-700 hover:bg-slate-600 rounded shadow-2xs transition-all cursor-pointer">
                -
              </button>
              <span class="px-2 text-xs font-bold text-slate-200">
                {{ songService.scrollSpeed$ | async }}x
              </span>
              <button 
                type="button" 
                (click)="onIncreaseSpeed()"
                title="Aumentar velocidade"
                class="w-6 h-6 flex items-center justify-center font-bold text-xs text-slate-100 bg-slate-700 hover:bg-slate-600 rounded shadow-2xs transition-all cursor-pointer">
                +
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class ToolboxComponent implements OnInit, OnDestroy {
  public songService = inject(SongService);

  public availableInstruments: string[] = ['Violão', 'Guitarra', 'Cavaco', 'Ukulele', 'Teclado', 'Baixo'];

  private scrollTimer: any = null;
  private autoScrollSub: Subscription | null = null;
  private currentSpeed = 1;

  ngOnInit(): void {
    this.songService.currentSong$.subscribe(song => {
      if (song && song.tracks && song.tracks.length > 0) {
        const instruments = song.tracks.map(t => t.instrument);
        const combined = Array.from(new Set([...instruments, ...this.availableInstruments]));
        this.availableInstruments = combined;
      }
    });

    this.songService.scrollSpeed$.subscribe(speed => {
      this.currentSpeed = speed;
      if (this.scrollTimer) {
        this.restartAutoScroll();
      }
    });

    this.autoScrollSub = this.songService.isAutoScrolling$.subscribe(isScrolling => {
      if (isScrolling) {
        this.startScrollLoop();
      } else {
        this.stopScrollLoop();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopScrollLoop();
    if (this.autoScrollSub) {
      this.autoScrollSub.unsubscribe();
    }
  }

  public onTransposeUp(): void {
    this.songService.transposeUp();
  }

  public onTransposeDown(): void {
    this.songService.transposeDown();
  }

  public onResetTranspose(): void {
    this.songService.resetTranspose();
  }

  public onInstrumentChange(instrument: string): void {
    this.songService.setActiveInstrument(instrument);
  }

  public onToggleAutoScroll(): void {
    this.songService.toggleAutoScroll();
  }

  public onIncreaseSpeed(): void {
    this.songService.setScrollSpeed(this.currentSpeed + 1);
  }

  public onDecreaseSpeed(): void {
    this.songService.setScrollSpeed(this.currentSpeed - 1);
  }

  private startScrollLoop(): void {
    if (this.scrollTimer) return;

    const intervalMs = 40;
    this.scrollTimer = setInterval(() => {
      if (typeof window !== 'undefined') {
        const step = this.currentSpeed * 1.5;
        window.scrollBy({ top: step, behavior: 'auto' });

        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 5) {
          this.songService.stopAutoScroll();
        }
      }
    }, intervalMs);
  }

  private stopScrollLoop(): void {
    if (this.scrollTimer) {
      clearInterval(this.scrollTimer);
      this.scrollTimer = null;
    }
  }

  private restartAutoScroll(): void {
    this.stopScrollLoop();
    this.startScrollLoop();
  }
}
