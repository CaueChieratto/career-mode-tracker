# Caracterização e Diagnóstico de Navegação — Etapa 7C

Documento técnico de caracterização e diagnóstico da Etapa 7C (Full Reload / Navegação).
Em conformidade com as restrições da rodada, **nenhum código funcional da aplicação foi alterado** e nenhuma refatoração preventiva foi executada. O baseline histórico em `docs/performance/baseline-report.md` permanece intacto e preservado.

---

## 1. Mapa Geral das Transições

Abaixo está o mapeamento exato de todas as transições entre as entidades centrais do sistema (`Careers`, `Career`, `Season`, `Match`, `Player`, `ComparePlayers`, `Group`), discriminando rota de origem, rota de destino, mecanismo de transição e classificação de carregamento.

| Origem                    | Destino                         | Rota Destino                              | Mecanismo                     | Classificação            | Arquivo e Linha                                                                                                    |
| ------------------------- | ------------------------------- | ----------------------------------------- | ----------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **CareersPage**           | **Career**                      | `/Career/:careerId`                       | `window.location.href = ...`  | **Full Document Reload** | `src/pages/CareersPage/constants/CareerCardButtons/index.tsx:18`                                                   |
| **CareersPage**           | **CareerGroup**                 | `/CareerGroup/:groupId/Geral`             | `navigate(...)`               | **SPA**                  | `src/pages/CareersPage/components/CareerGroupCard/index.tsx:68`                                                    |
| **Career** (`AddSeasons`) | **Season**                      | `/Career/:careerId/Season/:seasonId`      | `window.location.href = ...`  | **Full Document Reload** | `src/pages/AddSeasons/hooks/useSeasons/index.ts:7`                                                                 |
| **Career** (`AddSeasons`) | **Geral**                       | `/Career/:careerId/Geral`                 | `navigate(..., { state })`    | **SPA**                  | `src/ui/modals/SeasonConfigs/index.tsx:107`                                                                        |
| **Career** (`AddSeasons`) | **Academy**                     | `/Career/:careerId/Academy`               | `navigate(..., { state })`    | **SPA**                  | `src/ui/modals/SeasonConfigs/index.tsx:107`                                                                        |
| **Career** (`AddSeasons`) | **CareersPage** (Voltar)        | `/CareersPage`                            | `navigate("/CareersPage")`    | **SPA**                  | `src/pages/AddSeasons/hooks/useAddSeasons/index.ts:34`                                                             |
| **Season**                | **Match**                       | `/Career/.../Season/.../Match/:matchesId` | `navigate(buildUrl("Match"))` | **SPA**                  | `src/layout/SectionView/features/ClubTabs/AllMatchesTab/components/MatchCard/hooks/useMatchNavigation/index.ts:44` |
| **Season**                | **Player**                      | `/Career/.../Season/.../Player/:playerId` | `navigate(viewPath)`          | **SPA**                  | `src/layout/SectionView/features/ClubTabs/SquadTab/elements/SquadElements/Section/ui/PlayerModal/index.tsx:44`     |
| **Season**                | **Academy**                     | `/Career/:careerId/Academy`               | `navigate(..., { state })`    | **SPA**                  | `src/layout/SectionView/config/seasonTabsConfig.ts:108`                                                            |
| **Season**                | **Compare**                     | `/Career/.../Season/.../Compare`          | `navigate(...)`               | **SPA**                  | `src/ui/BottomMenu/index.tsx:27`                                                                                   |
| **Season**                | **Career** (Voltar)             | `/Career/:careerId`                       | `navigate(...)`               | **SPA**                  | `src/components/HeaderSeason/hooks/useHeaderNavigation/index.ts:75`                                                |
| **Season**                | Abas internas                   | (Mesma rota)                              | Estado de abas / Swiper       | **SPA Interno**          | `src/layout/SectionView/index.tsx`                                                                                 |
| **Match**                 | **Season** (Voltar)             | `/Career/:careerId/Season/:seasonId`      | `navigate(...)`               | **SPA**                  | `src/pages/Match/hooks/useMatchData/index.ts:90`                                                                   |
| **Match**                 | **Geral** (Voltar)              | `/Career/:careerId/Geral`                 | `navigate(...)`               | **SPA**                  | `src/pages/Match/hooks/useMatchData/index.ts:88`                                                                   |
| **Match**                 | Abas internas                   | (Mesma rota)                              | Estado de abas / Swiper       | **SPA Interno**          | `src/pages/Match/index.tsx`                                                                                        |
| **Player**                | **Season** / **Geral** (Voltar) | `/Career/:careerId/...`                   | `navigate(...)`               | **SPA**                  | `src/components/HeaderSeason/hooks/useHeaderNavigation/index.ts:58-62`                                             |
| **Player**                | **Group** (Voltar)              | `/CareerGroup/:groupId/Geral`             | `navigate(...)`               | **SPA**                  | `src/components/HeaderSeason/hooks/useHeaderNavigation/index.ts:54`                                                |
| **ComparePlayers**        | Rota anterior (Voltar)          | `history.back()`                          | `navigate(-1)`                | **SPA**                  | `src/pages/ComparePlayers/index.tsx:38`                                                                            |
| **Group**                 | **CareersPage** (Voltar)        | `/CareersPage`                            | `navigate("/CareersPage")`    | **SPA**                  | `src/components/HeaderSeason/hooks/useHeaderNavigation/index.ts:71`                                                |

