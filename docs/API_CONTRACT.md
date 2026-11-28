# Proposed /api/v1 contract

JSON, cookie authentication, exact credentialed CORS origin and CSRF token header on unsafe methods including login. GET /auth/csrf bootstraps the token. Rotate session at login, expire/revoke on logout. Validate JWT algorithm, expiry, issuer and audience. Prefer same-site deployment, Secure HttpOnly session cookie. All repository operations require membership except public import. Derive user from principal. Return 404 for inaccessible objects.

| Method and relative path | Request and success |
|---|---|
| POST /auth/signup, POST /auth/login, POST /auth/logout | Signup {name,email,password,gitHubURL?} → 201 profile; login {email,password} → 200 profile and cookie; logout → 204. |
| GET /me, PUT /me/preferences | Profile or updated preference object, 200. |
| POST /repositories | {repoUrl} → 201 membership with repository or 200 existing. Parse HTTPS github.com with exactly owner/name, no credentials, port, query or fragment. Resolve via fixed GitHub API origin and verify public. |
| GET /repositories, POST /repositories/{r}/refresh | Member repositories; refresh returns 200 with inserted/updated counts after complete sync. |
| GET /issues, GET /issues/{i} | List accepts repositoryId, q, language, label, difficulty, state, page (1-based), limit (1–100). Stable order by updated time then ID. Detail includes repository, issue number, source URL and labels. |
| GET /bookmarks, PUT or DELETE /bookmarks/{issueId} | Current user's page; idempotent mutations → 204. |
| POST /repositories/{r}/indexes, GET /repositories/{r}/jobs/{j} | 202 {jobId,statusUrl}; poll 200 {status,completed,total,errorCode?}. States queued/running/retrying/succeeded/failed. |
| POST /repositories/{r}/search | {query,mode,limit} → 200 ranked matches with source references. Modes semantic and later hybrid. |
| POST /issues/{i}/explanations | Ground on issue and active repository index. 200 answer envelope. |
| POST /repositories/{r}/chats, POST /repositories/{r}/chats/{c}/messages | Create session → 201 {id}; {question} → 200 answer envelope. Validate session owner and repository. |
| GET /repositories/{r}/chats/{c}/messages, GET /me/recommendations | Owner-only history and personalized issue page. |

Lists return {items,page,limit,total}; answer envelope {answer,grounded,indexVersion,citations:[{chunkId,path,startLine,endLine,commitSha,url}]}. Ungrounded response has empty citations. Serialize IDs as strings; adapt frontend internal ID types together. Errors use Problem Details with status, title, code and requestId. Use 400 invalid input, 401 invalid session, 403 CSRF, 404 missing/inaccessible, 409 conflict or index unavailable, 429 quota with Retry-After and 503 transient dependency failure. Never echo provider exception text.
Phase 1 uses same-origin production proxying, host-only cookies, explicit CSRF request header X-CSRF-TOKEN and exact credentialed CORS. Browser checks include blocked third-party cookies.
Phase 1 signup accepts name, email and password. Profile returns id, name and email. Optional GitHub profile metadata belongs to the parity phase. The checked-in backend OpenAPI file describes implemented endpoints.

Phase 4 implements the index request and job status routes above. POST /api/v1/repositories/{r}/indexes/active/questions accepts {question} and returns the Phase 3 answer envelope using an immutable active generation and commit-pinned GitHub citations. All mutations use the existing CSRF header. Status and index access require repository membership and current public visibility. Progress counts scanned eligible manifest entries; a running job can have completed=total while embedding its last batches. succeeded marks atomic publication.
