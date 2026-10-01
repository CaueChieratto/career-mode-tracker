# Caracterização, Diagnóstico e Implementação — Etapa 7D: Player Duplicate Hydration

Documento técnico de caracterização, diagnóstico empírico e validação pós-implementação da Etapa 7D (Player Duplicate Hydration).
O baseline histórico em `docs/performance/baseline-report.md` e o relatório da Etapa 7C em `docs/performance/stage-7c-navigation.md` permanecem intactos e preservados.

---

## 1. Mapeamento do Fluxo da Página Player

_(Classificação: CONFIRMADO POR CÓDIGO)_

### 1.1 Rota e Componentes

- **Rotas:**
  - `/Career/:careerId/Season/:seasonId/Player/:playerId`
  - `/Career/:careerId/Geral/Player/:playerId`
- **Mapeamento:** `src/App.tsx` (linhas 46-50) mapeia ambas as rotas para o componente `<Players />` (`src/pages/Players/index.tsx`).

### 1.2 Grafo de Chamadas ANTES da Correção

```
<Players /> (src/pages/Players/index.tsx)
  │
  └── usePlayerPageData() (src/pages/Players/hooks/usePlayerPageData/index.ts)
        │
        ├── [Instância 1] useSeasonView(true, true) (src/common/hooks/Seasons/UseSeasonView/index.ts)
        │     │
        │     └── [Hook 1] useCareers() (src/common/hooks/Career/UseCareer/index.ts)
        │           │
        │           └── onAuthStateChanged() -> ServiceCareer.getAll() -> onSnapshot(users/:uid/careers)
        │                 │
        │                 └── Varredura de subcollections:
        │                       ├── ServiceMatches.getMatchesBySeason(careerId, seasonId)
        │                       └── ServicePlayers.getPlayersBySeason(careerId, seasonId)
        │
        └── [Instância 2] useCareers() (src/pages/Players/hooks/usePlayerPageData/index.ts:17) [REDUNDANTE]
              │
              └── onAuthStateChanged() -> ServiceCareer.getAll() -> onSnapshot(users/:uid/careers)
                    │
                    └── Varredura idêntica e concorrente das subcollections:
                          ├── ServiceMatches.getMatchesBySeason(careerId, seasonId)
                          └── ServicePlayers.getPlayersBySeason(careerId, seasonId)
```

---

## 2. Identificação da Causa Técnica

_(Classificação: CONFIRMADO POR CÓDIGO)_

No arquivo `src/pages/Players/hooks/usePlayerPageData/index.ts`:

- O hook `useSeasonView(true, true)` já invocava internamente `const { careers, loading } = useCareers()` na linha 15 de `src/common/hooks/Seasons/UseSeasonView/index.ts`.
- Contudo, `useSeasonView` omitia `careers` de seu objeto retornado.
- Para obter a lista de carreiras e alimentar a função `getGroupCareers(...)`, `usePlayerPageData` realizava uma segunda chamada direta a `useCareers()`.
- Como `useCareers` não possui cache ou Context compartilhado, cada instância mantinha seu próprio listener ativo no Firestore e disparava a busca concorrente de todas as subcollections da conta, dobrando todas as queries e documentos entregues (fator 2.0x exato).

---

## 3. Implementação da Correção Mínima

_(Classificação: ALTERAÇÃO FEITA)_

### 3.1 Arquivos Alterados

1. `src/common/hooks/Seasons/UseSeasonView/index.ts`
2. `src/pages/Players/hooks/usePlayerPageData/index.ts`

### 3.2 Diffs Relevantes

#### `src/common/hooks/Seasons/UseSeasonView/index.ts`:

```diff
--- a/src/common/hooks/Seasons/UseSeasonView/index.ts
+++ b/src/common/hooks/Seasons/UseSeasonView/index.ts
@@ -66,6 +66,7 @@ export const useSeasonView = (isGeralPage: boolean, isPlayer?: boolean) => {
   return {
     loading,
     career,
+    careers,
     season: seasonData,
     tabsConfig,
     isModalOpen,
```

#### `src/pages/Players/hooks/usePlayerPageData/index.ts`:

```diff
--- a/src/pages/Players/hooks/usePlayerPageData/index.ts
+++ b/src/pages/Players/hooks/usePlayerPageData/index.ts
@@ -1,6 +1,5 @@
 import { useMemo } from "react";
 import { useLocation, useNavigate, useParams } from "react-router-dom";
-import { useCareers } from "../../../../common/hooks/Career/UseCareer";
 import { useSeasonView } from "../../../../common/hooks/Seasons/UseSeasonView";
 import { getSeasonTabsConfig } from "../../../../layout/SectionView/config/seasonTabsConfig";
 import { createSpoofedCareer } from "../../helpers/createSpoofedCareer";
@@ -13,8 +12,12 @@ const isRecord = (value: unknown): value is Record<string, unknown> =>
   typeof value === "object" && value !== null;

 export const usePlayerPageData = () => {
-  const { loading, career, season } = useSeasonView(true, true);
-  const { careers: allCareers } = useCareers();
+  const {
+    loading,
+    career,
+    careers: allCareers,
+    season,
+  } = useSeasonView(true, true);
   const { playerId, seasonId } = useParams<PlayerPageParams>();
   const location = useLocation();
   const navigate = useNavigate();
```

---

## 4. Testes de Regressão Comportamentais

