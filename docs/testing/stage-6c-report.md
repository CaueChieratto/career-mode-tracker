# Etapa 6C — classificação por partida: B18 e B19

Data: 23/09/2026. **B18 corrigido; B19 corrigido nos fluxos de resultado descritos abaixo.** Somente esses bugs foram tratados. **B12 continua BLOQUEADO**, conforme [6B2](stage-6b2-report.md). Nenhuma etapa seguinte foi iniciada.

Entrada: 253 testes aprovados e 13 `todo`. Saída: **272 aprovados e 11 `todo`**, além dos 15 testes nativos da barreira, contados separadamente. As alterações anteriores foram preservadas. O [diff de produção](stage-6c-production.patch) e o [registro verificável](stage-6c-validation.json) comparam esta etapa ao checkpoint, não ao HEAD que já contém trabalho anterior.

## Segurança

- Projeto exclusivo: `demo-career-tracker-integration`.
- Firestore Emulator: `127.0.0.1:8089`; Auth Emulator: `127.0.0.1:9098`.
- Guard de UID e habilitação explícita de Emulator mantidos. **15 testes da barreira passaram antes dos testes destrutivos.**
- UID protegido não autenticado, consultado, enviado ao SDK, copiado ou exibido. Apenas fixtures sintéticas.
- `.env.local` da aplicação não carregado. Build com configuração isolada e valores fictícios.
- Rede externa dos processos de teste bloqueada pelo preload. Nenhum fallback para Firebase real.
- Sem alteração de Security Rules, dependências, migração, Admin SDK ou backend.
- **Firebase real acessado: NÃO.** A consulta à documentação pública sobre transações não acessou serviços nem dados do projeto.

A infraestrutura de transação delega ao SDK real. As referências de leitura/escrita são verificadas pela barreira antes do SDK; os hooks permitem injetar erros antes das escritas ou depois de um commit concluído. Conflito/retry e persistência continuam sendo executados pelo Emulator, não por armazenamento em memória.

## Diagnóstico antes do patch

Foram lidos `results.test.tsx`, `useAddDetails`, `ServiceMatches`, `ServiceTable`, `calculateTableStats`, `calculateMatchResult`, os tipos de partida/equipe/classificação e os testes de partidas/exclusão.

`getUpdatedTableTeamData` soma um jogo em toda chamada; o helper é correto como cálculo incremental, mas não identifica a partida que contribuiu. O hook decidia se deveria chamá-lo usando `match.status` do snapshot React, não o estado persistido. `ServiceTable.addTeamToTable` gerava documento automático quando a equipe não aparecia na leitura anterior. Não havia coordenação entre leitura, gravação da partida e gravações das duas equipes.

## B18 — edição e exclusão de finalizada

**Antes:** editar uma partida cujo snapshot já era `FINISHED` salvava o novo placar, mas pulava a tabela. Excluir removia stats/partida e não revertia a classificação.

**Causa:** guarda `match.status !== "FINISHED"` no hook e ausência de manutenção da tabela no serviço de exclusão. A contribuição antiga não era registrada nem recalculada.

**Reprodução:** o `todo` foi ativado antes de alterar produção. A execução falhou após editar 2×0 para 0×3: o servidor ainda retornava 3 pontos, 2 gols pró e 0 contra, quando se esperavam 0 pontos, 0 pró e 3 contra.

**Estratégia:** recalcular os contadores das equipes afetadas a partir das partidas finalizadas persistidas, substituindo o documento da partida editada ou retirando o da partida excluída do cálculo. A classificação usa a mesma identificação de liga e a mesma função de resultado existentes, incluindo a regra anterior para pênaltis. Não são somadas novamente as estatísticas antigas da linha.

O hook passa a salvar pelo serviço, que coordena resultado e tabela. A criação de uma partida já `FINISHED` também usa esse caminho. A criação comum de `SCHEDULED` conserva o fluxo anterior. A exclusão remove as `playerStats` como antes e então coordena a remoção da partida com o recálculo.

