# Testes isolados

Escopo atual: etapas 1–4. Leia [contratos e bugs das etapas 1–3](contracts-and-scenarios.md), o [relatório atualizado](implementation-report.md) e o [guia de integração](emulator-integration.md) antes de alterar testes de defeitos conhecidos. A seção de isolamento abaixo descreve a suíte unitária; a integração utiliza o SDK e emuladores reais, com rede restrita a loopback.

## Comandos

```sh
npm ci
npm run test:run
npm run test:coverage
npm run test:integration
npm run test:coverage:all
npm run typecheck
npm run typecheck:tests
npm run lint
npm run build
```

`npm test` abre modo watch. `coverage/index.html` contém relatório navegável; JSON e resumo ficam na mesma pasta, ignorada pelo Git. Denominador: todos os arquivos TS/TSX de produção, inclusive páginas e serviços não testados; somente testes e declarações ficam excluídos. Não existe limiar global artificial nesta primeira etapa.

## Isolamento

- `vitest.config.ts` é separado do Vite da aplicação. `envDir` aponta intencionalmente para um arquivo regular verificado (a própria configuração), que não pode conter arquivos `.env`; `envPrefix` é `TEST_ONLY_`. Assim nenhum `.env`, inclusive `.env.local`, é carregado. No Vite 5, `envFile: false` só funciona na configuração inline do runner, não como propriedade exportada pelo arquivo; por isso não dependemos dessa opção.
- Projeto fixo `demo-career-tracker`, chave fictícia e cliente Firebase em memória. O módulo Firebase de produção é substituído antes de ser avaliado; os imports de auth/firestore resolvem para mocks locais. Outras entradas Firebase são recusadas.
- Operações de Firestore não configuradas lançam `UNCONFIGURED_FIRESTORE_OPERATION`. Não há SDK real ou fallback.
- Setup bloqueia fetch, WebSocket, XHR quando disponível, HTTP, HTTPS, TLS e conexão de socket; o bloqueio inclui localhost nesta suíte unitária. Não substitua por um passthrough.
- A integração agora possui runner próprio: projeto demo fixo, hosts/portas locais fixos e checagem de disponibilidade. `test:integration` e `test:firebase` iniciam e encerram os emuladores; configuração ausente ou emulador indisponível aborta sem fallback. Veja preparação e regras sintéticas no [guia](emulator-integration.md).
- O teste `isolation.test.ts` exercita cliente fictício, operações não configuradas, rede e a validação de ambiente. Serviços usam respostas e falhas explícitas em memória.

Vitest não é uma sandbox para código malicioso. Estes bloqueios cobrem os canais usados pelo projeto e falham de forma explícita para chamadas inesperadas; futuros testes não devem criar subprocessos de rede ou importar SDK por caminhos absolutos para contorná-los.

## Dependências

Vitest e coverage-v8 3.2.7 (compatíveis com Vite 5), React Testing Library 16.3.0, DOM Testing Library 10.4.1 e jsdom 26.1.0. `@types/node` 24.2.1 passou a ser dependência direta de desenvolvimento, preservando a versão já existente no lockfile. RTL/jsdom são usados para hooks. Validação local usa Node 24.20.0. Não foram adicionados user-event, jest-dom, MSW, Playwright ou rules-unit-testing. Firebase CLI foi acrescentado somente ao pacote separado de ferramentas da etapa 4.

As versões das dependências anteriores são preservadas no lockfile. Quando ferramentas novas exigem versões transitivas superiores, essas cópias ficam aninhadas nas ferramentas de teste. Não foi aplicada atualização geral de dependências. Na etapa 4, Firebase CLI foi instalado em `tests/emulator-tools`, com package.json e lockfile próprios; o lockfile da aplicação não mudou.

## Organização e manutenção

Factories tipadas e cenários compartilhados ficam em `src/test/factories` e `fixtures`; substitutos Firebase em `mocks`; teste de hook usa jsdom via anotação por arquivo. Os demais usam Node. Não há renderWithProviders sem uso, handlers MSW, diretórios vazios de E2E ou benchmarks.

O TypeScript da aplicação exclui `src/test`; `tsconfig.test.json` verifica a suíte e suas dependências importadas com strict/noUnused herdados. Mocks são restaurados entre testes; factories retornam objetos novos; relógio/UUID são controlados nos fluxos necessários. A suíte normal deve permanecer verde. `todo` de bug não significa que a correção foi validada.
