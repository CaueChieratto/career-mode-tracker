# Diretrizes e Instruções Persistentes para Agentes de IA — Career Mode Tracker

Este documento é a referência persistente oficial para agentes de IA que operam no repositório **Career Mode Tracker** no ambiente **Google Antigravity / Gemini**. As regras aqui contidas são mandatórias e visam assegurar integridade, segurança e consistência no ciclo de vida do projeto.

---

## 1. Visão Geral e Propósito do Projeto

O **Career Mode Tracker** é uma Single Page Application (SPA) para gerenciamento estatístico, histórico e acompanhamento tático de modos carreira de futebol (EA FC / FIFA). O foco principal de interface é **mobile-first** (viewport de até 600 px de largura em testes e desenvolvimento).

### Stack Tecnológica Confirmada

- **Frontend Core:** React 18.3.1, TypeScript 5.5.3, Vite 5.4.8 / 5.4.9.
- **Roteamento:** React Router 6.27.0 (via `@remix-run/router`).
- **Persistência e Autenticação Web:** Firebase SDK 12.1.0 (Cloud Firestore e Firebase Authentication).
- **Backend / Cloud Functions:** Node 22, `firebase-functions` 4.4.1, `firebase-admin` 11.11.0 (em `functions/`).
- **UI e Interação:** CSS Modules, Swiper 11.2.10 (carrossel de abas), `@dnd-kit` (drag and drop), `react-icons`, `react-world-flags`.
- **Testes Automatizados:** Vitest 3.2.7, React Testing Library, JSDOM, V8 Coverage.
- **Serviços Externos de Dados:** TheSportsDB, football-data.org (proxy via Vercel / Vite), Cloudinary (upload de escudos).

---

## 2. Regras Críticas de Segurança e Isolamento

> [!CAUTION]
> **REGRA ABSOLUTA DE SEGURANÇA: NUNCA ACESSAR O FIREBASE REAL DE PRODUÇÃO.**
> É terminantemente proibido conectar, consultar, modificar ou executar testes contra instâncias de produção do Firebase. Toda persistência em ambiente de desenvolvimento e testes deve ocorrer estritamente contra os emuladores locais.

### Configuração Obrigatória dos Emuladores Locais

- **Project ID Obrigatório:** `demo-career-tracker-integration` (sempre prefixado com `demo-`).
- **Firestore Emulator:** `127.0.0.1:8089`.
- **Auth Emulator:** `127.0.0.1:9098`.
- **Functions Emulator:** `127.0.0.1:5002`.
- **Comportamento Fail-Closed:** A inicialização e os testes abortam imediatamente caso os emuladores não estejam rodando ou as variáveis não correspondam a hosts de loopback válidos.

### Proteção de UID e Credenciais

- O arquivo `.env.test.guard.local` define a variável `PROTECTED_USER_UID`.
- **PROIBIÇÃO:** O valor deste UID **NUNCA** deve ser impresso em logs, divulgado em relatórios, injetado em fixtures ou utilizado para autenticação.
- O arquivo `.env.local` não é carregado em ambiente de teste automatizado.
- O módulo `src/common/services/Firebase/emulatorGuard.ts` protege a aplicação de tentar conectar ao emulador fora de `localhost`.

### Integridade do Git e do Repositório

- **PROIBIDO USO DE COMANDOS DESTRUTIVOS:** Nunca execute `git reset --hard`, `git checkout .`, `git clean -fd` ou `git restore .` amplo.
- O repositório possui arquivos modificados e não rastreados que representam trabalho legítimo em andamento. Qualquer alteração deve ser pontual e não invasiva.

### Preservação de Recursos Visuais

- **PROIBIDO** excluir, converter, comprimir ou redimensionar imagens, troféus, escudos ou outros recursos visuais em `public/` ou outras pastas sem autorização prévia e explícita do usuário.

---

## 3. Arquitetura de Dados e Invariantes do Domínio

### Estrutura Hierárquica do Firestore

