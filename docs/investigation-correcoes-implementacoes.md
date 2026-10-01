# Investigation Report — Correções e Implementações

## Resumo executivo

Investigação estática realizada em 30/09/2026 sobre o **estado local atual**, incluindo alterações e arquivos não commitados que já existiam. Não houve implementação, alteração de testes/configurações, commit, execução da aplicação, autenticação ou acesso ao Firebase. O único arquivo criado nesta etapa é este relatório. Copiar partidas/jogadores, como funcionalidade independente, permanece fora do escopo.

| ID | Item | Causa encontrada | Complexidade | Risco | Arquivos principais |
|---|---|---|---|---|---|
| 1 | Meses conforme calendário | `MONTH_OPTIONS` fixa Julho–Junho, embora os helpers já distingam Europa e demais países | baixa | baixo | `AllMatchesTab/index.tsx`, `constants/MONTH_OPTIONS/index.tsx`, `GetSeasonDateRange.ts` |
| 2 | Liberar camisa na dispensa | `releasePlayerAcademy` atualiza status/data/histórico, mas conserva `shirtNumber`; reserva por unicidade não foi localizada | média | médio | `AcademyService/index.ts`, `useAcademyActions/index.ts`, `AcademyPlayers.ts` |
| 3 | Foco na busca de jogadores | `usePlayerSearch` usa a ref somente para scroll; não existe autofocus/focus no picker | baixa | médio | `PlayerPicker/index.tsx`, `hooks/usePlayerSearch.ts`, `useLineup/index.ts` |
| 4 | Placeholder ao adicionar times | Problema descrito não encontrado: criação já usa valor vazio e placeholder `Nome da equipe` | baixa | baixo | `AddTeamsToTableProvider`, `TableTeamFormFields`, `FieldRenderer`, `SearchableSelect` |
| 5 | Reutilizar jogadores no torneio da base | Criação define `lineup: []`; abertura usa apenas `match.lineup`; não há busca de partida anterior | alta | alto | `useAcademyMatchMutations`, `useManageMatch`, `getAvailablePlayers`, `calculatePlayerStats` |
| 6 | Ícone de defesa para goleiros | Duas telas escolhem ícone pela quantidade truthy de `defesas`, sem consultar posição | média | médio | `TournamentMatchLineup`, feed `LineupList`, `FeedEvent.ts` |
| 7 | Scroll ao abrir stats da base | Editor interno monta abaixo da escalação, sem ref/efeito; scroll do workspace acompanha apenas a tela externa | baixa | médio | `ManageMatchView`, `LineupSection`, `StatsCard`, `useEntityWorkspace` |
| 8 | Derivar cartões adversários | Eventos detalhados e totais home/away são gravados independentemente; tipos também divergem entre objeto e array | alta | alto | `buildOpponentEvents`, `buildMatchPayload`, `buildInitialStats`, `buildMatchUpdate`, `reconcileMatch.ts` |

Os caminhos completos estão discriminados em cada item. Classificações consideram persistência, histórico, consumidores indiretos e concorrência encontrados, não apenas o tamanho aparente da UI.

## Método, limites e arquitetura confirmada

Foram utilizados buscas `rg`, leitura UTF-8 dos arquivos, rastreamento de imports/callbacks/tipos e inspeção de testes/configurações. O Git inicialmente recusou a leitura por ownership diferente; `git -c safe.directory=... status --short` permitiu a inspeção somente para aquele comando, sem alterar configuração global. O repositório já continha muitas modificações, exclusões e arquivos não rastreados.

Não foram executados testes, lint, build ou typecheck. A análise estática foi suficiente para localizar os fluxos; `tsc -b` pode escrever `.tsbuildinfo`, e runners/builds podem gerar caches e artefatos, incompatíveis com a restrição de escrever somente o relatório. Portanto não há resultado de testes executados nem alegação de reprodução visual. Os testes citados abaixo foram **lidos**, e os casos propostos são trabalho futuro.

Arquitetura observada: React 18/TypeScript/Vite, React Router, Swiper nas abas, CSS Modules e SDK Firebase no cliente. Há fontes modernas em subcollections e dados legados embutidos em `Career.clubData`. Não presumir que toda entidade reside somente no documento da carreira.

Para facilitar a leitura, estas abreviações de caminhos são usadas nas tabelas de arquivos. Cada entrada é um **prefixo literal**, não um diretório hipotético; concatenar prefixo e sufixo fornece o caminho exato:

| Prefixo | Caminho completo |
|---|---|
| `AM/` | `src/layout/SectionView/features/ClubTabs/AllMatchesTab/` |
| `AT/` | `src/layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/` |
| `AC/` | `src/pages/Academy/layouts/AcademyContent/` |
| `TM/` | `src/pages/Academy/layouts/AcademyContent/components/Tournament/features/Match/` |
| `LP/` | `src/pages/Match/components/LineupTab/` |
| `MD/` | `src/pages/Match/components/MatchDetailsTab/` |
| `MS/` | `src/pages/Match/components/MatchStatsTab/` |

Persistência comum confirmada:

- Base: `users/{uid}/careers/{careerId}/seasons/{seasonId}/academyPlayers/{playerId}` e `.../academyTournaments/{tournamentId}`. Partidas da base são elementos do array `matches` no documento do torneio, não documentos em uma collection de partidas da base.
- Profissional: `.../matches/{matchesId}`, com estatísticas individuais também em `.../matches/{matchesId}/playerStats/{playerId}`. Equipes da classificação ficam em `.../table/{teamId}`.
- `useCareers` assina autenticação e chama `ServiceCareer.getAll`; `src/common/helpers/Getters/index.ts` usa `onSnapshot` na collection de carreiras e hidrata fontes modernas de partidas/players, combinando legado por ID. `UseSeasonData` seleciona carreira/temporada desse resultado.
- A base usa `getDocs` e refetch explícito em `useAcademyPlayers`/`useAcademyTournaments`; não foi encontrado listener Firestore próprio desses hooks. `AcademyProvider` oferece `playersAcademy`, `allPlayersAcademy`, torneios, seleção e callbacks.
- `src/common/services/Firebase/index.ts` conecta emuladores **somente** quando `VITE_USE_FIREBASE_EMULATOR === "true"`: Auth 127.0.0.1:9098, Firestore 127.0.0.1:8089, Functions 127.0.0.1:5002. Importar/abrir a aplicação normalmente não garante isolamento.
- `vitest.config.ts` redireciona Firebase para mocks, bloqueia outros imports reais e evita arquivos `.env`; `src/test/setup.ts` bloqueia rede. `tests/integration/firebaseClient.ts` exige projeto sintético `demo-career-tracker-integration` e hosts locais exatos antes de conectar. Isso foi inspecionado, não executado. Qualquer validação futura de persistência deve confirmar runner, ambiente e guards, usar Emulator e fixtures sintéticas, sem contas/dados reais.

# ITEM 1 — Meses da aba de partidas devem respeitar o calendário

## 1. Comportamento atual

`AM/constants/MONTH_OPTIONS/index.tsx:1` exporta `Tudo`, Julho, Agosto, Setembro, Outubro, Novembro, Dezembro, Janeiro, Fevereiro, Março, Abril, Maio, Junho. `AllMatchesTab` passa esse array diretamente a `ButtonsSwitch` (`index.tsx:110`), para qualquer carreira, inclusive Geral e visão por jogador.

`selectedMonth` começa no localStorage (`matchSelectedMonth_{season.id}` ou sufixo `geral`) ou em `Tudo`. `processMatches` filtra pelo mês numérico de `match.date`; partidas finalizadas são ordenadas da mais recente para a mais antiga, e agendadas em ordem crescente. A ordem do seletor não determina a ordem das partidas.

## 2. Comportamento desejado

Ordenar os meses segundo o calendário já adotado pelo projeto, mantendo os filtros e o significado de cada mês.

## 3. Causa

**Confirmada:** o seletor não consulta a nação/calendário, apesar de receber `career`. `getSeasonDateRange` e `getSeasonName` já usam países de `leaguesByContinent.Europa`: Europa → Julho–Junho; demais → Janeiro–Dezembro. A base faz o equivalente em `isEuropeanSeason(career)` via `getContinentByCountry`.

Essa é a regra **do código**, não uma afirmação sobre calendários reais de todas as ligas. Não criar novas exceções geográficas nesta tarefa.

## 4. Fluxo atual

`NewCareerModal/CareerFormFields` → campo `nation` → `useCareerFormHandler`/`useSave.saveCareer` → `UseCreateCareer` → `ServiceCareer.saveCareer` → documento da carreira → `useCareers`/`UseSeasonData` → `AllMatchesTab` → `MONTH_OPTIONS` → `ButtonsSwitch`.

Seleção → `setSelectedMonth` → localStorage → `processMatches` → `MatchCard`.

Criação de partida → `useMatchActions.saveMatch` → `buildMatchData` → `getSeasonDateRange` → data com ano correto → `ServiceMatches`.

## 5. Arquivos envolvidos

