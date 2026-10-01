# Etapa 6B1 — B09 e B13

Concluída em 23/09/2026. Corrigidos **somente B09 e B13**. Resultado final: **238 testes aprovados, 15 regressões `todo`, 21 arquivos de teste**. Firebase real não foi acessado. Nenhuma migration foi executada. B08, B12 e a etapa 6B2 não foram iniciados.

## B09 — erro de leitura não remove membro do grupo

### Antes e causa raiz

`ServiceCareerGroup.getById` capturava qualquer erro de `getCareerById`, convertia o resultado em `null` e persistia uma lista reduzida de IDs. Assim, permissão negada, indisponibilidade e timeout eram tratados como prova de que a carreira não existia. A própria leitura podia destruir a associação do grupo.

Antes do patch, foram confirmados o teste unitário de reprodução e quatro casos de integração: permissão negada pelas regras do Emulator, `unavailable`, `deadline-exceeded` e indisponibilidade real do SDK após `disableNetwork`.

### Depois e alteração

O getter atribui o código específico `career/not-found` somente quando o snapshot informa inexistência, veio do servidor e não contém escritas locais pendentes. Ausência observada apenas no cache, ou afetada por escrita pendente, recebe `career/unavailable`.

O serviço de grupo converte em `null` somente a inexistência confirmada. Os demais erros são propagados ao chamador. A limpeza fica depois do carregamento das carreiras: se qualquer carregamento falha, não é executada, inclusive quando outro membro é realmente inexistente. O erro não vira silenciosamente uma lista vazia.

A regra anterior de limpeza de IDs comprovadamente órfãos foi preservada. Também foi mantido o tratamento existente quando a escrita dessa limpeza falha: registra o erro, mantém o documento persistido e retorna as carreiras efetivamente carregadas. O retorno ainda contém a lista original de `careerIds`, como antes; a reconciliação dessa representação não fez parte da correção.

### Testes ativos e evidência

- [groups.test.ts unitário](../../src/test/groups.test.ts): erros de permissão, indisponibilidade, timeout, inesperado e uma mensagem textual de “carreira não encontrada” sem prova tipada; limpeza apenas com o código específico; ausência de cache não permite limpeza.
- [sources.test.ts](../../src/test/sources.test.ts): distingue ausência confirmada, cache e escrita local pendente, sem iniciar hidratação de carreira inexistente.
- [groups.test.ts de integração](../../tests/integration/groups.test.ts): carreira existente, carreira realmente inexistente, grupo parcialmente válido, negação real pelas regras, transporte injetado, erro inesperado com membros válido/inexistente, falha ao persistir limpeza, erro antes de ler o grupo e SDK realmente offline. Após erros, o grupo é relido com `getDocFromServer` e os IDs continuam presentes; não há chamada de atualização destrutiva.

Os **dois `todo` de B09** foram convertidos em testes ativos. Resultado específico final: **10 unitários aprovados**. Integração do módulo: **9 aprovados, nenhum `todo`**.

Arquivos de produção: [Getters](../../src/common/helpers/Getters/index.ts) e [ServiceCareerGroup](../../src/pages/GroupCareerPage/services/ServiceCareerGroup/index.ts).

## B13 — preservar dados legados nas atualizações de metadados

### Antes e causa raiz

Criar uma temporada, excluir outra ou atualizar ligas passava a carreira hidratada por `stripHeavyData`. O helper removia todos os `matches` e esvaziava todos os `players`, sem distinguir cópias vindas das subcoleções de dados que existiam apenas embutidos no documento pai. A atualização de metadados apagava a única representação desses dados legados.

Antes do patch, foram confirmados o comportamento do helper e as duas reproduções no Emulator: criação de nova temporada e exclusão de outra temporada removiam os dados embutidos sobreviventes sem os migrar.

### Depois e alteração conservadora

`getCareerById` oferece um callback opcional que entrega os arrays de temporadas originalmente persistidos **antes da hidratação**, a partir da mesma leitura já realizada. As três operações de `ServiceSeasons` guardam essa referência local e a fornecem ao helper. Não foram acrescentadas consultas nem alteradas a precedência das fontes ou a lógica de hidratação.

