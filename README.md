# 🔭 GitScout

**AI-powered GitHub developer discovery tool.**

Enter a natural-language requirement, and GitScout searches GitHub, enriches developer profiles, and (in Phase 3+) uses Gemma 4 to score and rank candidates.

---

## Quick start

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your GitHub Personal Access Token:

```env
GITHUB_TOKEN=ghp_your_token_here
```

Create a token at <https://github.com/settings/tokens> with scopes: `read:user`, `public_repo`.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the backend

```bash
npm run dev:api
# API available at http://localhost:3001
```

### 4. Start the frontend

```bash
npm run dev:web
# UI available at http://localhost:5173
```

---

## Architecture

```
gitscout/
├── apps/
│   ├── api/         Express + TypeScript backend
│   └── web/         React + Vite + Tailwind frontend
└── packages/
    └── shared/      Shared Zod schemas + TypeScript types
```

### Key services

| Service | Location | Responsibility |
|---|---|---|
| `GitHubClient` | `apps/api/src/github/` | Auth, rate limits, retries |
| `SearchPlanner` | `apps/api/src/search/` | Query generation |
| `CandidateDiscovery` | `apps/api/src/candidates/` | Search + enrichment |
| `SearchJobStore` | `apps/api/src/db/` | In-memory job state |

### API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/search` | Start a search job |
| `GET` | `/api/search/:id` | Poll job status + results |
| `GET` | `/api/candidates/:username` | Fetch single GitHub user |
| `GET` | `/api/health` | Health + rate-limit info |

---

## Development phases

- **Phase 1** ✅ — Project setup, GitHub client, search UI, candidate discovery
- **Phase 2** — Candidate enrichment + SQLite persistence
- **Phase 3** — Gemma 4 qualification + relevance scoring
- **Phase 4** — Candidate dashboard + detail pages
- **Phase 5** — Personalized outreach generation

---

## Rate limits

Without a token: **60 requests/hour** (unauthenticated).  
With a token: **5,000 requests/hour**.

The API displays remaining rate-limit info in the health endpoint and server logs.
