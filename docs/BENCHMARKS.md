# Phase 2 import benchmark

Control protocol: 12 distinct repositories, 100 open issues each, one caller, first two imports warm up. Time the authenticated HTTP request through JSON response consumption. Use the same loopback GitHub fixture for both applications. Collect before implementing the Spring import.

## Observed import latency

| Implementation | Median ms | Minï¿½max ms |
|---|---:|---:|
| Node / Prisma, one committed create per issue | 86.03 | 61.66ï¿½115.74 |
| Spring / JDBC, sequential issue statements in one transaction | 53.15 | 38.90ï¿½99.26 |
| Spring / JDBC, set-based batch in one transaction | 28.76 | 18.00ï¿½47.53 |

Median reduction = (control median - batch median) / control median. This fixture measured 66.6% against Node and 45.9% against sequential Spring. The latter comparison isolates write grouping within an otherwise equivalent import request. The former includes different frameworks, authentication work, database schemas and transaction boundaries. These figures describe local end-to-end latency at concurrency one. They do not establish production throughput or a general Java advantage.

Raw milliseconds, in execution order including warm-ups: [Node](../benchmarks/node.json), [Spring sequential](../benchmarks/sequential.json), [Spring batch](../benchmarks/batch.json). Each result checks 100 issues per response and 1,200 final issues. All measured samples succeeded. Controls were collected before introducing the batch loop.

Environment: Windows build 26300, Intel i7-1260P, 16.83 GB RAM, local PostgreSQL 17.5, Node 24.19.0 / Prisma 6.19.3, Java 21 / Spring Boot 4.0.10. Same machine and fixture payloads; separate fresh clusters. No embedding or generation model. Auth setup, fixture startup, migrations and database creation are outside timing. Each import used a different but identically shaped repo, 100 open issues, alternating beginner/advanced labels, no PRs. This single-page workload avoids giving legacy Node credit for incomplete pagination. Ten measured samples per arm, one run per implementation, no cold-start, saturation or network-delay claims.

Reproduce on Windows with Java 21, Node and local PostgreSQL 17 binaries. Run npm ci in the repository root, then run benchmarks/run.ps1 -Mode node -PostgresBin <bin-directory> and repeat for sequential and batch. Each run writes the matching JSON file. Use a fresh checkout to retain the original measurements. Keep ports 58437 and 18562 free. The script creates and stops its own local cluster. Test credentials are generated per run.

## Phase 2 hardening rerun

Both Java arms ran against fresh PostgreSQL 17 Testcontainers on Docker Desktop with the loopback GitHub fixture. Each arm imported 12 repositories, asserted 100 inserted issues on every response and verified 1,200 stored issues. The median and range exclude the first two warm-ups.

| Implementation | Median ms | Minï¿½max ms | Raw samples |
|---|---:|---:|---|
| Sequential | 119.24 | 102.01ï¿½158.76 | [Sequential samples](../benchmarks/sequential-phase2-hardening.json) |
| Batch | 108.11 | 86.99ï¿½168.60 | [Batch samples](../benchmarks/batch-phase2-hardening.json) |

The batch median was 9.3% lower in this run. The earlier controls used native PostgreSQL. The database environment and import protocol both changed, so the difference from historical timing cannot isolate hardening overhead. The original three evidence files retain their original measurements.

## Phase 3 sample retrieval

On 2026-11-27, the Java 21 Spring Boot application used Spring AI 2.0.2, local Ollama nomic-embed-text and a disposable PostgreSQL 17.8 container with pgvector 0.8.1. The direct Ollama probe and stored embeddings both had 768 dimensions. Eight fixed documentation chunks and four labeled questions ran sequentially, once each, with no dedicated warm-up. The first document embedding is included. This small sample describes fixture behavior at concurrency one.

| Final-run measurement | Observed result |
|---|---|
| Gold chunk ranked first / within top three | 3/3 for both |
| Unanswerable question, best similarity | 0.5188 |
| Complete ingestion, eight chunks | 3,452.14 ms |
| Per-document embedding, minï¿½max | 167.23ï¿½1,328.32 ms |
| Per-question embedding, minï¿½max | 65.88ï¿½218.94 ms |
| Retrieval including membership, embedding and SQL, median / range | 160.86 ms / 115.71ï¿½264.65 ms |