| Arquivo | Responsabilidade / trecho relevante / participação futura |
|---|---|
| `AM/index.tsx` | Consumidor do seletor; derivar opções usando `career.nation`. |
| `AM/constants/MONTH_OPTIONS/index.tsx` | Lista fixa e `MONTH_TO_NUM`; reorganizar opções sem alterar o mapping numérico. |
| `AM/helpers/processMatches/index.ts` | Filtra `date.split('/')[1]`; preservar ordenação/status/filtro por jogador. |
| `AM/views/AddMatches/hooks/useMatchActions/index.ts` | Completa dia digitado com mês salvo; preservar labels e chaves. |
| `AM/views/AddMatches/helpers/buildMatchData/index.ts` | Cria `DD/MM/YY` conforme intervalo da temporada; referência de consistência. |
| `src/common/utils/GetSeasonDateRange.ts` | Regra de datas já existente; preferir esta política a inferir por competição. |
| `src/common/utils/GetSeasonName.ts` | Rótulo europeu `YY/YY` ou anual `YYYY`; consumidor equivalente. |
| `src/common/utils/league.ts` | `leaguesByContinent` agrupa continente → país → competições; base geográfica. |
| `src/common/services/GetContinentByCountry/index.ts` | Resolve país por chave exata; retorna `null` se desconhecido. |
| `AC/utils/isEuropeanSeason.ts` | Política equivalente da base; referência, sem importar código da página Academy para common. |
| `src/common/interfaces/Career.ts`, `src/common/interfaces/club/clubData.ts` | `nation` pertence à carreira; temporada não possui calendário/país próprios. |
| `src/ui/modals/NewCareerModal/components/CareerFormFields/index.tsx`, `src/common/hooks/Career/UseSave/index.ts`, `src/common/hooks/Career/UseCreateCareer/index.ts`, `src/common/services/ServiceCareer/index.ts` | Origem e persistência de `nation`; não precisam mudar para ordenar meses. |

## 6. Estrutura de dados

`Career`: `id`, `clubName`, `nation: string`, `createdAt: Date`, `clubData: ClubData[]`. `ClubData`: `id`, `seasonNumber`, `leagues?`, `matches?`, `teams?`, `players`. `Match`: `date: string`, `league: string`, `status`, `matchesId`. Não existe campo de calendário nos tipos examinados. `leaguesByContinent` tem chaves literais `Europa`, `América`, `Asia`; o critério atual é pertencer a Europa, não o nome da competição.

## 7. Persistência

Mudança do seletor é local, sem necessidade de gravação no Firestore. Preservar o localStorage por label. As partidas são lidas da temporada hidratada; a criação grava datas já ajustadas ao calendário em `.../matches/{matchesId}`. Não migrar datas para corrigir ordem visual.

## 8. Implementação recomendada

Derivar duas ordens a partir de uma lista canônica Janeiro–Dezembro, prefixadas por `Tudo`, escolhendo a ordem com a mesma regra geográfica dos helpers. Se extrair um pequeno helper comum, preservar exatamente a política atual e testar seus consumidores; não transformar este item em refactor amplo. Evitar importar `isEuropeanSeason` da página da base no domínio comum.

## 9. Edge cases

- País desconhecido/vazio cai em Janeiro–Dezembro nos helpers atuais; não inventar fallback europeu.
- Correspondência de país é exata, sensível a grafia/acentos/caixa.
- Geral agrega temporadas da mesma carreira; todas usam `career.nation`, sem geografia histórica por temporada.
- Alterar `nation` afeta a interpretação atual de todas as temporadas, mas não deve reescrever datas já salvas.
- Preservar `Tudo`, mês previamente selecionado e autocomplete de dia usando `MONTH_TO_NUM`.
- `processMatches` soma 2000 ao ano lido, compatível com `DD/MM/YY` profissional; não reutilizar esse parser cegamente em datas da base `DD/MM/YYYY`.

## 10. Riscos e regressões

Renomear labels ou converter seleção para índice quebra filtros e preenchimento rápido do mês. Usar a liga da partida produziria políticas conflitantes para uma carreira com várias competições. Mudança deve afetar somente a apresentação das opções.

## 11. Testes recomendados

Unitários: Europa e não Europa, país desconhecido, 12 meses únicos, mapping preservado. UI: seleção persistida, Geral, jogador e criação com apenas dia. Testes de datas em `src/test/results.test.ts` são relacionados à validação de data, mas não cobrem o seletor. Não foi localizado teste direto da ordem de meses. Emulator não é necessário para a mudança visual.

## 12. Critérios de aceite

- [ ] País mapeado em Europa exibe Julho–Junho.
- [ ] País não europeu exibe Janeiro–Dezembro.
- [ ] `Tudo`, filtros, status e ordenação cronológica permanecem iguais.
- [ ] Mês selecionado continua sendo usado ao cadastrar somente o dia.
- [ ] Nenhuma data persistida é alterada por abrir/trocar o seletor.

## 13. Questões não confirmadas

**NÃO CONFIRMADO:** exceções desejadas por país/liga fora da regra atual. Exigiriam especificação de produto; não são necessárias para tornar o seletor consistente com o código existente.

# ITEM 2 — Dispensar jogador da base deve retirar o número da camisa

## 1. Comportamento atual

No `PlayerEditor`, modo `evolution`, “Dispensar Atleta” abre `ReturnLoanConfirmModal`. A confirmação converte dia/mês em data completa conforme temporada e chama `onReleasePlayer`. `useAcademyActions.releasePlayer` remove o jogador da lista ativa otimisticamente, executa o service e refaz a leitura.

`AcademyService.releasePlayerAcademy` (`index.ts:209–235`, referência inicial) faz um único `updateDoc` com `status: 'released'`, `exitDate` e `evolutionHistory` acrescido. `shirtNumber` fica intacto. O jogador continua existindo para histórico/lista de dispensados.

## 2. Comportamento desejado

Remover a atribuição atual de camisa do jogador dispensado, junto com sua mudança de status, preservando identidade, histórico e partidas antigas.

## 3. Causa

**Confirmada:** falta remoção/limpeza de `shirtNumber` no update da dispensa. **NÃO CONFIRMADO:** que exista bloqueio de reutilização por “reserva” em outro documento. Não foi encontrado registro separado de números nem validação de unicidade na criação/edição da base. O problema comprovado é a associação persistida, não um mecanismo de reserva demonstrado.

## 4. Fluxo atual

`PlayerEditor` → `ReturnLoanConfirmModal.onConfirm` → `AcademyContext.onReleasePlayer` → `AcademyProvider` → `useAcademyActions.releasePlayer` → `AcademyService.releasePlayerAcademy` → `updateDoc(academyPlayers/{id})` → `refetchPlayers` → listas ativa/histórica atualizadas.

## 5. Arquivos envolvidos

| Arquivo | Responsabilidade / trecho relevante / participação futura |
|---|---|
| `AC/components/Player/components/PlayerEditor/index.tsx` | Abre modal e converte a data; preservar distinção entre dispensar e apagar. |
| `AC/components/Player/components/PlayerEditor/hooks/usePlayerEditor/index.ts` | `handleUndoStatus` desfaz saída; definir que desfazer dispensa não recupera automaticamente camisa já liberada. |
| `src/pages/Academy/layouts/contexts/AcademyProvider/index.tsx` | Liga callback ao contexto e expõe listas; revisar estado após dispensa. |
| `AC/hooks/useAcademyActions/index.ts` | `releasePlayer`, otimismo/refetch/erro; garantir temporada correta. |
| `AC/services/AcademyService/index.ts` | `releasePlayerAcademy`; ponto principal da remoção persistente da camisa. |
| `AC/services/AcademyService/helpers/index.ts` | Constrói caminho com uid/carreira/temporada/id. |
| `AC/interfaces/AcademyPlayers/AcademyPlayers.ts` | Declara `shirtNumber: number` obrigatório; adequar ausência. |
| `AC/components/Player/forms/types/PlayerDataPayload/index.ts` | Também declara número obrigatório; manter tipos coerentes. |
| `AC/components/Player/forms/hooks/usePlayerForm/index.ts` | Converte campo preenchido em Number e omite vazio; não confundir omissão com remoção no Firestore. |
| `AC/components/Player/forms/utils/getFormRows/index.ts` | Input de camisa usa `defaultValue: initialData?.shirtNumber`. |
| `AC/hooks/useAcademyPlayers/index.ts` | Separa ativos de `allPlayersAcademy`; refetch inclui dispensados. |
| `AC/components/Player/components/PlayerItem/index.tsx`, `AC/hooks/Sorts/useSortedPlayers/index.ts` | Renderizam/ordenam camisa; revisar ausência sem usar zero como atribuição. |
| `AC/services/AcademyService/helpers/buildPromotedPlayer/index.ts`, `src/common/services/ServicePlayers/PlayersContractService.ts` | Referências: cópia profissional da promoção remove camisa da academyData e inicia camisa profissional vazia; saída profissional também limpa com string vazia. Tipos são diferentes da base. |

## 6. Estrutura de dados

`AcademyPlayers` contém `id`, `name`, `shirtNumber: number`, `position`, `status`, `arrivalDate`, `exitDate?`, `evolutionHistory: AcademyPlayersHistory[]`, `seasonId?`. A atribuição está no documento do jogador. `PlayerMatchesStats` não tem camisa. Histórico pode registrar alterações de atributos; não apagar histórico de camisa se existir.

## 7. Persistência

Um documento, um `updateDoc`; não há batch/transaction na dispensa. Recomenda-se remover o campo com `deleteField()` **na mesma escrita** de status/data/histórico, e tornar a ausência representável no tipo. Não usar `undefined` nem simplesmente retirar a propriedade de um objeto enviado a `updateDoc`: omissão não apaga campo existente.

Nenhuma segunda gravação é necessária para a camisa. Separar status e camisa em duas escritas permitiria estado parcialmente liberado. Atomicidade de uma escrita não resolve o histórico calculado de snapshot antigo: chamadas concorrentes/repetidas podem perder/duplicar eventos. Se a implementação tratar esse problema de concorrência, ler estado atual em transaction e definir idempotência explicitamente, sem expandir silenciosamente o escopo.

O service não atualiza `career.updatedAt` nesse fluxo; UI da base depende do refetch explícito. Em falha, o hook refaz a leitura e exibe alerta. Histórico/escalações antigas não devem ser apagados.

## 8. Implementação recomendada

Limpar atribuição na escrita existente e ajustar tipos/consumidores para camisa ausente. Confirmar sucesso pela releitura sintética. `PlayerCircle` já aceita `undefined` e usa ícone de pessoa na ausência de camisa. Não propagar a dispensa para todas as temporadas nem tocar profissional vinculado por suposição. Não fazer migração automática de dispensados antigos ao abrir telas; eventual saneamento retroativo é tarefa separada.