```text
users/{uid}
├── careers/{careerId} (contém clubData com metadados de temporadas)
│   └── seasons/{seasonId}
│       ├── players/{playerId}
│       ├── matches/{matchId}
│       │   └── playerStats/{playerId}
│       ├── table/{teamId}
│       ├── academyPlayers/{academyPlayerId}
│       └── academyTournaments/{tournamentId} (partidas ficam no array matches do documento)
└── careerGroups/{groupId}
```

### Regras Fundamentais de Domínio e Persistência

1. **Precedência Unificada Moderno vs. Legado (`mergeModernAndLegacy.ts`):**
   - Se um registro existe na subcoleção moderna, sua representação é **autoritativa por ID**.
   - Registros presentes exclusivamente no array legado (`clubData`) servem como fallback apenas para IDs ausentes na subcoleção.
2. **Limite de 500 Operações no Firestore Batch:**
   - Em operações que utilizam `writeBatch` (como criação de temporada em `ServiceSeasons`), há validação defensiva prévia contra o limite físico de 500 writes do Firestore.
3. **Controle de Concorrência e Transações Atômicas:**
   - **Promoção da Base (`AcademyService`):** Executa `runTransaction` com 3 escritas atômicas (`academyPlayers`, `players` e `career.updatedAt`).
   - **Escalação / Lineup (`ServiceLineup`):** Utiliza `runTransaction` com reconciliação baseada em delta sobre snapshot autoritativo lido, prevenindo ressuscitação de atletas removidos concorrentemente.
   - **Criação de Temporada (`ServiceSeasons`):** Utiliza `runTransaction` (`maxAttempts: 1`) rejeitando snapshots obsoletos com `SeasonCreationConflictError`.
   - **Tabela de Classificação (`ServiceTable.reconcileMatch`):** Atualização transacional coordenada entre partida, linhas da tabela e timestamp.
4. **Exclusão em Cascata de Carreira:**
   - A exclusão total de uma carreira é delegada à Cloud Function `deleteCareerCascade` (`functions/src/index.ts`) usando `recursiveDelete` do Admin SDK. Nenhuma exclusão parcial recursiva deve ser feita no cliente web.

---

## 4. Comandos Oficiais de Desenvolvimento e Validação

Execute comandos a partir da raiz do projeto (`carrer-mode-tracker`):

| Ação                       | Comando                         | Observação                                      |
| -------------------------- | ------------------------------- | ----------------------------------------------- |
| Iniciar dev local (Vite)   | `npm run dev`                   | Servidor local com proxy de futebol             |
| Iniciar dev com emulador   | `npm run dev:emulator`          | Força modo de emulação (`--mode emulator`)      |
| Checagem de tipos (App)    | `npm run typecheck`             | Executa `tsc -b`                                |
| Checagem de tipos (Testes) | `npm run typecheck:tests`       | Executa `tsc -p tsconfig.test.json --noEmit`    |
| Análise estática (Lint)    | `npm run lint`                  | Executa ESLint na raiz e subpastas              |
| Testes unitários rápidos   | `npm run test:run`              | Executa suíte unitária isolada (mocks)          |
| Testes de integração       | `npm run test:integration`      | Sobe emuladores locais e executa testes reais   |
| Cobertura completa         | `npm run test:coverage:all`     | Cobertura V8 unificada (unitários + integração) |
| Build de produção          | `npm run build`                 | Compila TypeScript e gera bundle em `dist/`     |
| Visualizar build           | `npm run preview`               | Serve build local de `dist/`                    |
| Build de Cloud Functions   | `cd functions && npm run build` | Compila TypeScript em `functions/lib/`          |

---

## 5. Diretrizes de Trabalho e Disciplina Operacional

### Investigação Antes de Qualquer Modificação

- **Leitura Mandatória de Contexto:** Antes de editar qualquer arquivo, inspecione seu conteúdo, imports, tipos associados e testes correspondentes. Nunca altere código baseando-se em suposições sobre como ele "deve" funcionar.
- **Rastreamento de Efeitos Colaterais:** Entenda se a entidade possui dupla representação (moderna vs. legada) ou se há hooks de cache ativos (ex.: `listCareersCache` em `Getters/index.ts`).
- **Dúvidas Técnicas:** Quando o comportamento de bibliotecas externas (ex.: Swiper, `@dnd-kit`, Firebase) for incerto, consulte a documentação oficial ou declare a incerteza ao usuário.

