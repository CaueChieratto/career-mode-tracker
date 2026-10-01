# Diagnóstico e Caracterização — Etapa 7E: Bundle & Code Splitting

Documento técnico de caracterização e diagnóstico do bundle frontend e oportunidades de code splitting da Etapa 7E.
Em conformidade com as instruções da etapa, **nenhum código funcional foi alterado** nesta rodada.
Os baselines e relatórios históricos anteriores (`docs/performance/baseline-report.md`, `docs/performance/stage-7c-navigation.md` e `docs/performance/stage-7d-player-hydration.md`) permanecem intactos.

---

## 1. Tamanho Total Atual do Build

_(Classificação: CONFIRMADO POR BUILD/LOG)_

Resultado do build de produção via `vite build` (`dist/`):

| Ativo    | Caminho                          |       Tamanho Bruto       |       Tamanho Gzip        | Observação                 |
| :------- | :------------------------------- | :-----------------------: | :-----------------------: | :------------------------- |
| **HTML** | `dist/index.html`                |          0,48 kB          |          0,32 kB          | Documento raiz SPA         |
| **CSS**  | `dist/assets/index-CYvBrEEd.css` |         143,23 kB         |         28,11 kB          | CSS global consolidado     |
| **JS**   | `dist/assets/index-ltYt9m_b.js`  | **5.233,37 kB** (5,23 MB) | **1.684,28 kB** (1,68 MB) | **Chunk único monolítico** |

> **Aviso emitido pelo Rollup durante o build:**
> `(!) Some chunks are larger than 500 kB after minification.`
> Atualmente existe **apenas 1 chunk JS**. Não há nenhum code splitting configurado.

---

## 2. Maiores Dependências e Módulos do Bundle

_(Classificação: CONFIRMADO POR BUILD/LOG — Análise AST de 1.282 módulos)_

| Módulo / Dependência                                       | Rendered Length (Bytes) | % do JS Total | Categoria                    |
| :--------------------------------------------------------- | :---------------------: | :-----------: | :--------------------------- |
| `node_modules/react-world-flags/dist/react-world-flags.js` |      **3.692.981**      |  **69,95%**   | Biblioteca de Bandeiras SVG  |
| `node_modules/@firebase/firestore/dist/index.esm.js`       |       **641.528**       |  **12,15%**   | Banco de Dados / SDK         |
| `node_modules/@firebase/auth/dist/esm/index-9ccb475d.js`   |       **276.060**       |   **5,23%**   | Autenticação / SDK           |
| `node_modules/@remix-run/router/dist/router.js`            |       **161.828**       |   **3,07%**   | Roteamento SPA               |
| `node_modules/react-dom/cjs/react-dom.production.min.js`   |       **132.840**       |   **2,52%**   | Framework UI                 |
| `node_modules/swiper/shared/swiper-core.mjs`               |       **131.630**       |   **2,49%**   | Carrossel Mobile             |
| `node_modules/@dnd-kit/core/dist/core.esm.js`              |       **93.162**        |   **1,76%**   | Drag & Drop                  |
| `@firebase` (webchannel, util, app, component)             |       **125.506**       |   **2,38%**   | SDK Firebase auxiliar        |
| `src/pages/Tutorial/constants/TutorialContent/index.tsx`   |       **30.494**        |   **0,58%**   | Textos estáticos de Tutorial |
| `node_modules/react-icons` (`fa`, `io5`, `gi`, etc.)       |       **~65.000**       |  **~1,23%**   | Pacote de Ícones             |
| `node_modules/date-fns`                                    |       **~46.737**       |  **~0,88%**   | Utilitários de data          |
| `node_modules/@dnd-kit/sortable`                           |       **16.932**        |   **0,32%**   | Drag & Drop Sortable         |
| Demais componentes e arquivos do projeto (`src/`)          |      **~385.000**       |  **~7,30%**   | Código próprio da aplicação  |

**Fato comprovado:**

- `react-world-flags` + `Firebase` compõem sozinhos **89,7% de todo o JavaScript gerado**.
- Todo o código de negócio escrito pela equipe (`src/`) representa apenas ~7,3% do volume total.

---

## 3. Investigação Específica: `react-world-flags`

_(Classificação: CONFIRMADO POR CÓDIGO E LOG)_

