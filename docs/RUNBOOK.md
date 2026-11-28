# Local asynchronous indexing

Use the existing development Compose database, scoped development credentials and UTC configuration from backend/README.md. Back up any populated local database before applying Flyway V5. Testcontainers creates disposable databases for verification. Production requires separate approval.

1. Start Docker Desktop and local Ollama with nomic-embed-text and qwen2.5:3b installed. From backend run the existing development application. Flyway creates four tables and the partial unique indexes.
2. Sign in, acquire the current CSRF header and cookie, and import a small public repository. POST to /api/v1/repositories/{id}/indexes using the same cookie and CSRF header. The 202 body contains jobId and statusUrl. Repeat during the run and check that the identifier matches.
3. GET statusUrl with the session cookie. Progress counts manifest entries scanned. Embeddings and promotion can still be pending when completed equals total. If the Phase 2 catalog visibility window expires, refresh the repository before polling again.
4. After succeeded, POST {"question":"What does the README describe?"} to /api/v1/repositories/{id}/indexes/active/questions with CSRF. Verify indexVersion and any commit-pinned citations. An empty or weak index returns an ungrounded answer. Missing or incompatible active generations return 409.
5. In development, inspect indexing_jobs for ready_at, fence, lease_until, commit_sha and error_code. A retrying job becomes eligible after its delay. A stopped worker leaves a running lease for recovery. Disable polling on an application instance with index.worker.enabled=false. Avoid deleting rows to unstick jobs. Expired leases are reclaimable on restart.
6. Run benchmarks/phase4/run.ps1 -Live from a separate checkout to reproduce the matrix, regression suite and smoke test. The script rewrites only Phase 4 measurements. Docker, Java 21, local Ollama and anonymous public GitHub connectivity are required for the complete run.
