# Relatório de implementação — etapas 1, 2 e 3

Concluído em 22/09/2026. **116 testes aprovados, 11 regressões `todo`, 11 arquivos de teste.** Nenhum defeito foi corrigido e nenhum arquivo de produção existente em `src` foi modificado nesta execução.

## Escopo entregue

1. Contratos e cenários: [documentação detalhada](contracts-and-scenarios.md), factories tipadas, fontes simultâneas, entradas imutáveis, regras atuais e resultados desejados separados.
2. Infraestrutura: Vitest isolado, cobertura V8, TypeScript de testes, RTL/jsdom para hook e bloqueios explícitos de Firebase/rede/ambiente.
3. Caracterização P0: agregação, fontes, contratos, transporte de temporada, escalação, estatísticas individuais, resultado/tabela, base, histórico e grupos. Serviços foram exercitados com fronteiras em memória; não foram criados testes complexos de integração.

Não houve otimização, migração, alteração de Firebase, navegação, cache, arquitetura ou refatoração de produção. Integração, regras e E2E permanecem para a próxima etapa.

## Infraestrutura criada

| Dependência de desenvolvimento | Versão | Uso |
|---|---|---|
| vitest | 3.2.7 | Runner, mocks, relógio e assertions |
| @vitest/coverage-v8 | 3.2.7 | Coverage |
| @testing-library/react | 16.3.0 | renderHook/act/cleanup |
| @testing-library/dom | 10.4.1 | Dependência explícita compatível da RTL |
| jsdom | 26.1.0 | Ambiente DOM do teste de persistência |
| @types/node | 24.2.1 | Tipagem da infraestrutura; mesma versão que já existia transitivamente |

Todas as versões de pacotes anteriores ao trabalho foram preservadas, inclusive transitivas. Quatro requisitos novos usam cópias aninhadas nas ferramentas novas, sem atualizar as cópias usadas anteriormente: sourcemap-codec, trace-mapping, cross-spawn e picocolors. A instalação reproduzível foi validada com `npm ci --ignore-scripts --no-audit --no-fund`.

Arquivos: `vitest.config.ts`, `vitest.integration.config.ts`, `tsconfig.test.json`, `src/test/setup.ts`, `src/test/emulatorGuard.ts`, factories, fixtures e mocks. `tsconfig.app.json` exclui testes do build da aplicação; ESLint e `.gitignore` ignoram a saída de coverage. Não foram criadas pastas vazias ou ferramentas sem uso.

Scripts adicionados: `test`, `test:run`, `test:coverage`, `typecheck`, `typecheck:tests`. `dev`, `build`, `lint` e `preview` mantêm os comandos anteriores. Não há script de integração habilitado.

### Proteção contra Firebase real

- O cliente da aplicação é substituído antes da avaliação, com projeto fictício `demo-career-tracker` e usuário de teste.
- Auth/Firestore resolvem exclusivamente para mocks locais; outras entradas de SDK Firebase são recusadas. Operação não configurada lança erro.
- Vite não lê os arquivos de ambiente da aplicação. O `envDir` de testes aponta para um arquivo regular verificado, sem possibilidade de filhos `.env`; prefixo é `TEST_ONLY_` e as duas variáveis Firebase usadas nos testes são fictícias.
- Fetch, HTTP, HTTPS, TLS, socket, WebSocket e XHR são bloqueados, inclusive localhost nesta suíte.
- A configuração de integração é uma **barreira, não uma suíte implementada**: requer projeto demo e hosts locais explícitos de Firestore/Auth, e mesmo assim informa que integração ainda não está habilitada. Sem ambiente, abortou com `EMULATOR_REQUIRED` antes de iniciar testes.
- Nenhuma leitura, escrita ou exclusão de Firebase real foi executada. Não houve migration ou execução de regras contra projeto real.

## Testes criados

Os nomes abaixo correspondem a arquivos em `src/test`. Os símbolos e caminhos completos de produção aparecem na tabela de cobertura e na [matriz de contratos](contracts-and-scenarios.md).