Também existe `handleUndoStatus` no editor: ele espalha a ficha atual, restaura status `academy` e filtra eventos de saída. Depois de liberar camisa, recomenda-se retornar sem número e permitir nova atribuição, em vez de recuperar silenciosamente número que outro jogador pode ter recebido. A intenção de restaurar número antigo é **NÃO CONFIRMADO**.

## 9. Edge cases

Jogador já sem camisa; camisa zero em dado legado; dispensa repetida; falha de rede antes/depois do commit; histórico ausente em dado antigo; jogador com cópias em temporadas diferentes; visão Geral. `updatePlayer` considera `updatedPlayer.seasonId`, mas `releasePlayer` usa diretamente `seasonId` do contexto: a seleção da temporada exige atenção se a ação vier a ficar disponível em visão agregada. Atualmente o editor possui restrições de leitura por status/contexto.

## 10. Riscos e regressões

Usar `""` sem ajustar tipos importaria convenção do profissional para `number` da base. Apagar documento destruiria histórico e referências. Um update genérico posterior com objeto antigo pode reintroduzir camisa; respeitar status/read-only e estado após refetch.

## 11. Testes recomendados

Unitários: payload limpa camisa e conserva identidade/histórico. UI: ativo sai da lista, dispensado reaparece sem camisa, erro restaura estado pela leitura. Emulator: releitura confirma ausência real do campo; falha de escrita mantém status e camisa anteriores; duas temporadas permanecem isoladas. `src/test/academy.test.ts` e `tests/integration/academy.test.ts` cobrem promoção, histórico e atomicidade da promoção, não a liberação de camisa na dispensa.

## 12. Critérios de aceite

- [ ] Após dispensa bem-sucedida, documento não contém atribuição de camisa.
- [ ] Status, data e histórico são preservados/atualizados na mesma operação.
- [ ] Falha não persiste somente parte da mudança.
- [ ] Histórico de partidas e demais temporadas permanece intacto.
- [ ] A camisa pode ser atribuída a outro jogador sem vínculo ativo com o dispensado.

## 13. Questões não confirmadas

**NÃO CONFIRMADO:** existência de reserva adicional fora do fluxo examinado ou em versão publicada diferente. **NÃO CONFIRMADO:** necessidade de limpar registros já dispensados; o pedido confirma comportamento da futura dispensa, não migração retroativa.

# ITEM 3 — Busca de jogadores da partida deve abrir com input focado

## 1. Comportamento atual

`LP/components/PlayerPicker/index.tsx` exibe input controlado `search`, ref `searchRef`, placeholder “Buscar jogador...”. Não tem `autoFocus`. `usePlayerSearch` agenda scroll de janela após 150 ms, centralizando a posição do input com offset 110, mas nunca chama `.focus()`.

É um painel inline abaixo do campo, não modal/drawer/dialog. `LineupTab` monta-o quando `selectingSlotId && !isFromGeral`. Ao fechar/atribuir jogador, o picker desmonta. Ao trocar diretamente entre slots abertos, ele pode permanecer montado e conservar busca.

## 2. Comportamento desejado

Focar o campo a cada abertura apropriada; permitir teclado virtual quando o navegador suportar a ativação programática nesse contexto.

## 3. Causa

**Confirmada:** referência existe, mas é usada só para posicionamento; não há comando de foco. Comportamento concreto do teclado móvel é **NÃO CONFIRMADO** sem execução em dispositivos/navegadores.

## 4. Fluxo atual

Slot titular/reserva → `openPlayerPicker(slotId)` em `useLineup` → toggle de `selectingSlotId` → render condicional de `PlayerPicker` → `usePlayerSearch` → busca local/scroll. Seleção → `assignPlayer` → fecha picker → `scheduleLineupSlotScroll`. Abrir/focar não grava dados.

## 5. Arquivos envolvidos

| Arquivo | Responsabilidade / trecho relevante / participação futura |
|---|---|
| `LP/components/PlayerPicker/index.tsx` | Input real; local preferencial para autofocus na montagem. |
| `LP/components/PlayerPicker/hooks/usePlayerSearch.ts` | Ref e timer de scroll com cleanup; coordenar foco sem atrasá-lo desnecessariamente. |
| `LP/index.tsx` | Condição de montagem e ausência de key por slot; definir reabertura/troca de slot. |
| `LP/hooks/useLineup/index.ts` | `openPlayerPicker`, `assignPlayer`, fechamento; preservar seleção. |
| `LP/components/PlayerPicker/PlayerPicker.module.css` | Sem animação de abertura; lista tem scroll próprio de até 220 px, input fica fora dela. |
| `LP/services/scheduleLineupSlotScroll/index.ts` | Scroll após selecionar, 150 ms; evitar competição entre timers. |
| `src/pages/Match/index.tsx` | Abas visitadas continuam montadas no Swiper; atenção a foco em aba oculta. |
| `src/components/SearchableSelect/index.tsx` | Exemplo de focus síncrono em clique; input desse componente já está montado. |
| `AC/components/Player/components/AddPlayerAnnotations/index.tsx` | Outro exemplo local de ref/focus; não é garantia de teclado móvel. |

## 6. Estrutura de dados

`selectingSlotId: string | null`, `search: string`, `searchRef: RefObject<HTMLInputElement>`, `assignedIds: Set<string>`, `players: Players[]`. Disponíveis excluem vendidos, atribuídos, camisa null/vazia e nomes que não correspondem à busca.

## 7. Persistência

Busca/foco são estado local. A escalação tem persistência própria posterior; este item não deve adicionar chamada Firebase nem modificar stats/lineup.

## 8. Implementação recomendada

Começar com foco na montagem do input (`autoFocus` ou ref de montagem bem controlada). Não colocar foco apenas dentro do timer de 150 ms. Se for necessário refocar ao trocar slot com picker montado, passar o identificador/estado de abertura e tratar a mudança explicitamente; não refocar a cada caractere ou atualização de players. Coordenar scroll com `focus({ preventScroll: true })` quando aplicável e validar a abordagem nos navegadores-alvo. Verificar aba ativa antes de qualquer foco disparado por efeito.

## 9. Edge cases

Abrir/fechar rapidamente; trocar slot; selecionar e reabrir; lista vazia; abrir após navegar por outra aba; teclado físico; teclado virtual alterando viewport; usuário já digitando; desenvolvimento em StrictMode; desmontagem antes do timer.

## 10. Riscos e regressões

Foco tardio pode roubar foco de outra tela. Scroll antigo pode disputar com posicionamento pós-seleção e com teclado. Não prometer abertura universal de teclado virtual; estabelecer evidência nos dispositivos efetivamente suportados.

## 11. Testes recomendados

UI/DOM: campo é `document.activeElement` após abrir/reabrir; digitação contínua mantém foco; fechar cancela efeitos; nenhuma chamada de persistência. Browser/mobile: titular/reserva, Android e iOS disponíveis, viewport e teclado. `src/test/lineup.test.ts` e `src/test/persistence.test.tsx` testam escalação/persistência, não autofocus do picker. Emulator só seria necessário para navegar com dados, sempre sintéticos.

## 12. Critérios de aceite

- [ ] Abrir a busca visível foca o input sem clique adicional.
- [ ] Reabrir após selecionar volta a focá-lo.
- [ ] Não há foco roubado por picker oculto nem salto tardio após fechar.
- [ ] Teclado móvel abre nos navegadores validados que suportam o fluxo.
- [ ] Filtros e atribuição de jogador permanecem iguais.

## 13. Questões não confirmadas

**NÃO CONFIRMADO:** matriz de navegadores/dispositivos e comportamento do teclado real. O componente identificado corresponde à busca na escalação profissional; a base tem outro `SearchableSelect`, sempre montado no editor.

# ITEM 4 — Campo “adicionar times” da tabela deve usar placeholder

## 1. Comportamento atual

O botão “Adicionar times” abre `AddTeamsToTable`. Seu provider chama `useForm`, que inicia `formValues` como `{}`. `FieldRenderer` usa `formValues?.[field.id] ?? ""`. O campo `teamName` é `searchable-select` com placeholder **“Nome da equipe”**. `SearchableSelect` passa separadamente `value` e `placeholder` ao input nativo.

Portanto, na criação com provider novo, o campo já começa vazio. Na edição, `AddTeamsToTableScreen` preenche `teamName` com `teamToEdit.name`, corretamente. “Adicionar times” é texto do botão, não valor inicial do input encontrado.

## 2. Comportamento desejado

Criação vazia, texto orientativo apenas como placeholder. Edição deve manter o nome salvo.

## 3. Causa

**NÃO CONFIRMADO:** o defeito descrito não corresponde ao código local examinado. Hipóteses a validar futuramente: versão publicada diferente, outra tela ou reutilização de estado entre edição/criação. Nenhuma delas foi demonstrada nesta investigação.

## 4. Fluxo atual

`Buttons.AddTeamsToTable` → tela `addTeamsToTable`/rota → `AddTeamsToTableProvider` → `useForm` → `AddTeamsToTableScreen` → `useTableTeamForm` → `getTableTeamFormFields` → `FormSection`/`FieldRenderer` → `SearchableSelect` → `handleInputChange`.

Salvar → `useTableTeamActions.saveTableTeam` → valida nome contra equipes/carreira → `ServiceTable.addTeamToTable` ou `updateTeamInTable` → callback otimista `onClose`.

## 5. Arquivos envolvidos