**Depois:** uma vitória editada para empate/derrota deixa apenas a contribuição atual. A exclusão zera a contribuição da partida e conserva as demais. Linhas com zero jogos são mantidas com seus IDs; não se apagam equipes porque a última partida foi removida. Nome, badge, zona e demais campos existentes permanecem; linhas não afetadas não são escritas.

**14 testes de integração B18 aprovados**, incluindo:

- Vitória → empate, vitória → derrota, empate → vitória e alteração de gols mantendo vitória; comparação de jogos, pontos, vitórias, empates, derrotas, gols e saldo das duas equipes.
- Sequência 2×0 → 0×3 → exclusão: 3 pontos/1 jogo → 0 pontos/1 jogo → 0 pontos/0 jogos.
- Exclusão de vitória, empate e derrota; stats ausentes no servidor; repetição sem duplicação ou recriação.
- Outra partida com mando invertido continua contabilizada; partida de copa não entra na classificação; outra equipe com ID distinto permanece intacta.
- Erro na leitura da tabela, na segunda equipe ou na exclusão do pai; estado persistido e nova tentativa verificados.

B18 passou isoladamente antes do início de B19. O lote inicial de B18 foi substituído pela transação na etapa seguinte para tratar conflitos de leitura.

## B19 — repetição e concorrência

**Antes:** duas chamadas com o mesmo snapshot `SCHEDULED` somavam duas contribuições. Duas leituras concorrentes da tabela vazia geravam quatro documentos, dois por equipe.

**Causa:** decisão baseada no snapshot do hook, leituras sem controle de versão e IDs novos criados por cada execução independente. Atualizações incrementais separadas não detectavam conflito.

**Reprodução após B18 verde:** o recálculo já tornou a repetição sequencial idempotente, mas o teste concorrente ainda falhou: recebeu quatro linhas em vez de duas. Somente então foi adicionada a transação.

### Transação localizada

`ServiceTable.reconcileMatch` usa `runTransaction` do Web SDK:

1. Lê a carreira e a partida dentro da transação; obtém metadados da temporada do servidor.
2. Enumera `matches` e `table` com `getDocsFromServer`, depois relê os documentos enumerados com `transaction.get` para acompanhar suas versões.
3. Monta um mapa pela identidade documental da partida, aplica a edição/exclusão e calcula somente as equipes afetadas.
4. Grava as linhas, a partida (ou sua exclusão) e `career.updatedAt` na mesma transação. Todas as leituras precedem as escritas.

As consultas de coleção do Web SDK **não são leituras transacionais de consulta**. Por isso todas as operações desse novo fluxo leem e atualizam a carreira na mesma transação. `updatedAt` avança monotonamente: uma gravação concorrente conflita mesmo quando a tabela estava vazia ou uma partida ainda não existia na enumeração. O retry refaz também as enumerações. Os documentos individuais lidos recebem ainda a proteção de versão do SDK.

Não há trava em memória, debounce ou dependência da ordem de execução. A alteração não introduz um ledger, um schema novo ou uma migração. A garantia se aplica aos fluxos que participam desse protocolo; não é uma transação global com todos os escritores da aplicação.