`stripHeavyData` mantém os novos metadados da operação e restaura, para cada temporada, os arrays embutidos originais. As cópias obtidas apenas das subcoleções continuam fora do payload. Sem um snapshot de origem correspondente, o helper preserva os dados recebidos, pois não há evidência de que podem ser removidos. Arrays de partidas vazios continuam dispensáveis.

| Formato de origem | Comportamento após a correção |
|---|---|
| Moderno vazio | Metadados leves, sem inserir arrays pesados |
| Somente embutido | Jogadores, partidas e conteúdo aninhado permanecem no pai |
| Somente subcoleções | Dados hidratados não são duplicados no pai; subcoleções permanecem intactas |
| Misto | Arrays embutidos originais permanecem intactos; cópias hidratadas não são acrescentadas ao pai |

No formato misto, inclusive os registros embutidos com IDs também presentes nas subcoleções são conservados. Compartilhar um ID não prova equivalência de todos os campos; removê-los exigiria uma decisão de migração fora do escopo. A precedência moderna usada na leitura de detalhe continua a mesma.

O helper **não virou no-op**: continua reduzindo o payload hidratado de temporadas modernas e mistas. A criação mantém o transporte normal para a nova temporada, sem converter o legado da temporada de origem. Não há migration, escrita adicional nas temporadas preservadas ou limpeza de seus documentos. Continua existindo a atualização de metadados no documento pai, como antes.

### Testes ativos e evidência

- [contracts.test.ts](../../src/test/contracts.test.ts): preserva metadados e entradas congeladas; remove cópias hidratadas quando há snapshot moderno; conserva legado quando não há prova de redundância; mantém fonte embutida original ao alterar metadados de formato misto.
- [sources.test.ts](../../src/test/sources.test.ts): callback captura os arrays originais, sem alterar o resultado hidratado e sem aumentar a quantidade de leituras.
- [seasons.test.ts](../../tests/integration/seasons.test.ts): criação de temporada conserva o payload anterior, sem escrever o legado nas subcoleções de origem.
- [deletion.test.ts](../../tests/integration/deletion.test.ts): exclusão de s1 conserva os dados embutidos de s2; o `todo` convertido também cobre falha durante hidratação de s2, sem perda dos seus dados.
- [legacy.test.ts](../../tests/integration/legacy.test.ts): **12 combinações**, cruzando os quatro formatos com criação, exclusão de outra temporada e atualização de ligas. Relê documento pai, jogadores, partidas e estatísticas do servidor; compara o conteúdo original; confirma recuperação pelo getter, inclusive estatísticas embutidas e escalação. Verifica ausência de novas consultas de carreira e de escritas nas subcoleções da temporada preservada.

O **`todo` de B13** foi convertido em teste ativo. Resultado específico: **4 unitários e 15 integrações aprovados**. Os módulos unitários afetados passaram; os quatro módulos de integração de B09/B13 concluíram juntos com **40 aprovados e 4 `todo` de outros bugs**. A suíte final voltou a validar todos os casos.

Arquivos de produção: [Getters](../../src/common/helpers/Getters/index.ts), [stripHeavyData](../../src/common/utils/stripHeavyData.ts) e [ServiceSeasons](../../src/common/services/ServiceSeasons/index.ts).

## Diff de produção

| Arquivo | Adicionadas | Removidas |
|---|---:|---:|
| `src/pages/GroupCareerPage/services/ServiceCareerGroup/index.ts` | 3 | 0 |
| `src/common/helpers/Getters/index.ts` | 11 | 1 |
| `src/common/utils/stripHeavyData.ts` | 9 | 2 |
| `src/common/services/ServiceSeasons/index.ts` | 15 | 6 |
| **Total: 4 arquivos** | **38** | **9** |

São **47 linhas adicionadas/removidas**, sem contexto, testes ou documentação. O [patch isolado](stage-6b1-production.patch) foi calculado contra o snapshot de entrada desta etapa, não contra HEAD. Alterações anteriores do usuário e da etapa 6A foram preservadas.

O snapshot registra 991 arquivos, incluindo os 938 arquivos de `src`, testes de integração, referências de performance e dependências/configuração. As cópias de fonte utilizadas no diff ficam em `.test-tools/stage-6b1/objects`, indexadas por SHA-256 em `before.json`.

Além dos testes alterados, o mock de snapshot passou a informar metadados de cache/escritas pendentes. Foi adicionado somente um arquivo de teste, `legacy.test.ts`. Não houve atualização de dependências, alteração dos runners ou refatoração arquitetural.