| Arquivo | Responsabilidade / trecho relevante / participação futura |
|---|---|
| `src/common/elements/Buttons/AddTeamsToTable/index.tsx` | Texto do botão; não é input. |
| `AT/index.tsx`, `AT/contexts/AddTeamsToTableContext/index.tsx` | Montagem do provider/formulário; verificar ciclo criação → edição → criação. |
| `src/common/hooks/UseForm/index.ts` | Estado inicial `{}` e handler controlado. |
| `AT/screens/AddTeamsToTableScreen/index.tsx` | Só preenche quando existe `teamToEdit`; preservar edição. |
| `AT/hooks/useTableTeamForm/index.ts` | Filtra nomes pelo texto digitado e calcula `hasSelectedTeam`. |
| `AT/constants/TableTeamFormFields/index.tsx` | Declara placeholder “Nome da equipe”; já atende ao princípio solicitado. |
| `src/components/FieldRenderer/index.tsx`, `src/components/SearchableSelect/index.tsx` | Fallback vazio e input real; não alterar globalmente sem falha demonstrada. |
| `AT/hooks/useTableTeamActions/index.ts`, `AT/services/ServiceTable/index.ts` | Validação e persistência; examinar em regressão, sem patch necessário ao placeholder. |

## 6. Estrutura de dados

`formValues: Record<string,string>`; campos `teamName`, `played`, `won`, `drawn`, `lost`, `goalsFor`, `goalsAgainst`, `customZone`. Ao salvar, `teamName` vira `TableTeamData.name`; pontos = `won * 3 + drawn`, saldo = `goalsFor - goalsAgainst`.

## 7. Persistência

Placeholder não é persistido. `getTableBySeason` lê `.../table`. Add usa `setDoc`, update usa `setDoc(..., { merge: true })`, e o service atualiza `career.updatedAt` separadamente. Não há batch nesse CRUD. Não é necessário alterar Firebase para este item.

## 8. Implementação recomendada

**Não propor patch para um value inicial que não existe.** Primeiro confirmar em UI sintética que criar inicia vazio, editar preenche e voltar a criar não conserva o nome. Se o problema ocorrer apenas em provider reaproveitado, corrigir o reset no limite criação/edição, sem apagar o nome de uma edição legítima. Trocar somente o texto do placeholder é opcional de produto; o pedido conceitual já está atendido.

## 9. Edge cases

Editar → criar na mesma árvore; nome igual ao clube; time já adicionado; digitação parcial; caixa/espaços; lista vazia. `hasSelectedTeam` controla se demais campos aparecem; um valor artificial filtraria opções e poderia esconder seções, mas isso não ocorre no estado inicial encontrado.

## 10. Riscos e regressões

Forçar `value=""` permanentemente impediria digitação. Reset indiscriminado apagaria edição. Não alterar `SearchableSelect` global para resolver um problema não confirmado.

## 11. Testes recomendados

UI sintética: input vazio e placeholder presente na criação; editar conserva nome; criar novamente não reutiliza edição; placeholder nunca vai ao submit; filtragem funciona. Não foi localizado teste específico de placeholder nesse formulário. Testes de resultados/tabela em `tests/integration/results.test.tsx` são regressão de persistência, não prova desse comportamento visual.

## 12. Critérios de aceite

- [ ] Na criação, `input.value === ""` e placeholder está presente.
- [ ] O usuário digita sem precisar apagar texto orientativo.
- [ ] Edição mantém o nome do time.
- [ ] Nenhum texto orientativo entra no filtro ou payload.
- [ ] Se tudo já passar, encerrar item sem alteração de produção.

## 13. Questões não confirmadas

**NÃO CONFIRMADO:** versão/rota exata em que o usuário observou valor artificial e eventual retenção de estado em navegação. Seria necessário reproduzir esse percurso com fixture sintética, sem acessar produção.

# ITEM 5 — Reutilizar jogadores entre partidas do mesmo torneio da base

## 1. Comportamento atual

`useAcademyMatchMutations.handleSubmitMatch` cria UUID, data `DD/MM/YYYY`, adversário/fase, placares zero, `lineup: []` e `result: 'SCHEDULED'`, adicionando ao array do torneio. Edição conserva os demais dados e altera data/adversário/status.

`TournamentWorkspace` guarda `managingMatch` ao entrar; `ManageMatchView` chama `useManageMatch`, cujo `lineupStats` é inicializado somente com `match.lineup || []`. Cada inclusão manual cria uma ficha com identidade e cinco estatísticas null, e salva o torneio imediatamente. Não há seleção de partida anterior.

## 2. Comportamento desejado

Usar jogadores de uma partida anterior do mesmo torneio como ponto de partida da próxima, sem herdar qualquer estatística específica nem sobrescrever escalação já trabalhada.

## 3. Causa

**Confirmada:** ausência de busca/inicialização a partir do torneio. Além disso, não há `createdAt`, rodada numérica ou marcador de inicialização em `AcademyMatches`. `status` é texto de fase (ex.: Final/Fase de Grupos), enquanto `result` representa SCHEDULED/FINISHED. Não confundir esses campos.

## 4. Fluxo atual

`CreateAcademyMatchForm` → form `useMatchForm` → `useAcademyMatchMutations.handleSubmitMatch` → `onUpdateTournament(updatedTournament, true)` → `useAcademyActions.updateTournament` → `AcademyService.updateTournamentAcademy` → `updateDoc(academyTournaments/{id}, {...updatedTournament})`.

`TournamentMatchActions` → `TournamentWorkspace.setManagingMatch` → `ManageMatchView` → `useManageMatch` → `handleAddPlayer`/`handleSavePlayerStats`/`handleSave` → `saveMatchToDB` → `buildUpdatedMatch` → substituição por `match.id` no array → mesmo fluxo de atualização do torneio.

## 5. Arquivos envolvidos

| Arquivo | Responsabilidade / trecho relevante / participação futura |
|---|---|
| `AC/interfaces/AcademyTournaments/AcademyTournaments.ts` | Documento pai, ID do torneio e array de partidas. |
| `AC/interfaces/AcademyTournaments/AcademyMatches/AcademyMatches.ts` | Modelo da partida; eventual metadado novo precisa ser explicitamente adicionado aqui. |
| `AC/interfaces/AcademyTournaments/AcademyMatches/PlayerMatchesStats.ts` | Lista real e restrita de identidade/stats. |
| `TM/containers/CreateAcademyMatchForm/hooks/useAcademyMatchMutations/index.ts` | Criação com `lineup: []`, edição e append; definir inicialização sem duplicá-la. |
| `AC/components/Tournament/views/TournamentWorkspace/index.tsx` | Guarda snapshot da partida ao abrir; verificar reabertura e atualizações do torneio. |
| `TM/components/ManageMatchView/hooks/useManageMatch/index.ts` | Estado local, inclusão manual e persistência; principal ponto de aplicar proposta ao abrir. |
| `TM/components/ManageMatchView/helpers/getAvailablePlayers/index.ts` | Elegibilidade histórica por saída e exclusão de já escalados; reaproveitar com cautela de datas. |
| `TM/components/ManageMatchView/helpers/buildUpdatedMatch/index.ts` | Normaliza stats, recalcula cleanSheets e placar; **não é função de reset**. |
| `TM/components/TournamentMatchList/index.tsx` | Renderiza ordem do array, sem sort cronológico. |
| `AC/hooks/useAcademyActions/index.ts`, `AC/services/AcademyService/index.ts` | Escrita otimista do torneio inteiro e tratamento de falha; consistência. |
| `AC/hooks/useAcademyPlayers/index.ts`, `AC/hooks/useAcademyTournaments/index.ts` | Carregamento/refetch, ativos e históricos; esperar dados antes de decidir inelegibilidade. |
| `AC/components/Player/components/PlayerPerformance/helpers/calculatePlayerStats/index.ts` | Conta presença na lineup mesmo agendada; dependência obrigatória da semeadura antecipada. |
| `AC/services/AcademyService/helpers/buildPlayerAcademyTournaments/index.ts` | Exporta histórico ao promover; verificar impacto de escalação apenas sugerida. |
| `AC/utils/isEuropeanSeason.ts`, `AC/utils/getSeasonStartYear.ts` | Contexto das datas; preservar ano real já salvo. |

## 6. Estrutura de dados

```ts
// Recorte dos tipos existentes, não uma proposta de patch.
AcademyTournaments = {
  id: string; name: string; date: string; totalMatches: number;
  matches: AcademyMatches[]; tournamentResult: string;
  isChampion: boolean; isFinished?: boolean;
}
AcademyMatches = {
  id: string; date: string; opponentTeam: string;
  userGoals: number | undefined; opponentGoals: number | undefined;
  userPenalties?: number; opponentPenalties?: number;
  status?: string; result?: "SCHEDULED" | "FINISHED" | string;
  lineup: PlayerMatchesStats[];
}
PlayerMatchesStats = {
  playerId: string; playerName: string;
  goals: number | null; assists: number | null; rating: number | null;
  defesas?: number | null; cleanSheets?: number | null;
}
```

**CAMPOS A PRESERVAR**

| Campo | Política recomendada |
|---|---|
| `playerId` | Identidade estável; deduplicar por ID, nunca por nome. |
| `playerName` | Identificação textual; preferir nome da ficha atual elegível, mantendo o ID. Fallback histórico deve ser decisão explícita. |
| Ordem relativa dos jogadores | Pode ser preservada da lineup de origem; não é campo de estatística. |

**CAMPOS A RESETAR**

| Campo existente | Valor inicial recomendado |
|---|---|
| `goals` | `null` |
| `assists` | `null` |
| `rating` | `null` |
| `defesas` | `null` |
| `cleanSheets` | `null` |

`null` é o estado vazio já usado na inclusão manual. Zero representa uma estatística preenchida e, em `rating`, entraria na média; portanto não usar zero para todas as stats. Cartões, minutos e eventos **não existem nesse tipo de ficha da base**. Não importar o modelo profissional `PlayerMatchStat`, que é diferente. Uma projeção por lista permitida impede carregar campos extras legados/futuros indevidamente.

ID/data/adversário/fase/resultado/placar/pênaltis da partida anterior não são copiados. A partida destino conserva os seus próprios campos; os defaults de uma partida nova continuam vindo da criação existente.

## 7. Persistência

