import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),modules=join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(join(modules,'playwright')),{PDFDocument}=require(join(modules,'pdf-lib'));
const root=fileURLToPath(new URL('.',import.meta.url)),out=resolve(process.env.PRINT_FIT_OUTPUT||join(root,'.qa-pdf/content-fit'));
assert(process.env.PRINT_FIT_TOPIC_JSON,'Supply existing-topic JSON paths separated by |; no provider is used.');
const topics=[];
for(const path of process.env.PRINT_FIT_TOPIC_JSON.split('|')){
 const data=JSON.parse(await readFile(path,'utf8'));
 for(const topic of Object.values(data.topics||data))if(topic?.generationEngine==='v3-simple')topics.push(topic);
}
assert(topics.length>0);await mkdir(out,{recursive:true});
const report={topics:[],screens:[],aiCalls:0,errors:[]};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('{"configured":false,"authenticated":false}');return;}
 if(pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));assert(path.startsWith(root));
 res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));
 }catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const topic of topics){for(const role of ['student','leader']){
 const page=await browser.newPage();
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='api.anthropic.com'||u.pathname.includes('/messages')||u.pathname.includes('/models')){report.aiCalls++;return route.abort();}return route.continue();});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
 await page.evaluate(({topic,leader})=>{document.body.innerHTML=`<main class="print-view"><div class="paper-stack">${window.TalkFlow.renderForTest(topic,leader)}</div></main>`;},{topic,leader:role==='leader'});
 await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
 const metrics=await page.locator('.a4-page').evaluateAll(pages=>pages.map(page=>{
  const bounds=page.getBoundingClientRect(),style=getComputedStyle(page),footer=page.querySelector('.simple-emergency'),footerShown=footer&&getComputedStyle(footer).display!=='none';
  const bottom=footerShown?footer.getBoundingClientRect().top:bounds.bottom-parseFloat(style.paddingBottom);
  const textRects=[],collisions=[];for(const node of page.querySelectorAll('.simple-body p,.simple-body span,.simple-body strong,.simple-body li')){const range=document.createRange();range.selectNodeContents(node);const rects=[...range.getClientRects()];textRects.push(...rects);if(rects.some(rect=>rect.bottom>bottom+1))collisions.push({text:node.textContent,bottom:Math.max(...rects.map(r=>r.bottom)),limit:bottom});}
  return{overflowX:Math.max(0,page.scrollWidth-page.clientWidth),overflowY:Math.max(0,page.scrollHeight-page.clientHeight),bodyCollision:Math.max(0,...textRects.map(rect=>rect.bottom-bottom)),collisions,footerPosition:footerShown?getComputedStyle(footer).position:null};
 }));
 const pdf=join(out,`${role}-${topic.date}.pdf`);await page.pdf({path:pdf,format:'A4',scale:1,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
 const pages=(await PDFDocument.load(await readFile(pdf))).getPageCount();report.topics.push({date:topic.date,role,pages,metrics});
 assert.equal(pages,2);for(const m of metrics){assert.equal(m.overflowX,0);assert.equal(m.overflowY,0);assert(m.bodyCollision<=1,`${role} ${topic.date} text collides by ${m.bodyCollision}px`);if(m.footerPosition)assert.equal(m.footerPosition,'static');}
 if(process.env.PRINT_FIT_BASE_CSS){for(const width of [375,768,1280,1600]){
  await page.emulateMedia({media:'screen'});await page.setViewportSize({width,height:900});
  const current=await page.screenshot({fullPage:true});
  const baseline=await readFile(process.env.PRINT_FIT_BASE_CSS,'utf8');
  await page.route('**/conversation.css',route=>route.fulfill({contentType:'text/css',body:baseline}));
  await page.reload({waitUntil:'networkidle'});
  await page.evaluate(({topic,leader})=>{document.body.innerHTML=`<main class="print-view"><div class="paper-stack">${window.TalkFlow.renderForTest(topic,leader)}</div></main>`;},{topic,leader:role==='leader'});
  await page.evaluate(()=>document.fonts.ready);const before=await page.screenshot({fullPage:true});
  if(!current.equals(before)){await writeFile(join(out,`${role}-${topic.date}-screen-${width}-current.png`),current);await writeFile(join(out,`${role}-${topic.date}-screen-${width}-before.png`),before);}
  assert(current.equals(before),`${role} screen changed at ${width}`);report.screens.push({role,date:topic.date,width,identical:true});
  await page.unroute('**/conversation.css');await page.reload({waitUntil:'networkidle'});
  await page.evaluate(({topic,leader})=>{document.body.innerHTML=`<main class="print-view"><div class="paper-stack">${window.TalkFlow.renderForTest(topic,leader)}</div></main>`;},{topic,leader:role==='leader'});await page.evaluate(()=>document.fonts.ready);
 }}await page.close();
}}assert.equal(report.aiCalls,0);assert.deepEqual(report.errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
