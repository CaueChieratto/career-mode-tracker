# Etapa 6D1 — criação atômica de temporada (B07)

Data: 24/09/2026. Escopo exclusivo: B07. **Concluída: B07 corrigido, 286 testes aprovados e 9 `todo`. As oito validações finais passaram.**

## Reprodução e causa raiz

Antes do patch, `addSeason` preparava os profissionais, gerava um UUID para a nova temporada e lia a base. Em seguida atualizava `clubData` e executava `setDoc` individualmente para cada profissional e atleta da base. Uma falha interrompia a sequência sem desfazer os metadados nem as cópias anteriores.

A reprodução anterior ao patch executou os testes B07 existentes: **1 unitário e 2 de integração aprovados como caracterização do defeito**, com os dois `todo` ainda pendentes. No Emulator, a falha antes do quarto profissional (`p1`) deixou a temporada 2 publicada e apenas `incoming`, `loan` e `long-loan` copiados. A falha antes de `academyPlayers/a1` deixou os quatro profissionais, mas nenhuma base. O teste anterior de retry documentava a criação da temporada 3 a partir dessa temporada 2 incompleta.

Também havia uma condição relevante à preparação: `getCareerById` capturava erros de hidratação e usava os arrays embutidos como fallback. Com elenco exclusivamente em subcoleção, uma leitura negada poderia se tornar um elenco vazio aparentemente válido.

## Patch de produção

Somente dois arquivos foram modificados nesta etapa, **+15/−7 linhas** em relação ao snapshot anterior à 6D1:

| Arquivo | Alteração |
|---|---|
| [ServiceSeasons](../../src/common/services/ServiceSeasons/index.ts) | Enfileira profissionais, base e atualização de `clubData` em um único `writeBatch`; aguarda `commit`; rejeita mais de 500 escritas antes de gravar. |
| [Getters](../../src/common/helpers/Getters/index.ts) | Parâmetro opcional `failOnHydrationError`, habilitado apenas por `addSeason`, propaga erros de leitura em vez de transportar fallback incompleto. Demais consumidores conservam seu comportamento. |

O [diff isolado de produção](stage-6d1-production.patch) usa o snapshot imediatamente anterior a esta etapa, sem confundir alterações acumuladas das etapas anteriores com o patch atual. Não houve alteração em schema, dependências, regras, migrações, navegação ou performance.

### Por que um batch

Todos os caminhos e payloads são conhecidos antes de gravar: um UUID novo identifica a temporada; IDs de profissionais e base são preservados. Não é necessário ler dentro de uma transação para corrigir a parcialidade de uma única chamada. Um commit publica todas as cópias e os metadados atomicamente, sem protocolo de staging ou compensação que também poderia falhar.

Adicionar os metadados por último à fila facilita a inspeção; a segurança vem da atomicidade do commit, não de uma suposta ordenação visível entre suas escritas. O schema atual continua sem documento-pai de temporada: a referência fica em `clubData` e os dados em subcoleções.

Não há mutex, serialização, condição de conflito ou rejeição da segunda criação. O teste conhecido de B15 ainda demonstra duas subárvores e apenas uma nova referência após criações concorrentes; seu `todo` permanece intacto.

## Evidência no Emulator

Todas as inspeções de persistência usam `getDocFromServer`/`getDocsFromServer`.