Identidade do torneio é o caminho `uid/careerId/seasonId/academyTournaments/tournamentId`, não `name`. A escalação é `matches[i].lineup`. A escrita atual substitui o array `matches` com base no estado do cliente, sem transaction/batch; duas edições concorrentes de partidas do mesmo torneio podem sobrescrever uma à outra.

`useAcademyActions.updateTournament` captura erro e faz refetch, mas não relança. Assim, quem aguarda `onUpdateTournament` pode continuar como se tivesse sucesso. A futura inicialização não pode marcar “salvo/inicializado” definitivamente antes de confirmação real. Se persistir automaticamente um seed, preferir operação específica que leia a partida atual e só aplique o seed se ainda estiver elegível, em transaction. Não recriar o documento inteiro para uma conveniência de UI.

## 8. Implementação recomendada

1. Extrair transformação pura de jogador → ficha limpa, coerente com `handleAddPlayer`; não espalhar o objeto de stats de origem. `buildUpdatedMatch` não serve: preserva stats e converte placar vazio em zero, atribuindo `cleanSheets: 1` a goleiro contra zero gols.
2. Resolver a fonte **no mesmo torneio**, usando dados carregados de `selectedTournament.matches`. Recomenda-se a partida cronologicamente anterior mais recente com lineup salva não vazia; desempatar partidas no mesmo dia pela posição no array, já que não há horário/createdAt. Registrar essa política como decisão de produto, não como regra já existente. Não escolher uma partida futura só porque é a última do array.
3. Preferir preparação de rascunho na primeira abertura da partida ainda não trabalhada. Isso atende partidas cadastradas todas de uma vez, quando a anterior só ganha jogadores depois da criação. Preservar qualquer lineup existente e qualquer partida finalizada; não alterar partidas vizinhas.
4. Usar `allPlayersAcademy` e identidade por ID para validar elegibilidade na data destino. Não usar somente lista ativa: hoje o sistema permite participação histórica anterior à saída. Revalidar antes da gravação; não interpretar lista ainda carregando como ausência definitiva.
5. Definir distinção entre “nunca inicializada” e “usuário removeu todos”. Não existe marcador hoje. Se necessário, propor metadado específico na partida (por exemplo, um indicador de inicialização, **campo novo**), persistido junto à decisão do usuário. Para legado vazio, manter política conservadora; não preencher silenciosamente partida já finalizada.
6. Decidir se a sugestão fica só no rascunho até a primeira ação de salvar ou se é persistida ao abrir. Recomenda-se rascunho sem escrita ao abrir. Remoção deliberada deve ser respeitada após salvar/reabrir; sem marcador ou ação explícita não há como inferir intenção de um array vazio.
7. Antes de persistir lineup sugerida em partida agendada, tratar o impacto nos resumos: `calculatePlayerStats` conta todas as lineups sem verificar `result`. Uma proposta ainda não jogada não deve virar participação real. `buildPlayerAcademyTournaments` também filtra participação por presença na lineup sem exigir FINISHED; seu `cleanStats` conserva stats truthy e omite identidade, portanto não é helper reutilizável para semear jogadores. Isso é dependência direta deste item, não copiar estatísticas por outro caminho.

## 9. Edge cases

- Primeira partida: rascunho vazio, inclusão manual normal.
- Anterior vazia: política proposta busca anterior elegível mais antiga; se nenhuma, vazio. Essa escolha precisa ficar explícita nos testes.
- Dispensado/promovido: considerar saída em relação à data destino. `getAvailablePlayers` exclui apenas se `matchDate > exitDate`; igualdade permite. Sem data de saída, o helper deixa passar.
- Jogador recém-chegado: não entra automaticamente se não estava na fonte; continua adicionável manualmente. O helper atual não verifica `arrivalDate`, o que precisa ser considerado em partidas retroativas.
- Jogador apagado: lineup pode manter `playerId/playerName`, mas a ficha não existe e `LineupSection` nem renderiza sua linha. Recomenda-se não semear órfãos; preservar histórico de origem.
- Nome duplicado: inclusão manual atual resolve por nome; seed deve evitar essa ambiguidade usando ID.
- Janeiro–Junho europeu: criação já incrementa ano; `getAvailablePlayers.parseDate` incrementa novamente ano de meses < 7. Não reutilizar esse parser para ordenar datas completas sem resolver/validar a dupla interpretação.
- Dados de partidas sem `lineup`, data inválida, empate de data e arrays fora de ordem: fallback determinístico, sem inventar cronologia.
- Abrir B antes de terminar A; editar A depois de B; fechar sem salvar B; remover todos em B; partidas de torneios homônimos/temporadas diferentes.

## 10. Riscos e regressões

Stats antigas contaminarem destino; nota zero entrar na média; clean sheet ser calculado ao semear; partidas agendadas inflarem jogos/títulos; jogadores inelegíveis reaparecerem; seed sobrescrever edição concorrente; rascunho ficar preso em `managingMatch` antigo. A posição atual do jogador não é snapshot histórico; item 6 compartilha esse limite.

## 11. Testes recomendados

Unitários: transformação allowlist com objeto de origem contendo todos os cinco campos e extras; não mutação; ordenação/desempate/fonte vazia; isolamento por torneio; elegibilidade antes/no/depois da saída e fronteira dezembro/janeiro. UI: primeira abertura, já preenchida, finalizada, remoção total, reabertura, dados carregando. Integração/Emulator: persistir só destino, rejeição de commit, atualizações concorrentes, nenhum seed parcial, metadado junto à lineup se adotado. Resumos e promoção não devem incorporar proposta não jogada.

`src/test/academy.test.ts` testa `buildPlayerAcademyTournaments` e promoção; `tests/integration/academy.test.ts` testa persistência/histórico e falhas da promoção. Não foi localizado teste específico de reaproveitamento ou de `useManageMatch`.

## 12. Critérios de aceite

- [ ] Próxima partida recebe somente jogadores elegíveis da fonte definida no mesmo torneio.
- [ ] Os cinco campos de stats começam vazios (`null`), sem campos extras copiados.
- [ ] Nenhum dado específico da partida anterior é carregado no destino.
- [ ] Lineup já salva, partida finalizada e remoção deliberada são respeitadas.
- [ ] Partida original e outros torneios/temporadas permanecem intactos.
- [ ] Pré-seleção não aumenta jogos, médias, defesas, clean sheets ou títulos nos resumos.
- [ ] Falha/concor­rência não apresenta inicialização falsamente salva nem apaga outra partida.

## 13. Questões não confirmadas

**NÃO CONFIRMADO:** significado de “anterior” em datas iguais, fallback quando anterior está vazia, exigência de fonte finalizada versus apenas salva, política para saídos sem data e destino legado vazio. O relatório recomenda políticas, mas os tipos atuais não resolvem essas decisões. **NÃO CONFIRMADO:** necessidade de snapshot histórico de posição; não existe na ficha de partida.

# ITEM 6 — Goleiros da base devem sempre utilizar ícone de defesa

## 1. Comportamento atual

Há duas condições idênticas: `const defesas = player.defesas || 0` seguido de `{defesas ? MdSportsHandball : GiSoccerBall}`. A primeira fica em `TournamentMatchLineup/index.tsx:47`; a segunda em feed `MatchDetails/ui/LineupList/index.tsx:52`. Com zero/null/undefined, usa bola de gols. Um jogador de linha com dado incorreto de defesas positivo também receberia ícone de defesa.

## 2. Comportamento desejado

Selecionar ícone por posição (`GOL`), exibindo defesa mesmo com quantidade zero; linha continua com gols.

## 3. Causa

**Confirmada:** a condição testa quantidade, não posição. `PlayerMatchesStats` não contém posição; o primeiro componente recebe apenas lineup. No feed, o tipo simplificado de lineup nem declara `playerId`, embora `useAcademyFeed` atribua `match.lineup` diretamente e os objetos atuais conservem o ID em runtime.

## 4. Fluxo atual

`academyTournaments.matches[].lineup` → `TournamentMatchCard` → `TournamentMatchLineup` → ícone por `defesas`.

Mesma origem → `useAcademyFeed` (somente partidas FINISHED) → `FeedEvent.details.lineup` → `FeedItemModal` → `MatchDetails` → `LineupList` → mesma condição incorreta.

## 5. Arquivos envolvidos

| Arquivo | Responsabilidade / trecho relevante / participação futura |
|---|---|
| `TM/components/TournamentMatchList/components/TournamentMatchLineup/index.tsx` | Primeira decisão incorreta; receber/resolver posição por ID. |
| `TM/components/TournamentMatchList/components/TournamentMatchCard/index.tsx` | Já usa contexto da base; pode fornecer mapa/lookup de jogadores. |
| `AC/components/FeedItem/components/FeedItemModal/components/MatchDetails/ui/LineupList/index.tsx` | Segunda decisão incorreta; manter filtro de destaques separado da escolha de ícone. |
| `AC/components/FeedItem/components/FeedItemModal/index.tsx`, `AC/components/FeedItem/components/FeedItemModal/components/MatchDetails/index.tsx` | Passagem de dados; modal já tem `allPlayersAcademy` no contexto. |
| `AC/components/FeedItem/types/FeedEvent.ts`, `AC/components/FeedItem/hooks/useAcademyFeed/index.ts` | Tipo estreito de lineup e montagem do feed; garantir identidade tipada. |
| `AC/interfaces/AcademyPlayers/AcademyPlayers.ts` | `position: string`; goleiro é literal `GOL`. |
| `AC/components/Player/components/PlayerPerformance/helpers/calculatePlayerStats/index.ts` | Já deriva `isGoleiro` de `selectedPlayer.position === 'GOL'`. |
| `AC/components/Player/components/PlayerPerformance/components/TournamentStatItem/index.tsx`, `AC/components/Player/components/PlayerPerformance/components/GeneralStatsFooter/index.tsx` | Exemplos corretos: trocam ícone/valor usando `isGoleiro`, não quantidade. |

## 6. Estrutura de dados