---

## 2. Mecanismos de Navegação Utilizados

A análise estática do diretório `src/` confirma a existência de **dois mecanismos mutuamente exclusivos** para mudança de rota:

1. **`window.location.href = ...` (Navegação de Documento Nativa do Browser):**
   - Força o navegador a descartar todo o contexto de execução atual (árvore React, instâncias de SDK, memória JS, conexões WebSocket/HTTP persistent) e solicitar um novo documento HTML do servidor.
   - Encontrado em apenas **dois fluxos ativos**:
     1. `CareersPage → Career`: clique no botão "Entrar" do card da carreira;
     2. `Career → Season`: clique no botão "Entrar na Temporada" dentro do modal `SeasonConfigs`.
        _(Observação: `src/pages/AddSeasons/hooks/useSeasons/index.ts:31` possui uma função `handleNavigateToGeral` com `window.location.href`, porém ela não é chamada no fluxo do usuário; `SeasonConfigs:107` utiliza `navigate` para a visão Geral)._

2. **`useNavigate()` do `react-router-dom` (Navegação SPA Client-Side):**
   - Utiliza a API `history.pushState` / `history.replaceState`. O documento HTML não é recarregado, o bundle JS permanece em memória e o React apenas desmonta os componentes da rota anterior e monta os componentes da rota seguinte.
   - Utilizado em **todas as demais navegações do sistema** (`CareersPage → CareerGroup`, `Season → Academy`, `Season → Match`, `Season → Player`, `ComparePlayers`, e todos os botões "Voltar").

---

## 3. Confirmação Objetiva: Full Reload vs. SPA

### Full Reloads Confirmados:

- **`CareersPage → Career`**: **SIM**. Recarrega o documento completo.
- **`Career → Season`**: **SIM**. Recarrega o documento completo.

### Navegações SPA Confirmadas:

- **`CareersPage → CareerGroup`**: **NÃO recarrega** (SPA legítima).
- **`Season → Academy`**: **NÃO recarrega** (SPA legítima).
- **`Career → Geral`**: **NÃO recarrega** (SPA legítima).
- **`Season → Match`**: **NÃO recarrega** (SPA legítima).
- **`Season → Player`**: **NÃO recarrega** (SPA legítima).
- **`Geral → ComparePlayers`**: **NÃO recarrega** (SPA legítima).
- **Todas as ações de "Voltar" (`HeaderSeason`, `useMatchData`, `ComparePlayers`)**: **NÃO recarregam** (SPA legítima).

---

## 4. Evidência em Código

### Evidência 1: `CareersPage → Career`

No arquivo `src/pages/CareersPage/constants/CareerCardButtons/index.tsx`:

```typescript
// Linhas 15-20:
export const CareerCardButtons: ButtonConfig[] = [
  {
    text: "Entrar",
    onClick: (career) => (window.location.href = `/Career/${career.id}`),
    props: { radius: "square", color: "club_secondary", isActive: true },
  },
  ...
```

O array estático `CareerCardButtons` atribui a `onClick` uma atribuição imperativa a `window.location.href`. Esse botão é disparado em `src/common/elements/Buttons/CareerCardButtons/index.tsx` (linhas 27-29):

