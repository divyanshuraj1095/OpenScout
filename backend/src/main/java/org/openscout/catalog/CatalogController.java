package org.openscout.catalog;

import java.util.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
class CatalogController {
    private final JdbcClient db;
    private final Github github;
    private final CatalogWriter writer;
    CatalogController(JdbcClient db,Github github,CatalogWriter writer){this.db=db;this.github=github;this.writer=writer;}
    record Import(String repoUrl){}
    static UUID user(Jwt jwt){return UUID.fromString(jwt.getSubject());}
    static ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND);}
    @PostMapping("/repositories")
    ResponseEntity<CatalogWriter.Result> add(@AuthenticationPrincipal Jwt jwt,@RequestBody Import input){
        var started=syncStart();
        var result=writer.apply(user(jwt),github.fetch(Github.slug(input.repoUrl())),null,started);
        return ResponseEntity.status(result.added()?201:200).body(result);
    }
    @PostMapping("/repositories/{id}/refresh")
    CatalogWriter.Result refresh(@AuthenticationPrincipal Jwt jwt,@PathVariable long id){
        long authorizedId=db.sql("SELECT r.id FROM repositories r JOIN user_repositories u ON u.repository_id=r.id WHERE r.id=? AND u.user_id=?")
            .params(id,user(jwt)).query(Long.class).optional().orElseThrow(CatalogController::missing);
        var started=syncStart();
        try {
            return writer.apply(user(jwt),github.fetchById(authorizedId),id,started);
        } catch(ResponseStatusException e){
            if(e.getStatusCode().value()==404)
                db.sql("UPDATE repositories SET public_checked_at=NULL, sync_started_at=? WHERE id=? AND sync_started_at<=?").params(started,id,started).update();
            throw e;
        }
    }
    @GetMapping("/repositories")
    Map<String,Object> repos(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit){
        validate(page,limit);
        var count=db.sql("SELECT count(*) FROM user_repositories u JOIN repositories r ON r.id=u.repository_id WHERE u.user_id=? AND r.public_checked_at > now()-interval '5 minutes'").param(user(jwt)).query(Long.class).single();
        var items=db.sql("SELECT r.id::text,r.name,r.owner,r.language,r.description,r.url,r.stars FROM repositories r JOIN user_repositories u ON u.repository_id=r.id WHERE u.user_id=? AND r.public_checked_at > now()-interval '5 minutes' ORDER BY r.id LIMIT ? OFFSET ?")
            .params(user(jwt),limit,(page-1L)*limit).query().listOfRows();
        return envelope(items,page,limit,count);
    }
    private java.time.OffsetDateTime syncStart(){
        return db.sql("SELECT clock_timestamp()").query(java.time.OffsetDateTime.class).single();
    }
    static void validate(int page,int limit){
        if(page<1 || limit<1 || limit>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    }
    static Map<String,Object> envelope(Object items,int page,int limit,long total){
        return Map.of("items",items,"page",page,"limit",limit,"total",total);
    }
    static final String COLUMNS="""
        SELECT i.id::text,i.github_id::text AS "gitHubIssueId",i.repository_id::text AS "repositoryId",
          i.number,i.title,i.body AS description,i.state,i.url,i.difficulty,to_json(i.labels)::text AS labels,
          i.updated_at AS "updatedAt",r.name AS "repositoryName",r.language
        """;
    static final String SCOPE=" FROM issues i JOIN repositories r ON r.id=i.repository_id AND r.public_checked_at > now()-interval '5 minutes' JOIN user_repositories u ON u.repository_id=r.id ";
    private static final tools.jackson.databind.ObjectMapper JSON=new tools.jackson.databind.ObjectMapper();
    static List<Map<String,Object>> decode(List<Map<String,Object>> rows){
        return rows.stream().map(raw->{
            Map<String,Object> row=new LinkedHashMap<>(raw);
            row.put("labels",JSON.readValue((String)row.get("labels"),String[].class));
            return row;
        }).toList();
    }
    @GetMapping("/issues/{id}")
    Object issue(@AuthenticationPrincipal Jwt jwt,@PathVariable long id){
        return decode(db.sql(COLUMNS+SCOPE+" WHERE u.user_id=? AND i.id=?").params(user(jwt),id).query().listOfRows())
            .stream().findFirst().orElseThrow(CatalogController::missing);
    }
    @GetMapping({"/issues","/bookmarks"})
    Map<String,Object> list(@AuthenticationPrincipal Jwt jwt,jakarta.servlet.http.HttpServletRequest request,
        @RequestParam Optional<Long> repositoryId,@RequestParam Optional<String> label,@RequestParam Optional<String> q,
        @RequestParam Optional<String> language,@RequestParam Optional<String> difficulty,@RequestParam Optional<String> state,
        @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int limit){
        validate(page,limit);
        var where=new StringBuilder(SCOPE+" WHERE u.user_id=?");
        var args=new ArrayList<Object>();args.add(user(jwt));
        if(request.getServletPath().endsWith("/bookmarks")) where.append(" AND EXISTS(SELECT 1 FROM bookmarks b WHERE b.issue_id=i.id AND b.user_id=u.user_id)");
        repositoryId.ifPresent(v->{where.append(" AND i.repository_id=?");args.add(v);});
        label.ifPresent(v->{where.append(" AND ?=ANY(i.labels)");args.add(v);});
        language.ifPresent(v->{where.append(" AND lower(r.language)=lower(?)");args.add(v);});
        difficulty.ifPresent(v->{where.append(" AND lower(i.difficulty)=lower(?)");args.add(v);});
        state.ifPresent(v->{where.append(" AND i.state=?");args.add(v);});
        q.ifPresent(v->{where.append(" AND (strpos(lower(i.title),lower(?))>0 OR strpos(lower(i.body),lower(?))>0)");args.add(v);args.add(v);});
        long total=db.sql("SELECT count(*)"+where).params(args).query(Long.class).single();
        args.add(limit);args.add((page-1L)*limit);
        return envelope(decode(db.sql(COLUMNS+where+" ORDER BY i.updated_at DESC,i.id DESC LIMIT ? OFFSET ?")
            .params(args).query().listOfRows()),page,limit,total);
    }
    @RequestMapping(value="/bookmarks/{id}",method={RequestMethod.PUT,RequestMethod.DELETE})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void bookmark(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,jakarta.servlet.http.HttpServletRequest request){
        var uid=user(jwt);
        long repo=db.sql("SELECT i.repository_id"+SCOPE+" WHERE i.id=? AND u.user_id=? FOR KEY SHARE OF u")
            .params(id,uid).query(Long.class).optional().orElseThrow(CatalogController::missing);
        if(request.getMethod().equals("PUT")) db.sql("INSERT INTO bookmarks VALUES(?,?,?) ON CONFLICT DO NOTHING").params(uid,repo,id).update();
        else db.sql("DELETE FROM bookmarks WHERE user_id=? AND issue_id=?").params(uid,id).update();
    }
}

