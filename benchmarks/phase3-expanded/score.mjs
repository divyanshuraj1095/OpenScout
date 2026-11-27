import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const json = name => JSON.parse(read(name));
const cases = read('held-out.psv').trim().split(/\r?\n/).slice(1).map(line => line.split('|'));
const baseline = json('baseline.json');
const rag = json('rag.json');
const full = json('full-ranks.json');
const source = read('../../backend/src/main/resources/rag/ARCHITECTURE.md').split(/\r?\n/);
const freeze = json('freeze.json');
const grades = [];
let top1=0, top3=0, reciprocal=0, negativePass=0, positiveMiss=0;
function stats(values) {
    const sorted=values.slice().sort((a,b)=>a-b);
    const n=sorted.length;
    return {n,median:(sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2,p95:sorted[Math.ceil(n*.95)-1]};
}
for (const [i,[type,goldChunk,gold,question]] of cases.entries()) {
    const b=baseline[i], r=rag[i], expected=Boolean(goldChunk);
    assert.equal(b.question,question);assert.equal(r.question,question);
    assert.deepEqual(full[question].slice(0,3),r.ranks.map(h=>h.chunk));
    const rank=expected?full[question].indexOf(goldChunk)+1:null;
    if(expected){assert.ok(rank>0);top1+=rank===1;top3+=rank<=3;reciprocal+=1/rank;}
    const filtered=r.ranks.filter(h=>h.score>=freeze.threshold);
    negativePass+=!expected&&filtered.length>0;
    positiveMiss+=expected&&!filtered.some(h=>h.chunk===goldChunk);
    const citations=r.response.citations.map(c=>{
        const pinned='8c9aa3f92c032e09263f8a601d999f948e0bd070';
        const valid=filtered.some(h=>h.chunk===c.chunkId) && c.path==='docs/ARCHITECTURE.md'
            && c.commitSha===pinned && c.chunkId==='c'+c.startLine
            && c.url==='https://github.com/divyanshuraj1095/OpenScout/blob/'+pinned+'/'+c.path+'#L'+c.startLine+'-L'+c.endLine;
        return {valid, supportsQuote:source.slice(c.startLine-1,c.endLine).join('\n').includes(r.response.answer)};
    });
    // Semantic adjudication of the five non-abstaining responses in the recorded run.
    const bAbstained=b.raw.trim()==='Insufficient context.';
    const rAbstained=!r.response.grounded;
    if(!bAbstained) assert.equal(i+1,3);
    if(!rAbstained) assert.ok([2,7,10,13].includes(i+1));
    grades.push({id:i+1,type,question,gold,rank,
        baseline:{abstained:bAbstained,correct:!expected&&bAbstained,unsupportedSentences:bAbstained?0:2},
        rag:{abstained:rAbstained,correct:expected?[10,13].includes(i+1)&&!rAbstained:rAbstained,
            citations,unsupportedSentences:0}});
}
const positives=cases.filter(c=>c[1]).length, negatives=cases.length-positives;
const metrics={};
for(const arm of ['baseline','rag']){
    const answered=grades.filter(g=>!g[arm].abstained);
    const pos=grades.filter(g=>g.rank!==null), neg=grades.filter(g=>g.rank===null);
    metrics[arm]={overallCorrect:grades.filter(g=>g[arm].correct).length,answerableCorrect:pos.filter(g=>g[arm].correct).length,
        correctAbstentions:neg.filter(g=>g[arm].abstained).length,incorrectAbstentions:pos.filter(g=>g[arm].abstained).length,
        falseAcceptanceRate:neg.filter(g=>!g[arm].abstained).length/negatives,falseRejectionRate:pos.filter(g=>g[arm].abstained).length/positives,
        unsupportedSentences:answered.reduce((n,g)=>n+g[arm].unsupportedSentences,0)};
}
const summary={positives,negatives,metrics,recall1:top1/positives,recall3:top3/positives,mrr:reciprocal/positives,
    top1,top3,threshold:freeze.threshold,negativePass,positiveMiss,
    citations:grades.flatMap(g=>g.rag.citations),timingsMs:{
        queryEmbedding:stats(rag.map(r=>r.embeddingMs)),vectorSQL:stats(rag.map(r=>r.vectorMs)),
        ragGeneration:stats(rag.filter(r=>r.raw!==undefined).map(r=>r.generationMs)),
        baselineGeneration:stats(baseline.map(b=>b.elapsedMs)),ragEndToEnd:stats(rag.map(r=>r.elapsedMs))}};
fs.writeFileSync(fileURLToPath(new URL('scores.json',import.meta.url)),JSON.stringify({summary,grades},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
