const fixture=require('./fixture.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const url=new URL(process.env.DATABASE_URL); if(url.hostname!=='127.0.0.1'||url.port!=='58437'||url.pathname!=='/postgres'||url.username!=='openscout_test') throw Error('Disposable database required');
require('ts-node').register({transpileOnly:true,compilerOptions:{ignoreDeprecations:'6.0'}});
const axios=require('axios');
axios.interceptors.request.use(config=>{
  const url=new URL(config.url);
  assert.equal(url.origin,'https://api.github.com');
  config.url='http://127.0.0.1:18562'+url.pathname+url.search;
  return config;
});
const express=require('express');
const app=express();
app.use(express.json(),require('cookie-parser')(),require('../src/middlewares/auth.middleware').authUser,require('../src/routes/repoRoute').default);
const db=require('../src/config/db').default;
async function main(){
  await new Promise(resolve=>fixture.listen(18562,'127.0.0.1',resolve));
  const api=app.listen(0,'127.0.0.1');
  try {
    const user=await db.user.create({data:{name:'Bench',email:'bench@example.test',password:'unused'}});
    const token=require('jsonwebtoken').sign({id:user.id},process.env.JWT);
    const samples=[];
    for(let i=1;i<=12;i++){
      const start=performance.now();
      const res=await fetch('http://127.0.0.1:'+api.address().port+'/repo',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'token='+token},body:JSON.stringify({repoUrl:'https://github.com/fixture/demo'+i})});
      const body=await res.json();
      const ms=performance.now()-start;
      assert.equal(res.status,200,body.message);
      assert.equal(body.data,100);
      samples.push(ms);
    }
    assert.equal(await db.issue.count(),1200);
    fs.writeFileSync('benchmarks/node.json',JSON.stringify({cpu:os.cpus()[0].model,ram:os.totalmem(),platform:os.release(),node:process.version,warmups:2,ms:samples},null,2));
  } finally {api.close();fixture.close();await db.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
