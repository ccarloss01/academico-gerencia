# Plataforma Acadêmica

Sistema de gerenciamento acadêmico baseado em microsserviços Node.js, PostgreSQL e React.
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

A plataforma é composta por três microsserviços independentes, um frontend SPA e bancos de dados isolados por serviço (database-per-service pattern).

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
┌──────┴───────┐ ┌──────────────┐ ┌──────────────────────┐
│   auth_db    │ │ academic_db  │ │   assignment_db      │
│  PostgreSQL  │ │  PostgreSQL  │ │     PostgreSQL        │
│   :5433      │ │   :5434      │ │       :5435           │
└──────────────┘ └──────────────┘ └──────────────────────┘
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
    │                           │── INSERT entregas         │
    │◄── 201 { entrega } ───────│

Professor                 assignment-service
    │                           │
    │── PATCH /entregas/1/nota ─►│
    │                           │── UPDATE nota = 8.5       │
    │◄── 200 { entrega } ───────│
```

### Modelo de dados (resumido)

```
[usuarios]──────┐
  id            │ auth_db
  nome          │
  email         │
  senha_hash    │
  tipo          │
                │
[professores]   │ academic_db
  id            │
  user_id ──────┘ (referência lógica, sem FK cross-db)
  departamento

[alunos]        academic_db
  id
  user_id
  matricula
  curso

[disciplinas]   academic_db
  id
  nome
  codigo
  carga_horaria

[turmas]        academic_db
  id
  disciplina_id
  professor_id
  semestre
  horario

[matriculas]    academic_db
  id
  turma_id
  aluno_id

[atividades]    assignment_db
  id
  turma_id ── (validado via REST no academic-service)
  titulo
  descricao
  prazo

[entregas]      assignment_db
  id
  atividade_id
  aluno_id
  data_entrega
  nota
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
│  │ npm install  │  │ npm install  │  │npm install│  │
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

Exemplos:
```
feat(auth): adicionar refresh token        → v0.2.0
fix(assignment): corrigir conflito de rota → v0.1.1
```

---

## Instruções de deploy

### Pré-requisitos

- Conta no [Render](https://render.com)
- Repositório no GitHub com o `render.yaml` na raiz

### Deploy automático via render.yaml (recomendado)

O arquivo `render.yaml` na raiz do repositório define todos os recursos.
Basta conectar o repositório ao Render e ele provisionará tudo automaticamente:

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **New → Blueprint**
3. Conecte este repositório
4. O Render lerá o `render.yaml` e criará:
   - 3 bancos PostgreSQL (auth-db, academic-db, assignment-db)
   - 3 web services (auth-service, academic-service, assignment-service)
   - 1 site estático (frontend)

### Configurar Deploy Hooks (para o CD automático)

Após o deploy inicial, copie os Deploy Hooks de cada serviço para os secrets do GitHub:

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
```

A partir daí, todo merge na `main` dispara o CD e faz o deploy automaticamente.

### Variáveis de ambiente por serviço

Cada serviço lê as variáveis abaixo (o Render injeta `DATABASE_URL` automaticamente via render.yaml):

| Variável | auth-service | academic-service | assignment-service |
|---|---|---|---|
| `DATABASE_URL` | ✓ (auth_db) | ✓ (academic_db) | ✓ (assignment_db) |
| `JWT_SECRET` | ✓ | — | — |
| `AUTH_SERVICE_URL` | — | `http://auth-service` | `http://auth-service` |
| `ACADEMIC_SERVICE_URL` | — | — | `http://academic-service` |
| `PORT` | 3001 | 3002 | 3003 |

---

## Executar localmente

### Pré-requisitos

- Docker e Docker Compose instalados

### Subir todos os serviços

```bash
cd plataforma/infra
docker compose up --build
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
| **Linguagem backend** | Node.js + Express | Ecossistema maduro, boa performance para APIs REST, equipe familiarizada |
| **Frontend** | React + Vite | Build rápido, SPA adequada para o perfil da aplicação |
| **Banco de dados** | PostgreSQL | Relacional, suporta transações ACID, plano gratuito no Render |
| **Padrão de banco** | Database-per-service | Isolamento de domínio, evita acoplamento via FK cross-service |
| **Autenticação** | JWT (Bearer token, 8h) | Stateless, fácil de validar entre serviços sem sessão centralizada |
| **Comunicação entre serviços** | REST (HTTP direto) | Sem overhead de message broker para o volume atual; fácil de depurar |
| **Hash de senha** | bcrypt (salt rounds 10) | Padrão da indústria, resistente a ataques de força bruta |
| **Containers** | Docker + Compose | Ambiente reproduzível, isolamento de portas e volumes por serviço |
| **CI** | GitHub Actions | Nativo ao GitHub, gratuito para repositórios públicos |
| **Registry de imagens** | GHCR (ghcr.io) | Integrado ao GitHub, sem custo adicional |
| **Deploy** | Render | Free tier com PostgreSQL gerenciado e Deploy Hooks |
| **Versionamento** | Conventional Commits + bump automático | Versão semântica rastreável sem intervenção manual |
| **Branch strategy** | Trunk-Based Development | Ciclos de integração curtos, menos conflitos de merge, deploy contínuo |
| **Observabilidade** | Prometheus + Grafana (local) | Métricas RED (Rate, Errors, Duration) por serviço sem custo em produção |

### Trade-offs relevantes

**REST direto vs. API Gateway:** optou-se por comunicação direta entre serviços por simplicidade.
Um gateway (Kong, Traefik) adicionaria roteamento centralizado e rate limiting, mas aumentaria a complexidade operacional desnecessariamente no estágio atual.

**JWT sem refresh token (v1.0):** tokens expiram em 8h e o usuário precisa fazer login novamente.
A implementação de refresh token com rotação está planejada para v2.0.

**Prometheus local vs. Grafana Cloud:** Prometheus e Grafana rodam apenas no Docker Compose local.
Em produção, o caminho natural é o Grafana Cloud (plano gratuito), que elimina a necessidade de disco persistente no Render.

---

## Estrutura de pastas

```
academico-gerencia/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # Lint + testes + audit por serviço
│   │   └── cd.yml          # Versionamento + build + push + deploy
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── plataforma/
│   ├── backend/
│   │   └── services/
│   │       ├── auth-service/       # Autenticação JWT
│   │       │   ├── src/
│   │       │   │   ├── index.js
│   │       │   │   ├── metrics.js
│   │       │   │   └── routes/
│   │       │   ├── Dockerfile
│   │       │   └── package.json
│   │       ├── academic-service/   # Entidades acadêmicas
│   │       └── assignment-service/ # Atividades e entregas
│   ├── frontend/                   # SPA React + Vite
│   └── infra/
│       ├── docker-compose.yml
│       ├── prometheus/
│       │   └── prometheus.yml
│       └── grafana/
│           ├── provisioning/
│           └── dashboards/
├── render.yaml                     # Blueprint de deploy no Render
└── README.md
```
