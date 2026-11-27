# Phase 3 · Retrieval from a fixed documentation sample

## What the demonstration answers

The sample answers questions about OpenScout's **target architecture**. Descriptions of planned features in that document describe design intent. Every tenant uses the same bundled, immutable teaching corpus. Importing a GitHub repository provides the authorization scope for its copy. The source link always points to the teaching corpus in OpenScout. For example, a question about durable job state should lead to PostgreSQL and line 7 of the pinned architecture document.

## From source file to searchable rows

1. `SampleController.ingest` reads the account UUID from the authenticated JWT and the repository ID from the route. Spring Security applies the existing session revocation, cookie, CSRF and credentialed CORS configuration. The request supplies neither documents nor upstream URLs.
2. `SampleRag.authorize` runs a parameterized SQL EXISTS over the repository and membership tables. Both the account and repository must match. The public check must be newer than five minutes at the database clock. Unauthorized, expired and missing repositories return 404. Refreshing a known ID through the catalog rechecks GitHub. This inherits the Phase 2 visibility window.
3. `SampleCorpus.load` reads a fixed UTF-8 file from the application classpath. It copies docs/ARCHITECTURE.md at commit 8c9aa3f92c032e09263f8a601d999f948e0bd070. `split` walks lines in source order, closes a chunk at a blank line, eight lines or 1,800 characters, and rejects a source line longer than 1,600 characters. Each chunk records its one-based inclusive span. The first line forms its stable identifier. Paragraph boundaries preserve local meaning in this short fixture. Overlap is zero. Changing chunking rules requires a new chunker revision.
4. `SampleRag.ingest` prefixes passages with `search_document:`. `SpringEncoder.encode` delegates to Spring AI's EmbeddingModel, which submits the input to local Ollama. The pinned Spring AI BOM and Ollama starter resolve to 2.0.2 alongside Spring Boot 4.0.10. The observed nomic-embed-text model produced 768 floats. `vector` rejects other lengths, nonfinite values and zero vectors before binding the vector literal as a JDBC parameter. Cosine direction is undefined for a zero vector.
5. Embeddings are computed before opening a database write transaction. After a second access check, `TransactionTemplate` inserts all chunks atomically. Failure halfway rolls back the transaction. Repeating a successful ingest retains the existing rows using the primary key and ON CONFLICT. The caller still incurs embedding work on a retry. A small fixture allows the complete batch to fit in memory.
6. Flyway migration V4 creates the vector extension and a sample-only table. The composite primary key covers repository, immutable version and chunk ID. Version includes source commit, chunker revision and configured embedding space. The database enforces dimension 768, positive inclusive line ranges and the repository foreign key. An exact scan over one small scoped version needs no approximate index. Future changes to dimensions require a deliberate schema change.

## From question to answer

1. `SampleController.ask` passes the session principal, repository ID and question to `SampleRag.ask`. `retrieve` checks access and rejects blank questions and inputs above 1,000 characters. It embeds the question using the same encoder, with the `search_query:` prefix.
2. JDBC binds the query vector, user, repository and version. SQL filters rows by repository and version and repeats the membership/visibility predicate in the ranking statement. The pgvector operator `<=>` gives cosine distance. Subtracting distance from one yields similarity, so descending scores return the nearest passages first. Chunk ID breaks ties. LIMIT 3 bounds the prompt. A visible repository without this sample version returns 409.
3. `ask` removes candidates below the configured threshold. An empty result returns “Insufficient context.” without a generation call. Otherwise it checks access again, sends a system instruction and a separately serialized JSON object containing the question and candidate passages. Source text is untrusted. There are no registered tools or actions for it to invoke.
4. `GroqGenerator.generate` sends an OpenAI-compatible chat-completions request with temperature zero and a 400-token output cap. `ProviderHttp.post` applies connect/request timeouts, avoids redirect following, requires TLS outside loopback and keeps provider error bodies out of API errors. Missing credentials or provider failures return 503. Credentials come from deployment configuration.
5. `validate` accepts a nonempty verbatim quote only when the model names a chunk in this specific filtered candidate list and that chunk contains the quote. The server constructs the line span and commit-pinned URL. Other output, including invented IDs and malformed JSON, yields an ungrounded answer with an empty citation list. Access is checked once more before releasing a generated answer. Extractive answers constrain invented content. A correct quote can still be irrelevant or misleading in isolation, and the client must render it as untrusted text.

