import { Component, inject, Input, Output, EventEmitter, ElementRef, ViewChild, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SongService } from '../../core/services/song.service';
import { Song, InstrumentTrack } from '../../core/models/song.model';

@Component({
  selector: 'app-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 transition-all">
      
      <!-- Cabeçalho do Estúdio -->
      <div class="border-b border-slate-800/80 pb-4 mb-5 sm:pb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[#FF6D3B] font-bold text-xs uppercase tracking-wider mb-2">
            @if (editSong) {
              <span>✦ Modo de Edição de Cifra</span>
            } @else {
              <span>✦ Estúdio de Criação Cifra Trans</span>
            }
          </div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
            @if (editSong) {
              Editar Cifra: <span class="text-[#FF6D3B]">{{ formData.title || editSong.title }}</span>
            } @else {
              Cadastrar Nova Cifra & Tablatura
            }
          </h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            @if (editSong) {
              Atualize a letra, posições dos acordes entre colchetes (ex: <code class="text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded font-mono font-bold">[Am]</code>) e afinação.
            } @else {
              Digite ou cole a letra, insira os acordes entre colchetes (ex: <code class="text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded font-mono font-bold">[Am]</code>) e salve diretamente no PostgreSQL.
            }
          </p>
        </div>

        <button 
          type="button" 
          (click)="onCancel()"
          class="self-start sm:self-auto px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-all cursor-pointer border border-transparent hover:border-slate-700">
          ← Voltar ao Visualizador
        </button>
      </div>

      <!-- Formulário -->
      <form (ngSubmit)="onSubmit()" class="space-y-5 sm:space-y-6">
        
        <!-- Linha 1: Metadados Principais -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          <!-- Título -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Título da Música *
            </label>
            <input 
              type="text" 
              name="title" 
              [(ngModel)]="formData.title" 
              required
              placeholder="Ex: Como Nossos Pais"
              class="w-full bg-slate-900 border border-slate-700 focus:border-[#FF6D3B] focus:bg-slate-850 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-100 focus:outline-none transition-all placeholder:text-slate-600" />
          </div>

          <!-- Artista -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Artista / Banda *
            </label>
            <input 
              type="text" 
              name="artist" 
              [(ngModel)]="formData.artist" 
              required
              placeholder="Ex: Elis Regina"
              class="w-full bg-slate-900 border border-slate-700 focus:border-[#FF6D3B] focus:bg-slate-850 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-100 focus:outline-none transition-all placeholder:text-slate-600" />
          </div>

          <!-- Tom Original -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Tom Original
            </label>
            <select 
              name="originalKey" 
              [(ngModel)]="formData.originalKey"
              class="w-full bg-slate-900 border border-slate-700 focus:border-[#FF6D3B] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none transition-all cursor-pointer">
              @for (key of musicalKeys; track key) {
                <option [value]="key" class="bg-slate-900 text-slate-100">{{ key }}</option>
              }
            </select>
          </div>

          <!-- BPM -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              BPM (Andamento)
            </label>
            <input 
              type="number" 
              name="bpm" 
              [(ngModel)]="formData.bpm" 
              placeholder="Ex: 120"
              class="w-full bg-slate-900 border border-slate-700 focus:border-[#FF6D3B] rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-100 focus:outline-none transition-all placeholder:text-slate-600" />
          </div>

        </div>

        <!-- Linha 2: Detalhes do Instrumento / Faixa -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Instrumento
            </label>
            <select 
              name="instrument" 
              [(ngModel)]="formData.instrument"
              class="w-full bg-slate-800 border border-slate-700 focus:border-[#FF6D3B] rounded-xl px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none transition-all cursor-pointer">
              <option value="Violão" class="bg-slate-900 text-slate-100">Violão</option>
              <option value="Guitarra" class="bg-slate-900 text-slate-100">Guitarra</option>
              <option value="Cavaco" class="bg-slate-900 text-slate-100">Cavaco</option>
              <option value="Ukulele" class="bg-slate-900 text-slate-100">Ukulele</option>
              <option value="Teclado" class="bg-slate-900 text-slate-100">Teclado</option>
              <option value="Baixo" class="bg-slate-900 text-slate-100">Baixo</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Dificuldade
            </label>
            <select 
              name="difficulty" 
              [(ngModel)]="formData.difficulty"
              class="w-full bg-slate-800 border border-slate-700 focus:border-[#FF6D3B] rounded-xl px-3 py-2 text-sm font-medium text-slate-100 focus:outline-none transition-all cursor-pointer">
              <option value="Fácil" class="bg-slate-900 text-slate-100">Fácil</option>
              <option value="Médio" class="bg-slate-900 text-slate-100">Médio</option>
              <option value="Difícil" class="bg-slate-900 text-slate-100">Difícil</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Afinação
            </label>
            <input 
              type="text" 
              name="tuning" 
              [(ngModel)]="formData.tuning"
              class="w-full bg-slate-800 border border-slate-700 focus:border-[#FF6D3B] rounded-xl px-3 py-2 text-sm font-medium text-slate-100 focus:outline-none transition-all" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Capotraste (Casa)
            </label>
            <input 
              type="number" 
              name="capo" 
              min="0" 
              max="12" 
              [(ngModel)]="formData.capo"
              class="w-full bg-slate-800 border border-slate-700 focus:border-[#FF6D3B] rounded-xl px-3 py-2 text-sm font-medium text-slate-100 focus:outline-none transition-all" />
          </div>

        </div>

        <!-- Barra de Inserção Rápida de Acordes (Otimizada para Mobile com Scroll Horizontal Suave) -->
        <div class="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-[#FF6D3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Inserir Acorde Rápido:
            </span>
            <span class="text-[10px] text-slate-500 sm:hidden">Deslize para o lado →</span>
          </div>
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            @for (chord of commonChords; track chord) {
              <button 
                type="button" 
                (click)="insertChord(chord)"
                class="shrink-0 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-90 border border-slate-700 rounded-lg text-xs font-bold text-emerald-400 hover:text-[#FF6D3B] transition-all cursor-pointer">
                [{{ chord }}]
              </button>
            }
          </div>
        </div>

        <!-- Textarea Inteligente de Cifra -->
        <div>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Conteúdo da Cifra / Tablatura *
            </label>
            <span class="text-[11px] text-slate-500">
              Formato: [Acorde]Letra ou tablaturas e seções [Intro]
            </span>
          </div>

          <textarea 
            #contentArea
            name="content" 
            rows="12" 
            [(ngModel)]="formData.content"
            required
            placeholder="Ex:&#10;[Intro]&#10;[C] [Am] [Em] [F]&#10;&#10;[C] Minha vida é um [Am]livro aberto&#10;Tudo aquilo que [Em]você sonhou..."
            class="w-full bg-[#080c14] text-slate-100 font-mono text-xs sm:text-sm leading-relaxed p-3.5 sm:p-4 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-[#FF6D3B] focus:border-transparent focus:outline-none transition-all shadow-inner placeholder:text-slate-600"></textarea>
        </div>

        <!-- Notificação de Feedback -->
        @if (feedbackMessage) {
          <div 
            [ngClass]="isSuccess ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' : 'bg-red-950/60 text-red-300 border-red-500/40'"
            class="p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between">
            <span>{{ feedbackMessage }}</span>
            <button type="button" (click)="feedbackMessage = ''" class="text-slate-400 hover:text-slate-200 text-lg leading-none cursor-pointer">×</button>
          </div>
        }

        <!-- Botões de Ação -->
        <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button 
            type="button" 
            (click)="onCancel()"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-all cursor-pointer text-center">
            Cancelar
          </button>
          <button 
            type="submit" 
            [disabled]="isSubmitting"
            class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#FF6D3B] hover:bg-[#E64A19] text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50 text-center">
            @if (isSubmitting) {
              {{ editSong ? 'Atualizando no PostgreSQL...' : 'Salvando no PostgreSQL...' }}
            } @else {
              {{ editSong ? 'Salvar Alterações na Cifra' : 'Salvar e Visualizar Cifra' }}
            }
          </button>
        </div>

      </form>

    </div>
  `
})
export class StudioComponent implements OnInit, OnChanges {
  private songService = inject(SongService);

  @Input() editSong: Song | null = null;
  @Input() editTrack: InstrumentTrack | null = null;

  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('contentArea') contentAreaRef!: ElementRef<HTMLTextAreaElement>;

  public musicalKeys: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  public commonChords: string[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Dm', 'Em', 'F#m', 'Bm', 'C7', 'G7', 'A7'];

  public isSubmitting = false;
  public feedbackMessage = '';
  public isSuccess = false;

  public formData = {
    title: '',
    artist: '',
    originalKey: 'C',
    bpm: null as number | null,
    instrument: 'Violão',
    difficulty: 'Fácil',
    tuning: 'Padrão (E A D G B E)',
    capo: 0,
    content: ''
  };

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editSong'] || changes['editTrack']) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    if (this.editSong) {
      this.formData.title = this.editSong.title;
      this.formData.artist = this.editSong.artist;
      this.formData.originalKey = this.editSong.originalKey || 'C';
      this.formData.bpm = this.editSong.bpm ?? null;

      const track = this.editTrack || (this.editSong.tracks && this.editSong.tracks[0]);
      if (track) {
        this.formData.instrument = track.instrument || 'Violão';
        this.formData.difficulty = track.difficulty || 'Fácil';
        this.formData.tuning = track.tuning || 'Padrão (E A D G B E)';
        this.formData.capo = track.capo || 0;
        this.formData.content = track.content || '';
      }
    } else {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.formData = {
      title: '',
      artist: '',
      originalKey: 'C',
      bpm: null,
      instrument: 'Violão',
      difficulty: 'Fácil',
      tuning: 'Padrão (E A D G B E)',
      capo: 0,
      content: ''
    };
    this.feedbackMessage = '';
  }

  public insertChord(chord: string): void {
    const textarea = this.contentAreaRef?.nativeElement;
    const tag = `[${chord}]`;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = this.formData.content;
      this.formData.content = text.substring(0, start) + tag + text.substring(end);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      this.formData.content += tag;
    }
  }

  public onSubmit(): void {
    if (!this.formData.title.trim() || !this.formData.artist.trim() || !this.formData.content.trim()) {
      this.feedbackMessage = 'Por favor, preencha o Título, Artista e o Conteúdo da cifra.';
      this.isSuccess = false;
      return;
    }

    this.isSubmitting = true;
    this.feedbackMessage = '';

    const payload = {
      title: this.formData.title.trim(),
      artist: this.formData.artist.trim(),
      originalKey: this.formData.originalKey,
      bpm: this.formData.bpm ?? undefined,
      tracks: [
        {
          instrument: this.formData.instrument,
          content: this.formData.content,
          difficulty: this.formData.difficulty,
          tuning: this.formData.tuning,
          capo: this.formData.capo
        }
      ]
    };

    if (this.editSong) {
      this.songService.updateSong(this.editSong.id, payload).subscribe({
        next: (updatedSong) => {
          this.isSubmitting = false;
          this.isSuccess = true;
          this.feedbackMessage = `Cifra "${updatedSong.title}" atualizada com sucesso no PostgreSQL!`;
          setTimeout(() => {
            this.saved.emit();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.isSuccess = false;
          this.feedbackMessage = 'Erro ao atualizar a cifra no backend. Verifique a conexão com a API.';
          console.error(err);
        }
      });
    } else {
      this.songService.createSong(payload).subscribe({
        next: (createdSong) => {
          this.isSubmitting = false;
          this.isSuccess = true;
          this.feedbackMessage = `Música "${createdSong.title}" cadastrada com sucesso no PostgreSQL!`;
          setTimeout(() => {
            this.saved.emit();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.isSuccess = false;
          this.feedbackMessage = 'Erro ao salvar a música no backend. Verifique se a API está em execução.';
          console.error(err);
        }
      });
    }
  }

  public onCancel(): void {
    this.cancel.emit();
  }
}