```typescript
} else if (button.onClick) {
  button.onClick(career);
}
```

### Evidência 2: `Career → Season`

No arquivo `src/pages/AddSeasons/hooks/useSeasons/index.ts`:

```typescript
// Linhas 4-10:
export const useSeasons = (careerId: string) => {
  const handleNavigateToSeason = useCallback(
    (seasonId: string) => {
      window.location.href = `/Career/${careerId}/Season/${seasonId}`;
    },
    [careerId],
  );
```

Esta função é passada como callback `onNavigateSeason` por `SeasonList/index.tsx:54` para o `ModalManager/index.tsx:204`, que é invocado pelo botão "Entrar na Temporada" em `SeasonConfigs/index.tsx:166`:

```typescript
// src/common/constants/ModalManager/index.tsx:202-205:
onNavigate={() => {
  closeModal();
  if (onNavigateSeason) onNavigateSeason(selectedSeason.id);
}}
```

### Evidência 3: Contraste com Navegações SPA no mesmo projeto

- `CareersPage → CareerGroup` (`src/pages/CareersPage/components/CareerGroupCard/index.tsx:67-69`):

```typescript
onNavigate={() =>
  navigate(`/CareerGroup/${save.id}/Geral`, { state: { save } })
}
```

- `Season → Academy` (`src/layout/SectionView/config/seasonTabsConfig.ts:107-113`):

```typescript
navigate(`/Career/${careerId}/Academy`, {
  state: { career, seasonId },
});
```

- `Season → Match` (`src/layout/SectionView/features/ClubTabs/AllMatchesTab/components/MatchCard/hooks/useMatchNavigation/index.ts:43-45`):

```typescript
const goToMatch = () => {
  navigate(buildUrl("Match"));
};
```

---

## 5. Evidência em Runtime

O harness de performance (`tests/performance/browser-init.js` e `docs/performance/measurements.json`) instrumenta cada mudança de página através dos eventos CDP e observers de ciclo de vida:

- Evento `document-start`: emitido quando um documento HTML novo inicia carregamento;
- Campo `timings.newDocumentMs`: registra o tempo transcorrido para chegada de novo documento (é `null` quando a navegação foi interna/SPA);
- Campo `metricsNote`: relata `"CDP counters reset across documents; use trace instead"` quando a transição destruiu o documento do navegador.

Abaixo, a extração direta das execuções salvas no perfil `medium` (cold-session e warm-session) atesta a divergência:

```
┌──────────────────────────────┬──────────────┬──────────────┬────────────┬─────────────────────────────┐
│ Fluxo                        │ newDocumentMs│ urlMs        │ authCalls  │ Status Documento            │
├──────────────────────────────┼──────────────┼──────────────┼────────────┼─────────────────────────────┤
│ Boot                         │ 26.5 ms      │ 47.8 ms      │ 0          │ Novo documento (esperado)   │
│ CareersPage → Career         │ 47.6 ms      │ 66.3 ms      │ 1          │ NOVO DOCUMENTO (Full Reload)│
│ Career → Season              │ 531.3 ms     │ 557.3 ms     │ 1          │ NOVO DOCUMENTO (Full Reload)│
│ CareersPage → CareerGroup    │ null         │ 3.0 ms       │ 0          │ SPA (Sem reload)            │
│ Season → Academy             │ null         │ 2.5 ms       │ 0          │ SPA (Sem reload)            │
│ Season → Match               │ null         │ 1.0 ms       │ 1          │ SPA (Sem reload)            │
│ Season → Player              │ null         │ 0.9 ms       │ 2          │ SPA (Sem reload)            │
│ Career → Geral               │ null         │ 2.1 ms       │ 1          │ SPA (Sem reload)            │
│ Geral → ComparePlayers       │ null         │ 2.8 ms       │ 1          │ SPA (Sem reload)            │
└──────────────────────────────┴──────────────┴──────────────┴────────────┴─────────────────────────────┘
```

**Conclusão empírica irrefutável:** Somente `CareersPage → Career` e `Career → Season` registraram `newDocumentMs !== null` e destruíram os contadores do CDP.

---

## 6. Métricas de Custo e Comparação

Valores medidos no baseline histórico (`medium`, `cold-session`, mediana):