`AcademyPlayers.position: string` identifica função; `playerId` liga ficha da partida ao jogador. `defesas?: number | null` é métrica, não papel. `FeedEvent.details.lineup` declara apenas `playerName`, `rating`, `goals`, `assists?`, `defesas?`; ajustar identidade tipada ou enriquecer explicitamente o modelo de apresentação.

## 7. Persistência

Correção visual pode usar `allPlayersAcademy`, incluindo promovidos/dispensados, sem escrita no Firebase. Evitar novo fetch por jogador. Se optar por snapshot de posição na partida para registros órfãos/históricos, isso é evolução de schema adicional e precisa de política de legado; não é campo existente.

## 8. Implementação recomendada

Resolver jogador por ID contra dados já carregados, determinar `isGoalkeeper` por `position === 'GOL'` e exibir `defesas ?? 0` ou `goals ?? 0`. Aplicar a mesma decisão nos dois locais, preferencialmente com helper pequeno de apresentação ou props tipadas, sem refactor do sistema inteiro de ícones.

Não procurar por nome, não usar `defesas != null` como substituto definitivo de posição, não limitar lookup a ativos. Ausência de posição deve ter fallback explícito; não alegar que será possível identificar todo goleiro histórico se sua ficha foi apagada.

## 9. Edge cases

Goleiro com 0/1/5/null/undefined defesas; linha com defesas inconsistentes; jogador promovido/dispensado; ficha apagada; posição alterada após partida; homônimos. No feed, `playersWithStats` filtra por nota não-null ou gols positivos: goleiro sem nota e sem gol pode nem aparecer, independentemente do ícone. Preservar esse filtro salvo decisão separada.

## 10. Riscos e regressões

Corrigir apenas lista do torneio deixaria feed errado. Usar somente ativos quebra histórico de promovidos. Alterar o tipo do feed sem acompanhar o produtor perde identificação. A posição atual pode não corresponder à posição na data do jogo.

## 11. Testes recomendados

UI nos dois componentes: GOL com 0/5/null, linha com 0 gols, linha com defesas positivas, promovido, homônimos e ficha ausente. Integração do feed deve manter `playerId` desde a lineup. Não foram localizados testes diretos desses dois renderizadores; exemplos corretos em PlayerPerformance servem como referência, não prova de cobertura.

## 12. Critérios de aceite

- [ ] Goleiro identificado mostra defesa com 0, 1 ou várias defesas nos dois locais.
- [ ] Jogador de linha continua mostrando gols.
- [ ] Seleção do ícone independe do valor de `defesas`.
- [ ] Promovidos/dispensados com ficha existente continuam identificáveis.
- [ ] Nenhuma gravação é feita apenas para renderizar ícones.

## 13. Questões não confirmadas

**NÃO CONFIRMADO:** política para ficha apagada ou mudança histórica de posição. Para garantia absoluta nesses casos, falta dado persistido de papel/posição na partida.

# ITEM 7 — Scroll automático ao abrir “adicionar stats” na base

## 1. Comportamento atual

Há dois níveis. O botão encontrado tem texto literal “Entrar na Partida” e aciona `TournamentWorkspace`, mudando `activeComponent` para `manage-match`; `useEntityWorkspace` já rola até `activeContentRef` depois de 150 ms. Dentro do editor, clicar em um jogador em `LineupSection` alterna `selectedPlayerIdForStats`. `ManageMatchView` monta `StatsCard` **depois de toda a escalação**, apenas quando há ID e `selectedStats`. Esse segundo nível não tem scroll. “Adicionar stats” é a descrição do pedido, não o rótulo literal desse botão no código atual.

`StatsCard` anima opacity e `translateY(5px)` por 0,3 s. Não há expansão animada de altura. Trocar jogador mantém o mesmo componente montado, atualizando props.

## 2. Comportamento desejado

Ao abrir a edição de estatísticas, posicionar a tela para que título/campos da área recém-aberta fiquem visíveis.

## 3. Causa

**Confirmada no editor interno:** mudança de jogador não altera `activeComponent`, e não há ref/efeito associado a `selectedPlayerIdForStats`. O scroll externo conhece o início de “Em jogo vs ...”, não o `StatsCard` no final de uma escalação longa.

**NÃO CONFIRMADO:** se a observação do usuário também envolve falha na rolagem externa, que já possui implementação. Não assumir que toda a base carece de scroll.

## 4. Fluxo atual

`TournamentMatchActions.onEnterMatch` → `TournamentWorkspace` → `EntityWorkspace/useEntityWorkspace` → scroll externo.

`LineupSection.PlayerItem.onClick` → `setSelectedPlayerIdForStats(id|null)` em `useManageMatch` → busca de `selectedStats` → montagem/atualização de `StatsCard` → nenhum posicionamento adicional.

## 5. Arquivos envolvidos

| Arquivo | Responsabilidade / trecho relevante / participação futura |
|---|---|
| `TM/components/ManageMatchView/index.tsx` | Condição de montagem; melhor local para wrapper/ref do editor. |
| `TM/components/ManageMatchView/components/LineupSection/index.tsx` | Evento de seleção/fechamento; manter toggle existente. |
| `TM/components/ManageMatchView/hooks/useManageMatch/index.ts` | ID selecionado; não colocar scroll em gravação de stats. |
| `TM/components/ManageMatchView/components/StatsCard/index.tsx`, `TM/components/ManageMatchView/components/StatsCard/StatsCard.module.css` | Cabeçalho-alvo e animação 0,3 s; eventual scroll margin. |
| `AC/hooks/useEntityWorkspace/index.ts` | Scroll existente com cálculo de top, margem 13 px e timer de 150 ms; observar disputas. |
| `AC/components/Tournament/views/TournamentWorkspace/index.tsx` | Scroll externo e montagem de ManageMatchView. |
| `AC/AcademyContent.module.css`, `AC/ui/AcademyContentHeader/AcademyContentHeader.module.css` | Container normal de página, padding inferior 200 px, header não fixo. |
| `src/ui/BottomMenu/BottomMenu.module.css`, `src/ui/Navbar/Navbar.module.css` | BottomMenu é fixo; Navbar de outras telas é sticky de 80 px, não presumir que está na rota da Academy. |

## 6. Estrutura de dados

Somente `selectedPlayerIdForStats: string | null`, `selectedStats: PlayerMatchesStats | undefined` e referência DOM futura. Nenhum novo campo de domínio é necessário.

## 7. Persistência

Abrir/fechar stats altera estado local. O workspace persiste aba em localStorage, mas o scroll não necessita Firebase. Salvar stats é outra ação, já descrita no item 5; não usá-la como gatilho da rolagem de abertura.

## 8. Implementação recomendada

Referenciar wrapper estável antes do título “Estatísticas: {nome}”; disparar rolagem após o commit em que ID selecionado e ficha existem. Dependência deve ser ID/abertura, não todo objeto de stats, para não rolar a cada digitação. Para manter padrão local, cálculo `rect.top + window.scrollY - margem` é coerente; `scrollIntoView({block: 'start'})` com scroll margin também é apropriado. Não centralizar um card alto se isso esconder seu cabeçalho.

Usar alvo fora da transformação da animação ou esperar layout de forma controlada; não copiar um timeout longo sem necessidade. Cancelar trabalho agendado ao fechar/trocar. Respeitar movimento reduzido e verificar BottomMenu. Não focar input como efeito colateral desse item, para não abrir teclado desnecessariamente.

## 9. Edge cases

Escalação longa, card de goleiro mais alto, trocar jogador com editor aberto, clicar no mesmo jogador para fechar, salvar/remover durante animação, viewport pequena, teclado já aberto, zoom e fonte ampliada. `useEntityWorkspace` depende também de `entity`: atualização do torneio após salvar pode agendar scroll externo; testar para evitar disputa com scroll interno.

## 10. Riscos e regressões

Scroll em toda atualização de stats interromperia digitação. Seletores globais podem atingir outro card. A base usa janela/documento no código observado; não há container rolável dedicado no editor, mas geometria computada final depende de execução no navegador. Navbar sticky é de outras telas; não aplicar offset fixo de 80/110 px por suposição.

## 11. Testes recomendados

UI/DOM: efeito ocorre ao abrir/trocar ID, não em cada campo; não ocorre ao fechar; ref existe; timers limpos. Browser: longa escalação, altura móvel, card de goleiro e BottomMenu, redução de movimento. Não foi localizado teste direto desse scroll; mocks de `scrollIntoView` existentes em testes de navegação não validam geometria real. Não exige gravação Firebase.

## 12. Critérios de aceite

- [ ] Abrir edição coloca título e primeiros campos em área visível.
- [ ] Funciona também ao trocar jogador com card já montado.
- [ ] Digitar/salvar não causa rolagens repetitivas inesperadas.
- [ ] Fechar/remover não dispara callback tardio para elemento inexistente.
- [ ] Header/menu não encobrem o ponto inicial da edição.

## 13. Questões não confirmadas

**NÃO CONFIRMADO:** qual dos dois níveis o relato visual se refere e geometria computada nos dispositivos do usuário. A ausência de scroll interno é confirmada; a eficácia do scroll externo ainda requer validação visual sintética.

# ITEM 8 — Levar contagem de cartões adversários de MatchDetailsTab para MatchStatsTab

## 1. Comportamento atual

O formulário de detalhes registra número de jogadores com cartão (`opponentCardCount`) e, por índice, nome, amarelo, segundo amarelo, vermelho e minutos. `buildOpponentEvents` constrói **objeto** com arrays `goals`, `assists`, `cards`, `ownGoals`. Cada cartão só entra se tem nome truthy e amarelo ou vermelho (`c.player && (c.yellow || c.red)`). Não há unicidade de nome/ID.

`buildMatchPayload` grava `opponentEvents` mas não recalcula `homeYellowCards`, `awayYellowCards`, `homeRedCards`, `awayRedCards`. `MatchStatsTab` lê apenas esses totais. O formulário AddStatsMatch os deixa editáveis para ambos os lados e `buildMatchUpdate` os grava independentemente.

