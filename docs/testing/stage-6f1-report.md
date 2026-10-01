# Etapa 6F1 — caracterização de B16

Etapa concluída em 24/09/2026. **B16 não foi corrigido. Nenhum arquivo de produção foi alterado nesta etapa.** Foram adicionados 25 testes de caracterização em `tests/integration/lineup-characterization.test.ts`; o `todo` original de B16 foi preservado.

O objetivo foi fechar a cobertura de múltiplas exclusões, estados parciais, retry e concorrência antes de escolher a correção. B12 e B15 permanecem BLOQUEADOS e não tiveram seus testes alterados. Nenhuma etapa de performance foi iniciada.

## Fluxo real recuperado

Arquivos lidos, sem alterações:

- `tests/integration/lineup.test.ts`, `src/test/lineup.test.ts` e `src/test/playerStats.test.ts`;
- `src/pages/Match/services/ServiceLineup/index.ts`;
- `src/pages/Match/components/LineupTab/helpers/buildLineupStatsUpdate/index.ts` e `getLineupPlayerIds/index.ts`;
- `src/pages/Match/components/LineupTab/hooks/useLineupPersistence/index.ts`;
- `src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/services/savePlayerMatchStats/index.ts`, `buildPlayerStats` e o cálculo de minutos de substituição;
- `src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches/index.ts`;
- interfaces `SavedLineup` e `PlayerMatchStat`.

Neste relatório, `M` é `users/{uid}/careers/c1/seasons/s1/matches/m1`.

| Fonte | Caminho / campo | Papel |
|---|---|---|
| Moderna | `M/playerStats/{playerId}` | Documento de estatísticas individuais daquela partida |
| Embutida | `M.playerStats[]` | Array no pai; pode existir sem subcoleção |
| Escalação | `M.lineup` | Snapshot completo de goleiro, titulares, reservas e formação |
| Metadados | `users/{uid}/careers/c1.updatedAt` | Atualizado após a gravação do pai |

`buildLineupStatsUpdate` reúne IDs do goleiro, titulares e banco, filtra o array recebido e devolve os IDs fora da escalação. Não consulta Firestore nem remove fichas por nome. O array de IDs removidos pode conter repetições se o array de entrada tiver fichas repetidas.

`saveLineupToMatch` executa, nesta ordem:

1. Cria um `deleteDoc` por ID removido, todos iniciados por `map` e aguardados com `Promise.all`.
2. Grava `{ lineup, playerStats }` no pai usando `setDoc(..., { merge: true })`.
3. Atualiza `career.updatedAt` separadamente.

Não há batch, transação, leitura de versão ou cancelamento das exclusões irmãs após uma rejeição. O serviço grava o snapshot recebido; não recalcula o pai a partir de uma nova leitura.

`ServiceMatches.getMatchesBySeason` lê os pais e suas subcoleções `playerStats`. Se a subcoleção está vazia, retorna o array embutido como está. Se existem documentos modernos, usa um mapa: primeiro insere o embutido, depois sobrescreve pelo ID do documento moderno. Portanto, **a ausência de uma ficha moderna não representa uma exclusão confirmada**: a ficha embutida continua sendo fallback. Esse comportamento também é necessário para dados exclusivamente legados e não deve ser simplesmente removido como solução de B16.

`savePlayerMatchStats` tem outro encadeamento: grava a ficha do jogador, opcionalmente grava a contraparte de substituição e retorna um array atualizado em memória. Não grava esse array no pai. A contraparte com minutos já definidos é preservada. A criação das duas fichas também é sequencial e pode parar entre elas.

## Infraestrutura de observação

Foi reutilizado, sem alteração, `firestoreBoundary.ts`: hooks antes/depois de `deleteDoc`, `setDoc` e `updateDoc`, com chamadas delegadas ao SDK real. Barreiras determinísticas controlam a ordem, sem depender de sleeps ou de resultados aleatórios de corrida.

Os estados são inspecionados por `getDocFromServer`/`getDocsFromServer`, via `read`/`list`, e por `ServiceMatches.getMatchesBySeason`, o fluxo real que reconcilia estatísticas. As comparações distinguem documentos modernos, array embutido, estatísticas lidas pela aplicação, lineup e timestamp. Não foi necessário adaptar produção, mocks de persistência ou guards.