## Resultados antes → depois

| Medida | Fim da 6A | Fim da 6B1 |
|---|---:|---:|
| Unitários aprovados | 139 | **151** |
| Integração aprovada | 73 | **87** |
| Total aprovado | **212** | **238** |
| `todo` unitários | 6 | **5** |
| `todo` integração | 12 | **10** |
| Total `todo` | **18** | **15** |
| Arquivos de teste | 20 | **21** |
| Lines / Statements | 6,00% — 2.838/47.283 | **6,07% — 2.876/47.307** |
| Functions | 9,02% — 71/787 | **9,14% — 72/787** |
| Branches | 39,10% — 517/1.322 | **39,97% — 538/1.346** |

Foram ativados três `todo`: dois de B09 e um de B13. Os testes de reprodução foram ajustados para exigir o comportamento corrigido, sem eliminar seus cenários. O aumento de 26 testes aprovados inclui as conversões e novos casos parametrizados. As regressões de outros bugs não foram ativadas.

Cobertura V8 conjunta de toda a aplicação: [resumo JSON](../../coverage/coverage-summary.json), [HTML](../../coverage/index.html). A cobertura global continua baixa; não é evidência de ausência de defeitos nos fluxos não exercitados. O [registro desta etapa](stage-6b1-validation.json) preserva os contadores, resultados e hashes, mesmo se os artefatos de coverage forem regenerados posteriormente.

## Validação final

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Aprovado |
| `npm run typecheck:tests` | Aprovado |
| `npm run lint` | Aprovado, sem autofix |
| `npm run test:run` | 151 aprovados / 5 `todo` |
| `npm run test:integration` | 87 aprovados / 10 `todo` |
| `npm run test:coverage:all` | 238 aprovados / 15 `todo`; sem erros não tratados |
| `npm run build -- --config .test-tools/stage-6b1/vite.build.config.mjs` | Aprovado: TypeScript e Vite |
| `git diff --check` | Aprovado |

O script de build usa o mesmo isolamento da etapa 6A: configuração temporária importando a configuração original, `envDir` apontando para o próprio arquivo, prefixo de ambiente exclusivo de teste e identificadores Firebase fictícios. Assim, **`.env.local` não é carregado**. Os plugins e as opções de bundle não foram alterados. O artefato serve para validar compilação, não para publicação; não valida variáveis de produção.

Permanece o aviso conhecido de chunk maior que 500 kB. Logs de validação estão em `.test-tools/stage-6b1`. Nenhum benchmark de performance foi repetido.

## Firebase, preservação e limites

**Firebase real acessado: NÃO.** Persistência executada somente com fixtures sintéticas em:

- Projeto **`demo-career-tracker-integration`**;
- Firestore Emulator **`127.0.0.1:8089`**;
- Auth Emulator **`127.0.0.1:9098`**.

O cliente e os runners continuam fixando projeto/hosts, removendo credenciais externas do ambiente e bloqueando conexões externas. A configuração de testes substitui o Firebase da aplicação e não carrega `.env.local`. A tentativa bloqueada da CLI de consultar MOTD/configuração remota produz o aviso já conhecido, sem comprometer os testes. Os runners encerraram os emuladores ao final. Nenhum dado real foi lido ou modificado e nenhuma migration real ou de conversão do legado foi executada.

Os **32 arquivos de referência de performance** permaneceram idênticos por SHA-256, assim como dependências e configuração original do Vite. A comparação de fontes confirma que `getAllCareers` e o bloco de hidratação de `getCareerById` permaneceram literalmente iguais. Não houve alteração de N+1, listeners, `useCareers`, navegação/reload, contexts, cache, assets, flags ou code splitting. Os testes confirmam que a captura do snapshot não acrescenta consultas. Não há alegação de latência idêntica: desempenho pós-patch não foi medido.

**Novas regressões observadas: NÃO.** Os testes existentes dos bugs fora do escopo continuam reproduzindo suas limitações. Permanecem sem correção **B02, B05, B07, B08, B10, B12, B15, B16, B17, B18 e B19**. Em particular, não foram corrigidas exclusões recursivas, atomicidade, concorrência ou divergência entre lista e detalhe. Escritas concorrentes continuam sujeitas aos problemas já catalogados. **B08, B12 e a etapa 6B2 não foram iniciados.**
