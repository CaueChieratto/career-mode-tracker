# Baseline real de performance — etapa 5

Somente medição. Nenhuma query, cache, rota, arquitetura, asset, memoização ou bug de produção foi alterado. As etapas 1–4 permanecem preservadas no [relatório de testes](../testing/implementation-report.md).

## Resultado principal

A navegação com maior mediana foi **Career → Season**, perfil **medium**, **cold-session**: **13.080,7 ms**. A maior entrega de documentos em uma navegação foi **7.506**, em **Season → Player**, perfil **medium**. Documentos aqui são entregas ao código, não leituras faturadas.

[Amostras e contadores](measurements.json); [critérios, unidades e limitações](methodology.md); [comandos e ferramentas](../../tests/performance/README.md).

Foram preservadas **370 janelas normais concluídas** (360 dos fluxos pequeno/médio + 10 entradas do grande), **9 janelas normais censuradas**, 20 cadeias normais completas e 6 cadeias medidas de profiling. Há mais 2 censuras nos alvos preparados e 2 nos aquecimentos: **13 censuras válidas no total, 11 excluindo aquecimento**. Uma cadeia grande foi interrompida depois da entrada. As duas seleções inválidas por falha de automação permanecem arquivadas e não integram esses números. Boot e aquecimentos são excluídos da contagem de janelas normais medidas.

## Ambiente

| Item | Configuração |
|---|---|
| Máquina | AMD Ryzen 7 1700; 8 núcleos/16 threads; 17.123.434.496 bytes RAM |
| Sistema | Windows 10 Pro 10.0.19045 |
| Node | v24.20.0 |
| Navegador | Chrome 153.0.8010.53, headless; Playwright 1.55.1 |
| Viewport | 390 × 844; DPR 1; isMobile e touch; pt-BR; America/Sao_Paulo |
| Build | Vite 5.4.9 production; React 18.3.1; cópias isoladas navigation/profile |
| Firebase | SDK 12.1.0; CLI 14.12.0; Firestore Emulator 1.19.8; Auth Emulator; JRE 21 local |
| Projeto | demo-career-tracker-integration; hosts 127.0.0.1 |
| Rede | Loopback sem throttling; HTTP sem compressão de transporte; cache HTTP habilitado |
| Externos | CSP + proxy sem saída + bloqueio DNS; fonte Google bloqueada; token sintético; sem uploads |
| Amostragem | Pequeno/médio: 5 por condição + aquecimento. Grande: saturação censurada. Profiling pequeno/médio: 3 + 1 aquecimento. p95 omitido: n < 20 |

O relógio não simula hardware móvel: o viewport é móvel e a CPU é a máquina acima. A instrumentação tem custo, especialmente observação de DOM e React Profiler. Não extrapolar os tempos locais para latência de produção.

## Perfis de dados

| Perfil | Carreiras | Temporadas | Partidas | Jogadores/documentos | playerStats | Base/jogadores | Base/torneios | Tabela | Grupos | Docs totais |
|---|---|---|---|---|---|---|---|---|---|---|
| small | 3 | 3 | 60 | 54 | 660 | 18 | 6 | 6 | 1 | 811 |
| medium | 3 | 6 | 300 | 150 | 3.300 | 60 | 12 | 12 | 1 | 3.844 |
| large | 3 | 18 | 900 | 504 | 9.900 | 216 | 36 | 36 | 1 | 11.614 |

Cada perfil possui três carreiras; uma individual e duas no mesmo grupo. Pequeno: uma temporada por carreira, 20 partidas, elenco de 18; médio: duas temporadas, 50 partidas/temporada, elenco de 25; grande: seis temporadas, 50 partidas/temporada, elenco de 28. Onze fichas por partida finalizada. Os jogadores reaparecem por temporada; a coluna conta documentos de elenco, não pessoas únicas. Há dois torneios de base em andamento por temporada. SHA-256 de cada fixture no JSON, normalizando apenas o UID sintético.

## Navegação

Tempos em ms, clique/gesto até destino utilizável. Preparação de modais fica fora da janela; os 400 ms de estabilização ficam fora do tempo utilizável. Cold significa sessão nova; depois da entrada, as rotas dessa sessão já podem reutilizar assets. Warm repete a cadeia com cache HTTP preservado. Nenhuma das colunas afirma que todas as queries vieram de cache.

| Fluxo | Perfil | Condição | Completas | Censuradas | Mediana | p75 | p95 | Principal custo observado |
|---|---|---|---|---|---|---|---|---|
| Entrada → Login | large | cold-session | 5 | 0 | 1.531,7 | 1.532,4 | — | 3 gestos + pausas do script |
| Login → CareersPage | large | cold-session | 0 | 5 | — | — | — | CENSURADO no limite de 30 s; duração final desconhecida |
| Entrada → Login | large | warm-session | 5 | 0 | 1.516,2 | 1.549,5 | — | 3 gestos + pausas do script |
| Login → CareersPage | large | warm-session | 0 | 4 | — | — | — | CENSURADO no limite de 30 s; duração final desconhecida |
| Entrada → Login | medium | cold-session | 5 | 0 | 1.536,6 | 1.540 | — | 3 gestos + pausas do script |
| Login → CareersPage | medium | cold-session | 5 | 0 | 9.146,2 | 9.228,4 | — | Hidratação de histórico / N+1 |
| CareersPage → Career | medium | cold-session | 5 | 0 | 11.984,8 | 12.115,3 | — | Hidratação de histórico / N+1 |
| Career → Season | medium | cold-session | 5 | 0 | 13.080,7 | 13.309,9 | — | Hidratação de histórico / N+1 |
| Season: aba Partidas | medium | cold-session | 5 | 0 | 363,8 | 365,4 | — | Animação Swiper + render |
| Season: aba Classificação | medium | cold-session | 5 | 0 | 364,6 | 365,2 | — | Animação Swiper + render |
| Season: aba Estatísticas | medium | cold-session | 5 | 0 | 364,7 | 365,1 | — | Animação Swiper + render |
| Season: aba Geral | medium | cold-session | 5 | 0 | 366,4 | 366,5 | — | Animação Swiper + render |
| Season → Match | medium | cold-session | 5 | 0 | 10.015,9 | 10.396,3 | — | Hidratação de histórico / N+1 |
| Match: aba Formações | medium | cold-session | 5 | 0 | 366,1 | 367,7 | — | Animação Swiper + render |
| Match: aba Estatísticas | medium | cold-session | 5 | 0 | 365 | 367,2 | — | Animação Swiper + render |
| Season → Player | medium | cold-session | 5 | 0 | 9.836,7 | 10.165,2 | — | Hidratação de histórico / N+1 |
| Career → Geral | medium | cold-session | 5 | 0 | 9.785,4 | 10.259 | — | Hidratação de histórico / N+1 |
| Geral → ComparePlayers | medium | cold-session | 5 | 0 | 9.296,4 | 9.557,5 | — | Hidratação de histórico / N+1 |
| CareersPage → CareerGroup | medium | cold-session | 5 | 0 | 285,3 | 298,1 | — | Buscas de grupo + render |
| Season → Academy | medium | cold-session | 5 | 0 | 111,8 | 140,5 | — | Dados locais / render |
| Academy: abrir jogadores | medium | cold-session | 5 | 0 | 31,7 | 32,4 | — | Dados locais / render |
| CareersPage: troféus | medium | cold-session | 5 | 0 | 68,1 | 69,4 | — | Abertura de modal / imagens |
| Entrada → Login | medium | warm-session | 5 | 0 | 1.529,9 | 1.547,8 | — | 3 gestos + pausas do script |
| Login → CareersPage | medium | warm-session | 5 | 0 | 11.854,2 | 12.002 | — | Hidratação de histórico / N+1 |
| CareersPage → Career | medium | warm-session | 5 | 0 | 11.877,1 | 12.086,6 | — | Hidratação de histórico / N+1 |
| Career → Season | medium | warm-session | 5 | 0 | 12.778,5 | 13.372,3 | — | Hidratação de histórico / N+1 |
| Season: aba Partidas | medium | warm-session | 5 | 0 | 364,3 | 365,2 | — | Animação Swiper + render |
| Season: aba Classificação | medium | warm-session | 5 | 0 | 365,1 | 365,8 | — | Animação Swiper + render |
| Season: aba Estatísticas | medium | warm-session | 5 | 0 | 363,7 | 365,4 | — | Animação Swiper + render |
| Season: aba Geral | medium | warm-session | 5 | 0 | 362,8 | 365,2 | — | Animação Swiper + render |
| Season → Match | medium | warm-session | 5 | 0 | 10.187,1 | 10.199 | — | Hidratação de histórico / N+1 |
| Match: aba Formações | medium | warm-session | 5 | 0 | 365,1 | 366,6 | — | Animação Swiper + render |
| Match: aba Estatísticas | medium | warm-session | 5 | 0 | 364,9 | 365,8 | — | Animação Swiper + render |
| Season → Player | medium | warm-session | 5 | 0 | 10.337,3 | 10.483,1 | — | Hidratação de histórico / N+1 |
| Career → Geral | medium | warm-session | 5 | 0 | 9.824,3 | 10.058,3 | — | Hidratação de histórico / N+1 |
| Geral → ComparePlayers | medium | warm-session | 5 | 0 | 9.329,9 | 9.359,4 | — | Hidratação de histórico / N+1 |
| CareersPage → CareerGroup | medium | warm-session | 5 | 0 | 284,5 | 300,5 | — | Buscas de grupo + render |
| Season → Academy | medium | warm-session | 5 | 0 | 119,3 | 122,2 | — | Dados locais / render |
| Academy: abrir jogadores | medium | warm-session | 5 | 0 | 31,8 | 32,1 | — | Dados locais / render |
| CareersPage: troféus | medium | warm-session | 5 | 0 | 67,8 | 68,1 | — | Abertura de modal / imagens |
| Entrada → Login | small | cold-session | 5 | 0 | 1.515,3 | 1.515,7 | — | 3 gestos + pausas do script |
| Login → CareersPage | small | cold-session | 5 | 0 | 3.401,9 | 3.936,7 | — | Hidratação de histórico / N+1 |
| CareersPage → Career | small | cold-session | 5 | 0 | 4.057,9 | 4.097,1 | — | Hidratação de histórico / N+1 |
| Career → Season | small | cold-session | 5 | 0 | 4.897,7 | 4.968,4 | — | Hidratação de histórico / N+1 |
| Season: aba Partidas | small | cold-session | 5 | 0 | 347 | 347,9 | — | Animação Swiper + render |
| Season: aba Classificação | small | cold-session | 5 | 0 | 348,2 | 348,4 | — | Animação Swiper + render |
| Season: aba Estatísticas | small | cold-session | 5 | 0 | 347,5 | 347,7 | — | Animação Swiper + render |
| Season: aba Geral | small | cold-session | 5 | 0 | 347,6 | 348,1 | — | Animação Swiper + render |
| Season → Match | small | cold-session | 5 | 0 | 3.470,7 | 4.055,7 | — | Hidratação de histórico / N+1 |
| Match: aba Formações | small | cold-session | 5 | 0 | 348,2 | 348,8 | — | Animação Swiper + render |
| Match: aba Estatísticas | small | cold-session | 5 | 0 | 348,5 | 348,6 | — | Animação Swiper + render |
| Season → Player | small | cold-session | 5 | 0 | 3.954 | 3.985,3 | — | Hidratação de histórico / N+1 |
| Career → Geral | small | cold-session | 5 | 0 | 3.440,4 | 3.954,1 | — | Hidratação de histórico / N+1 |
| Geral → ComparePlayers | small | cold-session | 5 | 0 | 3.303,1 | 3.938,8 | — | Hidratação de histórico / N+1 |
| CareersPage → CareerGroup | small | cold-session | 5 | 0 | 261,8 | 264,6 | — | Buscas de grupo + render |
| Season → Academy | small | cold-session | 5 | 0 | 113,8 | 144,1 | — | Dados locais / render |
| Academy: abrir jogadores | small | cold-session | 5 | 0 | 29,9 | 31,2 | — | Dados locais / render |
| CareersPage: troféus | small | cold-session | 5 | 0 | 63,9 | 64 | — | Abertura de modal / imagens |
| Entrada → Login | small | warm-session | 5 | 0 | 1.499,7 | 1.517,5 | — | 3 gestos + pausas do script |
| Login → CareersPage | small | warm-session | 5 | 0 | 3.951,1 | 3.986,9 | — | Hidratação de histórico / N+1 |
| CareersPage → Career | small | warm-session | 5 | 0 | 3.987,3 | 4.010,3 | — | Hidratação de histórico / N+1 |
| Career → Season | small | warm-session | 5 | 0 | 4.954,2 | 4.998,2 | — | Hidratação de histórico / N+1 |
| Season: aba Partidas | small | warm-session | 5 | 0 | 346,8 | 347,4 | — | Animação Swiper + render |
| Season: aba Classificação | small | warm-session | 5 | 0 | 347,5 | 348,2 | — | Animação Swiper + render |
| Season: aba Estatísticas | small | warm-session | 5 | 0 | 347,6 | 348,1 | — | Animação Swiper + render |
| Season: aba Geral | small | warm-session | 5 | 0 | 348,1 | 348,2 | — | Animação Swiper + render |
| Season → Match | small | warm-session | 5 | 0 | 3.436,4 | 3.987,2 | — | Hidratação de histórico / N+1 |
| Match: aba Formações | small | warm-session | 5 | 0 | 348,1 | 349 | — | Animação Swiper + render |
| Match: aba Estatísticas | small | warm-session | 5 | 0 | 347,6 | 347,7 | — | Animação Swiper + render |
| Season → Player | small | warm-session | 5 | 0 | 3.437 | 3.438,4 | — | Hidratação de histórico / N+1 |
| Career → Geral | small | warm-session | 5 | 0 | 3.454 | 3.457,1 | — | Hidratação de histórico / N+1 |
| Geral → ComparePlayers | small | warm-session | 5 | 0 | 3.286,2 | 3.319 | — | Hidratação de histórico / N+1 |
| CareersPage → CareerGroup | small | warm-session | 5 | 0 | 231,7 | 246,2 | — | Buscas de grupo + render |
| Season → Academy | small | warm-session | 5 | 0 | 103,8 | 109,2 | — | Dados locais / render |
| Academy: abrir jogadores | small | warm-session | 5 | 0 | 31,2 | 32,5 | — | Dados locais / render |
| CareersPage: troféus | small | warm-session | 5 | 0 | 64,2 | 68,3 | — | Abertura de modal / imagens |

