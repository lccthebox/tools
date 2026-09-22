import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';

const require=createRequire(import.meta.url);
const {chromium}=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=fileURLToPath(new URL('.',import.meta.url)),out=resolve(root,'../.omo/evidence/readable-preview');
assert(process.env.READABLE_TOPIC_JSON,'Provide an existing topic export; this QA never generates content.');
const data=JSON.parse(await readFile(process.env.READABLE_TOPIC_JSON,'utf8'));
const topic=Object.values(data.topics).find(item=>item.generationEngine==='v3-simple');
assert(topic);await mkdir(out,{recursive:true});
const report={screens:[],printRoutes:[],aiCalls:0,errors:[],history:false,dataUnchanged:false};
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('{"configured":false,"authenticated":false}');return;}
 if(pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));assert(path.startsWith(root));
 res.setHeader('content-type',({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));
 }catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext();
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='api.anthropic.com'||/\/api\/talkflow\/(models|messages)/.test(u.pathname)){report.aiCalls++;return route.abort();}
  return route.continue();
 });
 await context.addInitScript(({topic})=>{if(!localStorage.getItem('tb_talkflow_v1'))localStorage.setItem('tb_talkflow_v1',JSON.stringify({[topic.date]:topic}));},{topic});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const url=(role,number)=>`http://127.0.0.1:${server.address().port}/?section=topics&view=month&month=${topic.date.slice(0,7)}&date=${topic.date}&tab=${role}&page=${number}`;
 for(const width of [375,768,1280,1600])for(const role of ['student','leader'])for(const number of [1,2]){
  await page.setViewportSize({width,height:900});await page.goto(url(role,number),{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const metrics=await page.locator('.preview-surface .a4-page').evaluateAll(pages=>pages.filter(p=>getComputedStyle(p).display!=='none').map(p=>{
   const body=p.querySelector('.simple-body'),r=p.getBoundingClientRect(),s=getComputedStyle(body);
   const clipped=[...p.querySelectorAll('p,span,strong,li')].filter(n=>{const range=document.createRange();range.selectNodeContents(n);return [...range.getClientRects()].some(t=>t.right>r.right+.5||t.bottom>r.bottom+.5||t.left<r.left-.5);}).map(n=>n.className);
   return {bodyOverflow:s.overflow,height:s.height,questionColumns:p.querySelector('.simple-questions')?getComputedStyle(p.querySelector('.simple-questions')).gridTemplateColumns:null,clipped};
  }));
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
  assert.equal(metrics.length,1);assert.equal(overflow,0);assert.equal(metrics[0].bodyOverflow,'visible');assert.deepEqual(metrics[0].clipped,[]);
  assert.equal(await page.locator('.preview-toolbar [data-preview-page]').count(),0);assert.equal(await page.locator('[data-preview-zoom]').count(),0);
  if(number===1)assert.equal(await page.locator('.preview-surface .simple-questions>li').count(),6);
  else assert(await page.locator('.preview-surface .simple-final').isVisible());
  const image=`${role}-${number}-${width}.png`;await page.screenshot({path:join(out,image),fullPage:true});report.screens.push({role,number,width,overflow,metrics,image});
 }
 const before=await page.evaluate(()=>localStorage.getItem('tb_talkflow_v1'));
 await page.goto(url('student',1),{waitUntil:'networkidle'});await page.locator('.route-page-switch [data-preview-page="2"]').click();
 await page.goBack();assert.equal(new URL(page.url()).searchParams.get('page'),'1');await page.goForward();assert.equal(new URL(page.url()).searchParams.get('page'),'2');
 await page.reload({waitUntil:'networkidle'});assert(await page.locator('.preview-surface .simple-final').isVisible());report.history=true;
 for(const role of ['student','leader']){
  await page.goto(url(role,1),{waitUntil:'networkidle'});await page.locator('.preview-toolbar .primary').click();
  assert.equal(await page.locator('.print-view .a4-page').count(),2);
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:join(out,`print-route-${role}.png`),fullPage:true});
  report.printRoutes.push({role,pages:2,overflow:await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth))});
 }
 assert(report.printRoutes.every(r=>r.overflow===0));assert.equal(await page.evaluate(()=>localStorage.getItem('tb_talkflow_v1')),before);report.dataUnchanged=true;
 assert.equal(report.aiCalls,0);assert.deepEqual(report.errors,[]);
}finally{await browser.close();await new Promise(done=>server.close(done));await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({screens:report.screens.length,printRoutes:report.printRoutes,history:report.history,dataUnchanged:report.dataUnchanged,aiCalls:report.aiCalls,errors:report.errors}));
