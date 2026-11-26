# Development schema and migration

Create a dedicated openscout_dev database and restricted role with no legacy database privileges. Require explicit database configuration, verify database name before Flyway, disable clean, use ddl-auto=validate. Keep Prisma migration history separate. All relationships below require foreign keys. Use timestamptz in UTC and non-null keys.

| Relation | Identity and constraints |
|---|---|
| users, preferences | Internal user PK, unique normalized email, bcrypt hash, name and profile URL. Preferences keyed by user FK. Derive imported count from memberships. |
| repositories | Internal PK, unique github_repository_id BIGINT, owner, name, canonical URL, visibility, language, description, stars, last successful sync. Update mutable metadata on rename. |
| user_repositories | Composite PK (user_id,repository_id), imported_at. Removing a mapping removes only that user's associated data. |
| issues | Internal PK, repository FK, github_issue_id BIGINT unique, positive issue number unique within repository, canonical URL, title, body, labels text[], open/closed state, difficulty, upstream updated_at. Java Long and decimal JSON strings for GitHub IDs. |
| bookmarks | PK (user_id,issue_id), repository_id. Composite FKs to membership and (repository_id,issue_id) on issues, backed by a matching unique key. |
| chat_sessions, chat_messages | Session PK with membership FK, created_at. Messages reference session and store role, body, citations and sequence unique within session. |
| repository_indexes | PK (repository_id,version), commit SHA, model revision, dimensions, chunker version, status and manifest counts. Partial unique index permits one active generation per repository. |
| repository_files | PK (repository_id,version,path), index FK, content hash, byte length. Immutable per commit. |
| indexing_jobs | Job PK, index FK, status, attempts, progress, error code, next attempt, lease owner, expiry, fencing counter. Unique index per generation job. Index runnable status/time. |
| vector_store | Chunk PK, FK to versioned file, unique file/ordinal, positive inclusive line range, text, content hash, commit SHA, model revision, dimension and embedding. Match provenance to parent generation by composite FK. CHECK vector_dims(embedding)=dimension. |

Start with exact cosine search on version-filtered rows and btree on (repository_id,version). Compare only compatible model spaces. Introduce dimension-specific ANN indexes after recall and latency measurements. A model change builds a fresh generation. Keep retired chunks through citation retention or retain immutable citation snapshots.

Rehearse on an explicitly authorized sanitized export. Resolve public repository identities via GitHub, group duplicate rows, retain original membership, remap issues by remote ID, deduplicate bookmarks after remapping. Quarantine null owners, unresolved/private repositories, email collisions and unauthorized bookmarks. Preserve verified bcrypt hashes, force fresh sessions. Record source-to-target IDs, counts, rejected rows and reconciliation totals. Re-run idempotently on a disposable copy. Production export, write freeze, final delta, backup/restore rehearsal and cutover each require an approved release plan. Route back to Node before accepting divergent writes or reconcile post-cutover writes before rollback.
Phase 4 requires a PostgreSQL unique partial index on indexing_jobs(repository_id) WHERE status IN ('queued','running','retrying'). Atomically insert with matching ON CONFLICT predicate and return existing active job on conflict, retrying if it became terminal. Lease reclaim updates the same row. Race simultaneous requests on independent connections and assert one active row throughout retries.
The Phase 1 physical user table is accounts. login_sessions references its UUID primary key and stores the server-side expiry. Later membership FKs reference accounts.
