# Relatório de implementação — etapas 4, 5, 6A, 6B1, 6B2, 6C, 6D1, 6D2, 6E, 6F1, 6F2, 6F3, 6G e 6H

Estado atual em 25/09/2026: **Etapa 6H concluída com resolução e normalização de B12 via Cloud Function com deleção recursiva**. Todos os 20 bugs (B01 a B20) encontram-se 100% corrigidos e validados. Foram validados **376 testes aprovados** (164 unitários + 212 de integração no Emulator), **0 `todo` e 0 `skip`**. Falha do backend é propagada; nenhuma exclusão parcial client-side é tentada. Firebase real NUNCA foi acessado; barreira de rede em modo estrito fail-closed e guard de UID protegidos ativos; baseline de performance da Etapa 5 preservado. Os relatórios específicos detalham cada etapa: [Etapa 6F3 (B16-B)](stage-6f3-report.md), [Etapa 6G (B15)](stage-6g-report.md) e [Etapa 6H (B12)](stage-6h-report.md).

O [relatório 6F1](stage-6f1-report.md) documenta a caracterização prévia de B16 em 25 testes em `lineup-characterization.test.ts`. O [registro verificável](stage-6f1-validation.json) conserva os resultados e hashes históricos.

O [relatório da etapa 6E](stage-6e-report.md) registra a reprodução de B02 no Emulator (5 gols viravam 7; somente partidas, 2 viravam 4), a restauração da base manual em `toRawPlayer` e a preservação das edições/exclusões. B05 foi reproduzido antes do patch com seis falhas: lista perdia exclusivos legados, grupo usava versões antigas e agregadores juntavam homônimos. A regra compartilhada é **moderno por ID, legado como fallback de IDs ausentes**. Lista, detalhe e grupo passaram nos casos de sobreposição, status/contratos, valores vazios, homônimos e múltiplas temporadas. O cenário combinado conservou 4 jogos/6 gols durante três ciclos de persistência e releitura, mantendo raw 2/3. O [registro verificável](stage-6e-validation.json) e o [diff isolado](stage-6e-production.patch) documentam seis arquivos de produção (+53/−64), testes 310 → 337 e `todo` 6 → 3. A consulta de fontes modernas no grupo pode aumentar leituras; isso foi documentado como efeito da consistência, sem otimização de performance. Nenhuma nova regressão funcional observada.

O [relatório da etapa 6D2](stage-6d2-report.md) documenta a promoção em uma transação com **três escritas**, confirmadas pela instrumentação, e a identidade por `academyData.id`. Falhas, retry, repetição sequencial, concorrência da mesma origem, homônimos e compatibilidade histórica foram validados em 36 cenários focados de integração. A inclusão concorrente de novos torneios fora do conjunto enumerado permanece um limite documentado. A retomada preservou integralmente produção e testes, validou a última edição pendente e concluiu os comandos antes bloqueados por quota do auto-review. O [registro verificável](stage-6d2-validation.json) e o [diff isolado](stage-6d2-production.patch) registram somente `AcademyService/index.ts` em produção (+73/−48), testes 286 → 310 e `todo` 9 → 6. As quedas de cobertura de linhas e funções estão explícitas; não houve nova regressão funcional observada.

O [relatório da etapa 6D1](stage-6d1-report.md) registra a criação atômica em um batch, propagação de erros na preparação e preservação de B13. Falhas antes do commit e rejeição real do servidor não deixam cópias parciais; retry usa a temporada anterior completa. Acima de 500 escritas a criação falha antes de gravar. Erro posterior ao commit pode deixar uma temporada completa, sem promessa de idempotência de negócio. B15 permanece reproduzido e com `todo`. O [registro verificável](stage-6d1-validation.json) e o [diff isolado](stage-6d1-production.patch) documentam dois arquivos de produção (+15/−7), testes 272 → 286 e `todo` 11 → 9.