## Provider and database operations

Default embeddings use local Ollama at localhost:11434. OLLAMA_BASE_URL and OLLAMA_EMBED_MODEL change its endpoint and model. EMBEDDING_REVISION labels the installed model digest. Verify the digest after a pull. The label is operator supplied. For a compatible hosted embeddings endpoint set EMBEDDING_PROVIDER=hosted, EMBEDDING_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL and EMBEDDING_REVISION. It must accept the query/document prefixes and emit compatible 768-dimensional vectors. HostedEncoder reads data[0].embedding. Hosted integration was exercised with a loopback HTTP mock. Changing providers or weights requires reingestion. GROQ_API_KEY, GROQ_MODEL and GENERATION_URL configure the generation adapter. Use a scoped free-tier key for the live evaluation. Neither automated CI nor application startup needs a generation key.

Compose keeps the existing PostgreSQL major version, development database name, port and named data volume. Only the image changes to pgvector/pgvector:0.8.1-pg17. Verification used disposable containers. Before switching a populated development instance, take a logical backup and verify its restore in an isolated database. Inspect the old server's minor version, extensions and collation against the target image (tests observed PostgreSQL 17.8). If the existing server is newer, choose a compatible pgvector-enabled PG17 build or perform a tested logical restore to a fresh volume. Keep the original volume and backup. Start the compatible development service with `docker compose up -d db` under backend, then start the application to run Flyway. The migration requires a development role permitted to install the extension or an administrator-provisioned extension. Production rollout is separate.

## Reproduce and inspect

From backend with Docker Desktop running, Java 21 selected and Ollama serving nomic-embed-text:

~~~powershell
Remove-Item Env:OPENSCOUT_TEST_PORT -ErrorAction SilentlyContinue
$env:OPENSCOUT_LIVE_OLLAMA='true'
.\mvnw.cmd -B dependency:tree clean verify
~~~

For the paired local evaluation, install qwen2.5:3b in Ollama and run:

~~~powershell
$env:OPENSCOUT_LIVE_LOCAL_GENERATION='true'
.\mvnw.cmd -B test '-Dtest=SampleRagTest#localGeneration'
~~~

The evaluator executes every generic question before ingesting the fixture and running the RAG arm. It uses the same selected generation adapter, model, output cap, temperature and four questions. It records the baseline separately before retrieval starts. Each RAG response includes the actual citation list, and the elapsed time includes question embedding, SQL, generation when needed and validation. Timing starts at service entry and excludes external HTTP client overhead. Treat timeouts or rate limits as failed runs.

To exercise the API manually, sign in and import a public repository using the Phase 2 instructions. With the authenticated cookie and current X-CSRF-TOKEN header, POST to `/api/v1/repositories/{id}/sample/ingest`. Expect eight chunks. POST `{"question":"Which database provides transactions and durable job state?"}` to `/api/v1/repositories/{id}/sample/questions`. Inspect the quote and open the citation. Repeat with the cafeteria question, then repeat as an account without membership. Expect an ungrounded response and 404 respectively. If a member receives 404 after five minutes, use the Phase 2 refresh endpoint.

## Evaluation and review

The frozen labels live in backend/src/test/resources/rag/questions.json. Recall@3 is the fraction of answerable questions whose gold chunk occurs among the first three. The unsupported question is scored for abstention separately. For generation, grade each answer against its gold fact, count a correct abstention as correct, and inspect each factual claim against the pinned corpus. Citation accuracy counts returned citations that support the answer and identify the labeled chunk, divided by citations returned. Report zero citations as an undefined rate. A baseline answer can be factually correct without a citation. Preserve raw responses and record the numerator and denominator for each metric. See [benchmark results](BENCHMARKS.md).

The corpus has eight chunks and three answerable questions. The cutoff of 0.55 was chosen after inspecting the initial 0.50 run on these same questions. Report these results as fixture measurements. A held-out corpus, relevance judgments for paraphrases and more unsupported questions are needed before choosing production thresholds. A malicious passage can contain a plausible false claim, even when the source citation is genuine.

