# Etapa 6D2 — promoção consistente e idempotente

Concluída em 24/09/2026. **B10: CORRIGIDO. B17: CORRIGIDO.** Resultado final: **310 testes aprovados, 6 `todo`, 23 arquivos**, além de 15 testes nativos da barreira. As oito validações finais passaram. Nenhuma nova regressão funcional observada; houve queda de cobertura global de linhas e funções, detalhada abaixo.

**B12 e B15 continuam BLOQUEADOS. B16 continua pendente de cobertura adicional.** B02 e B05 não foram corrigidos. Etapa 6E não iniciada.

## Checkpoint e ordem respeitados

Antes de alterar produção, foram lidos AcademyService, PlayersCrudService, os helpers de construção do profissional/torneios/eventos, modelos e testes. A reprodução original aprovou 7 unitários e 13 cenários de integração que incluíam as caracterizações dos defeitos; os três `todo` B10/B17 ainda estavam pendentes.

B10 foi tratado e validado primeiro: 8 unitários e 15 cenários de integração aprovados, mantendo B17 pendente. Só depois foi implementada a proteção contra repetição e concorrência. Antes da interrupção por limite de uso, 35 cenários de integração estavam verdes.

Na retomada, `git status`, `git diff --stat` e o diff do teste foram conferidos. Como o arquivo de integração ainda não é rastreado pelo Git, a comparação efetiva usou o snapshot anterior à 6D2. A última edição estava completa: um teste adicional, sem duplicação, no mesmo nível superior dos demais testes do arquivo, com fixture inválida intencional para provocar erro de processamento. Ela foi preservada e os **36 cenários atuais passaram**, assim como os 8 unitários focados. Nenhum arquivo de produção ou teste foi alterado após a retomada.

Os três comandos inicialmente recusados pelo auto-review não executaram e não foram tratados como falhas do projeto. Após a retomada, foram executados diretamente e aprovados, sem contornar a revisão.

## B10 — causa, estratégia e atomicidade

O fluxo anterior gravava primeiro o status `promoted` e o histórico da base; depois consultava/processava torneios, criava o profissional e atualizava `updatedAt` separadamente. Falhas intermediárias deixavam a base promovida sem profissional ou dados persistidos sem o timestamp da carreira.

A implementação final usa uma **transação Firestore localizada na promoção**. Relê carreira, temporada, origem e profissional; prepara histórico e torneios antes de enfileirar as escritas. O SDK refaz as leituras quando há conflito. Os erros continuam propagados.

O teste de sucesso limpa a instrumentação após a preparação das fixtures e confirma **três operações de escrita na promoção normal**:

| Documento | Conteúdo gravado |
|---|---|
| `academyPlayers/{academyId}` | Status, saída e histórico da base |
| `players/{professionalId}` | Profissional, origem, histórico e torneios derivados |
| `careers/{careerId}` | `updatedAt` |

As três escritas pertencem ao mesmo commit. O evento não é um quarto documento: o mesmo ID lógico aparece nos históricos da base e do profissional. Os torneios originais são lidos, não regravados. Pelo código, uma repetição já completa não grava; a reparação de um `updatedAt` histórico ausente grava somente a carreira. O número máximo de escritas por tentativa é três, independentemente da quantidade de torneios.

### Falhas e estado persistido

Todas as inspeções de persistência usam releitura direta do servidor do Emulator.

| Cenário verificado | Estado observado |
|---|---|
| Erro ao ler carreira, origem ou profissional | Estado anterior preservado |
| Falha na consulta de torneios | Nenhuma promoção parcial |
| Torneio malformado durante processamento | Base, histórico, profissional e carreira permanecem anteriores; corrigida a fixture, retry conclui |
| Falha antes de gravar base, profissional ou `updatedAt` | Nenhuma das escritas da promoção é publicada |
| Commit realmente negado pelas regras sintéticas após logout | Erro `permission-denied`, estado anterior preservado; login e retry concluem |
| Documento da carreira removido externamente antes do commit | Transação não publica base/profissional; retry do SDK observa a carreira ausente e rejeita. Restaurada a fixture, nova chamada conclui |
| `unavailable` transitório | Retry real do SDK produz um profissional e um evento |
| `unavailable` persistente | Cinco tentativas esgotadas, erro propagado e estado anterior intacto; nova chamada sem injeção conclui |
| Erro recebido após commit concluído | Promoção completa já existe; erro propagado e nova chamada conserva dados e IDs |

As falhas injetadas antes das escritas ocorrem antes do envio do commit pelo adaptador de testes; não são apresentadas como escritas parciais do servidor. A recusa por regras e o conflito com remoção da carreira exercitam o backend real do Emulator.