O [relatório da etapa 6C](stage-6c-report.md) documenta recálculo das equipes afetadas e transação de partida/classificação/carreira, com 14 cenários B18 e 11 B19 no Emulator. Edição, exclusão, três saves iguais, concorrência com retry real e falhas antes/depois de commit foram validados. A remoção anterior de `playerStats` continua fora da transação; identidades históricas ambíguas retornam erro, sem fusão arbitrária. O [registro verificável](stage-6c-validation.json) e o [diff isolado](stage-6c-production.patch) registram quatro arquivos de produção (+89/−119). A queda da cobertura de linhas de 6,07% para 5,94% está explicitada; os outros bugs e a reconciliação de fontes legadas permanecem fora do escopo.

O [relatório da etapa 6B2](stage-6b2-report.md) registra 11 testes de integração B08 e 2 unitários B08, repetição/falhas, isolamento A1/A2/B1, a reprodução de descendentes sem pai e as alternativas para B12. A consulta de grupo foi negada pelas regras sintéticas; isso não demonstra as permissões de produção, cujas regras não estão no repositório. B12 mantém sua regressão completa `todo`: não foi apresentada uma exclusão parcial como completa. O [registro verificável](stage-6b2-validation.json) e o [diff de produção](stage-6b2-production.patch) isolam esta etapa. Somente `ServiceSeasons/index.ts` mudou em produção (+11/−12 linhas). A retomada respeitou o checkpoint e não repetiu a implementação B08.

O [relatório completo da etapa 6B1](stage-6b1-report.md) documenta a distinção entre ausência confirmada e erro de leitura de carreira, a preservação conservadora dos dados embutidos, os três `todo` ativados, o diff isolado e a validação final. O [registro verificável](stage-6b1-validation.json) guarda contadores e hashes.

O [relatório completo da etapa 6A](stage-6a-report.md) contém causas, patches, regressões, validação por bug, arquivos de produção, contadores antes/depois e limitações. As seções abaixo preservam o registro histórico das etapas 4 e 5; afirmações de ausência de correções nessas seções se referem àquelas etapas.

## Etapa 4 — services e falhas de integração (registro histórico)

Concluído em 22/09/2026. **67 testes de integração aprovados, 15 regressões `todo`, 9 arquivos novos de teste.** Os 116 testes unitários anteriores continuam aprovados. Coleta conjunta: **183 aprovados, 26 `todo`, 20 arquivos**, sem erros não tratados.

Somente a etapa 4 foi executada. Nenhum bug foi corrigido, nenhum código de produção foi modificado e nenhum teste acessou Firebase real. O [relatório das etapas 1–3](implementation-report-stages-1-3.md) foi preservado, assim como as [fixtures e contratos anteriores](contracts-and-scenarios.md).

## Infraestrutura e execução

- Reutilizados Vitest, V8, RTL/jsdom, factories e cenários existentes. Integração em `tests/integration`; serviços de produção sem mocks de persistência em memória.
- O SDK real executa operações contra **Firestore Emulator 1.19.8** e **Auth Emulator da Firebase CLI 14.12.0**. JRE Temurin 21 portátil foi preparado sem alterar a instalação Java do sistema.
- CLI e lockfile próprios em `tests/emulator-tools`, sem alterar dependências ou lockfile da aplicação. Não foram instalados Admin SDK, rules-unit-testing, MSW ou Playwright.
- Configurações: `firebase.test.json`, `vitest.integration.config.ts`, `vitest.all.config.ts`, regras de teste, cliente de integração, barreira de chamadas, preload de rede e runners.
- Scripts novos: `test:emulators:prepare`, `test:integration`, `test:firebase`, `test:integration:coverage`, `test:coverage:all`. `test:firebase` e `test:integration` usam o mesmo runner. Comandos anteriores permanecem disponíveis.

O [guia de integração](emulator-integration.md) contém comandos reproduzíveis, instalação, isolamento e limitações.

### Firebase real não foi acessado

Projeto fixo `demo-career-tracker-integration`; Firestore em `127.0.0.1:8089`, Auth em `127.0.0.1:9098`. Cliente com chave fictícia e persistência de Auth em memória, conectado aos emuladores antes de qualquer operação. O módulo Firebase da aplicação é substituído apenas na configuração dos testes.