Uma rejeição real do pai foi exercitada: após as exclusões, o teste encerra a sessão sintética antes do `setDoc`; o Firestore Emulator rejeita a gravação com `permission-denied`. O login da fixture é restaurado para inspeção e retry. As demais falhas são injeções explícitas antes/depois de operações, e não são apresentadas como falhas espontâneas do servidor.

## B16-A — falha parcial

### Reprodução original

Estado inicial: A está em `M/playerStats/A` e no array `M.playerStats`. A escalação também contém A. Após excluir a ficha moderna de A, uma falha injetada antes do `setDoc` do pai deixa:

- documento moderno de A: inexistente na releitura do servidor;
- array embutido: ainda contém A;
- `ServiceMatches.getMatchesBySeason().playerStats`: contém A novamente;
- lineup: permanece o snapshot anterior;
- `updatedAt`: permanece o valor inicial.

**B16 reproduzido: SIM.** O atleta reaparece pelas estatísticas embutidas. O teste anterior que caracteriza esse defeito e seu `todo` permaneceram intactos.

### Múltiplas exclusões e estados parciais

A e B são removidos na mesma operação. C permanece titular e D permanece reserva; C/D têm minutos, notas, gols, assistências, eventos e vínculo de substituição C ↔ D. A fixture contém quatro atletas para verificar também o banco. A tabela mostra somente a presença de A/B; C/D são preservados em todas as linhas.

| Falha / momento controlado | Moderno A/B | Embutido A/B | `playerStats` da aplicação | Lineup | `updatedAt` |
|---|---|---|---|---|---|
| Antes de ambas as exclusões; ambos os hooks rejeitam | A, B | A, B | A, B | Antigo | Antigo |
| Após excluir A, antes de excluir B | B | A, B | A, B | Antigo | Antigo |
| Após A/B excluídos; erro depois da exclusão de B | Nenhum | A, B | A, B | Antigo | Antigo |
| Antes de gravar o pai | Nenhum | A, B | A, B | Antigo | Antigo |
| Pai rejeitado pelo servidor com `permission-denied` | Nenhum | A, B | A, B | Antigo | Antigo |
| Depois de o pai ser gravado; erro na resposta injetado | Nenhum | Nenhum | Nenhum | Novo, C/D | Antigo |
| Antes da atualização de `updatedAt` | Nenhum | Nenhum | Nenhum | Novo, C/D | Antigo |
| Depois de `updatedAt`; erro na resposta injetado | Nenhum | Nenhum | Nenhum | Novo, C/D | Atualizado |

Assim, uma rejeição da Promise não identifica sozinha o estado persistido. Pode significar nenhuma remoção, remoção parcial, ambas as exclusões com pai antigo, lineup já salvo sem timestamp novo ou operação inteiramente persistida cuja resposta falhou.

#### Exclusão ainda em andamento após a rejeição

Um teste bloqueia B antes de sua chamada ao SDK e faz A falhar. `Promise.all` rejeita, mas não cancela B. Logo após o erro, A/B continuam modernos; ao liberar B, apenas A permanece moderno. Em ambos os momentos A/B aparecem pelo pai antigo.

Outro teste inicia o retry antes de liberar a exclusão antiga de B. O retry remove A/B e grava C/D; quando a exclusão antiga termina, ela elimina um documento já ausente e não desfaz a recuperação. Esse resultado foi observado para **a mesma intenção de remoção**, sem inclusão concorrente de outro jogador.

### Origens e divergência entre fontes

Todos estes casos falham antes de atualizar o pai, após tentar excluir A/B modernos; em seguida executam retry e repetição. A tabela mostra novamente apenas A/B.

| Origem inicial | Moderno após falha | Embutido após falha | Estatísticas lidas pela aplicação |
|---|---|---|---|
| Somente subcoleção | Nenhum | Nenhum | A/B ausentes |
| Somente embutido | Nenhum | A, B | A/B presentes |
| Ambas idênticas | Nenhum | A, B | A/B presentes |
| Ambas divergentes | Nenhum | A, B antigos | A/B reaparecem com os valores antigos |
| A somente moderno; B somente embutido | Nenhum | B | Somente B reaparece |
| A somente embutido; B somente moderno | Nenhum | A | Somente A reaparece |

Na fonte divergente, A tem 10 gols modernos e 1 gol embutido: antes da falha a aplicação lê 10, depois da exclusão moderna lê 1. Há regressão de valor, além da presença indevida.

