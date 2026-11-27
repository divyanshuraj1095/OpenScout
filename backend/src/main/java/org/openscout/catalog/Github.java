package org.openscout.catalog;

import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonProperty;

@Component
class Github {
    record Owner(String login) {}
    record Repo(long id,String name,Owner owner,String language,String description,long stargazers_count,
                @JsonProperty("private") Boolean restricted,String visibility) {}
    record Label(String name) {}
    record Issue(long id,long number,String title,String body,String state,List<Label> labels,
                 Instant updated_at,Object pull_request) {}
    record Snapshot(Repo repo,List<Issue> issues) {}
    private static final Pattern URL=Pattern.compile("https://github[.]com/([A-Za-z0-9-]+)/([A-Za-z0-9_.-]+)/?");
    static String slug(String url) {
        var m=URL.matcher(url==null?"":url);
        if(!m.matches() || Set.of(".","..").contains(m.group(2))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return m.group(1)+"/"+m.group(2);
    }
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper;
    private final String token;
    private final URI origin;
    @org.springframework.beans.factory.annotation.Autowired
    Github(ObjectMapper mapper,@Value("${OPENSCOUT_GITHUB_TOKEN:}") String token) {
        this(mapper,token,URI.create("https://api.github.com"));
    }
    Github(ObjectMapper mapper,String token,URI origin) {this.mapper=mapper;this.token=token;this.origin=origin;}

    private HttpResponse<String> get(String path) throws Exception {
        var builder=HttpRequest.newBuilder(origin.resolve(path)).timeout(Duration.ofSeconds(20))
                .header("Accept","application/vnd.github+json");
        if(!token.isBlank()) builder.header("Authorization","Bearer "+token);
        var response=client.send(builder.GET().build(),HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()==301 || response.statusCode()==308){
            URI next=origin.resolve(response.headers().firstValue("Location").orElseThrow());
            if(path.startsWith("/repos/") && origin.getScheme().equals(next.getScheme())
                    && origin.getRawAuthority().equals(next.getRawAuthority())
                    && next.getRawQuery()==null && next.getRawFragment()==null
                    && next.getRawPath().matches("/repositories/[1-9][0-9]*"))
                return get(next.getRawPath());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Unexpected repository redirect");
        }
        if(response.statusCode()==404) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if(response.statusCode()!=200) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        return response;
    }
    private Repo readPublicRepo(String path) throws Exception {
        Repo repo=mapper.readValue(get(path).body(),Repo.class);
        if(!Boolean.FALSE.equals(repo.restricted()) || !"public".equals(repo.visibility()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return repo;
    }
    Snapshot fetch(String slug) {
        return fetchPath("/repos/"+slug);
    }
    Snapshot fetchById(long id){return fetchPath("/repositories/"+id);}
    private Snapshot fetchPath(String path){
        try {
            Repo repo=readPublicRepo(path);

            // Numeric endpoint pins every page to the metadata identity across repository renames.
            var issues=new LinkedHashMap<Long,Issue>();
            for(int page=1;page<=100;page++){
                var response=get("/repositories/"+repo.id()+"/issues?state=all&per_page=100&page="+page);
                for(var issue:mapper.readValue(response.body(),Issue[].class))
                    if(issue.pull_request()==null && issues.putIfAbsent(issue.id(),issue)!=null)
                        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Issue pages changed during sync");
                if(!response.headers().allValues("Link").stream().anyMatch(s->s.contains("rel=\"next\"")))
                {
                    Repo confirmed=readPublicRepo("/repositories/"+repo.id());
                    if(confirmed.id()!=repo.id()) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY);
                    return new Snapshot(confirmed,List.copyOf(issues.values()));
                }
            }
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,"Repository exceeds sync limit");
        } catch(ResponseStatusException e){throw e;}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);}
        catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Invalid upstream response",e);}
    }
}

