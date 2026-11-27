package org.openscout.rag;

import java.io.IOException;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/repositories/{repository}/sample")
class SampleController {
    record Question(String question){}
    private final SampleRag rag;
    SampleController(SampleRag rag){this.rag=rag;}
    @PostMapping("/ingest")
    Map<String,Object> ingest(@AuthenticationPrincipal Jwt jwt,@PathVariable long repository) throws IOException {
        return Map.of("chunks",rag.ingest(UUID.fromString(jwt.getSubject()),repository),"indexVersion",rag.version);
    }
    @PostMapping("/questions")
    SampleRag.Answer ask(@AuthenticationPrincipal Jwt jwt,@PathVariable long repository,@RequestBody Question input){
        return rag.ask(UUID.fromString(jwt.getSubject()),repository,input.question());
    }
}
