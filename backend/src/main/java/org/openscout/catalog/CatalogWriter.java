package org.openscout.catalog;

import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
class CatalogWriter {
    private final JdbcClient db;
    private final ObjectMapper mapper;
    private final int batchSize;
    CatalogWriter(JdbcClient db,ObjectMapper mapper,@org.springframework.beans.factory.annotation.Value("${openscout.import.batch-size:250}") int batchSize){
        if(batchSize<1 || batchSize>1000) throw new IllegalArgumentException("Expected batch size 1..1000");
        this.db=db; this.mapper=mapper; this.batchSize=batchSize;
    }
    static String classify(List<String> labels){
        var normalized=labels.stream().map(s->s.toLowerCase(Locale.ROOT)).toList();
        if(normalized.stream().anyMatch(Set.of("advanced","hard","expert")::contains)) return "Advanced";
        if(normalized.stream().anyMatch(Set.of("good first issue","beginner","easy")::contains)) return "Beginner";
        return "Intermediate";
    }
    record Row(long github_id,long number,String title,String body,String state,List<String> labels,
               String difficulty,String updated_at,String url) {}
    record Result(String id,boolean added,int inserted,int updated){}
    @Transactional
    public Result apply(UUID user,Github.Snapshot snapshot,Long expected,java.time.OffsetDateTime started){
        var repo=snapshot.repo();
        if(expected!=null && expected!=repo.id()) throw new ResponseStatusException(HttpStatus.CONFLICT);
        String url="https://github.com/"+repo.owner().login()+"/"+repo.name();
        int applied=db.sql("""
            INSERT INTO repositories(id,owner,name,url,language,description,stars,public_checked_at,sync_started_at) VALUES(?,?,?,?,?,?,?,statement_timestamp(),?)
            ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,name=excluded.name,url=excluded.url,
              language=excluded.language,description=excluded.description,stars=excluded.stars,public_checked_at=excluded.public_checked_at,sync_started_at=excluded.sync_started_at
              WHERE repositories.sync_started_at<=excluded.sync_started_at
            """).params(repo.id(),repo.owner().login(),repo.name(),url,repo.language(),repo.description(),repo.stargazers_count(),started).update();
        if(applied==0 && !db.sql("""
            SELECT public_checked_at IS NOT NULL AND public_checked_at > now()-interval '5 minutes'
            FROM repositories WHERE id=?
            """).param(repo.id()).query(Boolean.class).single())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        int added=db.sql("INSERT INTO user_repositories VALUES(?,?) ON CONFLICT DO NOTHING").params(user,repo.id()).update();
        if(applied==0) return new Result(Long.toString(repo.id()),added==1,0,0);
        int inserted=0,updated=0;
        var rows=snapshot.issues().stream().map(i->{
            var labels=i.labels().stream().map(Github.Label::name).toList();
            return new Row(i.id(),i.number(),i.title(),i.body(),i.state(),labels,classify(labels),
                i.updated_at().toString(),url+"/issues/"+i.number());
        }).toList();
        String ids=mapper.writeValueAsString(rows.stream().map(Row::github_id).toList());
        db.sql("""
            DELETE FROM issues WHERE repository_id=? AND github_id NOT IN
              (SELECT value::bigint FROM jsonb_array_elements_text(CAST(? AS jsonb)))
            """).params(repo.id(),ids).update();
        db.sql("""
            DELETE FROM issues WHERE repository_id<>? AND github_id IN
              (SELECT value::bigint FROM jsonb_array_elements_text(CAST(? AS jsonb)))
            """).params(repo.id(),ids).update();
        for(int offset=0;offset<rows.size();offset+=batchSize){
            var counts=write(repo.id(),rows.subList(offset,Math.min(offset+batchSize,rows.size())));
            inserted+=counts[0]; updated+=counts[1];
        }
        return new Result(Long.toString(repo.id()),added==1,inserted,updated);
    }
    private int[] write(long repository,List<Row> rows){
        // Repository upsert holds the parent row lock until commit; counts use the pre-write snapshot.
        return db.sql("""
            WITH incoming AS (SELECT * FROM jsonb_to_recordset(CAST(? AS jsonb)) AS x(
                github_id bigint,number bigint,title text,body text,state text,labels text[],difficulty text,updated_at timestamptz,url text)),
            changed AS (
              INSERT INTO issues(repository_id,github_id,number,title,body,state,labels,difficulty,updated_at,url)
              SELECT ?,github_id,number,title,body,state,labels,difficulty,updated_at,url FROM incoming
              ON CONFLICT(github_id) DO UPDATE SET title=excluded.title,body=excluded.body,state=excluded.state,
                labels=excluded.labels,difficulty=excluded.difficulty,updated_at=excluded.updated_at,url=excluded.url
              WHERE issues.repository_id=excluded.repository_id AND issues.updated_at<=excluded.updated_at
                AND (issues.title,issues.body,issues.state,issues.labels,issues.difficulty,issues.updated_at,issues.url)
                IS DISTINCT FROM (excluded.title,excluded.body,excluded.state,excluded.labels,excluded.difficulty,excluded.updated_at,excluded.url)
              RETURNING github_id)
            SELECT count(*) FILTER(WHERE i.id IS NULL),count(i.id) FROM changed c LEFT JOIN issues i USING(github_id)
            """).params(mapper.writeValueAsString(rows),repository).query((rs,n)->new int[]{rs.getInt(1),rs.getInt(2)}).single();
    }
}

