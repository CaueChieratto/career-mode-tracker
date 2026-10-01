# Critérios do baseline

O relatório desta etapa descreve uma execução local instrumentada, com Chrome headless, viewport móvel e emuladores. Não representa uma previsão de latência em produção, em celulares físicos ou em redes móveis. A finalidade é oferecer um cenário reproduzível para comparação futura no mesmo ambiente.

## Tempos e unidades

- Clique: evento DOM capturado antes do handler. A automação pode preparar modais/seleções antes desse instante. A jornada Career → Season começa no botão “Entrar na Temporada”, e não na abertura do modal de configuração.
- Mudança de URL: `history.pushState/replaceState` nas rotas SPA. Em recargas completas, o início de execução do documento novo é usado como marcador aproximado e não como instante exato da troca da barra de endereço.
- Nova página: marcador de documento para reload; montagem dos componentes e mutações de conteúdo para SPA. Não se atribui duração fictícia ao roteador.
- Primeiro conteúdo: primeira observação de texto do destino no DOM fora do spinner. É um limite aproximado; o relatório não confunde esse marcador com FCP ou prova exata de apresentação de pixels.
- Utilizável: seletor do destino e dois `requestAnimationFrame`. No comparador, as leituras também precisam ter terminado; na base, um jogador real da fixture precisa existir. As abas aguardam o fim da animação do Swiper.
- Dados principais encerrados: última leitura instrumentada concluída na janela. Não é soma das durações das consultas, que se sobrepõem.
- Fim da observação: 400 ms sem novas leituras/mutações relevantes e nenhum spinner principal. Esse intervalo é de coleta; não é incluído na coluna “utilizável”.
- Entrada → Login: três arrastes reais, com pausas fixas para concluir a animação. O tempo dessa jornada inclui o ritmo escolhido pelo script.
- Tempos de React: `actualDuration` do React Profiler em build próprio. São custos de render, não a duração completa de commit DOM/layout/paint. Commits são eventos do callback; durações de pais e filhos se sobrepõem.
- Long tasks: entradas do navegador acima de 50 ms; uma espera assíncrona de rede não é uma long task. Métricas CDP e tracing são evidência adicional, e categorias aninhadas não devem ser somadas como tempo exclusivo.
- Os contadores acumulados CDP podem reiniciar em recargas de documento. O consolidado descarta seus deltas nesses casos (`metrics: null`), preservando os eventos brutos e usando o trace para atribuição. Não se interpreta delta negativo como ganho de CPU.

## Consultas, rede e documentos

Operação lógica é uma chamada `getDoc/getDocs` ou registro `onSnapshot`. Um callback de listener não é contado como nova inscrição. Documento significa uma entrega de documento ao código da aplicação, incluindo entregas repetidas/cache; o emulador não fornece uma fatura nem uma equivalência automática com leituras cobradas em produção.

Os requests do navegador são contados separadamente. HTTP em cache continua podendo aparecer como request iniciado no navegador; Resource Timing informa transferência zero quando atendido pelo cache. Firestore usa WebChannel e multiplexação, portanto um request pode transportar múltiplas operações, e um stream pode permanecer aberto depois da janela da navegação. Não somar queries lógicas com requests HTTP.

Duplicação é a repetição do mesmo caminho de leitura na janela. Para as consultas de grupo, a inspeção do serviço confirma também o mesmo filtro. O instrumento registra caminhos, não uma canonização geral de todos os filtros possíveis; a definição não deve ser aplicada indiscriminadamente a outras consultas.

## Cache e repetição

Uma sessão nova começa com contexto isolado e cache vazio. Depois da primeira entrada, rotas seguintes podem aproveitar o bundle já carregado. “Cold-session” não significa HTTP frio em cada uma das rotas. “Warm-session” repete a cadeia mantendo cache HTTP e reiniciando autenticação/preferências. O cache de dados em memória se perde nas recargas reais da aplicação; ele não é criado artificialmente pelo benchmark.

Cinco amostras por perfil/condição sustentam mediana e p75 exploratórios; p95 não é estimado com esse n. Há uma cadeia de aquecimento excluída por perfil. Profiling possui sua própria série e não é misturado aos tempos normais. A ordem dos cenários é fixa, os perfis rodam sequencialmente e não há controle térmico ou randomização; efeitos de ordem e carga de fundo permanecem uma limitação.

Na retomada de 23/09 foi aplicado limite de 30 s por janela de observação. Uma amostra censurada conserva as operações iniciadas e documentos entregues até o corte, mas não recebe duração final. Se alguma amostra de um grupo é censurada, mediana/p75 desse grupo não são calculadas descartando silenciosamente o timeout. As jornadas posteriores que dependiam daquela origem ficam listadas como não alcançadas, sem tempos imputados. Os eventos e os resultados concluídos de 22/09 foram preservados; apenas aquecimento cold do médio havia sido persistido antes da interrupção.