No caso somente moderno, A/B não reaparecem em `playerStats`, mas o **lineup antigo continua persistido** porque a escrita do pai falhou. Não foi confundida a ausência de estatísticas com o sucesso completo da alteração da escalação.

### Retry e repetição após sucesso

Para os oito pontos de falha e as seis origens, o retry relê pelo serviço real, recalcula `buildLineupStatsUpdate` com a mesma intenção de remover A/B e salva sem a falha. Resultado observado:

- A/B ausentes na fonte moderna, no embutido e na leitura mesclada;
- C/D preservados, sem duplicação nem recuperação de estatísticas antigas de A/B;
- lineup final com C titular e D reserva;
- valores de C/D, inclusive minutos e substituições, preservados;
- timestamp da carreira atualizado.

As repetições posteriores conservaram pai, subcoleção e leitura da aplicação. Há também um teste de três chamadas com **exatamente o mesmo payload e os mesmos `removedPlayerIds: ['A', 'B']`**, inclusive quando ambos já não existem: todas concluem, sem corrupção.

A operação é idempotente quanto aos dados de lineup/stats nesse replay e nos retries observados. **Não é identidade byte a byte da carreira inteira**, pois `updatedAt` pode avançar a cada chamada bem-sucedida. Não foi implementado mecanismo novo de idempotência.

### Quantidade e identidade das fichas

O writer oficial usa `playerStat.playerId` como ID do documento: uma ficha moderna canônica por jogador **por partida**. O mesmo jogador pode ter outra ficha em outra partida. O teste mantém A em `m2`, remove A de `m1` e comprova que pai, documento e leitura de `m2` permanecem intactos.

O array embutido permite estruturalmente entradas repetidas. Foram testados dois registros de A:

- sem documentos modernos, a leitura conserva ambas as entradas; o helper produz A duas vezes e o serviço emite duas exclusões para o mesmo caminho, ambas sem erro;
- com fonte moderna, o mapa da leitura consolida A e o helper emite uma exclusão;
- nos dois casos, a gravação final remove todas as entradas de A do pai, preserva C/D e permite repetição.

Não foi inferida necessidade de exclusão recursiva nem de busca global de fichas. Caminhos históricos não canônicos, cujo ID de documento difira de `playerId`, não são produzidos pelo writer examinado e não foram normalizados nesta etapa.

#### Fichas de titular e contraparte

Dois casos adicionais exercitam `savePlayerMatchStats` com C/D já persistidos e A/B como nova dupla de substituição:

| Falha | Moderno | Embutido | Aplicação |
|---|---|---|---|
| Antes de gravar B | A com 60 minutos; B ausente; C/D intactos | Somente C/D | A, C, D |
| Após gravar B, antes de retornar | A com 60 e B com 30 minutos; C/D intactos | Somente C/D | A, B, C, D |

O retry da mesma edição completa a dupla. Nova execução a partir da releitura mantém os documentos e preserva B com minutos já definidos. A remoção posterior da dupla por `saveLineupToMatch` também converge. O array embutido não é atualizado por `savePlayerMatchStats` isoladamente; isso é o contrato atual observado, não uma alteração proposta.

### Contrato esperado de B16-A

Contrato mínimo derivado do defeito e dos testes, ainda não implementado:

1. Uma remoção confirmada deve publicar de modo consistente a exclusão das fichas modernas, a retirada das cópias embutidas e o lineup correspondente; o fallback legado não deve ressuscitar uma ficha removida por essa operação.
2. Rejeição anterior ao commit não deve deixar a metade da remoção publicada. Uma resposta perdida após commit pode deixar o resultado confirmado no servidor; retry deve ser seguro, sem exigir rollback fictício de uma operação já persistida.
3. A mesma intenção de remoção, após falha ou sucesso, deve convergir sem duplicatas nem perda de dados dos atletas mantidos. Atualização de timestamp pode ocorrer novamente.
4. C/D, titulares/reservas, minutos, substituições e dados não relacionados devem ser preservados; outras partidas do mesmo jogador não podem ser atingidas.
5. O legado legítimo precisa continuar recuperável quando não há representação moderna. Ignorar todo embutido na leitura não satisfaz esse contrato.

