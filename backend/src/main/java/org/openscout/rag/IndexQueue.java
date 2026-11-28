package org.openscout.rag;

import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
class IndexQueue {
    record Lease(UUID id,long repo,UUID user,long fence,String commit){}
    final JdbcClient db;
    final TransactionTemplate tx;
    IndexQueue(JdbcClient db,TransactionTemplate tx){this.db=db;this.tx=tx;}
    UUID enqueue(UUID user,long repo){
        return db.sql("""
            INSERT INTO indexing_jobs(id,repository_id,requester,status)
            SELECT ?,repository_id,user_id,'queued' FROM user_repositories WHERE repository_id=? AND user_id=?
            ON CONFLICT(repository_id) WHERE status IN ('queued','running','retrying')
            DO UPDATE SET repository_id=excluded.repository_id RETURNING id
            """).params(UUID.randomUUID(),repo,user).query(UUID.class).optional().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    Optional<Lease> claim(){
        return db.sql("""
            WITH picked AS (SELECT id FROM indexing_jobs WHERE
              (status IN ('queued','retrying') AND ready_at<=now()) OR (status='running' AND lease_until<=now())
              ORDER BY ready_at,id LIMIT 1 FOR UPDATE SKIP LOCKED)
            UPDATE indexing_jobs j SET status='running',lease_until=clock_timestamp()+interval '90 seconds',fence=fence+1
            FROM picked WHERE j.id=picked.id RETURNING j.*
            """).query((r,n)->new Lease(r.getObject("id",UUID.class),r.getLong("repository_id"),r.getObject("requester",UUID.class),r.getLong("fence"),r.getString("commit_sha"))).optional();
    }
    void guarded(Lease l,Runnable action){
        tx.executeWithoutResult(s->{
            int changed=db.sql("""
                UPDATE indexing_jobs SET lease_until=clock_timestamp()+interval '90 seconds'
                WHERE id=? AND fence=? AND status='running' AND lease_until>clock_timestamp()
                """).params(l.id,l.fence).update();
            if(changed!=1) throw new IllegalStateException("Lease expired");
            action.run();
        });
    }
    void fail(Lease l,boolean retry,long delay){
        guarded(l,()->{
            boolean again=retry && l.fence<4 && delay<=604800;
            db.sql("UPDATE indexing_jobs SET status=?,error_code=?,ready_at=now()+make_interval(secs=>?),lease_until=NULL WHERE id=?")
                .params(again?"retrying":"failed",retry?"dependency_unavailable":"index_rejected",Math.min(delay,604800),l.id).update();
            if(!again) db.sql("DELETE FROM repository_indexes WHERE version=? AND status='building'").param(l.id).update();
        });
    }
}