### Séries preservadas e cobertura efetiva

| Modo | Perfil | Condição | Cadeias completas | Censuradas | Interrompidas | Aquecimentos |
|---|---|---|---|---|---|---|
| navigation | large | cold-session | 0 | 5 | 0 | 1 |
| navigation | large | warm-session | 0 | 4 | 1 | 1 |
| navigation | medium | cold-session | 5 | 0 | 0 | 1 |
| navigation | medium | warm-session | 5 | 0 | 0 | 0 |
| navigation | small | cold-session | 5 | 0 | 0 | 1 |
| navigation | small | warm-session | 5 | 0 | 0 | 1 |
| profile | medium | profile | 3 | 0 | 0 | 1 |
| profile | small | profile | 3 | 0 | 0 | 1 |

Limite de observação: 30 s. As contagens abaixo são parciais até o corte. O corte pode ocorrer durante estabilização após conteúdo parcial; não equivale automaticamente a 30 s de página totalmente vazia. Nenhuma duração final foi imputada. O aquecimento e pelo menos duas sessões independentes confirmaram a saturação; o excedente já persistido foi conservado, sem novas repetições do login após a mudança de método solicitada.

| Perfil | Condição | Repetição | Fluxo | Janela ms | Operações iniciadas | Leituras concluídas | playerStats iniciadas/concluídas | Docs | HTTP Firestore | Listeners abertos | Interface utilizável | Estágio |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| large | cold-session | 1 | Login → CareersPage | 29.964,5 | 920 | 68 | 900/50 | 1.453 | 9 | 1 | não | spinner principal |
| large | warm-session | 1 | Login → CareersPage | 29.971 | 920 | 68 | 900/50 | 1.453 | 6 | 1 | não | spinner principal |
| large | cold-session | 2 | Login → CareersPage | 29.968,7 | 920 | 68 | 900/50 | 1.453 | 8 | 1 | não | spinner principal |
| large | warm-session | 2 | Login → CareersPage | 29.974,8 | 920 | 68 | 900/50 | 1.453 | 8 | 1 | não | spinner principal |
| large | cold-session | 3 | Login → CareersPage | 29.963,8 | 920 | 68 | 900/50 | 1.453 | 6 | 1 | não | spinner principal |
| large | warm-session | 3 | Login → CareersPage | 29.968,1 | 920 | 68 | 900/50 | 1.453 | 8 | 1 | não | spinner principal |
| large | cold-session | 4 | Login → CareersPage | 29.966,4 | 920 | 68 | 900/50 | 1.453 | 9 | 1 | não | spinner principal |
| large | warm-session | 4 | Login → CareersPage | 29.970,4 | 920 | 68 | 900/50 | 1.453 | 6 | 1 | não | spinner principal |
| large | cold-session | 5 | Login → CareersPage | 29.957,9 | 920 | 68 | 900/50 | 1.453 | 8 | 1 | não | spinner principal |

Fluxos não alcançados porque uma origem/preparação anterior não terminou no limite:

| Série | Cadeias afetadas (inclui aquecimento) | Fluxos não alcançados |
|---|---|---|
| navigation/large/cold-session | 6 | CareersPage → Career; Career → Season; Season: aba Partidas; Season: aba Classificação; Season: aba Estatísticas; Season: aba Geral; Season → Match; Match: aba Formações; Match: aba Estatísticas; Season → Player; Career → Geral; Geral → ComparePlayers; CareersPage → CareerGroup; Season → Academy; Academy: abrir jogadores; CareersPage: troféus |
| navigation/large/warm-session | 6 | CareersPage → Career; Career → Season; Season: aba Partidas; Season: aba Classificação; Season: aba Estatísticas; Season: aba Geral; Season → Match; Match: aba Formações; Match: aba Estatísticas; Season → Player; Career → Geral; Geral → ComparePlayers; CareersPage → CareerGroup; Season → Academy; Academy: abrir jogadores; CareersPage: troféus; Login → CareersPage |

As 12 cadeias pequenas de 22/09 e o aquecimento cold médio foram mantidos. As demais séries foram retomadas em 23/09 após reiniciar os emuladores. A varredura de estabilização do coletor foi simplificada para remover custo quadrático do instrumento. Portanto, use a curva entre perfis principalmente para comparar contagens estruturais; dia, estado dos emuladores e custo do coletor também afetam os tempos. Uma cadeia warm precedida de cold censurado tem cache parcialmente preparado, explicitado pela cobertura acima.

### Marcos da navegação (medianas das sessões novas, por perfil)

| Perfil | Fluxo | URL/documento | Primeiro texto DOM | Utilizável | Última leitura | Fim da coleta |
|---|---|---|---|---|---|---|
| small | Entrada → Login | — | — | 1.515,3 | — | 1.964 |
| small | Login → CareersPage | 20,8 | 3.312,7 | 3.401,9 | 3.286,1 | 3.853,9 |
| small | CareersPage → Career | 63,3 | 3.579,1 | 4.057,9 | 3.570 | 4.515,1 |
| small | Career → Season | 942,7 | 4.533,9 | 4.897,7 | 4.580,2 | 5.356,1 |
| small | Season: aba Partidas | — | 10 | 347 | — | 799,7 |
| small | Season: aba Classificação | — | 8 | 348,2 | — | 803 |
| small | Season: aba Estatísticas | — | 8,1 | 347,5 | — | 800,9 |
| small | Season: aba Geral | — | 7,9 | 347,6 | — | 797,3 |
| small | Season → Match | 1 | 3.375 | 3.470,7 | 3.344,3 | 3.965,9 |
| small | Match: aba Formações | — | 3,4 | 348,2 | — | 837,3 |
| small | Match: aba Estatísticas | — | 2,6 | 348,5 | — | 852,5 |
| small | Season → Player | 1 | 3.679,2 | 3.954 | 3.647,3 | 4.480,9 |
| small | Career → Geral | 1,1 | 3.339,3 | 3.440,4 | 3.395 | 3.965,3 |
| small | Geral → ComparePlayers | 1,7 | 1.524,1 | 3.303,1 | 3.253,6 | 3.859 |
| small | CareersPage → CareerGroup | 1,5 | 152,7 | 261,8 | 139 | 770,8 |
| small | Season → Academy | 1,1 | 15,2 | 113,8 | 71,3 | 632,9 |
| small | Academy: abrir jogadores | — | — | 29,9 | — | 540,7 |
| small | CareersPage: troféus | — | — | 63,9 | — | 579,6 |
| medium | Entrada → Login | — | — | 1.536,6 | — | 1.986,3 |
| medium | Login → CareersPage | 21,7 | 8.690,2 | 9.146,2 | 8.664,5 | 9.596 |
| medium | CareersPage → Career | 68,3 | 11.559,6 | 11.984,8 | 11.549 | 12.442,8 |
| medium | Career → Season | 961,5 | 12.758 | 13.080,7 | 12.803,6 | 13.527,7 |
| medium | Season: aba Partidas | — | 10,6 | 363,8 | — | 803,1 |
| medium | Season: aba Classificação | — | 9 | 364,6 | — | 805,1 |
| medium | Season: aba Estatísticas | — | 8,9 | 364,7 | — | 806 |
| medium | Season: aba Geral | — | 9 | 366,4 | — | 807,9 |
| medium | Season → Match | 1 | 9.639 | 10.015,9 | 9.605,8 | 10.463,5 |
| medium | Match: aba Formações | — | 3,6 | 366,1 | — | 807,7 |
| medium | Match: aba Estatísticas | — | 2,7 | 365 | — | 801,6 |
| medium | Season → Player | 1,1 | 9.399,7 | 9.836,7 | 9.354,9 | 10.290,9 |
| medium | Career → Geral | 2,2 | 9.380,8 | 9.785,4 | 9.466,6 | 10.233,1 |
| medium | Geral → ComparePlayers | 3,3 | 1.709,3 | 9.296,4 | 9.264,8 | 9.747 |
| medium | CareersPage → CareerGroup | 3,2 | 243,6 | 285,3 | 230,5 | 730,2 |
| medium | Season → Academy | 2,6 | 20,7 | 111,8 | 78,5 | 562,2 |
| medium | Academy: abrir jogadores | — | — | 31,7 | — | 474,8 |
| medium | CareersPage: troféus | — | — | 68,1 | — | 520,3 |
| large | Entrada → Login | — | — | 1.531,7 | — | 1.973,2 |
| large | Login → CareersPage | 20,5 | — | — | 3.506,8 | 29.964,5 |
| large | CareersPage → Career | — | — | — | — | — |
| large | Career → Season | — | — | — | — | — |
| large | Season: aba Partidas | — | — | — | — | — |
| large | Season: aba Classificação | — | — | — | — | — |
| large | Season: aba Estatísticas | — | — | — | — | — |
| large | Season: aba Geral | — | — | — | — | — |
| large | Season → Match | — | — | — | — | — |
| large | Match: aba Formações | — | — | — | — | — |
| large | Match: aba Estatísticas | — | — | — | — | — |
| large | Season → Player | — | — | — | — | — |
| large | Career → Geral | — | — | — | — | — |
| large | Geral → ComparePlayers | — | — | — | — | — |
| large | CareersPage → CareerGroup | — | — | — | — | — |
| large | Season → Academy | — | — | — | — | — |
| large | Academy: abrir jogadores | — | — | — | — | — |
| large | CareersPage: troféus | — | — | — | — | — |

