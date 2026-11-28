package org.openscout.rag;

import java.time.Duration;
import java.time.Instant;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

@Component
@ConditionalOnProperty(name="index.worker.enabled",havingValue="true",matchIfMissing=true)
class IndexScheduler {
    final ThreadPoolTaskScheduler pool=new ThreadPoolTaskScheduler();
    final IndexWorker worker;
    final int size;
    IndexScheduler(IndexWorker worker,@Value("${index.workers:2}") int size){
        if(size<1 || size>8) throw new IllegalArgumentException("Expected 1..8 workers");
        this.worker=worker;this.size=size;pool.setPoolSize(size);pool.setThreadNamePrefix("repo-index-");
    }
    @PostConstruct void start(){
        pool.initialize();
        for(int i=0;i<size;i++) pool.scheduleWithFixedDelay(()->{
            try{worker.poll();}catch(RuntimeException e){System.getLogger("indexing").log(System.Logger.Level.WARNING,"Index worker poll failed");}
        },Instant.now().plusSeconds(2),Duration.ofSeconds(2));
    }
    @PreDestroy void stop(){pool.shutdown();}
}