| Teste | Arquivos/símbolos testados e casos principais | Aprovados | Todo |
|---|---|---:|---:|
| statistics.test.ts | mergeMatchStats: augmentSeason/augmentCareer/getAggregatedPlayers/toRawPlayer; statsHelpers: aggregatePlayerStats. Manual+derivada, zero, agendada/finalizada, deduplicação, repetição, carreira vazia/uma/várias, nomes iguais/IDs/nacionalidades distintos, venda e imutabilidade | 19 | 2 |
| contracts.test.ts | contractHelpers e stripHeavyData. Venda/empréstimo/retorno/edição, ano da temporada, contratos vazios, valores zero, datas inválidas, imutabilidade e mutação conhecida | 12 | 1 |
| lineup.test.ts | buildLineupStatsUpdate e calculateSubstitutionMinutes. Banco/goleiro/titulares, slots null/repetidos, estatísticas ausentes, cadeia, ciclo, múltiplas raízes, 90/120 minutos, acréscimos e piso zero | 16 | 0 |
| results.test.ts | buildMatchPayload, calculateMatchResult, calculateTableStats, validateMatchForm. Mandante/visitante, V/E/D, pênaltis/zero/empate, prorrogação, limpeza de payload, pontuação, obrigatórios e 99/99 | 23 | 1 |
| sources.test.ts | Getters: getCareerById/getAllCareers. Legado, fontes atuais sobrepostas, exclusivos, prioridade por ID, erro de hidratação, carreira inexistente, Timestamp | 6 | 1 |
| seasons.test.ts | ServiceSeasons.addSeason/deleteSeason com mocks. Primeira temporada, lacuna numérica, vendidos, empréstimos, promovidos, contrato vencido, base, falha parcial e exclusão incompleta | 9 | 3 |
| academy.test.ts | buildPromotedPlayer/buildPlayerAcademyTournaments/AcademyService.promotePlayerToProfessional. Histórico, compacto, zero/pênaltis, data fixa, nenhuma participação, erro parcial | 6 | 1 |
| groups.test.ts | ServiceCareerGroup.getById. Grupo vazio/inexistente/válido, ausência de autenticação e falha transitória que remove membro | 5 | 1 |
| playerStats.test.ts | buildPlayerStats/savePlayerMatchStats. Conversão, gols/assistências/cartões, upsert, contraparte e seus minutos, erro na gravação, imutabilidade | 5 | 0 |
| persistence.test.tsx | useLineupPersistence/useSaveLineup com RTL. Sucesso, falso sucesso após erro e bloqueio XHR | 3 | 1 |
| isolation.test.ts | Isolamento de env/cliente/SDK/rede e validação de emuladores | 12 | 0 |
| **Total** | **127 casos registrados, 116 executados com sucesso** | **116** | **11** |

## BUGS CONHECIDOS documentados

**Situação atual de todos: reproduzidos, sem correção; teste atual aprovado e regressão desejada `todo` no mesmo arquivo.** Os `todo` não contam como comportamento corrigido.

| ID | Comportamento atual | Comportamento correto desejado | Teste criado |
|---|---|---|---|
| B01 | Primeiro ballonDor=1 agrega 2 | Somar uma vez: resultado 1; temporadas 1+2=3 | statistics |
| B02 | augment→raw→augment soma partida novamente: 4 jogos/7 gols em vez de 3/5 | Restaurar base manual no raw e manter 3 jogos/5 gols após reprocessar | statistics |
| B03 | validateMatchForm aceita 99/99 | Rejeitar com mensagem de data inválida | results |
| B04 | Retorno de recebido altera contrato original | Atualizar resultado sem mutar entrada | contracts |
| B05 | Lista descarta exclusivos legados quando existem atuais; detalhe os mantém | Mesma união por ID com prioridade atual nas duas leituras | sources |
| B06 | Nova temporada modifica contratos da temporada anterior no retorno de cedido | Preservar histórico anterior intacto | seasons |
| B07 | Metadados da nova temporada são gravados antes de falha na cópia | Evitar temporada apresentada como completa após falha; preservar recuperação | seasons |
| B08 | deleteSeason ignora descendentes fora de players/academyPlayers | Excluir toda a árvore prevista, comprovando no emulador | seasons |
| B09 | Erro transitório na leitura remove ID persistido do grupo | Não remover membro por indisponibilidade temporária | groups |
| B10 | Falha no profissional ocorre depois de salvar promoted na base | Não deixar promoção concluída pela metade | academy |
| B11 | Erro no salvamento ainda publica onSaved e avança referência salva | Preservar estado anterior, sinalizar erro e permitir nova tentativa | persistence |

