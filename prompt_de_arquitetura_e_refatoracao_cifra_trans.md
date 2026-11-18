# PROMPT — Refatoração de UI/UX do cifratrans.Frontend

## Papel
Você atua como engenheiro front-end sênior e product designer.
Você domina design system, componentização e refatoração sem regressão.

## Contexto
Sistema: Cifra Trans — https://cifratrans.rafaelacuoco.com.br


Áreas do sistema:
1. **Mural**: perfis, playlists públicas e catálogo de músicas.
2. **Modo Palco** (`?tab=viewer&songId=N`): cifra, transposição de tom, rolagem
   automática, sintetizador de 16 instrumentos, tablatura interativa e diagramas
   de acordes. O sintetizador oferece transporte (Tocar/Stop/Loop/Click), BPM,
   Speed Trainer (0.5x–1.5x) e cursor por compasso a 60fps.
3. **Estúdio** (`?tab=studio`): criação e edição de cifras e tablaturas,
   com visibilidade pública/privada.

A autenticação controla três recursos: editar cifra, criar cifra e votar.

## Escopo
1. Altere apenas o `cifratrans.Frontend`.
2. Não altere `cifratrans.Backend`.
3. Não altere os contratos de API.

## Problemas observados em produção (valide na Fase 0)
1. O Modo Palco exibe o seletor de instrumento em dois ou três pontos:
   select na barra superior, grade de botões no sintetizador e uma segunda
   listagem no mesmo painel.
2. A ação "Tocar" aparece nos cards do catálogo e no sintetizador.
   Os dois pontos não compartilham o estado de reprodução.
3. Os textos de autenticação variam: "🔒 Entrar", "🔒 Entrar p/ Editar",
   "🔐 Entrar na Minha Conta", "📝 Criar Login / Cadastro".
4. A nomenclatura mistura português e inglês: Tocar/Stop/Loop/Click/Speed Trainer;
   Palco/Leitor/Viewer.
5. O `cifratrans.Frontend` usa emojis como ícones. Não existe biblioteca de ícones.
6. Dois controles usam a unidade "x": rolagem automática ("1x") e Speed Trainer
   ("1.0x"). O usuário confunde os dois controles.
7. O painel do sintetizador reduz a área de leitura da cifra.

## Objetivo
1. Você padroniza a interface com um design system.
2. Você define um ponto de controle canônico para cada função.
3. Você remove os controles duplicados e a lógica duplicada.
4. Pontos adicionais apenas exibem o valor (somente leitura) ou chamam a mesma
   action do store. Nenhuma função recebe uma segunda implementação.

## FASE 0 — Auditoria
Não escreva código de produção nesta fase.
1. Identifique o framework e a estrutura de pastas do `cifratrans.Frontend`.
2. Documente o gerenciamento de estado e o roteamento atuais.
3. Inventarie as telas e os estados: anônimo, logado, dono do conteúdo,
   mobile e desktop.
4. Monte a tabela de deduplicação:
   | Função | Pontos atuais (tela/arquivo/linha) | Ponto canônico proposto | Ação (remover / unificar / tornar somente leitura) |
   Inclua: instrumento, transporte, BPM, Speed Trainer, transposição, rolagem
   automática, login, cadastro, voto, visibilidade pública/privada, abrir
   playlist, trocar de música e ocultar sintetizador.
5. Localize a lógica duplicada: transposição, reprodução, rolagem, formatação
   de acordes e verificação de permissão.
6. Entregue o relatório com prints das telas. Aguarde aprovação.

## FASE 1 — Design system
1. Defina tokens: cores, tipografia, espaçamento 4/8px, raios, sombras e z-index.
2. Crie o tema claro e o tema escuro "Modo Palco". O tema escuro garante
   contraste em ambiente escuro.
3. Use fonte monoespaçada na cifra. A fonte mantém os acordes alinhados
   sobre a letra.
4. Crie os componentes únicos: Button, IconButton, Select, SegmentedControl,
   Slider, Toggle, Badge, Card, Tabs, Modal, Toast, EmptyState e Skeleton.
5. Button inclui as variantes primary/secondary/ghost/danger e os estados
   loading/disabled.
6. Substitua todos os emojis por uma biblioteca SVG única (exemplo: Lucide).
   Padronize tamanho e traço.
7. Aplique o glossário PT-BR em todas as telas:
   Tocar, Pausar, Parar, Repetir (loop), Metrônomo (click), Velocidade de estudo
   (Speed Trainer), Rolagem automática, Tom, Instrumento, Entrar, Criar conta.
