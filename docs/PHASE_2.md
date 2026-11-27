# Catalog implementation and verification

**Identity and transactions.** V2__catalog.sql uses GitHub's 64-bit repository ID as the shared primary key, an internal identity for local issue links, and unique remote issue ID and (repository,number). The bookmark references both an accessible membership and the issue's repository. Database constraints protect concurrent inserts independently of controller checks.

**Import.** CatalogController.add gets the UUID from the signed principal. Github.slug validates the whole HTTPS URL. Github.fetch requests public metadata and traverses numbered GitHub issue pages while Link advertises a successor. It sends credentials only to the fixed API origin, skips pull requests, and stages a complete snapshot. Timeouts, upstream errors and the 100-page ceiling abort before writing. CatalogWriter.apply is a separate transactional Spring bean so proxy interception covers the entire write. Repository upsert serializes competing writes to that repository. Membership insert determines 201 versus 200. CatalogWriter.write expands each JSON array into typed PostgreSQL rows and upserts issues in chunks of 250. Update timestamps prevent older issue data replacing newer data. The CTE counts new versus changed records against the statement snapshot. A failed batch rolls back the repository, membership and all issue batches. Classification prioritizes advanced/hard/expert, then easy/beginner/good first issue, then Intermediate.

**Refresh.** The controller resolves the slug through the caller's membership before contacting GitHub and checks that the fetched public repository still has the requested ID. Fetching state=all allows closed and reopened issues to update in place. Missing upstream entries do not imply closure. Rename redirects, transferred/deleted issues and immediate visibility revocation between synchronizations require further handling before deployment. GitHub pagination is a moving view; simultaneous upstream edits may need a subsequent refresh.

**Reads and bookmarks.** CatalogController.list builds parameterized predicates atop a membership join. Keyword search uses literal case-insensitive substring matching on title and body. Order is updated time then local ID, with one-based pages and limit 1–100. Multi-request offset pages can shift during refresh. Bookmark writes lock the membership for the transaction. PUT and DELETE are idempotent; a missing or foreign issue returns 404. User IDs never come from client input.

**Security change.** SecurityConfig admits only the catalog path families for authenticated callers and includes PUT/DELETE in exact-origin CORS. Cookie authentication uses a request-local security context. Login and logout still invalidate the CSRF session. The session management filter previously interpreted successive JWT requests as new logins and replaced the CSRF token. Consecutive protected writes are now tested.

**Tests and harness.** IdentityIntegrationTest covers the HTTP boundary with PostgreSQL and retains Phase 1 regression tests. FixtureConfig substitutes local/test snapshots exclusively in tests. GithubTest exercises all-page traversal, credentials, PR filtering, private/failed responses, URL parsing and label priority. benchmarks/fixture.cjs serves identical deterministic metadata and issues; node.cjs mounts the original Express router and JWT middleware, redirects Axios GitHub reads to the fixture, times responses and verifies row counts. run.ps1 orchestrates independent disposable databases. See BENCHMARKS.md for raw files and measurements.

## Manual verification

Start the isolated backend and authenticate using backend/README.md. Fetch a fresh CSRF token after login. Retain that cookie jar for these requests. Optional OPENSCOUT_GITHUB_TOKEN increases available upstream quota; use public-read scope only.

| Request relative to /api/v1 | Expected |
|---|---|
| POST /repositories with {"repoUrl":"https://github.com/octocat/Hello-World"} | On success 201 with string repository ID, added flag and counts. Repeat returns 200. |
| GET /repositories?page=1&limit=10 | Only caller's repositories. |
| POST /repositories/{id}/refresh | 200 with counts after complete sync. |
| GET /issues?repositoryId={id}&state=open&page=1&limit=5 | Stable page, labels and local issue IDs. Combine q, label, language and difficulty to narrow it. |
| GET /issues/{issueId} | Issue detail and canonical upstream link. |
| PUT /bookmarks/{issueId} twice, then GET /bookmarks | One personal bookmark. |
| DELETE /bookmarks/{issueId} twice | 204 both times. |
| New account before importing same repo | Issue detail, refresh and bookmark mutation return 404. After import, issue IDs match and bookmarks remain personal. |

