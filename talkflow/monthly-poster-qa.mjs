import {createRequire} from "node:module";
import {createServer} from "node:http";
import {mkdir,readFile} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";

let playwright;
try{playwright=createRequire(import.meta.url)("playwright")}catch{playwright=createRequire(join(homedir(),".cache","codex-runtimes","codex-primary-runtime","dependencies","node","node_modules","playwright","index.js"))("playwright")}
const root=fileURLToPath(new URL(".",import.meta.url));
const mime={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".json":"application/json"};
const server=createServer(async(req,res)=>{try{const requestedPath=new URL(req.url,"http://localhost").pathname;if(requestedPath==="/api/talkflow/status/"){res.setHeader("Content-Type","application/json");res.end(JSON.stringify({configured:false,authenticated:false,model:"Claude Sonnet 4.6"}));return}const pathname=requestedPath.replace(/^\/talkflow\//,"/"),path=normalize(join(root,pathname==="/"?"index.html":pathname.slice(1)));if(!path.startsWith(normalize(root)))throw new Error("invalid path");res.setHeader("Content-Type",mime[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.statusCode=404;res.end("Not found")}});
const fixture=JSON.parse(await readFile(join(root,"fixtures","member-topic.json"),"utf8"));
const categoryColors={"WORK & CAREER":"#35507A",LIFE:"#355E3B","CONSUMER & ECONOMY":"#9C7A1E",CULTURE:"#1F4D3D","RELATIONSHIPS & FAMILY":"#A65166"};
const approvedTopic=(date,title,category)=>({
  ...structuredClone(fixture),
  id:`poster-${date}`,
  date,
  title:{en:title,ko:""},
  page1:{...structuredClone(fixture.page1),title:{...fixture.page1.title,en:title},category,categoryColor:categoryColors[category]},
  topicPlan:{...structuredClone(fixture.topicPlan),titleEn:title,category},
  generatedConversation:true,
  generationEngine:"v4-topic-v43",
  standardVersion:"4.3",
  templateVersion:"topic-v4.3",
  quality:{status:"approved",score:100,issues:[]},
  operatorStatus:{generationStatus:"complete",reviewStatus:"approved",printStatus:"unchecked",used:false},
  hidden:false,
  createdAt:new Date().toISOString(),
  updatedAt:new Date().toISOString()
});
const topics={
  "2026-10-01":approvedTopic("2026-10-01","Should You Answer That Message Tonight?","WORK & CAREER"),
  "2026-10-04":approvedTopic("2026-10-04","No Phone or No Coffee?","LIFE"),
  "2026-10-15":approvedTopic("2026-10-15","My Budget, Plus a Lie","CONSUMER & ECONOMY"),
  "2026-10-29":approvedTopic("2026-10-29","Two Truths, One Neighborhood Lie","CULTURE"),
  "2027-05-31":approvedTopic("2027-05-31","My Friend Won't Stop Talking","RELATIONSHIPS & FAMILY")
};
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await playwright.chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1500,height:1100}});
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
try{
  await mkdir(join(root,"artifacts"),{recursive:true});
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.evaluate(value=>localStorage.setItem("tb_talkflow_v1",JSON.stringify(value)),topics);
  await page.goto(`${origin}/?section=poster&month=2026-10`,{waitUntil:"networkidle"});
  if(await page.locator(".poster-page").count()!==1)throw new Error("monthly poster page is missing");
  if(!await page.locator(".poster-toolbar").isVisible()||await page.getByRole("button",{name:"PDF 저장 / 인쇄"}).count()!==1)throw new Error("poster print toolbar is missing");
  if(await page.locator(".poster-header h1").innerText()!=="October 2026")throw new Error("poster header must use English month and year only");
  if(await page.locator(".poster-header>strong").innerText()!=="THE BOX TOPIC")throw new Error("poster brand label is missing");
  if(await page.locator(".poster-weekdays span").allTextContents().then(values=>values.join(" "))!=="SUN MON TUE WED THU FRI SAT")throw new Error("weekday bar must use SUN through SAT");
  const octoberLayout=await page.locator(".poster-page").evaluate(poster=>({
    width:poster.getBoundingClientRect().width,
    height:poster.getBoundingClientRect().height,
    rows:document.querySelector(".poster-grid").style.gridTemplateRows,
    cells:document.querySelectorAll(".poster-cell").length,
    labels:[...document.querySelectorAll(".poster-cell")].map(cell=>cell.textContent||"").join(" "),
    dots:[...document.querySelectorAll(".poster-category-dot")].map(dot=>({width:getComputedStyle(dot).width,height:getComputedStyle(dot).height,color:getComputedStyle(dot).backgroundColor})),
    phrases:[...document.querySelectorAll(".poster-q")].map(phrase=>({height:phrase.clientHeight,scrollHeight:phrase.scrollHeight,size:parseFloat(getComputedStyle(phrase).fontSize)})),
    printRule:document.querySelector("#poster-print-page-size")?.textContent||""
  }));
  const expectedWidth=364/25.4*96,expectedHeight=257/25.4*96;
  if(Math.abs(octoberLayout.width-expectedWidth)>2||Math.abs(octoberLayout.height-expectedHeight)>2)throw new Error(`poster physical size mismatch: ${JSON.stringify(octoberLayout)}`);
  if(octoberLayout.rows!=="repeat(5, 1fr)"||octoberLayout.cells!==35)throw new Error(`October must render an equal five-row grid: ${JSON.stringify(octoberLayout)}`);
  if(/WORK & CAREER|LIFE|CONSUMER & ECONOMY|CULTURE/.test(octoberLayout.labels))throw new Error("category labels must not appear in poster cells");
  if(octoberLayout.dots.some(dot=>dot.width!=="7px"||dot.height!=="7px")||octoberLayout.dots[0]?.color!=="rgb(42, 75, 141)")throw new Error(`poster category dots are incorrect: ${JSON.stringify(octoberLayout.dots)}`);
  if(octoberLayout.phrases.some(phrase=>phrase.scrollHeight>phrase.height+1||phrase.size<11))throw new Error(`poster phrase clipping detected: ${JSON.stringify(octoberLayout.phrases)}`);
  if(!octoberLayout.printRule.includes("364mm 257mm"))throw new Error("poster B4 print rule is missing");
  await page.locator(".poster-page").screenshot({path:join(root,"artifacts","monthly-poster-october.png")});
  await page.screenshot({path:join(root,"artifacts","monthly-poster-admin-view.png"),fullPage:true});
  await page.pdf({path:join(root,"artifacts","monthly-poster-october.pdf"),width:"364mm",height:"257mm",preferCSSPageSize:true,printBackground:true});
  await page.goto(`${origin}/?section=poster&month=2027-05`,{waitUntil:"networkidle"});
  const mayLayout=await page.locator(".poster-page").evaluate(poster=>({
    width:poster.getBoundingClientRect().width,
    height:poster.getBoundingClientRect().height,
    rows:document.querySelector(".poster-grid").style.gridTemplateRows,
    cells:[...document.querySelectorAll(".poster-cell")].map(cell=>cell.getBoundingClientRect().height)
  }));
  if(Math.abs(mayLayout.width-expectedWidth)>2||Math.abs(mayLayout.height-expectedHeight)>2)throw new Error(`six-row poster physical size mismatch: ${JSON.stringify(mayLayout)}`);
  if(mayLayout.rows!=="repeat(6, 1fr)"||mayLayout.cells.length!==42)throw new Error(`May must render an equal six-row grid: ${JSON.stringify(mayLayout)}`);
  if(Math.max(...mayLayout.cells)-Math.min(...mayLayout.cells)>1)throw new Error(`six-row poster cell heights are not equal: ${JSON.stringify(mayLayout.cells)}`);
  await page.locator(".poster-page").screenshot({path:join(root,"artifacts","monthly-poster-may-2027.png")});
  await page.goto(`${origin}/?section=topics&view=calendar&month=2026-10`,{waitUntil:"networkidle"});
  if(await page.locator("#poster-print-page-size").count())throw new Error("poster print rule must be removed outside the poster view");
  if(await page.locator("[data-action=monthly-poster]").count()!==1)throw new Error("manager poster action is missing");
  await page.screenshot({path:join(root,"artifacts","monthly-poster-manager-entry.png"),fullPage:true});
  if(errors.length)throw new Error(`poster route runtime errors: ${errors.join(" | ")}`);
  console.log("PASS monthly-poster-qa: B4 physical size, 5/6 rows, print PDF, no labels, auto-fit");
}finally{await browser.close();server.close()}