O primeiro texto é um marcador DOM aproximado, não FCP por rota. Em reload, “URL/documento” é o início do documento novo. Rede, React e assets se sobrepõem: seus tempos não são somados como fases exclusivas. Os eventos mantêm timestamps absolutos para inspeção.

## Dados e Firebase

Uma amostra representativa por fluxo e perfil; contagens de cada repetição estão no JSON. “Consultas” inclui registro de listener; “leituras” na saída do runner conta getDoc/getDocs.

| Perfil | Fluxo | Censurada | Operações lógicas | Carreiras | Temporadas | Jogadores | Partidas | playerStats | Tabela | Base | Grupos | Docs entregues | HTTP Firestore | Operações repetidas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| small | Entrada → Login | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| small | Login → CareersPage | não | 67 | 1 | 0 | 3 | 3 | 60 | 0 | 0 | 0 | 777 | 8 | 0 |
| small | CareersPage → Career | não | 67 | 1 | 0 | 3 | 3 | 60 | 0 | 0 | 0 | 777 | 9 | 0 |
| small | Career → Season | não | 68 | 1 | 0 | 3 | 3 | 60 | 1 | 0 | 0 | 779 | 10 | 0 |
| small | Season: aba Partidas | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| small | Season: aba Classificação | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| small | Season: aba Estatísticas | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| small | Season: aba Geral | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| small | Season → Match | não | 68 | 1 | 0 | 3 | 3 | 61 | 0 | 0 | 0 | 788 | 8 | 1 |
| small | Match: aba Formações | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| small | Match: aba Estatísticas | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| small | Season → Player | não | 134 | 2 | 0 | 6 | 6 | 120 | 0 | 0 | 0 | 1.554 | 7 | 67 |
| small | Career → Geral | não | 68 | 1 | 0 | 3 | 3 | 60 | 1 | 0 | 0 | 779 | 9 | 0 |
| small | Geral → ComparePlayers | não | 67 | 1 | 0 | 3 | 3 | 60 | 0 | 0 | 0 | 777 | 6 | 0 |
| small | CareersPage → CareerGroup | não | 10 | 2 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 156 | 6 | 5 |
| small | Season → Academy | não | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 11 | 3 | 0 |
| small | Academy: abrir jogadores | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| small | CareersPage: troféus | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | Entrada → Login | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | Login → CareersPage | não | 313 | 1 | 0 | 6 | 6 | 300 | 0 | 0 | 0 | 3.753 | 10 | 0 |
| medium | CareersPage → Career | não | 313 | 1 | 0 | 6 | 6 | 300 | 0 | 0 | 0 | 3.753 | 10 | 0 |
| medium | Career → Season | não | 314 | 1 | 0 | 6 | 6 | 300 | 1 | 0 | 0 | 3.755 | 11 | 0 |
| medium | Season: aba Partidas | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | Season: aba Classificação | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | Season: aba Estatísticas | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | Season: aba Geral | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | Season → Match | não | 314 | 1 | 0 | 6 | 6 | 301 | 0 | 0 | 0 | 3.764 | 9 | 1 |
| medium | Match: aba Formações | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | Match: aba Estatísticas | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | Season → Player | não | 626 | 2 | 0 | 12 | 12 | 600 | 0 | 0 | 0 | 7.506 | 8 | 313 |
| medium | Career → Geral | não | 314 | 1 | 0 | 6 | 6 | 300 | 1 | 0 | 0 | 3.755 | 9 | 0 |
| medium | Geral → ComparePlayers | não | 313 | 1 | 0 | 6 | 6 | 300 | 0 | 0 | 0 | 3.753 | 8 | 0 |
| medium | CareersPage → CareerGroup | não | 18 | 2 | 0 | 8 | 8 | 0 | 0 | 0 | 0 | 604 | 10 | 9 |
| medium | Season → Academy | não | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 15 | 3 | 0 |
| medium | Academy: abrir jogadores | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| medium | CareersPage: troféus | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| large | Entrada → Login | não | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| large | Login → CareersPage | sim | 920 | 1 | 0 | 1 | 18 | 900 | 0 | 0 | 0 | 1.453 | 9 | 0 |

As temporadas vêm embutidas no documento da carreira nos fluxos medidos; zero queries da coleção `seasons` não significa zero temporadas processadas. Firestore multiplexa operações em WebChannel. Entregas repetidas de documentos podem compartilhar cache/target do SDK, portanto os números não estimam cobrança.

### N+1 e duplicações

| Perfil | Partidas na fixture | playerStats ao abrir Careers | playerStats ao abrir Match | playerStats ao abrir Player | Docs ao abrir Player |
|---|---|---|---|---|---|
| small | 60 | 60 | 61 | 120 | 1.554 |
| medium | 300 | 300 | 301 | 600 | 7.506 |
| large | 900 | 900 | — | — | — |
| Partidas | playerStats iniciadas no login | Concluídas na janela representativa | Relação |
|---|---|---|---|
| 60 | 60 | 60 | 1 por partida |
| 300 | 300 | 300 | 1 por partida |
| 900 | 900 | 50 | 1 por partida (censurado) |

MEDIDO: M partidas iniciam M buscas adicionais de playerStats, além de consultas de partidas/elencos e inscrição de carreiras. CONFIRMADO PELO CÓDIGO: a busca individual ocorre no percurso de cada partida. No grande, quantidade iniciada não significa quantidade concluída.

### Grande com autenticação preparada

Esta coleta exploratória autentica pela UI, encerra a hidratação inicial ao abrir Tutorial e então acessa URLs diretamente com Auth/cache HTTP preservados. Não é a jornada cold original nem uma sessão com histórico integralmente carregado. n = 1 por alvo, sem percentis. Academy depende de location.state produzido pela temporada; sua abertura direta equivalente não foi medida no grande.

| Alvo | Estado | Observado ms | Utilizável ms | Leituras iniciadas/concluídas | playerStats iniciadas/concluídas | Docs | HTTP Firestore | Listeners abertos | Documento novo |
|---|---|---|---|---|---|---|---|---|---|
| Grande preparado: Group via URL | MEDIDO | 27.374,4 | 26.905,2 | 677/677 | 600/600 | 9.415 | 36 | 0 | sim |
| Grande preparado: Compare via URL | CENSURADO | 30.013,4 | — | 919/68 | 900/50 | 1.453 | 8 | 1 | sim |
| Grande preparado: Player via URL | CENSURADO | 30.015,3 | — | 1838/138 | 1800/102 | 2.928 | 6 | 2 | sim |

A abertura direta do grupo tem um custo que não aparece no clique SPA com location.state: ServiceCareerGroup.getById hidrata as duas carreiras pelo Getters antes das duas buscas de PlayersGroupService. No grande preparado foram medidas 600 buscas de playerStats nesse caminho, além do percurso duplicado do grupo. Não se atribui toda a diferença de tempo ao reload: também muda o estado de entrada e o trabalho realizado. O Player preparado iniciou 1.800 buscas de stats; essa contagem é parcial de uma observação censurada, não duração final nem previsão de cobrança.

`Getters` carrega partidas e fichas de todas as carreiras/temporadas até para uma rota específica. `usePlayerPageData` instancia `useCareers` diretamente e via `useSeasonView`: a instrumentação registra duas inscrições e duas hidratações. `useMatchData` busca novamente a subcoleção de fichas da partida já carregada. No grupo, `getAggregatedGroupStats` e `getGroupSeasonsData` repetem o mesmo percurso; contagens e caminhos duplicados estão no JSON. Isso indica candidatos a deduplicação futura, sem implementá-la aqui.

## Listeners e updatedAt

Ciclos reais SPA Careers → Group → Careers, sem reload entre os ciclos. Contagens se referem a inscrições da aplicação no documento atual; não a conexões físicas do SDK.

| Perfil | Evento | Ciclo | Listeners antes | Listeners depois | Delta | Callbacks | Operações | Docs |
|---|---|---|---|---|---|---|---|---|
| medium | updatedAt: antes dos ciclos | — | 1 | — | — | 1 | 312 | 3.753 |
| medium | Listener: Careers → Group | 1 | 1 | 1 | 0 | 0 | 18 | 604 |
| medium | Listener: Group → Careers | 1 | 1 | 2 | 1 | 1 | 313 | 3.753 |
| medium | Listener: Careers → Group | 2 | 2 | 2 | 0 | 0 | 18 | 604 |
| medium | Listener: Group → Careers | 2 | 2 | 3 | 1 | 1 | 313 | 3.753 |
| medium | Listener: Careers → Group | 3 | 3 | 3 | 0 | 0 | 18 | 604 |
| medium | Listener: Group → Careers | 3 | 3 | 4 | 1 | 1 | 313 | 3.753 |
| medium | updatedAt: depois dos ciclos | — | — | 4 | — | 4 | 1.248 | 15.012 |
| medium | updatedAt: Season com abas ocultas | — | — | — | — | 1 | 313 | 3.755 |
| small | updatedAt: antes dos ciclos | — | 1 | — | — | 1 | 66 | 777 |
| small | Listener: Careers → Group | 1 | 1 | 1 | 0 | 0 | 10 | 156 |
| small | Listener: Group → Careers | 1 | 1 | 2 | 1 | 1 | 67 | 777 |
| small | Listener: Careers → Group | 2 | 2 | 2 | 0 | 0 | 10 | 156 |
| small | Listener: Group → Careers | 2 | 2 | 3 | 1 | 1 | 67 | 777 |
| small | Listener: Careers → Group | 3 | 3 | 3 | 0 | 0 | 10 | 156 |
| small | Listener: Group → Careers | 3 | 3 | 4 | 1 | 1 | 67 | 777 |
| small | updatedAt: depois dos ciclos | — | — | 4 | — | 4 | 264 | 3.108 |
| small | updatedAt: Season com abas ocultas | — | — | — | — | 1 | 67 | 779 |

