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
        properties.add("app.key",()->Base64.getEncoder().encodeToString(new byte[32]));
    }
    @LocalServerPort int port;
    final HttpClient client=HttpClient.newHttpClient();
    final Map<String,String> cookies=new HashMap<>();
    String token;
    HttpResponse<String> send(String path,String body) throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1/"+path));
        request.header("Cookie",String.join("; ",cookies.values()));
        if(token!=null) request.header("X-CSRF-TOKEN",token);
        if(body!=null) request.header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        var result=client.send(request.build(),HttpResponse.BodyHandlers.ofString());
        for(String header:result.headers().allValues("Set-Cookie")) {
            String pair=header.split(";",2)[0];
            cookies.put(pair.split("=",2)[0],pair);
        }
        return result;
    }
    void csrf() throws Exception {
        token=new ObjectMapper().readTree(send("auth/csrf",null).body()).get("token").asString();
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
}