Send X-CSRF-TOKEN on every mutation. Remove it to verify 403. A page limit above 100 returns 400. Use the fixture tests for reproducible closed-state updates without modifying upstream data.
Account now stores an optional validated GitHub profile URL and a creation timestamp for new accounts. Creation time stays unknown for pre-V2 accounts. Accounts.importedCount derives openedRepos from actual memberships. IdentityController includes these fields in profile responses. The public OpenAPI document now includes catalog operations.

## Phase 2 hardening

Launch the packaged backend through OpenScout.main to set the JVM default to UTC before Spring starts. The backend Maven JVM and Surefire forks also select UTC. Hikari initializes each database connection in UTC and Hibernate binds JDBC timestamps in UTC. Compose configures the database clock and log timestamps, including on existing development volumes. The backend CI workflow uses Temurin 21 and Docker on the Linux runner. Production deployment should set TZ=UTC and JAVA_TOOL_OPTIONS=-Duser.timezone=UTC for startup logs and processes outside the application. Production infrastructure deployment is a separate operation.

Import resolves a validated slug. Github.get accepts one permanent redirect to a numeric repository endpoint on the same API origin. Refresh authorizes the membership and fetches metadata by numeric ID so reusing the old slug cannot silently change the repository. After reading every issue page, fetchPath checks public visibility and identity again. The client computes each page URL locally. A next link on page 100, duplicate issue across pages, upstream failure or invalid response aborts the snapshot before catalog writes.

CatalogWriter.apply locks the repository through its upsert. A database timestamp captured before the fetch prevents an older request from replacing a newer committed sync of the same repository. The transaction deletes missing issues and removes prior rows for transferred GitHub IDs before batch writes. Cascading foreign keys remove associated bookmarks. A transferred issue receives a fresh local ID under the destination membership. Refresh returning upstream 404 or explicit nonpublic visibility invalidates the repository across memberships. Transient failures leave the last successful snapshot subject to its existing expiry.

Catalog and profile reads require a public check within five minutes. Expired repositories disappear from lists, but members can refresh a known ID or import the URL again. This bounds exposure after an unobserved visibility change. The migration leaves preexisting rows hidden until revalidated. Cached rows stay in the database. Future retrieval will need its own authorization and visibility checks before using cached content.

GitHub page-number pagination has no snapshot isolation. Concurrent upstream edits may move an issue between pages without producing a duplicate. A subsequent full sync repairs discrepancies. Independent, overlapping source and destination syncs can also observe a transfer at different times. A failed or conflicting sync can be retried. The 100-page bound includes pull requests, which the catalog filters after retrieval.

### Reproduce

From the backend directory with Docker Desktop running and Temurin 21 selected, use PowerShell:

```powershell
Remove-Item Env:OPENSCOUT_TEST_PORT -ErrorAction SilentlyContinue
$env:OPENSCOUT_LIVE='true'
.\mvnw.cmd -B dependency:tree clean verify
```

The opt-in test signs in to the real application, imports octocat/git-consortium anonymously from GitHub, then refreshes the ID returned by the API. External outages and GitHub rate limits can fail this test. Normal CI uses deterministic fixtures. The integration suite uses a fresh PostgreSQL Testcontainer. For a manual expiry check, import a public repository, record its ID, wait five minutes, then list repositories, issues and bookmarks. Refresh the recorded ID and confirm that its public contents reappear.

### Files for review

| Area | Files created or modified for hardening |
|---|---|
| Runtime and CI | backend/.mvn/jvm.config, backend/pom.xml, backend/compose.yaml, .github/workflows/backend.yml, backend/src/main/resources/application.properties, OpenScout.java |
| Persistence and access | V3__catalog_visibility.sql, CatalogController.java, CatalogWriter.java, Github.java, Accounts.java |
| Verification | FixtureConfig.java, GithubTest.java, IdentityIntegrationTest.java, benchmarks/fixture.cjs |
| Evidence and documentation | benchmarks/sequential-phase2-hardening.json, benchmarks/batch-phase2-hardening.json, docs/BENCHMARKS.md, docs/PHASE_2.md |

Suggested commit message: Harden Phase 2 GitHub synchronization and public catalog access
Verification on 2026-11-27 used Temurin 21.0.13.1, Maven 3.9.11 and PostgreSQL 17 on Docker Desktop. The effective dependency tree resolved Spring Boot 4.0.10. The final clean verify packaged the application with 11 passing tests and the opt-in benchmark skipped. The live import and refresh passed. Both benchmark arms passed separately. Hosted CI and production deployment were not exercised.
