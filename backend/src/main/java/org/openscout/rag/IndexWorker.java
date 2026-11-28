package org.openscout.rag;

import java.util.*;
import java.util.concurrent.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
class IndexWorker {
    final IndexQueue queue;
    final SampleRag rag;
    final IndexSource source;
    @Value("${index.max-file-bytes:65536}") int fileBytes;
    @Value("${index.max-files:100}") int maxFiles;
    @Value("${index.max-bytes:1048576}") long maxBytes;
    @Value("${index.max-chunks:512}") int maxChunks;
    @Value("${index.max-provider-calls:512}") int maxCalls;
    @Value("${index.chunk-bytes:1536}") int chunkBytes;
    @Value("${index.overlap-lines:1}") int overlap;
    @Value("${index.batch-size:8}") int batchSize=8;
    @Value("${index.incremental:true}") boolean incremental=true;
    @Value("${index.max-input-tokens:262144}") int tokenLimit=262144;
    record Pending(String path,Part part){}
    IndexWorker(IndexQueue queue,SampleRag rag,IndexSource source){this.queue=queue;this.rag=rag;this.source=source;}
    record Part(int start,int end,String body,String hash){}
    List<Part> split(String body) throws Exception {
        if(chunkBytes<1 || overlap<0) throw new IllegalArgumentException("Chunk limits");
        var lines=body.lines().toList();var parts=new ArrayList<Part>();
        for(int start=0;start<lines.size();){
            int end=start,bytes=0;
            while(end<lines.size()){
                int next=lines.get(end).getBytes(StandardCharsets.UTF_8).length+(end==start?0:1);
                if(bytes+next>chunkBytes) break;
                bytes+=next;end++;
            }
            if(end==start) throw new IllegalArgumentException("Line exceeds chunk budget");
            String text=String.join("\n",lines.subList(start,end));
            if(!text.isBlank()) parts.add(new Part(start+1,end,text,HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)))));
            if(end==lines.size()) break;
            start=Math.max(start+1,end-overlap);
        }
        return parts;
    }
    void check(IndexQueue.Lease l){
        member(l);rag.visibility.requirePublic(l.repo());member(l);
    }
    void member(IndexQueue.Lease l){
        if(!queue.db.sql("SELECT EXISTS(SELECT 1 FROM user_repositories WHERE user_id=? AND repository_id=?)")
            .params(l.user(),l.repo()).query(Boolean.class).single()) throw new IllegalArgumentException("Membership unavailable");
    }
    UUID active(long repo){return queue.db.sql("SELECT version FROM repository_indexes WHERE repository_id=? AND status='active'").param(repo).query(UUID.class).optional().orElse(null);}
    void process(IndexQueue.Lease l) throws Exception {
        if(l.fence()>4) throw new IllegalArgumentException("Attempts exhausted");
        check(l);
        String commit=l.commit()==null?source.head(l.repo()):l.commit();
        UUID base=active(l.repo());
        String chunker="utf8-lines-v1/"+chunkBytes+"/"+overlap;
        queue.guarded(l,()->{
            queue.db.sql("UPDATE indexing_jobs SET commit_sha=?,completed=0,total=0 WHERE id=?").params(commit,l.id()).update();
            queue.db.sql("DELETE FROM repository_indexes WHERE version=? AND status='building'").param(l.id()).update();
            queue.db.sql("INSERT INTO repository_indexes VALUES(?,?,?,?,768,?,'building')").params(l.repo(),l.id(),commit,rag.space,chunker).update();
        });
        var files=source.files(l.repo(),commit,fileBytes);
        if(files.size()>maxFiles || files.stream().mapToLong(IndexSource.File::size).sum()>maxBytes) throw new IllegalArgumentException("Manifest budget exceeded");
        queue.guarded(l,()->queue.db.sql("UPDATE indexing_jobs SET total=? WHERE id=?").params(files.size(),l.id()).update());
        UUID compatible=incremental && base!=null && queue.db.sql("""
            SELECT EXISTS(SELECT 1 FROM repository_indexes WHERE repository_id=? AND version=? AND space=? AND chunker=?)
            """).params(l.repo(),base,rag.space,chunker).query(Boolean.class).single()?base:null;
        var pending=new ArrayList<Pending>();
        int expected=0;
        for(var file:files){
            queue.guarded(l,()->member(l));
            Optional<String> old=Optional.empty();
            if(compatible!=null) old=queue.db.sql("SELECT min(path) FROM repository_files WHERE repository_id=? AND version=? AND blob_sha=?")
                .params(l.repo(),compatible,file.sha()).query(String.class).optional();
            if(old.isPresent()){
                String previous=old.get();
                queue.guarded(l,()->{
                    insertFile(l,file);
                    queue.db.sql("""
                        INSERT INTO repository_vectors SELECT repository_id,?,?,start_line,end_line,content_hash,body,embedding
                        FROM repository_vectors WHERE repository_id=? AND version=? AND path=?
                        """).params(l.id(),file.path(),l.repo(),compatible,previous).update();
                });
                expected+=queue.db.sql("SELECT count(*) FROM repository_vectors WHERE version=? AND path=?").params(l.id(),file.path()).query(Integer.class).single();
            }else{
                String body=source.content(l.repo(),file);
                if(body!=null){
                    queue.guarded(l,()->insertFile(l,file));
                    for(var part:split(body)){
                        if(++expected>maxChunks) throw new IllegalArgumentException("Chunk budget exceeded");
                        var item=new Pending(file.path(),part);
                        var reused=compatible==null?Optional.<String>empty():queue.db.sql("""
                            SELECT embedding::text FROM repository_vectors WHERE repository_id=? AND version=?
                            AND content_hash=? AND body=? LIMIT 1
                            """).params(l.repo(),compatible,part.hash(),part.body()).query(String.class).optional();
                        if(reused.isPresent()) queue.guarded(l,()->write(l,item,reused.get()));
                        else pending.add(item);
                    }
                }
            }
            if(expected>maxChunks) throw new IllegalArgumentException("Chunk budget exceeded");
            queue.guarded(l,()->queue.db.sql("UPDATE indexing_jobs SET completed=completed+1 WHERE id=?").param(l.id()).update());
        }
        int width=rag.encoder.supportsBatch()?batchSize:1;
        if(width<1 || width>64 || (pending.size()+width-1)/width>maxCalls) throw new IllegalArgumentException("Provider budget exceeded");
        long inputBytes=pending.stream().mapToLong(x->17L+x.part.body().getBytes(StandardCharsets.UTF_8).length).sum();
        if(inputBytes>tokenLimit) throw new IllegalArgumentException("Input budget exceeded");
        for(int i=0;i<pending.size();i+=width){
            var batch=pending.subList(i,Math.min(i+width,pending.size()));
            check(l);
            var vectors=rag.encoder.batch(batch.stream().map(x->"search_document: "+x.part.body()).toList());
            if(vectors.size()!=batch.size()) throw new IllegalArgumentException("Incomplete embeddings");
            queue.guarded(l,()->{
                for(int n=0;n<batch.size();n++) write(l,batch.get(n),SampleRag.vector(vectors.get(n)));
            });
        }
        final int expectedChunks=expected;
        check(l);
        queue.guarded(l,()->{
            member(l);
            if(queue.db.sql("SELECT count(*) FROM repository_vectors WHERE version=?").param(l.id()).query(Integer.class).single()!=expectedChunks)
                throw new IllegalStateException("Incomplete vectors");
            if(!Objects.equals(base,active(l.repo()))) throw new IllegalStateException("Generation changed");
            queue.db.sql("UPDATE repository_indexes SET status='retired' WHERE repository_id=? AND status='active'").param(l.repo()).update();
            queue.db.sql("UPDATE repository_indexes SET status='active' WHERE version=? AND status='building'").param(l.id()).update();
            if(queue.db.sql("UPDATE indexing_jobs SET status='succeeded',lease_until=NULL,error_code=NULL WHERE id=? AND completed=total").param(l.id()).update()!=1)
                throw new IllegalStateException("Incomplete generation");
        });
    }
    void insertFile(IndexQueue.Lease l,IndexSource.File file){
        queue.db.sql("INSERT INTO repository_files VALUES(?,?,?,?,?) ON CONFLICT(repository_id,version,path) DO NOTHING").params(l.repo(),l.id(),file.path(),file.sha(),file.size()).update();
    }
    void write(IndexQueue.Lease l,Pending item,String vector){
        Part p=item.part;
        queue.db.sql("INSERT INTO repository_vectors VALUES(?,?,?,?,?,?,?,CAST(? AS vector)) ON CONFLICT(repository_id,version,path,start_line) DO NOTHING")
            .params(l.repo(),l.id(),item.path,p.start(),p.end(),p.hash(),p.body(),vector).update();
    }
    final ScheduledExecutorService heartbeat=Executors.newSingleThreadScheduledExecutor();
    @jakarta.annotation.PreDestroy void stopHeartbeat(){heartbeat.shutdownNow();}
    void poll(){
        queue.claim().ifPresent(l->{
            var renewal=heartbeat.scheduleWithFixedDelay(()->queue.guarded(l,()->{}),20,20,TimeUnit.SECONDS);
            try{process(l);}
            catch(Exception ex){
                boolean retry=ex instanceof java.io.IOException || ex instanceof IndexSource.Retry ||
                    ex instanceof org.springframework.web.server.ResponseStatusException e && e.getStatusCode().is5xxServerError();
                long delay=(1L<<Math.min(4,l.fence()))+ThreadLocalRandom.current().nextLong(4);
                if(ex instanceof IndexSource.Retry r) delay=Math.max(delay,r.seconds);
                queue.fail(l,retry,delay);
            } finally {renewal.cancel(false);}
        });
    }
}
