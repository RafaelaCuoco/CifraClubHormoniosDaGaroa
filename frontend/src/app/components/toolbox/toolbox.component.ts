import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerStore } from '../../core/stores/player.store';
import { BadgeComponent, IconComponent, PT_BR_GLOSSARY } from '../../design-system';

/**
 * Barra de ferramentas de apresentação pura do Modo Palco.
 * Consome PlayerStore para transposição única, badge de instrumento e rolagem automática.
 */
@Component({
  selector: 'app-toolbox',
  standalone: true,
  imports: [CommonModule, IconComponent, BadgeComponent],
  template: `
    <div
      class="w-full border rounded-[var(--ct-radius-xl)] p-3 sm:px-4 sm:py-3.5 mb-5 sm:mb-6 transition-all"
      style="background: var(--ct-bg-surface); border-color: var(--ct-border-default); box-shadow: var(--ct-shadow-md);">
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4">

        <!-- Bloco 1: Transposição única (− / Tom / +) + Badge somente leitura do Instrumento -->
        <div class="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 flex-wrap">

          <div class="flex items-center gap-1.5 sm:gap-2">
            <span
              class="text-xs font-bold uppercase tracking-wider mr-0.5 sm:mr-1 flex items-center gap-1"
              style="color: var(--ct-text-muted);">
              <ct-icon name="music" [size]="14" style="color: var(--ct-accent-highlight);"></ct-icon>
              <span>{{ glossary.player.key }}</span>
            </span>

            <div
              class="inline-flex items-center p-1 rounded-[var(--ct-radius-md)] border"
              style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong);">
              <button
                type="button"
                (click)="playerStore.transposeDown()"
                title="Diminuir meio tom (-1/2)"
                aria-label="Diminuir meio tom"
                class="w-8 h-8 flex items-center justify-center font-bold rounded-[var(--ct-radius-sm)] transition-all cursor-pointer active:scale-95"
                style="background: var(--ct-bg-subtle); color: var(--ct-text-primary);">
                -
              </button>

              <div class="px-2.5 sm:px-3 min-w-[52px] sm:min-w-[58px] text-center">
                <span
                  class="text-sm sm:text-base font-extrabold block leading-none"
                  style="color: var(--ct-accent-highlight);">
                  {{ playerStore.currentKey$ | async }}
                </span>
                <span class="text-[10px] font-medium" style="color: var(--ct-text-muted);">
                  @if ((playerStore.semitoneOffset$ | async); as offset) {
                    @if (offset > 0) { +{{ offset }} }
                    @else if (offset < 0) { {{ offset }} }
                    @else { {{ glossary.player.originalKey }} }
                  } @else {
                    {{ glossary.player.originalKey }}
                  }
                </span>
              </div>

              <button
                type="button"
                (click)="playerStore.transposeUp()"
                title="Aumentar meio tom (+1/2)"
                aria-label="Aumentar meio tom"
                class="w-8 h-8 flex items-center justify-center font-bold rounded-[var(--ct-radius-sm)] transition-all cursor-pointer active:scale-95"
                style="background: var(--ct-bg-subtle); color: var(--ct-text-primary);">
                +
              </button>
            </div>

            @if ((playerStore.semitoneOffset$ | async) !== 0) {
              <button
                type="button"
                (click)="playerStore.resetTranspose()"
                class="text-[11px] sm:text-xs underline px-1 transition-colors cursor-pointer font-semibold"
                style="color: var(--ct-accent-highlight);">
                {{ glossary.player.originalKey }}
              </button>
            }
          </div>

          <div class="flex items-center gap-1.5">
            <span class="hidden sm:inline text-xs font-bold uppercase tracking-wider" style="color: var(--ct-text-muted);">
              {{ glossary.player.instrument }}:
            </span>
            <ct-badge variant="primary" size="md" icon="guitar">
              {{ playerStore.instrument$ | async }}
            </ct-badge>
          </div>

        </div>

        <!-- Bloco 2: Rolagem automática (unidade px/s) -->
        <div
          class="flex items-center justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0"
          style="border-color: var(--ct-border-default);">
          <span
            class="text-xs font-bold uppercase tracking-wider mr-1 flex items-center gap-1.5"
            style="color: var(--ct-text-muted);">
            <ct-icon name="arrow-down" [size]="15" style="color: var(--ct-accent-highlight);"></ct-icon>
            <span>{{ glossary.player.autoScroll }}</span>
          </span>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="playerStore.toggleAutoScroll()"
              [attr.aria-pressed]="(playerStore.isAutoScrolling$ | async) === true"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ct-radius-md)] font-bold text-xs border transition-all active:scale-95 cursor-pointer"
              [style]="(playerStore.isAutoScrolling$ | async)
                ? { background: 'var(--ct-accent-primary)', color: 'var(--ct-accent-primary-fg)', 'border-color': 'var(--ct-accent-primary)' }
                : { background: 'var(--ct-bg-elevated)', color: 'var(--ct-text-primary)', 'border-color': 'var(--ct-border-strong)' }">
              @if (playerStore.isAutoScrolling$ | async) {
                <ct-icon name="pause" [size]="14"></ct-icon>
                <span>{{ glossary.player.pause }}</span>
              } @else {
                <ct-icon name="play" [size]="14"></ct-icon>
                <span>Iniciar</span>
              }
            </button>

            <div
              class="inline-flex items-center p-1 rounded-[var(--ct-radius-md)] border"
              style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong);">
              <button
                type="button"
                (click)="stepAutoScrollSpeed(-10)"
                title="Diminuir velocidade da rolagem automática"
                aria-label="Diminuir velocidade da rolagem automática"
                class="w-6 h-6 flex items-center justify-center font-bold text-xs rounded-[var(--ct-radius-sm)] transition-all cursor-pointer"
                style="background: var(--ct-bg-subtle); color: var(--ct-text-primary);">
                -
              </button>
              <span class="px-2 text-xs font-bold font-mono whitespace-nowrap" style="color: var(--ct-text-primary);">
                {{ playerStore.autoScrollSpeedPxPerSec$ | async }} px/s
              </span>
              <button
                type="button"
                (click)="stepAutoScrollSpeed(10)"
                title="Aumentar velocidade da rolagem automática"
                aria-label="Aumentar velocidade da rolagem automática"
                class="w-6 h-6 flex items-center justify-center font-bold text-xs rounded-[var(--ct-radius-sm)] transition-all cursor-pointer"
                style="background: var(--ct-bg-subtle); color: var(--ct-text-primary);">
                +
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Legenda acessível de atalhos de teclado (desktop) -->
      <div
        class="hidden lg:flex items-center justify-between gap-4 pt-2.5 mt-2.5 border-t text-[11px]"
        style="border-color: var(--ct-border-default); color: var(--ct-text-muted);">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="font-bold uppercase tracking-wider">Atalhos no Palco:</span>
          <span><kbd class="px-1.5 py-0.5 rounded border font-mono text-[10px]" style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">Espaço</kbd> Tocar/Pausar</span>
          <span><kbd class="px-1.5 py-0.5 rounded border font-mono text-[10px]" style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">+</kbd> / <kbd class="px-1.5 py-0.5 rounded border font-mono text-[10px]" style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">-</kbd> Mudar tom</span>
          <span><kbd class="px-1.5 py-0.5 rounded border font-mono text-[10px]" style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">↑</kbd> / <kbd class="px-1.5 py-0.5 rounded border font-mono text-[10px]" style="background: var(--ct-bg-elevated); border-color: var(--ct-border-strong); color: var(--ct-text-primary);">↓</kbd> Rolagem</span>
        </div>
      </div>
    </div>
  `
})
export class ToolboxComponent {
  public readonly playerStore = inject(PlayerStore);
  public readonly glossary = PT_BR_GLOSSARY;

  public stepAutoScrollSpeed(delta: number): void {
    this.playerStore.setAutoScrollSpeed(this.playerStore.snapshot.autoScrollSpeedPxPerSec + delta);
  }
}
