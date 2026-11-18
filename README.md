# ♫ Cifra Trans — Fonte da Verdade (Single Source of Truth)

> **Plataforma Web de Cifras Sincronizadas, Dicionário de Acordes SVG, Gestão de Repertórios Spotify, Votação Opcional e Perfis Integrados à API Transicionais**  
> Arquitetura Full-Stack construída com **Angular 22 Standalone**, **TailwindCSS v4**, **ASP.NET Core (.NET 10) Minimal APIs**, **Entity Framework Core 10** e **PostgreSQL**.

---

## 🏛️ 1. Diretrizes de Arquitetura e Política de Dependências (Zero Custo / Zero Lock-in)

Este documento é a **Fonte da Verdade (Single Source of Truth)** da arquitetura, regras de negócio e contratos técnicos do projeto **Cifra Trans**.

### 🚫 Proibições Estritas de Arquitetura
1. **Proibido o uso de bibliotecas pagas, dual-license comerciais ou com limitação de uso:**
   - **Proibidos no .NET:** Duende IdentityServer, MediatR (v12+ comercial), AutoMapper (v15+ comercial), FluentAssertions (v8+ comercial), MassTransit (v9+ comercial), Hangfire Pro ou qualquer pacote NuGet que exija chave de licença ou assinatura.
   - **Proibidos em Serviços Externos:** Provedores de autenticação pagos (Auth0, Clerk, Okta) ou APIs com cobrança por requisição.
2. **Uso exclusivo de pacotes oficiais, gratuitos e Open-Source (MIT / Apache 2.0 / PostgreSQL License):**
   - **Serialização e HTTP:** Uso nativo de `System.Text.Json`, `System.Net.Http.IHttpClientFactory` e `System.Security.Cryptography` da BCL oficial do .NET 10.
   - **Integração Spotify 100% Gratuita e Sem Quotas:** A importação de playlists utiliza extração direta da página pública de embed (`https://open.spotify.com/embed/playlist/{id}`) e exportação via URIs nativas (`spotify:track:{id}`), eliminando dependência de contas pagas do Spotify Developer ou limites de rate-limit comercial.
   - **Renderização Gráfica:** Diagramas de acordes gerados em **SVG nativo** no Angular, sem bibliotecas gráficas proprietárias.

---

## 🔍 2. Avaliação Técnica e Evoluções da Versão Atual (`v1.5`)

