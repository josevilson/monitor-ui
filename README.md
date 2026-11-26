# Observability Hub — UI Monitor (MVP Front-end)

Interface minimalista de observabilidade construída em **Next.js (App Router + TypeScript + Tailwind CSS)** para consolidar duas frentes operacionais com suporte multi-ambiente (**`prd`** e **`hk`**):

1. **Control-M Jobs:** monitoramento histórico estilo Airflow Grid Timeline (execuções por dia, falhas, pendências, agrupamento por Processo / Pasta / Job e filtros por coluna).
2. **Kafdrop → Databricks:** conciliação analítica de volumetria diária e acumulada entre tópicos Kafka (via Kafdrop) e tabelas Delta/Unity Catalog no Databricks, além de checagem de presença/ausência de colunas (*Schema Drift*).

---

> [!IMPORTANT]
> **Aviso para a próxima IA / Desenvolvedor(a) de Back-end — Leia antes de codar**
>
> Este projeto é um **MVP exclusivamente de front-end** alimentado por mocks estáticos (`src/data/`).
> **Nenhuma estrutura de dados, campo ou regra exibida aqui está escrita em pedra.**
>
> Ao projetar e integrar o back-end:
> 1. **Analise primeiro o que as APIs e fontes reais realmente fornecem** (Control-M Automation API, Kafdrop/Kafka, Databricks SQL Warehouse / Unity Catalog / System Tables, Prometheus, etc.).
> 2. **Adapte o contrato e a UI à realidade dos dados:** se uma fonte não expor determinado campo (ex.: `waitingFor`, `logSnippet`, `linkedJobs`, contagem exata por dia no Kafka ou histórico de 14 dias), ajuste os tipos em `src/types/monitoring.ts`, torne o campo opcional ou proponha a alternativa viável — sem forçar consultas caras ou gambiarras só para replicar 1:1 o mock.
> 3. **Prefira carregamento sob demanda (*lazy loading*):** dados pesados (logs do Control-M, *diff* completo de colunas, detalhes de execução) devem ser buscados apenas quando o operador clicar para abrir o *drawer* lateral, mantendo a listagem principal rápida.

---

## Stack & Como Executar

