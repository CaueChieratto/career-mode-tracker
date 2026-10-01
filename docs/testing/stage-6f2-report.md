# Etapa 6F2 — Correção Localizada de B16-A

Etapa concluída em 24/09/2026. **B16-A foi corrigido com sucesso via `writeBatch` atômico.**
**B16-B permanece como pendência separada de concorrência com decisão necessária.**
**B12 e B15 permanecem BLOQUEADOS e não foram alterados.**
**Nenhuma otimização ou alteração de performance foi realizada; Firebase real NUNCA foi acessado.**

---

## 1. Diagnóstico e Causa Raiz de B16-A

Na implementação anterior de `ServiceLineup.saveLineupToMatch`:

1. As fichas modernas dos atletas removidos eram excluídas via chamadas individuais de `deleteDoc(statRef)` executadas em `Promise.all(deletePromises)`.
2. Em seguida, o documento pai da partida era atualizado com `setDoc(matchRef, { lineup, playerStats }, { merge: true })`.
3. Por último, o documento da carreira era atualizado com `updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() })`.

Se ocorresse qualquer falha (de rede, de permissão ou rejeição no servidor) entre a exclusão das fichas modernas e a atualização do pai:

- As fichas modernas já haviam sido deletadas no Firestore.
- O documento pai da partida permanecia com o array embutido `playerStats` antigo (contendo o atleta que deveria ser removido).
- Ao efetuar nova leitura da partida através de `ServiceMatches.getMatchesBySeason`, o fallback legado reativava o atleta a partir do array embutido, ressuscitando-o na interface.

---

## 2. Estratégia Implementada: `writeBatch` Atômico

A estratégia candidata avaliada na Etapa 6F1 foi implementada e validada com sucesso:

- As chamadas separadas e sequenciais foram substituídas por um único `writeBatch(db)`.
- No mesmo batch foram agregadas:
  1. `batch.delete(statRef)` para cada `playerId` contido em `removedPlayerIds`;
  2. `batch.set(matchRef, { lineup, playerStats }, { merge: true })` para atualizar o lineup e o array embutido de estatísticas;
  3. `batch.update(careerRef, { updatedAt: Date.now() })` para atualizar o timestamp da carreira.
- O commit é executado de forma atômica via `await batch.commit()`.

### Garantia All-or-Nothing

- **Sucesso:** Todas as exclusões modernas, a escrita do pai e a atualização de `updatedAt` são persistidas conjuntamente. O fallback legado é atualizado simultaneamente, impedindo que o atleta reapareça.
- **Falha:** Se qualquer erro for disparado antes do commit ou se o servidor rejeitar a operação (por exemplo com `permission-denied`), **nenhuma alteração é persistida** no Firestore: as fichas modernas permanecem íntegras, o documento pai permanece com o snapshot anterior e `updatedAt` não avança.

### Validação do Limite de 500 Writes do Firestore

O Firestore impõe um limite estrito de 500 operações por `writeBatch`.
No fluxo de `saveLineupToMatch`, o número total de operações enfileiradas é:
$$\text{Total de Writes} = N_{\text{removidos}} + 1_{\text{match}} + 1_{\text{career}} = N_{\text{removidos}} + 2$$
Para assegurar a integridade sem depender do tamanho das fixtures ou arriscar chunks que quebrariam a atomicidade:

- Foi adicionada uma guarda defensiva explícita no início da função:
  ```typescript
  if (removedPlayerIds.length + 2 > 500) {
    throw new Error(
      "A atualização de escalação excede o limite de 500 escritas para commit atômico.",
    );
  }
  ```
- Essa validação rejeita antecipadamente antes de qualquer operação se $N > 498$, garantindo fail-fast sem efeitos colaterais. Foi validada em teste automatizado em `lineup.test.ts`.

---

## 3. Arquivos de Produção Modificados

Somente **1 arquivo de produção** foi modificado:

- `src/pages/Match/services/ServiceLineup/index.ts`
  - Linhas alteradas: 18 inserções, 10 remoções (+18 / -10).
  - Remoção de importações desnecessárias (`setDoc`, `deleteDoc`, `updateCareerFirestore`) e introdução de `writeBatch`.
  - Substituição da sequência `deleteDoc` + `setDoc` + `updateCareerFirestore` pelo batch único atômico com verificação de boundary ($\le 500$).

Nenhum outro arquivo de produção em `src` foi tocado.

---

## 4. Testes e Regressões

### Transformação do `todo` Original de B16

- O teste original `it.todo('[B16] falha entre exclusão de playerStats/removed e escrita do pai...')` em `tests/integration/lineup.test.ts` foi transformado em teste ativo.
- O teste valida que:
  1. Sob falha durante o batch, as fichas modernas não são excluídas parcialmente;
  2. O retry da mesma intenção de remoção converge perfeitamente, removendo tanto a ficha moderna quanto o embutido no pai;
  3. Releituras pós-retry não ressuscitam o jogador via fallback legado;
  4. Atletas preservados (titulares, reservas, banco) mantêm seus minutos, notas e dados íntegros.

### Atualização dos Testes de Caracterização da 6F1

- Em `tests/integration/lineup-characterization.test.ts`, as asserções de caracterização de defeito foram atualizadas para refletir o contrato atômico:
  - Falha antes/durante o commit do batch mantém o estado inicial idêntico (documentos modernos preservados, pai inalterado, `updatedAt` inalterado).
  - Falha pós-commit com resposta perdida propaga erro mas deixa os dados persistidos no servidor; retry imediato converge sem duplicatas.
  - Correção de closure de caminhos no teste com `signOut(auth)` evitando referência nula e exercitando rejeição real com `permission-denied` pelo Firestore Emulator.

