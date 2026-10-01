# Contratos e cenários — etapas 1–3

Esta rede de segurança caracteriza o código atual antes de qualquer correção. Não altera comportamento de produção. Os testes que começam com **BUG CONHECIDO** reproduzem defeitos; não aprovam esse comportamento como contrato permanente. O `todo` adjacente especifica a regressão a ativar na correção. Regras apenas observadas e que ainda exigem decisão de produto são identificadas abaixo.

## Contratos preservados

| Área | Entrada e resultado observável | Cenários/testes |
|---|---|---|
| Estatísticas de temporada | Somar manual + partidas FINISHED; ignorar SCHEDULED e IDs de outros atletas; deduplicar matchesId usando última ocorrência; média ponderada por jogos com duas casas | `statistics.test.ts`: 2 jogos/3 gols/nota 6 manuais + 1 jogo/2 gols/nota 8 = 3 jogos/5 gols/6,67; ligas separadas; zero jogos; visitante; arrays vazios |
| Reprocessamento | Objeto com `_isAugmented` retorna sem nova soma; conversão a raw remove marcadores | Mesmo arquivo; ida e volta a raw tem defeito B02 |
| Histórico | `aggregatePlayerStats` soma prêmios uma vez, retém maior overall e atributos da última ficha, agrupa pelas chaves fornecidas | Múltiplas temporadas, venda, notas ponderadas, zero jogos, nomes iguais com chaves distintas |
| Identidade na carreira | Regra atual: trim/lowercase de nome + nacionalidade; IDs diferentes com mesma chave se fundem; outra nacionalidade permanece distinta | `statistics.test.ts`; decisão atual caracterizada, não garantia de que homônimos sejam a mesma pessoa |
| Contratos | Edição comum atua no primeiro contrato; empréstimo preserva condições específicas do último; venda/empréstimo escolhem ano conforme janela da temporada | `contracts.test.ts`: datas em agosto/fevereiro, históricos vazios, zero, retorno, entradas congeladas |
| Payload leve | `stripHeavyData` conserva metadados, remove matches e substitui players por [] | Não é migração nem prova de que existam cópias nas subcoleções. Chamadores precisam dessa garantia antes de persistir |
| Transporte de temporada | Menor número livre; anterior é número-1; exclui vendidos; age+1; contrato decrementa com piso zero; zera estatísticas/prêmios/buy | `seasons.test.ts`: carreira vazia, lacuna 1/3, contrato vencido, comum/vendido/cedido/recebido/promovido; base ativa com histórico reiniciado |
| Escalação | IDs de goleiro, linhas e banco preservam fichas; fichas dos demais são removidas; slots repetidos não duplicam | `lineup.test.ts`: undefined, slots null, banco ausente, entrada congelada |
| Substituições | Cadeia é percorrida nos dois sentidos; cada ID soma uma vez; exclusão de minutos não interrompe travessia | Cadeia A→B→C, ciclo, múltiplas raízes, IDs ausentes, getStat de edição; 90/120 + acréscimos; restante limitado a zero |
| Estatística individual | Grava pelo ID, substitui ficha existente, completa contraparte apenas sem minutos definidos; erro de primeira gravação rejeita | `playerStats.test.ts`: conversão numérica, minutos de gols, alvos de assistências, cartões, vínculo reverso e imutabilidade |
| Resultado | Perspectiva mandante/visitante; pênaltis desempatam somente placar empatado; vazios viram zero; payload FINISHED | `results.test.ts`: vitória/empate/derrota, pênaltis zero/empatados, prorrogação, remoção de propriedades sem mutar |
| Classificação | Helper incrementa jogos e saldo; vitória=3, empate=1, derrota=0 | Helpers não coordenam reversão de resultado editado. Não confundir cobertura matemática com correção da integração |
| Fontes de dados | Detalhe une atuais+legados por ID, com atual prioritário; fontes vazias ou falha de hidratação mantêm legado | `sources.test.ts`: legado puro, atual sobreposto, IDs exclusivos, Timestamp, ausência e erro |
| Base e promoção | Profissional conserva atributos, origem Base, data, evolução e torneios; apenas partidas do atleta entram no histórico | `academy.test.ts`: compacto sem atributos duplicados, estatísticas zero omitidas, pênaltis zero preservados, relógio congelado |
| Grupos | Grupo inexistente=null; sem autenticação rejeita; membros válidos são hidratados sem escrita | `groups.test.ts`: vazio, válido, falha transitória B09 |
| Feedback de salvamento | No sucesso, persistir antes de publicar onSaved e referência da escalação | `persistence.test.tsx`: serviço rejeitando evidencia B11 |

## Observações que ainda exigem regra de produto

- A estatística presente em partida finalizada conta jogo mesmo com zero minutos; clean sheet é derivado do placar e não do flag individual. Placares ausentes viram zero. Teste identificado como observação atual, sem declarar correção desejada arbitrariamente.
- Identidade por nome/nacionalidade pode unir homônimos de IDs diferentes. A suíte fixa o algoritmo atual; uma política de identidade persistente pertence a uma decisão posterior.
- Empréstimo recebido é transportado pela criação de temporada; não há nova regra de expiração introduzida.
- `aggregatePlayerStats` arredonda médias progressivamente; a agregação de carreira arredonda no final. Casos básicos estão cobertos; equivalência para longos históricos exige análise adicional.
- Histórico compacto da base omite playerId e valores zero; o leitor existente recompõe identidade. O teste não classifica essa representação isolada como perda funcional confirmada.
- Valores monetários usam a sintaxe anunciada nos formulários (`1k`, `1.5M`, números sem separador de milhar). `1.000` é interpretado como decimal 1 pelo parser atual; não foi presumido suporte a separadores de milhar brasileiros. Casos de contrato usam `1k`/`2k` conforme a interface existente.

