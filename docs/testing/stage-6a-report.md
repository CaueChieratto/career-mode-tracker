# Etapa 6A — correções funcionais localizadas

Concluída em 23/09/2026. Corrigidos **B01, B03, B04, B06, B11, B14 e B20**. Resultado conjunto: **212 testes aprovados, 18 `todo`, 20 arquivos**, sem falhas ou erros não tratados. A etapa 6B não foi iniciada.

## Escopo e método

Cada bug foi reproduzido com o teste existente antes da alteração, recebeu um patch localizado e teve sua regressão `todo` convertida em teste executável. Foram executados os testes específicos e os módulos correspondentes antes de corrigir o bug seguinte. B11 tinha dois `todo`, um unitário e outro de integração: ambos foram ativados. Os sete bugs representam **oito `todo` resolvidos**.

O diretório já continha alterações de etapas anteriores e do usuário. O diff desta etapa foi calculado contra a cópia de entrada de 938 arquivos de `src`, acompanhada de hashes SHA-256, em `.test-tools/stage-6a/before`. Não foi calculado contra HEAD, que incluiria trabalho anterior. Nenhuma alteração anterior foi revertida. Nenhuma dependência foi instalada ou atualizada.

Permanecem sem correção **B02, B05, B07, B08, B09, B10, B12, B13, B15, B16, B17, B18 e B19**, incluindo seus testes de reprodução e `todo`. Não houve migrations, mudanças de atomicidade, concorrência, exclusões complexas, arquitetura ou otimização.

## B01 — premiação duplicada

**Comportamento anterior:** `ballonDor: 1` na primeira ocorrência era agregado como `2`.

**Causa:** o spread do primeiro jogador já copiava a premiação; a acumulação subsequente a somava novamente.

**Alteração:** inicialização exclusiva do acumulador `ballonDor` em zero. Demais campos, médias e identidade dos jogadores permanecem com a lógica anterior.

**Teste de regressão:** [statistics.test.ts](../../src/test/statistics.test.ts), cobrindo zero, uma premiação, temporadas com `[1, 2]`, temporadas sem premiação, repetição da agregação e agregação do resultado. Entradas congeladas.

**Arquivo de produção:** [mergeMatchStats](../../src/layout/SectionView/helpers/mergeMatchStats/index.ts).

**Validação:** reprodução anterior aprovada; após o patch, **5 testes específicos aprovados** e módulo com **23 aprovados / 1 `todo`**. B02 permanece pendente.

## B03 — data inválida

**Comportamento anterior:** `99/99` era aceito.

**Causa:** o validador verificava apenas se dia e mês eram numéricos, sem validar o calendário.

**Alteração:** validação pelo `parseBrasilDate` existente, com verificação do formato de dia/mês. O formulário trabalha com DD/MM: na edição remove o ano persistido e, quando um mês está selecionado, completa o dia antes de chamar o validador. Entradas curtas legítimas como `1/8` continuam aceitas. Como o validador não recebe ano, usa 2000 como referência bissexta para permitir `29/02`; não introduz uma regra dependente do ano corrente.

**Teste de regressão:** [results.test.ts](../../src/test/results.test.ts): `99/99`, dia/mês zero ou fora do intervalo, `31/04`, `30/02`, formato incompleto, texto, dia fracionário, vazio obrigatório e datas válidas, incluindo `29/02`.

**Arquivo de produção:** [validateMatchForm](../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/validators/validateMatchForm/index.ts).

**Validação:** reprodução anterior aprovada; **16 testes específicos** e **38 testes do módulo** aprovados. A atribuição do ano pela temporada não foi alterada.

## B04 — mutação no retorno de jogador recebido

**Comportamento anterior:** retornar um jogador recebido por empréstimo alterava o contrato fornecido pelo chamador.

**Causa:** a cópia da lista de contratos continuava compartilhando o último objeto, que recebia `dataExit` e `leftClub`.

**Alteração:** substituição desse contrato por uma cópia com os mesmos valores de saída esperados.

**Teste de regressão:** [contracts.test.ts](../../src/test/contracts.test.ts), comparando toda a entrada congelada com o snapshot anterior. Confirma data de retorno, destino de origem e fallback sem origem, além do retorno no fim da temporada.

