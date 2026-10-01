# Etapa 6E — estatísticas raw e precedência de fontes

Concluída em 24/09/2026. **B02: CORRIGIDO. B05: CORRIGIDO.** Resultado: **337 testes aprovados, 3 `todo`, 26 arquivos**, além de 15 testes nativos do guard. As oito validações finais passaram. **Nenhuma nova regressão funcional observada.**

Escopo exclusivo: **B02 e B05**. B12 continua **BLOQUEADO**, B15 continua **BLOQUEADO** e B16 continua **PENDENTE**. Nenhuma migration, alteração de dependências ou etapa de performance foi iniciada.

## Checkpoint e ordem de execução

O ponto de partida foi a etapa 6D2 concluída: **310 testes aprovados, 6 `todo`, 23 arquivos**. O snapshot anterior à 6E, em `.test-tools/stage-6e/before.json`, preserva hashes e conteúdo de 1.002 arquivos. O diff desta etapa usa esse snapshot, pois o working tree contém mudanças acumuladas das etapas anteriores, inclusive testes ainda não rastreados pelo Git.

B02 foi reproduzido no Emulator antes de qualquer patch de produção: 5 falhas e 1 aprovação nos seis cenários iniciais. Depois do patch passaram 29 unitários direcionados e 7 cenários de integração. Somente então começou B05.

Na retomada, `git status`, `git diff --stat` e o conteúdo integral de `sources-overlap.test.ts` foram conferidos: arquivo completo, fixtures e blocos fechados. A implementação B02 foi preservada. O registro da ferramenta atribuiu a interrupção à impossibilidade de concluir o auto-review por limite de uso; a tentativa não executou. Na retomada, o comando direto foi autorizado, sem contornar a revisão.

Antes do patch B05, o teste ampliado executou **10 casos: 4 passaram e 6 falharam**. Depois do patch, os mesmos 10 passaram. Em seguida foram adicionados o cenário combinado e a autoridade de valores modernos vazios/zero; **12 casos passaram**. A cobertura de múltiplas temporadas também confirma identidade estável após mudança de nome.

## B02 — causa e identidade dos campos

`augmentSeasonWithMatchStats` guarda a base manual em `manualStatsLeagues` e substitui `statsLeagues` pelo total manual + partidas finalizadas. Antes, `toRawPlayer` apagava `manualStatsLeagues` e `_isAugmented`, mas conservava esse total em `statsLeagues`. Uma nova agregação tratava o total anterior como base e somava as mesmas partidas novamente.

| Representação | Significado verificado no código e nos testes |
|---|---|
| `Players.statsLeagues` da ficha persistida por temporada | Base manual usada pelo formulário e por `PlayersStatsService.updatePlayerStatsLeagues` |
| `manualStatsLeagues` após augmentation | Snapshot em memória da base anterior ao cálculo; não representa um segundo conjunto de eventos |
| `statsLeagues` após augmentation | Total para exibição: manual + `playerStats` de partidas finalizadas |
| `_isAugmented` | Marcador em memória que evita processar novamente o mesmo objeto já calculado |
| `ratingSum` | Acumulador de cálculo; não é nova fonte manual |
| `career.clubData[].players/matches` persistidos | Fonte legada embutida; pode coexistir com subcoleções, conforme B05 |

`getAggregatedPlayersForCareer` reduz fichas de temporadas para exibição da carreira. `aggregatePlayerStats` reduz históricos de jogadores para exibição do grupo. Os dois recebem os totais das temporadas e não persistem dados. A persistência exercitada pelo teste é a **ficha raw de cada temporada**, usando o serviço real `updatePlayerStatsLeagues`; não grava o total de várias temporadas dentro de uma única temporada.

### Reprodução real e resultado

O teste percorre: gravar ficha manual e partidas → `getCareerById` → augmentation/agregação → `toRawPlayer` → `ServicePlayers.updatePlayerStatsLeagues` → `getDocFromServer` e nova leitura pelo serviço → nova agregação.

