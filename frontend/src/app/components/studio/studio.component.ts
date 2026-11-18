import { Component, inject, Input, Output, EventEmitter, ElementRef, ViewChild, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SongStore } from '../../core/stores/song.store';
import { AuthStore } from '../../core/stores/auth.store';
import { Song, InstrumentTrack } from '../../core/models/song.model';
import { SUPPORTED_INSTRUMENTS } from '../../core/helpers/instrument-catalog';
import { COMMON_CHORDS } from '../../core/helpers/chord-format.helper';
import { TransposeService } from '../../core/engines/transpose.service';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  IconButtonComponent,
  IconComponent,
  PT_BR_GLOSSARY,
  ToggleComponent
} from '../../design-system';
import { AuthGateComponent } from '../auth/auth-gate.component';
import { VisibilityBadgeComponent } from '../visibility-badge/visibility-badge.component';

@Component({
  selector: 'app-studio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    BadgeComponent,
    ButtonComponent,
    IconButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ToggleComponent,
    AuthGateComponent,
    VisibilityBadgeComponent
  ],
  template: `
    <ct-card padding="lg">
      <!-- Cabeçalho do Estúdio -->
      <div
        class="border-b pb-4 mb-5 sm:pb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        style="border-color: var(--ct-border-default);">
        <div>
          <div class="mb-2">
            <ct-badge variant="primary" icon="sparkles">
              {{ editSong ? 'Edição de Cifra e Tablatura' : 'Estúdio de Criação Cifra Trans' }}
            </ct-badge>
          </div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-black tracking-tight" style="color: var(--ct-text-primary);">
            @if (editSong) {
              Editar Cifra: <span style="color: var(--ct-accent-highlight);">{{ formData.title || editSong.title }}</span>
            } @else {
              Cadastrar Nova Cifra & Tablatura
            }
          </h1>
          <p class="text-xs sm:text-sm mt-1 max-w-2xl" style="color: var(--ct-text-muted);">
            Crie ou edite sua página de notas, insira tablaturas de 6 cordas para o sintetizador e escolha a visibilidade.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          @if (returnToPlaylistLabel) {
            <ct-button variant="secondary" size="sm" leftIcon="arrow-left" (pressed)="onBackToPlaylist()">
              Voltar para playlist
            </ct-button>
          }
          <ct-button variant="ghost" size="sm" leftIcon="arrow-left" (pressed)="onCancel()">
            Ir para o {{ glossary.areas.palco }}
          </ct-button>
        </div>
      </div>

      @if (!(authStore.currentUser$ | async)) {
        <ct-auth-gate
          mode="inline"
          [title]="editSong ? glossary.auth.loginToEdit : glossary.auth.loginToCreate"
          description="Entre com sua conta validada ou crie uma conta para cadastrar e editar cifras, páginas de notas e tablaturas sincronizadas.">
        </ct-auth-gate>
      } @else if (editSong && !authStore.canEditSong(editSong)) {
        <ct-empty-state
          icon="shield"
          title="Sem permissão para editar esta cifra"
          description="Apenas o autor desta cifra ou um administrador pode editar seu conteúdo ou alterar sua visibilidade."
          [actionLabel]="'Voltar para o ' + glossary.areas.palco"
          actionIcon="arrow-left"
          (action)="onCancel()">
        </ct-empty-state>
      } @else {
        <form (ngSubmit)="onSubmit()" class="space-y-5 sm:space-y-6">

          <!-- Controle Único de Visibilidade (Toggle + Badge) -->
          <div
            class="p-4 rounded-[var(--ct-radius-lg)] border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default);">
            <div class="flex items-center gap-2.5 flex-wrap">
              <div>
                <span class="text-xs font-black uppercase tracking-wider block" style="color: var(--ct-success-fg);">
                  Visibilidade da Página de Notas
                </span>
                <span class="text-xs" style="color: var(--ct-text-muted);">
                  Defina se esta cifra ficará pública no catálogo ou privada para o seu perfil.
                </span>
              </div>
              <ct-visibility-badge [isPublic]="formData.isPublic" size="md"></ct-visibility-badge>
            </div>

            <ct-toggle
              [label]="formData.isPublic ? glossary.visibility.public : glossary.visibility.private"
              [description]="formData.isPublic ? 'Visível para todos no Mural' : 'Visível apenas no seu perfil'"
              [(checked)]="formData.isPublic">
            </ct-toggle>
          </div>

          <!-- Linha 1: Metadados Principais -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div>
              <label for="studio-title" class="block text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--ct-text-secondary);">
                Título da Música *
              </label>
              <input
                id="studio-title"
                type="text"
                name="title"
                [(ngModel)]="formData.title"
                required
                placeholder="Ex: Como Nossos Pais"
                class="w-full border rounded-[var(--ct-radius-md)] px-3.5 py-2.5 text-sm font-medium transition-all"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="studio-artist" class="block text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--ct-text-secondary);">
                Artista / Banda *
              </label>
              <input
                id="studio-artist"
                type="text"
                name="artist"
                [(ngModel)]="formData.artist"
                required
                placeholder="Ex: Elis Regina"
                class="w-full border rounded-[var(--ct-radius-md)] px-3.5 py-2.5 text-sm font-medium transition-all"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="studio-original-key" class="block text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--ct-text-secondary);">
                {{ glossary.player.key }} Original
              </label>
              <div class="relative inline-flex items-center w-full">
                <select
                  id="studio-original-key"
                  name="originalKey"
                  [(ngModel)]="formData.originalKey"
                  class="ct-native-select w-full border rounded-[var(--ct-radius-md)] px-3.5 py-2.5 pr-9 text-sm font-semibold transition-all cursor-pointer"
                  style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">
                  @for (key of musicalKeys; track key) {
                    <option [value]="key">{{ key }}</option>
                  }
                </select>
                <span class="pointer-events-none absolute right-2.5 inline-flex" style="color: var(--ct-text-muted);">
                  <ct-icon name="chevron-down" [size]="15"></ct-icon>
                </span>
              </div>
            </div>

            <div>
              <label for="studio-bpm" class="block text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--ct-text-secondary);">
                {{ glossary.player.bpm }} (Andamento)
              </label>
              <input
                id="studio-bpm"
                type="number"
                name="bpm"
                [(ngModel)]="formData.bpm"
                placeholder="Ex: 120"
                class="w-full border rounded-[var(--ct-radius-md)] px-3.5 py-2.5 text-sm font-medium transition-all"
                style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>
          </div>

          <!-- Linha 2: Detalhes do Instrumento / Faixa -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-[var(--ct-radius-lg)] border"
            style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default);">
            <div>
              <label for="studio-instrument" class="block text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--ct-text-secondary);">
                {{ glossary.player.instrument }}
              </label>
              <div class="relative inline-flex items-center w-full">
                <select
                  id="studio-instrument"
                  name="instrument"
                  [(ngModel)]="formData.instrument"
                  class="ct-native-select w-full border rounded-[var(--ct-radius-md)] px-3 py-2 pr-8 text-sm font-semibold transition-all cursor-pointer"
                  style="background: var(--ct-bg-surface); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">
                  @for (inst of supportedInstruments; track inst.id) {
                    <option [value]="inst.id">{{ inst.studioLabel }}</option>
                  }
                </select>
                <span class="pointer-events-none absolute right-2.5 inline-flex" style="color: var(--ct-text-muted);">
                  <ct-icon name="chevron-down" [size]="15"></ct-icon>
                </span>
              </div>
            </div>

            <div>
              <label for="studio-difficulty" class="block text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--ct-text-secondary);">
                Dificuldade
              </label>
              <div class="relative inline-flex items-center w-full">
                <select
                  id="studio-difficulty"
                  name="difficulty"
                  [(ngModel)]="formData.difficulty"
                  class="ct-native-select w-full border rounded-[var(--ct-radius-md)] px-3 py-2 pr-8 text-sm font-medium transition-all cursor-pointer"
                  style="background: var(--ct-bg-surface); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">
                  <option value="Fácil">Fácil</option>
                  <option value="Médio">Médio</option>
                  <option value="Difícil">Difícil</option>
                </select>
                <span class="pointer-events-none absolute right-2.5 inline-flex" style="color: var(--ct-text-muted);">
                  <ct-icon name="chevron-down" [size]="15"></ct-icon>
                </span>
              </div>
            </div>

            <div>
              <label for="studio-tuning" class="block text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--ct-text-secondary);">
                Afinação
              </label>
              <input
                id="studio-tuning"
                type="text"
                name="tuning"
                [(ngModel)]="formData.tuning"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-sm font-medium transition-all"
                style="background: var(--ct-bg-surface); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>

            <div>
              <label for="studio-capo" class="block text-xs font-bold uppercase tracking-wider mb-1" style="color: var(--ct-text-secondary);">
                Capotraste (Casa)
              </label>
              <input
                id="studio-capo"
                type="number"
                name="capo"
                min="0"
                max="12"
                [(ngModel)]="formData.capo"
                class="w-full border rounded-[var(--ct-radius-md)] px-3 py-2 text-sm font-medium transition-all"
                style="background: var(--ct-bg-surface); border-color: var(--ct-border-strong); color: var(--ct-text-primary);" />
            </div>
          </div>

          <!-- Barra de Inserção Rápida de Acordes + Bloco de Tablatura -->
          <div
            class="p-3 border rounded-[var(--ct-radius-lg)] space-y-2.5"
            style="background: var(--ct-bg-elevated); border-color: var(--ct-border-default);">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--ct-text-muted);">
                Atalhos de Acordes e Tablatura:
              </span>
              <ct-button variant="primary" size="sm" leftIcon="guitar" (pressed)="insertTabBlock()">
                Inserir Bloco de Tablatura (6 Cordas)
              </ct-button>
            </div>

            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              @for (chord of commonChords; track chord) {
                <button
                  type="button"
                  (click)="insertChord(chord)"
                  class="shrink-0 px-2.5 py-1.5 border rounded-[var(--ct-radius-sm)] text-xs font-bold transition-all cursor-pointer active:scale-90"
                  style="background: var(--ct-chord-bg); color: var(--ct-chord-fg); border-color: var(--ct-chord-border);">
                  [{{ chord }}]
                </button>
              }
            </div>
          </div>

          <!-- Textarea Monoespaçada de Cifra -->
          <div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
              <label for="studio-content" class="text-xs font-bold uppercase tracking-wider" style="color: var(--ct-text-secondary);">
                Conteúdo da Cifra / Tablatura *
              </label>
              <span class="text-[11px]" style="color: var(--ct-text-muted);">
                Formato: [Acorde]Letra ou tablaturas e|---| reproduzidas no sintetizador
              </span>
            </div>

            <textarea
              id="studio-content"
              #contentArea
              name="content"
              rows="12"
              [(ngModel)]="formData.content"
              required
              placeholder="Ex:&#10;[Intro]&#10;[C] [Am] [Em] [F]&#10;&#10;[C] Minha vida é um [Am]livro aberto..."
              class="ct-chord-sheet w-full text-xs sm:text-sm leading-relaxed p-3.5 sm:p-4 rounded-[var(--ct-radius-lg)] border transition-all shadow-inner"
              style="background: var(--ct-bg-canvas); color: var(--ct-text-primary); border-color: var(--ct-border-strong);"></textarea>
          </div>

          @if (feedbackMessage) {
            <div
              class="p-3.5 sm:p-4 rounded-[var(--ct-radius-md)] border text-xs sm:text-sm font-semibold flex items-center justify-between"
              [style]="isSuccess
                ? { background: 'var(--ct-success-bg)', color: 'var(--ct-success-fg)', 'border-color': 'var(--ct-success-border)' }
                : { background: 'var(--ct-danger-soft-bg)', color: 'var(--ct-danger-fg)', 'border-color': 'var(--ct-danger-border)' }">
              <span>{{ feedbackMessage }}</span>
              <ct-icon-button icon="x" ariaLabel="Fechar mensagem" variant="ghost" size="sm" (pressed)="feedbackMessage = ''"></ct-icon-button>
            </div>
          }

          <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <ct-button variant="ghost" (pressed)="onCancel()">Cancelar</ct-button>
            <ct-button type="submit" variant="primary" leftIcon="save" [loading]="isSubmitting">
              @if (isSubmitting) {
                {{ editSong ? 'Atualizando...' : 'Salvando...' }}
              } @else {
                {{ editSong ? 'Salvar e abrir no ' + glossary.areas.palco : 'Salvar e visualizar cifra' }}
              }
            </ct-button>
          </div>

        </form>
      }
    </ct-card>
  `
})
export class StudioComponent implements OnInit, OnChanges {
  private readonly songStore = inject(SongStore);
  public readonly authStore = inject(AuthStore);
  private readonly transpose = inject(TransposeService);
  public readonly glossary = PT_BR_GLOSSARY;
  public readonly supportedInstruments = SUPPORTED_INSTRUMENTS;

