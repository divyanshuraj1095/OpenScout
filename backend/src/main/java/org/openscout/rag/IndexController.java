package org.openscout.rag;

import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/repositories/{repo}")
class IndexController {
    final SampleRag rag;final IndexQueue queue;
    IndexController(SampleRag rag,IndexQueue queue){this.rag=rag;this.queue=queue;}
    @PostMapping("/indexes") @ResponseStatus(HttpStatus.ACCEPTED)
    Map<String,String> request(@AuthenticationPrincipal Jwt jwt,@PathVariable long repo){
        UUID user=UUID.fromString(jwt.getSubject());rag.authorize(user,repo);rag.visibility.requirePublic(repo);
        UUID id=queue.enqueue(user,repo);
        return Map.of("jobId",id.toString(),"statusUrl","/api/v1/repositories/"+repo+"/jobs/"+id);
    }
    @GetMapping("/jobs/{id}") Map<String,Object> status(@AuthenticationPrincipal Jwt jwt,@PathVariable long repo,@PathVariable UUID id){
        UUID user=UUID.fromString(jwt.getSubject());rag.visibility.requirePublic(authorized(user,repo));
        return queue.db.sql("""
            SELECT j.status,j.completed,j.total,j.error_code AS "errorCode" FROM indexing_jobs j
            JOIN user_repositories u ON u.repository_id=j.repository_id
            WHERE j.repository_id=? AND j.id=? AND u.user_id=?
            """).params(repo,id,user).query().listOfRows().stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    @PostMapping("/indexes/active/questions")
    SampleRag.Answer ask(@AuthenticationPrincipal Jwt jwt,@PathVariable long repo,@RequestBody SampleController.Question question){
        return rag.askIndexed(UUID.fromString(jwt.getSubject()),repo,question.question());
    }
    private long authorized(UUID user,long repo){rag.authorize(user,repo);return repo;}
}
