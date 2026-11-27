package org.openscout.identity;
import java.net.*;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@org.springframework.context.annotation.Import(org.openscout.catalog.FixtureConfig.class)
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class IdentityIntegrationTest {
    static final PostgreSQLContainer db=new PostgreSQLContainer("postgres:17").withDatabaseName("openscout_dev");
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        if (System.getenv("OPENSCOUT_TEST_PORT") != null) {
            int port = Integer.parseInt(System.getenv("OPENSCOUT_TEST_PORT"));
            String base = "jdbc:postgresql://127.0.0.1:" + port + "/";
            String password = System.getenv("OPENSCOUT_TEST_PASSWORD");
            try (var connection = java.sql.DriverManager.getConnection(base+"postgres","openscout_test",password);
                 var statement = connection.createStatement()) {
                statement.execute("CREATE DATABASE openscout_dev");
            } catch (java.sql.SQLException ex) { throw new IllegalStateException("Fresh test cluster required",ex); }
            properties.add("spring.datasource.url", () -> base+"openscout_dev");
            properties.add("spring.datasource.username", () -> "openscout_test");
            properties.add("spring.datasource.password", () -> password);
        } else {
        db.start();
        properties.add("spring.datasource.url",db::getJdbcUrl);
        properties.add("spring.datasource.username",db::getUsername);
        properties.add("spring.datasource.password",db::getPassword);
        }
        if ("sequential".equals(System.getenv("OPENSCOUT_BENCH"))) properties.add("openscout.import.batch-size",()->1);
        properties.add("app.key",()->Base64.getEncoder().encodeToString(new byte[32]));
    }
    @LocalServerPort int port;
    final HttpClient client=HttpClient.newHttpClient();
    final Map<String,String> cookies=new HashMap<>();
    String token;
    HttpResponse<String> send(String path,String body) throws Exception {
        return send(path,body,body==null?"GET":"POST");
    }
    HttpResponse<String> send(String path,String body,String method) throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1/"+path));
        request.header("Cookie",String.join("; ",cookies.values()));
        if(token!=null) request.header("X-CSRF-TOKEN",token);
        request.header("Content-Type","application/json").method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body));
        var result=client.send(request.build(),HttpResponse.BodyHandlers.ofString());
        for(String header:result.headers().allValues("Set-Cookie")) {
            String pair=header.split(";",2)[0];
            cookies.put(pair.split("=",2)[0],pair);
        }
        return result;
    }
    void csrf() throws Exception {
        token=null;
        token=new ObjectMapper().readTree(send("auth/csrf",null).body()).get("token").asString();
    }
    @Test void utcSessions(@org.springframework.beans.factory.annotation.Autowired javax.sql.DataSource source) throws Exception {
        assertEquals("UTC", java.time.ZoneId.systemDefault().getId());
        try(var connection=source.getConnection(); var statement=connection.createStatement();
            var rows=statement.executeQuery("SHOW TIME ZONE")){
            assertTrue(rows.next());
            assertEquals("UTC", rows.getString(1));
        }
    }
    @Test
    @org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="OPENSCOUT_LIVE", matches="true")
    void liveImportRefresh() throws Exception {
        login("live");
        var result=send("repositories","{\"repoUrl\":\"https://github.com/octocat/git-consortium\"}");
        assertEquals(201,result.statusCode(),result.body());
        String id=new ObjectMapper().readTree(result.body()).get("id").asString();
        assertEquals(200,send("repositories/"+id+"/refresh","{}").statusCode());
    }
    @Test void authenticationLifecycle() throws Exception {
        String login="{\"email\":\"user@example.org\",\"password\":\"sample-password-only\"}";
        assertEquals(401,send("me",null).statusCode());
        assertEquals(403,send("auth/login",login).statusCode());
        csrf();
        assertEquals(201,send("auth/signup",login.replace("{","{\"name\":\"Test\",")).statusCode());
        assertEquals(200,send("auth/login",login).statusCode());
        assertEquals(200,send("me",null).statusCode());
        String captured=cookies.get(IdentityController.COOKIE);
        token=null;
        assertEquals(403,send("auth/logout","{}").statusCode());
        csrf();
        assertEquals(204,send("auth/logout","{}").statusCode());
        cookies.put(IdentityController.COOKIE,captured);
        assertEquals(401,send("me",null).statusCode());
    }
    @Test void credentialedPreflight() throws Exception {
        for(String origin:List.of("http://localhost:5173","https://untrusted.invalid")) {
            var req=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1/me"))
                .header("Origin",origin).header("Access-Control-Request-Method","GET")
                .method("OPTIONS",HttpRequest.BodyPublishers.noBody()).build();
            var response=client.send(req,HttpResponse.BodyHandlers.discarding());
            if(origin.contains("localhost")) {
                assertEquals(origin,response.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
                assertEquals("true",response.headers().firstValue("Access-Control-Allow-Credentials").orElseThrow());
            } else assertEquals(403,response.statusCode());
        }
    }
    void login(String name) throws Exception {
        String login="{\"email\":\""+name+"@example.org\",\"password\":\"sample-password-only\"}";
        csrf();
        assertEquals(201,send("auth/signup",login.replace("{","{\"name\":\"Test\",")).statusCode());
        assertEquals(200,send("auth/login",login).statusCode());
        csrf();
    }
    @Test
    @org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="OPENSCOUT_BENCH",matches="sequential|batch")
    void importBenchmark() throws Exception {
        login("bench");
        var samples=new ArrayList<Double>();
        var mapper=new ObjectMapper();
        for(int i=1;i<=12;i++){
            long start=System.nanoTime();
            var res=send("repositories","{\"repoUrl\":\"https://github.com/fixture/demo"+i+"\"}");
            var body=mapper.readTree(res.body());
            samples.add((System.nanoTime()-start)/1e6);
            assertEquals(201,res.statusCode(),res.body());
            assertEquals(100,body.get("inserted").asInt());
        }
        assertEquals(1200,mapper.readTree(send("issues",null).body()).get("total").asInt());
        java.nio.file.Files.writeString(java.nio.file.Path.of("../benchmarks/"+System.getenv("OPENSCOUT_BENCH")+"-phase2-hardening.json"),mapper.writeValueAsString(samples));
    }
    @Test void transferRenameDeletionAndVisibility(@org.springframework.beans.factory.annotation.Autowired org.springframework.jdbc.core.simple.JdbcClient db) throws Exception {
        login("reconcile");
        var mapper=new ObjectMapper();
        String source="{\"repoUrl\":\"https://github.com/test/source\"}";
        assertEquals(201,send("repositories",source).statusCode());
        String old=mapper.readTree(send("issues",null).body()).get("items").get(0).get("id").asString();
        assertEquals(204,send("bookmarks/"+old,null,"PUT").statusCode());
        db.sql("UPDATE repositories SET public_checked_at=now()-interval '6 minutes' WHERE id=9600").update();
        assertEquals(404,send("issues/"+old,null).statusCode());
        assertEquals(404,send("bookmarks/"+old,null,"PUT").statusCode());
        assertEquals(0,mapper.readTree(send("bookmarks",null).body()).get("total").asInt());
        assertEquals(0,mapper.readTree(send("repositories",null).body()).get("total").asInt());
        assertEquals(0,mapper.readTree(send("me",null).body()).get("openedRepos").asInt());
        assertEquals(200,send("repositories",source).statusCode());
        assertEquals(201,send("repositories",source.replace("source","destination")).statusCode());
        assertEquals(404,send("issues/"+old,null).statusCode());
        assertEquals(0,mapper.readTree(send("bookmarks",null).body()).get("total").asInt());
        assertEquals(1,mapper.readTree(send("issues?repositoryId=9601",null).body()).get("total").asInt());
        assertEquals(200,send("repositories",source).statusCode());
        assertEquals(200,send("repositories/9600/refresh","{}").statusCode());
        assertTrue(send("repositories",null).body().contains("renamed"));
        assertEquals(0,mapper.readTree(send("issues",null).body()).get("total").asInt());
        assertEquals(404,send("repositories/9600/refresh","{}").statusCode());
        assertFalse(send("repositories",null).body().contains("renamed"));
    }
    @Test void sharedImportRefreshAndPrivateBookmarks() throws Exception {
        var mapper=new ObjectMapper();
        login("owner");
        String input="{\"repoUrl\":\"https://github.com/test/shared\"}";
        assertEquals(201,send("repositories",input).statusCode());
        assertEquals(1,mapper.readTree(send("me",null).body()).get("openedRepos").asInt());
        var page=mapper.readTree(send("issues?repositoryId=9000&label=advanced&q=parser&difficulty=Advanced&language=Java&state=open",null).body());
        assertEquals(1,page.get("total").asInt());
        var issue=page.get("items").get(0);
        assertEquals("9007199254740993",issue.get("gitHubIssueId").asString());
        String id=issue.get("id").asString();
        assertEquals(204,send("bookmarks/"+id,null,"PUT").statusCode());
        assertEquals(204,send("bookmarks/"+id,null,"PUT").statusCode());
        assertEquals(1,mapper.readTree(send("bookmarks",null).body()).get("total").asInt());
        cookies.clear();
        login("second");
        assertEquals(404,send("repositories/9000/refresh","{}").statusCode());
        assertEquals(404,send("issues/"+id,null).statusCode());
        assertEquals(404,send("bookmarks/"+id,null,"PUT").statusCode());
        assertEquals(404,send("bookmarks/"+id,null,"DELETE").statusCode());
        assertEquals(201,send("repositories",input).statusCode());
        assertEquals(0,mapper.readTree(send("bookmarks",null).body()).get("total").asInt());
        assertEquals("closed",mapper.readTree(send("issues/"+id,null).body()).get("state").asString());
        assertEquals(200,send("repositories/9000/refresh","{}").statusCode());
        assertEquals(200,send("repositories",input).statusCode());
        assertEquals(400,send("issues?limit=101",null).statusCode());
    }
    @Test void concurrentImportAndRollback() throws Exception {
        login("race");
        assertEquals(409,send("repositories","{\"repoUrl\":\"https://github.com/test/broken\"}").statusCode());
        var mapper=new ObjectMapper();
        assertEquals(0,mapper.readTree(send("repositories",null).body()).get("total").asInt());
        var req=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1/repositories"))
            .header("X-CSRF-TOKEN",token).header("Cookie",String.join("; ",cookies.values()))
            .header("Content-Type","application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"repoUrl\":\"https://github.com/test/race\"}")).build();
        var first=client.sendAsync(req,HttpResponse.BodyHandlers.ofString());
        var second=client.sendAsync(req,HttpResponse.BodyHandlers.ofString());
        assertEquals(Set.of(200,201),Set.of(first.join().statusCode(),second.join().statusCode()));
        assertEquals(1,mapper.readTree(send("issues",null).body()).get("total").asInt());
    }
}