The unsupported question crossed the initial cutoff of 0.50. The final cutoff of 0.55 excludes all its passages and retains each answerable question's top passage. The same labeled questions were used to choose this cutoff and inspect the resulting ranks. [Initial raw run](../benchmarks/phase3-retrieval-initial.json) and [final raw run](../benchmarks/phase3-retrieval.json).

Groq credentials were absent during verification. The local Qwen comparison below completes the generation evaluation. Groq-specific measurements remain unavailable. The deterministic provider tests establish contract behavior and are excluded from those metrics. [Evaluation protocol](PHASE_3.md).

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

## Phase 3 held-out hardening evaluation

The expanded fixture has 42 questions. Twelve balanced calibration questions selected 0.61 before either generation arm ran on the 30 held-out questions. All six positive calibration chunks survived and all six negatives fell below the cutoff. Both held-out arms used local qwen2.5:3b, seed 42, temperature 0, context 4,096, output limit 400 and the same question order. The corpus and prompts stayed fixed. The 16 answerable and 14 unanswerable cases include direct, paraphrased, technical, ambiguous, unsupported and misleading questions. Raw results from the original four questions remain separate.

| Held-out measure | Baseline | RAG |
|---|---:|---:|
| Overall correct | 14/30 (46.7%) | 16/30 (53.3%) |
| Answerable questions correct | 0/16 | 2/16 (12.5%) |
| Correct / incorrect abstentions | 14 / 15 | 14 / 12 |
| False acceptance on unanswerable questions | 0/14 | 0/14 |
| False rejection on answerable questions | 15/16 (93.75%) | 12/16 (75%) |
| Valid citations / citations emitted | 0 emitted | 4/4 |
| Returned factual sentences unsupported by the source | 2/2 | 0/5 |

Each answerable question has one labeled source. Before filtering, Recall@1 was 11/16 (68.75%), Recall@3 was 13/16 (81.25%), and full eight-chunk MRR was 0.790625. After filtering, 8/16 gold passages survived. Four of 14 negatives passed the retrieval gate; generation abstained on all four. Absence of final false acceptances does not establish perfect retrieval precision.

Two RAG answers correctly identified Spring Security and the active index. Two more quoted the right chunk but answered a different question. The BOM-version answer described dependency management without giving the version; the weak-evidence answer described retrieval without mentioning abstention. All four citations backed the returned text, and two supported an answer responsive to the question. The baseline's only substantive answer attributed schema creation to Hibernate, contrary to the fixture. Unsupported-claim counts use factual sentences as the scoring unit, counting repeated sentences once per response. Fourteen correct abstentions account for most of the overall score in both arms.

| Timing in ms | Requests | Median | p95 |
|---|---:|---:|---:|
| Query embedding | 30 | 100.65 | 183.07 |
| Scoped vector SQL through JDBC | 30 | 47.22 | 61.57 |
| Baseline LLM / end-to-end service | 30 | 829.21 | 1,765.90 |
| RAG LLM, calls made | 15 | 6,320.34 | 13,439.28 |
| RAG end-to-end service, including threshold abstentions | 30 | 1,564.53 | 12,655.92 |

Latency excludes client HTTP and remote GitHub latency. The test used a mock visibility authority, real database checks and local model calls. Medians include the first request. p95 uses nearest rank. These are single-run, local measurements on eight passages. The threshold was kept frozen after seeing the weaker held-out results. No hosted generation was run.

[Inputs, commands and protocol](../benchmarks/phase3-expanded/methodology.md) · [Freeze record](../benchmarks/phase3-expanded/freeze.json) · [Baseline outputs](../benchmarks/phase3-expanded/baseline.json) · [RAG outputs, pre-validation text and timings](../benchmarks/phase3-expanded/rag.json) · [Scores by question](../benchmarks/phase3-expanded/scores.json)