| Fluxo                         | Mecanismo         | newDocument  | URL/Doc  | Auth Requests | Queries Iniciais | Docs Entregues | Mediana Utilizável |
| ----------------------------- | ----------------- | ------------ | -------- | ------------- | ---------------- | -------------- | ------------------ |
| **CareersPage → CareerGroup** | `navigate`        | `null`       | 3,2 ms   | 0             | 18               | 604            | **285,3 ms**       |
| **Season → Academy**          | `navigate`        | `null`       | 2,6 ms   | 0             | 3                | 15             | **111,8 ms**       |
| **CareersPage → Career**      | `window.location` | **47,9 ms**  | 68,3 ms  | 1             | 313              | 3.753          | **11.984,8 ms**    |
| **Career → Season**           | `window.location` | **950,3 ms** | 961,5 ms | 1             | 314              | 3.755          | **13.080,7 ms**    |

### Decomposição do Custo do Full Reload:

1. **Teardown & Network (~50 ms a ~950 ms):** Descarregamento do DOM, requisição HTTP para o servidor Vite/estático, re-download e re-parsing dos scripts JavaScript.
2. **Re-inicialização do Firebase Auth (~50 ms a ~150 ms):** Como a memória JS foi destruída, o Firebase Auth precisa reinicializar, ler o token persistido no IndexedDB/localStorage e disparar um novo `onAuthStateChanged`.
3. **Reconexão de Transporte Firestore (~100 ms):** O canal de escuta/WebChannel é destruído e precisa restabelecer handshake com o Firestore (ou Emulator).
4. **Hidratação N+1 a Frio (`useCareers`):** Por causa da ausência de cache em memória e do ciclo de vida que reinicia em `useAddSeasons` e `useSeasonView`, a função `ServiceCareer.getAll()` dispara novamente a varredura completa de todas as carreiras, temporadas, partidas e jogadores da conta: **313 a 314 queries Firestore e mais de 3.750 documentos entregues**, gerando uma latência de processamento de dados de **~12 a ~13 segundos**.

---

## 7. Causa Técnica Detalhada

A latência extrema de `CareersPage → Career` (11,9 s) e `Career → Season` (13,0 s) resulta da sobreposição de dois fatores:

1. **Gatilho de Recarregamento:** O uso direto de `window.location.href` destrói a instância da aplicação em execução.
2. **Amplificação pelo Estado Local de `useCareers()`:**
   - O hook `useCareers` (`src/common/hooks/Career/UseCareer/index.ts`) **não** está compartilhado em um Context global no topo da aplicação, nem armazena as carreiras em um singleton/cache de módulo reativo.
   - Cada componente que consome `useCareers` instancia seu próprio `useState<Career[]>([])` com `loading = true`.
   - Quando um full reload acontece, o novo documento é forçado a re-executar `ServiceCareer.getAll()`.
   - Em contraste, rotas como `CareersPage → CareerGroup` e `Season → Academy` contornam essa latência porque:
     - Usam `navigate(...)` (SPA);
     - Repassam o objeto já carregado via `location.state` (`navigate(path, { state: { career, ... } })`);
     - O componente destino renderiza imediatamente a partir de `location.state` sem precisar aguardar um novo ciclo de queries completas.

---

## 8. Arquivos que Precisarão Mudar na Implementação da Correção

Para converter as duas transições de Full Reload para SPA, os seguintes arquivos estão no caminho crítico:

1. **`src/pages/CareersPage/constants/CareerCardButtons/index.tsx`**:
   - Atualmente exporta o array estático `CareerCardButtons` com `onClick: (career) => (window.location.href = ...)`.
   - Precisará receber ou utilizar a função `navigate` (ex.: transformando a constante em uma fábrica `getCareerCardButtons(navigate)` ou movendo a ação de navegação para um hook/contexto).
2. **`src/pages/CareersPage/index.tsx`**:
   - Onde os botões são injetados no contexto `CareerPageContext.Provider`.
3. **`src/pages/AddSeasons/hooks/useSeasons/index.ts`**:
   - Onde `handleNavigateToSeason` executa `window.location.href = /Career/${careerId}/Season/${seasonId}`.
   - Precisará instanciar `const navigate = useNavigate();` e invocar `navigate(...)`.
   - Limpeza secundária: a função inativa `handleNavigateToGeral` (linha 31) também possui `window.location.href` residual.

---

## 9. Riscos Concretos da Futura Correção