### Teste Adicional de Boundary

- Foi adicionado em `tests/integration/lineup.test.ts` o teste `rejeita com erro explícito se o total de escritas ultrapassar 500`, assegurando a barreira para arrays com 499 ou mais remoções.

---

## 5. B16-B Permanece Como Pendência Separada (DECISÃO NECESSÁRIA)

O teste de concorrência de B16-B em `lineup-characterization.test.ts` foi mantido integralmente ativo e continua demonstrando que:

- Se a Operação 1 pretende remover o atleta A e a Operação 2 pretende remover o atleta B (ambas partindo do mesmo snapshot inicial da escalação):
  - Ambas executam seu `writeBatch` atômico com sucesso;
  - O batch da Operação 2 exclui B e grava o pai com [A, C, D];
  - O batch da Operação 1 exclui A e sobrescreve o pai com [B, C, D];
  - Como o array embutido final no pai contém B, a leitura subsequente restaura B na aplicação.
- Essa questão de conflito entre snapshots concorrentes **não** é resolvida por um batch simples e exige definição de política de domínio (ex: transação com releitura, versionamento documental ou operações baseadas em delta).
- B16-B permanece catalogado como **BLOQUEADO / DECISÃO NECESSÁRIA**, sem bloquear a entrega de B16-A.

---

## 6. Situação de B12 e B15

- **B12 (Exclusão Completa de Carreira):** Permanece **BLOQUEADO**. Descendentes órfãos históricos sem documento pai ou sem ID nos metadados não são alcançáveis pelo Web SDK do cliente. Exige decisão arquitetural sobre uso de backend/Cloud Functions/Admin SDK.
- **B15 (Concorrência na Criação de Temporada):** Permanece **BLOQUEADO**. Exige definição da política de negócio para duas requisições simultâneas partindo do mesmo estado (serialização vs rejeição).
- Os testes correspondentes a B12 e B15 permanecem como os **únicos 2 `todo`** do projeto.

---

## 7. Resultados das Validações Executadas

Todos os 9 comandos oficiais foram executados e terminaram com código de saída 0:

| Comando                                                                                                          | Resultado                                                | Observações                                        |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `npm run test:integration -- tests/integration/lineup-characterization.test.ts tests/integration/lineup.test.ts` | **Aprovado: 34 testes, 0 falhas, 0 todo**                | Foco B16-A e caracterização de B16-B               |
| `npm run typecheck`                                                                                              | **Aprovado** (código 0)                                  | Sem erros de tipagem no código de produção         |
| `npm run typecheck:tests`                                                                                        | **Aprovado** (código 0)                                  | Sem erros de tipagem na suite de testes            |
| `npm run lint`                                                                                                   | **Aprovado** (código 0)                                  | Sem violações de ESLint                            |
| `npm run test:run`                                                                                               | **Aprovado: 162 testes, 13 arquivos** (código 0)         | Suite unitária completa                            |
| `npm run test:integration`                                                                                       | **Aprovado: 202 testes, 2 todo, 14 arquivos** (código 0) | Suite de integração contra Firestore/Auth Emulator |
| `npm run test:coverage:all`                                                                                      | **Aprovado: 364 testes, 2 todo, 27 arquivos** (código 0) | Cobertura unificada V8                             |
| `npm run build`                                                                                                  | **Aprovado** (código 0)                                  | Compilação Vite e bundle de produção               |
| `git diff --check`                                                                                               | **Aprovado** (código 0)                                  | Sem conflitos ou problemas de formatação           |

---

## 8. Comparativo de Métricas: Antes (6F1) vs Depois (6F2)

| Métrica                     |      Antes (Etapa 6F1) |         Depois (Etapa 6F2) |  Variação   |
| --------------------------- | ---------------------: | -------------------------: | :---------: |
| **Testes Aprovados**        |                    362 |                    **364** |     +2      |
| **Testes `todo`**           |      3 (B12, B15, B16) |           **2** (B12, B15) |     -1      |
| **Total de Casos na Suite** |                    365 |                    **366** |     +1      |
| **Arquivos de Teste**       |                     27 |                     **27** |      0      |
| **Linhas (Lines)**          | 6,97% (3.286 / 47.144) | **6,98%** (3.292 / 47.144) | +0,01% (+6) |
| **Statements**              | 6,97% (3.286 / 47.144) | **6,98%** (3.292 / 47.144) | +0,01% (+6) |
| **Branches**                |   47,03% (720 / 1.531) |   **46,89%** (718 / 1.531) |   -0,14%    |
| **Functions**               |      10,58% (85 / 803) |      **10,58%** (85 / 803) |     0%      |

---

## 9. Segurança Absoluta e Integridade de Performance

- **Firebase Real Acessado:** **NÃO**. Toda a execução foi contida nos emuladores locais (`127.0.0.1:8089` e `127.0.0.1:9098`) sob o projeto sintético `demo-career-tracker-integration`.
- **Proteção de UID:** O arquivo `.env.test.guard.local` permaneceu intacto; a variável `PROTECTED_USER_UID` nunca foi lida, impressa, logada ou exposta. `.env.local` nunca foi carregado.
- **Artefatos de Performance:** Todos os 32 artefatos em `docs/performance/` e medições históricas permanecem inalterados. Nenhuma otimização de performance foi iniciada.
