# Phase 2 import benchmark

Control protocol: 12 distinct repositories, 100 open issues each, one caller, first two imports warm up. Time the authenticated HTTP request through JSON response consumption. Use the same loopback GitHub fixture for both applications. Collect before implementing the Spring import.

## Observed import latency

| Implementation | Median ms | Min–max ms |
|---|---:|---:|
| Node / Prisma, one committed create per issue | 86.03 | 61.66–115.74 |
| Spring / JDBC, sequential issue statements in one transaction | 53.15 | 38.90–99.26 |
| Spring / JDBC, set-based batch in one transaction | 28.76 | 18.00–47.53 |

Median reduction = (control median - batch median) / control median. This fixture measured 66.6% against Node and 45.9% against sequential Spring. The latter comparison isolates write grouping within an otherwise equivalent import request. The former includes different frameworks, authentication work, database schemas and transaction boundaries. These figures describe local end-to-end latency at concurrency one. They do not establish production throughput or a general Java advantage.

Raw milliseconds, in execution order including warm-ups: [Node](../benchmarks/node.json), [Spring sequential](../benchmarks/sequential.json), [Spring batch](../benchmarks/batch.json). Each result checks 100 issues per response and 1,200 final issues. All measured samples succeeded. Controls were collected before introducing the batch loop.

Environment: Windows build 26300, Intel i7-1260P, 16.83 GB RAM, local PostgreSQL 17.5, Node 24.19.0 / Prisma 6.19.3, Java 21 / Spring Boot 4.0.10. Same machine and fixture payloads; separate fresh clusters. No embedding or generation model. Auth setup, fixture startup, migrations and database creation are outside timing. Each import used a different but identically shaped repo, 100 open issues, alternating beginner/advanced labels, no PRs. This single-page workload avoids giving legacy Node credit for incomplete pagination. Ten measured samples per arm, one run per implementation, no cold-start, saturation or network-delay claims.

Reproduce on Windows with Java 21, Node and local PostgreSQL 17 binaries. Run npm ci in the repository root, then run benchmarks/run.ps1 -Mode node -PostgresBin <bin-directory> and repeat for sequential and batch. Each run writes the matching JSON file. Use a fresh checkout to retain the original measurements. Keep ports 58437 and 18562 free. The script creates and stops its own local cluster. Test credentials are generated per run.

## Phase 2 hardening rerun

Both Java arms ran against fresh PostgreSQL 17 Testcontainers on Docker Desktop with the loopback GitHub fixture. Each arm imported 12 repositories, asserted 100 inserted issues on every response and verified 1,200 stored issues. The median and range exclude the first two warm-ups.

| Implementation | Median ms | Min–max ms | Raw samples |
|---|---:|---:|---|
| Sequential | 119.24 | 102.01–158.76 | [Sequential samples](../benchmarks/sequential-phase2-hardening.json) |
| Batch | 108.11 | 86.99–168.60 | [Batch samples](../benchmarks/batch-phase2-hardening.json) |

The batch median was 9.3% lower in this run. The earlier controls used native PostgreSQL. The database environment and import protocol both changed, so the difference from historical timing cannot isolate hardening overhead. The original three evidence files retain their original measurements.
