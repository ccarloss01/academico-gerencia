# Plataforma Acadêmica

Sistema de gerenciamento acadêmico baseado em microsserviços Node.js, Turso (SQLite) e React.
Desenvolvido com Trunk-Based Development, CI/CD automatizado via GitHub Actions e deploy no Render.

---

## Sumário

- [Arquitetura do sistema](#arquitetura-do-sistema)
- [Diagramas](#diagramas)
- [Fluxo CI/CD](#fluxo-cicd)
- [Instruções de deploy](#instruções-de-deploy)
- [Executar localmente](#executar-localmente)
- [Decisões técnicas](#decisões-técnicas)
- [Estrutura de pastas](#estrutura-de-pastas)

---

## Arquitetura do sistema

A plataforma é composta por três microsserviços independentes, um frontend SPA e três bancos de dados Turso (SQLite) isolados — um por serviço.

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                    │
│                  Vite + React Router                    │
│                     porta 8080                          │
└────────┬───────────────┬────────────────┬───────────────┘
         │               │                │
         ▼               ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ auth-service │ │  academic-   │ │  assignment-service  │
│   :3001      │ │  service     │ │       :3003          │
│              │ │  :3002       │ │                      │
│ • /register  │ │              │ │ • /atividades        │
│ • /login     │ │ • /alunos    │ │ • /entregas          │
│ • /validate  │ │ • /professores│ │ • /notas            │
└──────┬───────┘ │ • /disciplinas│ └──────────┬───────────┘
       │         │ • /turmas    │             │
       │         │ • /matriculas│             │
       │         └──────┬───────┘             │
       │                │  ◄──────────────────┘
       │          valida turma via REST
       │
       ◄──── todos os serviços validam JWT aqui
       │
┌──────┴───────────────┐ ┌─────────────────┐ ┌────────────────────┐
│  Turso — auth_db     │ │ Turso —         │ │ Turso —            │
│  • users             │ │ academic_db     │ │ assignment_db      │
│                      │ │ • professores   │ │ • atividades       │
│                      │ │ • alunos        │ │ • entregas         │
│                      │ │ • disciplinas   │ │                    │
│                      │ │ • turmas        │ │                    │
│                      │ │ • matriculas    │ │                    │
└──────────────────────┘ └─────────────────┘ └────────────────────┘
```

### Comunicação entre serviços

| De | Para | Motivo |
|---|---|---|
| academic-service | auth-service `GET /auth/validate` | Validar JWT em toda requisição |
| assignment-service | auth-service `GET /auth/validate` | Validar JWT em toda requisição |
| assignment-service | academic-service `GET /turmas/:id` | Confirmar que a turma existe antes de criar atividade |

Toda comunicação é via **HTTP/REST**. Não há message broker nem API Gateway.

---

## Diagramas

### Fluxo de autenticação

```
Cliente          Frontend         auth-service        Serviço alvo
   │                │                  │                    │
   │── POST /login ─►│                  │                    │
   │                │── POST /login ───►│                    │
   │                │                  │── bcrypt.compare() │
   │                │◄── { token } ────│                    │
   │◄── { token } ──│                  │                    │
   │                │                  │                    │
   │── GET /alunos ─►│                  │                    │
   │                │── GET /alunos ───────────────────────►│
   │                │            │◄── GET /validate ────────│
   │                │            │──── { valid, user } ────►│
   │                │◄──────────────── 200 OK ──────────────│
   │◄── dados ──────│                  │                    │
```

### Ciclo de vida de uma entrega

```
Professor                 assignment-service         academic-service
    │                           │                          │
    │── POST /atividades ───────►│                          │
    │                           │── GET /turmas/:id ───────►│
    │                           │◄── 200 { turma } ────────│
    │                           │── INSERT atividades       │
    │◄── 201 { atividade } ─────│                          │

Aluno                     assignment-service
    │                           │
    │── POST /atividades/1/entregas ──►│
    │                           │── INSERT entregas
    │◄── 201 { entrega } ───────│

Professor                 assignment-service
    │                           │
    │── PATCH /entregas/1/nota ─►│
    │                           │── UPDATE nota = 8.5
    │◄── 200 { entrega } ───────│
```

### Modelo de dados

```
banco: auth_db
  users { id, nome, email, senha, tipo, created_at }

banco: academic_db
  professores { id, user_id*, nome, siape, departamento }
  alunos      { id, user_id*, nome, matricula, curso }
  disciplinas { id, nome, codigo, carga_horaria, professor_id }
  turmas      { id, disciplina_id, semestre, horario }
  matriculas  { id, aluno_id, turma_id, data, status }

banco: assignment_db
  atividades { id, turma_id*, titulo, descricao, prazo }
  entregas   { id, atividade_id, aluno_id*, data_entrega, nota }

* referência lógica — sem FK entre bancos; validação feita via REST
```

---

## Fluxo CI/CD

```
 git push / Pull Request
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                  CI (ci.yml)                        │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ auth-service │  │  academic-   │  │assignment│  │
│  │              │  │  service     │  │-service  │  │
│  │ npm install  │  │ npm install  │  │npm install│ │
│  │ npm run lint │  │ npm run lint │  │npm run lint│ │
│  │ npm test     │  │ npm test     │  │npm test  │  │
│  │ npm audit    │  │ npm audit    │  │npm audit │  │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │
│         └─────────────────┴───────────────┘        │
│                            │                        │
│                     ┌──────▼──────┐                 │
│                     │  frontend   │                 │
│                     │ vite build  │                 │
│                     └──────┬──────┘                 │
│                            │                        │
│                     ┌──────▼──────┐                 │
│                     │  CI passed  │  ← gate job     │
│                     └─────────────┘                 │
└──────────────────────────┬──────────────────────────┘
                           │ merge na main
                           ▼
┌─────────────────────────────────────────────────────┐
│                  CD (cd.yml)                        │
│                                                     │
│  1. version ── bump semântico via Conventional      │
│                Commits (feat→minor, fix→patch)      │
│                                                     │
│  2. build-push (paralelo)                           │
│     ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│     │auth img  │  │academic  │  │assignment img│   │
│     │→ ghcr.io │  │img       │  │→ ghcr.io     │   │
│     └──────────┘  │→ ghcr.io │  └──────────────┘   │
│                   └──────────┘                      │
│                                                     │
│  3. deploy ── curl Deploy Hooks do Render           │
│     (auth, academic, assignment, frontend)          │
│                                                     │
│  4. release ── GitHub Release com changelog         │
└─────────────────────────────────────────────────────┘
```

### Conventional Commits e versionamento

| Prefixo do commit | Bump de versão |
|---|---|
| `feat:` | minor (0.1.0 → 0.2.0) |
| `fix:`, `chore:`, `refactor:` | patch (0.1.0 → 0.1.1) |
| `BREAKING CHANGE` no rodapé | major (0.1.0 → 1.0.0) |

---

## Instruções de deploy

### Pré-requisitos

- Conta no [Render](https://render.com)
- Conta no [Turso](https://turso.tech) com 3 bancos criados
- Repositório no GitHub com o `render.yaml` na raiz

### 1. Criar os bancos no Turso

No dashboard do Turso, crie 3 bancos:

| Banco | Serviço |
|---|---|
| `auth-db` | auth-service |
| `academic-db` | academic-service |
| `assignment-db` | assignment-service |

Para cada banco, copie a **Database URL** e gere um **token** na aba Generate Token.

### 2. Deploy no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **New → Blueprint**
3. Conecte este repositório
4. O Render lerá o `render.yaml` e criará:
   - 3 web services (auth-service, academic-service, assignment-service)
   - 1 site estático (frontend)

### 3. Configurar variáveis no Render

Após o blueprint subir, preencha as variáveis `sync: false` no dashboard de cada serviço:

| Serviço | Variável | Valor |
|---|---|---|
| auth-service | `TURSO_URL` | `libsql://auth-db-<usuario>.turso.io` |
| auth-service | `TURSO_AUTH_TOKEN` | token gerado no Turso |
| auth-service | `JWT_SECRET` | string aleatória longa |
| academic-service | `TURSO_URL` | `libsql://academic-db-<usuario>.turso.io` |
| academic-service | `TURSO_AUTH_TOKEN` | token gerado no Turso |
| academic-service | `AUTH_SERVICE_URL` | URL do auth-service no Render |
| assignment-service | `TURSO_URL` | `libsql://assignment-db-<usuario>.turso.io` |
| assignment-service | `TURSO_AUTH_TOKEN` | token gerado no Turso |
| assignment-service | `AUTH_SERVICE_URL` | URL do auth-service no Render |
| assignment-service | `ACADEMIC_SERVICE_URL` | URL do academic-service no Render |
| frontend | `VITE_AUTH_URL` | URL do auth-service no Render |
| frontend | `VITE_ACADEMIC_URL` | URL do academic-service no Render |
| frontend | `VITE_ASSIGNMENT_URL` | URL do assignment-service no Render |

> As tabelas são criadas automaticamente pelo `init()` na primeira inicialização de cada serviço.

### 4. Configurar Deploy Hooks (CD automático)

Copie os Deploy Hooks de cada serviço no Render e adicione como secrets no GitHub:

```
Render Dashboard → Serviço → Settings → Deploy Hook → copiar URL
```

```bash
gh secret set RENDER_HOOK_AUTH       --repo ccarloss01/academico-gerencia \
  --body "https://api.render.com/deploy/srv-XXXX?key=XXXX"

gh secret set RENDER_HOOK_ACADEMIC   --repo ccarloss01/academico-gerencia \
  --body "https://api.render.com/deploy/srv-XXXX?key=XXXX"

gh secret set RENDER_HOOK_ASSIGNMENT --repo ccarloss01/academico-gerencia \
  --body "https://api.render.com/deploy/srv-XXXX?key=XXXX"

gh secret set RENDER_HOOK_FRONTEND   --repo ccarloss01/academico-gerencia \
  --body "https://api.render.com/deploy/srv-XXXX?key=XXXX"
```

---

## Executar localmente

### Pré-requisitos

- Docker e Docker Compose instalados

### Subir todos os serviços

```bash
cd plataforma/infra
docker compose up --build
```

Para resetar os dados:

```bash
docker compose down -v && docker compose up --build
```

Endpoints disponíveis:

| Serviço | URL |
|---|---|
| Frontend | http://localhost:8080 |
| auth-service | http://localhost:3001 |
| academic-service | http://localhost:3002 |
| assignment-service | http://localhost:3003 |
| Grafana | http://localhost:3000 (admin/admin) |
| Prometheus | http://localhost:9090 |

> Localmente cada serviço usa um arquivo SQLite em `/data/*.db` dentro do container, persistido em volume Docker. Não é necessária conta no Turso para rodar localmente.

### Exemplo de uso via curl

```bash
# 1. Registrar professor
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Prof. Silva","email":"silva@uni.br","senha":"123456","tipo":"professor"}' | jq

# 2. Login (guarda o token)
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"silva@uni.br","senha":"123456"}' | jq -r '.token')

# 3. Criar disciplina
curl -s -X POST http://localhost:3002/disciplinas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Engenharia de Software","codigo":"ES101","carga_horaria":60}' | jq

# 4. Criar atividade
curl -s -X POST http://localhost:3003/atividades \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"turma_id":1,"titulo":"Trabalho Final","descricao":"Microsserviços","prazo":"2026-12-01T23:59:00Z"}' | jq
```

---

## Decisões técnicas

| Decisão | Escolha | Justificativa |
|---|---|---|
| **Linguagem backend** | Node.js + Express | Ecossistema maduro, boa performance para APIs REST |
| **Frontend** | React + Vite | Build rápido, SPA adequada para o perfil da aplicação |
| **Banco de dados** | Turso (libSQL/SQLite) | Database-per-service gratuito; @libsql/client compatível com SQLite local e Turso cloud |
| **Isolamento de dados** | Database-per-service | Cada serviço tem seu próprio banco isolado (auth_db, academic_db, assignment_db) |
| **Autenticação** | JWT (Bearer token, 8h) | Stateless, fácil de validar entre serviços sem sessão centralizada |
| **Comunicação entre serviços** | REST (HTTP direto) | Sem overhead de message broker; fácil de depurar |
| **Hash de senha** | bcrypt (salt rounds 10) | Padrão da indústria, resistente a ataques de força bruta |
| **Containers** | Docker + Compose | Ambiente reproduzível localmente com orquestração simples |
| **CI** | GitHub Actions | Nativo ao GitHub, gratuito para repositórios públicos |
| **Registry de imagens** | GHCR (ghcr.io) | Integrado ao GitHub, sem custo adicional |
| **Deploy** | Render | Free tier com Deploy Hooks para CD automático |
| **Versionamento** | Conventional Commits + bump automático | Versão semântica rastreável sem intervenção manual |
| **Branch strategy** | Trunk-Based Development | Ciclos de integração curtos, menos conflitos de merge |
| **Observabilidade** | Prometheus + Grafana (apenas local) | Métricas via prom-client; não deployados no Render por ausência de disco persistente no plano free |

### Trade-offs relevantes

**Turso vs. PostgreSQL:** a migração de PostgreSQL para Turso permite database-per-service gratuitamente, respeitando a arquitetura de microsserviços. O trade-off é a mudança de SQL dialect (PostgreSQL → SQLite) e a perda de tipos nativos como `TIMESTAMPTZ` e `NUMERIC`, substituídos por `TEXT` e `REAL`.

**REST direto vs. API Gateway:** optou-se por comunicação direta entre serviços por simplicidade. Um gateway adicionaria roteamento centralizado e rate limiting, mas aumentaria a complexidade operacional desnecessariamente.

**JWT sem refresh token:** tokens expiram em 8h e o usuário precisa fazer login novamente. Refresh token com rotação é a evolução natural para versões futuras.

**Prometheus/Grafana local vs. Render:** rodam apenas no Docker Compose local pois o Render free tier não oferece disco persistente para web services.

---

## Estrutura de pastas

```
academico-gerencia/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── cd.yml
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── plataforma/
│   ├── backend/
│   │   └── services/
│   │       ├── auth-service/
│   │       │   ├── src/
│   │       │   │   ├── index.js
│   │       │   │   ├── db.js
│   │       │   │   ├── metrics.js
│   │       │   │   ├── routes/auth.js
│   │       │   │   └── tests/
│   │       │   ├── Dockerfile
│   │       │   └── package.json
│   │       ├── academic-service/
│   │       │   ├── src/
│   │       │   │   ├── index.js
│   │       │   │   ├── db.js
│   │       │   │   ├── metrics.js
│   │       │   │   ├── middleware/auth.js
│   │       │   │   ├── routes/
│   │       │   │   └── tests/
│   │       │   ├── Dockerfile
│   │       │   └── package.json
│   │       └── assignment-service/
│   │           ├── src/
│   │           │   ├── index.js
│   │           │   ├── db.js
│   │           │   ├── metrics.js
│   │           │   ├── middleware/auth.js
│   │           │   ├── routes/
│   │           │   └── tests/
│   │           ├── Dockerfile
│   │           └── package.json
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── api.js
│   │   │   └── ...
│   │   └── package.json
│   └── infra/
│       ├── docker-compose.yml
│       ├── prometheus/
│       │   └── prometheus.yml
│       └── grafana/
│           ├── provisioning/
│           └── dashboards/
├── render.yaml
└── README.md
```