**Arquivo de produção:** [contractHelpers](../../src/common/services/ServicePlayers/helpers/contractHelpers/index.ts).

**Validação:** reprodução anterior aprovada; **2 testes específicos** e **13 testes do módulo** aprovados.

## B06 — mutação no transporte de temporada

**Comportamento anterior:** o retorno de um cedido acrescentava contratos à lista da temporada anterior em memória.

**Causa:** o spread do jogador preservava a referência ao array `contract`, utilizado nos dois `push` do retorno.

**Alteração:** cópia desse array exclusivamente no ramo de retorno. O jogador transportado continua recebendo os mesmos três contratos e `loan: false`.

**Teste de regressão:** [seasons.test.ts unitário](../../src/test/seasons.test.ts) compara toda a carreira congelada antes/depois e repete o transporte para verificar que não acumula contratos. O [teste de integração](../../tests/integration/seasons.test.ts) relê o documento original do servidor e confirma seu contrato único.

**Arquivo de produção:** [ServiceSeasons](../../src/common/services/ServiceSeasons/index.ts).

**Validação:** reprodução anterior aprovada; **2 específicos**, módulo unitário **10 aprovados / 2 `todo`**, integração **9 aprovados / 2 `todo`**. A correção é de memória; não houve migration nem escrita adicional em temporadas antigas. As demais limitações já catalogadas do serviço continuam pendentes.

## B11 — falso sucesso após falha

**Comportamento anterior:** o serviço falhava, o hook exibia erro, mas `savedLineupRef` avançava e `onSaved` era chamado.

**Causa:** o hook interno capturava a exceção e retornava sem distinguir falha de sucesso.

**Alteração:** `useSaveLineup` comunica sucesso/falha por booleano, mantendo o tratamento de erro existente. `useLineupPersistence` só atualiza a referência e chama `onSaved` após sucesso confirmado. Ausência dos IDs necessários também não produz sucesso. Não foi alterada a ordem de gravação do serviço.

**Testes de regressão:** [persistence.test.tsx](../../src/test/persistence.test.tsx) e [feedback.test.tsx](../../tests/integration/feedback.test.tsx). Cobrem primeira gravação e escalação previamente salva, preservação do rascunho, ausência de callback em falha e sucesso da tentativa seguinte. O teste com `useMatchTabAction` verifica que o carregamento termina e nenhuma tela de sucesso é aberta. A integração relê o estado anterior e o resultado da nova tentativa no servidor.

**Arquivos de produção:** [useSaveLineup](../../src/pages/Match/components/LineupTab/hooks/useSaveLineup/index.ts), [useLineupPersistence](../../src/pages/Match/components/LineupTab/hooks/useLineupPersistence/index.ts).

**Validação:** reproduções unitária e de integração anteriores aprovadas; **2 específicos unitários**, **4 testes do módulo unitário**, **2 específicos de integração**, módulos feedback/lineup com **9 aprovados / 1 `todo`**. O `todo` restante é B16; não houve correção de atomicidade.

## B14 — remoção persistente dos pênaltis

**Comportamento anterior:** retirar os campos do objeto local e gravar com merge mantinha `homePenScore` e `awayPenScore` antigos no Firestore.

**Causa:** omissão de propriedade em merge não significa exclusão.

**Alteração:** `updateMatchInSeason` aceita uma indicação explícita de remoção e envia `deleteField()` para ambos os campos. O formulário de detalhes fornece essa indicação quando pênaltis estão desmarcados. Os outros chamadores conservam o comportamento de merge; ausência incidental de um campo numa edição genérica não apaga pênaltis.

**Testes de regressão:** [matches.test.ts](../../tests/integration/matches.test.ts) grava 4×3, confirma a presença dos campos, remove e relê com `getDocFromServer`, exigindo ausência de ambos. Também verifica preservação de metadados, edição genérica e placar zero. [results.test.tsx](../../tests/integration/results.test.tsx) executa o fluxo real do hook ao desmarcar pênaltis e relê o servidor.

**Arquivos de produção:** [ServiceMatches](../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches/index.ts), [useAddDetails](../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/useAddDetails.ts).

