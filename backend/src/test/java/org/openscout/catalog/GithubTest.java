package org.openscout.catalog;

import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class GithubTest {
    @Test void redirectsAndPageCap() throws Exception {
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        var pages=new java.util.concurrent.atomic.AtomicInteger();
        server.createContext("/",e->{
            String path=e.getRequestURI().getPath();
            if(path.startsWith("/repos/")){
                e.getResponseHeaders().add("Location",path.endsWith("old")?"/repositories/4":"https://example.invalid/repositories/4");
                e.sendResponseHeaders(301,-1);e.close();return;
            }
            String body="{\"id\":4,\"stargazers_count\":0,\"private\":false,\"visibility\":\"public\"}";
            if(path.endsWith("issues")){
                pages.incrementAndGet();
                e.getResponseHeaders().add("Link","<ignored>; rel=\"next\"");
                body="[]";
            }
            byte[] bytes=body.getBytes(StandardCharsets.UTF_8);
            e.sendResponseHeaders(200,bytes.length);
            try(var out=e.getResponseBody()){out.write(bytes);}
        });
        server.start();
        try {
            var github=new Github(new ObjectMapper(),"fixture",URI.create("http://127.0.0.1:"+server.getAddress().getPort()));
            assertEquals(502,assertThrows(ResponseStatusException.class,()->github.fetch("o/unsafe")).getStatusCode().value());
            assertEquals(422,assertThrows(ResponseStatusException.class,()->github.fetch("o/old")).getStatusCode().value());
            assertEquals(100,pages.get());
        } finally {server.stop(0);}
    }
    @Test void validateAndClassify(){
        for(String bad:List.of("http://github.com/o/r","https://github.com.evil/o/r","https://github.com/o/r?a","https://github.com/o/.."))
            assertThrows(ResponseStatusException.class,()->Github.slug(bad));
        assertEquals("Beginner",CatalogWriter.classify(List.of("Easy")));
        assertEquals("Advanced",CatalogWriter.classify(List.of("easy","expert")));
        assertEquals("Intermediate",CatalogWriter.classify(List.of()));
    }
    @Test void readsAllPagesAndRejectsPartialOrPrivateSnapshots() throws Exception {
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        var fail=new java.util.concurrent.atomic.AtomicBoolean();
        var duplicate=new java.util.concurrent.atomic.AtomicBoolean();
        var restricted=new java.util.concurrent.atomic.AtomicBoolean();
        server.createContext("/",exchange->{
            String path=exchange.getRequestURI().getPath(), body;
            int status=200;
            if(!"Bearer fixture".equals(exchange.getRequestHeaders().getFirst("Authorization"))){status=401;body="{}";}
            else if(path.equals("/repos/o/r") || path.equals("/repositories/4")) body="{\"id\":4,\"stargazers_count\":0,\"name\":\"r\",\"owner\":{\"login\":\"o\"},\"private\":"+restricted+",\"visibility\":\"public\"}";
            else if(exchange.getRequestURI().getQuery().endsWith("page=1")){
                exchange.getResponseHeaders().add("Link","<ignored>; rel=\"next\"");
                body=duplicate.get()?"[{\"id\":8,\"number\":2}]":"[{\"id\":3,\"number\":1,\"pull_request\":{}}]";
            } else {status=fail.get()?503:200;body="[{\"id\":8,\"number\":2,\"state\":\"closed\"}]";}
            byte[] bytes=body.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status,bytes.length);
            try(var out=exchange.getResponseBody()){out.write(bytes);}
        });
        server.start();
        try{
            var github=new Github(new ObjectMapper(),"fixture",URI.create("http://127.0.0.1:"+server.getAddress().getPort()));
            github.requirePublic(4);
            var issues=github.fetch("o/r").issues();
            assertEquals(1,issues.size());assertEquals(8,issues.getFirst().id());
            duplicate.set(true);
            assertEquals(503,assertThrows(ResponseStatusException.class,()->github.fetch("o/r")).getStatusCode().value());
            duplicate.set(false);
            fail.set(true);
            assertEquals(503,assertThrows(ResponseStatusException.class,()->github.fetch("o/r")).getStatusCode().value());
            restricted.set(true);
            assertEquals(404,assertThrows(ResponseStatusException.class,()->github.requirePublic(4)).getStatusCode().value());
            assertEquals(404,assertThrows(ResponseStatusException.class,()->github.fetch("o/r")).getStatusCode().value());
        } finally {server.stop(0);}
    }
}

