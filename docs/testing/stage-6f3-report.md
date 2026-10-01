# Relatório de Execução — Etapa 6F3 (Resolução Concorrente de B16-B)

**Data de Emissão:** 25 de Setembro de 2026  
**Status da Etapa:** Concluído com Sucesso  
**Bugs Endereçados:** B16-B (Condição de corrida concorrente na persistência de escalação e remoção de atletas)  
**Garantias Preservadas:** B16-A (Atomicidade contra falhas parciais e integridade em commit único)  
**Pendências Bloqueadas Preservadas:** B12 (questão arquitetural / consulta de grupo) e B15 (decisão de concorrência / pontuação) permanecem intactos como `todo`.

---

## 1. Sumário Executivo

Na Etapa 6F3, foi corrigido o bug **B16-B**, eliminando a condição de corrida em remoções/atualizações concorrentes de escalação na mesma partida. Conforme decisão de domínio estabelecida, a persistência de escalação migrou para a primitiva `runTransaction` do Firestore, aplicando a intenção da operação como um **delta reconciliado** sobre o estado mais recente lido dentro da transação.

A solução garante que:

1. Múltiplas operações concorrentes que removem atletas distintos (ex.: Operação 1 remove A, Operação 2 remove B) convergem para a remoção de ambos (`[C, D]`), sem que a gravação atrasada do documento pai ressuscite atletas já removidos.
2. O retry nativo do Firestore é acionado automaticamente em conflitos otimistas de transação, relendo o estado atualizado e convergindo.
3. Todas as garantias de atomicidade e consistência de B16-A foram estritamente preservadas (falha parcial impede qualquer escrita, rollback limpo sem órfãos, limite de 500 escritas respeitado, atualização atômica de `career.updatedAt`).
4. Nenhum acesso ao Firebase real de produção foi realizado; emuladores locais e guards de segurança foram 100% mantidos.

---

## 2. Diagnóstico e Arquitetura da Solução

### 2.1 Análise de Interface e Intenção como Delta

Na assinatura de `ServiceLineup.saveLineupToMatch`:

```typescript
saveLineupToMatch: async (
  careerId: string,
  seasonId: string,
  matchesId: string,
  lineup: SavedLineup,
  playerStats: PlayerMatchStat[],
  removedPlayerIds: string[] = [],
): Promise<void>
```

- **Intenção de Remoção:** Expressa estritamente por `removedPlayerIds`. Cada atleta nesse conjunto é enfileirado para exclusão moderna via `transaction.delete(statRef)` e excluído do documento pai.
- **Intenção de Escalação e Estatísticas:** O `lineup` e o `playerStats` recebidos pelo cliente representam um snapshot do cliente. Em cenários concorrentes, esse snapshot pode conter atletas que já foram removidos no Firestore por outra transação que comitou antes.
- **Reconciliação Delta dentro da Transação:**
  1. `matchRef` e `careerRef` são lidos dentro da transação (`transaction.get`).
  2. Identifica-se `currentActive = getLineupPlayerIds(currentMatch.lineup)`.
  3. `allowedIds` é calculado: se `currentMatch.lineup` existe, apenas atletas que constam em `currentActive` e **não** estão em `removedSet` são mantidos. Atletas que já não constam mais no Firestore (porque foram concorrentemente removidos) não são restaurados.
  4. `nextLineup` e `nextPlayerStats` são filtrados estritamente por `allowedIds`.
  5. `transaction.set(matchRef, { lineup: nextLineup, playerStats: nextPlayerStats }, { merge: true })` e `transaction.update(careerRef, { updatedAt: Date.now() })` gravam a mutação de forma indivisível.

---

## 3. Cenários de Concorrência Cobertos e Testados

A suíte `tests/integration/lineup-characterization.test.ts` foi expandida com os seguintes cenários formais:

1. **Remoções concorrentes distintas (A e B):**
   - Ambas completam (via retry nativo);
   - Pai final não contém nem A nem B;
   - Subcoleções modernas ficam sem A e sem B;
   - C e D são rigorosamente preservados.