**Validação:** reprodução anterior aprovada no Emulator; **3 específicos**, módulos de integração **21 aprovados / 3 `todo`**, módulo unitário de resultados **38 aprovados**. B05, B18 e B19 continuam pendentes.

## B20 — opcionais indefinidos na promoção

**Comportamento anterior:** apelido ausente ou status/resultado ausentes no histórico geravam propriedades `undefined`. O SDK rejeitava o profissional depois de a base já ter sido marcada como promovida.

**Causa:** atribuição incondicional desses campos na construção do payload. `userGoals` e `opponentGoals`, cujo tipo também admite `undefined`, apresentavam a mesma forma de construção.

**Alteração:** omissão de `academyNickname` quando ausente e remoção exclusivamente das propriedades indefinidas `status`, `result`, `userGoals` e `opponentGoals` do novo objeto de partida do histórico. Não se atribuem zero, texto vazio ou status fictício para representar ausência. Zeros e textos vazios existentes continuam preservados.

**Testes de regressão:** [academy.test.ts unitário](../../src/test/academy.test.ts) verifica ausência de `undefined` em todo o payload, preservação da data como `Date` e imutabilidade da fonte. [academy.test.ts de integração](../../tests/integration/academy.test.ts) cobre campos preenchidos, falta de apelido, falta de status/resultado, ausência conjunta dos campos opcionais de placar e apelido, além de apelido vazio. Confirma a existência do profissional, seu histórico, valores preenchidos e ausência dos campos não informados por releitura do servidor.

**Arquivos de produção:** [buildPromotedPlayer](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPromotedPlayer/index.ts), [buildPlayerAcademyTournaments](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPlayerAcademyTournaments/index.ts).

**Validação:** as duas reproduções anteriores foram confirmadas; **1 específico unitário**, **5 específicos de integração**, módulo unitário **7 aprovados / 1 `todo`** e integração **13 aprovados / 2 `todo`**. B10 e B17 permanecem reproduzíveis: falhas em outras etapas ainda podem deixar promoção parcial, e a concorrência não foi resolvida.

## Diff de produção desta etapa

| Arquivo | Adicionadas | Removidas |
|---|---:|---:|
| `src/layout/SectionView/helpers/mergeMatchStats/index.ts` | 1 | 0 |
| `src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/validators/validateMatchForm/index.ts` | 4 | 5 |
| `src/common/services/ServicePlayers/helpers/contractHelpers/index.ts` | 5 | 2 |
| `src/common/services/ServiceSeasons/index.ts` | 1 | 0 |
| `src/pages/Match/components/LineupTab/hooks/useSaveLineup/index.ts` | 3 | 1 |
| `src/pages/Match/components/LineupTab/hooks/useLineupPersistence/index.ts` | 2 | 1 |
| `src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches/index.ts` | 9 | 1 |
| `src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/useAddDetails.ts` | 1 | 0 |
| `src/pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPromotedPlayer/index.ts` | 1 | 1 |
| `src/pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPlayerAcademyTournaments/index.ts` | 5 | 1 |
| **Total: 10 arquivos** | **32** | **12** |

São **44 linhas adicionadas/removidas**, sem contar contexto do diff, testes ou documentação. O [patch isolado](stage-6a-production.patch) permite revisar somente estas correções, independentemente das alterações preexistentes.

Na infraestrutura de testes, `run-emulators.mjs` e `run-vitest.mjs` passaram a encaminhar filtros de arquivo e `-t`. O runner aceita apenas caminhos de testes de integração e o filtro de nome; mantém projeto, hosts, configuração e bloqueio de rede externos. Isso permitiu executar os testes específicos de cada bug sem substituir o isolamento existente.

## Testes, pendências e cobertura

| Medida | Antes | Depois |
|---|---:|---:|
| Unitários aprovados | 116 | 139 |
| Integração aprovada | 67 | 73 |
| Total aprovado | **183** | **212** |
| `todo` unitários | 11 | 6 |
| `todo` integração | 15 | 12 |
| Total `todo` | **26** | **18** |
| Arquivos de teste | 20 | 20 |
| Lines / Statements | 5,82% — 2.756/47.293 | **6,00% — 2.838/47.283** |
| Functions | 8,76% — 69/787 | **9,02% — 71/787** |
| Branches | 38,04% — 493/1.296 | **39,10% — 517/1.322** |