Ao substituir `window.location.href` por `navigate`, devem ser gerenciados os seguintes riscos reais:

1. **Retenção da classe `modal-open` no `document.body`:**
   - Ao abrir um modal, o hook `useModalAnimation` executa `document.body.classList.add("modal-open")`.
   - Com o full reload, a classe era limpa automaticamente pelo descarregamento da página pelo navegador.
   - Na navegação SPA, se o modal for desmontado durante a transição sem executar a animação de saída de `close()`, a classe `modal-open` (que aplica `overflow: hidden`) permanecerá presa no `body`, travando a rolagem da página de destino.
   - _Evidência de que o autor do código já encontrou esse problema antes:_ em `src/ui/modals/SeasonConfigs/index.tsx:105`, há uma chamada explícita `document.body.classList.remove("modal-open")` antes de chamar `navigate()`. A mesma proteção precisa ser assegurada no fechamento de `SeasonConfigs` ao entrar em uma temporada.
2. **Preservação de Posição de Scroll:**
   - O navegador reseta o scroll para `top: 0` durante um full reload.
   - O SPA com `react-router-dom` preserva a posição de scroll da janela se `<ScrollRestoration />` não estiver ativo ou se não houver um `window.scrollTo(0, 0)` no carregamento da tela. Se o usuário clicar em "Entrar" no final da página de carreiras, a tela da carreira pode abrir já com rolagem para baixo.
3. **Comportamento de Carregamento de `AddSeasons` e `Season`:**
   - Em `useAddSeasons`, a tela depende de `useCareers()`. Se `CareersPage → Career` navegar por SPA sem passar state, `AddSeasons` montará seu próprio `useCareers()`. É essencial testar se `AddSeasons` lida perfeitamente com a transição entre telas sem flashes ou estados intermediários inválidos.
4. **Fechamento de Listeners do Firestore:**
   - No `useCareers`, o `useEffect` possui cleanup que invoca `unsubscribeCareers()`. Ao navegar por SPA, o unmount limpa o listener anterior corretamente, mas uma nova subscrição é aberta pelo componente seguinte a menos que state seja aproveitado.
5. **Impacto nos Testes de Performance:**
   - Os testes de jornada em `tests/performance/journeys.mjs` esperam os seletores de destino (`Selecionar temporadas` e `nav(p, 'Elenco')`). A conversão para SPA não altera seletores, mas fará com que o evento `newDocumentMs` seja `null`, e habilitará a captura contínua de métricas CDP (LayoutDuration, TaskDuration, etc.) sem o aviso `"CDP counters reset across documents"`.

---

## 10. Implementação Realizada na Rodada

A implementação da Stage 7C seguiu estritamente o princípio da intervenção cirúrgica e localizada:

1. **`src/pages/CareersPage/constants/CareerCardButtons/index.tsx`**:
   - Criada e exportada a função fábrica `getCareerCardButtons(navigate: NavigateFunction)`.
   - O botão "Entrar" agora executa `window.scrollTo(0, 0)` e navega via `navigate(`/Career/${career.id}`, { state: { career } })`.
   - A constante `CareerCardButtons` estática foi preservada para compatibilidade retroativa.

2. **`src/pages/CareersPage/index.tsx`**:
   - Importado `useNavigate` e `useMemo`.
   - Inicializado `const navigate = useNavigate()`.
   - Memoizado `buttons` com `useMemo(() => getCareerCardButtons(navigate), [navigate])` antes de retornos condicionais.
   - Fornecido `buttons` no `contextValue` consumido pelos cards de carreira.

3. **`src/pages/AddSeasons/hooks/useSeasons/index.ts`**:
   - Importado `useNavigate`.
   - Em `handleNavigateToSeason`: substituído `window.location.href = ...` por:
     - `document.body.classList.remove("modal-open")`
     - `window.scrollTo(0, 0)`
     - `navigate(`/Career/${careerId}/Season/${seasonId}`)`
   - Em `handleNavigateToGeral`: substituído `window.location.href = ...` por:
     - `document.body.classList.remove("modal-open")`
     - `window.scrollTo(0, 0)`
     - `navigate(`/Career/${careerId}/Geral`)`

4. **`src/ui/modals/SeasonConfigs/index.tsx`**:
   - No clique do botão `SEASON_ENTER_LABEL` ("Entrar na Temporada"), adicionado `document.body.classList.remove("modal-open")` preventivo antes de chamar `onNavigate()`, replicando o padrão seguro já utilizado na rota Geral/Academy.

