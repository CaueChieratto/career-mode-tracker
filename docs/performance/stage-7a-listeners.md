# Relatório de Performance — Etapa 7A: Correção do Vazamento de Listeners em `useCareers`

**Data de Emissão:** 25 de Setembro de 2026  
**Fase:** Fase 7 — Performance  
**Etapa:** Etapa 7A — Listener Lifecycle em `useCareers`  
**Status:** Concluído com Sucesso

---

## 1. Diagnóstico e Causa Raiz

No baseline de performance (Etapa 5, documentado em `docs/performance/baseline-report.md`), foi identificado um vazamento sistemático de inscrições ativas no Firestore durante ciclos de navegação na Single Page Application (SPA):

```
Careers → Group → Careers → Group → Careers
```

### 1.1 Causa Raiz no Código

No hook `src/common/hooks/Career/UseCareer/index.ts`, a estrutura anterior era:

```typescript
useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      setLoading(true);
      const unsubscribeCareers = ServiceCareer.getAll((data) => {
        setCareers(data);
        setLoading(false);
      });
      return () => unsubscribeCareers && unsubscribeCareers(); // <-- BUG
    } else {
      setCareers([]);
      setLoading(false);
    }
  });

  return () => unsubscribeAuth();
}, []);
```

### 1.2 Por Que o Cleanup Anterior Falhava

1. **Callback do Firebase Auth vs. Efeito React:** O valor retornado dentro do callback de `onAuthStateChanged` (`return () => unsubscribeCareers && ...`) é silenciosamente descartado pelo SDK do Firebase Authentication. O Firebase Auth não trata o retorno do observador como uma função de cleanup de ciclo de vida.
2. **Cleanup Real do React Incompleto:** O retorno da função do `useEffect` continha apenas `return () => unsubscribeAuth()`. Ao desmontar o componente `CareersPage` (por exemplo, ao navegar para um grupo), o listener do Firebase Auth era cancelado, mas a inscrição ativa do Firestore criada por `ServiceCareer.getAll` (`onSnapshot`) **permanecia aberta e ativa indefinidamente no client**.
3. **Multiplicação Linear:** A cada novo retorno à rota `/CareersPage`, o componente montava novamente, gerando uma nova assinatura sem que a anterior tivesse sido encerrada ($1 \rightarrow 2 \rightarrow 3 \rightarrow 4$ listeners simultâneos).
4. **Amplificação de Leituras:** Como `getAllCareers` re-hidrata dados a cada disparo de snapshot, qualquer mutação simples de metadados (como avanço de `updatedAt`) fazia todos os listeners acumulados dispararem concorrentemente, quadruplicando o volume de leituras e entregas de documentos.

---

## 2. Correção Implementada (Patch Mínimo e Cirúrgico)

O arquivo de produção `src/common/hooks/Career/UseCareer/index.ts` foi refatorado cirurgicamente:

1. A referência da inscrição do Firestore (`unsubscribeCareers`) foi elevada ao escopo interno do `useEffect`.
2. Quando o estado de autenticação transiciona (ou ao deslogar), qualquer inscrição prévia é cancelada antes de criar uma nova.
3. No retorno oficial do `useEffect` (função de cleanup do React), tanto `unsubscribeAuth()` quanto `unsubscribeCareers()` são executados obrigatoriamente.

### 2.1 Código Atual de Produção

```typescript
export const useCareers = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeCareers: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeCareers) {
        unsubscribeCareers();
        unsubscribeCareers = undefined;
      }

      if (user) {
        setLoading(true);
        unsubscribeCareers = ServiceCareer.getAll((data) => {
          setCareers(data);
          setLoading(false);
        });
      } else {
        setCareers([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCareers) {
        unsubscribeCareers();
        unsubscribeCareers = undefined;
      }
    };
  }, []);

  return { careers, loading };
};
```

**Arquivos de Produção Modificados:**

- `src/common/hooks/Career/UseCareer/index.ts` (único arquivo de produção alterado).

---

## 3. Testes Automatizados de Ciclo de Vida

Foi criado o arquivo de teste unitário `src/test/useCareers.test.ts`, adicionando 8 novos testes focados na suíte:

- `cria exatamente um listener Firestore ao montar com usuário logado`
- `cancela o listener Firestore ao desmontar`
- `não acumula listeners em ciclos de montagem/desmontagem (simulação da jornada SPA)`
- `cancela o listener anterior quando o estado de auth muda para deslogado`
- `cancela o listener anterior e cria um novo ao reautenticar sem remontar`
- `não cria listener Firestore quando não há usuário logado`
- `retorna careers vazias e loading=false quando não há usuário`
- `retorna careers atualizadas pelo callback do onSnapshot`

Total de testes unitários: **172 aprovados em 14 arquivos** (de 164 em 13 arquivos).  
Total consolidado da suíte funcional: **384 aprovados em 28 arquivos** (172 unitários + 212 integração). Zero skips, zero todos.

---

## 4. Medição Dirigida Before vs. After (Resultados Reais)

A medição dirigida foi executada contra os perfis **SMALL** e **MEDIUM** utilizando a mesma infraestrutura de navegação automatizada headless em Chrome (Playwright) conectada aos emuladores locais.