O callback de autenticação de `useCareers` devolve o cleanup ao SDK Auth; isso não registra o cleanup do listener Firestore no efeito React. Os ciclos quantificam o efeito sem corrigir o hook. A atualização de apenas `updatedAt` permite observar trabalho mesmo sem alteração de partidas, jogadores ou tabela. Reload destrói o documento e reinicia suas inscrições; a contagem não é acumulada indevidamente entre documentos.

## React Profiler

Build `react-dom/profiling`, separado dos tempos normais. As medianas usam execuções concluídas, com n explícito; fluxos censurados não entram nesta tabela de duração. Maior render é o máximo observado nas execuções, não a duração completa de commit DOM. Duração acumulada é soma de `actualDuration` **dentro da mesma fronteira**; não somar linhas de pais e filhos. Callbacks em múltiplas instâncias de CareerCard são agregados.

| Perfil | Fluxo | Componente | n | Callbacks de commit (mediana) | Render acumulado ms (mediana) | Maior render observado ms |
|---|---|---|---|---|---|---|
| medium | Career → Geral | SectionView | 3 | 7 | 71,7 | 40 |
| small | Career → Season | SectionView | 3 | 7 | 67,9 | 53,1 |
| medium | Career → Season | SectionView | 3 | 7 | 67,6 | 45,5 |
| small | Career → Geral | SectionView | 3 | 7 | 51,2 | 39,8 |
| medium | Season → Player | SectionView | 3 | 5 | 29,6 | 20,2 |
| small | Season → Player | SectionView | 3 | 5 | 23,7 | 16,9 |
| medium | Career → Geral | AllMatchesTab | 3 | 2 | 20,7 | 16,8 |
| small | Career → Season | StatsTab_Club | 3 | 3 | 20,3 | 16,8 |
| small | Career → Season | PlayerStatsList | 3 | 3 | 19 | 14,9 |
| medium | Career → Season | StatsTab_Club | 3 | 3 | 16 | 11 |
| medium | Geral → ComparePlayers | ComparePlayers | 3 | 5 | 14,8 | 12 |
| medium | Career → Season | PlayerStatsList | 3 | 3 | 14,6 | 9,8 |
| small | Season → Match | Match | 3 | 7 | 14,4 | 13,5 |
| small | Geral → ComparePlayers | ComparePlayers | 3 | 5 | 14,2 | 16,8 |
| medium | Season → Player | AllMatchesTab | 3 | 2 | 13,9 | 10,8 |
| medium | Career → Season | SquadTab | 3 | 2 | 12,8 | 8,6 |
| medium | Season → Match | Match | 3 | 7 | 11,7 | 10,5 |
| small | CareersPage → CareerGroup | SectionView | 3 | 6 | 11,2 | 8,1 |
| small | Career → Geral | StatsTab_Club | 3 | 3 | 11 | 10 |
| medium | Career → Geral | StatsTab_Club | 3 | 3 | 10,4 | 8,9 |
| small | Career → Geral | PlayerStatsList | 3 | 3 | 10,1 | 9,2 |
| medium | Career → Geral | SquadTab | 3 | 2 | 9,9 | 6,6 |
| medium | Season → Academy | AcademyProvider | 3 | 5 | 9,7 | 4,4 |
| small | Career → Season | SquadTab | 3 | 2 | 9,5 | 7,2 |
| small | Season → Academy | AcademyProvider | 3 | 5 | 9,5 | 5,3 |
| medium | Season: aba Partidas | SectionView | 3 | 2 | 9,4 | 9,9 |
| medium | Career → Geral | PlayerStatsList | 3 | 3 | 9,3 | 8,9 |
| small | Career → Season | BestPlayersTab | 3 | 2 | 9 | 6,5 |
| small | Career → Season | GeneralTab | 3 | 3 | 9 | 7,2 |
| medium | Career → Season | BestPlayersTab | 3 | 2 | 8,8 | 6,5 |
| medium | Career → Geral | BestPlayersTab | 3 | 3 | 8,6 | 6,6 |
| medium | Career → Season | GeneralTab | 3 | 3 | 8,5 | 6,9 |
| medium | CareersPage → CareerGroup | SectionView | 3 | 6 | 8,2 | 5 |
| small | Season: aba Partidas | SectionView | 3 | 2 | 8,1 | 10,9 |
| medium | Season: aba Estatísticas | SectionView | 3 | 2 | 7,9 | 8,1 |
| medium | Season: aba Geral | SectionView | 3 | 1 | 7,8 | 8,4 |
| medium | Season: aba Classificação | SectionView | 3 | 1 | 7,7 | 7,9 |
| small | Career → Geral | BestPlayersTab | 3 | 3 | 7,6 | 5,8 |
| small | Season → Player | AllMatchesTab | 3 | 2 | 7,4 | 6,4 |
| small | Career → Geral | SquadTab | 3 | 2 | 7,2 | 6,3 |
| small | Season: aba Estatísticas | SectionView | 3 | 2 | 7 | 8,2 |
| medium | Career → Season | CuriositiesTab | 3 | 2 | 6,7 | 5,4 |
| small | Season: aba Classificação | SectionView | 3 | 1 | 6,6 | 9,2 |
| small | Season: aba Geral | SectionView | 3 | 1 | 6,5 | 6,6 |
| small | Career → Season | CuriositiesTab | 3 | 2 | 6,4 | 5,1 |
| small | Career → Geral | AllMatchesTab | 3 | 2 | 6,4 | 6,2 |
| medium | Career → Geral | CuriositiesTab | 3 | 2 | 4,9 | 3,4 |
| small | Career → Geral | CuriositiesTab | 3 | 2 | 4,8 | 4 |
| small | Season → Match | LineupTab | 3 | 1 | 4,7 | 6,5 |
| small | Career → Geral | GeneralTab | 3 | 3 | 3,9 | 6,6 |
| medium | Career → Geral | GeneralTab | 3 | 3 | 3,8 | 2,9 |
| small | Login → CareersPage | CareerCard | 3 | 3 | 3,8 | 6,4 |
| small | Season → Match | MatchDetailsTab | 3 | 1 | 3,7 | 4,1 |
| medium | Login → CareersPage | CareerCard | 3 | 3 | 3,6 | 4 |
| small | Career → Season | TableTab | 3 | 3 | 3,4 | 2,5 |
| medium | Season → Match | MatchDetailsTab | 3 | 1 | 3,2 | 3,2 |
| small | CareersPage → CareerGroup | StatsTab_Club | 3 | 2 | 3,2 | 3,4 |
| medium | Career → Season | TableTab | 3 | 3 | 3,1 | 2,8 |
| medium | Season: aba Partidas | SquadTab | 3 | 1 | 3,1 | 3,3 |
| medium | Season → Match | LineupTab | 3 | 1 | 2,8 | 3,1 |
| medium | Season: aba Estatísticas | SquadTab | 3 | 1 | 2,5 | 2,5 |
| medium | Season: aba Geral | SquadTab | 3 | 1 | 2,5 | 2,8 |
| medium | Season: aba Classificação | SquadTab | 3 | 1 | 2,3 | 2,5 |
| medium | Career → Season | AllMatchesTab | 3 | 2 | 2,1 | 1,7 |
| medium | Career → Geral | TableTab | 3 | 3 | 2,1 | 1,9 |
| small | Career → Geral | TableTab | 3 | 3 | 2 | 1,9 |
| small | Season: aba Partidas | StatsTab_Club | 3 | 1 | 2 | 2,9 |
| small | Match: aba Estatísticas | Match | 3 | 1 | 1,9 | 2 |
| medium | Season: aba Partidas | StatsTab_Club | 3 | 1 | 1,9 | 1,9 |
| medium | Match: aba Formações | Match | 3 | 2 | 1,9 | 1,9 |
| small | Match: aba Formações | Match | 3 | 2 | 1,9 | 2,4 |
| small | Season: aba Partidas | PlayerStatsList | 3 | 1 | 1,9 | 2,8 |
| medium | Match: aba Estatísticas | Match | 3 | 1 | 1,8 | 1,8 |
| small | CareersPage → CareerGroup | BestPlayersTab | 3 | 3 | 1,8 | 1,3 |
| medium | Season: aba Partidas | PlayerStatsList | 3 | 1 | 1,7 | 1,7 |
| medium | CareersPage → CareerGroup | BestPlayersTab | 3 | 3 | 1,7 | 1,1 |
| medium | Season: aba Estatísticas | StatsTab_Club | 3 | 1 | 1,6 | 1,6 |
| small | Season: aba Partidas | SquadTab | 3 | 1 | 1,6 | 1,9 |
| small | Season: aba Estatísticas | StatsTab_Club | 3 | 1 | 1,6 | 1,8 |
| medium | Season: aba Classificação | StatsTab_Club | 3 | 1 | 1,5 | 1,8 |
| medium | Season: aba Estatísticas | PlayerStatsList | 3 | 1 | 1,5 | 1,5 |
| medium | Academy: abrir jogadores | AcademyProvider | 3 | 1 | 1,5 | 1,5 |
| small | Season: aba Estatísticas | SquadTab | 3 | 1 | 1,5 | 1,5 |
| small | Season: aba Estatísticas | PlayerStatsList | 3 | 1 | 1,5 | 1,5 |
| small | Season: aba Classificação | StatsTab_Club | 3 | 1 | 1,4 | 2,6 |
| medium | Season: aba Classificação | PlayerStatsList | 3 | 1 | 1,4 | 1,7 |
| small | Career → Season | AllMatchesTab | 3 | 2 | 1,4 | 1,8 |
| small | Season: aba Geral | SquadTab | 3 | 1 | 1,4 | 1,4 |
| small | Season → Match | MatchStatsTab | 3 | 1 | 1,4 | 1,6 |
| small | Season: aba Geral | StatsTab_Club | 3 | 1 | 1,3 | 1,5 |
| small | Season: aba Classificação | PlayerStatsList | 3 | 1 | 1,3 | 2,6 |
| small | Season: aba Estatísticas | BestPlayersTab | 3 | 2 | 1,3 | 1,5 |
| medium | Season: aba Geral | StatsTab_Club | 3 | 1 | 1,3 | 1,4 |
| medium | CareersPage → CareerGroup | StatsTab_Club | 3 | 2 | 1,3 | 0,8 |
| small | Season: aba Classificação | SquadTab | 3 | 1 | 1,3 | 1,7 |
| medium | Season: aba Partidas | BestPlayersTab | 3 | 2 | 1,2 | 1,4 |
| small | Season: aba Geral | PlayerStatsList | 3 | 1 | 1,2 | 1,4 |
| medium | Season: aba Geral | BestPlayersTab | 3 | 1 | 1,2 | 1,3 |
| small | Academy: abrir jogadores | AcademyProvider | 3 | 1 | 1,2 | 1,7 |
| medium | Season: aba Geral | PlayerStatsList | 3 | 1 | 1,2 | 1,4 |
| medium | Season → Match | MatchStatsTab | 3 | 1 | 1,2 | 1,2 |
| small | Season: aba Partidas | BestPlayersTab | 3 | 2 | 1,2 | 1,8 |
| medium | Season: aba Estatísticas | BestPlayersTab | 3 | 2 | 1,1 | 1,1 |
| small | Season: aba Partidas | GeneralTab | 3 | 1 | 1,1 | 1,3 |
| small | Season: aba Geral | BestPlayersTab | 3 | 1 | 1,1 | 1,2 |
| small | Season: aba Classificação | BestPlayersTab | 3 | 1 | 1 | 1,4 |
| medium | CareersPage: troféus | CareerCard | 3 | 3 | 1 | 0,5 |
| medium | Season: aba Classificação | BestPlayersTab | 3 | 1 | 0,9 | 1,1 |
| small | Season: aba Classificação | GeneralTab | 3 | 1 | 0,9 | 0,9 |
| small | CareersPage: troféus | CareerCard | 3 | 3 | 0,9 | 0,9 |
| small | Season: aba Estatísticas | GeneralTab | 3 | 1 | 0,8 | 1 |
| small | Season: aba Geral | GeneralTab | 3 | 1 | 0,7 | 0,9 |
| medium | Season: aba Partidas | GeneralTab | 3 | 1 | 0,7 | 0,9 |
| medium | Season: aba Classificação | GeneralTab | 3 | 1 | 0,7 | 0,9 |
| medium | Season: aba Geral | GeneralTab | 3 | 1 | 0,7 | 0,7 |
| medium | Season: aba Estatísticas | GeneralTab | 3 | 1 | 0,7 | 0,8 |
| medium | Season: aba Classificação | CuriositiesTab | 3 | 1 | 0,6 | 0,6 |
| small | Season: aba Partidas | CuriositiesTab | 3 | 1 | 0,6 | 0,7 |
| small | Season: aba Classificação | CuriositiesTab | 3 | 1 | 0,6 | 0,6 |
| medium | Season: aba Partidas | CuriositiesTab | 3 | 1 | 0,5 | 0,6 |
| medium | Season: aba Geral | CuriositiesTab | 3 | 1 | 0,5 | 0,5 |
| medium | Match: aba Formações | MatchDetailsTab | 3 | 1 | 0,5 | 0,5 |
| medium | Match: aba Estatísticas | MatchDetailsTab | 3 | 1 | 0,5 | 0,6 |
| small | Season: aba Geral | CuriositiesTab | 3 | 1 | 0,5 | 0,6 |
| small | Match: aba Formações | MatchDetailsTab | 3 | 1 | 0,5 | 0,5 |
| small | Match: aba Estatísticas | MatchDetailsTab | 3 | 1 | 0,5 | 0,5 |
| medium | Season: aba Partidas | TableTab | 3 | 1 | 0,4 | 0,4 |
| medium | Season: aba Estatísticas | CuriositiesTab | 3 | 1 | 0,4 | 0,4 |
| small | Season: aba Partidas | TableTab | 3 | 1 | 0,4 | 0,4 |
| small | Season: aba Estatísticas | CuriositiesTab | 3 | 1 | 0,4 | 0,6 |
| small | Match: aba Formações | MatchStatsTab | 3 | 1 | 0,4 | 0,4 |
| medium | Season: aba Partidas | AllMatchesTab | 3 | 1 | 0,3 | 0,4 |
| medium | Season: aba Geral | AllMatchesTab | 3 | 1 | 0,3 | 0,4 |
| medium | Season: aba Estatísticas | AllMatchesTab | 3 | 1 | 0,3 | 0,3 |
| medium | Season: aba Geral | TableTab | 3 | 1 | 0,3 | 0,5 |
| medium | Match: aba Formações | LineupTab | 3 | 2 | 0,3 | 0,3 |
| medium | Match: aba Formações | MatchStatsTab | 3 | 1 | 0,3 | 0,3 |
| medium | Match: aba Estatísticas | LineupTab | 3 | 1 | 0,3 | 0,4 |
| medium | Match: aba Estatísticas | MatchStatsTab | 3 | 1 | 0,3 | 0,3 |
| small | Season: aba Partidas | AllMatchesTab | 3 | 1 | 0,3 | 0,3 |
| small | Match: aba Formações | LineupTab | 3 | 2 | 0,3 | 0,5 |
| small | Match: aba Estatísticas | LineupTab | 3 | 1 | 0,3 | 0,3 |
| small | Match: aba Estatísticas | MatchStatsTab | 3 | 1 | 0,3 | 0,3 |
| medium | Season: aba Classificação | AllMatchesTab | 3 | 1 | 0,2 | 0,3 |
| medium | Season: aba Classificação | TableTab | 3 | 1 | 0,2 | 0,3 |
| medium | Season: aba Estatísticas | TableTab | 3 | 1 | 0,2 | 0,3 |
| small | Season: aba Classificação | AllMatchesTab | 3 | 1 | 0,2 | 0,3 |
| small | Season: aba Geral | TableTab | 3 | 1 | 0,2 | 0,3 |
| small | Season: aba Classificação | TableTab | 3 | 1 | 0,2 | 0,3 |
| small | Season: aba Estatísticas | AllMatchesTab | 3 | 1 | 0,2 | 0,2 |
| small | Season: aba Estatísticas | TableTab | 3 | 1 | 0,2 | 0,2 |
| small | Season: aba Geral | AllMatchesTab | 3 | 1 | 0,2 | 0,3 |