**B16-A: PRONTO PARA CORREÇÃO LOCALIZADA.** O problema originalmente catalogado é a falha entre escritas da mesma remoção. A cobertura agora inclui uma e múltiplas remoções, falha após a primeira ou várias exclusões, retry, replay e fontes modernas, legadas e mistas. O retry observado converge preservando os atletas mantidos. Os caminhos de escrita são conhecidos e locais à partida/carreira; não há necessidade demonstrada de mudança arquitetural nem decisão de domínio para eliminar esse intervalo parcial.

Para uma futura 6F2 limitada a B16-A, recomenda-se avaliar um **batch atômico das exclusões conhecidas, pai/lineup e timestamp**, preservando payloads e fallback legítimo. Devem ser verificados limites de quantidade/tamanho e a semântica de erro depois do commit. Isso é uma recomendação, não implementação. O contrato cobre a remoção e seus retries; não promete resolver sobrescritas por outro snapshot concorrente, tratadas separadamente em B16-B.

## B16-B — concorrência

Dois testes executam serviços reais com o mesmo snapshot inicial e controlam ambas as ordens de publicação do pai:

1. Operação 1 pretende remover A e fica pausada antes do pai, após excluir A moderno.
2. Operação 2 pretende remover B, exclui B moderno, grava o pai contendo A/C/D e retorna sucesso.
3. Operação 1 é liberada, grava seu snapshot contendo B/C/D e também retorna sucesso.

Estado final: **A/B modernos ausentes, B embutido presente e B reaparecendo na aplicação**. Invertendo a ordem, A reaparece. O último snapshot completo de lineup/pai vence; as exclusões modernas das duas operações se acumulam. C/D e dados não relacionados permanecem íntegros. Uma nova intenção explícita de remover ambos recupera o estado, conforme os testes.

Portanto, concorrência foi reproduzida com segurança, sem alteração de produção. **Um batch que apenas envolva as mesmas escritas não resolve, sozinho, o conflito semântico entre dois snapshots antigos.** Ele resolve o intervalo de falha parcial, mas o último payload ainda pode conter o atleta removido pela outra operação.

### Classificação de B16-B: DECISÃO NECESSÁRIA

O código demonstra substituição integral pelo último snapshot, mas não permite inferir com segurança se a política desejada é combinar remoções ou rejeitar uma operação obsoleta. O serviço não recebe versão esperada nem distingue reinclusão intencional de um atleta presente em snapshot antigo. Não foi escolhida uma nova política.

**B16-B é uma questão separada de concorrência; não bloqueia a correção localizada de B16-A.** Há perda de intenção observada, mas o resultado de domínio pretendido ainda exige definição. Não há evidência de necessidade de nova arquitetura, backend ou migration.

### Estratégias futuras para B16-B, sem escolha ou implementação

| Estratégia | Risco / impacto geral |
|---|---|
| Transaction com releitura dos documentos dentro da transaction | Permite detectar mudanças e recompor ou rejeitar a operação; apenas envolver o mesmo payload antigo não elimina o conflito semântico. Callbacks sujeitos a retry precisam ser seguros |
| Versão/revision esperada pelo chamador | Detecta snapshot obsoleto; exige definir token, momento de validação e feedback/retry de conflito |
| Operação baseada em delta | Expressa remover A/remover B em vez de substituir o array inteiro; precisa distinguir remoção, reinclusão e edição intencionais |
| Reconciliação por ID sobre estado relido | Pode preservar mudanças independentes; exige regra explícita para conflitos no mesmo atleta e no lineup completo |

Rejeição não cancela operações irmãs; resposta perdida não prova rollback; timestamp sozinho não descreve o estado do pai; arrays podem estar antigos ou repetidos. Nenhuma dessas alternativas foi implementada, e a etapa 6F2 não foi iniciada.

## Integridade do código

A diferença **922 vs 938** envolve escopo e momento, não perda de arquivos nesta etapa:

| Snapshot / escopo | Produção (`src` sem `src/test`) | Testes/mocks/fixtures em `src/test` | Total `src` |
|---|---:|---:|---:|
| Snapshot anterior da 6B1, que documenta 938 | 920 | 18 | 938 |
| Início e fim da 6F1 | 922 | 20 | 942 |

Entre esses snapshots foram adicionados em etapas anteriores, sem remoções de arquivos:

- `src/layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable/reconcileMatch.ts` (6C);
- `src/test/addSeasonFeedback.test.tsx` (6D1);
- `src/common/helpers/mergeModernAndLegacy.ts` e `src/test/rawPlayerEditing.test.tsx` (6E).