**Falha + retry: VALIDADOS. Resíduos parciais produzidos pela tentativa: NÃO nos cenários verificados.** Erro posterior a um commit concluído não significa ausência de persistência; nesse caso a promoção permanece inteira e a repetição é idempotente.

## B17 — identidade, eventos e concorrência

A duplicação anterior tinha duas causas: cada chamada acrescentava outro evento ao histórico recebido e a busca do profissional usava nome/nacionalidade, com geração de UUID quando não encontrava alguém. Chamadas simultâneas podiam ler o elenco vazio e escolher IDs diferentes.

O vínculo existente foi preservado: **`isAcademy` e `professional.academyData.id` identificam a origem da base**. Nome e nacionalidade não decidem identidade. A carreira delimita o vínculo; a temporada delimita a promoção e seu evento.

- Um profissional histórico vinculado conserva seu ID, inclusive quando encontrado em outra temporada ou exclusivamente embutido nos metadados.
- Para um profissional novo sem vínculo anterior, o ID é `academy-${source.id}`, no caminho da carreira/temporada.
- Para um evento novo, o ID é `promotion:${JSON.stringify([seasonId, academyPlayer.id])}`. Não foi introduzido um novo campo de vínculo ou alterado o schema.
- Em uma origem já promovida com evento histórico, o ID existente é reutilizado. O profissional correspondente é conferido pelo vínculo e pelo ID do evento em seu histórico.
- Colisão com profissional sem vínculo correto ou múltiplos IDs vinculados retornam erro; não há sobrescrita arbitrária nem limpeza automática de duplicatas históricas.

### Evidência de idempotência

| Cenário | Resultado |
|---|---|
| Primeira, segunda e terceira chamadas, incluindo entrada antiga e outra data solicitada | Um profissional e um evento da promoção; data original preservada |
| Duas chamadas da mesma origem, sincronizadas para ler o mesmo estado | Um profissional e um evento; retry real observado |
| Duas chamadas simultâneas seguidas de outra chamada | Estado completo permanece idêntico |
| Duas origens com mesmo nome/nacionalidade | Dois profissionais distintos; cada base promovida com seu evento |
| Profissional homônimo sem vínculo | Documento anterior preservado |
| Profissional histórico moderno ou embutido | ID, atributos, estatísticas e dados existentes preservados, sem migration |
| ID histórico em outra temporada | Reutilizado na temporada de destino, sem alterar o documento antigo |
| Promoção histórica parcial com evento, mas sem profissional | Usa o evento e a data persistidos; não acrescenta evento duplicado |
| Eventos distintos com texto/data iguais | Preservados; identidade do evento, não semelhança textual, controla a repetição |

A operação não migra dados antigos, não funde profissionais sem identidade comprovada e não remove eventos históricos. A garantia validada diz respeito às chamadas deste fluxo de promoção; não constitui um mecanismo geral de deduplicação de dados históricos inconsistentes.

## Torneios e B20

Foram validados zero, um e múltiplos torneios relevantes, incluindo temporadas diferentes, histórico anterior e torneio sem participação. Os helpers existentes foram preservados. Os cinco cenários B20 de campos opcionais continuam ativos e verdes, incluindo valores zero e ausência de apelido/status/resultado/placares.

Os torneios são enumerados e cada documento encontrado é relido pela transação. Alterar um torneio já lido antes do commit provoca retry; o teste confirmou que o profissional recebe o valor atualizado.

**Limite não resolvido:** a enumeração não bloqueia a inclusão concorrente de um **novo** torneio fora do conjunto observado. Esse cenário não foi validado como resolvido. A atomicidade das três escritas não implica uma fotografia transacional da composição de todas as coleções de torneios. Não foi ampliado o protocolo de escrita dos torneios nesta etapa.

## Limites do Firestore

O SDK instalado documenta até 500 escritas por transação; este fluxo tem no máximo três. Não há um lote por jogador, evento ou torneio, nem divisão em commits menores. A quantidade de leituras e o tamanho do profissional derivado podem crescer com o histórico.