### Princípio da Modificação Cirúrgica

- **Alterações Mínimas e Justificadas:** Modifique estritamente as linhas necessárias para resolver o problema ou atender ao requisito solicitado.
- **Um Problema por Vez:** Não misture correções de bugs distintos, refatorações cosméticas ou novas funcionalidades em uma única etapa.
- **Sem Refatoração Oportunista:** Não reordene imports, não renomeie variáveis em arquivos adjacentes e não altere convenções de estilo estabelecidas sem solicitação explícita.
- **Preservação de Documentos e Testes Anteriores:** Não altere relatórios históricos em `docs/` nem desative testes existentes (`.skip` ou `.todo`) sem justificativa aprovada.

### Padrão de Tratamento de Erros

- Utilize erros tipados ou códigos explícitos (ex.: `SeasonCreationConflictError`, `code: 'SEASON_CREATION_CONFLICT'`).
- Erros de rede ou permissão temporária não devem corromper estruturas locais (ex.: `ServiceCareerGroup` não deve remover membros sob falhas transitórias).
- Respeite o utilitário `firestoreRetry` para operações sujeitas a cotas ou contenção.

---

## 6. Procedimento de Validação e Transparência Estrita

> [!IMPORTANT]
> **REGRA DE HONESTIDADE TÉCNICA:**
> É expressamente proibido afirmar que testes, linters, checagens de tipo ou builds foram executados quando a execução não tiver ocorrido.
> Se um comando não puder ser executado (ex.: ausência de emulador rodando ou tempo esgotado), isso deve ser declarado com total transparência.

Ao reportar o resultado de qualquer modificação, organize a validação categorizando claramente:

1. **Verificações Executadas e Aprovadas:** Comandos executados com saída bem-sucedida (código de saída 0).
2. **Verificações Executadas e Reprovadas:** Comandos que geraram falha, acompanhados da mensagem de erro e do plano de correção.
3. **Verificações Não Executadas:** Verificações não rodadas, acompanhadas da justificativa técnica.

---

## 7. Arquitetura de Módulos e Organização de Arquivos

Para manter a consistência arquitetural, novos arquivos, manutenções e refatorações devem seguir rigorosamente os padrões consolidados no próprio projeto, orientando-se por duas referências oficiais de implementação:

- **Referência FORA de `sectionView`:** `GroupCareer` (implementada em `src/pages/GroupCareerPage/` e componentes satélites como `src/pages/CareersPage/components/CareerGroupCard/`).
- **Referência DENTRO de `sectionView`:** `TableTeam` / `TableTab` (implementada em `src/layout/SectionView/features/ClubTabs/TableTab/` e na view `views/AddTeamsToTable/`).

### 7.1. Características Concretas de `GroupCareer` (Padrão Fora de `sectionView`)

Aplica-se a telas, páginas, fluxos de alto nível e navegações fora do carrossel/hub de abas de temporada:

1. **Localização e Nível de Página:**
   - Pasta dedicada em `src/pages/<PageName>/` (ex.: `src/pages/GroupCareerPage/`).
2. **Separação Interna de Responsabilidades:**
   - `index.tsx`: Componente orquestrador de rota. Lê parâmetros de URL (`useParams`, `useLocation`), gerencia estados de carregamento global (`<Load />`), trata recursos ausentes (`<NotFoundDisplay />`), provê o Context Provider local e compõe o layout superior (ex.: injeta `<SectionView notSeason ... />` e `<BottomMenu />`).
   - `components/`: Componentes visuais exclusivos da página (ex.: `GroupSquadTab/`), organizados em pastas individuais com `index.tsx` e `Component.module.css`.
   - `config/`: Configurações de rotas, abas ou navegação (ex.: `config/groupTabsConfig.ts`).
   - `contexts/`: Contexto React e Custom Hook em subpasta nomeada (ex.: `contexts/GroupCareerContext/index.ts`). Exporta `useGroupCareerContext()` com verificação defensiva obrigatória (`if (!ctx) throw new Error("... fora do Provider")`).
   - `helper/` (ou `helpers/`): Funções utilitárias puras isoladas por pasta e arquivo (ex.: `helper/getValidDate/index.ts`).
   - `hooks/`: Custom Hooks que encapsulam ciclo de vida, listeners ou agregações assíncronas (ex.: `hooks/useGroupSeasonView/index.ts`).
   - `services/`: Camada de serviço de persistência local da página (ex.: `services/ServiceCareerGroup/index.ts`), estruturada como objeto literal com métodos estáticos assíncronos (`getById`), gerenciando autenticação via `auth.currentUser`, caminhos do Firestore e tratamento resiliente de erros tipados (ex.: `career/not-found`).