Portanto, **922 + 20 = 942**, e **938 + 4 = 942**. Os 942 arquivos atuais de `src`, incluindo testes, foram comparados ao snapshot da própria 6F1 e permanecem idênticos. O novo teste 6F1 fica em `tests/integration`, fora de `src`. A referência histórica a 922 arquivos *não alterados* no relatório 6A tinha outro denominador (938 menos 16 alterados), e não deve ser confundida com os 922 arquivos de produção atuais.

## Escopo, segurança e validações

O snapshot `.test-tools/stage-6f1/before.json` preserva 1.006 arquivos anteriores. Os **922 arquivos de produção e os 32 artefatos de performance permanecem idênticos por hash**. Também permaneceram intactos todos os testes preexistentes, incluindo B12, B15 e o `todo` B16, dependências, configurações, regras e adapters de teste.

**Arquivos de produção alterados: ZERO.** O único arquivo novo de teste é `tests/integration/lineup-characterization.test.ts`; documentação e evidências da etapa são separadas. Não houve patch de B16.

**Firebase real acessado: NÃO.** Persistência restrita a fixtures sintéticas em `demo-career-tracker-integration`, Firestore `127.0.0.1:8089` e Auth `127.0.0.1:9098`. Guard de UID, bloqueio de rede externa e fail-closed preservados. UID protegido não foi enviado ao SDK. `.env.local` não foi carregado. Os 15 testes nativos do guard passaram, contabilizados separadamente.

Os testes focados finais passaram: **32 aprovados e 1 `todo`**, sendo 25 casos novos e sete aprovações preexistentes. Os três `todo` globais continuam sendo B12/B15/B16. As expectativas novas descrevem expressamente o comportamento atual, inclusive o defeito; não substituem nem ativam a regressão desejada de B16.

### Validação final concluída

| Comando | Resultado |
|---|---|
| `npm run test:integration -- tests/integration/lineup-characterization.test.ts tests/integration/lineup.test.ts` | Aprovado: 32 testes, 1 `todo` |
| `npm run typecheck` | Aprovado |
| `npm run typecheck:tests` | Aprovado |
| `npm run lint` | Aprovado |
| `npm run test:run` | Aprovado: 162 testes, 13 arquivos |
| `npm run test:integration` | Aprovado: 200 testes, 3 `todo`, 14 arquivos |
| `npm run test:coverage:all` | Aprovado: 362 testes, 3 `todo`, 27 arquivos |
| `npm run build -- --config .test-tools/stage-6f1/vite.build.config.mjs` | Aprovado; configuração isolada demo, sem carregar `.env.local` |
| `git diff --check` | Aprovado |

Todos os nove comandos terminaram com código 0; nenhum ficou recusado ou não executado. O build apresentou o aviso existente de chunk grande, sem ajuste de bundle. O Git apresentou avisos de conversão futura LF/CRLF, sem erros de whitespace nem alteração de configuração.

| Métrica | Antes (6E) | Depois (6F1) |
|---|---:|---:|
| Testes aprovados | 337 | 362 |
| `todo` | 3 | 3 |
| Arquivos de teste | 26 | 27 |
| Linhas / statements | 6,97% (3287/47139) | 6,97% (3287/47139) |
| Funções | 10,58% (85/803) | 10,58% (85/803) |
| Branches | 46,93% (719/1532) | 47,03% (722/1535) |

Os números de cobertura são os totais emitidos pelo V8, com o mesmo escopo de configuração; o aumento do denominador de branches acompanha os caminhos adicionais observados, sem mudança de produção. Os hashes confirmam essa ausência de mudanças. Não houve ativação de regressões `todo`, remoção de testes ou nova regressão funcional observada. Os testes novos caracterizam defeitos existentes, não demonstram sua correção.

O [registro verificável da 6F1](stage-6f1-validation.json) contém os nove resultados, contadores antes/depois, hashes de produção e performance, e conclusões separadas de B16-A/B16-B. Diff de produção desta etapa: **zero arquivos, +0/−0 linhas**, comparado ao checkpoint 6F1; o diff acumulado do repositório inclui etapas anteriores e não foi desfeito. O arquivo de testes permaneceu idêntico durante esta retomada. B12/B15 continuam BLOQUEADOS; B16 permanece sem correção; 6F2 não foi iniciada.