## 2. Comportamento desejado

Derivar quantidades amarelas/vermelhas do adversário a partir dos detalhes já registrados, evitando segunda entrada manual e refletindo remoções posteriores.

## 3. Causa

**Confirmada:** fontes independentes sem derivação compartilhada. `buildInitialStats` só faz fallback para cartões **próprios** a partir de `match.playerStats`; para o adversário, usa totais salvos ou vazio. Além disso, `Match.opponentEvents` é declarado `OpponentEvents[]`, enquanto o produtor e `MatchWithOpponentEvents` usam `OpponentEvents` objeto. Casts encobrem a divergência, não a normalizam.

## 4. Fluxo atual

`Match` → `useMatchPageController` → `useMatchData` → mesmo `match` passado aos tabs e `MatchScreenRouter`.

Detalhes: `useAddDetails` → estado próprio `useForm` → `buildMatchPayload` → `buildOpponentEvents` → `ServiceMatches.updateMatchInSeason` → `ServiceTable.reconcileMatch` → transaction Firestore → `onSaved` → `updateLocalMatch`.

Stats: `useAddStatsMatch` → estado próprio `useForm` inicializado por `buildInitialStats` → `buildMatchUpdate` → mesmo service/transaction → `onSaved` → mesmo estado pai. Formulários não compartilham rascunho; compartilham objeto de partida salvo e documento.

## 5. Arquivos envolvidos

| Arquivo | Responsabilidade / trecho relevante / participação futura |
|---|---|
| `src/common/interfaces/Match/index.ts`, `src/common/interfaces/OpponentEventsMatches/index.ts` | Divergência array/objeto; alinhar contrato e compatibilidade de leitura. |
| `MD/views/AddDetails/hooks/useAddDetails.ts` | Estado e save dos detalhes; repassar totais coerentes ao estado pai. |
| `MD/views/AddDetails/helpers/buildOpponentEvents/index.ts` | Formato real e filtro de cartões; origem da contagem. |
| `MD/views/AddDetails/hooks/helpers/buildMatchPayload/index.ts` | Payload atual espalha `match` e eventos novos; ponto de recalcular projeção. |
| `MD/views/AddDetails/hooks/helpers/buildInitialFormValues/index.ts` | Reconstrói editor lendo objeto `opponentEvents.cards`; preservar edição/remoção. |
| `MD/views/AddDetails/hooks/helpers/resolveCardConflicts/index.ts` | Segundo amarelo e vermelho direto mutuamente exclusivos; desmarcar primeiro amarelo limpa segundo. |
| `MD/helpers/buildMatchEvents/helpers/extractOpponentEvents/index.ts`, `MD/types/index.ts` | Timeline tem outro contrato de eventos; não contar a timeline porque exige minutos e pode omitir cartões válidos do formulário. |
| `MS/index.tsx` | Exibe totais home/away; precisa usar derivação com contexto de `career`, hoje recebe mas não utiliza essa prop. |
| `MS/views/AddStatsMatch/helpers/buildInitialStats/index.ts` | Totais próprios deriváveis e adversários manuais; remover preferência por valor stale onde detalhes são autoridade. |
| `MS/views/AddStatsMatch/helpers/buildMatchUpdate/index.ts` | Grava totais do formulário e converte undefined em null; impedir override manual do adversário detalhado. |
| `MS/views/AddStatsMatch/constants/FormFields/index.tsx` | Inputs home/away de cartões; tornar lado adversário derivado/informativo. |
| `MS/views/AddStatsMatch/hooks/useAddStatsMatch.ts` | Inicializa uma vez por `matchesId`; atenção a mudança no mesmo jogo. |
| `src/pages/Match/hooks/useMatchData/index.ts`, `src/pages/Match/index.tsx`, `src/pages/Match/routes/MatchScreenRouter/index.tsx` | Estado compartilhado, callbacks, remontagem e renderização das abas. |
| `AM/views/AddMatches/services/ServiceMatches/index.ts` | Encaminha update para reconciliação; preservar contrato transacional. |
| `AT/services/ServiceTable/reconcileMatch.ts` | Merge com partida persistida, gravação transacional e tabela; principal fronteira para assegurar consistência em saves concorrentes. |

## 6. Estrutura de dados

```ts
// Formato produzido e consumido pelo formulário de detalhes.
opponentEvents: {
  goals?: { player: string; minute: string }[];
  assists?: { player: string; goalReference: string }[];
  cards?: {
    player: string;
    yellow: boolean; yellowMinute: string;
    secondYellow: boolean; secondYellowMinute: string;
    red: boolean; redMinute: string;
  }[];
  ownGoals?: { player: string; minute: string }[];
}
// Campos escalares independentes existentes em Match:
homeYellowCards?: number; awayYellowCards?: number;
homeRedCards?: number; awayRedCards?: number;
```

Um registro pode ter primeiro+segundo amarelo, ou amarelo+vermelho direto. O formulário impede segundo amarelo+vermelho direto pelo handler, mas dados antigos/inválidos podem conter ambos. Um mesmo nome pode aparecer em vários registros; não há playerId adversário nem ID de evento persistido. `opponentCardCount` conta linhas/jogadores informados, não cartões individuais.

## 7. Persistência

Eventos e totais residem no mesmo `.../matches/{matchesId}`. `updateMatchInSeason` chama `reconcileMatch`, que lê carreira/partida em transaction, calcula `next = {...previous, ...update}`, reconcilia linhas `.../table` quando a partida contribui para liga, grava partida com merge e incrementa `career.updatedAt` no mesmo commit. Quando há contribuição, enumera partidas e tabela e valida documentos observados na transaction. Não criar uma gravação isolada de cartões após o commit.

Atualização local usa `updateLocalMatch` com merge superficial. O listener da carreira reidrata partidas, mas isso não substitui entregar imediatamente totais consistentes via callback. A subcollection `playerStats` corresponde a jogadores próprios; cartões adversários não são salvos ali.

## 8. Implementação recomendada

**Fonte da verdade:** detalhes `opponentEvents.cards` quando o registro é reconhecido como autoridade. Totais home/away passam a ser projeção derivada, sem entrada duplicada.

Fluxo recomendado: detalhes normalizados → helper puro de contagem → mapeamento mandante/visitante → UI/formulário e payload coerentes → mesma transaction de partida/tabela → callback local coerente → releitura confirma resultado.

1. Alinhar tipo canônico com o objeto realmente produzido. Suportar formatos legados apenas com estratégia explícita; não pressupor que o array declarado representa dados realmente existentes em produção. Fixtures sintéticas devem cobrir objeto, ausente, vazio e entrada malformada.
2. Derivar o lado adversário: se `match.homeTeam === career.clubName`, preencher away; caso contrário, home. Para uso fora do formulário, fornecer `career`/identidade de clube. Evitar inferir lado a partir da ordem de eventos.
3. Definir política do segundo amarelo. Recomendação: amarelos = primeiro + segundo, vermelhos = um por expulsão (`red || secondYellow`), sem duplicar vermelho caso ambos venham true. Isso é **proposta**, não regra consolidada dos totais existentes. Exemplo: primeiro+segundo → 2 amarelos/1 vermelho; amarelo+direto → 1/1. Confirmar semântica desejada antes de fixar expectativas.
4. Contar flags válidas dos detalhes, sem exigir minuto para contagem. A timeline exige minutos e não é fonte segura para totais. Não usar apenas `cards.length`, nem deduplicar somente por nome: isso perderia homônimos/eventos legítimos. Duplicatas exatas podem ser validadas na entrada com política explícita; o dado atual não permite inferência perfeita.
5. Reutilizar uma única derivação em `MatchStatsTab`, inicialização do formulário, payload dos detalhes e save de stats. Inputs adversários devem virar informação calculada/remetida aos detalhes quando há autoridade detalhada. Outros números da partida permanecem editáveis.
6. Persistir os totais como projeção junto aos eventos para conservar consumidores que leem `Match` diretamente. Proteger a invariância na fronteira transacional usando o estado efetivo atual e não apenas o formulário; derivação exclusivamente no display deixaria números persistidos divergentes.
7. Evitar que um save de stats com snapshot antigo reenvie `opponentEvents` e reintroduza cartão removido. Hoje ambos os builders espalham `match`, e o merge da transaction aceita o snapshot recebido. Trabalhar com propriedade/escopo do payload (stats não edita eventos) e derivar a partir dos eventos efetivos dentro da transação. Apenas “usar transaction” não resolve snapshot completo stale.
8. Distinguir legado sem detalhes de remoção explícita do último cartão. Recomendação conservadora: preservar totais manuais de legado sem autoridade detalhada; após edição explícita dos cartões, `cards: []` representa zero e deve zerar a projeção. Atenção: o builder antigo já emitia `cards: []` ao salvar detalhes sem cartões, mesmo com totais manuais existentes. Para preservar esses casos, pode ser necessário metadado de origem/versão (**novo**, não existente). Não usar automaticamente `cards.length === 0` como “usar manual” porque isso faria cartões removidos reaparecerem.
9. Não migrar dados reais nesta tarefa. Mudanças futuras normais do app podem persistir a projeção, mas testes/agentes usam exclusivamente Emulator e fixtures.

## 9. Edge cases

Adversário mandante/visitante; zero cartões; remoção do último; primeiro+segundo amarelo; vermelho direto; amarelo seguido de vermelho direto; flags contraditórias; nomes duplicados; espaços em nome; minuto vazio; payload legado array; campos null em runtime apesar do tipo opcional number; renomear clube; alternar tabs; formulário aberto enquanto outra gravação muda eventos.

Totais próprios em `buildInitialStats` somam `yellowCard ? 1 : 0` e `redCard ? 1 : 0`, sem contar explicitamente `secondYellowCard`. São referência de mapeamento por lado, **não** política pronta para reutilizar literalmente. Alterar cartões próprios está fora do pedido; preservar comportamento ou separar decisão consciente.