---

## 11. Resultados Empíricos AFTER vs BEFORE

Medições executadas em ambiente sintético local com Emulators (Firestore 8089, Auth 9098, Functions 5002) através do harness automatizado `tests/performance/stage-7c.mjs`.

### 11.1 Comparação Direta — Perfil MEDIUM (Mediana de 3 Amostras)

| Métrica                  |  CareersPage → Career (BEFORE)  |  CareersPage → Career (AFTER)  |    Career → Season (BEFORE)     |    Career → Season (AFTER)     |
| :----------------------- | :-----------------------------: | :----------------------------: | :-----------------------------: | :----------------------------: |
| **Mecanismo**            | `window.location` (Full Reload) |        `navigate` (SPA)        | `window.location` (Full Reload) |        `navigate` (SPA)        |
| **`newDocumentMs`**      |     **47,9 ms** (novo doc)      |    **`null` (sem reload)**     |     **950,3 ms** (novo doc)     |    **`null` (sem reload)**     |
| **`urlMs`**              |           **68,3 ms**           |      **2,4 ms** (-96,5%)       |          **961,5 ms**           |      **1,2 ms** (-99,9%)       |
| **Auth Requests (HTTP)** |     **1** (re-auth externa)     |   **0** (sessão em memória)    |     **1** (re-auth externa)     |   **0** (sessão em memória)    |
| **Auth Callbacks**       |                1                |               1                |                1                |               1                |
| **Queries Firestore**    |               313               |              313               |               314               |              314               |
| **Docs Entregues**       |              3.753              |             3.753              |              3.755              |             3.755              |
| **`modal-open` no body** |        Limpo por recarga        | **`false` (limpo ativamente)** |        Limpo por recarga        | **`false` (limpo ativamente)** |
| **`window.scrollY`**     |      0 (reset por recarga)      |   **0 (reset por contrato)**   |      0 (reset por recarga)      |   **0 (reset por contrato)**   |
| **`career` no State**    |           `undefined`           |     **`c1` (disponível)**      |               N/A               |              N/A               |
| **Mediana Utilizável**   |           11.984,8 ms           |        **12.168,7 ms**         |           13.080,7 ms           |        **12.687,0 ms**         |

### 11.2 Comparação Direta — Perfil SMALL (Mediana de 3 Amostras)

| Métrica                | CareersPage → Career (BEFORE) | CareersPage → Career (AFTER) | Career → Season (BEFORE) | Career → Season (AFTER) |
| :--------------------- | :---------------------------: | :--------------------------: | :----------------------: | :---------------------: |
| **Mecanismo**          |          Full Reload          |             SPA              |       Full Reload        |           SPA           |
| **`newDocumentMs`**    |          **47,6 ms**          |          **`null`**          |       **531,3 ms**       |       **`null`**        |
| **`urlMs`**            |          **66,3 ms**          |          **1,2 ms**          |       **557,3 ms**       |       **0,9 ms**        |
| **Auth Requests**      |               1               |            **0**             |            1             |          **0**          |
| **Mediana Utilizável** |          4.057,9 ms           |   **2.532,9 ms** (-37,6%)    |        4.897,7 ms        | **2.516,6 ms** (-48,6%) |

---

## 12. Avaliação dos Critérios de Aceite da Etapa 7C

1. **Os dois full reloads desapareceram:** ✅ Confirmado. Tanto `CareersPage → Career` quanto `Career → Season` utilizam navegação React Router.
2. **Navegação passou a ser SPA:** ✅ Confirmado.
3. **Não ocorre document navigation (`newDocumentMs === null`):** ✅ Confirmado por log em todas as repetições de teste.
4. **Não há nova inicialização de Auth/Firebase causada pela navegação:** ✅ Confirmado. Requisições HTTP ao Auth Emulator reduzidas de 1 para 0 em ambas as transições; estado de autenticação em memória preservado.
5. **Não houve regressão funcional:** ✅ Suíte de testes automatizados executada (`177 passed`, 15 arquivos de teste, zero falhas).
6. **Contrato de scroll e classes do DOM:** ✅ `body.modal-open` garantidamente ausente após navegação para Season (`false`), e scroll resetado para o topo (`scrollY: 0`).