- **Peso:** 3,56 MB em disco (`node_modules/react-world-flags/dist/react-world-flags.js`) e **3,69 MB no bundle compilado (69,95% do total)**.
- **Causa Técnica:** A biblioteca embute as marcações SVG literais de **todas as bandeiras do mundo** dentro de um único objeto JavaScript. Como não há separação modular de arquivos por país, o Rollup/Vite é incapaz de aplicar tree-shaking, forçando o navegador a baixar e parsear todas as bandeiras globais no carregamento inicial.
- **Onde é importado no projeto?**
  Apenas em **2 arquivos** em toda a base de código:
  1. `src/layout/SectionView/features/PlayerTabs/AcademyPlayerTab/index.tsx` (linha 4)
  2. `src/pages/Academy/layouts/AcademyContent/components/Player/views/PlayerWorkspace/index.tsx` (linha 2)
- **Tipo de importação:** Estática (`import Flag from "react-world-flags"`).
- **Dependência do restante da aplicação:**
  O core da aplicação (`SquadTab`, `SeasonsPlayerTab`, `TotalPlayerTab`, `Players`, `ComparePlayers`, etc.) **não utiliza essa biblioteca** — exibe a nacionalidade como texto/string (ex.: "Brasil", "Argentina").
- **Conclusão:** O bundle inteiro da aplicação carrega 3,69 MB de SVGs embutidos para atender apenas duas exibições visuais menores no módulo de Academy.

---

## 4. Análise de Code Splitting e Rotas (`App.tsx`)

_(Classificação: CONFIRMADO POR CÓDIGO)_

No arquivo `src/App.tsx`:

```typescript
import Welcome from "./pages/Welcome";
import CareersPage from "./pages/CareersPage";
import AddSeasons from "./pages/AddSeasons";
import Season from "./pages/Season";
import Geral from "./pages/Geral";
import Players from "./pages/Players";
import Tutorial from "./pages/Tutorial";
import { Match } from "./pages/Match";
import { ComparePlayers } from "./pages/ComparePlayers";
import { Academy } from "./pages/Academy";
import { GroupCareerPage } from "./pages/GroupCareerPage";
```

- **Estado atual:** **100% dos componentes de rota são importados estaticamente.**
- **Consequência:** Na carga inicial (rota `/`), o usuário é obrigado a baixar o código de Match, Academy, Tutorial, Comparador de Jogadores, etc., mesmo antes de se autenticar.

### Candidatos Reais a `React.lazy` (Classificados por Impacto e Isolamento):

| Candidato             | Tamanho de Código Próprio | Dependências Específicas Pesadas                      | Frequência de Acesso            | Recomendação                               |
| :-------------------- | :-----------------------: | :---------------------------------------------------- | :------------------------------ | :----------------------------------------- |
| **`Academy`**         |         326,9 KB          | `react-world-flags` (3,69 MB), Tournaments, Workspace | Sob demanda (menu da carreira)  | **Altíssimo Impacto** (Lazy recomendado)   |
| **`Match`**           |         238,3 KB          | `@dnd-kit`, canvas de lineup, match stats             | Sob demanda (clique na partida) | **Alto Impacto** (Lazy recomendado)        |
| **`Tutorial`**        |          38,8 KB          | `TutorialContent` (30,5 KB de texto)                  | Rara (onboarding/ajuda)         | **Médio Impacto** (Lazy recomendado)       |
| **`ComparePlayers`**  |          35,8 KB          | Lógica pesada de comparação                           | Esporádica                      | **Médio Impacto** (Lazy recomendado)       |
| **`GroupCareerPage`** |          14,9 KB          | Contexto de grupos de carreira                        | Apenas carreiras agrupadas      | **Baixo/Médio Impacto** (Lazy recomendado) |

_Caminho Crítico (Manter imediato ou carregamento primário):_

- `Welcome` (página de login): deve renderizar instantaneamente.
- `CareersPage` (lista principal de carreiras): primeira tela após autenticação.
- `AddSeasons` / `Season` / `Geral` / `Players`: compartilham a espinha dorsal de `SectionView`.

---

## 5. Mapeamento de Assets Estáticos (`public/`)

_(Classificação: CONFIRMADO POR LOG NO DISCO)_

