Implemente SOMENTE o scroll automático ao abrir a área de estatísticas de um jogador durante uma partida da base.

==================================================
GIT
==================================================

Capture baseline.

Não altere/reverta mudanças anteriores.
Não use reset/checkout/restore/clean/stash.
Não faça staging ou commit.

==================================================
PROBLEMA
==================================================

Dentro de `ManageMatchView`, ao clicar em um jogador da lineup, o `StatsCard` é aberto abaixo da escalação.

Porém a tela não rola automaticamente para mostrar essa área.

Já existe outro scroll no nível externo do workspace quando se entra na partida.

Não confunda os dois.

==================================================
COMPORTAMENTO DESEJADO
==================================================

Ao selecionar jogador e abrir `StatsCard`:

- rolar automaticamente até o começo/cabeçalho da área de stats;
- deixar título e primeiros campos visíveis.

Deve funcionar:

- primeira abertura;
- troca de jogador enquanto o card já está montado.

==================================================
NÃO DEVE ACONTECER
==================================================

Não rolar:

- a cada digitação;
- a cada alteração de goals/assists/rating/defesas;
- a cada save;
- ao fechar;
- depois que componente desmontou.

Não abrir teclado automaticamente.

==================================================
IMPLEMENTAÇÃO
==================================================

Use ref local/estável para o início da área.

O efeito deve depender da abertura/troca do jogador selecionado, não do objeto completo das estatísticas.

Coordene com o scroll externo existente em `useEntityWorkspace`.

Faça cleanup de qualquer timer/requestAnimationFrame usado.

Considere BottomMenu/header e viewport mobile.

Não centralize card alto se isso esconder o cabeçalho.

==================================================
TESTES
==================================================

Cobrir:

- abrir primeiro jogador;
- trocar jogador;
- fechar;
- digitar stats sem novo scroll;
- desmontar antes do efeito/timer;
- card de goleiro;
- escalação longa;
- interação com scroll externo.

Nenhum Firebase necessário para a correção visual.

==================================================
FINAL
==================================================

Informar arquivos/hunks, testes e staging seguro.

Não faça commit.

Mensagem sugerida:

fix: scroll to academy player stats editor