- **Framework:** Next.js `16.4.6` (App Router, Turbopack)
- **UI:** React `19.3.0`, Tailwind CSS `v4`, `lucide-react`
- **Linguagem:** TypeScript (`strict: true`)

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento (http://localhost:3000)
npm run dev

# Validar tipagem, lint e build de produção
npx tsc --noEmit && npm run lint && npm run build

# Subir build de produção (http://localhost:3000)
npm run start
```

> **Nota:** Leia `AGENTS.md` na raiz antes de alterar convenções de App Router/Next.js 16 (este repositório usa a versão 16.4.6 com tipagens e APIs atualizadas).

---

## Estrutura do Projeto

```text
src/
├── app/
│   ├── globals.css                  # Tokens de tema (Dark/Light) e utilitários CSS
│   ├── layout.tsx                   # RootLayout (fontes Geist Sans/Mono, tema padrão dark)
│   └── page.tsx                     # Entrada principal -> ObservabilityApp
├── components/
│   ├── ObservabilityApp.tsx         # Estado global de navegação (aba, ambiente PRD/HK/Todos, busca, tema)
│   ├── layout/
│   │   └── TopNav.tsx               # Cabeçalho único: busca central, seletor PRD/HK/Todos, abas e tema
│   ├── ui/
│   │   ├── Badges.tsx               # EnvBadge (PRD/HK), JobStatusBadge e JobStatusDot
│   │   └── DetailDrawer.tsx         # Drawer lateral deslizante reutilizável (progressive disclosure)
│   ├── jobs/
│   │   ├── JobsTimelineView.tsx     # Matriz Control-M, agrupamentos, chips e filtros por coluna
│   │   ├── ColumnFilterPopover.tsx  # Popover pesquisável/selecionável reutilizável (position: fixed)
│   │   └── JobDetailDrawer.tsx      # Detalhes da execução Control-M (ODATE, dependência, sysout/log)
│   └── kafka/
│       ├── VolumetryMatrixView.tsx  # Matriz 2 linhas por par (Kafdrop acima, Databricks abaixo) + Acumulado
│       └── VolumetryDetailDrawer.tsx# Gráfico comparativo do período, Schema Drift e jobs vinculados
├── data/
│   ├── mock-controlm.ts             # Massa mockada Control-M (PRD, HK e compartilhados)
│   └── mock-kafka-databricks.ts     # Massa mockada Kafdrop → Databricks (14 dias, PRD e HK)
├── lib/
│   └── format.ts                    # Formatadores de data curta, números compactos/completos e duração
└── types/
    └── monitoring.ts                # Contratos TypeScript atuais do MVP (ponto de partida para integração)
```

---

## Responsabilidades & Pontos de Integração com Back-end

### 1. Conceito Multi-Ambiente (`prd`, `hk`, `all`)
- O seletor global no cabeçalho filtra toda a aplicação para Produção (`prd`), Homologação (`hk`) ou visão combinada (`all`).
- Cada job ou vínculo tópico ↔ tabela possui `env` (`'prd' | 'hk'`) e `monitoredEnvs` (`('prd' | 'hk')[]`), permitindo configurar recursos monitorados **somente em PRD**, **somente em HK** ou **em ambos** com históricos independentes.
- **Para o back-end:** recomenda-se suportar query param `?env=prd|hk|all` e um catálogo/configuração (JSON, YAML ou banco) definindo quais recursos pertencem a cada ambiente e suas credenciais/endpoints de origem.

### 2. Módulo Control-M Jobs
- **O que a UI exibe hoje:**
  - Lista de jobs pesquisável na barra superior (`jobName`, `folder`, `processName`).
  - Agrupamento por **Processo** (mapeamento de negócio personalizado), **Pasta** (`folder`) ou **Job** individual, com *roll-up* do pior status nos grupos.
  - Eixo alternável entre **ODATE** (*Order Date* de negócio) e **Execução Real** (`dateIso`), em janelas de `7d` ou `14d`.
  - Filtros rápidos por último status (`OK`, `NOT_OK`, `RUNNING`, `PENDING`, `HELD`) e filtros pesquisáveis/selecionáveis diretamente nos cabeçalhos de **Identificação**, **Último Status** e **cada coluna de data**.
  - *Drawer* lateral exibindo `Order ID`, `ODATE`, duração vs. média histórica, causa de pendência (`waitingFor`) e log resumido (`logSnippet`).
- **O que avaliar na API real (ex.: Control-M Automation API):**
  - *Histórico de dias:* o endpoint de status ativo do Control-M geralmente retorna apenas os ciclos recentes em *Active Jobs*. Para montar uma linha do tempo de 7–14 dias, provavelmente será necessário persistir *snapshots* periódicos em um banco/tabela própria ou consultar o histórico/Run Reporting do Control-M.
  - *Processo Personalizado:* caso o Control-M não tenha essa tag nativa (`Application` / `Sub-Application`), pode ser resolvido por tabela de de-para no back-end.
  - *Logs e Dependências:* carregar `waitingFor` e `logSnippet` apenas via endpoint de detalhe ao abrir o *drawer* (`GET /api/jobs/:id/runs/:orderId`).

### 3. Módulo Kafdrop → Databricks (Volumetria & Schema)
- **O que a UI exibe hoje:**
  - Relação **1:1 vinculada** nesta seção: cada registro une **1 tópico Kafka/Kafdrop** a **1 tabela Databricks**.
  - Cada par ocupa **duas sub-linhas alinhadas** na tabela:
    - Linha superior: **Kafdrop** (`kafdropCount` por dia → **Acumulado Kafdrop** no final).
    - Linha inferior: **Databricks** (`databricksCount` por dia com indicador `OK` / `DIFF` / `LAG` → **Acumulado Databricks** e `%` de aderência no final).
  - Seleção manual de intervalo de datas (`Data Inicial` e `Data Final`) + atalhos (`3d`, `7d`, `14d`) recalculando colunas visíveis e acumulados.
  - **Checagem de Schema (no Drawer):** compara exclusivamente **presença ou ausência de colunas** entre Kafdrop e Databricks (`MATCH`, `MISSING_DBX` = presente no Kafdrop e ausente no Databricks, `MISSING_KAFDROP` = presente no Databricks e ausente no Kafdrop). **Não compara tipos de dados.**
- **O que avaliar nas APIs reais:**
  - *Volumetria do Kafka/Kafdrop:* o Kafdrop nativamente mostra offsets por partição (total acumulado), não necessariamente contagem exata por dia calendário sem cálculo de delta de offsets (`offset_fim_dia - offset_inicio_dia`) ou uso de métricas Prometheus/JMX/consumer de auditoria. Avalie qual estratégia é viável e barata no ambiente real.
  - *Volumetria do Databricks:* pode vir de consultas agregadas por partição/data de evento ou `_commit_timestamp` via SQL Warehouse, preferencialmente pré-agregadas/cacheadas em job diário para evitar custo e lentidão na abertura da tela.
  - *Schema Drift:* comparar chaves do payload/Schema Registry (ou metadado do Kafdrop) contra `DESCRIBE TABLE` / `information_schema.columns` do Unity Catalog, verificando apenas interseção e diferença de nomes de colunas.

---

## Sugestão de Roteiro para Integração do Back-end

1. **Descoberta das Fontes:** validar quais endpoints, permissões e cadências de atualização existem para Control-M (`prd`/`hk`), Kafdrop/Kafka (`prd`/`hk`) e Databricks (`prd`/`hk`).
2. **Revisão de Contratos (`src/types/monitoring.ts`):** ajustar campos obrigatórios/opcionais e limites de janela de datas conforme o que o back-end conseguir entregar com boa performance.
3. **Camada de API / BFF:** criar Route Handlers em `src/app/api/` (ou conectar a um serviço externo) mantendo tokens, credenciais de banco e chamadas ao Control-M/Databricks exclusivamente no servidor (nunca no client).
4. **Estados de Carregamento e Erro:** substituir os imports de `src/data/mock-*.ts` por fetches com estados de *loading* (*skeletons* minimalistas), tratamento de erro por fonte (ex.: Control-M disponível mesmo se Databricks falhar) e *refresh* configurável.