### Atualização sem mudar o conteúdo esportivo

| Perfil | Atualização | Componente | Callbacks | Render acumulado ms | Máximo ms |
|---|---|---|---|---|---|
| medium | updatedAt: Season com abas ocultas | SquadTab | 2 | 6 | 3,4 |
| medium | updatedAt: Season com abas ocultas | AllMatchesTab | 2 | 0,8 | 0,5 |
| medium | updatedAt: Season com abas ocultas | TableTab | 3 | 1 | 0,4 |
| medium | updatedAt: Season com abas ocultas | PlayerStatsList | 3 | 5,6 | 2 |
| medium | updatedAt: Season com abas ocultas | StatsTab_Club | 3 | 5,9 | 2,2 |
| medium | updatedAt: Season com abas ocultas | BestPlayersTab | 2 | 4 | 2,6 |
| medium | updatedAt: Season com abas ocultas | GeneralTab | 3 | 4,2 | 2,5 |
| medium | updatedAt: Season com abas ocultas | CuriositiesTab | 2 | 2,3 | 1,7 |
| medium | updatedAt: Season com abas ocultas | SectionView | 4 | 27,3 | 14 |
| small | updatedAt: Season com abas ocultas | SquadTab | 2 | 3,3 | 1,9 |
| small | updatedAt: Season com abas ocultas | AllMatchesTab | 2 | 0,5 | 0,3 |
| small | updatedAt: Season com abas ocultas | TableTab | 3 | 1 | 0,4 |
| small | updatedAt: Season com abas ocultas | PlayerStatsList | 3 | 4,8 | 1,7 |
| small | updatedAt: Season com abas ocultas | StatsTab_Club | 3 | 5,2 | 1,9 |
| small | updatedAt: Season com abas ocultas | BestPlayersTab | 2 | 2,7 | 1,6 |
| small | updatedAt: Season com abas ocultas | GeneralTab | 3 | 2,3 | 1 |
| small | updatedAt: Season com abas ocultas | CuriositiesTab | 2 | 1,3 | 0,9 |
| small | updatedAt: Season com abas ocultas | SectionView | 4 | 20 | 9,2 |

### Abas montadas antes da visita

| Perfil | Fluxo | Componentes montados na janela | Slides no DOM | Slides inativos | Nós DOM |
|---|---|---|---|---|---|
| small | Career → Season | SquadTab, AllMatchesTab, TableTab, PlayerStatsList, StatsTab_Club, BestPlayersTab, GeneralTab, CuriositiesTab, SectionView | 7 | 6 | 2.115 |
| small | Season → Match | Match, MatchDetailsTab, LineupTab, MatchStatsTab | 3 | 2 | 333 |
| small | Season → Academy | AcademyProvider | 0 | 0 | 189 |
| medium | Career → Season | SquadTab, AllMatchesTab, TableTab, PlayerStatsList, StatsTab_Club, BestPlayersTab, GeneralTab, CuriositiesTab, SectionView | 7 | 6 | 2.241 |
| medium | Season → Match | Match, MatchDetailsTab, LineupTab, MatchStatsTab | 3 | 2 | 333 |
| medium | Season → Academy | AcademyProvider | 0 | 0 | 189 |
| large | Career → Season | — | — | — | — |
| large | Season → Match | — | — | — | — |
| large | Season → Academy | — | — | — | — |

SectionView e Match montam as abas do Swiper de uma vez. A tabela inicia uma leitura enquanto “Elenco” está ativa; as demais abas calculam/renderizam seus conteúdos. Na Academy, o dashboard apresenta vários cards simultaneamente e o modo de detalhe é condicional, não um Swiper de todas as telas. Custos por componente e mudanças de aba estão medidos acima. Re-render, isoladamente, não prova desperdício; a atualização diagnóstica de `updatedAt` fornece um caso de conteúdo esportivo inalterado. Não foi feito um contrafactual de montagem sob demanda nem uma prova geral de irrelevância de todas as mudanças de props.

## Bundle

| Item | Bytes | gzip bytes |
|---|---|---|
| assets/index-DmePlK1f.js | 5.256.697 | 1.678.953 |
| index-C3488Qqm.css | 143.231 | 28.104 |

1 chunk JS; 0 imports dinâmicos no grafo emitido. O arquivo tem **5.256.697 bytes**; o valor 5.210,41 kB impresso pelo Vite não era uma contagem física exata de bytes UTF-8. O gzip confirma 1.678.953 bytes. Não houve splitting ou compressão de assets.

