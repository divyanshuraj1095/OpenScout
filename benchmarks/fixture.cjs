const http = require('node:http');
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://localhost');
  const numeric = /^\/repositories\/(\d+)(\/issues)?$/.exec(url.pathname);
  if(numeric) url.pathname="/repos/fixture/demo"+(Number(numeric[1])-1000)+(numeric[2]||"");
  const match = /^\/repos\/fixture\/demo(\d+)(\/issues)?$/.exec(url.pathname);
  if (!match) { res.writeHead(404).end(); return; }
  const id = 1000 + Number(match[1]);
  const html = 'https://github.com/fixture/demo'+match[1];
  const repo = {id,name:'demo'+match[1],owner:{login:'fixture'},html_url:html,private:false,
    visibility:'public',language:'Java',description:'Fixture',stargazers_count:10};
  const issues = Array.from({length:100}, (_,i)=>({id:id*1000+i,number:i+1,
    title:'Issue '+i,body:'Reproducible issue '+i,html_url:html+'/issues/'+(i+1),state:'open',
    labels:[{name:i%2?'good first issue':'advanced'}],updated_at:'2026-01-01T00:00:00Z'}));
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(match[2]?issues:repo));
});
module.exports = server;
if(require.main===module) server.listen(18562,'127.0.0.1');