`.env.local` não é carregado: os arquivos de configuração direcionam envDir para um arquivo regular, e não para o diretório da aplicação. O runner remove variáveis de credenciais e isola o diretório de configuração da CLI. Um preload anterior à CLI/Vitest/SDK bloqueia conexões externas e permite somente as portas locais declaradas.

Checagens negativas executadas: ambiente ausente → `EMULATOR_REQUIRED`; ambiente válido com emuladores desligados → `EMULATOR_UNAVAILABLE:8089`. Ambas abortam sem fallback. O aviso de MOTD da CLI é consequência do bloqueio da solicitação externa; não indica consulta bem-sucedida ao Firebase. O download preparatório do JAR oficial foi separado dos testes e verificado por SHA-256.

### Regras e autenticação

Não há Security Rules de produção no repositório. As regras adicionadas são **sintéticas e exclusivas da infraestrutura**. Verificam usuário A/B, caminhos separados, acesso cruzado negado, logout e troca de sessão. A carreira `denied` permite provocar uma negação pontual real.

Não há conclusão de que a autorização de produção esteja correta. Autenticação, rejeições e persistência foram validadas apenas contra essas regras de teste e os emuladores.

## Testes adicionados

Todos os arquivos abaixo ficam em `tests/integration`. Os 15 `todo` especificam resultados desejados; não representam correções concluídas.

| Arquivo           | Serviços/fluxos e cenários                                                                                                                                                                        | Aprovados |   Todo |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | -----: |
| deletion.test.ts  | deleteCareerFromFirestore, deleteSeason e deleteMatchFromSeason; documento-pai, temporadas, partidas/playerStats, jogadores, tabela, base, torneios, órfãos, repetição e falhas intermediárias    |         9 |      3 |
| seasons.test.ts   | addSeason; carreira vazia, transporte de IDs/idade, vendidos, cedidos/recebidos, contrato vencido, base ativa/promovida, falha parcial, repetição, concorrência e legado                          |         9 |      2 |
| matches.test.ts   | ServiceMatches CRUD, getMatchesBySeason, savePlayerStatToSubcollection e Getters; sem stats/embutidas/subcoleção/ambas divergentes, merge, pênaltis, updatedAt, listener e gravação fora de ordem |         9 |      2 |
| lineup.test.ts    | saveLineupToMatch, savePlayerMatchStats; titular/reserva/substituto, remoção nas duas fontes, múltiplas fichas, contraparte com minutos, repetição e três pontos de falha                         |         7 |      1 |
| results.test.tsx  | useAddDetails + ServiceMatches + ServiceTable; V/E/D, edição/exclusão de finalizada, repetição, falha antes da tabela/na segunda equipe e salvamentos simultâneos                                 |        10 |      2 |
| academy.test.ts   | promotePlayerToProfessional + PlayersCrudService; base/profissional, IDs, histórico/torneios, falhas antes/depois das etapas, repetição, concorrência e payload com campos opcionais ausentes     |        10 |      3 |
| groups.test.ts    | ServiceCareerGroup.getById; vários IDs, inexistência, grupo parcialmente válido, permission-denied real, transporte real indisponível, falhas injetadas e falha na limpeza                        |         8 |      1 |
| isolation.test.ts | Auth A/B, logout, acesso cruzado, leitura do servidor e bloqueio de rede externa                                                                                                                  |         4 |      0 |
| feedback.test.tsx | useLineupPersistence/useSaveLineup com serviço e Firestore reais; falso sucesso após erro anterior à escrita                                                                                      |         1 |      1 |
| **Total novo**    | **82 casos registrados**                                                                                                                                                                          |    **67** | **15** |

As inspeções usam `getDocFromServer`/`getDocsFromServer`. Os snapshots e listas em memória devolvidos pelos serviços são comparados com os documentos persistidos. UUIDs de domínio são determinísticos; UIDs emitidos pelo Auth Emulator e IDs automáticos de tabela são tratados por identidade/quantidade, sem expectativas de valores aleatórios.

## Falhas reproduzidas e estado persistido

O adaptador de teste **delega ao SDK** e injeta apenas a falha ou a barreira de ordenação indicada. Linhas marcadas como injetadas não são apresentadas como falhas espontâneas do servidor. Escritas anteriores e inspeções posteriores são reais no emulador.