| Módulo | renderedLength do Rollup (pré-minificação final) |
|---|---|
| node_modules/react-world-flags/dist/react-world-flags.js | 3.692.981 |
| node_modules/@firebase/firestore/dist/index.esm.js | 622.027 |
| node_modules/firebase/node_modules/@firebase/auth/dist/esm/index-9ccb475d.js | 276.054 |
| node_modules/@remix-run/router/dist/router.js | 161.828 |
| node_modules/react-dom/cjs/react-dom.production.min.js | 132.840 |
| node_modules/swiper/shared/swiper-core.mjs | 131.630 |
| node_modules/@dnd-kit/core/dist/core.esm.js | 93.162 |
| node_modules/@firebase/webchannel-wrapper/dist/webchannel-blob/esm/webchannel_blob_es2018.js | 41.979 |
| node_modules/@firebase/util/dist/index.esm.js | 34.037 |
| node_modules/@firebase/app/dist/esm/index.esm.js | 33.212 |
| src/pages/Tutorial/constants/TutorialContent/index.tsx | 30.494 |
| node_modules/react-icons/fa/index.mjs | 27.681 |

react-world-flags: 3.693.017 em renderedLength, 54,3% da soma nessa mesma unidade. Foram encontrados 243 data URIs de bandeiras; 3.163.670 bytes desses payloads permanecem literalmente no JS final (60,2% do arquivo). Esse último número é um piso atribuível aos payloads; não inclui toda a lógica da biblioteca. Não confundir renderedLength com bytes minificados ou contribuição gzip independente.

## Assets

Maiores arquivos originais de troféus; inventário não implica que todos foram baixados nas jornadas.

| Arquivo | Bytes originais | Dimensões |
|---|---|---|
| public/images/trophies/germany/bundesliga.png | 3.219.988 | 1254 × 1254 |
| public/images/trophies/germany/bundesliga2.png | 3.129.855 | 1254 × 1254 |
| public/images/trophies/england/communityShield.png | 2.850.602 | 1536 × 1024 |
| public/images/trophies/scotland/scottishPremiership.png | 2.830.441 | 1024 × 1536 |
| public/images/trophies/england/premierLeague.png | 2.654.233 | 1024 × 1536 |
| public/images/trophies/england/bsm.png | 2.530.565 | 1024 × 1536 |
| public/images/trophies/germany/pokal.png | 2.518.754 | 1024 × 1536 |
| public/images/trophies/england/leagueOne.png | 2.513.400 | 1024 × 1536 |
| public/images/trophies/netherlands/eredivisie.png | 2.395.341 | 1263 × 1246 |
| public/images/trophies/portugal/ligaPortugal.png | 2.297.941 | 1024 × 1536 |
| public/images/trophies/uefa/europaLeague.png | 2.286.183 | 1024 × 1536 |
| public/images/trophies/brasil/copaDoBrasil.png | 2.256.845 | 1212 × 1298 |

A fixture reutiliza /Logo.png como escudo/logo de liga: 1.354.266 bytes, 1024 × 1024 px. Isso reduz a diversidade de downloads em comparação com escudos reais distintos. O custo de todas as imagens do inventário não é somado ao carregamento de uma tela que não as requisitou.
| Perfil | Tela (cold, repetição 1) | Recursos de imagem concluídos | Bytes transferidos | Elementos img no DOM |
|---|---|---|---|---|
| large | Boot | 0 | 0 | — |
| large | Entrada → Login | 0 | 0 | 0 |
| large | Login → CareersPage | 1 | 0 | 0 |
| medium | Boot | 0 | 0 | — |
| medium | Entrada → Login | 0 | 0 | 0 |
| medium | Login → CareersPage | 1 | 0 | 5 |
| medium | CareersPage → Career | 0 | 0 | 0 |
| medium | Career → Season | 1 | 0 | 5 |
| medium | Season: aba Partidas | 0 | 0 | 5 |
| medium | Season: aba Classificação | 0 | 0 | 5 |
| medium | Season: aba Estatísticas | 0 | 0 | 5 |
| medium | Season: aba Geral | 0 | 0 | 5 |
| medium | Season → Match | 1 | 0 | 3 |
| medium | Match: aba Formações | 0 | 0 | 3 |
| medium | Match: aba Estatísticas | 0 | 0 | 3 |
| medium | Season → Player | 1 | 0 | 152 |
| medium | Career → Geral | 1 | 0 | 305 |
| medium | Geral → ComparePlayers | 0 | 0 | 0 |
| medium | CareersPage → CareerGroup | 1 | 0 | 3 |
| medium | Season → Academy | 0 | 0 | 0 |
| medium | Academy: abrir jogadores | 0 | 0 | 0 |
| medium | CareersPage: troféus | 2 | 3.212.549 | 7 |
| small | Boot | 0 | 0 | — |
| small | Entrada → Login | 0 | 0 | 0 |
| small | Login → CareersPage | 1 | 0 | 5 |
| small | CareersPage → Career | 0 | 0 | 0 |
| small | Career → Season | 1 | 0 | 5 |
| small | Season: aba Partidas | 0 | 0 | 5 |
| small | Season: aba Classificação | 0 | 0 | 5 |
| small | Season: aba Estatísticas | 0 | 0 | 5 |
| small | Season: aba Geral | 0 | 0 | 5 |
| small | Season → Match | 1 | 0 | 3 |
| small | Match: aba Formações | 0 | 0 | 3 |
| small | Match: aba Estatísticas | 0 | 0 | 3 |
| small | Season → Player | 1 | 0 | 62 |
| small | Career → Geral | 1 | 0 | 65 |
| small | Geral → ComparePlayers | 0 | 0 | 0 |
| small | CareersPage → CareerGroup | 1 | 0 | 3 |
| small | Season → Academy | 0 | 0 | 0 |
| small | Academy: abrir jogadores | 0 | 0 | 0 |
| small | CareersPage: troféus | 2 | 3.212.549 | 7 |

Transferências observadas de troféus por perfil, primeira repetição. Zero de transferência indica cache local; não é tamanho original zero.

| Perfil | Fluxo | Condição | Arquivo | Transferência | Corpo | Resource Timing ms | Natural | Exibição px |
|---|---|---|---|---|---|---|---|---|
| medium | CareersPage: troféus | cold-session | /images/trophies/brasil/copaDoBrasil.png | 2.257.145 | 2.256.845 | 19,1 | 1212 × 1298 | 100 × 100 |
| medium | CareersPage: troféus | cold-session | /images/trophies/brasil/brasileirao.png | 955.404 | 955.104 | 13,7 | 1254 × 1254 | 100 × 100 |
| medium | CareersPage: troféus | warm-session | /images/trophies/brasil/brasileirao.png | 0 | 955.104 | 2,8 | 1254 × 1254 | 100 × 100 |
| medium | CareersPage: troféus | warm-session | /images/trophies/brasil/copaDoBrasil.png | 0 | 2.256.845 | 4,5 | 1212 × 1298 | 100 × 100 |
| small | CareersPage: troféus | cold-session | /images/trophies/brasil/copaDoBrasil.png | 2.257.145 | 2.256.845 | 17,4 | 1212 × 1298 | 100 × 100 |
| small | CareersPage: troféus | cold-session | /images/trophies/brasil/brasileirao.png | 955.404 | 955.104 | 12,5 | 1254 × 1254 | 100 × 100 |
| small | CareersPage: troféus | warm-session | /images/trophies/brasil/copaDoBrasil.png | 0 | 2.256.845 | 4,2 | 1212 × 1298 | 100 × 100 |
| small | CareersPage: troféus | warm-session | /images/trophies/brasil/brasileirao.png | 0 | 955.104 | 2,5 | 1254 × 1254 | 100 × 100 |

Resource Timing mede a duração do recurso, não o atraso causal que ele acrescentou ao conteúdo utilizável. Imagens repetidas no DOM podem reutilizar uma única transferência. O JSON conserva contagens e dimensões por tela, inclusive assets locais que não são troféus.

## Main thread e long tasks

Maiores tarefas da série de navegação normal; profiling excluído.

| Fluxo | Perfil | Condição | Repetição | Início relativo ms | Duração ms |
|---|---|---|---|---|---|
| CareersPage → Career | medium | warm-session | 1 | 7.528,4 | 7.083 |
| Career → Season | medium | warm-session | 1 | 11.316 | 7.072 |
| Login → CareersPage | medium | warm-session | 1 | 7.661,1 | 6.980 |
| Career → Season | medium | cold-session | 5 | 8.133,3 | 4.707 |
| Login → CareersPage | medium | warm-session | 4 | 7.255,7 | 4.168 |
| CareersPage → Career | medium | cold-session | 2 | 7.265,5 | 4.150 |
| CareersPage → Career | medium | warm-session | 3 | 7.415 | 4.086 |
| Login → CareersPage | medium | warm-session | 5 | 7.212,8 | 4.065 |
| Career → Season | medium | cold-session | 3 | 8.008,2 | 4.058 |
| CareersPage → Career | medium | cold-session | 5 | 7.227,6 | 4.051 |
| Career → Season | medium | warm-session | 4 | 8.145,2 | 4.046 |
| CareersPage → Career | medium | warm-session | 5 | 7.217,5 | 4.025 |
| CareersPage → Career | medium | warm-session | 4 | 7.290,5 | 4.015 |
| CareersPage → Career | medium | cold-session | 1 | 8.020,1 | 3.991 |
| Career → Season | medium | warm-session | 2 | 8.810,3 | 3.976 |

Trace adicional de atribuição, uma execução do perfil medium (login + Geral + Partidas). Categorias podem ser aninhadas; não somar como CPU exclusiva.

| Evento Chromium | Ocorrências | Tempo acumulado ms | Maior ocorrência ms |
|---|---|---|---|
| RunTask | 9.865 | 8.493,7 | 3.817,3 |
| RunMicrotasks | 1.240 | 6.733,1 | 3.815,2 |
| v8.callFunction | 2.404 | 643,1 | 180,7 |
| FunctionCall | 2.398 | 435,2 | 176,3 |
| UpdateLayoutTree | 1.176 | 235,6 | 12,8 |
| TimerFire | 847 | 167,2 | 7,7 |
| Paint | 1.738 | 154,3 | 8,4 |
| Layout | 25 | 130,2 | 80,5 |
| v8.evaluateModule | 2 | 116,9 | 106,1 |
| PrePaint | 1.019 | 115,2 | 6,1 |
| V8.CompileCode | 3.194 | 109,7 | 12,1 |
| Commit | 927 | 97,5 | 0,5 |
| EventDispatch | 507 | 78,3 | 16,1 |
| MinorGC | 38 | 70,9 | 9 |
| V8.GCScavenger | 38 | 69,2 | 8,9 |
| V8.GC_SCAVENGER | 38 | 68,6 | 8,9 |
| V8.ParseProgram | 91 | 64,9 | 57,2 |
| V8.ParseFunction | 3.147 | 53,8 | 11 |
| Decode Image | 3 | 46,4 | 16,1 |