3. **Componentes Satélites e Integração:**
   - Cards de navegação externa (como `src/pages/CareersPage/components/CareerGroupCard/`) possuem estrutura modular espelhada com suas próprias pastas `ui/` e `hooks/`.
4. **Testes Associados:**
   - Testes unitários com mocks em `src/test/` (ex.: `seasonConfigAndGroupCareer.test.ts`).
   - Testes de integração no emulador em `tests/integration/` (ex.: `groups.test.ts`).

### 7.2. Características Concretas de `TableTeam` / `TableTab` (Padrão Dentro de `sectionView`)

Aplica-se a abas, recursos e subtelas modulares integradas ao hub `SectionView` (`src/layout/SectionView/features/ClubTabs/` ou `PlayerTabs/`):

1. **O Hub `SectionView` e seu Funcionamento:**
   - `SectionView` gerencia carrossel de abas (Swiper) para visão do clube e visão do atleta.
   - **Navegação Overlay (Embedded):** Subtelas de criação/edição não usam navegação de rota via `react-router-dom` quando acionadas dentro da tela; utilizam a prop `onOpenScreen({ key: "addTeamsToTable", ... })`, gerenciada pelo hub `ActiveSectionScreen` (`src/layout/SectionView/components/ActiveSectionScreen/index.tsx`) com chave tipada em `src/layout/SectionView/config/screens.ts`.
2. **Topologia da Aba (`TableTab/`):**
   - `index.tsx`: Componente raiz da aba que aceita props padronizadas `{ season, career, onOpenScreen, isActive }`.
   - `TableTab.module.css`: Estilização isolada da aba via CSS Modules.
   - `components/`: Componentes estruturais menores da aba (ex.: `TableBody`, `TableHeader`, `TableRow`).
   - `helpers/`: Geradores de colunas, formatação de textos de cópia e classes de posição (ex.: `buildTableColumns`, `buildTableCopyText`, `getPositionClass`, `handleBadgeError`).
   - `hooks/`: Hooks de dados e controle de exibição da aba (ex.: `useTableData`, `useTableMode`).
   - `ui/`: Componentes complementares de UI exclusivos da aba (ex.: `LegendTable`).
   - `views/`: Subtelas modulares de formulário ou fluxo (ex.: `views/AddTeamsToTable/`).
3. **Padrão de Subtelas em `views/<SubViewName>/` (ex.: `AddTeamsToTable`):**
   - `index.tsx`: Exporta o componente raiz da view que envolve a tela em seu Provider (`<AddTeamsToTableProvider {...props}><AddTeamsToTableScreen /></AddTeamsToTableProvider>`). Define tipos de atualização otimista (ex.: `OptimisticTableData`).
   - `constants/`: Constantes e construtores de campos de formulário (ex.: `constants/TableTeamFormFields/index.tsx`).
   - `contexts/`:
     - `context.ts`: Define a tipagem do contexto e o hook correspondente (`useAddTeamsToTableContext`).
     - `AddTeamsToTableContext/index.tsx`: Implementa o Provider acoplando o hook genérico `useForm`.
   - `helpers/`: Helpers específicos do formulário e cálculo de estatísticas (ex.: `helpers/tableTeamFormStats/index.ts`).
   - `hooks/`: Hooks segregados por responsabilidade técnica:
     - `useTableTeamForm`: Configura dinamicamente os campos do formulário e validações.
     - `useTableTeamActions`: Encapsula mutações assíncronas de salvar (`saveTableTeam`) e excluir (`deleteTableTeam`).
   - `screens/`: Componente visual da subtela (ex.: `screens/AddTeamsToTableScreen/`), composto por `Navbar`, `HeaderSeason`, `Form`, `FormSection` e `AddTeamsToTableScreen.module.css`.
   - `services/`: Serviços dedicados à subcoleção Firestore (ex.: `services/ServiceTable/index.ts` e `reconcileMatch.ts`).