| Operação                    | Ponto/tipo da falha                                         | Estado constatado no emulador                                                              |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| addSeason                   | Antes de atualizar carreira; injetada                       | Só a temporada anterior; nenhuma cópia da nova                                             |
| addSeason                   | Antes do quarto profissional (`p1`); injetada               | Metadados de temporada 2 presentes; três profissionais copiados; p1 e base ausentes        |
| addSeason                   | Antes de copiar a base; injetada                            | Temporada 2 e quatro profissionais presentes; base ausente                                 |
| addSeason após falha        | Repetição sem injeção                                       | Cria temporada 3 a partir do elenco parcial da 2; não recupera p1 perdido                  |
| deleteMatch                 | Após excluir playerStats, antes da partida; injetada        | Partida existe, playerStats já não existe; updatedAt não foi gravado                       |
| deleteCareer                | Após excluir playerStats, antes da partida; injetada        | Carreira e partida existem, ficha individual já foi excluída                               |
| deleteSeason                | Antes de excluir atleta da base; injetada                   | Profissionais excluídos; base, documento-pai e metadados permanecem                        |
| deleteSeason                | Antes de atualizar metadados; injetada                      | Documento de temporada/profissionais/base excluídos, mas carreira ainda lista temporada    |
| addMatch                    | Antes de updatedAt; injetada                                | Partida criada, carreira sem updatedAt                                                     |
| saveLineupToMatch           | Antes de excluir atleta; injetada                           | Pai e três fichas individuais intactos                                                     |
| saveLineupToMatch           | Após exclusão individual, antes do pai; injetada            | Ficha da subcoleção removida, mas ficha embutida permanece e reaparece na leitura mesclada |
| saveLineupToMatch           | Antes de updatedAt; injetada                                | Escalação e array embutido novos; updatedAt ausente                                        |
| savePlayerMatchStats        | Antes da contraparte; injetada                              | Primeira ficha gravada; contraparte não criada                                             |
| saveDetails                 | Antes de consultar tabela; injetada                         | Partida FINISHED, nenhuma linha de tabela                                                  |
| saveDetails                 | Antes da segunda equipe, após escrita da primeira; injetada | Partida FINISHED, Clube com 1 jogo/3 pontos e Rival com 0 jogos                            |
| promotePlayerToProfessional | Antes de marcar promoted; injetada                          | Base continua academy; nenhum profissional                                                 |
| promotePlayerToProfessional | Consulta de torneios ou criação do profissional; injetada   | Base promoted e histórico ampliado; nenhum profissional                                    |
| promotePlayerToProfessional | Antes de updatedAt; injetada                                | Base e profissional persistidos; updatedAt ausente                                         |
| promotePlayerToProfessional | Campos opcionais undefined; rejeição real do SDK            | Base promoted; profissional rejeitado com invalid-argument                                 |
| getById do grupo            | permission-denied real pelas regras de teste                | ID recusado removido do documento do grupo                                                 |
| getById do grupo            | unavailable/deadline-exceeded injetados na carreira         | Carreira continua existindo; grupo perde seu ID                                            |
| getById do grupo            | Transporte real do SDK desligado e carreira fora do cache   | SDK retorna unavailable; após reconectar, limpeza remove ID de carreira que existe         |
| getById do grupo            | Antes de ler o grupo; injetada                              | Operação rejeita e membros persistidos permanecem                                          |
| getById do grupo            | Antes de persistir limpeza; injetada                        | Resposta omite carreira, mas documento preserva todos os IDs                               |
| Feedback da escalação       | Serviço real rejeita antes de gravar                        | Firestore não tem lineup novo; hook chama onSaved e avança referência salva                |

O caso real de rede usa `disableNetwork`/`enableNetwork` do SDK. Não mata o processo Java. Uma carreira é semeada via REST local para ficar fora do cache; o transporte é reconectado antes da tentativa de limpeza, permitindo provar o efeito persistido.

## Repetição e concorrência

