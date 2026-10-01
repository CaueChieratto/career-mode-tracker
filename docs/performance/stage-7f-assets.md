# Diagnóstico Informativo — Etapa 7F: Assets Estáticos

Documento técnico de caracterização e inventário informativo dos assets estáticos (`public/` e `src/`), padrões de exibição e impacto de rede no carregamento.

---

> [!IMPORTANT]
> **Definição de Requisito e Decisão de Produto (Stage 7F):**
>
> 1. **Nenhuma otimização de assets será realizada.** Não converter, comprimir, redimensionar, substituir, renomear, excluir, gerar WebP/AVIF ou alterar caminhos de qualquer arquivo (troféus, logos, `Logo.png`, `bolaDeOuro.jpeg`, logos de ligas ou qualquer asset futuro).
> 2. **O tamanho atual dos assets é uma limitação aceita.** O peso dos arquivos em disco (~79,07 MB) e o volume transferido em runtime são aceitos como requisito de preservação de fidelidade do projeto.
> 3. **Assets do México são de uso futuro conhecido (NÃO são órfãos):** Os arquivos `public/images/trophies/mexico/copaMexico.png` e `public/images/trophies/mexico/ligaMexico.png` serão integrados pelo usuário ao mapeamento de ligas em `league.ts` no futuro. **Não devem ser deletados nem marcados para remoção.**
> 4. **Bloqueio permanente:** Nenhuma imagem deve ser alterada em etapas futuras sem autorização explícita do usuário.
> 5. Esta etapa conclui-se estritamente como **diagnóstico informativo**.

---

## 1. Inventário Geral de Assets

_(Classificação: CONFIRMADO POR ARQUIVO / CONFIRMADO POR CÓDIGO)_

A varredura completa do repositório identificou **103 arquivos estáticos** em `public/` e **0 arquivos de imagem embutidos em `src/`**.
O volume total ocupado em disco por esses assets é de **82.906.304 bytes (79,07 MB / 82,91 MB decimal)**.

### Distribuição por Categoria

| Categoria             | Caminho                   | Qtd Arquivos |      Formato      | Tamanho Total (Bytes) | Tamanho (MB) | % do Total |   Dimensões Típicas   | Status de Uso                                      |
| :-------------------- | :------------------------ | :----------: | :---------------: | :-------------------: | :----------: | :--------: | :-------------------: | :------------------------------------------------- |
| **Troféus**           | `public/images/trophies/` |      51      | PNG (RGBA 32-bit) |      80.751.776       |   77,01 MB   |   97,40%   | 1024x1536 a 1536x1024 | Ativos em `league.ts` (49) + Uso futuro México (2) |
| **Logo da Aplicação** | `public/Logo.png`         |      1       | PNG (RGBA 32-bit) |       1.354.266       |   1,29 MB    |   1,63%    |       1024x1024       | Favicon e fallback de clubes                       |
| **Logos de Ligas**    | `public/images/leagues/`  |      50      |    PNG (RGBA)     |        570.574        |   0,54 MB    |   0,69%    |   100x100 a 300x300   | Tabelas e cabeçalhos                               |
| **Bola de Ouro**      | `public/bolaDeOuro.jpeg`  |      1       | JPEG (RGB 24-bit) |        235.688        |   0,22 MB    |   0,28%    |        606x378        | Aba de prêmios do jogador                          |
| **TOTAL**             | —                         |   **103**    |         —         |    **82.906.304**     | **79,07 MB** |  **100%**  |           —           | **100% preservados integralmente**                 |

---

## 2. Top 20 Maiores Arquivos Estáticos

_(Classificação: CONFIRMADO POR ARQUIVO)_

Abaixo estão os 20 maiores arquivos estáticos ordenados por tamanho em disco:

|   #    | Caminho do Arquivo                                        | Formato  | Tamanho (Bytes) |  Tamanho (kB / MB)   | Dimensões (px) | Onde é Utilizado no Código   | Momento do Carregamento              |
| :----: | :-------------------------------------------------------- | :------: | :-------------: | :------------------: | :------------: | :--------------------------- | :----------------------------------- |
| **1**  | `public/images/trophies/germany/bundesliga.png`           | PNG RGBA |    3.219.986    | 3.144,5 kB (3,07 MB) |  1254 x 1254   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **2**  | `public/images/trophies/germany/bundesliga2.png`          | PNG RGBA |    3.129.831    | 3.056,5 kB (2,98 MB) |  1254 x 1254   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **3**  | `public/images/trophies/england/communityShield.png`      | PNG RGBA |    2.850.597    | 2.783,8 kB (2,72 MB) |  1536 x 1024   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **4**  | `public/images/trophies/scotland/scottishPremiership.png` | PNG RGBA |    2.830.418    | 2.764,1 kB (2,70 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **5**  | `public/images/trophies/england/premierLeague.png`        | PNG RGBA |    2.654.195    | 2.592,0 kB (2,53 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **6**  | `public/images/trophies/england/bsm.png`                  | PNG RGBA |    2.530.647    | 2.471,3 kB (2,41 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **7**  | `public/images/trophies/germany/pokal.png`                | PNG RGBA |    2.518.730    | 2.459,7 kB (2,40 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **8**  | `public/images/trophies/england/leagueOne.png`            | PNG RGBA |    2.513.364    | 2.454,5 kB (2,40 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **9**  | `public/images/trophies/netherlands/eredivisie.png`       | PNG RGBA |    2.395.347    | 2.339,2 kB (2,28 MB) |  1263 x 1246   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **10** | `public/images/trophies/portugal/ligaPortugal.png`        | PNG RGBA |    2.298.000    | 2.244,1 kB (2,19 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **11** | `public/images/trophies/uefa/europaLeague.png`            | PNG RGBA |    2.286.205    | 2.232,6 kB (2,18 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **12** | `public/images/trophies/brasil/copaDoBrasil.png`          | PNG RGBA |    2.256.845    | 2.204,0 kB (2,15 MB) |  1212 x 1298   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **13** | `public/images/trophies/uefa/conferenceLeague.png`        | PNG RGBA |    2.190.177    | 2.138,8 kB (2,09 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **14** | `public/images/trophies/uefa/uefaSupercopa.png`           | PNG RGBA |    2.161.018    | 2.110,4 kB (2,06 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **15** | `public/images/trophies/england/carabao.png`              | PNG RGBA |    1.991.139    | 1.944,5 kB (1,90 MB) |  1415 x 1112   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **16** | `public/images/trophies/spain/copaDoRey.png`              | PNG RGBA |    1.967.435    | 1.921,3 kB (1,88 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **17** | `public/images/trophies/england/championship.png`         | PNG RGBA |    1.950.407    | 1.904,7 kB (1,86 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **18** | `public/images/trophies/england/leagueTwo.png`            | PNG RGBA |    1.930.126    | 1.884,9 kB (1,84 MB) |  1208 x 1302   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **19** | `public/images/trophies/usa/openCup.png`                  | PNG RGBA |    1.816.143    | 1.773,6 kB (1,73 MB) |  1024 x 1536   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |
| **20** | `public/images/trophies/afc/championsAsia.png`            | PNG RGBA |    1.735.882    | 1.695,2 kB (1,66 MB) |  1254 x 1254   | `src/common/utils/league.ts` | Sob demanda (modal/lista de troféus) |

Logo abaixo do Top 20 está `public/Logo.png` (**1.354.266 bytes / 1,29 MB**, 1024x1024 px), requisitado na carga inicial como favicon (`index.html`) e fallback visual.

---

## 3. Uso no Frontend e Classificação de Assets

_(Classificação: CONFIRMADO POR CÓDIGO E DOM)_

### A. Dimensões de Exibição em Tela

1. **Troféus:**
   - Renderizados por `ElementsCardTitles.Images` (`src/components/Cards/ElementsCardTitles/index.tsx`).
   - CSS (`ElementsCardTitles.module.css`): `.img { width: 100px; height: 100px; object-fit: contain; }` em container de 120x120 px.
2. **Logo da Aplicação (`public/Logo.png`):**
   - Favicon (`index.html`): 16x16 px a 48x48 px.
   - Fallback de escudo de clubes (`CareersGrid` e `SeasonHeader`): 40x40 px a 50x50 px.
3. **Bola de Ouro (`public/bolaDeOuro.jpeg`):**
   - `src/layout/SectionView/features/PlayerTabs/SeasonsPlayerTab/components/TrophyList.tsx`: 100x100 px úteis.
4. **Logos de Ligas (`public/images/leagues/`):**
   - Tabelas de estatísticas: 15px a 25px de altura.

### B. Caracterização dos Assets de Troféus do México

_(Classificação: CONFIRMADO POR REQUISITO / USO FUTURO CONHECIDO)_

Os 2 arquivos abaixo **NÃO são órfãos descartáveis**:

- `public/images/trophies/mexico/copaMexico.png` (1.368,0 kB)
- `public/images/trophies/mexico/ligaMexico.png` (832,6 kB)

Eles constituem **assets preparados para uso futuro conhecido**, a serem integrados pelo usuário na tabela de mapeamento de ligas e copas do México (`src/common/utils/league.ts`).
**Devem ser rigorosamente preservados sem qualquer alteração ou deleção.**

---

## 4. Comportamento em Runtime

_(Classificação: CONFIRMADO POR RUNTIME — Emulators locais via `tests/performance/stage-7f-assets-runtime.mjs`)_

- **Carga Inicial (Welcome/Login):** Requisita `Logo.png` (1,29 MB).
- **Navegação (CareersPage e Season):** Reutiliza `Logo.png` diretamente via cache do navegador (0 bytes adicionais de rede).
- **Modal de Troféus:** Requisita apenas os troféus conquistados na carreira selecionada (no benchmark de 2 troféus: 3,06 MB).
- **Reabertura e Reuso:** Uma vez baixadas pelo navegador, as imagens são reutilizadas via cache de memória / disco da sessão (`0 novos requests`).

---

## 5. Conclusão da Etapa 7F

Conforme determinação explícita do usuário:

- **Nenhuma alteração, conversão ou compressão de assets foi ou será executada.**
- O peso e resolução originais são **requisitos mantidos e aceitos** para preservar integralmente a fidelidade visual e facilidade de manutenção futura.
- A Etapa 7F encerra-se com o inventário e caracterização completos, servindo como documentação informativa.
