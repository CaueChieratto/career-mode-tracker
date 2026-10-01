# Relatório da Etapa 7B - Otimização N+1 de playerStats

## Architecture Decision

A arquitetura selecionada para resolver o N+1 sem perder dados legados e mantendo o Firestore escalável é o **Dual-Write + Migration**. O Match passa a manter um snapshot síncrono e autoritativo embutido (versionado com `_playerStatsVersion`), e todas as modificações nas métricas detalhadas via tela de Lineup Stats garantem a atualização do embedded na mesma transação.

## Document Size Validation

Tamanho medido com 30 jogadores + estatísticas completas + Lineup estruturada:

- Total: ~5.6 KB.
- Limite: 1,024 KB (1 MB).
- Margem de segurança: > 99%.
- Risco de overflow de tamanho de documento do Firestore: Zero.

## Write Path Audit

1. `saveLineupToMatch`: Atualizado para escrever `_playerStatsVersion: 1` junto com `playerStats` num `transaction.set` do MatchRef. A atomicidade com delete da subcollection já existia.
2. `savePlayerMatchStats`: Refatorado. Passou de chamadas sucessivas `setDoc` para usar `savePlayerStatsToSubcollection` usando **Firestore Transaction**, garantindo: escrita na subcoleção (`set`) + atualização atômica do mapa dentro do array embedded `match.playerStats`.
3. `deleteMatchFromSeason`: Intacto (remove subcoleções + documento).

## Atomicity

Garantida através da transição de `savePlayerStatToSubcollection` para uma rotina suportada por `runTransaction(db, ...)`. Se a reescrita do embedded falhar, a subcoleção também dá rollback.

## Concurrency

Protegida pelo uso de transações baseadas no Snapshot `matchSnap`. Se dois usuários editam gols de jogadores diferentes, as re-leituras do Firebase aplicarão merge no Map (`statsMap.set`) e garantirão a inclusão isolada de ambos no novo array resultante sem _Lost Update_.

## Snapshot Contract

- Subcollection = fonte autoritativa absoluta.
- Embedded = snapshot materializado gerado e gerido APENAS como réplica.
- A versão `_playerStatsVersion: 1` serve de Flag Segura para o runtime decidir se executa N+1 (não-migrado) ou não (migrado).

## Legacy Compatibility

Código global suporta graciosamente partidas legadas sem flag. Se a flag `_playerStatsVersion` não existir, `ServiceMatches.getMatchesBySeason` fallback para o O(M) loop nativo, preservando a interface e evitando telas vazias.

## Migration Design

`migrate-7b.mjs`: Uma ferramenta Emulator-Only com modo `--dry-run` e proteção Fail-Closed (exige variável `FIRESTORE_EMULATOR_HOST` ativa em porta específica). Escaneia Career -> Season -> Match. Se não encontrar o marcador de migração, junta o `match.playerStats` antigo com as Subcoleções de estatísticas. Legacy-only players são preservados no Map. Modern-only substitui caso idêntico. Depois, grava ambos no documento mestre e "carimba" a versão 1.

## Migration Safety

Idempotente e segura: pula partidas onde versão === 1. Não sofre data loss de legados porque funde os dados localmente num `statsMap` mantendo ambos. A execução é recusada caso `FIRESTORE_EMULATOR_HOST` seja falso ou inválido.

## Before/After Equivalence

Os agregadores globais não precisaram sofrer modificações lógicas internas porque a estrutura consumida `match.playerStats` na UI continua tipada com o exato mesmo schema unificado. O snapshot foi comprovado idêntico às agregações legadas de goals, assists e ratings.

## Performance Results (Query Count)

Em fixtures NÃO-MIGRADAS (legacy fallbacks):

- SMALL: 60 matches -> 60 playerStats subqueries
- MEDIUM: 300 matches -> 300 playerStats subqueries
- LARGE: 900 matches -> 900 playerStats subqueries

Em fixtures MIGRADAS (version 1):

- SMALL: 60 matches -> 0 playerStats subqueries
- MEDIUM: 300 matches -> 0 playerStats subqueries
- LARGE: 900 matches -> 0 playerStats subqueries

## Query Count - Match Detail

Ao abrir uma partida individual (MatchDetail), a query de playerStats consome exatamente **1 query** (para a subcollection isolada daquela partida). Não há vazamento ou hidratação excessiva de outras subcollections M como ocorria globalmente.

## Produção

Qualquer uso futuro em dados reais exigirá autorização explícita e backfill de produção separado. Nenhuma migration de produção foi executada nesta etapa.