B07/B08/B10 demonstram decisões e ordem de chamadas, sem afirmar que mocks comprovam atomicidade ou remoção de documentos reais. A etapa 4 precisa completar essa prova em emuladores.

## Coverage

Medição V8 final: **725 arquivos** de produção; exclusões apenas `src/test/**` e `src/**/*.d.ts`. Páginas, componentes, serviços e módulos não executados permanecem no denominador. Não há limiar global artificial.

| Abrangência | Lines | Functions | Branches | Statements |
|---|---:|---:|---:|---:|
| **Global** | **3,95%** | **5,78%** | **31,27%** | **3,95%** |

Contagens globais: 1.885/47.646 linhas e statements, 44/760 funções e 350/1.119 branches. São os contadores produzidos pelo V8/Vitest, inclusive sua representação de arquivos não executados; não equivalem a um inventário estático completo de todos os ramos da aplicação. A cobertura global de linhas continua baixa e não está escondida.

| M?dulo cr?tico (arquivo testado) | Lines | Functions | Branches | Statements |
|---|---:|---:|---:|---:|
| [Getters](../../src/common/helpers/Getters/index.ts) | 98.3% | 100% | 73.68% | 98.3% |
| [contractHelpers](../../src/common/services/ServicePlayers/helpers/contractHelpers/index.ts) | 92.07% | 100% | 72.72% | 92.07% |
| [statsHelpers](../../src/common/services/ServicePlayers/helpers/statsHelpers/index.ts) | 100% | 100% | 90% | 100% |
| [ServiceSeasons](../../src/common/services/ServiceSeasons/index.ts) | 83.6% | 40% | 82.92% | 83.6% |
| [stripHeavyData](../../src/common/utils/stripHeavyData.ts) | 100% | 100% | 100% | 100% |
| [validateMatchForm](../../src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/validators/validateMatchForm/index.ts) | 100% | 100% | 100% | 100% |
| [mergeMatchStats](../../src/layout/SectionView/helpers/mergeMatchStats/index.ts) | 100% | 100% | 79.03% | 100% |
| [AcademyService](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/index.ts) | 29.55% | 10% | 60% | 29.55% |
| [buildPlayerAcademyTournaments](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPlayerAcademyTournaments/index.ts) | 95.91% | 100% | 58.33% | 95.91% |
| [buildPromotedPlayer](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPromotedPlayer/index.ts) | 100% | 100% | 100% | 100% |
| [ServiceCareerGroup](../../src/pages/GroupCareerPage/services/ServiceCareerGroup/index.ts) | 94.23% | 100% | 87.5% | 94.23% |
| [buildLineupStatsUpdate](../../src/pages/Match/components/LineupTab/helpers/buildLineupStatsUpdate/index.ts) | 100% | 100% | 100% | 100% |
| [useLineupPersistence](../../src/pages/Match/components/LineupTab/hooks/useLineupPersistence/index.ts) | 96.22% | 100% | 71.42% | 96.22% |
| [useSaveLineup](../../src/pages/Match/components/LineupTab/hooks/useSaveLineup/index.ts) | 100% | 100% | 75% | 100% |
| [buildPlayerStats](../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/helpers/buildPlayerStats/index.ts) | 93.22% | 100% | 77.77% | 93.22% |
| [calculateSubstitutionMinutes](../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/helpers/calculateSubstitutionMinutes/index.ts) | 97.89% | 100% | 88.88% | 97.89% |
| [savePlayerMatchStats](../../src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats/index.ts) | 100% | 100% | 95.23% | 100% |
| [calculateMatchResult](../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/helpers/calculateMatchResult/index.ts) | 100% | 100% | 100% | 100% |
| [buildMatchPayload](../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/buildMatchPayload/index.ts) | 100% | 100% | 93.33% | 100% |
| [calculateTableStats](../../src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/helpers/calculateTableStats/index.ts) | 100% | 100% | 100% | 100% |