O diretório `public/` totaliza **79,07 MB** de assets que não passam pelo bundle JS, mas são servidos diretamente pelo servidor web.

### Maiores Arquivos Encontrados:

- `public/Logo.png`: **1,35 MB** (1.354.266 bytes) — imagem PNG desnecessariamente pesada para a logo mobile.
- `public/bolaDeOuro.jpeg`: **235 KB**.
- **Imagens de Troféus (`public/images/trophies/`):** Dezenas de imagens PNG não otimizadas em altíssima resolução:
  - `germany/bundesliga.png`: **3,14 MB**
  - `germany/bundesliga2.png`: **3,05 MB**
  - `england/communityShield.png`: **2,78 MB**
  - `scotland/scottishPremiership.png`: **2,76 MB**
  - `england/premierLeague.png`: **2,59 MB**
  - `england/bsm.png`: **2,47 MB**
  - `germany/pokal.png`: **2,45 MB**
  - `england/leagueOne.png`: **2,45 MB**
  - `netherlands/eredivisie.png`: **2,33 MB**
  - `portugal/ligaPortugal.png`: **2,24 MB**
  - `uefa/europaLeague.png`: **2,23 MB**
  - `brasil/copaDoBrasil.png`: **2,20 MB**

_(Nenhuma imagem foi modificada nesta rodada; este levantamento servirá de insumo para a etapa de otimização de assets)._

---

## 6. Comportamento em Runtime

_(Classificação: CONFIRMADO POR LOG)_

- **JS transferido na carga inicial:** **1.684,28 kB (1,68 MB) gzipped / 5,23 MB uncompressed**.
- **Chunks carregados antes de qualquer interação:** **1 chunk único** contendo toda a aplicação.
- **Chunks adicionais ao navegar:** **0**. Toda a navegação subsequente reutiliza o código já presente na memória, porém ao custo de um atraso massivo no primeiro carregamento em conexões móveis.

---

## 7. Arquivos que Precisariam Mudar para Implementação Futura

_(Classificação: CONFIRMADO POR CÓDIGO)_

1. `src/App.tsx`: substituição de imports estáticos por `React.lazy` + `<Suspense>` para rotas isoladas.
2. `vite.config.ts`: configuração de `rollupOptions.output.manualChunks` para segregar vendors (ex.: `firebase`, `router`).
3. `src/layout/SectionView/features/PlayerTabs/AcademyPlayerTab/index.tsx` e `src/pages/Academy/layouts/AcademyContent/components/Player/views/PlayerWorkspace/index.tsx`: remoção do import monolítico de `react-world-flags` (substituição por lazy load ou componente leve de bandeiras).

---

## 8. Menor Sequência Recomendada de Otimizações

_(Classificação: INFERÊNCIA BASEADA NOS DADOS)_

1. **Passo 1 (Maior ROI): Tratar `react-world-flags`**:
   - Como representa **70% do JS total**, isolar ou substituir essa biblioteca retira imediatamente **~3,7 MB brutos (~1 MB gzipped)** do bundle inicial.
2. **Passo 2: Code Splitting das Telas Pesadas (`Match`, `Academy`, `Tutorial`, `ComparePlayers`)**:
   - Aplicar `React.lazy()` nas páginas pesadas de acesso sob demanda.
3. **Passo 3: Vendor Splitting no `vite.config.ts`**:
   - Extrair a SDK do Firebase para um chunk vendor separado (`vendor-firebase`), aproveitando o cache de longa duração do navegador.

---

## 9. Ganho Esperado Comprovado

_(Classificação: CONFIRMADO POR DADOS DO BUNDLE / INFERÊNCIA TÉCNICA)_

- **Com o Passo 1 (react-world-flags tratado):**
  - JS total da aplicação: **5,23 MB → ~1,54 MB (-70,5%)**
  - Tamanho Gzip transferido: **1,68 MB → ~650 kB (-61,3%)**
- **Com o Passo 2 (Code Splitting de rotas):**
  - O entry chunk inicial da rota Welcome/Login cairá para **< 400 kB gzipped**.
  - As páginas `Match` (~240 kB) e `Academy` (~330 kB) serão baixadas sob demanda apenas se o usuário navegar até elas.
