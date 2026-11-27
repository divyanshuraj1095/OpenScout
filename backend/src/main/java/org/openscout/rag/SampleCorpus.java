package org.openscout.rag;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.core.io.ClassPathResource;

final class SampleCorpus {
    static final String COMMIT="8c9aa3f92c032e09263f8a601d999f948e0bd070";
    static final String PATH="docs/ARCHITECTURE.md";
    static final String URL="https://github.com/divyanshuraj1095/OpenScout/blob/"+COMMIT+"/"+PATH;
    record Chunk(String id,int start,int end,String body) {}
    static List<Chunk> load() throws IOException {
        return split(new ClassPathResource("rag/ARCHITECTURE.md").getContentAsString(StandardCharsets.UTF_8));
    }
    static List<Chunk> split(String source){
        var lines=source.lines().toList();
        var chunks=new ArrayList<Chunk>();
        for(int i=0;i<lines.size();){
            if(lines.get(i).isBlank()){i++;continue;}
            int start=i;
            var body=new StringJoiner("\n");
            while(i<lines.size() && !lines.get(i).isBlank() && i-start<8){
                if(lines.get(i).length()>1600) throw new IllegalArgumentException("Fixture line exceeds limit");
                if(body.length()+lines.get(i).length()+1>1800) break;
                body.add(lines.get(i++));
            }
            chunks.add(new Chunk("c"+(start+1),start+1,i,body.toString()));
        }
        return List.copyOf(chunks);
    }
}
