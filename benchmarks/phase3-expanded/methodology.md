Use the 12 balanced calibration questions only. Sweep 0.40 through 0.80 by 0.01. A positive succeeds when the labeled chunk appears in the retrieved top three above threshold; a negative succeeds when every candidate is below threshold. Maximize correct classifications; ties select the highest threshold. Persist freeze.json before opening held-out inputs. Hold prompts, model, corpus and validator fixed. Run all 30 held-out baseline requests before RAG, one repetition per question, one caller. Report ranks before filtering, truncated reciprocal rank (zero beyond three). A semantically correct nonanswer on a negative is correct. Inspect factual assertions against the corpus; count unsupported assertions separately from off-topic but supported assertions. Classify false acceptance as answering an unanswerable question and false rejection as abstaining on an answerable one. Benchmark checks use a mock visibility authority and a real database membership. Network visibility latency is excluded. Raw model text is recorded only for the fixed public fixture.
## Protocol and provenance

The two PSV files are the frozen inputs. The held-out set has 16 answerable and 14 unanswerable questions, including underspecified requests and false premises. The split is at the question level, on one shared eight-passage corpus. This measures generalization to new questions over familiar passages. The original four-question run remains separate. Calibration includes the old locking question for diagnosis.

Use Java 21, Maven, Docker PostgreSQL 17 with pgvector, local nomic-embed-text and qwen2.5:3b. Both generation arms use temperature 0, seed 42, num_ctx 4096 and num_predict 400. The baseline asks for a concise answer or abstention. RAG requests a verbatim quote and retrieved ID. The ordering is baseline first with no dedicated warm-up. One serial trial per question includes model-residency effects. No credentials or hosted services are needed.

From backend use PowerShell. Reproductions write to the expanded evidence directory. Use a separate checkout to retain the recorded run.

~~~powershell
$env:PHASE3_ROUND='calibrate'
.\mvnw.cmd -B test '-Dtest=SampleRagTest#calibrate'
$env:PHASE3_ROUND='evaluate'
.\mvnw.cmd -B test '-Dtest=SampleRagTest#evaluateFrozen'
$env:PHASE3_ROUND='diagnose'
.\mvnw.cmd -B clean verify
~~~

freeze.json contains calibration-only candidate scores, the full threshold sweep and the winner. baseline.json and rag.json hold the 60 held-out responses. A missing raw generation in a RAG row means zero candidates passed. Inspect raw output separately from the validated answer. The locking replay uses the historical 0.55 cutoff. The single-passage control only changes the evidence set. The diagnostic pass also computes full-corpus MRR and checks its top three against the original timed query. Hosted Groq verification remains blocked by the account restriction.