4. **Testes Associados:**
   - Testes unitários em `src/test/` (ex.: `tableTeamEditPlaceholders.test.ts`).
   - Testes de integração em `tests/integration/` (ex.: `results.test.tsx` com `reconcileMatch`).

### 7.3. Procedimento Obrigatório Pré-Criação e Reorganização

Antes de criar qualquer arquivo ou pasta, o agente deve executar o seguinte procedimento:

1. **Classificar o Escopo:** Determinar se a funcionalidade reside dentro de `SectionView` (`src/layout/SectionView/`) ou fora (em `src/pages/`, `src/components/`, etc.).
2. **Inspecionar a Referência Concreta:** Abrir e inspecionar a pasta correspondente (`src/pages/GroupCareerPage/` ou `src/layout/SectionView/features/ClubTabs/TableTab/`) para identificar convenções de nomenclatura, níveis de pastas e padrões de props.
3. **Distribuir por Responsabilidade:** Não agrupar lógica e interface em um único arquivo monólito. Segregar arquivos entre `components`, `hooks`, `services`, `contexts`, `helpers` e `constants`/`screens`.
4. **Verificar Diretórios Existentes:** Antes de criar uma nova pasta, certificar-se de que já não existe um local padrão reservado na estrutura da referência.
5. **Evitar Duplicações e Abstrações Supérfluas:** Reutilizar hooks globais (`useForm`), componentes compartilhados (`Card`, `Navbar`, `HeaderSeason`, `ButtonsSwitch`) e helpers de domínio existentes em `src/common/` e `src/components/`.

### 7.4. Módulos Compartilhados, Exceções e Intersecções

- **Localização de Recursos Compartilhados:** Arquivos compartilhados transversalmente entre múltiplas áreas residem estritamente em `src/common/` (`interfaces/`, `services/`, `helpers/`, `hooks/`, `elements/`, `utils/`, `stats/`), `src/components/`, `src/ui/` ou `src/contexts/`. Nunca mova arquivos compartilhados para pastas de features nem os duplique localmente.
- **Funcionalidades que Atravessam as Duas Áreas:** Quando uma funcionalidade possui representação fora de `SectionView` (ex.: página ou gerenciador de dados) e também uma aba ou visualização interna no carrossel, cada camada deve seguir estritamente o padrão de sua localização física (a página segue `GroupCareer`; a aba e suas subtelas seguem `TableTeam`).
- **Divergências Justificadas:** Se um requisito específico exigir desvio do padrão de referência, o agente deve preservar ao máximo a harmonia arquitetural do projeto e documentar a justificativa técnica no relatório final.
- **Resolução de Incertezas:** Havendo dúvidas sobre convenções ou enquadramento de um arquivo, o agente deve inspecionar o código circundante e consultar o usuário, evitando inventar estruturas arbitrárias.

---

## 8. Governança Arquitetural Permanente e Regras Antipadrão

Esta seção consolida os padrões de engenharia de software e as garantias de qualidade arquitetural estabelecidas no repositório. Todos os agentes de IA e desenvolvedores devem seguir estas diretrizes obrigatoriamente ao realizar manutenções ou adicionar novas funcionalidades.

### 8.1. Proibições Arquiteturais Absolutas (Antipadrões Vetados)

1. **Proibição de Componentes e Hooks Monolíticos:**
   - Nenhum componente visual deve ultrapassar ~300 linhas de código acumulando responsabilidades de UI, formulário, chamadas de serviço e transformações de dados.
   - Telas complexas ou subviews devem obrigatoriamente seguir a separação:
     - `index.tsx`: Wrapper enxuto do Context Provider.
     - `contexts/`: Tipagem e Provider com guarda defensiva (`if (!ctx) throw new Error(...)`).
     - `hooks/`: Separação estrita entre hook de estado/validação de formulário (`use<Feature>Form`) e hook de mutação assíncrona (`use<Feature>Actions`).
     - `screens/`: Layout visual limpo combinando os componentes modulares.
     - `components/`: Subcomponentes visuais com responsabilidade visual única.
