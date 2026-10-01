# Etapa 6B2 — B08 corrigido; B12 bloqueado

Data: 23/09/2026. Continuação do checkpoint, sem Undo e sem reiniciar B08. **B08: CORRIGIDO na árvore alcançável descrita abaixo. B12: BLOQUEADO. A etapa não está integralmente concluída.** Nenhuma etapa seguinte foi iniciada.

O checkpoint de entrada tinha 238 testes aprovados e 15 `todo`. Foram preservadas as correções das etapas 6A/6B1. Somente um arquivo de produção mudou nesta etapa: `src/common/services/ServiceSeasons/index.ts`, **+11 / −12 linhas**, comparado ao snapshot anterior à 6B2, não ao HEAD que contém outras alterações anteriores. Veja o [diff isolado](stage-6b2-production.patch) e o [registro de validação](stage-6b2-validation.json).

## Segurança verificada antes de exclusões

Os **15 testes da barreira** já aprovados no checkpoint foram preservados. Cobrem project IDs incorretos/ausentes, hosts incorretos/ausentes, flag ausente/incorreta, preload ausente, guard ausente/vazio, caminho protegido barrado antes do SDK e identidade sintética permitida. Não foi necessário repeti-los nesta retomada: não houve alteração da barreira depois desses resultados. A suíte completa voltou a validar isolamento A/B e bloqueio de rede.

| Proteção | Estado final |
|---|---|
| Project ID | `demo-career-tracker-integration` |
| Firestore | `127.0.0.1:8089` |
| Auth | `127.0.0.1:9098` |
| Habilitação explícita | `TEST_EMULATOR_ENABLED=1` |
| Guard local | Ativo; ausência provoca aborto, sem fallback |
| UID protegido | Nunca autenticado, consultado, semeado, enviado ao SDK ou impresso |
| `.env.local` da aplicação | Não carregado |
| Rede externa dos processos de teste | Bloqueada pelo preload antes de CLI/Vitest/SDK |
| Persistência | Exclusivamente nos emuladores, em fixtures sintéticas |
| Firebase real acessado | **NÃO** |

O guard interpreta exclusivamente `PROTECTED_USER_UID` para bloqueio e não publica seu valor. As identidades das fixtures são determinadas e verificadas antes da autenticação. A barreira verifica referências antes da chamada ao SDK, inclusive helpers de inspeção do servidor. Falta de configuração aborta.

A antiga limpeza global foi substituída por limpeza limitada aos dois usuários sintéticos conhecidos. O helper de reset usa REST local com a credencial especial do Emulator para enumerar também ancestrais ausentes; isso é infraestrutura de teste, **não capacidade disponível ao cliente de produção**. Não foi instalado Admin SDK. Regras, dependências e schema não foram alterados. A consulta a documentação pública nesta análise não acessou dados, credenciais nem serviços do projeto Firebase real.

O comando interrompido anteriormente não havia sido executado: o auto-review informou limite de uso e impossibilidade de concluir a revisão, não uma determinação de insegurança. Nesta retomada os comandos foram executados diretamente, sem o redirecionamento anterior, e aprovados pela revisão normal.

## B08

**Status: CORRIGIDO.** A exclusão foi validada com **11 testes de integração identificados como B08 e 2 unitários B08**. Testes preexistentes adicionais de falha e preservação de legado também continuam passando.

### Causa e alteração

Antes, `deleteSeason` enumerava apenas `players` e `academyPlayers`, removia o documento da temporada e atualizava `clubData`. Partidas, estatísticas, tabela e torneios permaneciam. O teste original reproduziu essa sobra antes do patch.

Agora enumera do servidor as coleções reais, exclui cada documento e aguarda cada escrita. Estatísticas são removidas antes da respectiva partida. Documento da temporada e referência em `clubData` são removidos por último. O comportamento conservador de B13 para temporadas sobreviventes foi mantido.