- Criar temporada duas vezes sequencialmente significa criar duas temporadas; **não** foi imposta idempotência indevida a essa ação de domínio.
- Repetir add/update de partida pelo mesmo ID, gravação de estatística pelo mesmo playerId e salvamento de lineup não cria IDs extras. Exclusão repetida não recupera descendentes órfãos esquecidos.
- Repetir promoção sequencial encontra o profissional pelo nome/nacionalidade e reutiliza seu ID. Com a base relida, acrescenta outro evento de promoção. Duas promoções simultâneas que leem elenco vazio criam dois profissionais.
- Duas criações de temporada que leem o mesmo estado deixam subcoleções das duas, mas metadados de apenas uma delas.
- Salvar novamente o mesmo callback com snapshot SCHEDULED dobra a contribuição da partida. Reabrir com FINISHED evita novo incremento. Dois salvamentos rápidos com tabela inicialmente vazia criam duas linhas por equipe.
- Respostas fora de ordem: a escrita antiga retida por uma barreira, quando liberada por último, sobrescreve o placar mais novo. Foi caracterizada a política atual de última escrita; escolher rejeição de conflitos exige decisão de domínio.

## Bugs anteriores: cobertura real e prontidão

Nenhum dos 11 bugs foi corrigido. B05, B07, B08, B09, B10 e B11 agora têm reprodução com persistência no emulador. A classificação abaixo não significa autorização para iniciar correções nesta execução.

| Bug                                    | Cobertura nesta etapa                                                                                     | Prontidão                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| B01 — ballonDor duplicado              | Unitários anteriores preservados; cálculo puro                                                            | Pronto para correção                                                                   |
| B02 — reprocessamento/raw              | Unitários anteriores preservados; persistência de payload derivado ainda não exercitada ponta a ponta     | Pronto para correção localizada; ampliar fluxo de salvamento antes de mudanças amplas  |
| B03 — 99/99                            | Unitários anteriores preservados                                                                          | Pronto para correção                                                                   |
| B04 — mutação no retorno de recebido   | Unitários anteriores preservados                                                                          | Pronto para correção localizada                                                        |
| B05 — lista/detalhe divergem           | Fontes de partidas sobrepostas no emulador; jogadores continuam cobertos por unitários                    | Pronto para correção; ampliar teste de sobreposição de jogadores antes de migração     |
| B06 — mutação no transporte            | Unitário de mutação preservado; integração comprova que contrato anterior em subcoleção permanece intacto | Pronto para correção da mutação em memória; não alegar corrupção do documento anterior |
| B07 — criação parcial                  | Falhas antes de metadados, durante profissionais/base, estado residual e nova tentativa                   | Pronto para correção                                                                   |
| B08 — exclusão incompleta de temporada | Árvore real, órfãos, repetição e falhas parciais                                                          | Pronto para correção                                                                   |
| B09 — leitura remove membro em erro    | Permissão real, indisponibilidade real do SDK, falhas injetadas e grupo parcial                           | Pronto para correção                                                                   |
| B10 — promoção parcial                 | Persistência das etapas, falhas, repetição e concorrência                                                 | Pronto para correção                                                                   |
| B11 — falso sucesso                    | Hook chama serviço real; Firestore permanece antigo após erro                                             | Pronto para correção                                                                   |

## Itens acrescentados ao catálogo, sem correção

Todos têm teste explícito do comportamento atual e regressão `todo` especificada no arquivo correspondente. Alguns já eram riscos apontados pela auditoria; agora têm evidência de persistência e identificador próprio.

