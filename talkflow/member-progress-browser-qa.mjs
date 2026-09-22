import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

let playwright;try{playwright=createRequire(import.meta.url)("playwright")}catch{const runtime=join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules");playwright=createRequire(join(runtime,"playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL("..",import.meta.url)),evidence=join(root,".omo","evidence","member-progress"),mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".json":"application/json"};
await mkdir(evidence,{recursive:true});
const server=createServer(async(request,response)=>{try{const pathname=new URL(request.url,"http://localhost").pathname,relative=pathname==="/talkflow/member/"?"talkflow/member.html":pathname.slice(1),path=normalize(join(root,relative));if(!path.startsWith(normalize(root)))throw new Error("invalid path");response.setHeader("content-type",mime[extname(path)]||"application/octet-stream");response.end(await readFile(path))}catch{response.statusCode=404;response.end("Not found")}});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try{
  browser=await playwright.chromium.launch({headless:true});
  for(const width of [375,768,1280]){const page=await browser.newPage({viewport:{width,height:900}}),errors=[];await page.route(/fonts\.(?:googleapis|gstatic)\.com/,route=>route.fulfill({status:200,contentType:"text/css",body:""}));page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});await page.goto(`http://127.0.0.1:${server.address().port}/talkflow/member/?fixtures=1`,{waitUntil:"networkidle"});if(width===375){await page.locator("#member-reflection").fill("상대방을 이해하려는 마음이 선물의 가격보다 중요하다고 느꼈다.");await page.getByRole("button",{name:"읽었어요 · 기록하기"}).click();await page.getByText(/저장됨 ·/).waitFor();assert.match(await page.locator("#member-date-list").innerText(),/✓ 24일/);await page.locator(".history-panel summary").click();assert.match(await page.locator("#member-history-list").innerText(),/상대방을 이해하려는 마음/);await page.reload({waitUntil:"networkidle"});assert.equal(await page.locator("#member-reflection").inputValue(),"상대방을 이해하려는 마음이 선물의 가격보다 중요하다고 느꼈다.")}const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);assert.ok(overflow<=0,`${width}px overflow ${overflow}`);assert.deepEqual(errors,[]);await page.screenshot({path:join(evidence,`member-progress-${width}.png`),fullPage:true});await page.close()}
  console.log("Talk Flow member progress browser QA passed: 375/768/1280, save/reload/history, overflow 0, console error 0.");
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