Decode Image é o custo observado nessa thread/captura; não foi associado individualmente a cada troféu nem inclui necessariamente todo decode feito em threads auxiliares. RunMicrotasks inclui trabalho de SDK/aplicação/instrumentação; não há atribuição exclusiva por função nesse trace.

Não se atribui toda long task a React ou à rede. Parsing/execução do JS, layout/paint e decodificação só são separados quando o trace expõe a categoria. As fronteiras React atribuem render às listas/abas; elas não isolam todo cálculo fora do render. Os benchmarks de CPU anteriores não foram reexecutados ou substituídos. Não foi localizado artefato separado desses benchmarks no checkout; os relatórios anteriores permanecem intactos.

## Web Vitals (laboratório)

| Perfil | Condição | Métrica | Documentos com valor | Mediana | Máximo |
|---|---|---|---|---|---|
| small | cold-session | FCP | 15 | 96 | 384 |
| small | cold-session | LCP | 15 | 3.604 | 4.920 |
| small | cold-session | CLS | 20 | 0 | 0 |
| small | cold-session | INP | 25 | 32 | 64 |
| small | warm-session | FCP | 15 | 76 | 112 |
| small | warm-session | LCP | 10 | 1.734 | 4.588 |
| small | warm-session | CLS | 20 | 0 | 0 |
| small | warm-session | INP | 25 | 32 | 48 |
| medium | cold-session | FCP | 15 | 96 | 716 |
| medium | cold-session | LCP | 15 | 11.428 | 12.200 |
| medium | cold-session | CLS | 17 | 0 | 0 |
| medium | cold-session | INP | 25 | 32 | 64 |
| medium | warm-session | FCP | 15 | 84 | 88 |
| medium | warm-session | LCP | 10 | 5.664 | 14.832 |
| medium | warm-session | CLS | 16 | 0 | 0 |
| medium | warm-session | INP | 26 | 32 | 48 |
| large | cold-session | FCP | 5 | 340 | 376 |
| large | cold-session | LCP | 5 | 340 | 376 |
| large | cold-session | CLS | 5 | 0 | 0 |
| large | cold-session | INP | 5 | 0 | 16 |
| large | warm-session | FCP | 5 | 68 | 76 |
| large | warm-session | LCP | 5 | 68 | 76 |
| large | warm-session | CLS | 5 | 0 | 0 |
| large | warm-session | INP | 5 | 8 | 8 |

FCP/LCP/INP em ms; CLS sem unidade. São valores observados por documento na sequência automatizada, não distribuição de usuários nem certificação de Core Web Vitals. Documentos SPA compartilham a mesma janela; zero valores capturados é mostrado como ausência, nunca como aprovação. INP depende das interações feitas e LCP encerra sua observação com interação; comparar somente sequências equivalentes.

No grande, os vitals capturados no documento inicial descrevem principalmente a entrada/Welcome e as interações alcançadas antes do corte. LCP baixo nessa tela não significa CareersPage utilizável: o login continuou censurado. Valores de laboratório, inclusive CLS/INP zero, não aprovam a experiência de produção. Eventos finais ocorridos fora das janelas registradas podem não estar no consolidado.

## Performance percebida, reload e timers

| Perfil (cold) | Fluxo | Documentos novos | Bundles requisitados | Bytes JS transferidos | Callbacks Auth modular | Queries | Utilizável ms |
|---|---|---|---|---|---|---|---|
| small | CareersPage → Career | 1 | 1 | 0 | 1 | 67 | 4.057,9 |
| small | Career → Season | 1 | 1 | 0 | 1 | 68 | 4.897,7 |
| small | Career → Geral | 0 | 0 | 0 | 1 | 68 | 3.440,4 |
| small | Season → Match | 0 | 0 | 0 | 1 | 68 | 3.470,7 |
| small | Geral → ComparePlayers | 0 | 0 | 0 | 1 | 67 | 3.303,1 |
| medium | CareersPage → Career | 1 | 1 | 0 | 1 | 313 | 11.984,8 |
| medium | Career → Season | 1 | 1 | 0 | 1 | 314 | 13.080,7 |
| medium | Career → Geral | 0 | 0 | 0 | 1 | 314 | 9.785,4 |
| medium | Season → Match | 0 | 0 | 0 | 1 | 314 | 10.015,9 |
| medium | Geral → ComparePlayers | 0 | 0 | 0 | 1 | 313 | 9.296,4 |
| large | CareersPage → Career | — | — | — | — | — | — |
| large | Career → Season | — | — | — | — | — | — |
| large | Career → Geral | — | — | — | — | — | — |
| large | Season → Match | — | — | — | — | — | — |
| large | Geral → ComparePlayers | — | — | — | — | — | — |

As recargas atuais reexecutam o bundle e reinicializam Auth/listeners mesmo quando os bytes vêm do cache. Não foi implementada uma rota alternativa para um teste A/B; a tabela compara trajetos que já existem e têm trabalhos diferentes. Portanto a diferença bruta não é toda causada pelo reload.

| Perfil | Comparação: primeiro texto ms | Comparação utilizável ms | Timer | Atraso real mediano ms | Timers disparados |
|---|---|---|---|---|---|
| small | 1.524,1 | 3.303,1 | 500 | 509,9 | 5 |
| small | 1.524,1 | 3.303,1 | 1.500 | 1.505,2 | 5 |
| medium | 1.709,3 | 9.296,4 | 500 | — | 0 |
| medium | 1.709,3 | 9.296,4 | 1.500 | 1.684,8 | 5 |
| large | — | — | 500 | — | 0 |
| large | — | — | 1.500 | — | 0 |

Coleta diagnóstica adicional espera os dados e mais 700 ms, para observar o timer de 500 ms mesmo quando fora do caminho crítico. Estes valores não integram o baseline de navegação.

| Perfil | Repetição | Timer ms | Agendado após início ms | Disparado após início ms | Atraso real ms |
|---|---|---|---|---|---|
| medium | 1 | 1.500 | 45,7 | 2.119,2 | 2.073,5 |
| medium | 1 | 500 | 12.699,8 | 13.200,9 | 501,1 |
| medium | 2 | 1.500 | 41,7 | 2.085 | 2.043,3 |
| medium | 2 | 500 | 12.392,3 | 12.899,5 | 507,2 |
| medium | 3 | 1.500 | 45 | 1.883,5 | 1.838,5 |
| medium | 3 | 500 | 11.571,1 | 12.083,6 | 512,5 |
| Perfil | Seleção | Repetição | Utilizável ms | Consultas | Render ComparePlayers ms |
|---|---|---|---|---|---|
| medium | Compare: selecionar jogador 1 | 1 | 86 | 0 | 2,2 |
| medium | Compare: selecionar jogador 2 | 1 | 71,1 | 0 | 2,6 |
| medium | Compare: selecionar jogador 1 | 2 | 83 | 0 | 2 |
| medium | Compare: selecionar jogador 2 | 2 | 71,9 | 0 | 2,8 |
| medium | Compare: selecionar jogador 1 | 3 | 80,9 | 0 | 2,5 |
| medium | Compare: selecionar jogador 2 | 3 | 86,9 | 0 | 3,6 |

O timer de 1500 ms pode liberar uma interface ainda sem os jogadores carregados. O de 500 ms é agendado quando chegam carreiras; se o fallback já liberou o loading, ele não acrescenta automaticamente 500 ms ao caminho crítico. As amostras permitem distinguir agendamento, disparo e disponibilidade dos dados. Não se somam 500 + 1500 como atraso obrigatório.

### useMatchActions: leitura antes de loading

| Perfil | Repetição | Clique → estado saving ms | Clique → spinner ms | Spinner → utilizável ms | Leituras antes de saving | Consultas | Docs | Retorno utilizável ms | Última leitura ms |
|---|---|---|---|---|---|---|---|---|---|
| medium | 1 | 11,9 | 14,9 | 2.535,8 | 1 | 686 | 8.148 | 2.550,7 | 20.560,3 |
| medium | 2 | 11,9 | 14,9 | 2.451,7 | 1 | 686 | 8.148 | 2.466,6 | 21.108,9 |
| medium | 3 | 11,2 | 14,3 | 2.870 | 1 | 686 | 8.148 | 2.884,3 | 20.523,8 |

As 686 leituras por salvamento são o trabalho acumulado na janela inteira: a interface volta em aproximadamente 2,5 s, mas leituras de atualização continuam até aproximadamente 20–21 s. O término do spinner não equivale ao fim de todo o trabalho de dados.

Série principal limitada às três primeiras amostras válidas. Quando a última orientação chegou, as amostras 4 e 5 já estavam persistidas; foram conservadas como suplementares no JSON, sem executar novos salvamentos e sem incluí-las nas medianas principais.

A ação usa adversário novo para exercitar a busca de histórico anterior a `setIsSaving(true)`. A escrita ocorre somente no emulador e é removida entre repetições. O marcador de ativação do estado e o spinner observável ficam nos eventos brutos. O spinner substitui o formulário inteiro. A leitura antes de saving foi observada, mas o intervalo até o feedback foi pequeno no emulador local; este cenário não comprova um atraso perceptível sob rede real. Não foi adicionada latência artificial.

## Gargalos e próxima etapa

| Prioridade | Gargalo e evidência | Impacto observado | Hipótese para a próxima etapa | Risco da mudança |
|---|---|---|---|---|
| P0 | Hidratação global + N+1: 60 partidas → 60 buscas iniciadas; 300 partidas → 300 buscas iniciadas; 900 partidas → 900 buscas iniciadas | A espera por uma página depende do histórico inteiro; grande censurado no limite local | Carregar o escopo necessário e planejar agregação/busca das estatísticas | Dados legados embutidos, invalidação e consistência dos totais |
| P0 | Listeners (medium): 1 → 4; updatedAt provoca 312 → 1248 operações | Trabalho de hidratação cresce após sair e voltar pela SPA | Corrigir o vínculo do cleanup e limitar o escopo do refetch | Corridas de autenticação, callbacks em andamento e assinantes compartilhados |
| P1 | Reload real em Career e Season: documento, bundle e Auth reiniciados; tabelas acima | Cache de bytes não preserva o estado de memória da aplicação | Avaliar navegação interna depois de estabilizar a camada de dados | Estado da rota, seleção de temporada e dados obsoletos |
| P1 | Bundle único 5256697 bytes; payloads de bandeiras 3163670 bytes | Carga inicial e reexecução em recargas; sem imports dinâmicos | Avaliar divisão por rota e distribuição seletiva de bandeiras | Rotas profundas, loading e compatibilidade visual |
| P1 | Player (medium): 624 getDoc/getDocs + 2 inscrições; 600 buscas de stats; 7506 documentos entregues | Duas instâncias de useCareers reidratam o mesmo histórico | Compartilhar uma fonte de dados entre useSeasonView e usePlayerPageData | Ciclo de vida, estado de loading, rotas de grupo e jogador |
| P1 | SectionView monta sete slides; Classificação lê a tabela antes da visita; grupo percorre caminhos duas vezes | Trabalho inicial fora da aba ativa; duplicação no grupo | Avaliar montagem sob demanda e compartilhamento de consultas | Estado entre abas e equivalência funcional dos dados |
| P2 | Timers de 1.500/500 ms e primeiro texto antes de dados; medições separadas acima | Conteúdo parcial parece pronto; relógio artificial difere do término das leituras | Definir loading pelo estado real dos dados | Evitar flashes e perda de feedback |
| P2 | Salvar (medium): mediana 11,9 ms até saving e 14,9 ms até spinner | Busca anterior ao feedback; spinner substitui o formulário | Avaliar feedback imediato preservando contexto | Duplo envio, validação e tratamento de erro |
| P2 | Troféus em PNG com dimensões e bytes muito acima da exibição; inventário e transferências acima | Transferência inicial e memória de imagem; cache reduz repetições | Avaliar variantes dimensionadas e formatos adequados | Qualidade/transparência e identidade dos troféus |

