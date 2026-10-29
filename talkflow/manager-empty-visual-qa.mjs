import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

let playwright;
try{playwright=createRequire(import.meta.url)("playwright")}catch{playwright=createRequire(join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules","playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL(".",import.meta.url)),mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".json":"application/json"};
const server=createServer(async(req,res)=>{try{const requested=new URL(req.url,"http://localhost").pathname;if(requested.startsWith("/api/")){res.setHeader("Content-Type","application/json");res.end(JSON.stringify({configured:false,authenticated:false}));return}const pathname=requested.replace(/^\/talkflow\//,"/"),path=normalize(join(root,pathname==="/"?"index.html":pathname.slice(1)));if(!path.startsWith(normalize(root)))throw new Error();res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.statusCode=404;res.end("Not found")}});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await playwright.chromium.launch({headless:true}),artifacts=join(root,"artifacts"),errors=[];
await mkdir(artifacts,{recursive:true});
try{for(const width of [375,768,1280]){const page=await browser.newPage({viewport:{width,height:900}});await page.addInitScript(()=>localStorage.setItem("tb_talkflow_v1",JSON.stringify({"2026-09-24":{date:"2026-09-24",title:{en:"Legacy topic",ko:"구형 토픽"},generationEngine:"v3-simple"}})));await page.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));page.on("console",message=>{if(message.type()==="error")errors.push(`${width}: ${message.text()}`)});await page.goto(`${origin}/?section=topics&view=tasks&month=2026-09`,{waitUntil:"networkidle"});if(await page.locator(".manager-zero-hero").count()!==1)throw new Error(`${width}: legacy local topic bypassed reset`);if(await page.getByRole("button",{name:"첫 토픽 만들기"}).count()!==1)throw new Error(`${width}: primary action missing`);if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1))throw new Error(`${width}: horizontal overflow`);await page.screenshot({path:join(artifacts,`manager-empty-${width}.png`),fullPage:true});await page.close()}if(errors.length)throw new Error(errors.join(" | "));console.log("PASS manager-empty-visual-qa: 375/768/1280 reset, action, overflow 0")}finally{await browser.close();server.close()}
