# Phase 0 source audit

Scope: the 78 tracked files in this checkout. This is a static review. Deployment settings, database contents, provider behavior and runtime performance are unverified.

| Finding | Source evidence and impact |
|---|---|
| 1. Explanation authorization | server.ts mounts authUser before aiRouter, but GET /explain/:id looks up only the issue primary key. A logged-in user can request another user's issue. |
| 2. Incomplete GitHub pagination | repoRoute.ts requests open issues with per_page=100 once and filters pull requests afterward. Local Prisma skip/take pagination cannot recover missing upstream pages. |
| 3–4. Refresh drift | GET /repo/:id/refresh scopes the repository to the caller, skips known IDs, inserts unseen records and omits githubHeaders. Edits, label changes and closures go stale. |
| 5. Partial imports | Repository.create precedes awaited issue.create calls in a loop. A failure can leave an incomplete repository that a retry encounters as existing. |
| 6–7. Identity | schema.prisma has nullable Repository.userId, no stable remote repository ID and no composite uniqueness on Issue or Bookmark. Concurrent check-then-create paths can duplicate rows. |
| 8. Difficulty | classifyDifficulty.ts returns Beginner for matching labels and otherwise Intermediate. The frontend Issue interface also supports Advanced. |
| 9. URL parsing | repoRoute.ts checks a github.com substring and splits user input. Checking includes before checking type also permits type errors. |
| 10. Grounding | aiRoute.ts loads repository metadata but passes only title and description to buildIssuePrompt, then explainIssue calls Groq. There are no retrieved chunks or verified citations. |
| 11. Missing infrastructure | Inventory contains no Redis, indexer, vector migrations, automated test suite, Docker build, Compose or Actions workflow. |
| 12. Error contract | AI catches errors into HTTP 200. Auth and repository handlers map diverse failures to 400 and expose exception messages. |

Additional findings: bookmark creation accepts issue IDs without a repository-membership check. Login distinguishes unknown email from incorrect password. The seven-day bearer cookie survives client-side logout if copied. SameSite=None makes explicit CSRF protection important. Refresh mutates state via GET. Issue pagination lacks a maximum limit and stable ordering. Provider model selection is hardcoded in groqService.ts.

The six Prisma migrations introduce the initial schema, widen the GitHub issue ID, add description, users, bookmarks and nullable repository ownership. Unowned legacy rows need explicit disposition. The schema already preserves issue IDs as BIGINT.

React routes, pages, reusable components and hooks live under frontend/src. Axios uses VITE_URL and credentials. Services unwrap different response shapes. Preserve these page-facing contracts through adapters. No runtime tests or builds were run for this documentation change.
