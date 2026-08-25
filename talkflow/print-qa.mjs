import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

let playwright, PDFDocument;
try {
  playwright = createRequire(import.meta.url)("playwright");
  ({ PDFDocument } = createRequire(import.meta.url)("pdf-lib"));
} catch {
  playwright = createRequire(join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright", "index.js"))("playwright");
  ({ PDFDocument } = createRequire(join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "pdf-lib", "cjs", "index.js"))("pdf-lib"));
}
const { chromium } = playwright;
const root = fileURLToPath(new URL(".", import.meta.url));
const output = join(root, ".qa-pdf");
const evidence = join(root, "..", ".omo", "evidence", "talkflow-pdf-render");
const grayscaleEvidence = join(root, "..", ".omo", "evidence", "talkflow-pdf-grayscale");
await mkdir(output, { recursive: true });
await mkdir(evidence, { recursive: true });
await mkdir(grayscaleEvidence, { recursive: true });
await Promise.all((await readdir(evidence)).filter(name=>name.endsWith(".png")).map(name=>unlink(join(evidence,name))));
await Promise.all((await readdir(grayscaleEvidence)).filter(name=>name.endsWith(".png")).map(name=>unlink(join(grayscaleEvidence,name))));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const path = normalize(join(root, pathname === "/" ? "index.html" : pathname));
    if (!path.startsWith(normalize(root))) throw new Error("invalid path");
    response.setHeader("Content-Type", mime[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch {
    response.statusCode = 404;
    response.end("Not found");
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const systemChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, ...(existsSync(systemChrome) ? { executablePath: systemChrome } : {}) });
const report = [];
let onlineColorText = "";
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/?fixtures=sessions`, { waitUntil: "networkidle" });
  const topics = await page.evaluate(() => TalkFlow.getTopics());
  for (const topic of Object.values(topics).sort((a, b) => a.date.localeCompare(b.date))) {
    await page.goto(`http://127.0.0.1:${port}/?fixtures=sessions&date=${topic.date}&view=print`, { waitUntil: "networkidle" });
    const safeTitle = topic.title.ko.replace(/[\\/:*?"<>|\s]+/g, "_");
    const filename = `${topic.date}_TheBox_TalkFlow_${safeTitle}.pdf`;
    const path = join(output, filename);
    const pageCount = await page.locator(".a4-page").count();
    const overflow = await page.locator(".a4-page").evaluateAll(pages => pages.map(item => {
      const body=item.querySelector(".handout-body"),last=body?.lastElementChild;
      return {
        vertical: item.scrollHeight - item.clientHeight,
        horizontal: item.scrollWidth - item.clientWidth,
        contentCollision:body&&last?Math.max(0,last.getBoundingClientRect().bottom-body.getBoundingClientRect().bottom):0
      };
    }));
    const printText = await page.locator(".a4-topic").innerText();
    if (topic.date === "2026-08-03") onlineColorText = printText;
    const sentenceOptionsText = topic.date === "2026-08-03" ? await page.locator(".sentence-options").innerText() : "";
    const printType = await page.evaluate(() => {
      const points = selector => [...document.querySelectorAll(selector)].map(node => Math.round(Number.parseFloat(getComputedStyle(node).fontSize) * 72 / 96 * 100) / 100);
      const minimum = values => values.length ? Math.min(...values) : 0;
      return {
        title: minimum(points(".v4-handout .handout-title h1")),
        question: minimum(points(".v4-handout .start-card>strong,.v4-handout .story-card>strong,.v4-handout .round-card>strong,.v4-handout .timed-round>strong,.v4-handout .main-activity>strong,.v4-handout .group-decision>strong")),
        englishInstruction: minimum(points(".v4-handout .timed-round>p,.v4-handout .bilingual-steps b,.v4-handout .assigned-opposition>p,.v4-handout .assigned-role-briefs span")),
        koreanGuidance: minimum(points(".v4-handout .timed-round>small,.v4-handout .timed-round>p small,.v4-handout .start-card>small,.v4-handout .story-card>small,.v4-handout .round-card>small,.v4-handout .session-reset small,.v4-handout .main-activity>small,.v4-handout .assigned-opposition>small,.v4-handout .assigned-opposition>p small,.v4-handout .group-decision>small,.v4-handout .everyone-rule small,.v4-handout .material-card small,.v4-handout .leader-inline span")),
        meta: minimum(points(".v4-handout .session-banner span,.v4-handout .turn-rule,.v4-handout .material-card b,.v4-handout .evidence-choice,.v4-handout .section-hint"))
      };
    });
    const speakingContent = {
      material: topic.date === "2026-08-03" ? ["REVIEW A", "REVIEW B", "REVIEW C"].every(label => printText.includes(label)) : printText.includes("USE THIS EVIDENCE") && /[.!?]/.test(printText),
      timing: topic.date === "2026-08-03" ? ["12 MIN", "18 MIN", "20 MIN", "5 MIN", "10 MIN"].every(label => printText.includes(label)) : printText.includes("45 SEC EACH"),
      turns: (printText.includes("EVERYONE") || printText.includes("everyone has spoken")) && /ASK|question|follow-up/i.test(printText),
      decision: (printText.includes("FINAL DECISION") || printText.includes("GROUP DECISION")) && /because|reason|이유/i.test(printText),
      onlineActivities: topic.date !== "2026-08-03" || (printText.includes("WRITE THE FAKE") && printText.includes("STAR FIGHT") && !printText.includes("Spot the Fake"))
      ,
      bilingualRules: topic.date !== "2026-08-03" || (printText.includes("For each review, choose BUY or DON'T BUY.") && printText.includes("각 리뷰마다 살지 말지 고르세요.") && printText.includes("SENTENCE 1") && printText.includes("SENTENCE 2")),
      hiddenAnswer: topic.date !== "2026-08-03" || !/TRUE sentence|FAKE sentence/i.test(sentenceOptionsText)
    };
    await page.pdf({ path, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
    const physicalPages=(await PDFDocument.load(await readFile(path))).getPageCount();
    await page.addStyleTag({ content: ".topbar,.print-toolbar{display:none!important}.a4-page{box-shadow:none!important}" });
    for (let index = 0; index < pageCount; index += 1) {
      await page.locator(".a4-page").nth(index).screenshot({ path: join(evidence, `${topic.date}-student-${index + 1}.png`) });
    }
    report.push({ date: topic.date, title: topic.title.ko, filename, domPages: pageCount, physicalPages, overflow, speakingContent, printType });
  }
  await page.goto(`http://127.0.0.1:${port}/?fixtures=sessions`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "일괄 인쇄", exact: true }).click();
  await page.locator("[data-action='select-approved']").click();
  await page.locator("[data-action='batch-print']").click();
  const batchPages = await page.locator(".a4-page").count();
  await page.pdf({ path: join(output, "batch-approved-topics.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  const leaderReport=[];
  let leaderText="";
  for(const topic of Object.values(topics).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5)){
    await page.goto(`http://127.0.0.1:${port}/?fixtures=sessions&section=print&date=${topic.date}&role=leader`,{waitUntil:"networkidle"});
    const leaderPages=await page.locator(".a4-page").count();
    const leaderOverflow=await page.locator(".a4-page").evaluateAll(pages=>pages.map(item=>({vertical:item.scrollHeight-item.clientHeight,horizontal:item.scrollWidth-item.clientWidth})));
    const text=await page.locator(".a4-topic").innerText();
    if(topic.date==="2026-08-03")leaderText=text;
    const leaderPdf=join(output,`${topic.date}_TheBox_TalkFlow_leader.pdf`);
    await page.pdf({path:leaderPdf,format:"A4",printBackground:true,preferCSSPageSize:true,margin:{top:"0",right:"0",bottom:"0",left:"0"}});
    const physicalPages=(await PDFDocument.load(await readFile(leaderPdf))).getPageCount();
    await page.addStyleTag({content:".topbar,.print-toolbar{display:none!important}.a4-page{box-shadow:none!important}"});
    for(let index=0;index<leaderPages;index+=1)await page.locator(".a4-page").nth(index).screenshot({path:join(evidence,`${topic.date}-leader-${index+1}.png`)});
    leaderReport.push({date:topic.date,domPages:leaderPages,physicalPages,overflow:leaderOverflow});
  }
  await page.goto(`http://127.0.0.1:${port}/?fixtures=sessions&date=2026-08-03&view=print`, { waitUntil: "networkidle" });
  const grayscaleText=await page.locator(".a4-topic").innerText();
  const grayscaleMatchesColor=grayscaleText===onlineColorText;
  await page.addStyleTag({ content: ".topbar,.print-toolbar{display:none!important}.a4-page{box-shadow:none!important;filter:grayscale(1)!important}" });
  const grayscalePdf=join(output,"2026-08-03_TheBox_TalkFlow_온라인_리뷰_grayscale.pdf");
  await page.pdf({ path: grayscalePdf, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  const grayscalePages=(await PDFDocument.load(await readFile(grayscalePdf))).getPageCount();
  for (let index = 0; index < 2; index += 1) {
    await page.locator(".a4-page").nth(index).screenshot({ path: join(grayscaleEvidence, `2026-08-03-student-${index + 1}-grayscale.png`) });
  }
  const pngManifest=(await readdir(evidence)).filter(name=>name.endsWith(".png")).sort();
  const grayscaleManifest=(await readdir(grayscaleEvidence)).filter(name=>name.endsWith(".png")).sort();
  const pass = report.every(item => item.domPages === 2 && item.physicalPages === 2 && item.overflow.every(value => value.vertical <= 1 && value.horizontal <= 1 && value.contentCollision <= 1) && Object.values(item.speakingContent).every(Boolean)
      && item.printType.title >= 18 && item.printType.question >= 11 && item.printType.englishInstruction >= 9.5 && item.printType.koreanGuidance >= 8.5 && item.printType.meta >= 7.5)
    && report.length === 10 && pngManifest.length === 30 && grayscaleManifest.length === 2 && grayscalePages === 2 && grayscaleMatchesColor && batchPages === 16 && leaderReport.length === 5 && leaderReport.every(item=>item.domPages===2&&item.physicalPages===2&&item.overflow.every(value=>value.vertical<=1&&value.horizontal<=1))
    && ["12 MIN","18 MIN","20 MIN","5 MIN","10 MIN","TIME CUT","LEADER TIME","Write the Fake는 최소 15분"].every(label=>leaderText.includes(label));
  await writeFile(join(output, "generation-results.json"), `${JSON.stringify({ pass, topics: report, leaderTopics:leaderReport, pngManifest, grayscaleManifest, grayscalePages, grayscaleMatchesColor, batchPages }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
