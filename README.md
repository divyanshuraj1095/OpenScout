<div align="center">

# OpenScout

**Discover beginner-friendly open-source issues — powered by GitHub, classified by difficulty, explained by AI.**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active%20Development-orange)

</div>

---

## Overview

OpenScout is a backend service that indexes GitHub repositories, extracts their issues, and enriches them with intelligent classification and AI-generated explanations — making open-source contribution accessible to developers at every level.

---

## Features

| Feature | Description |
|---|---|
| 🔍 Repository Indexing | Fetch and store repos by URL with stars, language, and description |
| 📌 Issue Extraction | Pull and persist all issues from any indexed repository |
| 🧠 Difficulty Classification | Auto-classify issues as `Beginner` or `Intermediate` |
| 🏷️ Smart Filtering | Filter by `label`, `language`, and `difficulty` via query params |
| 🔎 Full-text Search | Search issues across titles and descriptions |
| 🤖 AI Explanations | Groq-powered breakdowns: skills needed, approach, difficulty rating |

---

## Tech Stack

- **Runtime**: Node.js + Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **External APIs**: GitHub REST API, Groq LLM

---

## Project Structure
src/
├── routes/
│   ├── repoRoute.ts
│   └── aiRoute.ts
├── services/
│   ├── githubService.ts
│   └── groqService.ts
├── utils/
│   └── classifyDifficulty.ts
├── prompts/
│   └── explainIssuePrompt.ts
└── config/
└── db.ts

---

## API Reference

### Repositories

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/repo` | Add a repo by URL — fetches metadata and seeds issues |
| `GET` | `/repo/:id/issues` | Get all issues scoped to a specific repository |

**Request body for `POST /repo`:**
```json
{ "repoUrl": "https://github.com/owner/repo" }
```

### Issues

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/issues` | List all issues with optional filters |
| `GET` | `/issue/:id` | Fetch a single issue by ID |
| `GET` | `/search?q=keyword` | Full-text search across titles and descriptions |

**Query params for `GET /issues`:** `label`, `difficulty`, `language`

### AI

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ai/explain/:id` | Get an AI explanation for any indexed issue |

**AI explanation includes:**
- Plain-language summary
- Required skills
- Suggested approach
- Difficulty rating
- Beginner-friendly guidance

---

## Roadmap

- [ ] JWT authentication
- [ ] Issue bookmarking / saved lists
- [ ] Pagination for large repositories
- [ ] Repository refresh / re-sync
- [ ] Frontend dashboard
- [ ] Redis caching
- [ ] Docker deployment

---

## Status

🟡 **Active development** — Backend complete · AI integration in progress

---

## Author

**Divyanshu Raj** — B.Tech IT, CUSAT  
[GitHub](https://github.com/your-handle) · [LinkedIn](https://linkedin.com/in/your-handle)