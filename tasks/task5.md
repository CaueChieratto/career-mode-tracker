Implemente SOMENTE a correção dos ícones de goleiro nas partidas da base.

==================================================
GIT
==================================================

Capture baseline antes das alterações.

Não reverta mudanças anteriores.
Não faça reset/restore/checkout/clean/stash.
Não faça staging/commit.

Ao final classifique arquivos em PREEXISTENTE/TAREFA/MISTO.

==================================================
PROBLEMA
==================================================

Hoje a interface decide entre ícone de defesa e gol usando a quantidade de `defesas`.

Exemplo conceitual atual:

defesas ? ícone de defesa : ícone de gol

Isso faz um goleiro com:

defesas = 0
null
undefined

mostrar ícone de gol.

==================================================
COMPORTAMENTO CORRETO
==================================================

A escolha deve depender da POSIÇÃO.

Se:

position === "GOL"

usar SEMPRE ícone de defesa.

Inclusive com:

0
null
undefined
5

Para jogador de linha:

usar ícone de gol.

O número exibido deve acompanhar o tipo:

goleiro → defesas ?? 0
linha → goals ?? 0

==================================================
LOCAIS
==================================================

A investigação encontrou pelo menos dois locais:

1. lineup/lista da partida do torneio da base;
2. feed/detalhes da partida da base.

Corrija ambos.

==================================================
IDENTIDADE
==================================================

Resolver posição pelo `playerId`.

Não resolver por nome.

Usar dados históricos apropriados, como `allPlayersAcademy`, para que jogadores promovidos/dispensados continuem identificáveis quando a ficha existe.

Não fazer novo fetch individual por jogador.

Não persistir posição apenas para corrigir renderização, salvo se absolutamente necessário e justificado.

==================================================
CUIDADOS
==================================================

Não fazer com que jogador de linha com `defesas > 0` passe a ser considerado goleiro.

Não alterar filtros de destaque/feed fora do escopo.

Não alterar estatísticas.

Não mudar schema do Firebase desnecessariamente.

==================================================
TESTES
==================================================

Cobrir nos dois locais:

- GOL + 0 defesas;
- GOL + null;
- GOL + 5;
- jogador de linha + 0 gols;
- linha com dado estranho de defesa;
- promovido;
- dispensado;
- playerId inexistente/ficha apagada com fallback seguro.

==================================================
FINAL
==================================================

Forneça staging seguro e mensagem de commit.

Não faça commit.

Mensagem sugerida:

fix: show save icons for academy goalkeepersImplemente SOMENTE a correção dos ícones de goleiro nas partidas da base.

==================================================
GIT
==================================================

Capture baseline antes das alterações.

Não reverta mudanças anteriores.
Não faça reset/restore/checkout/clean/stash.
Não faça staging/commit.

Ao final classifique arquivos em PREEXISTENTE/TAREFA/MISTO.

==================================================
PROBLEMA
==================================================

Hoje a interface decide entre ícone de defesa e gol usando a quantidade de `defesas`.

Exemplo conceitual atual:

defesas ? ícone de defesa : ícone de gol

Isso faz um goleiro com:

defesas = 0
null
undefined

mostrar ícone de gol.

==================================================
COMPORTAMENTO CORRETO
==================================================

A escolha deve depender da POSIÇÃO.

Se:

position === "GOL"

usar SEMPRE ícone de defesa.

Inclusive com:

0
null
undefined
5

Para jogador de linha:

usar ícone de gol.

O número exibido deve acompanhar o tipo:

goleiro → defesas ?? 0
linha → goals ?? 0

==================================================
LOCAIS
==================================================

A investigação encontrou pelo menos dois locais:

1. lineup/lista da partida do torneio da base;
2. feed/detalhes da partida da base.

Corrija ambos.

==================================================
IDENTIDADE
==================================================

Resolver posição pelo `playerId`.

Não resolver por nome.

Usar dados históricos apropriados, como `allPlayersAcademy`, para que jogadores promovidos/dispensados continuem identificáveis quando a ficha existe.

Não fazer novo fetch individual por jogador.

Não persistir posição apenas para corrigir renderização, salvo se absolutamente necessário e justificado.

==================================================
CUIDADOS
==================================================

Não fazer com que jogador de linha com `defesas > 0` passe a ser considerado goleiro.

Não alterar filtros de destaque/feed fora do escopo.

Não alterar estatísticas.

Não mudar schema do Firebase desnecessariamente.

==================================================
TESTES
==================================================

Cobrir nos dois locais:

- GOL + 0 defesas;
- GOL + null;
- GOL + 5;
- jogador de linha + 0 gols;
- linha com dado estranho de defesa;
- promovido;
- dispensado;
- playerId inexistente/ficha apagada com fallback seguro.

==================================================
FINAL
==================================================

Forneça staging seguro e mensagem de commit.

Não faça commit.

Mensagem sugerida:

fix: show save icons for academy goalkeepers
