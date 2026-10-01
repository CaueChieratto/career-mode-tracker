# Baseline de navegador — etapa 5

Ferramentas e transformações de build exclusivas de medição. Nenhum arquivo de `src` é alterado. O bundle original é inventariado, mas **não é servido ao navegador**: somente cópias conectadas explicitamente aos emuladores do projeto `demo-career-tracker-integration` são executadas.

## Reproduzir

No diretório raiz, PowerShell, Node 24:

```powershell
npm ci --prefix tests/emulator-tools
npm ci --prefix tests/performance-tools
npm run test:emulators:prepare
node tests/performance/build.mjs
node tests/performance/run.mjs
```

O Chrome instalado é usado por padrão. Para fixar outro executável compatível:

```powershell
$env:PERF_CHROME = 'C:/caminho/para/chrome.exe'
```

Conservar a versão registrada em `docs/performance/measurements.json` nas comparações. Playwright e web-vitals têm versões fixas no pacote e lockfile isolados. Portas necessárias: Firestore 8089, Auth 9098, hub 4409, logging 4509, servidores de navegação 4179 e profiling 4180. O processo encerra os emuladores ao terminar. Não executar testes de integração, builds ou outras cargas de CPU durante a medição.

## Amostragem e isolamento

- Três perfis determinísticos; manifesto e SHA-256 gerados em `.test-tools/performance/fixtures.json`.
- Pequeno/médio: cinco repetições de navegação por condição, precedidas de aquecimento excluído. Três repetições no build React profiling para pequeno/médio, também com aquecimento excluído. Grande: saturação caracterizada pelos checkpoints, com parada após dois cold independentes censurados; excedente anterior preservado. Não repetir seu login no profiling.
- `cold-session`: contexto novo, sem cache HTTP/Auth anterior. As rotas após o login já podem reutilizar assets carregados na entrada.
- `warm-session`: mesma sequência no mesmo contexto após logout e limpeza de preferências; cache HTTP preservado. Não significa que `getDocs` passe a evitar o servidor.
- Não usar `page.route`: isso desabilitaria o cache HTTP do Playwright. A proteção é feita por CSP restritiva, proxy sem saída e resolução DNS externa bloqueada no Chrome. As conexões permitidas são somente aos servidores locais e aos dois emuladores. A fonte Google é bloqueada e a fonte de fallback passa a compor este baseline.
- A CLI e seus filhos usam `network-guard.cjs`; nenhuma credencial real é necessária. Os builds de teste ignoram `.env` de produção e recebem token externo fictício. `VITE_SPECIAL_USER_ID` fica ausente.
- Fixtures usam partidas finalizadas e estatísticas em subcoleções, ligas/troféus locais, elencos, tabela, base e um grupo. Não há upload.

## Instrumentação

- `build.mjs`: inventário do bundle original, cópia de navegação com marcadores, cópia React profiling. As transformações apenas envolvem componentes, chamadas de leitura/listener e timers selecionados.
- `sdk-adapter.js`: consulta lógica, documentos entregues ao código, abertura/fechamento/callback de listener; delega ao SDK real. Documentos entregues **não são leituras faturadas**. O SDK pode compartilhar conexões e resultados entre listeners.
- `browser-init.js`: relógio monotônico com `timeOrigin`, cliques, mudanças de URL, DOM, spinner, timers, long tasks, recursos e commits. Observação de conteúdo no DOM é aproximação, não prova exata do primeiro pixel.
- `browser.mjs`: browser móvel 390×844, DPR 1, locale pt-BR; web-vitals oficial e métricas CDP. Sem throttling de CPU/rede.
- `journeys.mjs`: cliques reais; conteúdo utilizável confirmado por seletores de destino e dois frames. Os 400 ms de estabilização servem para encerrar a coleta e não são somados ao tempo utilizável. Entrada → Login exige três gestos de arraste; seu tempo inclui o ritmo do script e não deve ser interpretado como latência de uma ação única.
- `advanced.mjs`: ciclos SPA, atualização isolada de `updatedAt`, abertura direta de grupo; usa profiling.
- `compare.mjs`: seleção efetiva de dois jogadores no comparador.
- `action.mjs`: salva somente uma partida sintética e remove essa escrita entre amostras; mede a busca anterior ao loading.
- `summarize.mjs`: tabelas de amostras, percentis interpolados, bundle, assets e inventário de eventos em `docs/performance/measurements.json`. p95 omitido abaixo de 20 amostras.

Eventos completos, builds, screenshots e manifests locais ficam em `.test-tools/performance` (ignorados pelo Git). O JSON consolidado e o relatório Markdown são os artefatos versionáveis. Não somar durações de Profiler pai/filho: elas se sobrepõem. A versão profiling tem custo adicional e não compõe as medianas normais de navegação.

Para investigar uma parte, mantendo os emuladores e servidores vivos:

```powershell
node tests/performance/run.mjs --hold
# Em outro terminal:
$env:PERF_PROFILE = 'large'
$env:PERF_TRIALS = '1'
node tests/performance/measure.mjs
```

O modo de investigação não substitui a série completa nem deve ser misturado silenciosamente com ela. `pilot.mjs` e `inspect.mjs` são auxiliares de diagnóstico, excluídos do consolidado.

## Retomada e nova comparação

O runner preserva cadeias concluídas/censuradas já existentes e grava um checkpoint por jornada. Um build diferente é recusado se os resultados antigos ainda estiverem no diretório `raw`: arquive primeiro `.test-tools/performance/raw` e `docs/performance`, conservando o “antes”. Execute os comandos novamente em diretórios vazios para uma série nova. Não misture amostras de builds diferentes.

Na retomada de 23/09, as 12 cadeias pequenas e o aquecimento cold médio foram preservados. O processo/navegador anterior não existia mais; por isso não era possível recuperar a sessão warm interrompida. A primeira repetição cold posterior prepara o cache da respectiva repetição warm. Foi adicionado limite de observação de 30 s: amostras censuradas têm tempo final ausente, contadores parciais e motivo explícito. Fluxos dependentes de uma origem não carregada são identificados como não alcançados.

O cálculo do documento atual na função de estabilização do coletor passou a ocorrer uma vez por varredura, fora do predicado do filtro. Isso remove custo quadrático do próprio coletor, sem mudar aplicativo, consultas ou critério de conteúdo utilizável; a alteração e a interrupção entre dias devem ser consideradas ao comparar tempos entre perfis. Nenhuma série pequena foi descartada para esconder essa diferença.

O perfil grande atingiu o limite no login; os diagnósticos focados de seleção no comparador, tracing e salvamento usam o perfil médio, que alcança essas telas. O perfil grande conserva suas séries censuradas e contadores parciais, sem extrapolar resultados do médio. `run-all.mjs` explicita essa seleção para reproduzir a coleta.

## Relatório e validação

Com os resultados brutos preservados, consolidar sem repetir o navegador:

```powershell
node tests/performance/summarize.mjs
node tests/performance/report.mjs
```

Depois de encerrar os servidores/emuladores de performance:

```powershell
node tests/performance/validate.mjs
node tests/performance/report.mjs
```

O validador executa TypeScript da aplicação e testes, ESLint, unitários, integração Auth/Firestore, coverage conjunta, build, sintaxe dos instrumentos, comparação SHA-256 de `src` e `git diff --check`. Persiste códigos de saída e horários em `docs/performance/validation.json`, com logs locais em `.test-tools/performance/validation`. Não executa autofix. O comando de integração já inclui o Firebase Emulator; `test:firebase` é um alias desse mesmo runner.