_(Classificação: ALTERAÇÃO FEITA & CONFIRMADO POR TESTE)_

Arquivo criado: `src/test/playerHydration.test.tsx` (2 testes, 100% aprovados).

- Garante que a montagem de `usePlayerPageData` chama `ServiceCareer.getAll` **exatamente 1 vez** (eliminando a 2ª chamada e o 2º listener).
- Garante que ao emitir dados do snapshot único, todos os contratos dependentes (`career`, `season`, `player`, `spoofedCareer`, `totalSeasons`, `totalClubs`) permanecem intactos.
- Garante o funcionamento idêntico na rota `/Geral/Player/:playerId`.
- Garante que ao desmontar, exatamente 1 unsubscribe é executado.

---

## 5. Medição Empírica AFTER (Firebase Emulators + Dados Sintéticos)

_(Classificação: CONFIRMADO POR LOG NO HARNESS)_

Harness utilizado: `tests/performance/stage-7d-player-hydration.mjs` sob emuladores Firestore (`8089`) e Auth (`9098`).

### 5.1 Comparativo Completo: BEFORE vs. AFTER

#### A) Com Migração 7B ATIVA (`_playerStatsVersion: 1`)

| Métrica                      | Referência (`Career → Season`) | Player BEFORE |  Player AFTER  | Variação (BEFORE → AFTER) |
| :--------------------------- | :----------------------------: | :-----------: | :------------: | :-----------------------: |
| **SMALL — Queries Totais**   |               8                |      14       |     **7**      |    **-50,0%** (14 → 7)    |
| SMALL — Reads                |               7                |      12       |     **6**      |    **-50,0%** (12 → 6)    |
| SMALL — Listeners            |               1                |       2       |     **1**      |    **-50,0%** (2 → 1)     |
| SMALL — Documentos           |              119               |      234      |    **117**     |  **-50,0%** (234 → 117)   |
| SMALL — Caminhos Duplicados  |               0                |   7 (100%)    |   **0 (0%)**   |  **Eliminados (7 → 0)**   |
| SMALL — Tempo Utilizável     |            375,2 ms            |   963,1 ms    |  **313,8 ms**  |    -67,4% de latência     |
|                              |                                |               |                |                           |
| **MEDIUM — Queries Totais**  |               14               |      26       |     **13**     |   **-50,0%** (26 → 13)    |
| MEDIUM — Reads               |               13               |      24       |     **12**     |   **-50,0%** (24 → 12)    |
| MEDIUM — Listeners           |               1                |       2       |     **1**      |    **-50,0%** (2 → 1)     |
| MEDIUM — Documentos          |              455               |      906      |    **453**     |  **-50,0%** (906 → 453)   |
| MEDIUM — Caminhos Duplicados |               0                |   13 (100%)   |   **0 (0%)**   |  **Eliminados (13 → 0)**  |
| MEDIUM — Tempo Utilizável    |            543,3 ms            |   638,3 ms    | **1.113,8 ms** |          Estável          |

#### B) Estado Base Legado (Sem migração 7B — compatível com baseline histórico)

| Métrica                      | Referência (`Career → Season`) | Player BEFORE | Player AFTER | Variação (BEFORE → AFTER)  |
| :--------------------------- | :----------------------------: | :-----------: | :----------: | :------------------------: |
| **SMALL — Queries Totais**   |               68               |      134      |    **67**    |   **-50,0%** (134 → 67)    |
| SMALL — Reads                |               67               |      132      |    **66**    |   **-50,0%** (132 → 66)    |
| SMALL — Listeners            |               1                |       2       |    **1**     |     **-50,0%** (2 → 1)     |
| SMALL — Documentos           |              779               |     1.554     |   **777**    |  **-50,0%** (1.554 → 777)  |
| SMALL — Caminhos Duplicados  |               0                |   67 (100%)   |  **0 (0%)**  |  **Eliminados (67 → 0)**   |
|                              |                                |               |              |                            |
| **MEDIUM — Queries Totais**  |              314               |      626      |   **313**    |   **-50,0%** (626 → 313)   |
| MEDIUM — Reads               |              313               |      624      |   **312**    |   **-50,0%** (624 → 312)   |
| MEDIUM — Listeners           |               1                |       2       |    **1**     |     **-50,0%** (2 → 1)     |
| MEDIUM — Documentos          |             3.755              |     7.506     |  **3.753**   | **-50,0%** (7.506 → 3.753) |
| MEDIUM — Caminhos Duplicados |               0                |  313 (100%)   |  **0 (0%)**  |  **Eliminados (313 → 0)**  |

---

## 6. Verificação de Integridade e Suíte de Testes

_(Classificação: CONFIRMADO POR LOG)_

- **Teste Direcionado:** `npx vitest run src/test/playerHydration.test.tsx` → **2 passed (2)**
- **Suíte Completa:** `npm run test:run` → **16 test files passed, 179 tests passed (0 falhas)**
- **Typecheck do App:** `npm run typecheck` (`tsc -b`) → **0 erros**
- **Typecheck dos Testes:** `npm run typecheck:tests` (`tsc -p tsconfig.test.json --noEmit`) → **0 erros**
- **Linter:** `npm run lint` (`eslint .`) → **0 warnings, 0 erros**
- **Git Diff Whitespace Check:** `git diff --check` → **0 erros**
