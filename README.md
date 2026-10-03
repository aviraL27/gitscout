# 🔭 GitScout

> **AI-Powered GitHub Developer Discovery & Qualification Engine**  
> Built for **Hacktoberfest 2026 × GDG Cloud Nagpur** • Sponsored by **Major League Hacking (MLH)**

[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026-orange?style=for-the-badge&logo=hacktoberfest)](https://hacktoberfest.com/)
[![GDG Cloud Nagpur](https://img.shields.io/badge/GDG%20Cloud-Nagpur-blue?style=for-the-badge&logo=googlecloud)](https://gdg.community.dev/)
[![Sponsored by MLH](https://img.shields.io/badge/Sponsored%20by-MLH-red?style=for-the-badge&logo=majorleaguehacking)](https://mlh.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

### 🌐 Live Production Deployments

- **Frontend Application:** [https://gitscout-web.onrender.com](https://gitscout-web.onrender.com)
- **Backend API & Health:** [https://gitscout-api-3h18.onrender.com/api/health](https://gitscout-api-3h18.onrender.com/api/health)

---

## 💡 What is GitScout?

GitScout turns conversational talent and skill requirements into precision developer discovery on GitHub. 

Enter a requirement like:
> *"Find developers in India who have built LLM and RAG applications with active open-source projects"*

GitScout will:
1. **Plan multi-angle searches** across GitHub users and repositories.
2. **Collect and deduplicate candidate profiles**.
3. **Deep-enrich candidates** with their public profile metadata and actual repository codebases.
4. **Qualify candidates using Gemma 4** against an objective, evidence-based rubric (no hallucinations).
5. **Draft personalized, context-aware outreach emails** mentioning specific repositories.

---

## 🏛️ System Architecture

```text
User Natural-Language Requirement
               │
               ▼
   ┌───────────────────────┐
   │    Search Planner     │ ── Deterministic keyword & query decomposition
   └───────────────────────┘
               │
               ▼
   ┌───────────────────────┐
   │   GitHub Search API   │ ── User search + repository search queries
   └───────────────────────┘
               │
               ▼
   ┌───────────────────────┐
   │  Candidate Discovery  │ ── Top developer usernames collected & deduplicated
   └───────────────────────┘
               │
               ▼
   ┌───────────────────────┐
   │ Candidate Enrichment  │ ── Fetches profile, bio, followers & top public repos
   └───────────────────────┘
               │
               ▼
   ┌───────────────────────┐
   │  Gemma 4 Evaluator    │ ── Google AI API / Local Ollama (evidence & scoring)
   └───────────────────────┘
               │
               ▼
   ┌───────────────────────┐
   │  Real-Time Dashboard  │ ── Ranked candidate cards, evidence badges & outreach
   └───────────────────────┘
```

### Monorepo Structure

```text
gitscout/
├── apps/
│   ├── api/                     # Node.js + Express + TypeScript backend
│   │   ├── src/
│   │   │   ├── candidates/      # Candidate discovery & GitHub enrichment engine
│   │   │   ├── db/              # SearchJobStore (in-memory / extensible to PostgreSQL)
│   │   │   ├── gemma/           # AIRouter (Gemma 4 Cloud API + Ollama fallback) & CandidateEvaluator
│   │   │   ├── github/          # GitHubClient (authenticated, rate-limit tracker, retries)
│   │   │   ├── routes/          # Express REST API endpoints (/api/search, /api/health)
│   │   │   └── search/          # SearchPlanner (deterministic multi-query generator)
│   └── web/                     # React 19 + Vite + Tailwind CSS frontend
│       ├── src/
│       │   ├── components/      # CandidateCard, SearchFilters, MetricBadges
│       │   ├── pages/           # SearchPage, ResultsPage
│       │   └── lib/             # API client & fetch wrappers
└── packages/
    └── shared/                  # Universal Zod schemas & TypeScript contracts
        └── src/
            ├── schemas.ts       # CandidateSchema, SearchCriteriaSchema, EvaluationSchema
            └── types.ts         # Inferred TypeScript interfaces
```

---

## 🧠 Gemma 4 Qualification & Transparent Scoring

GitScout never lets AI invent skills. Evaluation runs against a transparent, verifiable scoring framework:

| Signal | Weight | Verification Criteria |
|---|---|---|
| **Location Match** | `+20 pts` | Profile location matches requested city or country |
| **Skill Match** | `+25 pts` | Bio, repository topics, or descriptions mention required tech |
| **Language Match** | `+15 pts` | Primary repository languages align with criteria |
| **Repository Evidence** | `+25 pts` | Concrete repositories demonstrating real implementation |
| **Recent Activity** | `+15 pts` | Commits or updates pushed in the last 6 months |

### Model Architecture (`AIRouter`)

1. **Primary**: **Gemma 4** (`gemma-4-26b-a4b-it` / `gemma-4-31b-it`) hosted on Google AI API.
2. **Resilience Fallback**: `gemini-3.8-flash` for high-throughput cloud evaluation.
3. **Local Offline Option**: Ollama runner (`gemma4:12b`) for air-gapped local environments.
4. **Deterministic Backup**: Zero dropped candidates if network or AI rate limits occur.

---

## ⚙️ Local Development Setup

### 1. Prerequisites

- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`
- A **GitHub Personal Access Token** ([Generate token](https://github.com/settings/tokens) with `read:user`, `public_repo`).
- A **Google Gemini / Gemma API Key** ([Google AI Studio](https://aistudio.google.com/)).

### 2. Clone the Repository

```bash
git clone https://github.com/aviraL27/gitscout.git
cd gitscout
```

### 3. Configure Environment Variables

Create `.env` in the project root:

```env
# GitHub Personal Access Token (5,000 requests/hour limit)
GITHUB_TOKEN=ghp_your_github_token_here

# Google AI Studio API Key for Gemma 4
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Local Ollama configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:12b

# Optional: Port configuration
PORT=3001
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Development Servers

Run backend and frontend concurrently:

```bash
# Start backend API (http://localhost:3001)
npm run dev:api

# In a second terminal, start frontend (http://localhost:5173)
npm run dev:web
```

Open `http://localhost:5173` in your browser.

---

## 🚀 Production Deployment (Render)

GitScout is pre-configured for deployment on [Render](https://render.com):

### 1. Backend Web Service (`gitscout-api`)

- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm run start --workspace=@gitscout/api`
- **Environment Variables:**
  - `GITHUB_TOKEN`: Your GitHub PAT
  - `GEMINI_API_KEY`: Your Gemini/Gemma API Key
  - `NODE_ENV`: `production`

### 2. Frontend Static Site (`gitscout-web`)

- **Build Command:** `npm install && npm run build --workspace=@gitscout/web`
- **Publish Directory:** `apps/web/dist`
- **Environment Variables:**
  - `VITE_API_BASE`: `https://<your-backend-service>.onrender.com/api`
- **Redirects/Rewrites:**
  - `/*` $\rightarrow$ `/index.html` (Rewrite for React Router SPA navigation)

---

## 🤝 Contributing for Hacktoberfest 2026

We welcome open-source contributions from participants of **Hacktoberfest 2026**, **GDG Cloud Nagpur**, and the **MLH community**!

1. **Fork** the repository.
2. Create a feature branch: `git checkout -b feature/awesome-addition`
3. Commit your changes: `git commit -m "Add awesome feature"`
4. Push to branch: `git push origin feature/awesome-addition`
5. Open a **Pull Request** referencing the issue you solved.

### Contribution Ideas:
- [ ] Add PostgreSQL adapter for `SearchJobStore`
- [ ] Add export to CSV / JSON for qualified candidate lists
- [ ] Add LinkedIn / Twitter enrichment connectors
- [ ] Add support for additional local LLM backends (vLLM, LMStudio)

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

*GitScout is proudly built and maintained by [Aviral](https://github.com/aviraL27) for Hacktoberfest 2026 × GDG Cloud Nagpur, sponsored by Major League Hacking (MLH).*
