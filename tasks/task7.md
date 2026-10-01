Implemente SOMENTE a correção da camisa do jogador da base ao ser dispensado.

Leia a seção correspondente do relatório de investigação antes de alterar.

==================================================
GIT
==================================================

Capture baseline:

git status --short
git diff --name-status
git diff --stat
git diff --cached --name-status

Working tree já possui muitas alterações anteriores.

Não use reset/checkout/restore/clean/stash.
Não reverta mudanças existentes.
Não faça staging.
Não faça commit.

Para arquivos previamente modificados, preserve alterações anteriores e documente hunks novos.

==================================================
FIREBASE
==================================================

O código normal da aplicação pode continuar gravando no Firebase real quando utilizado pelo usuário.

VOCÊ, entretanto, não pode executar testes contra Firebase real.

Qualquer teste de persistência:

Firebase Emulator

- projeto demo
- fixtures sintéticas.

Antes de executar integração confirme hosts/projeto/guards.

Se não for possível garantir isolamento, não execute.

==================================================
PROBLEMA
==================================================

Ao dispensar jogador da base, o fluxo atualmente atualiza:

- status;
- exitDate;
- evolutionHistory;

mas mantém `shirtNumber`.

A camisa deve ser liberada.

==================================================
COMPORTAMENTO DESEJADO
==================================================

Na MESMA escrita que efetiva a dispensa:

- status continua correto;
- data continua correta;
- histórico continua correto;
- `shirtNumber` deixa de estar atribuído.

Preferência indicada pela investigação:

usar `deleteField()` ou equivalente apropriado ao schema real.

Não usar artificialmente:

- 0;
- "";
- undefined;

como camisa livre.

==================================================
TIPOS
==================================================

Hoje `shirtNumber` pode estar tipado como obrigatório.

Ajuste tipos e consumidores para representar jogador da base sem camisa.

Faça isso com escopo mínimo.

Verifique:

- renderização;
- ordenação;
- formulários;
- PlayerCircle;
- payloads relacionados.

==================================================
PRESERVAR
==================================================

Não:

- delete jogador;
- delete histórico;
- altere partidas antigas;
- altere outras temporadas;
- altere jogador profissional relacionado;
- limpe ID;
- faça migração de todos os dispensados antigos.

Ao desfazer uma dispensa, não recupere automaticamente o número antigo.

Motivo:
a camisa já pode ter sido atribuída a outro atleta.

==================================================
ATOMICIDADE
==================================================

A remoção da camisa deve fazer parte da mesma escrita da dispensa.

Não faça:

update status
depois
update shirtNumber

como duas operações separadas.

Se a escrita falhar, nenhum dos dois estados deve ficar parcialmente aplicado.

==================================================
TESTES
==================================================

Unitários:

- payload/transformação;
- histórico preservado;
- camisa removida.

Integração Emulator:

- documento perde `shirtNumber`;
- status/data/histórico persistidos;
- falha não deixa mudança parcial;
- outra temporada permanece intacta;
- jogador histórico continua existindo;
- refetch retorna jogador dispensado sem camisa.

Não toque Firebase real.

==================================================
FINAL
==================================================

Relate:

- mudança;
- arquivos;
- testes e exit code;
- confirmação do Emulator;
- confirmação explícita de que Firebase real não foi acessado;
- PREEXISTENTE/TAREFA/MISTO;
- staging seguro.

Não faça commit.

Mensagem sugerida:

fix: release academy shirt number on player exit