O serviço completo de base ficou com 29,55% de linhas e 10% de funções porque esta etapa exercita promoção, não todos os CRUDs. ServiceSeasons ficou com 83,60% de linhas e 40% de funções: criação/exclusão estão exercitadas, mas demais métodos continuam fora da suíte. 100% de linhas em um helper não prova integração correta nem elimina os bugs conhecidos.

Relatórios regeneráveis: [HTML](../../coverage/index.html), [resumo JSON](../../coverage/coverage-summary.json), [detalhes JSON](../../coverage/coverage-final.json). A pasta coverage é ignorada pelo Git.

## Validações

| Verificação | Resultado final |
|---|---|
| TypeScript aplicação — npm run typecheck | Aprovado |
| TypeScript testes — npm run typecheck:tests | Aprovado |
| ESLint — npm run lint | Aprovado, sem autofix indiscriminado |
| Testes — npm run test:run | 11 arquivos; 116 aprovados; 11 todo |
| Coverage — npm run test:coverage | Aprovado; mesmos 116 testes/11 todo |
| Build — npm run build | Aprovado; Vite 5.4.9, 1.278 módulos |
| Tentativa de integração sem emuladores | Recusada como esperado: EMULATOR_REQUIRED |
| Instalação com lockfile | npm ci concluído; versões preexistentes preservadas |
| Integridade de produção | Hash SHA-256 de todos os arquivos preexistentes em src: nenhuma alteração |

Build: JavaScript 5.210,41 kB (gzip 1.678,95 kB); CSS 143,23 kB (gzip 28,10 kB). O aviso de chunk maior que 500 kB permanece. Nenhuma tentativa de otimização foi feita.

As primeiras execuções identificaram erros na infraestrutura de teste (tipagem e fixtures de valores monetários), corrigidos antes dos resultados finais. Fixtures usam `1k`/`2k`, sintaxe anunciada nos formulários; `1.000` no parser atual significa decimal 1. Não houve alteração silenciosa do parser nem classificação arbitrária de suporte a milhar brasileiro.

O Windows bloqueou a primeira reinstalação porque Vite mantinha esbuild.exe aberto. Somente o Vite/esbuild deste projeto foi interrompido, a instalação foi concluída e o servidor foi retomado. Algumas verificações exigiram execução fora do sandbox porque o esbuild não conseguia resolver diretórios ancestrais; as barreiras internas da suíte continuaram ativas.

## Alterações em produção

**Nenhum arquivo de produção existente em `src` foi modificado nesta tarefa.** O repositório já continha alterações e exclusões anteriores; foram preservadas. A comparação foi feita contra o inventário do início desta implementação, e não contra HEAD.

Arquivos existentes alterados por esta etapa: `package.json`, `package-lock.json`, `tsconfig.app.json`, `eslint.config.js`, `.gitignore`. Finalidade exclusiva: dependências/scripts de teste, separação de TypeScript e saída de cobertura. Novos arquivos ficam nas configurações de testes, `src/test` e `docs/testing`. Build e TypeScript também regeneram seus artefatos locais usuais.

## Próxima etapa: services/integração

Prontos: fixtures determinísticas, contratos, helpers com cobertura, mocks de fronteira, falhas reproduzíveis, configuração que recusa integração insegura e catálogo de regressões.

1. Implementar runner de emuladores e regras com projeto demo, reset de dados local e isolamento por usuário; habilitar scripts apenas depois dessa infraestrutura funcionar.
2. Provar persistência de temporadas/promoções com falha intermediária e retomada; exclusão de carreira/temporada com toda árvore de subcoleções; manutenção de dados exclusivamente legados.
3. Cobrir edição/reversão de classificação, retirada persistida de pênaltis em save com merge e hidratação de playerStats dos grupos.
4. Exercitar fechamento/navegação após falha em estatística individual. O falso sucesso de escalação já está reproduzido; isso não equivale a cobrir todos os formulários.

B01/B02/B03/B04/B05/B06/B09/B11 já têm reproduções unitárias/localizadas para apoiar correções futuras. B07/B08/B10 possuem reproduções das chamadas, mas precisam dos testes persistentes adicionais. Os caminhos, símbolos, limitações e menor próximo passo estão na [matriz de limites](contracts-and-scenarios.md#limites-e-próximos-alvos-sem-refatoração-nesta-etapa).