| ID  | Atual confirmado → desejado                                                                                                            | Teste            | Prontidão                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| B12 | Excluir carreira deixa documento de temporada, jogadores, tabela, base, torneios e temporada órfã → remover toda a árvore da carreira  | deletion         | Pronto para correção                                                                           |
| B13 | stripHeavyData apaga dados exclusivamente embutidos de temporadas existentes ao criar/excluir outra → preservar dados recuperáveis     | deletion/seasons | Pronto para correção conservadora; estratégia de migração exige decisão separada               |
| B14 | Remover pênaltis do objeto não remove campos no save com merge → releitura sem homePenScore/awayPenScore                               | matches          | Pronto para correção                                                                           |
| B15 | Criação concorrente deixa subcoleções sem referência → impedir estado órfão                                                            | seasons          | Bloqueado por decisão de domínio: serializar as duas criações ou rejeitar conflito             |
| B16 | Falha após excluir ficha individual deixa legado embutido que reaparece → leitura consistente após falha/retomada                      | lineup           | Ainda precisa de mais cobertura: múltiplas exclusões simultâneas e retomada após falha parcial |
| B17 | Promoção concorrente duplica profissional; repetição com fonte relida duplica evento → um profissional/evento por promoção             | academy          | Pronto para correção                                                                           |
| B18 | Editar/excluir finalizada não reverte tabela → refletir placar atual e ausência da partida                                             | results          | Pronto para correção                                                                           |
| B19 | Repetição dobra contadores; concorrência cria linhas extras → uma contribuição por partida/equipe                                      | results          | Pronto para correção                                                                           |
| B20 | Campos opcionais viram undefined no payload e SDK rejeita profissional após promover base → payload persistível e operação recuperável | academy          | Pronto para correção                                                                           |

A política de conflitos para uma gravação antiga que chega depois da nova foi registrada como observação de concorrência, sem inventar um bug com resultado de domínio ainda não definido.

## Cobertura: antes → depois

Baseline preservado em [coverage-before-stage4.json](coverage-before-stage4.json). Depois: unitários e integração em uma única execução V8 com `vitest.all.config.ts`, sem somar percentuais ou unir relatórios incompatíveis.

**Mesmos 725 arquivos de produção**, mesmas exclusões (`src/test/**` e declarações `.d.ts`). Serviços, componentes, páginas e módulos não testados continuam incluídos. Nenhum denominador foi filtrado para inflar resultados.

| Abrangência |          Lines |      Functions |         Branches |     Statements |
| ----------- | -------------: | -------------: | ---------------: | -------------: |
| **Global**  | 3.95% -> 5.82% | 5.78% -> 8.76% | 31.27% -> 38.04% | 3.95% -> 5.82% |

Contadores: linhas/statements **1.885/47.646 → 2.756/47.293**; funções **44/760 → 69/787**; branches **350/1.119 → 493/1.296**. O V8 representa arquivos não executados e arquivos efetivamente instrumentados de modos diferentes; por isso os contadores mudam mesmo com os mesmos arquivos e fontes intactos. Não são um inventário estático universal de funções/ramos.

