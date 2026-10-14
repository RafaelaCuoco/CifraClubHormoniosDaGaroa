# ♫ Cifra Trans

> **Plataforma Moderna de Cifras, Tablaturas Sincronizadas e Dicionário de Acordes Interativo**  
> Desenvolvida com **Angular 22 Standalone**, **TailwindCSS v4**, **ASP.NET Core (.NET 10) Minimal APIs** e **PostgreSQL**.

---

## 🌟 Visão Geral

O **Cifra Trans** é uma aplicação web completa projetada para músicos, compositores e entusiastas. Inspirado nas melhores experiências de plataformas musicais, o projeto oferece renderização de cifras com acordes posicionados diretamente sobre as sílabas, transposição em tempo real (em semitons), rolagem automática ajustável, dicionário de diagramas de acordes em SVG, e um **Estúdio de Criação e Edição** integrado para gerenciar cifras diretamente em banco de dados relacional.

A aplicação adota **Dark Mode nativo** como tema padrão e possui design totalmente responsivo, adaptado ergonomicamente tanto para desktops quanto para smartphones como o **Samsung Galaxy S23**.

---

## ✨ Principais Funcionalidades

- 🎵 **Visualização Sincronizada de Cifras:**
  - Acordes renderizados diretamente acima da letra, com destaque visual em verde brilhante e hover alaranjado.
  - Suporte completo a tablaturas monoespaçadas e seções musicais (`[Intro]`, `[Refrão]`, `[Solo]`).
- ⚡ **Transposição Reativa de Tom (+1/2 e -1/2):**
  - Ajuste de tom em tempo real que recalcula instantaneamente os acordes na letra e atualiza simultaneamente todos os diagramas do dicionário via streams RxJS.
- 🎸 **Dicionário de Acordes SVG em Tempo Real:**
  - Diagramas gerados dinamicamente em SVG mostrando pestanas, cordas soltas, cordas presas e cordas mudas (×).
- 📜 **Rolagem Automática com Controle de Velocidade:**
  - Auto-scroll com velocidade ajustável (1x a 5x) e botão de pausa/retomada.
- ✏️ **Estúdio de Criação & Edição de Cifras:**
  - Formulário completo para cadastrar novas cifras ou editar existentes (`PUT /api/songs/{id}`).
  - Barra de atalhos rápidos de inserção de acordes (`[C]`, `[Am]`, `[Em]`, etc.) com rolagem horizontal suave no mobile.
- 📱 **Otimizado para Smartphones (Galaxy S23 como baseline):**
  - Barra superior compacta e seletor ergonômico de catálogo para dispositivos móveis.
  - Alvos de toque (*touch-action: manipulation*) e layout fluído sem quebras indesejadas em telas de 360px.
