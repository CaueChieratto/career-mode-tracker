Implemente SOMENTE a integração entre cartões adversários registrados em MatchDetailsTab e as quantidades exibidas/utilizadas em MatchStatsTab.

Leia integralmente a investigação do ITEM correspondente antes de alterar qualquer código.

Esta alteração envolve persistência e concorrência. Não faça uma solução apenas visual.

==================================================
GIT
==================================================

Capture baseline antes de editar.

Working tree possui alterações anteriores.

Não use reset/restore/checkout/clean/stash.
Não faça staging.
Não faça commit.

Preserve alterações preexistentes.

==================================================
FIREBASE
==================================================

Não acessar Firebase real.

Testes de persistência somente com Emulator, projeto demo e dados sintéticos.

Antes de executar integração, confirme guards/hosts/projeto.

==================================================
PROBLEMA
==================================================

MatchDetailsTab registra os cartões do adversário em detalhes.

MatchStatsTab possui separadamente campos numéricos de cartões do adversário.

Hoje essas duas fontes podem divergir e obrigam o usuário a inserir a mesma informação duas vezes.

==================================================
FONTE DA VERDADE
==================================================

Utilizar como fonte da verdade:

`opponentEvents.cards`

ou estrutura canônica equivalente depois de corrigir/normalizar o contrato existente.

Não usar `cards.length`.

Contar flags/eventos.

==================================================
TIPOS
==================================================

A investigação encontrou divergência:

o tipo geral aparentemente declara `opponentEvents` de uma forma, enquanto os builders utilizam um objeto contendo:

goals
assists
cards
ownGoals

Confirme isso no código atual.

Alinhe o contrato com o formato realmente utilizado.

Não faça cast para esconder incompatibilidade.

Compatibilidade com legado deve ser explícita e conservadora.

==================================================
CONTAGEM
==================================================

Derivar separadamente:

- yellow cards;
- red cards.

Política desejada:

primeiro amarelo + segundo amarelo:
2 amarelos
1 vermelho/expulsão

amarelo + vermelho direto:
1 amarelo
1 vermelho

Se dados inconsistentes tiverem:

secondYellow === true
e
red === true

não gerar dois vermelhos para a mesma expulsão.

Não exigir minuto para contabilizar o cartão.

==================================================
MANDANTE / VISITANTE
==================================================

Mapear os totais para home/away conforme o clube da carreira.

Se o clube do usuário é mandante:

cartões adversários → away

Se é visitante:

cartões adversários → home

Use identidade de clube/career existente.

Não inferir pelo array de eventos.

==================================================
MATCHSTATSTAB
==================================================

O lado adversário não deve continuar sendo uma segunda fonte editável independente quando existem detalhes autoritativos.

A quantidade deve vir dos detalhes.

Preserve cartões do próprio time fora deste escopo.

==================================================
PERSISTÊNCIA
==================================================

Os campos escalares existentes:

homeYellowCards
awayYellowCards
homeRedCards
awayRedCards

podem continuar persistidos como PROJEÇÃO para compatibilidade.

Porém devem ser derivados da fonte de verdade.

Ao salvar MatchDetails:

eventos

- totais derivados

devem ficar coerentes dentro da operação apropriada.

Não faça uma segunda escrita independente depois.

==================================================
CONCORRÊNCIA / SNAPSHOT STALE
==================================================

Muito importante:

Salvar MatchStatsTab usando um snapshot antigo NÃO pode ressuscitar cartões que foram removidos em MatchDetailsTab.

Revise os builders que espalham `match`.

Cada formulário deve enviar apenas propriedades que realmente edita ou a camada transacional deve derivar a partir do estado efetivo persistido.

Não considere que "usar transaction" sozinho resolve snapshot stale.

==================================================
REMOÇÃO
==================================================

Se o usuário remove o último cartão em MatchDetails:

o total derivado deve chegar a ZERO.

Não usar:

"se cards vazio, preserve manual"

indiscriminadamente, pois isso ressuscitaria dados removidos.

==================================================
LEGADO
==================================================

Há possibilidade de partidas antigas terem totais manuais mas nenhum detalhe confiável.

Preserve esses dados de forma conservadora.

Não faça migração do Firebase real.

Se precisar distinguir dado legado de uma remoção explícita atual, faça a menor mudança possível e documente a política.

==================================================
PRESERVAR
==================================================

Não quebrar:

- placar;
- pênaltis;
- pênaltis = 0;
- classificação;
- reconcileMatch;
- updatedAt;
- cartões do próprio time;
- playerStats;
- home/away;
- saves repetidos.

==================================================
TESTES
==================================================

Unitários:

- amarelo simples;
- vermelho;
- segundo amarelo;
- amarelo + vermelho direto;
- flags contraditórias;
- zero;
- sem minuto;
- home/away;
- objeto ausente;
- formato legado;
- não mutação.

UI:

- adicionar cartão nos detalhes → stats atualiza;
- remover → stats atualiza;
- remover último → zero;
- lado adversário não exige entrada duplicada;
- próprios cartões continuam editáveis/iguais.

Integração Emulator:

- eventos + projeção persistem coerentemente;
- falha não deixa estado parcial;
- save repetido não acumula;
- save de stats não restaura cartão removido;
- concorrência;
- classificação preservada;
- pênaltis zero preservados;
- releitura concorda com estado local.

==================================================
FINAL
==================================================

Informe:

- fonte da verdade implementada;
- política do segundo amarelo;
- estratégia de legado;
- proteção contra stale snapshots;
- arquivos e hunks;
- testes/exit codes;
- confirmação explícita de Emulator e ausência de acesso ao Firebase real;
- staging recomendado.

Não faça commit.

Mensagem sugerida:

fix: derive opponent card totals from match details