Árvore removida para `users/{uid}/careers/{careerId}/seasons/{seasonId}` conhecido:

```text
seasons/{seasonId}                    documento, quando presente
  players/{playerId}
  academyPlayers/{academyPlayerId}
  table/{tableId}
  academyTournaments/{tournamentId}
  matches/{matchId}
    playerStats/{playerId}
career.clubData                       apenas a entrada de seasonId
```

As coleções foram conferidas no código de serviços de jogadores, partidas, tabela e academia. Históricos, escalações e jogos dos torneios de academia são campos embutidos nos respectivos documentos; não foram inventadas subcoleções para eles. Configuração de academia e outros campos da carreira permanecem.

### Sucesso, repetição e falha

- Temporada populada: documento, filhos e referência ausentes após leitura direta do servidor.
- Temporada vazia/coleções vazias: operação válida, carreira preservada.
- Repetição: continua sem recriar filhos; também conclui após falha na atualização final dos metadados.
- Falhas injetadas antes de sete exclusões relevantes e na atualização de metadados: erro propagado; nova tentativa conclui. Erro de enumeração do servidor também não vira sucesso.
- Exclusões anteriores à falha permanecem aplicadas. **Não há atomicidade nem rollback da árvore.** Os metadados são mantidos até a última escrita, permitindo repetir o fluxo normal.
- Isolamento: temporada irmã, carreira A2, carreira B1 de outro usuário e grupo externo semanticamente preservados. A carreira A1 permanece, com apenas a temporada escolhida retirada dos metadados. Os cenários B13 confirmam preservação de dados legados das outras temporadas.

Limite explícito: o patch enumera `playerStats` através dos documentos de `matches` existentes. **Não é uma limpeza universal de órfãos históricos**: estatísticas cujo documento de partida e todo ID recuperável já se perderam ficam fora dessa descoberta, assim como uma temporada cujo ID se perdeu. O experimento B12 abaixo demonstra essa restrição. O status B08 não promete eliminar esse estado histórico invisível nem resolver concorrência de criação durante exclusão (B15 permanece fora do escopo).

Dois `todo` de B08 tornaram-se ativos: exclusão de temporada vazia/repetida no Emulator e falha de leitura sem falso sucesso no unitário. A reprodução antiga foi fortalecida para exigir a remoção de todos os ramos conhecidos. Nenhum teste foi removido.

## B12

**Status: BLOQUEADO. Nenhum patch de produção aplicado a B12; a regressão completa permanece `todo`.** Não foi implementada uma exclusão parcial que retornasse sucesso como se estivesse completa.

### Comportamento atual e causa

`deleteCareerFromFirestore` lê a carreira, percorre apenas temporadas em `clubData`, exclui partidas enumeráveis e suas estatísticas e então remove a carreira. Não exclui os demais ramos nem o documento da temporada. Se a carreira já não existe, retorna imediatamente, portanto repetir não limpa as sobras. Se uma exclusão de partida falha, a exceção propaga e o pai permanece, mas estatísticas já removidas não são restauradas.

A reprodução existente continua passando como **teste de bug conhecido**, não como correção: depois do retorno de sucesso, carreira/partida/stats desapareceram, enquanto temporada, jogadores, tabela, base, torneios e jogador da temporada órfã permanecem. A repetição mantém essas sobras.

Além das coleções omitidas, existe uma segunda causa: IDs e documentos pais podem se perder. Uma enumeração de documentos existentes não é inventário de todos os caminhos com descendentes.

### A. Estrutura alcançável pelo cliente atual

| Informação disponível | Documentos descobríveis com o Web SDK, sujeitos às regras |
|---|---|
| `uid` e `careerId` conhecidos | Documento da carreira e seus campos embutidos |
| Temporada em `clubData` | As cinco coleções diretas conhecidas, mesmo sem documento da temporada |
| Documento da temporada existe, ID ausente de `clubData` | ID obtido por listagem de `seasons`; seus ramos conhecidos ficam alcançáveis, embora o deleter atual não faça essa união |
| Partida existente em `matches` | Seu ID e a coleção `playerStats` |
| Caminho completo conhecido por outra fonte persistida | Leitura direta do descendente, mesmo sem ancestral existente |