Os três primeiros focos são N+1/hidratação global (P0), listeners (P0) e reinicialização com nova hidratação (P1). O reload fica em P1 porque sua parcela causal isolada não foi medida por um teste A/B. P0/P1/P2 expressam prioridade de performance, sem substituir a prioridade dos bugs de integridade das etapas anteriores. Nenhuma hipótese foi implementada. PlayersGroupService não lê playerStats; sua resposta mais rápida não prova equivalência funcional com a hidratação completa. A abertura direta acrescenta a hidratação de ServiceCareerGroup, conforme a tabela de alvos preparados. Não houve validação semântica nova de todos os totais do grupo.


## Validações e integridade

| Comando | Código de saída | Resultado | Conclusão UTC |
|---|---|---|---|
| typecheck | 0 | verificação concluída | 2026-09-23T14:09:39.795Z |
| typecheck:tests | 0 | verificação concluída | 2026-09-23T14:09:45.084Z |
| lint | 0 | verificação concluída | 2026-09-23T14:10:14.078Z |
| test:run | 0 | Test Files  11 passed (11); Tests  116 passed / 11 todo (127) | 2026-09-23T14:10:59.660Z |
| test:integration | 0 | Test Files  9 passed (9); Tests  67 passed / 15 todo (82) | 2026-09-23T14:12:27.494Z |
| test:coverage:all | 0 | Test Files  20 passed (20); Tests  183 passed / 26 todo (209) | 2026-09-23T14:13:23.868Z |
| build | 0 | verificação concluída | 2026-09-23T14:13:55.672Z |
| syntax-action.mjs | 0 | verificação concluída | 2026-09-23T14:13:55.755Z |
| syntax-advanced.mjs | 0 | verificação concluída | 2026-09-23T14:13:55.840Z |
| syntax-browser-init.js | 0 | verificação concluída | 2026-09-23T14:13:55.921Z |
| syntax-browser.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.000Z |
| syntax-build.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.080Z |
| syntax-compare.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.159Z |
| syntax-firebase-client.js | 0 | verificação concluída | 2026-09-23T14:13:56.236Z |
| syntax-inspect.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.317Z |
| syntax-journeys.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.399Z |
| syntax-large-targets.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.482Z |
| syntax-measure.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.571Z |
| syntax-network-guard.cjs | 0 | verificação concluída | 2026-09-23T14:13:56.651Z |
| syntax-pilot.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.741Z |
| syntax-report.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.846Z |
| syntax-reseed.mjs | 0 | verificação concluída | 2026-09-23T14:13:56.930Z |
| syntax-run-all.mjs | 0 | verificação concluída | 2026-09-23T14:13:57.017Z |
| syntax-run.mjs | 0 | verificação concluída | 2026-09-23T14:13:57.097Z |
| syntax-sdk-adapter.js | 0 | verificação concluída | 2026-09-23T14:13:57.183Z |
| syntax-seed.mjs | 0 | verificação concluída | 2026-09-23T14:13:57.266Z |
| syntax-service.mjs | 0 | verificação concluída | 2026-09-23T14:13:57.368Z |
| syntax-summarize.mjs | 0 | verificação concluída | 2026-09-23T14:13:57.445Z |
| syntax-trace.mjs | 0 | verificação concluída | 2026-09-23T14:13:57.544Z |
| syntax-validate.mjs | 0 | verificação concluída | 2026-09-23T14:13:57.644Z |
| syntax-verify-source.mjs | 0 | verificação concluída | 2026-09-23T14:13:57.735Z |
| source-integrity | 0 | verificação concluída | 2026-09-23T14:13:58.573Z |
| git-diff-check | 0 | verificação concluída | 2026-09-23T14:13:58.806Z |

Coverage conjunta: linhas 5.82%; statements 5.82%; funções 8.76%; branches 38.04%. [Resultados e contadores](validation.json).

Build de produção recalculado na validação final:

| Arquivo | Bytes físicos | gzip bytes |
|---|---|---|
| index-C3488Qqm.css | 143.231 | 28.104 |
| index-DmePlK1f.js | 5.256.697 | 1.678.953 |

SHA-256: 938 arquivos de src comparados, 0 alterados e 0 adicionados na etapa 5. [Evidência de integridade](source-integrity.json). O checkout contém mudanças anteriores do usuário/etapas anteriores; não foram desfeitas e não são atribuídas à etapa 5.

Arquivos exclusivos da medição:

- [tests/performance/README.md](../../tests/performance/README.md)
- [tests/performance/action.mjs](../../tests/performance/action.mjs)
- [tests/performance/advanced.mjs](../../tests/performance/advanced.mjs)
- [tests/performance/browser-init.js](../../tests/performance/browser-init.js)
- [tests/performance/browser.mjs](../../tests/performance/browser.mjs)
- [tests/performance/build.mjs](../../tests/performance/build.mjs)
- [tests/performance/compare.mjs](../../tests/performance/compare.mjs)
- [tests/performance/firebase-client.js](../../tests/performance/firebase-client.js)
- [tests/performance/inspect.mjs](../../tests/performance/inspect.mjs)
- [tests/performance/journeys.mjs](../../tests/performance/journeys.mjs)
- [tests/performance/large-targets.mjs](../../tests/performance/large-targets.mjs)
- [tests/performance/measure.mjs](../../tests/performance/measure.mjs)
- [tests/performance/network-guard.cjs](../../tests/performance/network-guard.cjs)
- [tests/performance/pilot.mjs](../../tests/performance/pilot.mjs)
- [tests/performance/report.mjs](../../tests/performance/report.mjs)
- [tests/performance/reseed.mjs](../../tests/performance/reseed.mjs)
- [tests/performance/run-all.mjs](../../tests/performance/run-all.mjs)
- [tests/performance/run.mjs](../../tests/performance/run.mjs)
- [tests/performance/sdk-adapter.js](../../tests/performance/sdk-adapter.js)
- [tests/performance/seed.mjs](../../tests/performance/seed.mjs)
- [tests/performance/service.mjs](../../tests/performance/service.mjs)
- [tests/performance/summarize.mjs](../../tests/performance/summarize.mjs)
- [tests/performance/trace.mjs](../../tests/performance/trace.mjs)
- [tests/performance/validate.mjs](../../tests/performance/validate.mjs)
- [tests/performance/verify-source.mjs](../../tests/performance/verify-source.mjs)
- tests/performance-tools/package.json e package-lock.json: dependências isoladas.
- docs/performance: relatório, metodologia, measurements.json, validation.json e source-integrity.json.
- docs/testing/implementation-report.md: apenas vínculo e resumo da etapa 5 acrescentados.

Eventos brutos, trace comprimido, builds isolados e logs ficam em .test-tools/performance, ignorado pelo Git. O inventário consolidado permite inspecionar as medições sem executar novamente o navegador; a reprodução integral usa os comandos do README.


## Cobertura do pedido

As 28 seções foram rastreadas: escopo/isolamento (1–2), fixtures (3), jornadas e marcos (4–6), Firebase/N+1/duplicações (7–9), listeners (10), Profiler/abas/main thread (11–13), vitals (14), bundle/bandeiras/assets (15–17), percepção/reload/timers/salvamento (18–21), preservação de benchmarks e produção/bugs (22–24), relatório/reprodução/validações/resumo (25–28). Limitações técnicas são declaradas na seção correspondente; métricas não observáveis não receberam valores inventados.

Maior observação pontual concluída, considerando também diagnósticos separados: **Grande preparado: Group via URL**, large, 26.905,2 ms. Isso não substitui o ranking por mediana da série normal nem cria um percentil para n = 1.

## Estado da evidência

MEDIDO significa evento/contador efetivamente capturado. CONFIRMADO PELO CÓDIGO identifica a explicação encontrada no código, sem contrafactual implementado. CENSURADO significa que o limite encerrou a observação sem duração final. NÃO MEDIDO significa ausência de observação válida; não equivale a zero nem a aprovação.

| Seções do pedido | Estado e referência |
|---|---|
| 1–2: princípio e ambiente | MEDIDO: builds isolados, navegador real e emuladores; nenhuma alteração de produção |
| 3: perfis | MEDIDO: manifesto determinístico, volumes exatos e hashes |
| 4–6: jornadas e distribuições | MEDIDO pequeno/médio; CENSURADO login grande; demais origens grandes NÃO MEDIDAS, salvo alvos preparados explicitamente separados |
| 7–9: Firebase, N+1, duplicações | MEDIDO: início/fim por categoria, HTTP separado, documentos e caminhos; explicação CONFIRMADA PELO CÓDIGO |
| 10: listeners | MEDIDO em ciclos SPA dos perfis alcançáveis; cleanup CONFIRMADO PELO CÓDIGO |
| 11–12: React e abas | MEDIDO com React Profiler separado; grande não repetido; contrafactual de montagem sob demanda NÃO MEDIDO |
| 13: main thread | MEDIDO: long tasks e trace adicional; atribuição causal exclusiva por função NÃO MEDIDA |
| 14: vitals | MEDIDO apenas nos documentos com valor; campo ausente é NÃO MEDIDO; métricas de usuários reais NÃO MEDIDAS |
| 15–17: bundle, flags e assets | MEDIDO: bytes, gzip, grafo, payloads, dimensões e recursos; economia após otimização NÃO MEDIDA |
| 18–21: percepção, reload, timers, saving | MEDIDO: marcos DOM, novo documento, timers e feedback; benefício de correção hipotética NÃO MEDIDO |
| 22: benchmarks anteriores | Preservados os arquivos existentes; artefato específico de benchmark de CPU não localizado neste checkout; nenhuma série anterior recriada |
| 23–24: produção e bugs | Verificação SHA-256 e diff; nenhuma correção/otimização nesta etapa |
| 25–28: entrega, reprodução e validação | Relatório, metodologia, ferramentas, resultados persistidos e validações acima |

Erros de página/diálogos capturados: nenhum nas janelas consolidadas. Bloqueios esperados de recursos externos não são tratados como acesso bem-sucedido.