### 4.1 Perfil SMALL

Jornada: Login $\rightarrow$ Careers $\rightarrow$ (Careers $\leftrightarrow$ Group $\times 3$) $\rightarrow$ Careers $\rightarrow$ alteração isolada de `updatedAt`.

| Evento                           | Métrica                  | Baseline (Etapa 5) | After (Etapa 7A) |                  Variação / Diagnóstico                  |
| -------------------------------- | ------------------------ | :----------------: | :--------------: | :------------------------------------------------------: |
| **Início (CareersPage montada)** | Listeners ativos         |         1          |        1         |                Idêntico (1 subscription)                 |
| **Ciclo 1: Careers → Group**     | Listeners ativos         |         1          |        0         |             **Unsubscribe confirmado** (-1)              |
| **Ciclo 1: Group → Careers**     | Listeners ativos         |         2          |        1         |                **Sem acúmulo** (1 ativo)                 |
| **Ciclo 2: Careers → Group**     | Listeners ativos         |         2          |        0         |                  Unsubscribe confirmado                  |
| **Ciclo 2: Group → Careers**     | Listeners ativos         |         3          |        1         |                **Sem acúmulo** (1 ativo)                 |
| **Ciclo 3: Careers → Group**     | Listeners ativos         |         3          |        0         |                  Unsubscribe confirmado                  |
| **Ciclo 3: Group → Careers**     | Listeners ativos         |         4          |        1         |                **Sem acúmulo** (1 ativo)                 |
| **updatedAt após os 3 ciclos**   | **Listeners ativos**     |       **4**        |      **1**       |      **Redução de 75%** (eliminação total do leak)       |
| **updatedAt após os 3 ciclos**   | **Callbacks disparados** |       **4**        |      **1**       |    **1 callback apenas** (sem re-execuções fantasmas)    |
| **updatedAt após os 3 ciclos**   | **Logical Reads**        |      **264**       |      **66**      | **Redução de 75%** (de $4 \times 66$ para $1 \times 66$) |
| **updatedAt após os 3 ciclos**   | Docs entregues           |       3.108        |       774        |  Redução de 75% (de $4 \times 777$ para $1 \times 774$)  |
| **updatedAt após os 3 ciclos**   | Duração da atualização   |      ~150 ms       |      137 ms      |                      Sem degradação                      |

---

### 4.2 Perfil MEDIUM

Jornada idêntica aplicada ao perfil médio (300 partidas, 150 jogadores).

| Evento                           | Métrica                  | Baseline (Etapa 5) | After (Etapa 7A) |                   Variação / Diagnóstico                   |
| -------------------------------- | ------------------------ | :----------------: | :--------------: | :--------------------------------------------------------: |
| **Início (CareersPage montada)** | Listeners ativos         |         1          |        1         |                 Idêntico (1 subscription)                  |
| **Ciclo 1: Careers → Group**     | Listeners ativos         |         1          |        0         |              **Unsubscribe confirmado** (-1)               |
| **Ciclo 1: Group → Careers**     | Listeners ativos         |         2          |        1         |                 **Sem acúmulo** (1 ativo)                  |
| **Ciclo 2: Careers → Group**     | Listeners ativos         |         2          |        0         |                   Unsubscribe confirmado                   |
| **Ciclo 2: Group → Careers**     | Listeners ativos         |         3          |        1         |                 **Sem acúmulo** (1 ativo)                  |
| **Ciclo 3: Careers → Group**     | Listeners ativos         |         3          |        0         |                   Unsubscribe confirmado                   |
| **Ciclo 3: Group → Careers**     | Listeners ativos         |         4          |        1         |                 **Sem acúmulo** (1 ativo)                  |
| **updatedAt após os 3 ciclos**   | **Listeners ativos**     |       **4**        |      **1**       |       **Redução de 75%** (eliminação total do leak)        |
| **updatedAt após os 3 ciclos**   | **Callbacks disparados** |       **4**        |      **1**       |                   **1 callback apenas**                    |
| **updatedAt após os 3 ciclos**   | **Logical Reads**        |     **1.248**      |     **312**      | **Redução de 75%** (de $4 \times 312$ para $1 \times 312$) |
| **updatedAt após os 3 ciclos**   | Docs entregues           |       15.012       |      3.750       | Redução de 75% (de $4 \times 3.753$ para $1 \times 3.750$) |
| **updatedAt após os 3 ciclos**   | Duração da atualização   |      ~150 ms       |      140 ms      |                       Sem degradação                       |

---

## 5. Limitações e Escopo Estrito

1. **Escopo Restrito à 7A:** Apenas o vazamento de listeners órfãos em `useCareers` foi tratado nesta etapa.
2. **Padrão N+1 Não Alterado:** A consulta de 60/300 partidas e a busca individual de `playerStats` por partida continuam intactas no `Getters/index.ts` e serão o foco exclusivo da **Etapa 7B**.
3. **Nenhum Outro Recurso Modificado:** Nenhuma rota, memoização, bundle, asset, regra de negócio ou dependência externa foi adicionada ou modificada.
4. **Isolamento de Segurança:** Firebase de produção permaneceu 100% inacessado durante todas as etapas e medições.
