package org.openscout.rag;

import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;

@Component
class IndexSource {
    record File(String path,String sha,int size){}
    static class Retry extends RuntimeException {
        final long seconds;
        Retry(long seconds){this.seconds=seconds;}
    }
    final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    final ObjectMapper json;
    final URI origin;
    long retryAfter(String value){
        try{return Math.max(0,Long.parseLong(value));}catch(NumberFormatException ignored){}
        try{return Math.max(0,ZonedDateTime.parse(value,java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME).toEpochSecond()-Instant.now().getEpochSecond());}
        catch(java.time.format.DateTimeParseException ignored){return 1;}
    }
    @org.springframework.beans.factory.annotation.Autowired
    IndexSource(ObjectMapper json){this(json,URI.create("https://api.github.com"));}
    IndexSource(ObjectMapper json,URI origin){this.json=json;this.origin=origin;}
    JsonNode get(long repo,String suffix) throws Exception {
        var req=HttpRequest.newBuilder(origin.resolve("/repositories/"+repo+suffix)).timeout(Duration.ofSeconds(20)).build();
        var response=client.send(req,HttpResponse.BodyHandlers.ofInputStream());
        var deadline=new java.util.concurrent.CompletableFuture<Void>();
        java.util.concurrent.CompletableFuture.delayedExecutor(20,java.util.concurrent.TimeUnit.SECONDS).execute(()->{
            if(deadline.complete(null)) try{response.body().close();}catch(IOException ignored){}
        });
        try(var in=response.body()){
            int status=response.statusCode();
            if(status==429 || status==403 || status>=500){
                long reset=response.headers().firstValueAsLong("X-RateLimit-Reset").orElse(0)-Instant.now().getEpochSecond();
                throw new Retry(Math.max(reset,retryAfter(response.headers().firstValue("Retry-After").orElse("1"))));
            }
            if(status!=200) throw new IllegalArgumentException("GitHub source unavailable");
            if(response.headers().allValues("Link").stream().anyMatch(h->h.contains("rel=\"next\"")))
                throw new IllegalArgumentException("Unexpected paginated response");
            byte[] bytes=in.readNBytes(4_000_001);
            if(bytes.length>4_000_000) throw new IllegalArgumentException("Response limit exceeded");
            return json.readTree(bytes);
        } finally {deadline.complete(null);}
    }
    String sha(JsonNode node){
        String value=node.path("sha").asString("");
        if(!value.matches("[0-9a-f]{40}")) throw new IllegalArgumentException("Invalid SHA");
        return value;
    }
    String head(long repo) throws Exception {return sha(get(repo,"/commits/HEAD"));}
    List<File> files(long repo,String commit,int maxBytes) throws Exception {
        var tree=get(repo,"/git/trees/"+commit+"?recursive=1");
        if(!tree.path("truncated").isBoolean() || tree.get("truncated").asBoolean() || !tree.path("tree").isArray())
            throw new IllegalArgumentException("Incomplete manifest");
        var files=new ArrayList<File>();
        for(var node:tree.get("tree")){
            String path=node.path("path").asString("");
            if(path.isEmpty() || !node.path("mode").isString() || !node.path("type").isString())
                throw new IllegalArgumentException("Incomplete tree entry");
            if(!"100644".equals(node.path("mode").asString("")) || !"blob".equals(node.path("type").asString("")) || !eligible(path)) continue;
            int size=node.path("size").asInt(-1);
            if(size<0 || size>maxBytes) throw new IllegalArgumentException("File size limit");
            files.add(new File(path,sha(node),size));
        }
        return files;
    }
    static boolean eligible(String path){
        String p=path.toLowerCase(Locale.ROOT);
        if(!p.matches("[a-z0-9_/-][a-z0-9_./-]*") || p.startsWith("/") || p.contains("//")) return false;
        for(String part:p.split("/")) if(part.startsWith(".") || Set.of("node_modules","vendor","target","dist","build","generated","coverage","fixtures","secrets","credentials","third_party","external","out","bin","obj","dist-packages","site-packages","migrations").contains(part)) return false;
        return (p.equals("readme") || p.endsWith(".md") || p.endsWith(".rst") || p.endsWith(".txt") || p.matches(".*[.](java|kt|py|ts|tsx|js|jsx|go|rs|c|h|cpp|cs|rb)$")) && !p.matches(".*(password|credential|secret|private.key|token|generated|[.]min[.]|[.]bundle[.]|lockfile).*");
    }
    String content(long repo,File file) throws Exception {
        var blob=get(repo,"/git/blobs/"+file.sha);
        if(!sha(blob).equals(file.sha) || !"base64".equals(blob.path("encoding").asString(""))) throw new IllegalArgumentException("Invalid blob");
        byte[] bytes=Base64.getMimeDecoder().decode(blob.get("content").asString());
        if(bytes.length!=file.size) throw new IllegalArgumentException("Incomplete blob");
        var digest=java.security.MessageDigest.getInstance("SHA-1");
        digest.update(("blob "+bytes.length+"\0").getBytes(StandardCharsets.US_ASCII));
        if(!HexFormat.of().formatHex(digest.digest(bytes)).equals(file.sha)) throw new IllegalArgumentException("Blob hash mismatch");
        String body;
        try{body=StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();}
        catch(CharacterCodingException binary){return null;}
        if(body.chars().anyMatch(c->c<32 && c!=9 && c!=10 && c!=13) ||
            body.matches("(?is).*(-----BEGIN [^-]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16}|(?:api[_-]?key|password|access[_-]?token)\\s*[:=]\\s*[^\\s]{8,}).*")) return null;
        return body;
    }
}
