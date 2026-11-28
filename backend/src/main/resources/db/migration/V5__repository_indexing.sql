CREATE TABLE indexing_jobs (
 id uuid PRIMARY KEY, repository_id bigint NOT NULL REFERENCES repositories,
 requester uuid NOT NULL REFERENCES accounts, status text NOT NULL CHECK(status IN ('queued','running','retrying','failed','succeeded')),
 fence bigint NOT NULL DEFAULT 0, lease_until timestamptz, ready_at timestamptz NOT NULL DEFAULT now(),
 completed integer NOT NULL DEFAULT 0,total integer NOT NULL DEFAULT 0,error_code text, commit_sha text,
 UNIQUE(repository_id,id)
);
CREATE UNIQUE INDEX one_active_job ON indexing_jobs(repository_id) WHERE status IN ('queued','running','retrying');
CREATE INDEX runnable_jobs ON indexing_jobs(ready_at) WHERE status IN ('queued','retrying','running');
CREATE TABLE repository_indexes (
 repository_id bigint NOT NULL, version uuid NOT NULL, commit_sha text NOT NULL CHECK(commit_sha ~ '^[0-9a-f]{40}$'),
 space text NOT NULL, dimensions integer NOT NULL CHECK(dimensions=768), chunker text NOT NULL,
 status text NOT NULL CHECK(status IN ('building','active','retired')), PRIMARY KEY(repository_id,version),
 FOREIGN KEY(repository_id,version) REFERENCES indexing_jobs(repository_id,id)
);
CREATE UNIQUE INDEX one_active_generation ON repository_indexes(repository_id) WHERE status='active';
CREATE TABLE repository_files (
 repository_id bigint NOT NULL,version uuid NOT NULL,path text NOT NULL,blob_sha text NOT NULL,bytes integer NOT NULL CHECK(bytes>=0),
 PRIMARY KEY(repository_id,version,path),FOREIGN KEY(repository_id,version) REFERENCES repository_indexes ON DELETE CASCADE
);
CREATE TABLE repository_vectors (
 repository_id bigint NOT NULL,version uuid NOT NULL,path text NOT NULL,start_line integer NOT NULL CHECK(start_line>0),
 end_line integer NOT NULL CHECK(end_line>=start_line),content_hash text NOT NULL,body text NOT NULL,embedding vector(768) NOT NULL,
 PRIMARY KEY(repository_id,version,path,start_line), FOREIGN KEY(repository_id,version,path) REFERENCES repository_files ON DELETE CASCADE
);
CREATE INDEX chunk_reuse ON repository_vectors(repository_id,content_hash);
