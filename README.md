<div align="center">

# OpenScout

**Discover beginner-friendly open-source issues — powered by GitHub, classified by difficulty, explained by AI.**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

</div>

---

## Overview

OpenScout is a full-stack AI-powered platform that helps developers discover beginner-friendly GitHub issues, bookmark them for later, and get plain-language AI explanations — making open-source contribution accessible to developers at every level.

Index any public GitHub repository, let OpenScout classify its issues by difficulty, then use the built-in AI mentor (powered by Groq's Llama models) to understand the bug and plan your first contribution.

---

## Features

| Feature | Description |
|---|---|
| 🔍 **Repository Indexing** | Add any public GitHub repo by URL — fetches metadata and seeds all open issues |
| 📌 **Issue Extraction** | Pull and persist all issues from any indexed repository |
| 🧠 **Difficulty Classification** | Auto-classify issues as `Beginner`, `Intermediate`, or `Advanced` |
| 🏷️ **Smart Filtering** | Filter by `label`, `language`, and `difficulty` |
| 🔎 **Full-text Search** | Search issues across titles and descriptions in real time |
| 🤖 **AI Explanations** | Groq-powered Llama breakdowns: skills needed, code approach, first steps |
| 🔖 **Bookmarks** | Save and manage issues across repos in your personal backlog |
| 👤 **Authentication** | Cookie-based JWT auth with signup, login, logout, and profile |
| 📱 **Responsive UI** | Premium Linear/Vercel-inspired design that works on all screen sizes |

---

## Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **External APIs**: GitHub REST API, Groq LLM (Llama 3)
- **Auth**: JWT via HTTP-only cookies

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios (with `withCredentials`)
- **Icons**: Lucide React
- **Fonts**: Inter (Google Fonts)

---

## Project Structure

```
OpenScout/
├── src/                        # Backend source
│   ├── routes/
│   │   ├── authRouter.ts       # POST /signup, /login, /logout, GET /profile
│   │   ├── repoRoute.ts        # Repo & issue routes
│   │   └── bookmarkRoute.ts    # Bookmark CRUD routes
│   ├── services/
│   │   ├── githubService.ts    # GitHub REST API integration
│   │   └── groqService.ts      # Groq LLM integration
│   ├── middlewares/
│   │   └── auth.middleware.ts  # JWT cookie verification
│   ├── utils/
│   │   └── classifyDifficulty.ts
│   ├── prompt/
│   │   └── explainIssuePrompt.ts
│   └── server.ts
├── prisma/
│   └── schema.prisma           # DB schema: User, Repository, Issue, Bookmark
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── services/           # Axios API service layer
│   │   │   ├── api.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── issues.service.ts
│   │   │   ├── bookmarks.service.ts
│   │   │   └── ai.service.ts
│   │   ├── hooks/              # React context hooks
│   │   │   ├── useAuth.tsx
│   │   │   ├── useBookmarks.tsx
│   │   │   └── useIssues.tsx
│   │   ├── components/         # Reusable components
│   │   │   ├── ui/             # Primitives: Button, Input, Card, Badge, etc.
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── IssueCard.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── BookmarkButton.tsx
│   │   │   └── AiExplanationCard.tsx
│   │   └── pages/              # Full pages
│   │       ├── LandingPage.tsx
│   │       ├── LoginPage.tsx
│   │       ├── SignupPage.tsx
│   │       ├── Dashboard.tsx
│   │       ├── IssueExplorer.tsx
│   │       ├── IssueDetailsPage.tsx
│   │       ├── BookmarksPage.tsx
│   │       └── ProfilePage.tsx
│   └── index.html
├── .env                        # Environment variables
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL database
- GitHub Personal Access Token (for API rate limits)
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### 1. Clone & Install

```bash
git clone https://github.com/your-handle/openscout.git
cd openscout

# Backend dependencies
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/openscout"
JWT="your_jwt_secret_here"
GROQ_API_KEY="your_groq_api_key_here"
GITHUB_TOKEN="your_github_pat_here"   # optional but recommended
```

### 3. Database Setup

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run the Application

```bash
# Terminal 1 — Start Backend (port 7777)
npm run dev

# Terminal 2 — Start Frontend (port 5173)
cd frontend
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/signup` | Register a new user |
| `POST` | `/login` | Login and receive JWT cookie |
| `POST` | `/logout` | Clear session cookie |
| `GET` | `/profile` | Get current user profile |

### Repositories

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/repo` | Index a repo by URL |
| `GET` | `/repos` | List all indexed repositories |
| `GET` | `/repo/:id/refresh` | Re-sync issues for a repository |

### Issues

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/issues` | List issues with filters & pagination |
| `GET` | `/issue/:id` | Get a single issue by ID |
| `GET` | `/search?q=keyword` | Full-text search across issues |

**Query params for `GET /issues`:** `page`, `limit`, `label`, `difficulty`, `language`

### Bookmarks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/bookmarks` | Get all bookmarks for the logged-in user |
| `POST` | `/bookmarks/add/:issueId` | Bookmark an issue |
| `DELETE` | `/bookmarks/:issueId` | Remove a bookmark |

### AI

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/explain/:id` | Get a Groq Llama AI explanation for an issue |

**AI explanation includes:** problem summary · required skills · suggested approach · difficulty rating · first file to look at

---

## Pages

| Route | Page | Access |
|---|---|---|
| `/` | Landing Page | Public |
| `/login` | Login | Public |
| `/signup` | Sign Up | Public |
| `/dashboard` | Dashboard — index repos, view stats | Auth required |
| `/explore` | Issue Explorer — search, filter, paginate | Auth required |
| `/issue/:id` | Issue Details + AI Explanation | Auth required |
| `/bookmarks` | Bookmarks Backlog | Auth required |
| `/profile` | Developer Profile | Auth required |

---

## Status

🟢 **Production Ready** — Full-stack complete with backend API, React frontend, authentication, bookmarks, and Groq AI integration.

---

## Author

**Divyanshu Raj** — B.Tech IT, CUSAT  
[GitHub](https://github.com/divyanshuraj1095) · [LinkedIn](https://linkedin.com/in/divyanshuraj1095)