| Caso | Antes | Depois |
|---|---|---|
| Manual 2 jogos/3 gols + uma partida de 2 gols | 3 jogos/5 gols; ao gravar/reler, 4 jogos/7 gols | Raw permanece 2/3; total permanece 3/5 |
| Somente uma partida de 2 gols | Após gravar/reler, 4 gols | 2 gols; raw manual vazio |
| Apenas manual e zeros legítimos | Payload recebia campos calculados adicionais | Payload manual preservado |
| Duas temporadas: bases 3 e 4 gols, mais 2 gols de partida em cada | Base persistida recebia o total derivado | Bases 3 e 4 preservadas; agregadores mantêm 6 jogos/11 gols |

A correção restaura `manualStatsLeagues ?? statsLeagues ?? []` antes de retirar os marcadores. A augmentation registra `[]` quando a ficha antiga não contém o campo manual. Dados manuais, zeros e ausência de partidas continuam válidos; não há subtração heurística nem zeragem indiscriminada.

Os dois consumidores de `toRawPlayer` agora convertem a ficha antes de aplicar uma edição manual explícita. Isso impede que o snapshot anterior substitua o novo formulário ou restaure uma liga recém-excluída. Os testes de interface cobrem edição, array vazio, campo omitido e exclusão; são testes do callback otimista, com dependências de apresentação/persistência simuladas. O teste de integração usa o SDK e serviço reais no Emulator.

Cobertura B02: sete cenários de integração, três ciclos consecutivos, sem estatísticas, campo ausente no legado, sem partidas, somente manual, somente partidas, formato misto, zeros, múltiplas temporadas e payload relido diretamente do servidor. Os testes anteriores de imutabilidade e referências foram preservados.

Não há recuperação automática de valores históricos já contaminados e sem snapshot manual confiável. Não é possível inferir com segurança quanto de um total antigo foi digitado manualmente. Nenhuma carreira existente foi migrada ou regravada em massa.

## B05 — fontes, reprodução e regra final

O contrato existente de `getCareerById`, já coberto por unitários, era a referência: **moderno autoritativo para o mesmo ID; legado como fallback para IDs ausentes na fonte moderna**.

Antes da correção:

- `getAllCareers` descartava todo o array legado quando encontrava qualquer item moderno; perdia jogadores e partidas exclusivos do legado.
- `PlayersGroupService` fazia o inverso: se havia qualquer item embutido, não consultava a coleção moderna correspondente; retornava estatísticas, status e contratos antigos.
- A leitura de partidas do grupo não usava a precedência existente de `playerStats` hidratados.
- A agregação da carreira e a construção dos históricos do grupo usavam nome/nacionalidade como chave e juntavam homônimos com IDs diferentes.

A reprodução mostrou perda de `legacy-only`, contratos/status desatualizados, um homônimo recebendo a soma de **11 gols** de duas pessoas distintas e **18 gols no grupo contra 5 no detalhe** em duas temporadas.

### Precedência aplicada

| Situação | Resultado |
|---|---|
| Mesmo ID nas duas fontes | Uma versão: a moderna completa, sem soma ou merge de campos antigos |
| ID somente no legado | Item preservado como fallback |
| ID somente na subcoleção | Item moderno preservado |
| Moderno com `[]`, `false` ou `0` | Valor moderno continua autoritativo; não ressuscita valor legado |
| Mesmo nome, IDs diferentes | Pessoas distintas, preservadas nos arrays e agregadores |
| Mesmo ID em temporadas diferentes | Histórico da mesma pessoa; agrega cada temporada uma vez, mesmo após mudança de nome |
| Mesmo `matchesId` nas duas fontes | Partida moderna prevalece; partidas exclusivamente legadas permanecem |
| `playerStats` embutidos e subcoleção da partida moderna | Reutiliza `ServiceMatches.getMatchesBySeason`, cuja regra existente prioriza a estatística moderna por ID e preserva exclusivos embutidos |

Não existia função compartilhada de merge; a lógica estava inline no detalhe. Ela foi extraída sem mudança de comportamento para `mergeModernAndLegacy`, helper puro de nove linhas, sem imports. Lista, detalhe e grupo passam a usar a mesma regra. O grupo conserva sua consulta por `groupId`, corte por data e iteração de temporadas; reutiliza somente a leitura de partidas já existente. Não foi importado `Getters` ou `PlayersCrudService` dentro do grupo, evitando novo ciclo entre esses serviços.