## Change inventory

- backend/pom.xml, backend/compose.yaml and backend/src/main/resources/application.properties configure the dependencies, development image and provider settings.
- V4__rag_sample.sql and rag/ARCHITECTURE.md introduce storage and the pinned source copy.
- SampleCorpus.java, RagProviders.java, SampleRag.java and SampleController.java implement the flow above. static/openapi.yaml documents the two synchronous endpoints.
- IdentityIntegrationTest.java uses the pgvector-enabled PG17 image for the existing integration suite. SampleRagTest.java and questions.json cover chunk spans, dimension validation, real vector storage and ranking, scope, visibility, citations, abstention, provider contracts and opt-in live runs.
- benchmarks/phase3-retrieval*.json preserve the initial and final retrieval runs. docs/BENCHMARKS.md and this report record methodology and limitations.

Suggested commit message: Add a repository-scoped pgvector RAG proof of concept

## Verification record

The initial Phase 3 Java 21 clean verify started real Spring contexts, applied Flyway V1 through V4 to disposable PostgreSQL 17.8 containers, ran the existing identity and catalog tests and packaged the backend. Fourteen tests passed. The Phase 2 benchmark, live GitHub smoke test and live Groq comparison were skipped. The live Ollama test ran. Recall@1 and Recall@3 were both 3/3. Full eight-chunk ingestion took 3,452.14 ms. Median query retrieval including embedding took 160.86 ms over four requests. The highest score for the unsupported question was 0.5188. The subsequent local generation evaluation is recorded below. No development or production database was used for verification.

## Selecting the answer generator

The default GENERATION_PROVIDER is ollama. OllamaGenerator posts separate system and user messages to /api/chat at OLLAMA_BASE_URL. OLLAMA_CHAT_MODEL selects the weights and defaults to qwen2.5:3b. Both evaluation arms request nonstreaming output, seed 42, temperature zero, a 4,096-token context, and at most 400 generated tokens. The baseline asks for a concise answer or abstention. The RAG prompt asks for a verbatim passage and chunk ID. SampleRag depends only on Generator, so selecting the adapter changes neither SQL nor validation.

Set GENERATION_PROVIDER=groq with GROQ_API_KEY and optionally GROQ_MODEL to use the existing Groq integration. Its opt-in test uses OPENSCOUT_LIVE_GROQ=true. For other chat-completions-compatible services select hosted and set GENERATION_URL, GENERATION_MODEL and GENERATION_API_KEY. These settings are independent of embedding selection. Groq live verification is blocked by the organization's account restriction. The loopback provider contract tests cover HTTP request and response handling.

## Local generation evaluation

Four frozen questions ran sequentially, once per arm, without a dedicated warm-up. Both arms used qwen2.5:3b through the same local Ollama adapter, temperature 0, seed 42, 4,096 context tokens and a 400-token output cap. All four baseline requests completed before ingestion and RAG. The baseline requested a concise factual answer with permission to abstain. The RAG arm additionally required a verbatim supporting quote and a retrieved chunk ID. The measured difference therefore includes retrieval, prompting and validation.

| Metric | Baseline | RAG |
|---|---:|---:|
| Correct across four questions, including correct abstention | 1/4 | 3/4 |
| Answered correctly on answerable questions | 0/3 | 2/3 |
| Abstained on unsupported question | 1/1 | 1/1 |
| Valid supporting citations / citations returned | 0 returned, undefined | 2/2 |
| Unsupported factual claims / factual claims returned | 0/0 | 0/2 |
| Median service latency across all four questions | 620.81 ms | 8,768.65 ms |

The baseline abstained on every question. RAG correctly cited PostgreSQL at line 7 and the zero-dollar target at lines 15 to 16. The locking-clause question retrieved its gold chunk at rank one, but the final validated answer abstained. Raw pre-validation model output was not recorded, so the cause of that false abstention is undetermined. The unsupported question returned empty citations in 151.82 ms. Both returned factual claims were checked against the cited source. Timing includes any model-load cost experienced in that arm. The sample supports neither a production latency estimate nor a claim about another model.