A união de IDs dos metadados e de documentos reais de `seasons` ampliaria a parte alcançável; não provaria completude. O SDK instalado expõe `collectionGroup(firestore, collectionId)`, sem parâmetro de ancestral, e não oferece `listCollections`/`listDocuments(showMissing)` públicos. A documentação distingue explicitamente enumeração administrativa de subcoleções e consultas Web. [Referência oficial](https://firebase.google.com/docs/firestore/query-data/get-data#list_subcollections_of_a_document).

### B. Estrutura que pode ficar invisível

- Todos os ramos sob temporada sem documento pai e sem ID nos metadados/fontes recuperáveis.
- `playerStats` sob uma partida sem documento e sem ID recuperável, mesmo conhecendo a temporada.
- Descendentes de carreira cujo documento foi apagado: o código atual retorna sem enumerá-los. Conhecer o `careerId` ainda permite percorrer apenas ramos cujos próximos IDs estejam disponíveis.

“Invisível” significa **não descoberto pelo percurso atual**, não apagado ou impossível de recuperar por uma capacidade administrativa autorizada. Excluir documento não exclui subcoleções, e ancestrais ausentes não surgem nas consultas normais. [Semântica oficial de exclusão](https://firebase.google.com/docs/firestore/manage-data/delete-data#delete_documents).

### Reprodução local, sem alteração de produção

`tests/integration/deletion-scope.test.ts` contém quatro experimentos, todos aprovados:

1. Cria carreira com `s1` nos metadados, documento `s1` e `s1/players/p1`. Confirma listagem inicial com `s1`. Apaga **somente** o documento da temporada e remove `clubData`. O servidor retorna temporada ausente, metadados vazios e listagem de `seasons` vazia, mas `players/p1` intacto. Consultar `s1/players` funciona somente porque o teste conservou o ID: isso não é redescoberta.
2. Sem documento da temporada, mas com seu ID em `clubData`, o cliente recupera `academyPlayers` usando o ID armazenado.
3. Apaga somente uma partida. A listagem de `matches` fica vazia, mas a leitura direta de sua estatística confirma que ela sobrevive.
4. Tenta uma consulta `collectionGroup('players')` limitada por referências em `documentId()` à carreira sintética A1. O servidor rejeita com `permission-denied`. A fixture inclui também a carreira de ID semelhante `c10`; nenhum resultado é usado para exclusão.

O comando específico B12 aprovou **5 testes**, contando os quatro diagnósticos e a reprodução original, e manteve **1 `todo`**. Nenhum diagnóstico foi convertido em alegação de sucesso da exclusão. Não há teste de B12 corrigido provando A1 totalmente ausente com A2/B1 preservadas, porque nenhuma estratégia completa foi implementada.

### Por que `collectionGroup` foi negado

O erro observado pertence às **regras sintéticas inalteradas** em `tests/integration/firestore.test.rules`. Elas autorizam caminhos sob `/users/{uid}/careers/{careerId}/{rest=**}` para o usuário correspondente; não há regra explícita para cada collection group. Já usam versão 2, portanto a causa não é falta dessa versão. O Emulator rejeitou a consulta global do grupo mesmo com o intervalo de nomes; não a aceitou como equivalente à consulta direta do caminho.

Consultas de grupo precisam de autorização correspondente e as regras verificam o conjunto potencial de resultados, não filtram uma leitura global depois de executada. A documentação apresenta regras específicas de grupo e filtros por proprietário. [Regras oficiais para consultas](https://firebase.google.com/docs/firestore/security/rules-query#collection_group_queries_and_security_rules).

Conclusão: **a negação concreta é das regras sintéticas; a possibilidade em produção é desconhecida**. Uma solução cliente exigiria um modelo de consulta cuja autorização fosse comprovada nas regras reais, e ajustes nelas caso não suportem esse modelo. Não é correto afirmar que o Web SDK jamais encontra órfãos: consultas de grupo autorizadas podem encontrar descendentes sem pai. Também não é correto afirmar que funcionaria em produção. As regras reais não foram fornecidas nem acessadas. Nenhuma regra foi relaxada para obter um resultado positivo.

### Estratégias possíveis — documentadas, não implementadas

| Estratégia | O que resolve | Limite/impacto |
|---|---|---|
| A — IDs conhecidos | União de `clubData`, documentos reais de temporada e partidas enumeráveis; remoção dos ramos reais | Deixa órfãos sem ID/pai. Não atende ao contrato de B12 completo. Exigiria comunicar resultado parcial, não simples sucesso |
| B — Consultas de grupo no cliente | Pode localizar os documentos das coleções conhecidas sem percorrer pais | Exige consultas, regras e índices compatíveis, isolamento comprovado e tratamento de legado sem campos de proprietário |
| C — Manifesto de descendentes | Mantém IDs/caminhos para futuras exclusões e repetição | Mudança de schema e de todas as escritas relevantes; consistência do manifesto e compatibilidade com versões antigas. Não recupera sozinho órfãos anteriores |
| D — Backend autenticado para exclusão recursiva | Enumera caminhos, inclusive ancestrais ausentes, e elimina a árvore independentemente de `clubData` | Mudança arquitetural: autorização do proprietário, escopo exato, progresso/repetição e coordenação de escritas. Não implementada nesta etapa |
| E — Limpeza única de órfãos | Remove o passivo histórico após inventário verificável | Operação/migração separada e autorizada; não previne novas sobras. Não executada |

Detalhes da estratégia B: seriam necessárias consultas para os seis grupos de descendentes (`players`, `academyPlayers`, `table`, `academyTournaments`, `matches`, `playerStats`) e tratamento dos documentos reais de temporada; só consultar `players` não basta. A descoberta pode extrair IDs dos caminhos retornados. Uma faixa de referências por `documentId()` tenta restringir o ancestral sem acrescentar campos, mas o experimento foi negado e não valida sua autorização em produção. Não há garantia de que simplesmente trocar o wildcard resolva.

Outra forma é armazenar e filtrar `uid`/`careerId` em cada documento. Os tipos/payloads atuais não garantem esses campos nos descendentes; uma consulta por eles omite documentos antigos que não os possuem. Isso demandaria compatibilidade/schema e possivelmente tratamento do legado. Consultar tudo e filtrar no JavaScript poderia ler dados de outras carreiras/usuários e não é alternativa aceitável.

Índices: filtros por proprietário/carreira precisam de índices com escopo de collection group; a combinação final pode demandar índice composto ou índices compatíveis com os filtros. Não se deve prescrever um índice de produção para uma consulta ainda não aprovada. O experimento falhou em autorização, não demonstrou disponibilidade de índices. O Emulator não comprova a configuração real. Há custo de leituras, exclusões e armazenamento/escritas de índices, além de requisições repetidas; não foram estimados preços. [Documentação de índices](https://firebase.google.com/docs/firestore/query-data/index-overview#collection_group_scope).

**Recomendação para B12 definitivo: estratégia D**, em trabalho separado e autorizado, com endpoint que derive o usuário da autenticação e aceite apenas a carreira desse usuário. Deve manter estado recuperável, propagar falhas, verificar o término e coordenar novas escritas; não prometer transação de toda a árvore. A solução oficial de exclusão recursiva em ambiente confiável contempla documentos órfãos sem pai. [Referência oficial](https://firebase.google.com/docs/firestore/solutions/delete-collections). Se permanecer exclusivamente no cliente for requisito, primeiro fornecer/revisar as regras reais e validar B; não existe garantia sob as condições atuais.

### Grupos e referências externas

`ServiceCareer.removeCareerFromGroup` é uma operação explícita separada. `ServiceCareerGroup.getById` realiza a limpeza de referência comprovadamente ausente conforme B09. `deleteCareerFromFirestore` não define limpeza imediata de grupos. Essa regra não foi inventada nem ampliada. Não houve alteração de grupos, trophies externos ou qualquer outro domínio para B12.

## Validação e contadores

| Métrica | Antes (6B1) | Depois (6B2 atual) |
|---|---:|---:|
| Unitários aprovados | 151 | 152 |
| Integração aprovada | 87 | 101 |
| Total Vitest aprovado | 238 | **253** |
| `todo` unitários | 5 | 4 |
| `todo` integração | 10 | 9 |
| Total `todo` | 15 | **13** |
| Arquivos Vitest | 21 | 22 |
| Testes nativos da barreira | — | **15**, separados do total Vitest |

O aumento de 15 aprovações vem de dois `todo` ativados de B08, nove cenários adicionais de B08 e quatro diagnósticos de B12. O `todo` integral de B12 foi preservado. Continuam pendentes B02, B05, B07, B10, B12, B15, B16, B17, B18 e B19; não houve correções incidentais.

| Cobertura conjunta V8 | Antes | Depois |
|---|---:|---:|
| Linhas/statements | 6,07% (2.876/47.307) | 6,07% (2.874/47.305) |
| Funções | 9,14% (72/787) | 9,14% (72/787) |
| Branches | 39,97% (538/1.346) | 40,39% (547/1.354) |

O denominador inclui toda a aplicação, inclusive arquivos não exercitados; a cobertura global permanece baixa. A mudança no número de linhas instrumentadas acompanha o patch, sem exclusão de arquivos do relatório.

| Validação final | Resultado |
|---|---|
| `npm run typecheck` | Aprovado, exit 0 |
| `npm run typecheck:tests` | Aprovado, exit 0 |
| `npm run lint` | Aprovado, exit 0 |
| `npm run test:run` | 152 aprovados, 4 `todo`, exit 0 |
| `npm run test:integration` | 101 aprovados, 9 `todo`, exit 0 |
| `npm run test:coverage:all` | 253 aprovados, 13 `todo`, 22 arquivos, exit 0 |
| `npm run build -- --config .test-tools/stage-6b2/vite.build.config.mjs` | Aprovado, exit 0 |
| `git diff --check` | Aprovado, exit 0 |

O build usa a mesma configuração isolada da etapa anterior, com valores fictícios do projeto demo e `envDir` apontando para um arquivo, impedindo carregar `.env.local`. É validação de compilação, não artefato para publicação. O aviso preexistente de tamanho de chunk foi mantido, sem otimizações fora de escopo. O aviso de MOTD da CLI corresponde à conexão bloqueada, não a um acesso bem-sucedido à nuvem. Os avisos Git de conversão LF/CRLF não constituíram erro no diff.

As proteções acrescentaram arquivos de teste: `protected-user-guard.cjs`/`.d.cts`, `guard.test.cjs`, `reset-fixtures.ts` e `deletion-scope.test.ts`. Também foram ajustados boundary, helpers, cliente e runners de integração, resolução do SDK nos testes, setup/mocks unitários e testes de temporadas/exclusão. Nenhuma dessas barreiras foi colocada no código de produção.

Integridade: snapshot de 995 arquivos preservado, com um único arquivo de produção alterado nesta etapa; 32 artefatos de performance conservam seus hashes. Nenhum benchmark foi reiniciado, nenhuma dependência foi atualizada e nenhuma migração executada. Novas regressões observadas: **NÃO**; isso não transforma o bug conhecido B12 em corrigido.
