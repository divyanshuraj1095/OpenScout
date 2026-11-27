package org.openscout.catalog;
import java.net.URI;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import tools.jackson.databind.ObjectMapper;

@TestConfiguration
public class FixtureConfig {
    @Bean @Primary Github fixtureGithub(ObjectMapper mapper){
        var live=new Github(mapper,"",URI.create("https://api.github.com"));
        return new Github(mapper,"fixture",URI.create("http://127.0.0.1:18562")) {
            @Override Snapshot fetchById(long id){if(id==9600){
                    if(++sync==2) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
                    return reconciliation("renamed",false);
                }
                return id==9000?fetch("test/shared"):("true".equals(System.getenv("OPENSCOUT_LIVE"))?live.fetchById(id):super.fetchById(id));}
            int version;
            int sync;

            Snapshot reconciliation(String name,boolean withIssue){
                long id=name.equals("destination")?9601:9600;
                var repo=new Repo(id,name,new Owner("test"),"Java",null,0,false,"public");
                var issue=new Issue(8600,1,"Transferred",null,"open",java.util.List.of(),java.time.Instant.EPOCH,null);
                return new Snapshot(repo,withIssue?java.util.List.of(issue):java.util.List.of());
            }
            @Override Snapshot fetch(String slug){
                if(slug.equals("test/source") || slug.equals("test/destination")) return reconciliation(slug.substring(5),true);
                if(slug.equals("octocat/git-consortium") && "true".equals(System.getenv("OPENSCOUT_LIVE"))) return live.fetch(slug);
                if(slug.equals("test/broken") || slug.equals("test/race")){
                    boolean broken=slug.endsWith("broken");
                    var repo=new Repo(broken?9500:9501,broken?"broken":"race",new Owner("test"),"Java",null,0,false,"public");
                    var issue=new Issue(broken?700:701,1,"Title",null,broken?"invalid":"open",java.util.List.of(),java.time.Instant.EPOCH,null);
                    return new Snapshot(repo,java.util.List.of(issue));
                }
                if(!slug.equals("test/shared")) return super.fetch(slug);
                version++;
                var repo=new Repo(9000,"shared",new Owner("test"),"Java",null,3,false,"public");
                var issue=new Issue(9007199254740993L,8,"Fix parser",null,version==1?"open":"closed",
                    java.util.List.of(new Label("advanced")),java.time.Instant.ofEpochSecond(version),null);
                return new Snapshot(repo,java.util.List.of(issue));
            }
        };
    }
}


