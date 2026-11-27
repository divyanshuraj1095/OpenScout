CREATE TABLE repositories (
 id bigint PRIMARY KEY CHECK(id>0), owner text NOT NULL, name text NOT NULL,
 url text NOT NULL, language text, description text, stars bigint NOT NULL
);
CREATE TABLE user_repositories (
 user_id uuid REFERENCES accounts, repository_id bigint REFERENCES repositories,
 PRIMARY KEY(user_id,repository_id)
);
CREATE TABLE issues (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 repository_id bigint NOT NULL REFERENCES repositories, github_id bigint NOT NULL UNIQUE,
 number bigint NOT NULL CHECK(number>0), title text NOT NULL, body text, url text NOT NULL,
 state text NOT NULL CHECK(state IN ('open','closed')), labels text[] NOT NULL,
 difficulty text NOT NULL CHECK(difficulty IN ('Beginner','Intermediate','Advanced')),
 updated_at timestamptz NOT NULL, UNIQUE(repository_id,number), UNIQUE(repository_id,id)
);
CREATE INDEX issues_page ON issues(repository_id,updated_at DESC,id DESC);
CREATE TABLE bookmarks (
 user_id uuid NOT NULL, repository_id bigint NOT NULL, issue_id bigint NOT NULL,
 PRIMARY KEY(user_id,issue_id),
 FOREIGN KEY(user_id,repository_id) REFERENCES user_repositories ON DELETE CASCADE,
 FOREIGN KEY(repository_id,issue_id) REFERENCES issues(repository_id,id) ON DELETE CASCADE
);
ALTER TABLE accounts ADD COLUMN github_url text, ADD COLUMN created_at timestamptz;
ALTER TABLE accounts ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