Threshold calibration used the four fixed labels and raw cosine scores. At 0.50 all three gold chunks survived and the unsupported question also passed. At 0.55 and 0.60 all three survived and the unsupported question was rejected. At 0.65 two gold chunks survived, and at 0.70 one survived. We retained 0.55 for greater margin on the weakest positive (0.6148). This is in-sample calibration. Recall@3 before filtering was 3/3.

[Paired raw responses and latencies](../benchmarks/phase3-ollama-generation.json) | [Baseline checkpoint](../benchmarks/phase3-ollama-baseline.json) | [Per-question grades and threshold sweep](../benchmarks/phase3-ollama-evaluation.json)

The local paired evaluation and the final regression build both passed on Java 21 with Docker-backed PostgreSQL. The final run included the live GitHub smoke test and loopback Ollama, Groq-compatible and hosted embedding contract tests. The live local generation evaluation ran separately. Phase 4 awaits approval.

## Final Phase 3 hardening review

**Fresh visibility.** SampleRag.retrieve checks local membership and the Phase 2 visibility window before asking Github.requirePublic for fresh numeric-ID metadata. Only an exact identity match, explicit public visibility and private=false permit retrieval. Missing metadata, timeout, private state, upstream error and conflicting identity fail closed. SampleRag.rank runs the existing membership-scoped vector query. authorizeDisclosure repeats membership, fresh visibility and membership checks immediately before sending evidence to the generator and again before releasing the result. The second local check covers revocation during the network request. This adds up to three GitHub metadata calls per generated answer. An upstream rate limit can deny service; a visibility change after the final check still has a small race window. No provider response conveys permanent authorization.

**Locking-clause diagnosis.** At the original cutoff, the recorded prompt put c9 first with the literal sentence about SKIP LOCKED. The raw generator response was valid empty JSON. A second control supplied only c9 with the same instruction and also got empty JSON. This reproduces a generation-stage abstention under the existing extractive prompt, even without competing passages. Parsing and citation validation behaved as designed. The original four-question run omitted raw model text, so its exact historical cause cannot be proven. These controls do not distinguish model capability from all possible prompt phrasings. No format repair, guessed citation or grounding exception was added. [Three-passage trace](../benchmarks/phase3-expanded/locking-replay.json) � [Single-passage control](../benchmarks/phase3-expanded/locking-one-passage.json)

**Hostile evidence.** A deterministic test stores an instruction in a disposable repository chunk, retrieves it through pgvector and simulates a generator obeying it. The forged chunk ID is rejected. In a separate live Qwen test, the model used a real retrieved ID but copied the malicious instruction along with the correct fixture color. Nothing executed. This demonstrates why valid provenance cannot make source text trustworthy. Consumers must render the response as inert data and must never hand quoted instructions to an executor. This fixture intentionally replaces stored text in the test database; its returned URL is synthetic test metadata, not evidence that the pinned architecture file contains that text. [Live hostile-document trace](../benchmarks/phase3-expanded/hostile-live.json)

**Verification and files.** RepositoryVisibility.java defines the fresh-visibility dependency. Github.java implements it using the existing fixed-origin metadata client. SampleRag.java isolates the timed SQL query and guards evidence disclosure. application.properties adopts the calibration-only threshold of 0.61. GithubTest.java and SampleRagTest.java cover upstream public/private state, membership denial, denial before prompting and at release, hostile content, calibration, matched evaluation and diagnostics. All expanded inputs, ranks, raw outputs, grades and commands are under benchmarks/phase3-expanded/. Run node benchmarks/phase3-expanded/score.mjs to regenerate the scorecard from this recorded run. The final Java 21 Docker-backed clean verify passed with 16 executed tests, zero failures or errors and seven opt-in skips. Calibration and held-out evaluation passed in separate Maven invocations.

**Review finding.** On the 30 held-out questions, RAG correctly answered 2/16 answerable questions and abstained on all 14 negatives. Recall@3 was 13/16. This fixture demonstrates access control and provenance while exposing low answer coverage. Groq live verification remains blocked by the organization restriction. The local Qwen results are model- and corpus-specific. [Full measurements and limitations](BENCHMARKS.md)
