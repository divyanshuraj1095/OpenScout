CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE rag_sample_chunks (
 repository_id bigint NOT NULL REFERENCES repositories ON DELETE CASCADE,
 version text NOT NULL,
 chunk_id text NOT NULL,
 path text NOT NULL,
 start_line integer NOT NULL CHECK(start_line>0),
 end_line integer NOT NULL CHECK(end_line>=start_line),
 body text NOT NULL,
 embedding vector(768) NOT NULL,
 PRIMARY KEY(repository_id,version,chunk_id)
);