2. **Proibição de Acesso Direto ao SDK do Firebase em Camadas de UI:**
   - É terminantemente proibido importar ou chamar funções do Firestore (`getDoc`, `getDocs`, `collectionGroup`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`) dentro de componentes React, Context Providers ou hooks de UI.
   - Todo e qualquer acesso ao banco de dados deve ser encapsulado em funções estáticas assíncronas na camada de serviços (`src/common/services/` ou `services/` da feature).
3. **Proibição de Prop Drilling Profundo:**
   - É proibido repassar propriedades através de 3 ou mais níveis de componentes que atuam como meros intermediários pass-through sem utilizar os dados em sua renderização direta.
   - Cadeias profundas de repasse devem ser substituídas por Contextos locais coesos (como `LineupTabContext`) ou objetos de domínio agrupados.
4. **Proibição de Inversões de Camada e Dependências Circulares:**
   - Módulos compartilhados e utilitários transversais (`src/common/`, `src/components/`, `src/ui/`) **NUNCA** devem importar de camadas superiores (`src/pages/` ou `src/layout/`).
   - Ciclos de dependência (módulo A importa B e B importa A) são estritamente vetados. Se dois módulos compartilham tipos, esses tipos devem ser extraídos para um arquivo neutro `types.ts`.
5. **Preservação de Contratos de Teste e Migração Limpa de Módulos (Sem Re-exports Legados):**
   - É proibido remover, renomear ou alterar o formato de qualquer atributo `data-testid` ou `id` do DOM que sirva a suítes de teste.
   - Ao promover ou mover módulos para seus locais canônicos definitivos, os arquivos de origem devem ser integralmente excluídos. Todos os imports (tanto do código de aplicação quanto das suítes de teste) devem ser atualizados diretamente para o novo caminho canônico, sem deixar arquivos-ponte de re-export órfãos.
6. **Proibição de Recriação de Soluções Existentes (Duplicações):**
   - Antes de implementar qualquer nova lógica, o desenvolvedor/agente deve consultar e reaproveitar as abstrações canônicas consolidadas:
     - Gestão de clubes do usuário e opções de times: `useUserCareerTeams`, `useGlobalTeamsOptions` e `ensureTeamSavedInSeason`.
     - Gestão de formulários, identidades de atletas e bônus de transferência: `useForm` (com `mergedFormValues` e `mergeFormValues`), `buildPlayerIdentitySections`, `usePastPlayersAutofill`, `useTransferBonusesForm` e `useTransferBonusesDraft`.
     - Pilha de telas embutidas e ordenação persistida: `useScreenStack` e `usePersistedSortOption`.
     - Datas, identidades, ligas, ordenações e utilitários transversais: `resolveSeasonDate`, `Date.ts` (`getValidDate`, `isFirestoreTimestamp`, `isEuropeanSeason`, `getSeasonStartYear`, `formatSeasonShortLabel`), `playerIdentity.ts` (`getPlayerIdentityKey`, `isSamePlayerId`, `findPlayerInList`), `league.ts` (`getAllLeaguesFlat`, `contributesToLeagueStandings`), `getPositionRank`, `lockBodyScroll`, `Copy` e `extractDateInfo`/`compareAcademyDates`.
     - Agregação de dados de partidas e torneios: `mergeMatchStats`, `filterSupersededPlayers`, `calculateTotalStats` e `evaluateTournamentStatus`.
     - Componentes visuais genéricos e shells padronizados: `<OverflowText />`, `<PlayerCircle />`, `<Card />`, `<Navbar />`, `<HeaderSeason />`, `<ThemedActionButton />`, `<AddOrEditLeagueButton />`, `<RatingBadge />`, `<SortableVerticalList />`, `<CardsModal />`, `<SeasonConfigSubScreen />`, `<ActionChoiceModal />`, `<SectionSummaryCard />` (`SectionSummaryGrid`, `SectionSummaryItem`), `<ExpandableLeagueStatsRow />`, `<ContainerForm />`, `<MatchFormSubScreen />`, `<SeasonCard />`, `<AcademyFormRenderer />` e `<AcademyMatchLineupList />`.
7. **Regra Obrigatória de Identidade e Exemplos (Padrão FC Barcelona):**
   - Sempre que for necessário definir um placeholder, texto demonstrativo, fixture de exemplo em documentação, testes ou modelo de dados em interface/formulário (como nome de clube, jogadores, técnicos ou fatos históricos), é **mandatório utilizar o FC Barcelona**, seus atletas (ex.: Lamine Yamal, Pedri, Gavi, Lionel Messi, Andrés Iniesta), técnicos (ex.: Hansi Flick, Pep Guardiola, Johan Cruyff) e sua história.
   - É expressamente proibido utilizar clubes rivais (como Real Madrid) como exemplo representativo de placeholders ou modelos padrão.
8. **Proibição Absoluta de Alertas e Confirmações Nativas do Navegador (Uso Obrigatório do Sistema de Toasts):**
   - É terminantemente proibido utilizar `alert()`, `window.alert()`, `confirm()` ou `window.confirm()` em qualquer arquivo de produção da aplicação.
   - Todo feedback ao usuário deve ser realizado exclusivamente pelo sistema centralizado de Toasts (`toast.success`, `toast.error`, `toast.warning`, `toast.info` importados de `src/common/services/ToastService`), garantindo interface mobile-first, não bloqueante e com acessibilidade (`role="status"`, `role="alert"`).
   - Toda confirmação destrutiva ou ação crítica deve utilizar `const { confirm } = useToast()`, que encapsula o cancelamento seguro no unmount do componente e retorna uma Promise (`Promise<boolean>`). O `confirm` nativo síncrono é expressamente vetado.
   - Em formulários assíncronos protegidos por `useAsyncForm`, erros tratados em camadas internas que já emitiram toast específico devem ser encapsulados com `markErrorAsNotified(error)` para prevenir emissão redundante de mensagens genéricas (verificado via `isErrorNotified(error)`).
9. **Resiliência Contra Exaustão de Quota (429 / resource-exhausted), Circuit Breaker e Antipadrão de Leitura Concorrente em Transações:**
   - Operações baseadas em `runTransaction` ou `writeBatch` **NUNCA** devem disparar leituras concorrentes em paralelo (`transaction.get` em loops ou coleções inteiras como partidas ou tabela de classificação) quando snapshots já tiverem sido lidos via `getDocs` ou `getDocsFromServer`. Esse antipadrão dispara dezenas de chamadas RPC simultâneas (`documents:batchGet`), esgotando imediatamente os rate limits do Firestore (HTTP 429 Too Many Requests / Resource Exhausted).
   - **Circuit Breaker Obrigatório de Quota (`isQuotaExceededActive` e `markQuotaExceeded`):** Quando qualquer operação no Firestore lançar erro 429 ou `resource-exhausted`, o circuit breaker em `src/common/utils/firestoreRetry.ts` deve ser ativado com `markQuotaExceeded()`. Durante o período de cooldown (persistido em memória e `localStorage`), serviços críticos como `ServiceLineup.saveLineupToMatch`, `ServiceMatches.savePlayerStatsToSubcollection` e `ServiceTable.reconcileMatch` devem verificar `isQuotaExceededActive()` e **desviar imediatamente para escrita atômica direta (`writeBatch` / `setDoc`)**, sem invocar `runTransaction`. Isso impede que novas chamadas `transaction.get` tentem acessar a rede e inundem o console do navegador com erros 429 (`POST ...:batchGet 429 (Too Many Requests)`).
   - **Limitação de Retries em Transações:** O parâmetro `maxAttempts` em `runTransaction` deve ser estritamente fixado em `{ maxAttempts: 1 }`. Retries automáticos do SDK contra cotas diárias esgotadas apenas multiplicam requisições 429 no console e atrasam o acionamento do fallback.
   - **Tratamento Defensivo em Metadados Secundários:** Métodos auxiliares que atualizam metadados legados ou secundários (ex.: `addTeamToSeason`, `updateSeasonTeams` em `ServiceMatches`) devem tratar `isQuotaExceededError` defensivamente para não abortar fluxos primários de edição de partidas.

### 8.2. Regra Arquitetural Permanente de Governança e Preservação de Componentes Genéricos

Esta diretriz é permanente e obrigatória para todos os agentes futuros, tanto na manutenção de funcionalidades existentes quanto no desenvolvimento de novas features:

1. **Obrigatoriedade de Consulta Prévia:** Antes de criar qualquer novo componente visual, subtela, hook, serviço ou helper, o agente deve inspecionar o catálogo de abstrações compartilhadas em `src/common/`, `src/components/`, `src/ui/`, `src/layout/SectionView/ui/` e pastas `shared/` de domínio para reutilizar ou estender as soluções canônicas já consolidadas.
2. **Proibição de Duplicações Estruturais, Lógicas e Estilísticas:** É vedado recriar ou copiar blocos estruturais, hooks ou folhas `.module.css` para padrões já unificados:
   - Botões de ação temáticos e botões secundários de formulário: utilizar `<ThemedActionButton>` e `<AddOrEditLeagueButton>` (parametrizado via `addLabel`/`editLabel`).
   - Badges de nota média: utilizar `<RatingBadge>`.
   - Listas verticalmente reordenáveis via `@dnd-kit`: utilizar `<SortableVerticalList>`.
   - Cards de resumo e grades de métricas no `SectionView`: utilizar `<SectionSummaryCard>`, `<SectionSummaryGrid>` e `<SectionSummaryItem>`.
   - Linhas expansíveis de estatísticas de liga e troféu: utilizar `<ExpandableLeagueStatsRow>`.
   - Modais de escolha de ação, cards selecionáveis e subtelas de configuração: utilizar `<ActionChoiceModal>`, `<CardsModal>` e `<SeasonConfigSubScreen>`.
   - Shells e renderizadores de formulário: utilizar `<ContainerForm>`, `<MatchFormSubScreen>`, `<AcademyFormRenderer>` e `mergedFormValues`/`mergeFormValues` de `useForm`.
   - Utilitários de data, identidade de jogador, ligas, scroll lock e clipboard: utilizar `src/common/utils/Date.ts`, `playerIdentity.ts`, `league.ts`, `bodyScrollLock.ts` e `Copy.ts`.
3. **Preservação de Particularidades (Regra de Ouro da Componentização):** Generalize sempre a estrutura compartilhada, jamais as particularidades intencionais de cada contexto. Diferenças visuais, comportamentais ou de texto devem ser preservadas por meio de `props`, variantes ou `slots` (`ReactNode`). Não crie abstrações excessivamente complexas para elementos que apenas se parecem superficialmente, mas possuem responsabilidades e regras de domínio distintas.
4. **Isolamento Estrito de Camadas e Fronteiras:** Módulos compartilhados em `src/common/`, `src/components/` e `src/ui/` **nunca** devem importar de camadas superiores (`src/pages/` ou `src/layout/SectionView/`). Da mesma forma, abas independentes dentro de `SectionView` não devem importar folhas `.module.css` umas das outras.
5. **Preservação e Evolução Consistente:** Nenhum agente deve contornar as abstrações estabelecidas ou reintroduzir padrões arquiteturais incompatíveis com os consolidados. Quando uma nova demanda exigir ampliação de contrato, deve-se estender a abstração existente preservando retrocompatibilidade com todos os consumidores.

### 8.3. Procedimento de Exceção Justificada

Caso uma nova regra de negócio ou particularidade técnica exija desvio pontual de qualquer diretriz desta seção:
1. O agente deve declarar e justificar explicitamente a necessidade técnica antes da modificação.
2. Deve verificar o impacto em todos os consumidores diretos e indiretos da entidade.
3. Não deve comprometer as 88 suítes de teste existentes nem a tipagem estrita (`npm run typecheck`).
4. Deve atualizar a documentação relevante registrando a exceção.