Conversões de `todo`: B01, B03, B04 e B06 (um cada), B11 (dois), B14 e B20 (um cada). Os demais 18 continuam presentes. O aumento de 29 testes aprovados inclui essas oito conversões e novos cenários parametrizados; não representa 29 bugs corrigidos.

Cobertura conjunta V8 de `src`, excluindo testes e declarações: [resumo](../../coverage/coverage-summary.json), [HTML](../../coverage/index.html). O denominador muda com fontes alteradas e arquivos/ramos efetivamente instrumentados. A cobertura global continua baixa e não demonstra ausência de problemas no restante da aplicação.

## Validação final

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Aprovado |
| `npm run typecheck:tests` | Aprovado |
| `npm run lint` | Aprovado, sem autofix |
| `npm run test:run` | 139 aprovados / 6 `todo` |
| `npm run test:integration` | 73 aprovados / 12 `todo` |
| `npm run test:coverage:all` | 212 aprovados / 18 `todo`; cobertura gerada |
| `npm run build -- --config .test-tools/stage-6a/vite.build.config.mjs` | Aprovado; `tsc -b` e Vite |
| `git diff --check` | Aprovado |

O build executou o script solicitado com um argumento de isolamento: a configuração temporária importa a configuração original, aponta `envDir` para o próprio arquivo, restringe `envPrefix` a `TEST_ONLY_` e define identificadores Firebase fictícios. Isso evita carregar `.env.local`. A configuração original, os plugins e as opções de otimização não foram modificados. Esse artefato é de validação, não de publicação. A validação não certifica variáveis de produção.

Permanece o aviso conhecido do Vite sobre chunk acima de 500 kB. Nenhuma otimização foi aplicada. Logs finais locais estão em `.test-tools/stage-6a/*-final.log` e `lint.log`; o [registro de validação](stage-6a-validation.json) preserva os contadores e a verificação de integridade.

## Firebase e dados

**Firebase real acessado: NÃO.** Todas as validações de persistência usaram SDK real com Auth/Firestore Emulators e fixtures sintéticas.

- Projeto: **`demo-career-tracker-integration`**.
- Firestore: **`127.0.0.1:8089`**.
- Auth: **`127.0.0.1:9098`**.
- Unitários: cliente mockado, projeto fictício `demo-career-tracker`, rede bloqueada.

O runner fixa projeto/hosts, remove credenciais externas do ambiente, exige emuladores disponíveis e carrega o bloqueio de conexões externas antes da CLI e dos testes. As configurações de teste não carregam `.env.local`. O aviso da CLI de que não conseguiu obter MOTD/configuração remota é compatível com esse bloqueio; não é uma falha de teste. Os emuladores foram encerrados pelos runners ao final. Não houve leitura ou alteração de dados reais nem migrations.

## Preservação da performance e limitações

**Baseline preservado: SIM. Alterações nos mecanismos dos três gargalos: NÃO.** Os 32 arquivos de documentação, medição e ferramentas de performance registrados no início permaneceram idênticos por SHA-256. O relatório histórico, os dados consolidados e a infraestrutura de medição da etapa 5 não foram regravados.

Os hashes dos outros 922 arquivos preexistentes de `src` permaneceram iguais; somente dez arquivos de produção e seis de testes mudaram. A revisão do patch confirma que não houve alteração em hidratação/N+1, `useCareers`, listeners, contexts, navegação/reload, cache, assets, flags ou divisão do bundle. Em `ServiceMatches`, a função de leitura permaneceu intacta; a mudança se limita à escrita explícita dos campos de pênaltis.

Não foram repetidos benchmarks nem medidas de navegador. Portanto, preservação dos artefatos e do código dos gargalos não é uma alegação de latência idêntica após o patch.

**Novas regressões introduzidas:** nenhuma observada nas verificações executadas. A investigação ampliou B20 para placares indefinidos do mesmo payload; não foi aberto um problema distinto nem corrigido outro bug. Os riscos de operações parciais, concorrência, exclusões, fontes divergentes e tabela já documentados continuam fora desta etapa. A etapa 6B permanece não iniciada.
