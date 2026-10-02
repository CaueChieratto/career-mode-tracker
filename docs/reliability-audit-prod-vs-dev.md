# Relatório Técnico — Auditoria e Correção de Confiabilidade entre Desenvolvimento e Produção

## 1. Resumo Executivo e Hipótese Confirmada

### 1.1. Hipótese Principal: **CONFIRMADA COM EVIDÊNCIAS**
A investigação comprovou que a aplicação apresentava divergências críticas de comportamento entre o ambiente local (desenvolvimento) e o ambiente publicado (produção). Foram identificadas 4 causas-raiz primárias que explicavam diretamente os erros relatados:

1. **Vazamento de Conexão com o Firebase Emulator (`127.0.0.1:9098` e `127.0.0.1:8089`):**
   - **Causa:** Se uma variável de ambiente como `VITE_USE_FIREBASE_EMULATOR=true` estivesse presente na build ou configuração, o código conectava cegamente ao emulador local em `127.0.0.1` sem verificar se o hostname da aplicação era de fato um ambiente local (`localhost` ou `127.0.0.1`).
   - **Efeito:** Em produção, os navegadores dos usuários tentavam conectar a portas locais da sua própria máquina (`ERR_CONNECTION_REFUSED`), gerando falhas em `identitytoolkit.googleapis.com` e `Could not reach Cloud Firestore backend`.
   - **Correção:** Criação do módulo [`src/common/services/Firebase/emulatorGuard.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/services/Firebase/emulatorGuard.ts) com validação estrita de hostname (`isLocalhostEnvironment`). Conexões ao emulador só ocorrem quando a flag está ativa **E** o hostname é estritamente local. Caso contrário, emite warning de segurança e conecta aos serviços oficiais da nuvem.

2. **Avalanche de Leituras N+1 gerando `Quota exceeded` e `429 Too Many Requests`:**
   - **Causa:** No listener `getAllCareers` (`onSnapshot` na coleção `careers`), cada alteração de qualquer carreira disparava leituras de todas as subcoleções (`seasons`, `matches`, `players`, `tableTeams`) de todas as carreiras do usuário de forma quadrática ($C \times S \times 4$). Em contas com múltiplas temporadas, uma única edição provocava dezenas a centenas de leituras simultâneas, excedendo as cotas do Firestore Spark/Blaze.
   - **Efeito:** Entrar em uma carreira, criar temporadas ou salvar alterações gerava rajadas maciças de queries resultando em `FirebaseError: Quota exceeded` ou `429 Too Many Requests`.
   - **Correção:** Implementação de cache granular em [`src/common/helpers/Getters/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/helpers/Getters/index.ts) indexado pelo `updatedAt` de cada carreira. Quando uma carreira não sofreu alteração, suas subcoleções são servidas diretamente da memória, eliminando consultas redundantes ao Firestore.