  @Input() editSong: Song | null = null;
  @Input() editTrack: InstrumentTrack | null = null;
  @Input() returnToPlaylistLabel: string | null = null;

  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() backToPlaylist = new EventEmitter<void>();
  @ViewChild('contentArea') contentAreaRef!: ElementRef<HTMLTextAreaElement>;

  public readonly musicalKeys: readonly string[] = this.transpose.musicalKeys;
  public readonly commonChords: readonly string[] = COMMON_CHORDS;

  public isSubmitting = false;
  public feedbackMessage = '';
  public isSuccess = false;

  public formData = {
    title: '',
    artist: '',
    originalKey: 'C',
    bpm: 120 as number | null,
    isPublic: true,
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
      this.formData.bpm = this.editSong.bpm ?? 120;
      this.formData.isPublic = this.editSong.isPublic !== undefined ? this.editSong.isPublic : true;

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
      bpm: 120,
      isPublic: true,
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

  public insertTabBlock(): void {
    const tabBlock = `\n[Riff / Solo]\ne|-------0---------------0---------------|\nB|-----1---1-----------1---1-------------|\nG|---0-------0-------2-------2-----------|\nD|-----------------2-----------2---------|\nA|-3-------------0-----------------------|\nE|---------------------------------------|\n`;
    const textarea = this.contentAreaRef?.nativeElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = this.formData.content;
      this.formData.content = text.substring(0, start) + tabBlock + text.substring(end);
    } else {
      this.formData.content += tabBlock;
    }
  }