| Módulo P0 (link para arquivo)                                                                                                                          | Lines antes → depois | Functions antes → depois | Branches antes → depois | Statements antes → depois |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------: | -----------------------: | ----------------------: | ------------------------: |
| [Deleters](../../src/common/helpers/Deleters/index.ts)                                                                                                 |         0% -> 62.29% |             0% -> 33.33% |              0% -> 100% |              0% -> 62.29% |
| [Getters](../../src/common/helpers/Getters/index.ts)                                                                                                   |      98.3% -> 99.15% |             100% -> 100% |           73.68% -> 80% |           98.3% -> 99.15% |
| [PlayersCrudService.ts](../../src/common/services/ServicePlayers/PlayersCrudService.ts)                                                                |         0% -> 61.85% |                0% -> 50% |               0% -> 90% |              0% -> 61.85% |
| [contractHelpers](../../src/common/services/ServicePlayers/helpers/contractHelpers/index.ts)                                                           |     92.07% -> 92.07% |             100% -> 100% |        72.72% -> 72.72% |          92.07% -> 92.07% |
| [statsHelpers](../../src/common/services/ServicePlayers/helpers/statsHelpers/index.ts)                                                                 |         100% -> 100% |             100% -> 100% |              90% -> 90% |              100% -> 100% |
| [ServiceSeasons](../../src/common/services/ServiceSeasons/index.ts)                                                                                    |       83.6% -> 83.6% |               40% -> 40% |        82.92% -> 86.27% |            83.6% -> 83.6% |
| [stripHeavyData.ts](../../src/common/utils/stripHeavyData.ts)                                                                                          |         100% -> 100% |             100% -> 100% |            100% -> 100% |              100% -> 100% |
| [ServiceMatches](../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches/index.ts)                       |         0% -> 45.61% |             0% -> 45.45% |            0% -> 76.19% |              0% -> 45.61% |
| [validateMatchForm](../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/validators/validateMatchForm/index.ts)               |         100% -> 100% |             100% -> 100% |            100% -> 100% |              100% -> 100% |
| [ServiceTable](../../src/layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable/index.ts)                           |         0% -> 79.41% |                0% -> 75% |               0% -> 60% |              0% -> 79.41% |
| [mergeMatchStats](../../src/layout/SectionView/helpers/mergeMatchStats/index.ts)                                                                       |         100% -> 100% |             100% -> 100% |        79.03% -> 79.03% |              100% -> 100% |
| [AcademyService](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/index.ts)                                                      |     29.55% -> 33.99% |               10% -> 20% |              60% -> 90% |          29.55% -> 33.99% |
| [buildPlayerAcademyTournaments](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPlayerAcademyTournaments/index.ts) |       95.91% -> 100% |             100% -> 100% |           58.33% -> 80% |            95.91% -> 100% |
| [buildPromotedPlayer](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPromotedPlayer/index.ts)                     |         100% -> 100% |             100% -> 100% |            100% -> 100% |              100% -> 100% |
| [ServiceCareerGroup](../../src/pages/GroupCareerPage/services/ServiceCareerGroup/index.ts)                                                             |       94.23% -> 100% |             100% -> 100% |           87.5% -> 100% |            94.23% -> 100% |
| [buildLineupStatsUpdate](../../src/pages/Match/components/LineupTab/helpers/buildLineupStatsUpdate/index.ts)                                           |         100% -> 100% |             100% -> 100% |            100% -> 100% |              100% -> 100% |
| [useLineupPersistence](../../src/pages/Match/components/LineupTab/hooks/useLineupPersistence/index.ts)                                                 |     96.22% -> 96.22% |             100% -> 100% |        71.42% -> 71.42% |          96.22% -> 96.22% |
| [useSaveLineup](../../src/pages/Match/components/LineupTab/hooks/useSaveLineup/index.ts)                                                               |         100% -> 100% |             100% -> 100% |              75% -> 80% |              100% -> 100% |
| [calculateSubstitutionMinutes](../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/helpers/calculateSubstitutionMinutes/index.ts)     |     97.89% -> 97.89% |             100% -> 100% |        88.88% -> 88.88% |          97.89% -> 97.89% |
| [savePlayerMatchStats](../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats/index.ts)                    |         100% -> 100% |             100% -> 100% |        95.23% -> 95.45% |              100% -> 100% |
| [useAddDetails.ts](../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/useAddDetails.ts)                                           |         0% -> 92.79% |               0% -> 100% |            0% -> 65.95% |              0% -> 92.79% |
| [buildMatchPayload](../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/buildMatchPayload/index.ts)                        |         100% -> 100% |             100% -> 100% |        93.33% -> 93.33% |              100% -> 100% |
| [calculateTableStats](../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/calculateTableStats/index.ts)                    |         100% -> 100% |             100% -> 100% |            100% -> 100% |              100% -> 100% |
| [ServiceLineup](../../src/pages/Match/services/ServiceLineup/index.ts)                                                                                 |           0% -> 100% |               0% -> 100% |            0% -> 85.71% |                0% -> 100% |

A cobertura global segue baixa. ServiceMatches inclui métodos de equipes fora deste escopo; AcademyService possui vários CRUDs não exercitados; ServiceSeasons tem métodos de configuração não exercitados. Por isso suas porcentagens de arquivo não chegam a 100%, apesar da cobertura dos fluxos P0 escolhidos. Cobertura de linha não prova ausência de defeitos — vários testes documentam explicitamente bugs.

Artefatos finais: [HTML](../../coverage/index.html), [resumo JSON](../../coverage/coverage-summary.json) e [dados completos](../../coverage/coverage-final.json). A saída gerada é ignorada pelo Git e pode ser regenerada com `npm run test:coverage:all`.

## Validações finais

