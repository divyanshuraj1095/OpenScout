package org.openscout.rag;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

interface Encoder {
    float[] encode(String text);
}
interface Generator {
    String generate(String instructions,String input);
}
@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="rag.embedding.provider",havingValue="ollama")
class SpringEncoder implements Encoder {
    private final EmbeddingModel model;
    SpringEncoder(EmbeddingModel model){this.model=model;}
    public float[] encode(String text){
        try {return model.embed(text);}
        catch(RuntimeException ex){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Embedding unavailable");}
    }
}
@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnExpression("'${rag.generation.provider}' == 'groq' || '${rag.generation.provider}' == 'hosted'")
class GroqGenerator implements Generator {
    private final ProviderHttp http=new ProviderHttp();
    private final ObjectMapper json;
    private final URI endpoint;
    private final String key,model;
    GroqGenerator(ObjectMapper json,@Value("${rag.generation.url}") URI endpoint,
                  @Value("${rag.generation.key}") String key,@Value("${rag.generation.model}") String model){
        this.json=json;this.endpoint=endpoint;this.key=key;this.model=model;
    }
    public String generate(String instructions,String input){
        if(key.isBlank()) throw unavailable();
        try {
            var payload=Map.of("model",model,"temperature",0,"max_tokens",400,
                "messages",List.of(Map.of("role","system","content",instructions),Map.of("role","user","content",input)));
            return json.readTree(http.post(endpoint,key,json.writeValueAsString(payload))).at("/choices/0/message/content").asString();
        } catch(Exception e){throw unavailable();}
    }
    private static ResponseStatusException unavailable(){return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Generation unavailable");}
}

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="rag.embedding.provider",havingValue="hosted")
class HostedEncoder implements Encoder {
    private final ProviderHttp http=new ProviderHttp();
    private final ObjectMapper json;
    private final URI endpoint;
    private final String key,model;
    HostedEncoder(ObjectMapper json,@Value("${rag.embedding.url}") URI endpoint,@Value("${rag.embedding.key}") String key,
                  @Value("${rag.embedding.model}") String model){
        this.json=json;this.endpoint=endpoint;this.key=key;this.model=model;
    }
    public float[] encode(String input){
        try {
            String payload=json.writeValueAsString(Map.of("input",input,"model",model));
            var result=json.readTree(http.post(endpoint,key,payload)).at("/data/0/embedding");
            return json.treeToValue(result,float[].class);
        } catch(Exception ex){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Embedding unavailable");}
    }
}

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="rag.generation.provider",havingValue="ollama")
class OllamaGenerator implements Generator {
    private final ProviderHttp http=new ProviderHttp();
    private final ObjectMapper json;
    private final URI endpoint;
    private final String model;
    OllamaGenerator(ObjectMapper json,@Value("${spring.ai.ollama.base-url}") URI origin,
                    @Value("${rag.generation.ollama-model}") String model){
        this.json=json;this.endpoint=origin.resolve("/api/chat");this.model=model;
    }
    public String generate(String instructions,String input){
        var messages=List.of(Map.of("role","system","content",instructions),Map.of("role","user","content",input));
        var payload=Map.of("model",model,"stream",false,"messages",messages,
            "options",Map.of("temperature",0,"seed",42,"num_predict",400,"num_ctx",4096));
        try {
            return json.readTree(http.post(endpoint,"",json.writeValueAsString(payload))).at("/message/content").asString();
        } catch(Exception ex){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Generation unavailable");}
    }
}

class ProviderHttp {
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    String post(URI endpoint,String key,String payload) throws Exception {
        if(!"https".equals(endpoint.getScheme()) && !Set.of("127.0.0.1","localhost").contains(endpoint.getHost()))
            throw new IllegalArgumentException("Provider requires TLS");
        try {
            var request=HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(key.isBlank()?180:30))
                .header("Content-Type","application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload));
            if(!key.isBlank()) request.header("Authorization","Bearer "+key);
            var response=http.send(request.build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200) throw new java.io.IOException("Provider request failed");
            return response.body();
        } catch(InterruptedException e){Thread.currentThread().interrupt();throw e;}
    }
}