O limite de 30 s é uma decisão de orçamento de observação local: já excede uma espera interativa razoável e permite registrar a amplificação das consultas sem manter uma cadeia bloqueada indefinidamente. Não é um SLA de produção. Uma cadeia warm após cold censurado possui somente o cache HTTP dos recursos alcançados; não representa retorno após uso completo do aplicativo. O limite parte do início da automação, poucos milissegundos antes do clique DOM; a janela em relação ao clique pode ficar ligeiramente abaixo de 30.000 ms. Algumas linhas do console do processo já iniciado exibiram um valor negativo ao formatar `usable: null`; os JSON brutos mantêm `censored: true` e `usable: null`, e nenhum desses valores de console é usado na consolidação.

O coletor recebeu checkpoints e uma simplificação da varredura de eventos de estabilização: o `timeOrigin` atual é calculado uma vez por varredura. Isso afeta custo do instrumento, não comportamento da aplicação. A comparação estrutural 60/300/900 usa contagens; diferenças de latência entre os perfis também podem conter efeito de dia, reinício do emulador e versão do coletor. As distribuições não misturam valores censurados com finais.

### Mudança de escopo do grande na segunda retomada

A pedido do usuário, aquecimento + duas sessões cold independentes com o mesmo timeout bastam para caracterizar saturação. Na recuperação já existiam onze cadeias grandes censuradas (duas de aquecimento e nove de medição) e uma última cadeia interrompida depois de Entrada → Login. Todas foram preservadas; não se completou a cadeia interrompida nem se repetiu o login no profiling. A política de parada de `measure.mjs` verifica os checkpoints cold 1 e 2. Pequeno e médio mantêm suas cinco repetições cold e warm.

Os alvos grandes preparados (`large-targets.mjs`) são uma coleta exploratória separada: login real pela UI até a autenticação/URL CareersPage, abertura de Tutorial para encerrar a hidratação pendente, e navegação direta para Group, Compare e Player. Auth e cache HTTP persistem; o histórico integral não foi previamente carregado. Cada alvo é medido uma vez, com o mesmo limite de observação e checkpoint imediato. Não há percentis nem equivalência alegada com a jornada cold. Academy exige `location.state` vindo da temporada; não se injeta um objeto artificial para alegar equivalência com esse fluxo.

O build React Profiler usa pequeno e médio para alcançar os componentes prioritários. Os diagnósticos de timers, salvamento e tracing usam médio. A ausência das demais rotas grandes fica declarada como NÃO MEDIDO, com motivo, em vez de extrapolar seus valores a partir dos outros perfis.

Na seleção diagnóstica do comparador, a primeira automação abriu o card, mas não focou o SearchableSelect para abrir suas opções. Duas seleções da primeira tentativa terminaram sem clique no jogador. São falhas de automação, não saturação do aplicativo: os eventos originais foram preservados em `raw/FAILED-compare-selector-before-focus.json` e excluídos do consolidado. Os timers válidos das tentativas 1 e 2 foram conservados. Apenas as seleções foram retomadas com a abertura explícita da lista. Portanto, nesses casos os timers e as seleções vêm de sessões distintas; suas durações não são somadas. O seletor trata `mousedown` e pode remover a opção antes de `click`; a coluna `clickSource` informa quando o início da automação é a referência disponível.

Na orientação final, a série de salvamento foi limitada a três amostras válidas. O checkpoint já continha cinco salvamentos concluídos quando essa mensagem chegou. Nenhum outro foi executado: os três primeiros formam a série principal, e os dois últimos foram mantidos no JSON como suplementares. O runner passou a limitar futuras coletas a três e preservar amostras já concluídas. O relatório distingue clique → estado saving, clique → spinner, spinner → conteúdo utilizável e término das leituras em segundo plano.

As fixtures mantidas da primeira execução têm simplificações: mesma nacionalidade, maioria dos jogadores em ATA, duas equipes na tabela e torneios de base em andamento sem partidas. Seus volumes de história são razoáveis, mas não representam todas as distribuições de conteúdo possíveis. Nada foi alterado nessas fixtures para melhorar os resultados após a retomada.

## Isolamento e custo do instrumento

O projeto Firebase é fixo e começa com `demo-`. A configuração real é substituída somente durante o build de teste. A CSP permite conexões exclusivamente ao próprio servidor e aos emuladores; o navegador usa proxy sem saída e bloqueio de DNS externo. Os processos de serviço têm guarda adicional de rede. Chamadas de fontes externas são bloqueadas; usa-se fallback de fonte. Não há acesso autorizado a Firebase real, dados reais ou upload externo nesta etapa.

A medição adiciona wrappers de componentes, observação do DOM e filas de eventos. Isso tem custo e deve ser mantido nas comparações futuras. Não há subtração estimada desse custo. O build profiling acrescenta o custo do React Profiler e é identificado separadamente. O benchmark usa o DOM normal, todas as abas atuais, os timers atuais e as queries atuais.

## Web Vitals

FCP e LCP pertencem a documentos, não a cada rota SPA. A biblioteca `web-vitals` fornece valores de laboratório durante a sequência observada. CLS e INP dependem das interações, duração e encerramento do documento. Os valores observados não são p75 de usuários reais, não equivalem a CrUX e não demonstram aprovação em Core Web Vitals de produção. Métricas ausentes permanecem ausentes.