O SDK repete transações conflitantes e não aplica parcialmente suas escritas. Um callback pode executar mais de uma vez; por isso ele não altera estado React. Essas propriedades e a exigência de ler antes de escrever são descritas na [documentação oficial de transações](https://firebase.google.com/docs/firestore/manage-data/transactions).

### Identidade

- Partidas: chave do documento `matches/{matchId}`, não posição de array nem snapshot do hook. Uma partida ocupa uma entrada no mapa.
- Linhas existentes: ID do documento de `table`; mantido nas edições e exclusões. Não são substituídas por linhas novas.
- O modelo atual `Match` contém `homeTeam`/`awayTeam` como nomes, e `Teams` não possui ID de equipe. Não há ID de equipe na partida que possa ser utilizado sem mudar esse modelo.
- Para associar esse formato legado à linha, a busca prefere nome exato; usa nome normalizado apenas se houver correspondência única. `Rival` e `RIVAL` com IDs distintos são preservados separadamente quando há correspondência exata.
- Mais de um candidato igualmente válido causa erro antes das escritas, em vez de escolher por ordem ou fundir IDs arbitrariamente. Uma mesma linha nos dois lados da partida também é rejeitada antes de contribuir duas vezes.
- Para equipe sem linha, o ID é criado na tentativa transacional; após conflito, a nova tentativa reutiliza a linha confirmada pelo concorrente. IDs de tentativas abortadas não viram documentos.

Duplicatas históricas de mesmo nome e IDs distintos não foram apagadas nem migradas. Sem identidade adicional no documento de partida, a associação é ambígua e retorna erro. A correção evita novas duplicações nos salvamentos de resultado; não promete sanear dados históricos ambíguos.

### Estado persistido comprovado

**11 testes de integração B19 aprovados**:

- Primeiro, segundo e terceiro saves idênticos: mesmas duas linhas, mesmos IDs e contadores; repetição concorrente também conserva o estado.
- Duas chamadas lendo tabela vazia: exatamente duas linhas e uma contribuição. O teste exige pelo menos três enumerações antes da inspeção final: duas tentativas iniciais e um retry real.
- Duas partidas distintas concorrentes com as mesmas equipes: duas linhas, dois jogos por equipe, uma vitória e uma derrota, três pontos e saldo zero; ambos os documentos existem.
- Duas edições concorrentes da mesma partida: classificação equivalente ao placar que efetivamente permaneceu no servidor, sem pressupor qual chamada termina por último.
- Falha transitória recuperada, resposta perdida após commit, falha no `updatedAt` e preservação dos IDs/nomes semelhantes.
- Associação ambígua e mesma identidade dos dois lados: erro, partida anterior intacta e nenhuma contribuição adicional.

Todas as inspeções novas usam `getDocFromServer`/`getDocsFromServer` pelos helpers de integração. Não se valida persistência apenas pelo retorno do hook.

## Falhas e limites de atomicidade

| Situação | Estado/comportamento validado |
|---|---|
| Erro não recuperável ao enumerar tabela | Partida permanece no estado anterior; tabela não é parcialmente escrita |
| Erro antes da segunda linha ou de `updatedAt` | Nenhuma escrita daquela transação confirmada; nova tentativa completa |
| `unavailable` pontual antes do commit | SDK repete e conclui; uma contribuição, não duas |
| `unavailable` persistente na exclusão | Cinco tentativas esgotadas; exceção propagada, partida e tabela preservadas; sem falso sucesso |
| Falha simulada na resposta após commit | Dados já confirmados; erro propagado; repetir mantém os mesmos contadores |
| Exclusão das stats seguida de falha na transação | Stats podem já ter sido removidas; partida/tabela permanecem coerentes e a repetição conclui |

Os testes antigos de falha única foram adequados à semântica do SDK: um `unavailable` isolado agora pode ser recuperado automaticamente. Mantiveram-se as verificações de erro e de estado anterior usando erro não recuperável, além de cobertura separada de falha transitória e falha persistente com esgotamento. Nenhum teste foi removido, enfraquecido para aceitar duplicação ou marcado como skip.

A transação cobre partida, linhas afetadas e atualização da carreira; **não cobre a remoção anterior de toda a subcoleção `playerStats`**, nem escritores externos que não participem desse protocolo. Edições manuais da tabela continuam no fluxo anterior. Os limites/retries normais do Firestore continuam aplicáveis; erro final propaga ao chamador.

Fonte do recálculo: subcoleção moderna `matches`, já utilizada pelos serviços. A conciliação de partidas exclusivamente embutidas no legado (B05) não foi alterada. Contadores das equipes afetadas tornam-se derivados dessas partidas de liga; valores manuais dessas mesmas linhas não são somados como uma contribuição adicional. Linhas não afetadas permanecem intactas. Não foi executado recálculo global/migração de temporadas.

## Arquivos e diff

| Arquivo de produção | Alteração | Linhas + / − |
|---|---|---:|
| `ServiceMatches/index.ts` | Encaminha edição/exclusão e criação já finalizada para a operação coordenada | +7 / −22 |
| `ServiceTable/index.ts` | Expõe a operação localizada | +2 / −0 |
| `ServiceTable/reconcileMatch.ts` | Recálculo, identidade e transação | +79 / −0 |
| `useAddDetails.ts` | Retira incremento dependente do snapshot do hook | +1 / −97 |
| **Total** | **4 arquivos, sem reorganizar serviços** | **+89 / −119** |

Os caminhos completos constam no [patch](stage-6c-production.patch). Testes/infraestrutura alterados: `tests/integration/results.test.tsx`, `tests/integration/deletion.test.ts`, `tests/integration/firestoreBoundary.ts` e `src/test/mocks/firestore.ts`. Os helpers matemáticos existentes foram reutilizados sem alteração.

## Testes, cobertura e validação final

| Métrica | Antes | Depois |
|---|---:|---:|
| Unitários aprovados | 152 | 152 |
| Integração aprovada | 101 | 120 |
| Total aprovado | 253 | **272** |
| `todo` unitários | 4 | 4 |
| `todo` integração | 9 | 7 |
| Total `todo` | 13 | **11** |
| Arquivos Vitest | 22 | 22 |
| Testes da barreira, separados | 15 | 15 |

O aumento de 19 aprovações corresponde a dois `todo` ativados e 17 casos adicionais. A regressão B18 original de vencer/editar/excluir está ativa; a B19 original de repetição/concorrência está ativa e complementada pela reprodução concorrente com expectativa corrigida. Permanecem os `todo` de B02, B05, B07, B10, B12, B15, B16 e B17.

| Cobertura conjunta V8 | Antes | Depois |
|---|---:|---:|
| Linhas/statements | 6,07% (2.874/47.305) | **5,94% (2.809/47.275)** |
| Funções | 9,14% (72/787) | **9,22% (73/791)** |
| Branches | 40,39% (547/1.354) | **42,98% (604/1.405)** |

A queda de linhas é real e não foi ocultada por filtros: foi retirado código incremental anteriormente exercitado e o hook deixou de passar pelos antigos métodos avulsos de escrita da tabela. O denominador continua incluindo toda a aplicação, inclusive arquivos não testados. O aumento dos casos de integração não implica aumento de toda métrica global de cobertura.

| Comando final | Resultado |
|---|---|
| `npm run typecheck` | Aprovado, exit 0 |
| `npm run typecheck:tests` | Aprovado, exit 0 |
| `npm run lint` | Aprovado, exit 0 |
| `npm run test:run` | 152 aprovados, 4 `todo`, exit 0 |
| `npm run test:integration` | 120 aprovados, 7 `todo`, exit 0 |
| `npm run test:coverage:all` | 272 aprovados, 11 `todo`, 22 arquivos, exit 0 |
| `npm run build -- --config .test-tools/stage-6c/vite.build.config.mjs` | Aprovado, exit 0 |
| `git diff --check` | Aprovado, exit 0 |

O build mantém o isolamento da etapa anterior, com `envDir` apontando para arquivo e parâmetros fictícios do projeto demo. Não é artefato para publicação. Aviso preexistente de chunk grande mantido, sem otimizações de bundle. Avisos LF/CRLF do Git não foram erros de diff; o aviso de MOTD da CLI decorre do bloqueio de rede.

Novas regressões observadas: **NÃO**. B08/B09/B13/B14 e demais correções anteriores permaneceram verdes. B12 segue explicitamente bloqueado, sem mudança em `Deleters` ou na análise de órfãos. Nada foi implementado para os outros bugs excluídos do escopo.

Os 32 artefatos do baseline de performance conservam seus hashes. Não foram alterados listeners, `useCareers`, navegação, cache, assets ou configuração de bundle; nenhum benchmark foi repetido. A coordenação transacional exige leituras específicas e retries sob conflito; esta etapa não mede seu impacto de latência nem afirma equivalência de performance com o fluxo incorreto anterior.