| Cenário | Resultado verificado |
|---|---|
| Carreira vazia | Temporada 1 referenciada; nenhuma cópia desnecessária. |
| Transporte completo | Quatro profissionais esperados, IDs preservados, idade +1, contrato vencido limitado a zero, estatísticas e Bola de Ouro zeradas; vendidos excluídos. |
| Empréstimos | Cedido com retorno deixa de estar emprestado e recebe dois eventos contratuais; prazo longo decrementa; recebido mantém empréstimo. Contratos anteriores intactos. |
| Base | Somente `academy`; promovidos e dispensados não reaparecem. Payload e idade preservados, `evolutionHistory` reiniciado. |
| Erros lendo carreira, profissionais, partidas ou base | Erro propagado; nenhuma escrita de criação, sem publicar elenco vazio por fallback. Retry cria elenco e base completos. |
| Falhas no primeiro, segundo e quarto profissional; primeira e segunda cópia da base; antes de metadados | Nenhuma cópia ou referência nova após a falha. Fonte preservada. |
| Rejeição real do commit | O teste remove apenas o documento-pai sintético imediatamente antes do commit; `batch.update` recebe `not-found` do servidor. Nenhuma cópia do batch persiste. Restaurada a fixture externa, retry cria a temporada completa. |
| Retry após falha anterior ao commit | Continua da última temporada válida: `[1, 2]`, quatro profissionais e base completa, sem temporada fantasma, órfãos da tentativa ou duplicação. |
| Erro injetado depois de commit confirmado | O erro continua propagado, mas a temporada já está integralmente persistida: quatro profissionais, base e referência. Nunca um subconjunto. |
| Limite suportado | 498 profissionais + 1 atleta da base + 1 atualização de carreira = 500 escritas: sucesso. 499 profissionais + 1 atleta + 1 atualização = 501: rejeição antes de escrever, sem dividir em lotes. |
| Legado e formato misto | B13 preservado; matriz existente de 12 cenários de criação/exclusão de outra temporada/metadados nos formatos moderno vazio, embutido, subcoleção e misto aprovada. |
| UI | Hook informa erro, encerra loading e conserva carreira local; não navega. Teste unitário com serviço rejeitado, sem alteração de produção na UI. |
| Concorrência B15 | Comportamento anterior continua reproduzido; não foi implementada política de conflito. |

As falhas por profissional/base na infraestrutura nova são injetadas **antes de enviar o batch**, passando pelos itens enfileirados. Não simulam um commit parcialmente aplicado pelo servidor. A rejeição real `not-found` verifica separadamente a atomicidade do backend; a falha posterior ao commit verifica a distinção entre erro de retorno e ausência de persistência.

**Resíduos parciais após falha: NÃO nos cenários verificados.** Se o backend já confirmou o commit e depois ocorre erro de retorno, a temporada completa pode existir. A operação não ganhou identificador idempotente de negócio: uma nova chamada após um sucesso persistido continua criando a temporada seguinte, conforme o contrato existente. O teste de duas chamadas sequenciais válidas foi preservado. Não se promete rollback após commit ou detecção automática de confirmação perdida.

As primeiras novas expectativas comparavam também `matches: []` com o payload após redução. B13 já remove legitimamente esse array vazio. As fixtures de preservação passaram a conter uma partida embutida real, permitindo comparação integral dos dados relevantes sem alterar `stripHeavyData` nem suas expectativas existentes.

A primeira execução de cobertura atingiu o timeout de 30 segundos no cenário com 501 escritas, que já havia passado na integração normal. Somente esse teste com fixture grande recebeu prazo de 60 segundos; as expectativas, limites de produção, guards e configuração global de testes permaneceram iguais.

## Limites relevantes