Os testes comparam IDs, quantidade, jogos/gols e demais campos estatísticos, venda/empréstimo, salário, duração e dados de contrato. Datas Timestamp/Date são normalizadas apenas na comparação semântica. A regra preexistente de máximo overall no histórico do grupo foi mantida; não foi imposta igualdade artificial a projeções legítimas de histórico.

Cobertura ampliada: somente legado, somente moderno, representações idênticas, divergentes, exclusivos de ambas as fontes, campos modernos vazios, homônimos, múltiplas temporadas e partidas hidratadas. Exercita `getAllCareers`, `getCareerById`, `getAggregatedPlayersForCareer`, `getAggregatedGroupStats`, `getGroupSeasonsData` e `getPastGroupPlayers`.

## Interação B02 + B05 e preservação de B13

O cenário combinado mantém jogadores legados e modernos com nomes iguais e IDs distintos, uma ficha sobreposta, partidas sobrepostas e `playerStats` modernos. A base escolhida é **2 jogos/3 gols**; as duas partidas válidas acrescentam **2 jogos/3 gols**. O resultado permanece em **4 jogos/6 gols** durante três ciclos de agregação → conversão raw → gravação → releitura → nova agregação.

Lista, detalhe e grupo concordam. O payload persistido continua somente manual, o jogador exclusivo do legado permanece sem conversão para subcoleção e `clubData` embutido não muda. As representações legadas de 90 gols não entram na soma quando existe a versão moderna do mesmo ID.

As regressões anteriores de B13 passaram: unitários de `stripHeavyData` e snapshot original; criação, exclusão de outra temporada e metadados nos formatos moderno vazio, somente embutido, subcoleção e misto; falha de hidratação na exclusão. `stripHeavyData`, `ServiceSeasons` e as rotinas de exclusão não foram alterados nesta etapa.

## Arquivos e diff isolado

O [diff de produção](stage-6e-production.patch) contém **seis arquivos, +53/−64 linhas**, comparados ao início da 6E:

| Arquivo de produção | Mudança | + / − |
|---|---|---|
| `src/layout/SectionView/helpers/mergeMatchStats/index.ts` | B02: raw manual; B05: identidade por ID | 4 / 4 |
| `src/layout/SectionView/features/ClubTabs/StatsTab_Club/views/AddSeason_Player/screens/AddSeason_PlayerScreen/index.tsx` | Preserva edição manual após conversão raw | 5 / 4 |
| `src/layout/SectionView/features/ClubTabs/StatsTab_Club/components/PlayerStatsList/components/PlayerStats/index.tsx` | Preserva exclusão manual após conversão raw | 4 / 6 |
| `src/common/helpers/Getters/index.ts` | Mesma precedência na lista e no detalhe | 12 / 21 |
| `src/common/helpers/mergeModernAndLegacy.ts` | Helper puro extraído do contrato do detalhe | 9 / 0 |
| `src/common/services/ServicePlayers/PlayersGroupService.ts` | Precedência por ID e fonte de partidas consistente | 19 / 29 |

Testes novos: `src/test/rawPlayerEditing.test.tsx`, `tests/integration/statistics-roundtrip.test.ts` e `tests/integration/sources-overlap.test.ts`. Testes atualizados: `src/test/statistics.test.ts`, `src/test/sources.test.ts` e `tests/integration/matches.test.ts`.

Foram ativados somente três `todo`: B02 em `statistics.test.ts`, B05 em `sources.test.ts` e B05 em `matches.test.ts`. As caracterizações antigas desses defeitos passaram a exigir o comportamento corrigido. Nenhum teste foi removido ou marcado `skip`; os três `todo` de B12/B15/B16 permanecem.

## Segurança e impacto incidental

**Firebase real acessado: NÃO.** Toda persistência ocorreu em fixtures sintéticas no projeto `demo-career-tracker-integration`, Firestore `127.0.0.1:8089` e Auth `127.0.0.1:9098`. `.env.local` de produção não foi carregado; UID protegido não foi enviado ao SDK; guards de ambiente e rede externa preservados. Os 15 testes nativos da barreira passaram, contabilizados separadamente.