## Fixtures determinísticas

`src/test/factories/domain.ts` cria Career, ClubData, Players, Match, PlayerMatchStat, SavedLineup, LeagueStats e AcademyPlayers tipados. Cada chamada aloca novos objetos. Datas e IDs são explícitos; UUID é substituído somente nos testes dos serviços que o usam. `deepFreeze` impede mutação nos contratos onde ela não é esperada; casos de mutação conhecida comparam snapshots sem congelar a entrada.

`src/test/fixtures/scenarios.ts` oferece carreira vazia/uma/várias temporadas, elenco comum/vendido/cedido/recebido/promovido, partidas agendada/finalizada/prorrogação/pênaltis, manual+derivada, sobreposição de fontes, homônimos e cadeia de substituições. Torneio de base fica junto ao teste que o consome.

## Bugs conhecidos: atual versus regressão desejada

Todos permanecem **sem correção**. Cada linha tem teste executável do comportamento atual e `it.todo` especificado no mesmo arquivo.

| ID | Comportamento atual confirmado | Resultado desejado para a correção | Teste |
|---|---|---|---|
| B01 | Primeiro ballonDor=1 agrega 2 | Agregar 1; temporadas 1+2 agregam 3 | statistics |
| B02 | 2 jogos/3 gols manuais + partida de 2 gols: augment→raw→augment resulta 4 jogos/7 gols | Raw conserva base manual 2/3; novo augment continua 3/5 | statistics |
| B03 | validateMatchForm aceita 99/99 | valid=false com mensagem de data inválida | results |
| B04 | Retorno de recebido altera dataExit/leftClub no contrato original | Resultado atualizado, entrada idêntica ao snapshot | contracts |
| B05 | Lista elimina exclusivos legados quando há atuais; detalhe os conserva | Mesma união por ID nas duas leituras, atual prioritário | sources |
| B06 | Retorno de cedido em addSeason adiciona dois contratos na temporada anterior | Apenas a nova ficha recebe mudanças; histórico anterior permanece intacto | seasons |
| B07 | addSeason publica metadados antes de falha na cópia do jogador | Falha não deixa temporada publicada como completa; recuperação consistente | seasons |
| B08 | deleteSeason só consulta players e academyPlayers antes de excluir documento-pai | Excluir todos os descendentes conhecidos; comprovar no emulador | seasons |
| B09 | Erro unavailable em leitura remove ID persistido do grupo; retorno ainda lista ID antigo | Erro transitório não executa limpeza de membros | groups |
| B10 | Status promoted é salvo antes de falha na criação profissional | Não deixar promoção parcialmente concluída e irrecuperável | academy |
| B11 | Erro de ServiceLineup é absorvido; onSaved e referência salva avançam | Não publicar sucesso; preservar estado salvo e permitir tentativa | persistence |

Os testes com mocks demonstram ordem, parâmetros e decisões do código; não simulam transações, regras, exclusão recursiva ou atomicidade do Firestore. B07/B08/B10 exigem provas de persistência na etapa 4 antes de considerar suas correções completas.

## Limites e próximos alvos, sem refatoração nesta etapa

| Arquivo/símbolo | Por que não foi comprovado ponta a ponta | Menor próximo passo |
|---|---|---|
| `src/pages/Match/components/MatchDetailsTab/views/AddDetails/hooks/` — coordenação de atualização da tabela | Matemática pura coberta; edição, reversão e ordem entre múltiplas gravações dependem dos serviços | Testar o hook com fronteiras simuladas e depois emulador, incluindo editar duas vezes |
| `src/layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches` | save com merge e subcoleções podem manter pênaltis antigos; payload isolado não prova remoção persistida | Caso no emulador: salvar pênaltis, desativar, reler; testar N+1 apenas como comportamento, sem otimizar |
| `src/common/helpers/Deleters` — deleteCareerFromFirestore | Exclusão de temporada caracterizada; exclusão de carreira possui árvore própria | Semear todas as subcoleções no emulador e verificar árvore remanescente |
| `src/common/services/ServiceSeasons` + `stripHeavyData` | Remover payload pesado pode perder legado sem migração; mocks não representam armazenamento durável | Fixture legado exclusivo, atualizar metadados, reler e provar conservação |
| `src/pages/Match/components/LineupTab/views/AddMatchStatsPlayer/hooks/` | Fechamento/navegação após falha ainda não exercitado na UI completa | Hook com callback de erro e navegação simulada; sem alterar produção para facilitar |
| Agregação de grupos/PlayersGroupService | Carregamento do grupo e agregador puro cobertos; hidratação de playerStats em subcoleções ainda não | Cenário de duas carreiras, legado+atual e playerStats apenas em subcoleções |
| Regras de segurança Firestore | Nenhum SDK real nem emulador é executado nesta etapa | firebase-tools/rules-unit-testing somente na etapa 4, projeto demo e portas explícitas |

Nenhum desses limites exige refatorar produção agora. Se a etapa 4 precisar de uma fronteira adicional, preferir a menor injeção de dependência local e documentar separadamente.
