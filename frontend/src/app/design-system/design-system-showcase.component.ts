import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  CtSelectOption,
  CtTabItem,
  DESIGN_TOKENS,
  EmptyStateComponent,
  IconButtonComponent,
  IconComponent,
  ModalComponent,
  PT_BR_GLOSSARY,
  SegmentedControlComponent,
  SelectComponent,
  SkeletonComponent,
  SliderComponent,
  TabsComponent,
  ThemeMode,
  ThemeService,
  ToastService,
  ToggleComponent
} from './index';

@Component({
  selector: 'ct-design-system-showcase',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    ButtonComponent,
    IconButtonComponent,
    SelectComponent,
    SegmentedControlComponent,
    SliderComponent,
    ToggleComponent,
    BadgeComponent,
    CardComponent,
    TabsComponent,
    ModalComponent,
    EmptyStateComponent,
    SkeletonComponent
  ],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho e Alternador de Tema -->
      <ct-card variant="default" padding="lg">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <ct-badge variant="primary" icon="sparkles">Fase 1 — Design System</ct-badge>
              <ct-badge variant="success" icon="check-circle">Contraste AA</ct-badge>
            </div>
            <h1 class="text-xl sm:text-2xl font-black" style="color: var(--ct-text-primary);">
              Tokens, Temas & Componentes Canônicos
            </h1>
            <p class="text-xs sm:text-sm mt-1" style="color: var(--ct-text-muted);">
              Biblioteca única Lucide SVG (traço {{ tokens.icons.strokeWidth }}px), escala 4/8px, fonte monoespaçada para cifras e glossário PT-BR.
            </p>
          </div>

          <ct-segmented-control
            ariaLabel="Selecionar tema"
            [options]="themeOptions"
            [value]="(themeService.theme$ | async) || 'stage'"
            (valueChange)="onThemeChange($event)">
          </ct-segmented-control>
        </div>
      </ct-card>

      <!-- 1. Tokens: Cores, Tipografia, Espaçamento, Raios e Z-index -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ct-card padding="lg">
          <h2 class="text-base font-black mb-4 flex items-center gap-2" style="color: var(--ct-text-primary);">
            <ct-icon name="sliders" [size]="18"></ct-icon>
            <span>Tokens de Cor & Contraste</span>
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            @for (swatch of colorSwatches; track swatch.token) {
              <div
                class="p-2.5 rounded-[var(--ct-radius-md)] border flex items-center gap-2.5"
                style="border-color: var(--ct-border-default); background: var(--ct-bg-elevated);">
                <span
                  class="w-7 h-7 rounded-[var(--ct-radius-sm)] border shrink-0"
                  [style.background]="'var(' + swatch.token + ')'"
                  style="border-color: var(--ct-border-strong);">
                </span>
                <div class="min-w-0">
                  <div class="font-bold truncate" style="color: var(--ct-text-primary);">{{ swatch.name }}</div>
                  <div class="text-[10px] font-mono truncate" style="color: var(--ct-text-muted);">{{ swatch.token }}</div>
                </div>
              </div>
            }
          </div>

          <h3 class="text-sm font-black mt-6 mb-3" style="color: var(--ct-text-primary);">
            Escala de Espaçamento (4/8px), Raios & Z-index
          </h3>
          <div class="space-y-2 text-xs">
            <div class="flex flex-wrap gap-2">
              @for (sp of spacingEntries; track sp.key) {
                <div
                  class="px-2.5 py-1 rounded-[var(--ct-radius-sm)] border flex items-center gap-2"
                  style="border-color: var(--ct-border-default); background: var(--ct-bg-elevated);">
                  <span class="font-mono font-bold" style="color: var(--ct-accent-highlight);">{{ sp.value }}</span>
                  <span style="color: var(--ct-text-muted);">--ct-space-{{ sp.key }}</span>
                </div>
              }
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              @for (z of zIndexEntries; track z.key) {
                <ct-badge variant="neutral" size="sm">z-{{ z.key }}: {{ z.value }}</ct-badge>
              }
            </div>
          </div>
        </ct-card>

        <ct-card padding="lg">
          <h2 class="text-base font-black mb-4 flex items-center gap-2" style="color: var(--ct-text-primary);">
            <ct-icon name="music" [size]="18"></ct-icon>
            <span>Tipografia & Fonte Monoespaçada na Cifra</span>
          </h2>
          <p class="text-xs mb-3" style="color: var(--ct-text-muted);">
            A classe <code class="font-mono font-bold">.ct-chord-sheet</code> garante largura fixa por caractere e desabilita ligaduras para manter acordes alinhados sobre a letra.
          </p>
          <div
            class="ct-chord-sheet p-4 rounded-[var(--ct-radius-lg)] border text-xs sm:text-sm leading-relaxed overflow-x-auto"
            style="background: var(--ct-bg-canvas); border-color: var(--ct-border-default); color: var(--ct-text-primary);">
            <div class="font-bold" style="color: var(--ct-chord-fg);">C              Am             Em             F        G</div>
            <div>Todos os dias  quando acordo, não tenho mais o tempo que passou</div>
          </div>

          <h3 class="text-sm font-black mt-5 mb-2" style="color: var(--ct-text-primary);">
            Glossário PT-BR Aplicado
          </h3>
          <div class="flex flex-wrap gap-1.5">
            @for (term of glossaryTerms; track term) {
              <ct-badge variant="info" size="sm">{{ term }}</ct-badge>
            }
          </div>
        </ct-card>
      </div>

      <!-- 2. Botões e Ícones -->
      <ct-card padding="lg">
        <h2 class="text-base font-black mb-4" style="color: var(--ct-text-primary);">
          Button & IconButton (Variantes & Estados)
        </h2>
        <div class="flex flex-wrap items-center gap-3">
          <ct-button variant="primary" leftIcon="play" (pressed)="notify('success', 'Ação Tocar acionada')">
            {{ glossary.player.play }}
          </ct-button>
          <ct-button variant="secondary" leftIcon="pause">{{ glossary.player.pause }}</ct-button>
          <ct-button variant="ghost" leftIcon="square">{{ glossary.player.stop }}</ct-button>
          <ct-button variant="danger" leftIcon="log-out">{{ glossary.auth.logout }}</ct-button>
          <ct-button variant="primary" [loading]="true">Carregando</ct-button>
          <ct-button variant="secondary" [disabled]="true">Desabilitado</ct-button>

          <span class="h-6 w-px mx-1" style="background: var(--ct-border-default);"></span>

          <ct-icon-button icon="repeat" ariaLabel="Repetir" variant="secondary" [pressedState]="true"></ct-icon-button>
          <ct-icon-button icon="timer" ariaLabel="Metrônomo" variant="ghost"></ct-icon-button>
          <ct-icon-button icon="plus" ariaLabel="Aumentar tom" variant="primary"></ct-icon-button>
        </div>
      </ct-card>

      <!-- 3. Controles de Formulário & Navegação -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ct-card padding="lg">
          <h2 class="text-base font-black mb-4" style="color: var(--ct-text-primary);">
            Select, SegmentedControl, Slider, Toggle & Badge
          </h2>
          <div class="space-y-4">
            <ct-select
              [label]="glossary.player.instrument"
              [options]="instrumentOptions"
              [(value)]="demoInstrument">
            </ct-select>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <ct-segmented-control
                ariaLabel="Visibilidade"
                [options]="visibilityOptions"
                [(value)]="demoVisibility">
              </ct-segmented-control>

              <ct-toggle
                [label]="glossary.player.metronome"
                description="Pulso sonoro por tempo"
                [(checked)]="demoMetronome">
              </ct-toggle>
            </div>

            <ct-slider
              [label]="glossary.player.studySpeed"
              [min]="50"
              [max]="150"
              [step]="25"
              unit="%"
              [(value)]="demoStudySpeed">
            </ct-slider>

            <div class="flex flex-wrap gap-2">
              <ct-badge variant="neutral">Tom: C</ct-badge>
              <ct-badge variant="success" icon="globe">{{ glossary.visibility.public }}</ct-badge>
              <ct-badge variant="warning" icon="lock">{{ glossary.visibility.private }}</ct-badge>
              <ct-badge variant="info" icon="guitar">{{ demoInstrument }}</ct-badge>
              <ct-badge variant="danger" icon="alert-triangle">Atenção</ct-badge>
            </div>
          </div>
        </ct-card>

        <ct-card padding="lg">
          <h2 class="text-base font-black mb-4" style="color: var(--ct-text-primary);">
            Tabs, Modal, Toast, EmptyState & Skeleton
          </h2>
          <div class="space-y-4">
            <ct-tabs
              ariaLabel="Áreas do exemplo"
              [items]="demoTabs"
              [(activeId)]="demoTab">
            </ct-tabs>

            <div class="flex flex-wrap gap-2">
              <ct-button variant="secondary" leftIcon="log-in" (pressed)="demoModalOpen = true">
                Abrir Modal
              </ct-button>
              <ct-button variant="secondary" leftIcon="bell" (pressed)="notify('info', 'Notificação Toast exibida com sucesso!')">
                Disparar Toast
              </ct-button>
            </div>

            <ct-skeleton variant="text" [lines]="2"></ct-skeleton>

            <ct-empty-state
              icon="guitar"
              title="Nenhuma cifra selecionada"
              description="Escolha uma música no Mural para abrir no Modo Palco."
              actionLabel="Ir para o Mural"
              actionIcon="home"
              (action)="notify('info', 'Exemplo de ação em EmptyState')">
            </ct-empty-state>
          </div>
        </ct-card>
      </div>

      <ct-modal
        [open]="demoModalOpen"
        title="Exemplo de Modal"
        subtitle="Componente único acessível com fechamento via Escape ou clique externo."
        icon="lock"
        (closed)="demoModalOpen = false">
        <p class="text-xs sm:text-sm mb-4" style="color: var(--ct-text-secondary);">
          Este modal substitui diálogos ad-hoc e segue os tokens de superfície, borda e z-index do Design System.
        </p>
        <div class="flex justify-end gap-2">
          <ct-button variant="ghost" (pressed)="demoModalOpen = false">Cancelar</ct-button>
          <ct-button variant="primary" (pressed)="demoModalOpen = false">{{ glossary.auth.login }}</ct-button>
        </div>
      </ct-modal>
    </div>
  `
})
export class DesignSystemShowcaseComponent {
  public readonly themeService = inject(ThemeService);
  private readonly toastService = inject(ToastService);

  public readonly tokens = DESIGN_TOKENS;
  public readonly glossary = PT_BR_GLOSSARY;

  public demoInstrument = 'Violão';
  public demoVisibility = 'public';
  public demoMetronome = true;
  public demoStudySpeed = 100;
  public demoTab = 'palco';
  public demoModalOpen = false;

  public readonly themeOptions = [
    { value: 'stage' as ThemeMode, label: 'Modo Palco (Escuro)', icon: 'moon' as const },
    { value: 'light' as ThemeMode, label: 'Tema Claro', icon: 'sun' as const }
  ];

  public readonly visibilityOptions = [
    { value: 'public', label: PT_BR_GLOSSARY.visibility.public, icon: 'globe' as const },
    { value: 'private', label: PT_BR_GLOSSARY.visibility.private, icon: 'lock' as const }
  ];

  public readonly instrumentOptions: CtSelectOption<string>[] = [
    { value: 'Violão', label: 'Violão' },
    { value: 'Cavaquinho', label: 'Cavaquinho' },
    { value: 'Baixo', label: 'Baixo' },
    { value: 'Surdo de Primeira', label: 'Surdo de Primeira' }
  ];

  public readonly demoTabs: CtTabItem<string>[] = [
    { id: 'mural', label: PT_BR_GLOSSARY.areas.mural, icon: 'home', count: 2 },
    { id: 'palco', label: PT_BR_GLOSSARY.areas.palco, icon: 'guitar' },
    { id: 'playlists', label: PT_BR_GLOSSARY.areas.playlists, icon: 'headphones', count: 64 }
  ];

  public readonly colorSwatches = [
    { name: 'Fundo Geral', token: '--ct-bg-canvas' },
    { name: 'Superfície', token: '--ct-bg-surface' },
    { name: 'Elevado', token: '--ct-bg-elevated' },
    { name: 'Primária', token: '--ct-accent-primary' },
    { name: 'Secundária', token: '--ct-accent-secondary' },
    { name: 'Acorde', token: '--ct-chord-fg' }
  ];

  public readonly spacingEntries = Object.entries(DESIGN_TOKENS.spacing).map(([key, value]) => ({
    key,
    value
  }));

  public readonly zIndexEntries = Object.entries(DESIGN_TOKENS.zIndex).map(([key, value]) => ({
    key,
    value
  }));

  public readonly glossaryTerms = [
    PT_BR_GLOSSARY.player.play,
    PT_BR_GLOSSARY.player.pause,
    PT_BR_GLOSSARY.player.stop,
    PT_BR_GLOSSARY.player.loop,
    PT_BR_GLOSSARY.player.metronome,
    PT_BR_GLOSSARY.player.studySpeed,
    PT_BR_GLOSSARY.player.autoScroll,
    PT_BR_GLOSSARY.player.key,
    PT_BR_GLOSSARY.player.instrument,
    PT_BR_GLOSSARY.auth.login,
    PT_BR_GLOSSARY.auth.register
  ];

  public onThemeChange(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  public notify(variant: 'success' | 'info' | 'warning' | 'error', message: string): void {
    this.toastService.show(message, variant);
  }
}