8. Entregue tokens e componentes com exemplos. Aguarde aprovação.

## FASE 2 — Estado único e deduplicação
Crie os stores: `playerStore`, `songStore`, `authStore` e `uiStore`.
- `playerStore` guarda: instrumento, tom, transposição, BPM, Velocidade de estudo,
  Repetir, Metrônomo, estado de reprodução e compasso atual.
- `uiStore` guarda: tema, estado do painel do sintetizador e preferências persistidas.

Regras canônicas:
1. **Instrumento**: mantenha um único seletor. Justifique o local escolhido.
   Sugestão: painel do sintetizador. A barra superior exibe no máximo um Badge
   somente leitura. Remova as listagens redundantes.
2. **Transporte**: crie uma barra de reprodução fixa e única. A barra contém
   Tocar/Pausar/Parar, Repetir, Metrônomo, BPM, Velocidade de estudo e compasso
   atual. O botão "Tocar" do catálogo navega para o Modo Palco e dispara a mesma
   action do `playerStore`.
3. **Transposição**: mantenha um único controle −/tom/+ na barra superior.
   Cifra, tablatura e diagramas leem o `playerStore`. Proíba um segundo par +/−.
4. **Rolagem automática**: mantenha um único controle. Diferencie o rótulo e a
   unidade da Velocidade de estudo.
5. **Autenticação**: crie o componente `AuthGate` e um modal único de
   login/cadastro. Reutilize os dois em todos os recursos controlados.
   Padronize os textos: "Entrar para editar", "Entrar para votar",
   "Entrar para criar". O clique em um recurso controlado abre o `AuthGate`
   com explicação.
6. **Visibilidade**: crie um Badge pública/privada e um Toggle no Estúdio.
7. **Modo Palco**: inicie com o painel do sintetizador recolhido. A cifra ocupa
   a área principal. Persista a preferência do usuário.
8. **Rotas**: implemente /mural, /palco/:id e /estudio/:id. Redirecione
   `?tab=viewer&songId=N` e `?tab=studio`. Preserve os links compartilhados.

## FASE 3 — Código
1. Separe engine e interface. Crie os módulos `SynthEngine`, `TransposeService`,
   `AutoScroll` e `TabRenderer`. Os módulos não manipulam o DOM.
2. A interface consome apenas estado e eventos.
3. Crie componentes de apresentação puros. Mova a lógica para hooks, stores
   e serviços.
4. Remova código morto e handlers duplicados.
5. Centralize os helpers: formatação de acordes, cálculo de tom e verificação
   de permissão.
6. Padronize os estados de tela: loading (Skeleton), vazio, erro e sem permissão.

## FASE 4 — Qualidade
1. Atenda WCAG AA: foco visível, aria-label em IconButton e contraste nos dois temas.
2. Habilite o teclado: Espaço toca/pausa; +/− muda o tom; setas controlam a rolagem.
3. Respeite `prefers-reduced-motion`.
4. Garanta o Modo Palco em celular e tablet. A barra superior reflui sem
   duplicar controles.
5. Mantenha o cursor a 60fps com requestAnimationFrame. Não renderize a tablatura
   inteira por frame.

## Restrições — preserve todas as funcionalidades
Transposição em tempo real (inclua ±meio tom, se existir); rolagem automática;
sintetizador dos 16 instrumentos; cursor por compasso a 60fps; BPM; Velocidade
de estudo; Repetir; Metrônomo; tablatura interativa; diagramas de acordes;
criação/edição de cifras com acordes entre colchetes; visibilidade
pública/privada; playlists; perfis; votação; controle de autenticação;
troca de música; redirect das URLs antigas.

## Critérios de aceite
- [ ] A tabela da Fase 0 tem 100% dos itens resolvidos.
- [ ] Cada função possui um único ponto de controle canônico.
- [ ] O código não contém lógica duplicada de transposição, reprodução,
      rolagem ou autenticação.
- [ ] Todos os controles usam os componentes e os tokens do design system.
- [ ] A interface não usa emojis como ícones.
- [ ] Todas as telas seguem o glossário PT-BR.
- [ ] Os dois temas atingem contraste AA.
- [ ] O teclado opera todas as funções.
- [ ] Todas as funcionalidades da lista de restrições funcionam nas três áreas.
- [ ] As URLs antigas redirecionam corretamente.

## Formato de trabalho
1. Execute uma fase por vez. Aguarde aprovação entre as fases.
2. Entregue diffs pequenos por componente ou tela. Mostre antes e depois.
3. Ao final, entregue o resumo das unificações e o guia do design system.
4. Comece pela Fase 0.