Implemente SOMENTE a funcionalidade de reaproveitar os jogadores entre partidas de um mesmo torneio da base.

Leia integralmente o ITEM correspondente do relatório antes de editar.

Esta é uma alteração de maior risco. Não simplifique copiando objetos inteiros.

==================================================
GIT
==================================================

Capture baseline completo antes de editar.

Não resetar/reverter alterações anteriores.
Não stash.
Não clean.
Não fazer staging/commit.

Arquivos que já estavam alterados devem ser tratados como MISTOS.

==================================================
FIREBASE
==================================================

Nenhum teste contra Firebase real.

Persistência só pode ser validada com:

- Firebase Emulator;
- projeto demo;
- fixtures sintéticas.

Confirme isolamento antes de qualquer integração.

==================================================
OBJETIVO
==================================================

Ao abrir uma nova partida de um torneio da base, utilizar como ponto inicial os jogadores utilizados anteriormente naquele MESMO torneio.

IMPORTANTE:

copiar SOMENTE identidade dos jogadores.

Não copiar estatísticas da partida anterior.

==================================================
ORIGEM
==================================================

Utilizar:

a partida cronologicamente anterior mais próxima

- do mesmo torneio
- com lineup salva não vazia.

Não escolher uma partida futura só porque aparece depois no array.

Se houver empate de data, use critério determinístico compatível com a estrutura atual e documente-o.

Primeira partida do torneio:
lineup vazia.

==================================================
PRESERVAR
==================================================

Preservar da origem:

- playerId;
- nome atual apropriado;
- ordem relativa quando possível.

Usar ID como identidade.

Nunca nome como chave.

==================================================
RESETAR
==================================================

Nova ficha deve começar com estatísticas vazias conforme o modelo real.

A investigação encontrou:

goals: null
assists: null
rating: null
defesas: null
cleanSheets: null

Confirme o tipo atual antes de implementar.

Não copiar objetos com spread da ficha anterior.

Use uma transformação explícita/allowlist de identidade → ficha limpa.

==================================================
NÃO COPIAR
==================================================

Não copiar da partida anterior:

- placar;
- userGoals;
- opponentGoals;
- pênaltis;
- data;
- adversário;
- fase;
- result;
- status;
- stats;
- qualquer campo específico daquela partida.

==================================================
DESTINO JÁ EDITADO
==================================================

Se a partida destino já possui lineup:

NÃO sobrescrever.

Se está FINISHED:

NÃO inicializar novamente.

Se usuário deliberadamente removeu jogadores:

não reintroduzi-los ao reabrir.

==================================================
RASCUNHO / PERSISTÊNCIA
==================================================

Ponto crítico:

A investigação encontrou agregados que podem considerar presença simplesmente porque o jogador existe na lineup.

Portanto:

NÃO persista lineup automaticamente só porque o usuário abriu a partida.

Preferência:

criar a sugestão como RASCUNHO LOCAL.

Apenas persistir dentro do fluxo normal de edição/save.

Abrir uma partida futura não pode aumentar:

- partidas jogadas;
- médias;
- gols;
- defesas;
- clean sheets;
- torneios;
- qualquer agregado.

==================================================
"NUNCA INICIALIZADO" VS "USUÁRIO REMOVEU TODOS"
==================================================

Resolva de maneira explícita.

Não faça seed infinito sempre que `lineup.length === 0`.

Se for necessário metadado mínimo para distinguir os estados, implemente apenas se realmente necessário e documente.

Evite expansão de schema se puder resolver corretamente pelo fluxo local.

==================================================
ELEGIBILIDADE
==================================================

Considere dados históricos.

Um atleta promovido/dispensado pode ser válido para uma partida histórica anterior à saída.

Use `allPlayersAcademy` ou equivalente apropriado, não apenas ativos.

Não semear órfãos cuja ficha não possa ser resolvida com segurança.

Verifique cuidadosamente lógica de datas existente, principalmente transição dezembro/janeiro e temporadas europeias.

Não conserte outros bugs de data fora do necessário sem documentar.

==================================================
CONCORRÊNCIA
==================================================

A investigação apontou que o torneio salva o array inteiro de partidas.

Evite introduzir sobrescrita indevida de outras partidas.

Se precisar alterar persistência, mantenha escopo mínimo e proteja estado concorrente.

Não declare sucesso antes de uma persistência realmente confirmada.

==================================================
TESTES
==================================================

Unitários:

- origem correta;
- mesma competição/torneio;
- partida futura ignorada;
- primeira partida;
- origem vazia;
- identidade allowlist;
- stats todas null;
- nenhum campo extra;
- não mutação;
- empate de datas;
- elegibilidade por data.

UI:

- abrir destino vazio → rascunho sugerido;
- destino com lineup → preservar;
- partida FINISHED → preservar;
- remover todos → não reaparecer indevidamente;
- fechar sem salvar;
- reabrir;
- jogador novo continua adicionável manualmente.

Agregados:

- apenas abrir partida NÃO aumenta jogos;
- não altera médias;
- não altera clean sheets;
- não altera histórico.

Emulator:

- salvar afeta somente partida destino;
- outro torneio intacto;
- outra temporada intacta;
- falha de persistência não apresenta falso sucesso;
- concorrência não apaga alteração de outra partida.

==================================================
FINAL
==================================================

Relatório detalhado obrigatório.

Inclua decisões tomadas para:

- definição de partida anterior;
- empate de datas;
- lineup vazia;
- elegibilidade;
- seed local vs persistido.

Informe Git/staging por hunk.

Não faça commit.

Mensagem sugerida:

feat: reuse academy lineups across tournament matches
