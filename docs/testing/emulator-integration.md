# Integração local — etapa 4

Os serviços de produção são executados sem refatoração. Persistência, queries, snapshots, Auth e validação de documentos passam pelo SDK Firebase instalado na aplicação e pelos emuladores locais. O adaptador `firestoreBoundary.ts` delega ao SDK real; permite atrasar ou rejeitar uma chamada específica para inspecionar gravações anteriores. Ele não implementa um Firestore em memória.

## Preparação e execução

Requisitos: Node compatível com a aplicação e Java 21+ no PATH. Nesta máquina foi usado Node 24.20.0 e um JRE Temurin 21 portátil em `.test-tools/java/<jre>/bin`, sem alteração no Java do sistema.

```sh
npm ci
npm ci --prefix tests/emulator-tools
npm run test:emulators:prepare
npm run test:integration
npm run test:coverage:all
```

`test:firebase` é um alias explícito de `test:integration`: inicia Firestore/Auth, executa a suíte e encerra ambos. `test:integration:coverage` mede apenas integração; `test:coverage:all` executa unitários e integração em uma única coleta V8. `test:coverage` continua medindo apenas os unitários. Os dois comandos que usam a pasta `coverage` substituem seu conteúdo; para o relatório completo execute `test:coverage:all` por último.

O pacote separado `tests/emulator-tools` fixa Firebase CLI 14.12.0 e possui lockfile próprio. Não adiciona dependências à aplicação. `test:emulators:prepare` baixa somente o JAR oficial definido na CLI e verifica SHA-256. Downloads de ferramentas acontecem antes dos testes, sem carregar credenciais. Java pode ser obtido no [Adoptium](https://adoptium.net/installation); o diretório portátil usado localmente é ignorado pelo Git.

CLI 14.12.0 utiliza Firestore Emulator 1.19.8; Auth faz parte da CLI. A instalação informou um engine warning em `superstatic`, usado por Hosting, para Node 24. Hosting não é iniciado; Firestore/Auth e os testes passaram nesse ambiente. Não foi atualizado nenhum pacote da aplicação para contornar esse aviso.

## Isolamento verificável

| Item | Configuração |
|---|---|
| Projeto | `demo-career-tracker-integration`, fixo no runner e no cliente |
| Firestore | `127.0.0.1:8089` |
| Auth | `127.0.0.1:9098` |
| Hub / logs | `127.0.0.1:4409` / `127.0.0.1:4509` |
| Configuração | `firebase.test.json`, sem configuração Firebase de produção |
| Credenciais | API key fictícia; usuários locais; tokens emitidos por Auth Emulator |
| Ambiente Vite | envDir aponta para arquivo regular, sem filhos `.env`; prefixo TEST_ONLY_ |
| Rede Node | Preload anterior à CLI/Vitest/SDK, apenas loopback nas quatro portas; TLS externo bloqueado |
| Disponibilidade | Pré-checagem com timeout; falha com EMULATOR_REQUIRED/EMULATOR_UNAVAILABLE, sem fallback |
| Reset | Endpoint REST do Firestore Emulator, no projeto demo fixo, antes de cada teste |
| Concorrência da suíte | Arquivos de integração sequenciais; concorrência apenas onde o teste a controla |

O aviso da CLI de que não conseguiu buscar MOTD/configuração remota é esperado: a solicitação foi bloqueada antes da conexão. O download preparatório do binário oficial é uma operação separada; os testes não abrem rede externa.

Os usuários A/B são criados em Auth Emulator e identificados pelo e-mail de teste; seus UIDs vêm do emulador e nunca são assumidos como constantes. IDs de domínio gerados por UUID são determinísticos por teste. IDs automáticos de documentos de tabela são verificados por quantidade, identidade e conteúdo, não por um valor aleatório específico.

### Regras de teste, não de produção

Não há Security Rules de produção no repositório. `firestore.test.rules` permite dados no caminho do próprio UID e nega acesso cruzado/logout. O ID de carreira `denied` provoca `permission-denied` em leituras pontuais para testar a reação do serviço. Consultas de lista do próprio usuário são permitidas para não mascarar os testes do listener.

Isso valida a integração com um conjunto **explicitamente sintético** de regras. Não valida autorização, índices, políticas ou limites do projeto de produção. Um caso de rede sem cache usa REST com o token especial `owner` apenas no endpoint do emulador; não é uma credencial real.

## Falhas e observabilidade

1. `put/read/list` usam o SDK. As inspeções usam `getDocFromServer/getDocsFromServer`, evitando concluir persistência apenas com dados do cache.
2. `failOnce` rejeita uma operação antes/depois da delegação. O relatório identifica essas falhas como injetadas. Os sucessos anteriores são gravações reais no emulador.
3. Regras provocam negação real, e o SDK rejeita payload `undefined` de verdade.
4. Um teste desabilita o transporte do SDK após armazenar o grupo no cache, lê uma carreira existente que não está no cache e recebe `unavailable`. Antes da limpeza do grupo o transporte é reabilitado, permitindo inspecionar a remoção indevida no emulador.
5. Barreiras de promises controlam concorrência e ordem de respostas sem sleeps arbitrários: duas criações, duas promoções, salvamentos rápidos de resultado e gravação antiga liberada depois da nova.

Todos os bugs mantêm teste do comportamento atual e `todo` do resultado desejado. Não há testes comuns propositalmente vermelhos.

## Limites

- As falhas de processo completo/crash e recuperação após reiniciar emuladores não são simuladas. O teste real de rede controla o transporte do SDK; não mata o processo Java no meio de uma escrita.
- A suíte não prova regras de produção, todos os métodos CRUD de base/equipe ou todos os caminhos de UI. O relatório preserva essas lacunas e a cobertura global baixa.
- Os testes não devem criar subprocessos de rede nem contornar o cliente de integração. O preload é uma proteção do runner, não uma sandbox para código hostil.

Referências de configuração: [Firestore Emulator](https://firebase.google.com/docs/emulator-suite/connect_firestore), [Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth) e [instalação da Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure).