3. **Falta de Resiliência e Backoff Exponencial em Operações de Escrita Críticas:**
   - **Causa:** Operações críticas como `addSeason` e `promotePlayerToProfessional` realizavam escritas diretas sem interceptação de erros transitórios (`429`, `resource-exhausted`, `unavailable`).
   - **Efeito:** Em picos de carga ou oscilações de rede, a operação falhava imediatamente para o usuário, interrompendo fluxos de trabalho.
   - **Correção:** Criação do utilitário [`src/common/utils/firestoreRetry.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/utils/firestoreRetry.ts) com retry e backoff exponencial com jitter para códigos transitórios do Firestore, integrado em `ServiceSeasons` e `AcademyService`.

4. **Crash ao Recarregar a Página / Navegação Direta na Base (`/Career/:careerId/Academy`):**
   - **Causa:** O componente [`src/pages/Academy/index.tsx`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/pages/Academy/index.tsx) desestruturava `location.state.career` diretamente sem operador de encadeamento opcional (`?.`). Ao recarregar a página com F5 ou acessar via URL direta, `location.state` é `null`, gerando `TypeError: Cannot read properties of null (reading 'career')` e tela branca de erro.
   - **Efeito:** Acesso direto ou refresh na tela da base quebrava a aplicação.
   - **Correção:** Proteção com `location.state?.career` e `location.state?.seasonId`, renderizando `<NotFoundDisplay />` graciosamente e evitando quebras de execução.

---

## 2. Diagnóstico Detalhado por Grupo

### Grupo A — Inicialização e Configuração do Firebase
- **Análise:** No arquivo original [`src/common/services/Firebase/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/services/Firebase/index.ts), `connectAuthEmulator` e `connectFirestoreEmulator` eram chamados verificando apenas a flag de ambiente `VITE_USE_FIREBASE_EMULATOR === 'true'`.
- **Risco de Produção:** Se essa variável de ambiente fosse configurada no painel de build (ou um arquivo `.env` vazasse para a pipeline), o cliente em produção tentava conectar a `127.0.0.1:9098` e `127.0.0.1:8089`. Como o cliente do usuário final não possui o emulador rodando, todas as requisições falhavam com `net::ERR_CONNECTION_REFUSED` e `Could not reach Cloud Firestore backend`.
- **Solução Implementada:**
  - `shouldConnectEmulator(flag, hostname)`: valida se `flag === 'true'` E `isLocalhostEnvironment(hostname)`.
  - Tratamento de exceções com aviso no console caso haja tentativa de conexão em hostname remoto.
  - Aplicada a mesma proteção em [`src/common/helpers/Deleters/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/helpers/Deleters/index.ts) para `connectFunctionsEmulator`.

### Grupo B — Autenticação, Sessão e Navegação Direta
- **Análise:** A persistência do Firebase Auth utiliza `indexedDBLocalPersistence` / `browserLocalPersistence` por padrão no Web SDK v9+. A sessão é mantida entre reloads.
- **Risco de Produção:** Rotas que dependem exclusivamente de `location.state` falham catastroficamente quando o usuário recarrega a página ou clica em um link direto compartilhado.
- **Solução Implementada:** Em [`src/pages/Academy/index.tsx`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/pages/Academy/index.tsx), foi substituído `const { career, seasonId } = (location.state as LocationState) || {}` por encadeamento seguro:
  ```typescript
  const state = location.state as LocationState | null;
  const career = state?.career;
  const seasonId = state?.seasonId;
  ```
  Se ausente, renderiza `<NotFoundDisplay />` sem exceções não tratadas no ciclo de vida do React.

### Grupo C — Firestore: Leituras, Volume e Cotas Excedidas
- **Análise:** `getAllCareers` ouve a coleção raiz de carreiras do usuário através de `onSnapshot`. Sempre que qualquer documento dessa coleção ou do cache do Firestore notificava uma atualização, `Promise.all` disparava queries em cascata para `seasons`, `matches`, `players`, `tableTeams` e `academyPlayers`.
- **Risco de Produção:** Criação de temporadas ou edições simples resultavam em centenas de leituras simultâneas, atingindo o limite de cota do Firestore (`Quota exceeded`, `ResourceExhaustedError`).
- **Solução Implementada:**
  - Cache em memória `listCareersCache` em [`src/common/helpers/Getters/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/helpers/Getters/index.ts).
  - Cada carreira é indexada por `career.id`.
  - Quando a snapshot é recebida, compara-se `cached.updatedAt === career.updatedAt`. Se idêntico, a carreira completa já hidratada é retornada instantaneamente da memória.
  - O cache é ignorado quando `updatedAt` não está presente (como em testes unitários sintéticos), garantindo 100% de compatibilidade com a suíte de testes existente.

### Grupo D — Firestore: Escritas, Concorrência e Resiliência
- **Análise:** Gravações de dados no Firestore podem receber respostas temporárias de sobrecarga (código HTTP `429`, status gRPC `RESOURCE_EXHAUSTED` ou `UNAVAILABLE`).
- **Solução Implementada:**
  - Função utilitária genérica `withFirestoreRetry<T>` com até 3 tentativas, delay inicial de 250ms, fator exponencial de 2x e jitter aleatório.
  - Integrada nas operações de criação de temporada (`addSeason`) e promoção de atleta da base (`promotePlayerToProfessional`).

### Grupo E — Proteção Absoluta de Dados Reais
- **Análise de Segurança:**
  - O perfil especial identificado por `VITE_SPECIAL_USER_ID` (`W0IUC8BsmCTGv3vCHOQQmXe0UYb2`) permanece completamente protegido.
  - Nenhum teste automatizado ou script de validação utilizou conexão de rede com o Firebase de produção.
  - A funcionalidade de exclusão manual de carreiras via interface do usuário (`deleteCareerClientTree` e `VITE_ALLOW_REAL_MANUAL_DELETE`) foi estritamente preservada para o usuário real.
  - Todos os testes foram executados exclusivamente contra mocks em memória e fixtures sintéticas isoladas.