Continuam aplicáveis 1 MiB por documento, 10 MiB por requisição, limites de índices/regras e tempo de transação. Os limites de volume em bytes não foram exercitados na fronteira nesta etapa; não há promessa de histórico ilimitado. Erros são propagados e um commit rejeitado não publica um subconjunto das três escritas. Referências: [quotas oficiais](https://firebase.google.com/docs/firestore/quotas) e [transações Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).

O SDK pode repetir a transação até o limite configurado; foram verificadas cinco tentativas antes da rejeição por erro transitório persistente. Nenhuma política nova foi imposta a B15. Regras de produção não estão no repositório: os testes usam as regras sintéticas existentes, sem afirmar que equivalem às permissões de produção.

## Arquivos e diff isolado

**Único arquivo de produção alterado:** [AcademyService/index.ts](../../src/pages/Academy/layouts/AcademyContent/services/AcademyService/index.ts), **+73/−48 linhas**, comparado ao snapshot anterior à 6D2. [Diff completo](stage-6d2-production.patch).

Testes alterados: [unitários de Academy](../../src/test/academy.test.ts) e [integração de Academy](../../tests/integration/academy.test.ts). Foram ativados somente os dois `todo` B10 e o `todo` B17. Nenhum teste foi removido ou concorrência marcada como skip. Os demais `todo` permanecem intactos.

PlayersCrudService, helpers B20, stripHeavyData/B13, ServiceSeasons/B07, Getters e infraestrutura/guards permaneceram inalterados nesta etapa. Não houve atualização de dependências, migration, backend novo ou otimização de performance. Alterações acumuladas de etapas anteriores no working tree foram preservadas.

## Contadores e cobertura

| Métrica | Antes (6D1) | Depois (6D2) |
|---|---:|---:|
| Unitários aprovados / todo | 154 / 3 | 155 / 2 |
| Integração aprovada / todo | 132 / 6 | 155 / 4 |
| Total aprovado / todo | **286 / 9** | **310 / 6** |
| Arquivos de testes | 23 | 23 |

Foram acrescentados 21 cenários e ativadas três regressões pendentes. Os 15 testes nativos da barreira são contados separadamente. Restam B02 (1), B05 (2), B12 (1), B15 (1) e B16 (1).

| Coverage global | Antes | Depois |
|---|---:|---:|
| Linhas | 6,02% — 2.847/47.269 | **5,97% — 2.824/47.293** |
| Statements | 6,02% — 2.847/47.269 | **5,97% — 2.824/47.293** |
| Funções | 9,45% — 75/793 | **8,96% — 71/792** |
| Branches | 43,45% — 617/1.420 | **45,25% — 668/1.476** |

**A cobertura de linhas/statements e funções caiu.** As inclusões/exclusões e a coleta conjunta V8 foram mantidas. A promoção deixou de chamar `PlayersCrudService.addPlayerToSeason`; o relatório V8 final registra zero execuções desse método. Os denominadores também variam com a alteração das fontes e a instrumentação. Não foram filtrados arquivos nem acrescentados testes fora do escopo para esconder a queda. Cobertura global continua baixa e não prova ausência de todos os defeitos.

## Validação final

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Aprovado, saída 0 |
| `npm run typecheck:tests` | Aprovado, saída 0 |
| `npm run lint` | Aprovado, saída 0 |
| `npm run test:run` | 155 aprovados, 2 todo; saída 0 |
| `npm run test:integration` | 155 aprovados, 4 todo; saída 0 |
| `npm run test:coverage:all` | 310 aprovados, 6 todo; saída 0 |
| `npm run build -- --config .test-tools/stage-6d2/vite.build.config.mjs` | Aprovado, saída 0 |
| `git diff --check` | Aprovado, saída 0 |

O build usa a configuração isolada já preparada, com `envDir` apontando para um arquivo regular e valores demo fictícios, para impedir a leitura de `.env.local`. JS: 5.223,45 kB / gzip 1.681,53 kB; CSS: 143,23 kB / gzip 28,10 kB. O aviso conhecido de chunk maior que 500 kB permanece. Avisos de conversão LF/CRLF não foram erros do diff-check.

## Segurança e artefatos

**Firebase real acessado: NÃO.** Persistência somente em `demo-career-tracker-integration`, Firestore `127.0.0.1:8089` e Auth `127.0.0.1:9098`, com fixtures sintéticas. Guard de UID, bloqueio de rede externa e comportamento fail-closed preservados. UID protegido não enviado ao SDK nem publicado nos artefatos; `.env.local` não carregado.

Os 32 artefatos de baseline de performance continuam com os mesmos hashes; nenhuma bateria de performance foi repetida. **Novas regressões funcionais observadas: NÃO.** As quedas de cobertura estão explícitas acima.

Evidências: [registro verificável](stage-6d2-validation.json), [diff isolado de produção](stage-6d2-production.patch), [coverage HTML](../../coverage/index.html) e [resumo de coverage](../../coverage/coverage-summary.json). Relatório principal atualizado após as validações.