- 🌐 **Suporte a Domínios Públicos e Túneis:**
  - Pré-configurado para URLs de produção/túnel `cifratrans.rafaelacuoco.com.br` e `cifratransback.rafaelacuoco.com.br`, com fallback para portas locais (`4256` e `5512`).

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Framework:** [Angular 22](https://angular.dev/) (Standalone Components, Signals & RxJS)
- **Estilização:** [TailwindCSS v4](https://tailwindcss.com/) + CSS Custom Tokens
- **Linguagem:** TypeScript
- **Porta Padrão:** `4256`

### Backend
- **Framework:** [ASP.NET Core (.NET 10)](https://dotnet.microsoft.com/)
- **Arquitetura:** Minimal APIs com Route Groups e Dependency Injection
- **ORM:** [Entity Framework Core 10](https://learn.microsoft.com/ef/core/)
- **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) (com Npgsql)
- **Porta Padrão:** `5512`

---

## 📁 Estrutura do Projeto

```text
CifraClubHormoniosDaGaroa/
├── CifraTrans.slnx                 # Arquivo de Solução (.NET 10)
├── README.md                       # Documentação principal do projeto
├── .gitignore                      # Regras de exclusão Git (root)
│
├── backend/                        # API ASP.NET Core (.NET 10)
│   ├── Data/
│   │   └── AppDbContext.cs         # DbContext do Entity Framework Core
│   ├── DTOs/
│   │   └── SongDtos.cs             # Data Transfer Objects
│   ├── Endpoints/
│   │   └── SongEndpoints.cs        # Rotas Minimal API (GET, POST, PUT, SEED)
│   ├── Models/
│   │   ├── Song.cs                 # Entidade de Música
│   │   ├── InstrumentTrack.cs      # Entidade de Faixas/Tablaturas
│   │   └── Chord.cs                # Entidade de Acordes
│   ├── Properties/
│   │   └── launchSettings.json     # Configuração de portas (5512)
│   ├── appsettings.json            # Configuração de ConnectionString PostgreSQL
│   └── Program.cs                  # Inicialização do pipeline e CORS
│
└── frontend/                       # Aplicação Angular 22 Standalone
    ├── src/
    │   ├── app/
    │   │   ├── components/
    │   │   │   ├── lyrics-viewer/      # Visualizador de cifras e tablaturas
    │   │   │   ├── chord-dictionary/   # Diagramas SVG de acordes
    │   │   │   ├── toolbox/            # Controles de tom, instrumento e rolagem
    │   │   │   └── studio/             # Cadastro e edição de cifras
    │   │   ├── core/
    │   │   │   ├── models/             # Interfaces TypeScript
    │   │   │   └── services/           # SongService (RxJS + HttpClient)
    │   │   ├── app.ts                  # Componente raiz
    │   │   └── app.html                # Layout principal e navegação
    │   ├── styles.css                  # Tema dark mode e personalização de formulários
    │   └── index.html                  # Metadados e viewport mobile
    ├── angular.json                    # Configuração de build, porta 4256 e allowedHosts
    └── package.json                    # Dependências npm
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (versão 20 LTS ou superior)
- [PostgreSQL](https://www.postgresql.org/) instalado e em execução (ou container Docker)

---

### 1. Configurar e Iniciar o Backend (.NET 10)

1. Navegue até a pasta `backend`:
   ```bash
   cd backend
   ```

2. Ajuste a string de conexão no arquivo [`backend/appsettings.json`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/backend/appsettings.json) se necessário:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Host=localhost;Port=5432;Database=cifratrans;Username=postgres;Password=postgres"
   }
   ```

3. Execute a API:
   ```bash
   dotnet run --urls "http://localhost:5512"
   ```
   *A API iniciará na porta `5512` e executará o `db.Database.EnsureCreated()` automaticamente na primeira execução.*

---

### 2. Configurar e Iniciar o Frontend (Angular 22)

1. Em outro terminal, navegue até a pasta `frontend`:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```
   *O frontend será executado na porta `4256` (`http://localhost:4256`).*

---

## 📡 Endpoints da API

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/songs` | Lista o resumo de todas as músicas cadastradas |
| `GET` | `/api/songs/{id}` | Retorna a música completa com faixas e acordes |
| `POST` | `/api/songs` | Cadastra uma nova música e suas faixas |
| `PUT` | `/api/songs/{id}` | Atualiza uma música existente e seu conteúdo |
| `POST` | `/api/songs/{id}/tracks` | Adiciona uma nova faixa/instrumento a uma música |
| `POST` | `/api/songs/seed` | Cria a música de demonstração (*"Tempo Perdido - Legião Urbana"*) |

---

## 🌐 Configuração de Túneis & Domínios Personalizados

A aplicação foi configurada para funcionar perfeitamente com os seguintes domínios:
- **Frontend:** `https://cifratrans.rafaelacuoco.com.br` (redirecionado para a porta local `4256`)
- **Backend:** `https://cifratransback.rafaelacuoco.com.br` (redirecionado para a porta local `5512`)

O [`angular.json`](file:///d:/Projetos/CifraClubHormoniosDaGaroa/frontend/angular.json) possui a propriedade `allowedHosts` habilitada para estes hosts, evitando bloqueios de cabeçalho Host.

---

## 👤 Autoria

- **Desenvolvido por:** Rafaela Cuoco
- **GitHub:** [@RafaelaCuoco](https://github.com/RafaelaCuoco)
- **E-mail:** rafaelacuoco@gmail.com

---

## 📄 Licença

Este projeto é disponibilizado sob a licença [MIT](https://opensource.org/licenses/MIT).