- Contagem do patch: **1 + profissionais não vendidos + atletas com status `academy`**. O SDK Firebase 12.1.0 instalado documenta máximo de **500 escritas por `WriteBatch`** (`node_modules/@firebase/firestore/dist/index.d.ts`, declaração `writeBatch`). A [referência oficial](https://firebase.google.com/docs/reference/js/firestore#writebatch) descreve o batch atômico. Acima desse limite, a criação retorna erro antes de gravar; não há suporte a elencos ilimitados nem divisão silenciosa em lotes.
- Há também limites de **1 MiB por documento e 10 MiB por requisição**, além dos limites de índices e avaliação de regras. A contagem de writes não garante que qualquer payload caiba nesses limites. Uma rejeição de commit não publica um subconjunto; o tamanho em bytes não foi medido preventivamente nem testado no limite. Consulte as [quotas oficiais](https://firebase.google.com/docs/firestore/quotas) e a [documentação de operações atômicas](https://firebase.google.com/docs/firestore/manage-data/transactions).
- Regras de produção não estão no repositório. Os testes usam regras sintéticas existentes; não atestam que regras de produção aceitem batches de qualquer tamanho. O limite de 500 transformações por documento descrito nas quotas é distinto da contagem de escritas usada aqui.
- O SDK pode manter o commit pendente enquanto estiver offline. Não foi adicionado timeout que trate uma escrita pendente como cancelada, nem testada queda abrupta do Emulator/processo durante commit. A atomicidade da persistência é fornecida pelo Firestore.

## Testes, cobertura e validação final

Os dois `todo` B07 de `src/test/seasons.test.ts` e `tests/integration/seasons.test.ts` viraram testes ativos. Caracterizações antigas de parcialidade passaram a exigir ausência de persistência parcial. Nenhum teste foi removido; nenhum `todo` de outro bug foi ativado.

| Métrica | Antes (6C) | Depois (6D1) |
|---|---:|---:|
| Unitários aprovados / todo | 152 / 4 | 154 / 3 |
| Integração aprovada / todo | 120 / 7 | 132 / 6 |
| Total aprovado / todo | **272 / 11** | **286 / 9** |
| Arquivos de testes | 22 | 23 |

Foram acrescentados 12 casos (11 de integração e um de UI) e ativados dois `todo`. Os 15 testes nativos da barreira são contados separadamente. Restam B02 (1), B05 (2), B10 (2), B12 (1), B15 (1), B16 (1) e B17 (1).

| Coverage global | Antes | Depois |
|---|---:|---:|
| Linhas | 5.94% (2809/47275) | 6.02% (2847/47269) |
| Statements | 5.94% (2809/47275) | 6.02% (2847/47269) |
| Funções | 9.22% (73/791) | 9.45% (75/793) |
| Branches | 42.98% (604/1405) | 43.45% (617/1420) |

Coleta conjunta V8, mesmas inclusões/exclusões; nenhum denominador filtrado. Os contadores variam com as fontes alteradas e a instrumentação de código antes não executado. Cobertura global ainda baixa; não demonstra ausência de todos os defeitos.

| Validação | Resultado |
|---|---|
| `npm run typecheck` | Aprovado |
| `npm run typecheck:tests` | Aprovado |
| `npm run lint` | Aprovado |
| `npm run test:run` | Aprovado |
| `npm run test:integration` | Aprovado |
| `npm run test:coverage:all` | Aprovado |
| `npm run build -- --config .test-tools/stage-6d1/vite.build.config.mjs` | Aprovado |
| `git diff --check` | Aprovado |

**Novas regressões observadas: NÃO.** O aviso de bundle maior que 500 kB permanece. Build: JS 5.221,45 kB / gzip 1.680,86 kB; CSS 143,23 kB / gzip 28,10 kB. Nenhuma otimização de bundle foi realizada.

Evidências consolidadas: [registro JSON](stage-6d1-validation.json), [diff de produção](stage-6d1-production.patch), [coverage HTML](../../coverage/index.html) e [coverage JSON](../../coverage/coverage-summary.json).

## Isolamento e escopo

**Firebase real acessado: NÃO.** Persistência exclusivamente no projeto `demo-career-tracker-integration`, Firestore `127.0.0.1:8089`, Auth `127.0.0.1:9098`, com fixtures sintéticas. Os 15 testes nativos do guard passaram antes das execuções destrutivas. Guard de UID e bloqueio de rede permaneceram ativos; UID protegido não foi enviado ao SDK nem registrado nos artefatos. `.env.local` não foi carregado. Nenhuma migration executada.

Build com configuração local isolada, `envDir` apontando para arquivo regular e somente valores demo. Avisos de MOTD da CLI resultam do bloqueio de rede; o `not-found` do teste de commit é esperado. Os 32 artefatos de baseline de performance permanecem com os mesmos hashes; benchmarks não foram repetidos.

**B07: CORRIGIDO**, sujeito aos limites documentados. **B15: NÃO CORRIGIDO / continua BLOQUEADO. B12: continua BLOQUEADO.** B02, B05, B10, B16 e B17 não foram corrigidos. B10/B17 e etapa 6D2 não foram iniciados.