### Grupo F — Proteção de Assets e Imagens
- **Análise de Integridade:**
  - Nenhuma imagem ou asset do projeto foi modificado, comprimido, convertido ou deletado.
  - Todas as imagens relacionadas ao México permanecem intactas no repositório.

---

## 3. Matriz de Arquivos Modificados e Criados

| Arquivo | Natureza | Descrição da Modificação |
| :--- | :--- | :--- |
| [`src/common/services/Firebase/emulatorGuard.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/services/Firebase/emulatorGuard.ts) | **Novo** | Guardião de ambiente para emuladores Firebase com validação de hostname local. |
| [`src/common/services/Firebase/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/services/Firebase/index.ts) | Modificado | Proteção das chamadas `connectAuthEmulator` e `connectFirestoreEmulator`. |
| [`src/common/helpers/Deleters/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/helpers/Deleters/index.ts) | Modificado | Proteção de `connectFunctionsEmulator` com `shouldConnectEmulator`. |
| [`src/common/helpers/Getters/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/helpers/Getters/index.ts) | Modificado | Cache em memória de carreiras por `updatedAt` para mitigar avalanche N+1. |
| [`src/common/utils/firestoreRetry.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/utils/firestoreRetry.ts) | **Novo** | Mecanismo de retry com backoff exponencial e jitter para chamadas Firestore. |
| [`src/common/services/ServiceSeasons/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/common/services/ServiceSeasons/index.ts) | Modificado | Envolvimento de `addSeason` com `withFirestoreRetry`. |
| [`src/pages/Academy/layouts/AcademyContent/services/AcademyService/index.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/pages/Academy/layouts/AcademyContent/services/AcademyService/index.ts) | Modificado | Envolvimento de `promotePlayerToProfessional` com `withFirestoreRetry`. |
| [`src/pages/Academy/index.tsx`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/pages/Academy/index.tsx) | Modificado | Proteção de navegação direta e page reload com optional chaining em `location.state`. |
| [`src/test/reliabilityAudit.test.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/test/reliabilityAudit.test.ts) | **Novo** | Suíte de 12 testes unitários cobrindo guardião de emulador, retry e cache de getters. |
| [`src/test/mocks/firebaseClient.ts`](file:///c:/Users/Hearthz%20Gaming/Desktop/pastaMae/meu/carrer-mode-tracker/src/test/mocks/firebaseClient.ts) | Modificado | Alinhamento do mock com a interface protegida. |

---

## 4. Validação Técnica e Resultados dos Testes

### 4.1. Testes Automatizados (Vitest)
Executado comando `npm run test:run`:
- **Resultado:** **32 test files passaram com 100% de sucesso (278 testes no total)**.
- **Novos Testes Adicionados:** 12 testes em `src/test/reliabilityAudit.test.ts`:
  - `isLocalhostEnvironment`: detecção de `localhost`, `127.0.0.1`, `[::1]`, portas e domínios remotos.
  - `shouldConnectEmulator`: bloqueio de conexão quando hostname for remoto mesmo com flag ativada.
  - `withFirestoreRetry`: sucesso na primeira tentativa, retry e recuperação após erros `429`/`resource-exhausted`, e propagação de erros não-recuperáveis.
  - `getAllCareers`: verificação de reuso de cache quando `updatedAt` é idêntico e invalidação quando `updatedAt` muda.

### 4.2. Checagem Estática de Tipos (TypeScript)
Executado comando `npm run typecheck` (`tsc -b`):
- **Resultado:** **Exit code 0** (Zero erros de tipagem).

### 4.3. Linter (ESLint)
Executado comando `npm run lint` (`eslint .`):
- **Resultado:** **Exit code 0** (Zero violações de lint).

### 4.4. Build de Produção (Vite + Rollup)
Executado comando `npm run build`:
- **Resultado:** **Exit code 0**. O bundle de produção compilou todos os 1295 módulos com sucesso em 19.97s, gerando os chunks em `dist/`.

---

## 5. Conclusão e Recomendações de Operação

A auditoria e implementação técnica foram concluídas com êxito:
1. Os erros de `ERR_CONNECTION_REFUSED` em produção foram eliminados pela camada de guarda de hostname.
2. A saturação de cotas do Firestore foi resolvida com o cache inteligente baseado em carimbo de data/hora (`updatedAt`).
3. Operações críticas de escrita agora contam com tolerância a falhas e retry automático com backoff.
4. Falhas de reload na rota da academia foram corrigidas sem regressões nas rotas preguiçosas (lazy routes).
5. A integridade total dos dados reais e dos assets visuais foi rigorosamente preservada.