  public onSubmit(): void {
    if (!this.authStore.isLoggedIn()) {
      this.authStore.requireAuth(
        this.editSong ? AuthStore.REASONS.edit.actionLabel : AuthStore.REASONS.create.actionLabel,
        this.editSong ? AuthStore.REASONS.edit.explanation : AuthStore.REASONS.create.explanation,
        () => this.onSubmit()
      );
      return;
    }

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
      isPublic: this.formData.isPublic,
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
      this.songStore.updateSong(this.editSong.id, payload).subscribe({
        next: (updatedSong) => {
          this.isSubmitting = false;
          this.isSuccess = true;
          this.feedbackMessage = `Cifra "${updatedSong.title}" atualizada com sucesso!`;
          setTimeout(() => {
            this.saved.emit();
          }, 400);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.isSuccess = false;
          this.feedbackMessage = err?.error?.message || 'Erro ao atualizar a cifra no backend.';
        }
      });
    } else {
      this.songStore.createSong(payload).subscribe({
        next: (createdSong) => {
          this.isSubmitting = false;
          this.isSuccess = true;
          this.feedbackMessage = `Música "${createdSong.title}" cadastrada com sucesso!`;
          setTimeout(() => {
            this.saved.emit();
          }, 400);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.isSuccess = false;
          this.feedbackMessage = err?.error?.message || 'Erro ao salvar a música no backend.';
        }
      });
    }
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  public onBackToPlaylist(): void {
    this.backToPlaylist.emit();
  }
}