## 10. Riscos e regressões

Perder contagens antigas que nunca tiveram detalhes; ressuscitar totais ao remover cartão; somar amarelos por jogador quando se esperavam eventos; inverter lado; salvar totals inconsistentes via outro formulário; casts encobrirem objeto/array; reconciliação de tabela ou pênaltis regredir por mudança do service. Totais não devem ser adicionados incrementalmente: sempre recalcular da fonte para permitir remoções e saves repetidos.

## 11. Testes recomendados

Unitários: tabela de flags com política do segundo amarelo, mapping home/away, objetos legados/ausentes/vazios, zero explícito, não mutação, sem exigência de minuto. UI: salvar detalhe → abrir stats e observar total; excluir último → zero; impedir edição duplicada; preservar demais campos e rascunhos. Integração/Emulator: eventos e projeção no mesmo commit, rejeição sem atualização parcial, save repetido idempotente, save concorrente de stats não repõe evento antigo, releitura e estado local concordam.

`src/test/results.test.ts` cobre `buildMatchPayload` em placar/pênaltis; `tests/integration/results.test.tsx` cobre reconciliação transacional, falhas e concorrência; `tests/integration/matches.test.ts` cobre CRUD/merge e caracteriza sobrescrita fora de ordem. Não foi localizado teste específico ligando cartões dos dois tabs. Preservar regressão de pênaltis zero, classificação e `updatedAt`.

## 12. Critérios de aceite

- [ ] Adversário recebe totais derivados de detalhes nos lados home/away corretos.
- [ ] Adicionar/remover cartão atualiza UI e projeção salva, inclusive zero.
- [ ] Não é necessário digitar novamente as quantidades adversárias.
- [ ] Segundo amarelo tem política explícita, consistente e testada.
- [ ] Save repetido não acumula contagem; save de stats não ressuscita cartão removido.
- [ ] Legado sem detalhe conserva informação segundo política documentada.
- [ ] Placar, pênaltis, classificação e cartões próprios permanecem corretos.

## 13. Questões não confirmadas

**NÃO CONFIRMADO:** distribuição de formatos existentes no Firebase real (deliberadamente não consultado), significado desejado de segundo amarelo nos totais, política de duplicatas e migração de totais legados. Ausência de IDs adversários limita deduplicação segura. O relatório não afirma que arrays existem em produção apenas porque o tipo os declara.

# Relações e dependências

| Itens | Relação e consequência |
|---|---|
| 1, 5 | Compartilham política de calendário, mas usam formatos de ano diferentes. Ordenar meses não deve virar migração de datas da base. |
| 2, 5, 6 | Compartilham `AcademyPlayers`, status e `allPlayersAcademy`. Limpar camisa não pode apagar a ficha necessária ao histórico/posição/elegibilidade. |
| 5, 6 | Fichas de partida têm ID/nome sem posição. Definir identidade e eventual metadado de apresentação sem copiar stats. |
| 5, 7 | Tocam `ManageMatchView`/`useManageMatch`; coordenar inicialização, seleção e scroll para não rolar em cada alteração nem reinicializar rascunhos. |
| 3, 7 | Ambos mexem em posicionamento/foco, mas em árvores distintas. Não precisam de helper global nem persistência compartilhada. |
| 4, 8 | Services de tabela/partida convergem em `ServiceTable`; item 4 visual não justifica editar a transaction usada no item 8. |
| 8, demais | Modelo profissional separado da base. Não reutilizar `PlayerMatchStat` profissional no seed da base. |

Ordem recomendada:

1. **Item 4: validar o comportamento já existente.** Encerrar sem patch se a criação/edição passarem na UI sintética.
2. **Item 1:** mudança visual isolada, estabiliza expectativas de calendário.
3. **Item 2:** tornar camisa ausente representável e preservar jogador histórico.
4. **Item 6:** resolver identidade/posição nas duas apresentações antes de ampliar reutilização de lineups.
5. **Item 3:** ajuste local de foco com validação móvel.
6. **Item 5:** maior mudança da base; decidir origem, elegibilidade, intenção de lineup vazia e impacto em agregados.
7. **Item 7:** completar scroll sobre o editor com inicialização já estabilizada; pode ser desenvolvido junto do item 5 com cuidado nos mesmos arquivos.
8. **Item 8:** mudança independente, porém de maior risco transacional/legado; implementar com política de contagem e fonte de verdade definida antes dos patches.

Não há dependência técnica que obrigue itens 3 e 8 a esperar pelos da base; a ordem acima organiza revisão e reduz sobreposição. Não foi usado trabalho por subagentes nesta investigação.

# Achados adicionais

Apenas registrados, sem correção:

- `AT/hooks/useTableTeamActions/index.ts` executa o ramo add/update duas vezes consecutivas antes de `onSuccess`. É duplicidade de gravação confirmada; usa o mesmo ID gerado, portanto não implica necessariamente duas linhas distintas.
- `getAvailablePlayers` aplica deslocamento europeu a datas que a criação já salva com ano completo ajustado; comparações entre semestres podem ficar inconsistentes. Não corrigi-lo silenciosamente junto da lista de meses.
- `useAcademyActions.updateTournament` absorve erro, enquanto callers prosseguem após await. Pode dar aparência de sucesso em cadastro/edição; tem impacto direto na confiabilidade do item 5.
- `ManageMatchView` busca posição para `StatsCard` em `playersAcademy` ativos, embora a escalação use `allPlayersAcademy`; goleiro saído em partida histórica pode receber formulário de linha.
- `calculatePlayerStats` da base conta qualquer lineup como partida jogada, sem filtro FINISHED. Com seed automático o efeito aumenta; tratar a dependência antes de persistir sugestões.
- Feed de destaques depende de nota/gols para exibir linha, não de defesas. Corrigir ícone não implica passar a exibir todos os goleiros sem nota.

# Handoff para implementação

Esta investigação está concluída como documentação. Nenhuma correção foi aplicada. Trabalhar sobre o estado local atual, preservando alterações anteriores do usuário; não executar reset/checkout, não criar commits sem autorização e não tratar o HEAD como descrição suficiente do projeto.

| Item | Ação concreta seguinte | Arquivos esperados | Verificação mínima |
|---|---|---|---|
| 4 | Reproduzir criação/edição com fixture; possivelmente nenhum patch | `AT/`, `UseForm`, `FieldRenderer`, `SearchableSelect` | Vazio na criação, nome na edição, placeholder fora do payload |
| 1 | Opções de mês pela regra Europa/demais existente | `AM/index.tsx`, `AM/constants/MONTH_OPTIONS/index.tsx`, eventual helper common | Ordem + filtro + dia sem mês + localStorage |
| 2 | Retirar camisa na mesma escrita da dispensa e ajustar ausência no tipo | `AC/services/AcademyService`, tipos AcademyPlayers/PlayerDataPayload, consumidores da camisa | Emulator: status/data/histórico/remoção atômicos, demais temporadas intactas |
| 6 | Ícone pela posição nos dois renderizadores, identidade tipada no feed | `TournamentMatchLineup`, `LineupList`, `FeedEvent`, cadeia de props/contexto | GOL 0/5/null, linha, promovido, homônimo, ficha ausente |
| 3 | Foco ao abrir picker e coordenação de scroll | `LP/components/PlayerPicker`, `usePlayerSearch`, eventualmente `useLineup`/props | DOM focus e teclado/viewport em navegadores móveis |
| 5 | Resolver fonte, projetar identidade limpa e impedir seed repetido/destrutivo | `useManageMatch`, `useAcademyMatchMutations`, `getAvailablePlayers`, tipos, services, agregados | Cinco stats null; mesma origem por ID; datas; remoção total; concorrência; agregados não inflados |
| 7 | Scroll para início do StatsCard após seleção/montagem | `ManageMatchView`, `StatsCard`, CSS, interação com `useEntityWorkspace` | Abrir/trocar rola; digitar/fechar não; menu não encobre |
| 8 | Normalizar contrato de eventos e derivar/persistir projeção sem concorrência stale | Tipos Match/OpponentEvents, builders MD/MS, campos MS, `reconcileMatch.ts`, estado pai | Segundo amarelo, legado, remoção até zero, home/away, commit atômico e tabela preservada |

Decisões a resolver antes dos itens de maior risco: significado de partida anterior e fallback vazio; fonte salva versus finalizada; elegibilidade histórica e parser de ano; distinção entre lineup nunca inicializada e vazia por intenção; segundo amarelo; origem/versão dos totais legados. As recomendações de cada item oferecem defaults, mas esses pontos não são fatos implementados hoje.

Preservar obrigatoriamente: IDs e isolamento uid/carreira/temporada/torneio; histórico de promovidos/dispensados; todas as stats já salvas em partidas destino; labels/chaves de meses; placeholders separados de value; reatividade via callbacks; reconciliação transacional de resultado/classificação; pênaltis inclusive zero; independência entre modelo profissional e da base.

Plano de testes futuro: helpers puros/DOM para calendário, reset, posição, foco e contagem; testes browser com fixtures para geometria e teclado; Emulator para dispensa, torneios e cartões, incluindo falha/concorrência e releitura. Suites existentes relevantes: `src/test/academy.test.ts`, `src/test/results.test.ts`, `src/test/lineup.test.ts`, `src/test/persistence.test.tsx`, `tests/integration/academy.test.ts`, `tests/integration/matches.test.ts`, `tests/integration/results.test.tsx`. Elas não substituem os novos critérios específicos deste relatório.

Firebase: antes de qualquer execução, confirmar hosts locais, projeto demo, configuração do runner e guards. Não iniciar `dev`/`dev:real`, não importar scripts operacionais sem revisão, não usar dados de contas reais. Não é preciso acessar produção para implementar/validar estes itens. O código futuro pode persistir normalmente no Firebase ao ser usado pelo aplicativo; a restrição aqui recai sobre a investigação e a validação automatizada/manual pelos agentes.