| Comando/verificação              | Resultado                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| npm run typecheck                | Aprovado                                                                                |
| npm run typecheck:tests          | Aprovado                                                                                |
| npm run lint                     | Aprovado, sem autofix amplo                                                             |
| npm run test:run                 | 116 aprovados, 11 todo                                                                  |
| npm run test:integration         | 67 aprovados, 15 todo; Firestore/Auth reais locais                                      |
| npm run test:firebase            | Aprovado; alias do mesmo runner de integração, também executado durante desenvolvimento |
| npm run test:coverage:all        | 183 aprovados, 26 todo; 20 arquivos; coverage gerado                                    |
| npm run build                    | Aprovado, mesmos assets e tamanhos da etapa anterior                                    |
| npm run test:emulators:prepare   | JAR verificado por SHA-256                                                              |
| Runner sem ambiente              | Recusado com EMULATOR_REQUIRED, conforme esperado                                       |
| Runner com emuladores desligados | Recusado com EMULATOR_UNAVAILABLE:8089, conforme esperado                               |
| Integridade de src               | 938 arquivos preexistentes comparados por SHA-256: nenhuma alteração                    |

Build: JS 5.210,41 kB / gzip 1.678,95 kB; CSS 143,23 kB / gzip 28,10 kB. O aviso de chunk acima de 500 kB permanece. A instalação da CLI em pacote separado emitiu aviso de engine de superstatic/Hosting no Node 24; Hosting não é usado e a execução Firestore/Auth foi validada.

As primeiras execuções encontraram ajustes necessários nos próprios testes, como tratar corretamente rejeições dentro de `act` e completar fixtures do caminho de sucesso. A rejeição de dados opcionais ausentes não foi escondida ao ajustar a fixture: virou B20, com dois casos explícitos e regressão desejada. Nenhum teste final terminou vermelho e nenhuma rejeição ficou sem tratamento.

## Arquivos de produção modificados

**Nenhum.** Nenhuma adaptação de produção foi necessária para testabilidade. Os 938 arquivos preexistentes de `src`, incluindo os testes anteriores, permaneceram iguais ao início desta etapa. O lockfile da aplicação não foi modificado.

Arquivos de infraestrutura anteriores alterados: `package.json` (scripts), `tsconfig.test.json` (incluir integração), `vitest.config.ts` (nome do projeto unitário), `vitest.integration.config.ts` (habilitar execução local), `eslint.config.js` e `.gitignore` (artefatos locais). Novos arquivos ficam em `tests`, configuração Firebase de teste, configuração de cobertura conjunta e documentação. Artefatos usuais de build/TypeScript foram regenerados. Alterações preexistentes do usuário foram preservadas.

## Limites e próxima etapa

Os fluxos pedidos foram cobertos com serviços reais e falhas inspecionadas no emulador. Permanecem fora da evidência: regras de produção ausentes, todos os CRUDs secundários, queda abrupta do processo Java no meio de escrita e recuperação após reinício completo. Não há alegação de segurança de produção ou integração exaustiva de toda a aplicação.

As correções podem ser planejadas a partir da matriz de prontidão, começando por perda de dados, operações parciais e classificação. B15 e a política de escrita fora de ordem precisam de decisão sobre conflitos; B16 ainda merece mais casos de múltiplas exclusões. Nenhuma dessas correções foi iniciada nesta execução.

## Etapa 5 — baseline real no navegador

O [relatório completo de performance](../performance/baseline-report.md) reúne as medições preservadas de pequeno/médio, saturação censurada do grande, React Profiler separado, ciclos de listeners, timers, salvamento, bundle, assets, long tasks e Web Vitals observáveis. Consulte também a [metodologia](../performance/methodology.md), os [contadores consolidados](../performance/measurements.json) e as [validações finais da etapa 5](../performance/validation.json).

A curva instrumentada é 60/300/900 partidas → 60/300/900 buscas de playerStats. Abrir jogador duplica a hidratação; três ciclos SPA elevam listeners de 1 para 4, multiplicando leituras em updatedAt de 66 para 264 no pequeno e de 312 para 1.248 no médio. Timeouts não foram convertidos em durações finais. Nenhuma correção ou otimização de produção integra esta etapa; o conteúdo e os resultados das etapas 1–4 acima foram preservados.