| Domínio | Implementação Arquitetural | Benefício Técnico |
| :--- | :--- | :--- |
| **Consultas EF Core (`SplitQuery`)** | Configurado `UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)` no `UseNpgsql` em [`Program.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Program.cs). | Elimina explosão cartesiana em múltiplos `.Include()` (`Tracks`, `Chords`, `Votes`) e resolve o alerta `EF Core 20504`. |
| **Migração Idempotente no Startup** | Execução automática de `EnsureCreatedAsync()` combinada com DDL idempotente (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS`). | Garante evolução contínua do banco PostgreSQL sem perda de dados ou quebra de ambientes existentes. |
| **Autenticação Híbrida Transicionais** | Proxy BFF em [`TransicionaisAuthEndpoints.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Endpoints/TransicionaisAuthEndpoints.cs) integrado a `https://api.transicionais.com.br`. | Suporta login de membro (`/apps_nodejs/auth/login`), escolha de organização (`selectionToken`), Basic Auth `/docs` e fluxo de cadastro com aguardo de validação. |
| **Criação Autenticada e Visibilidade** | Guardas no backend e no frontend exigindo sessão ativa para qualquer escrita (`POST`, `PUT`, `PATCH`), com flags `IsPublic` e `IsSharedOnHome`. | Impede alterações anônimas e permite ao autor escolher se cada cifra ou playlist é **Pública para Todos** ou **Privada (Somente Meu Perfil)**. |
| **Ponte Spotify → Cifra Trans** | Conversão direta de faixas de playlists em registros na tabela `Songs` (`import-to-song` e `import-to-songs`). | Cria páginas base de notas e cifras com 1 clique, abrindo diretamente no **Estúdio (`studio`)** se for nova ou no **Modo Palco (`viewer`)** se já existir. |
| **Sintetizador e Tablatura Interativa Nativa** | Renderizador e sintetizador Web Audio API próprio em [`guitar-pro-tab.component.ts`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/frontend/src/app/components/guitar-pro-tab/guitar-pro-tab.component.ts) com agendamento *Lookahead* (`AudioContext.currentTime`). | Sintetiza 16 instrumentos em tempo real via Web Audio API: **Violão, Cavaquinho, Baixo, Guitarra, Teclado, Escaleta, Bateria, Caixa, Timbal, Alfaia, Agogô, Repinique, Tamborim, Surdo de Primeira, Surdo de Segunda e Surdo de Terceira**, com levadas de bateria/escola de samba, cursor sincronizado, BPM, Speed Trainer, Loop e Metrônomo. |
| **Separação em 4 Telas por Intenção** | Roteamento de estado em [`app.ts`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/frontend/src/app/app.ts): `home` (Mural Inicial), `viewer` (Modo Palco Limpo), `voting` (Playlists & Votação) e `studio` (Estúdio) sincronizado com query parameters da URL. | Evita poluição visual no palco, preserva o contexto de navegação da playlist (`Anterior / Próxima`), suporta recarregamento (`F5`) e executa automaticamente a intenção pós-login (`requireAuthOrRun`). |
| **Índices Compostos, Cache BFF e Autoria** | Índices compostos em [`AppDbContext.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Data/AppDbContext.cs), `IMemoryCache` no BFF e validação server-side de autoria (`CreatorUserId` / `ExternalUserId`). | Acelera consultas de visibilidade no PostgreSQL, reduz latência de chamadas externas e protege a alteração de visibilidade de cifras e playlists. |
| **Votação Nominal Opcional** | Chave `VotingEnabled` por playlist e tabela `Voters` com reutilização automática de nomes e sincronização de membros. | Mantém o ambiente limpo para gestão de repertório e habilita a votação apenas quando desejado pelo dono da playlist. |

---

## 🗄️ 3. Modelo de Dados Relacional (PostgreSQL)

O banco de dados `cifraclub_db` é gerenciado pelo [`AppDbContext.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Data/AppDbContext.cs) com as seguintes entidades:

### 3.1. Domínio de Cifras e Notas Musicais
- **`Songs` ([`Song.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Models/Song.cs)):**
  - `Id` (PK), `Title`, `Artist`, `OriginalKey`, `Bpm`, `CreatedAt`.
  - `CreatorUserId` (`VARCHAR(100)`), `CreatorName` (`VARCHAR(150)`), `IsPublic` (`BOOLEAN DEFAULT TRUE`).
- **`InstrumentTracks` ([`InstrumentTrack.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Models/InstrumentTrack.cs)):**
  - `Id` (PK), `SongId` (FK Cascade), `Instrument` (`Violão`, `Guitarra`, `Cavaco`, `Ukulele`, `Teclado`, `Baixo`), `Content` (letra sincronizada com `[Acordes]` e tablaturas ASCII), `Difficulty`, `Tuning`, `Capo`.
- **`Chords` ([`Chord.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Models/Chord.cs)):**
  - `Id` (PK), `SongId` (FK Cascade), `Name`, `Instrument`, `Diagram` (ex: `"x,3,2,0,1,0"`), `BaseFret`.

### 3.2. Domínio de Playlists Spotify, Perfis e Votação Opcional
- **`Playlists` ([`Playlist.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Models/Playlist.cs)):**
  - `Id` (PK), `SpotifyPlaylistId`, `SpotifyUrl`, `Name`, `OwnerName`, `CoverImageUrl`.
  - `ProfileName`, `ExternalUserId`, `ExternalProfileId`, `OrganizationName`, `Description`.
  - `IsSharedOnHome` (`BOOLEAN` — define se a playlist é **Pública no Mural Inicial** ou **Privada do Perfil**).
  - `VotingEnabled` (`BOOLEAN` — ativa/desativa a votação opcional na playlist).
  - `IsCustomCreated`, `SourcePlaylistId`, `CreatedAt`.
- **`PlaylistTracks` ([`PlaylistTrack.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Models/PlaylistTrack.cs)):**
  - `Id` (PK), `PlaylistId` (FK Cascade), `SpotifyTrackUri`, `SpotifyTrackId`, `Title`, `Artist`, `DurationMs`, `PreviewUrl`, `TrackOrder`.
  - `SongId` (`INTEGER NULL` — vínculo direto com a página de notas criada em `Songs`).
- **`Voters` ([`Voter.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Models/Voter.cs)):**
  - `Id` (PK), `Name` (`UNIQUE` — lista reutilizável de pessoas e perfis), `CreatedAt`.
- **`PlaylistVotes` ([`PlaylistVote.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Models/PlaylistVote.cs)):**
  - `Id` (PK), `PlaylistTrackId` (FK Cascade), `VoterId` (FK Cascade), `CreatedAt`. Índice único composto `(PlaylistTrackId, VoterId)`.

### 3.3. Domínio de Contas e Aguardo de Validação de Login
- **`UserAccounts` ([`UserAccount.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Models/UserAccount.cs)):**
  - `Id` (PK), `UserId`, `Username` (`UNIQUE`), `Name`, `Email` (`UNIQUE`), `Phone`, `OrganizationName`, `PasswordHash` (`SHA-256` nativo), `Role` (`user` / `admin`).
  - `Status` (`PENDING_VALIDATION` ou `ACTIVE`), `ValidationCode` (6 dígitos), `InviteToken`, `ExternalProfileId`, `CreatedAt`, `ValidatedAt`.

---

## 🔐 4. Fluxo de Autenticação, Cadastro e Aguardo de Validação (`api.transicionais.com.br`)

A central de autenticação ([`auth.service.ts`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/frontend/src/app/core/services/auth.service.ts) e [`TransicionaisAuthEndpoints.cs`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/Endpoints/TransicionaisAuthEndpoints.cs)) opera em 3 modos integrados:

1. **Login de Conta (`POST /api/auth/transicionais/login`):**
   - Valida contas locais ativas (`UserAccounts` com `Status == "ACTIVE"`). Se a conta estiver em `PENDING_VALIDATION`, redireciona o usuário automaticamente para a aba **⏳ Aguardo de Validação**.
   - Consulta `POST https://api.transicionais.com.br/apps_nodejs/auth/login` (suportando múltiplas organizações via `selectionToken` e enriquecimento de perfil via `GET /apps_nodejs/v2/account/export`).
   - Caso a API externa retorne `404` (`ACCOUNT_OR_PASSWORD_NOT_EXISTS`), verifica se a credencial pertence ao portal Basic Auth (`GET https://api.transicionais.com.br/docs`, como o usuário administrativo `docs`), autenticando a sessão administrativa.
2. **Criação de Login / Solicitação de Cadastro (`POST /api/auth/transicionais/register`):**
   - Registra os dados do usuário com status `PENDING_VALIDATION`, gera um código de 6 dígitos (`ValidationCode`) e, caso o usuário já possua um `InviteToken` da API Transicionais, confirma em `POST /apps_nodejs/auth/invite/confirm`.
3. **Ambiente de Aguardo de Validação (`GET /registration-status`, `POST /validate-registration`, `POST /approve-registration/{id}`):**
   - Permite ao usuário acompanhar o status da sua conta em tempo real, validar seu código de 6 dígitos (ou token de convite em `GET /apps_nodejs/auth/invite/check`) e ativar o login imediatamente.
   - Permite a administradores (`role == "admin"`) visualizar a fila de cadastros pendentes e aprovar acessos com 1 clique (sincronizando com `POST /apps_nodejs/v2/manager-profiles` e `POST /apps_nodejs/v2/auth/invite` quando autenticados com token de gestão Transicionais).

---

## 🛡️ 5. Regras de Permissão e Visibilidade (Público vs. Privado)

1. **Visitantes Não Autenticados (Modo Leitura):**
   - Podem visualizar cifras marcadas como **Públicas (`IsPublic = true`)** e playlists marcadas como **Públicas (`IsSharedOnHome = true`)** no Mural da Página Inicial.
   - Todos os botões de criação (`+ Criar Cifra`, `Editar Cifra`, `Importar do Spotify`, `Importar p/ Notas`, `Criar Nova Playlist`, `Votar`) exibem `🔒` e abrem a Central de Login/Cadastro quando acionados.
2. **Usuários Autenticados (Modo Criação & Curadoria):**
   - Podem criar e editar cifras no Estúdio, importar playlists do Spotify, converter faixas da playlist em páginas de notas no Cifra Trans, abrir votações opcionais e gerar novas playlists.
   - Podem definir em qualquer cifra (`IsPublic`) ou playlist (`IsSharedOnHome`) se o recurso será **🌐 Público para Todos** ou **🔒 Privado (Somente Meu Perfil)**.

---

## 📡 6. Catálogo Completo de Endpoints da API (Porta `5512`)

### 6.1. Músicas e Páginas de Notas (`/api/songs`)
| Método | Rota | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/songs?userId={id}` | Público / Logado | Lista músicas públicas e músicas privadas pertencentes ao `userId` logado |
| `GET` | `/api/songs/{id}` | Público / Logado | Retorna a música completa com faixas (`Tracks`) e diagramas (`Chords`) |
| `POST` | `/api/songs` | 🔒 Logado | Cria uma nova cifra/página de notas com opção `IsPublic` (`true`/`false`) |
| `PUT` | `/api/songs/{id}` | 🔒 Logado | Atualiza letra, acordes, metadados e visibilidade de uma cifra |
| `PATCH` | `/api/songs/{id}/visibility` | 🔒 Logado | Alterna rapidamente uma cifra entre **Pública** e **Privada** |
| `POST` | `/api/songs/{id}/tracks` | 🔒 Logado | Adiciona uma nova faixa de instrumento a uma música existente |
| `POST` | `/api/songs/seed` | Sistema | Popula a cifra de demonstração inicial se o banco estiver vazio |

### 6.2. Playlists Spotify, Perfis e Votação Opcional (`/api/playlists` e `/api/voters`)
| Método | Rota | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/playlists?userId={id}` | Público / Logado | Lista playlists públicas e playlists privadas do usuário logado |
| `GET` | `/api/playlists/shared?userId={id}` | Público / Logado | Lista playlists do Mural da Página Inicial com prévia de faixas |
| `GET` | `/api/playlists/{id}` | Público / Logado | Retorna playlist completa, faixas, votos e vínculos `SongId` com o Cifra Trans |
| `POST` | `/api/playlists/import` | 🔒 Logado | Importa/sincroniza playlist pública do Spotify sem chaves pagas |
| `PUT` | `/api/playlists/{id}/settings` | 🔒 Logado | Salva playlist no perfil, alterna visibilidade Pública/Privada e Votação Opcional |
| `POST` | `/api/playlists/{id}/tracks/{trackId}/import-to-song` | 🔒 Logado | Cria página base de notas no Cifra Trans a partir de uma música da playlist |
| `POST` | `/api/playlists/{id}/import-to-songs` | 🔒 Logado | Importa em lote todas as faixas (ou as mais votadas) para o Cifra Trans |
| `POST` | `/api/playlists/{id}/tracks/{trackId}/vote` | 🔒 Logado | Registra ou remove voto nominal na faixa e salva o nome para reutilização |
| `POST` | `/api/playlists/{id}/generate` | 🔒 Logado | Gera nova playlist a partir da seleção/votação e cria páginas de notas opcionais |
| `GET` | `/api/voters` | Público / Logado | Lista pessoas/perfis cadastrados para reutilização rápida em votações |
| `POST` | `/api/voters` | 🔒 Logado | Cadastra nova pessoa na lista reutilizável |

### 6.3. Autenticação, Cadastro e Validação Transicionais (`/api/auth/transicionais`)
| Método | Rota | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/transicionais/login` | Aberto | Autentica via `api.transicionais.com.br`, conta validada local ou Basic Auth `/docs` |
| `POST` | `/api/auth/transicionais/register` | Aberto | Cria solicitação de login (`PENDING_VALIDATION`) ou confirma convite externo |
| `GET` | `/api/auth/transicionais/registration-status` | Aberto | Consulta o status de aguardo de validação e checa `/auth/invite/check` |
| `POST` | `/api/auth/transicionais/validate-registration` | Aberto | Valida o código de 6 dígitos e libera a sessão ativa imediatamente |
| `GET` | `/api/auth/transicionais/pending-registrations` | 🔒 Admin | Lista solicitações de login aguardando aprovação |
| `POST` | `/api/auth/transicionais/approve-registration/{id}` | 🔒 Admin | Aprova o cadastro de um usuário e sincroniza perfil na organização |
| `POST` | `/api/auth/transicionais/sync-members` | 🔒 Logado | Importa perfis da organização Transicionais e contas ativas para a lista de votação |
| `POST` | `/api/auth/transicionais/refresh` | 🔒 Logado | Renova tokens de sessão junto à API Transicionais |
| `POST` | `/api/auth/transicionais/logout` | 🔒 Logado | Encerra a sessão ativa de forma idempotente |

---

## 📁 7. Estrutura do Projeto

```text
CifraClubHormoniosDaGaroa/
├── CifraTrans.slnx                              # Solução .NET 10
├── README.md                                    # Fonte da Verdade (Documentação Oficial)
│
├── backend/                                     # API ASP.NET Core (.NET 10 Minimal APIs)
│   ├── Data/
│   │   └── AppDbContext.cs                      # DbContext EF Core 10 + Mapeamento Fluente
│   ├── DTOs/
│   │   ├── SongDtos.cs                          # Contratos de Músicas, Faixas, Acordes e Visibilidade
│   │   └── PlaylistDtos.cs                      # Contratos de Playlists, Votação e Auth Transicionais
│   ├── Endpoints/
│   │   ├── SongEndpoints.cs                     # Rotas /api/songs (CRUD + Visibilidade Pública/Privada)
│   │   ├── PlaylistEndpoints.cs                 # Rotas /api/playlists e /api/voters (Spotify + Notas + Votos)
│   │   └── TransicionaisAuthEndpoints.cs        # Rotas /api/auth/transicionais (Login, Cadastro e Validação)
│   ├── Models/
│   │   ├── Song.cs                              # Entidade de Música / Página de Notas
│   │   ├── InstrumentTrack.cs                   # Entidade de Faixa de Instrumento / Tablatura
│   │   ├── Chord.cs                             # Entidade de Diagrama de Acorde
│   │   ├── Playlist.cs                          # Entidade de Playlist Spotify / Perfil / Visibilidade
│   │   ├── PlaylistTrack.cs                     # Entidade de Música da Playlist + Vínculo SongId
│   │   ├── Voter.cs                             # Entidade de Pessoa / Votante Reutilizável
│   │   ├── PlaylistVote.cs                      # Entidade de Voto Nominal por Faixa
│   │   └── UserAccount.cs                       # Entidade de Cadastro de Usuário e Aguardo de Validação
│   ├── appsettings.json                         # String de conexão PostgreSQL
│   └── Program.cs                               # Pipeline, CORS, SplitQuery e DDL Idempotente
│
└── frontend/                                    # Aplicação Angular 22 Standalone (TailwindCSS v4)
    ├── src/app/
    │   ├── components/
    │   │   ├── lyrics-viewer/                   # Visualizador de cifras sincronizadas e chave Pública/Privada
    │   │   ├── chord-dictionary/                # Renderizador SVG dinâmico de diagramas de acordes
    │   │   ├── toolbox/                         # Controles de semitom (+1/2, -1/2), instrumento e auto-scroll
    │   │   ├── studio/                          # Estúdio de criação/edição de cifras (restrito a logados)
    │   │   └── voting-room/                     # Gestão de playlists Spotify, importação p/ notas e votação opcional
    │   ├── core/
    │   │   ├── models/
    │   │   │   ├── song.model.ts                # Interfaces de músicas e visibilidade
    │   │   │   └── playlist.model.ts            # Interfaces de playlists, votos, login e validação
    │   │   └── services/
    │   │       ├── auth.service.ts              # Estado reativo de sessão, cadastro e validação Transicionais
    │   │       ├── song.service.ts              # Estado reativo de cifras, transposição cromática e API
    │   │       └── playlist.service.ts          # Serviço de playlists, mural compartilhado e votação
    │   ├── app.ts                               # Componente raiz + Central Modal (Login / Cadastro / Validação)
    │   └── app.html                             # Layout principal, Mural da Página Inicial e navegação
    ├── angular.json                             # Build e servidor na porta 4256 com allowedHosts
    └── package.json                             # Dependências oficiais e 100% gratuitas
```

---

## 🚀 8. Como Executar o Projeto

### Pré-requisitos (100% Gratuitos)
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20 LTS+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/)

### 1. Iniciar o Backend (.NET 10 — Porta `5512`)
```bash
cd backend
dotnet run
```
*O backend aplica automaticamente a criação/atualização idempotente de todas as tabelas no PostgreSQL ao iniciar.*

### 2. Iniciar o Frontend (Angular 22 — Porta `4256`)
```bash
cd frontend
npm install
npm start
```
Acesse `http://localhost:4256` no navegador.

---

## 📄 Licença

Distribuído sob a licença **MIT** — 100% gratuito e sem dependências comerciais restritivas.