O adaptador `tests/integration/firestoreBoundary.ts` foi ampliado para reconhecer consultas filtradas ordinárias exclusivamente em `users/emulator-fixture-[ab]/careers`. Antes confundia essas consultas com collection-group sem escopo. O guard continua sendo chamado antes do SDK, e as restrições de collection-group não foram removidas. Um teste adicional comprova rejeição de consulta global, caminho de usuário fora das fixtures e collection-group sem escopo. O arquivo do guard protegido e o preload de rede não mudaram.

Na revisão dos testes de interface, `React is not defined` foi corrigido apenas na construção dos elementos do teste, com `createElement`; o patch B02 de produção não foi refeito.

O grupo passa a consultar as fontes modernas mesmo quando existem arrays embutidos, condição necessária para determinar autoridade por ID. Por inspeção do código, são duas consultas de coleção por temporada, mais uma consulta de `playerStats` por partida moderna através do serviço existente. Isso pode **aumentar leituras** em dados legados/mistos; não é uma otimização. Lista e detalhe mantêm suas consultas/listeners anteriores. Os **32 artefatos de performance permaneceram idênticos por hash**; nenhuma bateria de performance foi executada. Não há promessa de latência ou custo idênticos após a correção.

## Validação final e contadores

| Contagem | Antes | Depois |
|---|---:|---:|
| Unitários aprovados | 155 | 162 |
| Integração aprovada | 155 | 175 |
| Total aprovado | 310 | 337 |
| `todo` unitários | 2 | 0 |
| `todo` integração | 4 | 3 |
| Total `todo` | 6 | 3 |
| Arquivos de teste | 23 | 26 |

São **27 aprovações adicionais**: 24 casos novos e três regressões anteriormente `todo` ativadas. Os 15 testes nativos do guard não estão incluídos nesses totais. A execução direcionada confirmou 63 unitários dos fluxos alterados, 15 unitários de contratos, 59 integrações relacionadas, 12 casos finais de sobreposição/interação e 32 integrações adicionais de legado/exclusão; há sobreposição entre execuções, portanto esses números não são somados ao total da suíte.

Cobertura conjunta V8, com os mesmos critérios globais de inclusão/exclusão:

| Métrica | Antes da 6E | Depois da 6E |
|---|---:|---:|
| Linhas | 5,97% — 2.824/47.293 | 6,97% — 3.287/47.139 |
| Statements | 5,97% — 2.824/47.293 | 6,97% — 3.287/47.139 |
| Funções | 8,96% — 71/792 | 10,58% — 85/803 |
| Branches | 45,25% — 668/1.476 | 46,93% — 719/1.532 |

Os numeradores e denominadores são os valores efetivamente emitidos pelo V8; não foram alterados filtros para aumentar os percentuais. A execução com coverage confirmou novamente **337 aprovados e 3 `todo`**.

| Validação final | Resultado |
|---|---|
| `npm run typecheck` | Aprovada, exit 0 |
| `npm run typecheck:tests` | Aprovada, exit 0 |
| `npm run lint` | Aprovada, exit 0 |
| `npm run test:run` | 162 aprovados, exit 0 |
| `npm run test:integration` | 175 aprovados, 3 `todo`, exit 0 |
| `npm run test:coverage:all` | 337 aprovados, 3 `todo`, exit 0 |
| `npm run build -- --config .test-tools/stage-6e/vite.build.config.mjs` | Aprovada, exit 0 |
| `git diff --check` | Aprovada, exit 0 |

O build usa `envDir` apontando para o próprio arquivo regular de configuração e defines sintéticos/demo, sem carregar `.env.local`. Produziu JS de 5.223,22 kB (gzip 1.681,50 kB) e CSS de 143,23 kB (gzip 28,10 kB); permanece o aviso preexistente de chunk grande. Não foi feita otimização de bundle. O Git usou `safe.directory` explícito; avisos de conversão LF/CRLF não são erros do diff. Os arquivos novos e alterados da etapa também passaram por checagem de whitespace, incluindo os ainda não rastreados.

O [registro verificável da etapa](stage-6e-validation.json) contém contagens, cobertura, escopo, hashes e evidências. O [relatório principal](implementation-report.md) foi atualizado. B12 e B15 continuam **BLOQUEADOS**; B16 continua **PENDENTE**. Nenhuma nova etapa foi iniciada. **Firebase real acessado: NÃO.**