2. **Remoção concorrente do mesmo atleta (A e A):**
   - Ambas convergem para sucesso;
   - Sem erros de "documento não existe";
   - A removido do pai e da subcoleção moderna.
3. **Remoção de A concorrente com remoção de A + B:**
   - Convergência correta para exclusão de A e B;
   - Atletas restantes C e D preservados.
4. **Conflito transacional com retry nativo do Firestore:**
   - Mutação concorrente força aborto otimista e retry da transação em voo;
   - Transação relê o estado autoritativo e comita de forma consistente (`attempts > 1`).
5. **Atualização de escalação sem remoção (ex.: mudança de formação) concorrente com remoção:**
   - A remoção de A é preservada;
   - A operação sem remoção aplica sua formação/reorganização sem ressuscitar A.
6. **Cenário combinado B16-A + B16-B:**
   - Concorrência intercalada com falha injetada (aborto por erro não-transitório);
   - Nenhuma escrita parcial é persistida;
   - Retry posterior converge para o estado final consistente.

---

## 4. Pipeline Completo de Validação

Todos os 9 comandos do pipeline foram executados com código de retorno 0:

| #   | Comando                     | Status            | Observações / Métricas                                   |
| --- | --------------------------- | ----------------- | -------------------------------------------------------- |
| 1   | `npm run typecheck`         | APROVADO (Exit 0) | Sem erros TypeScript em produção                         |
| 2   | `npm run typecheck:tests`   | APROVADO (Exit 0) | Sem erros TypeScript nos testes                          |
| 3   | `npm run lint`              | APROVADO (Exit 0) | ESLint 100% limpo                                        |
| 4   | `npm run test:run`          | APROVADO (Exit 0) | 162 testes unitários aprovados em 13 arquivos            |
| 5   | `npm run test:integration`  | APROVADO (Exit 0) | 207 testes aprovados em 14 arquivos, exatamente 2 `todo` |
| 6   | `npm run test:coverage:all` | APROVADO (Exit 0) | 369 testes aprovados (162 unit + 207 int), 2 `todo`      |
| 7   | `npm run build`             | APROVADO (Exit 0) | Bundle de produção gerado com Vite em 20.34s             |
| 8   | `git diff --check`          | APROVADO (Exit 0) | Zero erros de whitespace ou conflitos                    |
| 9   | Status dos TODOs            | CONFIRMADO        | Exatamente 2 `todo` preservados: B12 e B15               |

---

## 5. Métricas Exatas de Cobertura V8

Coletadas via `npm run test:coverage:all`:

- **Statements:** 7,07% (3.337 / 47.191)
- **Branches:** 47,23% (735 / 1.556)
- **Functions:** 10,58% (85 / 803)
- **Lines:** 7,07% (3.337 / 47.191)
- **Total de Testes:** 369 aprovados, 2 `todo` (371 testes no total)
- **Variação em relação a 6F2:** +5 testes de concorrência criados e aprovados; cobertura estável com ligeiro incremento de branches e statements.

---

## 6. Arquivos Alterados na Etapa 6F3

### Produção:

- `src/pages/Match/services/ServiceLineup/index.ts` — Implementação de `runTransaction` e reconciliação delta de escalação/playerStats.

### Testes de Integração:

- `tests/integration/lineup.test.ts` — Ajuste de código de erro injetado (`permission-denied`) para validação de aborto atômico de transação.
- `tests/integration/lineup-characterization.test.ts` — Atualização da expectativa de B16-B de caracterização de defeito para correção definitiva (`keepIds`), inclusão dos 5 novos cenários de concorrência.
- `tests/integration/feedback.test.tsx` — Ajuste de código de erro injetado (`permission-denied`) para validação de falha não-transitória em hook de persistência de escalação.

### Documentação e Patches:

- `docs/testing/stage-6f3-production.patch`
- `docs/testing/stage-6f3-report.md`
