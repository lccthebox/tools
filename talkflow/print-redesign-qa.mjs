import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const runtimeModules = join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules");
const load = name => {
  try {
    return require(name);
  } catch {
    return require(join(runtimeModules, name));
  }
};
const { chromium } = load("playwright");
const { PDFDocument } = load("pdf-lib");
const root = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = normalize(join(root, ".."));
const evidenceRoot = join(repoRoot, ".omo", "evidence", "talkflow-print-redesign");
const label = process.env.TALKFLOW_PRINT_QA_LABEL || "current";
const evidence = join(evidenceRoot, label);
const pdfOutput = join(root, ".qa-pdf", "print-redesign");
const exportPath = process.env.TALKFLOW_MONTH_JSON || "C:\\Users\\thebox\\Downloads\\thebox-talkflow-2026-08 (2).json";
const exportData = JSON.parse(await readFile(exportPath, "utf8"));
const topic = exportData.topics?.["2026-08-31"];
if (topic?.title?.en !== "When the Hotel Room Isn't What You Expected") {
  throw new Error("The approved 2026-08-31 topic was not found in the supplied month export.");
}

await mkdir(evidence, { recursive: true });
await mkdir(pdfOutput, { recursive: true });
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/api/talkflow/status/") {
      response.setHeader("Content-Type", "application/json");
      response.end('{"configured":false,"authenticated":false}');
      return;
    }
    if (pathname === "/favicon.ico") {
      response.statusCode = 204;
      response.end();
      return;
    }
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
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const context = await browser.newContext();
await context.route("https://fonts.googleapis.com/**", route => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
const consoleErrors = [];
const externalAiRequests = [];
const report = { label, topic: { date: topic.date, title: topic.title }, screen: [], print: {} };

try {
  const screenPage = await context.newPage();
  screenPage.on("console", message => {
    if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url });
  });
  screenPage.on("request", request => {
    if (request.url().includes("api.anthropic.com")) externalAiRequests.push(request.url());
  });
  for (const width of [375, 768, 1280, 1600]) {
    await screenPage.setViewportSize({ width, height: 900 });
    await screenPage.goto(`http://127.0.0.1:${port}/?fixtures=sessions&section=topics&view=tasks&month=2026-08`, { waitUntil: "networkidle" });
    const horizontalOverflow = await screenPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const screenshot = join(evidence, `screen-${width}.png`);
    await screenPage.screenshot({ path: screenshot, fullPage: true });
    report.screen.push({ width, horizontalOverflow, screenshot });
  }

  for (const role of ["student", "leader"]) {
    const page = await context.newPage();
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url });
    });
    page.on("request", request => {
      if (request.url().includes("api.anthropic.com")) externalAiRequests.push(request.url());
    });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.evaluate(({ value, isLeader }) => {
      document.body.innerHTML = `<main class="print-view"><div class="paper-stack">${window.TalkFlow.renderForTest(value, isLeader)}</div></main>`;
    }, { value: topic, isLeader: role === "leader" });
    await page.emulateMedia({ media: "print" });
    const metrics = await page.locator(".simple-handout").evaluate(handout => {
      const points = selector => [...handout.querySelectorAll(selector)].map(node => Number.parseFloat(getComputedStyle(node).fontSize) * 72 / 96);
      const weight = selector => [...handout.querySelectorAll(selector)].map(node => Number.parseInt(getComputedStyle(node).fontWeight, 10));
      const minimum = selector => {
        const values = points(selector);
        return values.length ? Math.min(...values) : null;
      };
      const pages = [...handout.querySelectorAll(".a4-page")];
      const finalKorean = handout.querySelector(".simple-final>span");
      const characterLines = (node, target) => {
        if (!node?.firstChild) return [];
        const start = node.textContent.indexOf(target);
        if (start < 0) return [];
        return [...target].map((character, index) => {
          if (/\s/u.test(character)) return null;
          const range = document.createRange();
          range.setStart(node.firstChild, start + index);
          range.setEnd(node.firstChild, start + index + 1);
          return Math.round(range.getBoundingClientRect().top * 10) / 10;
        }).filter(value => value !== null);
      };
      const finalKoreanStyle = finalKorean ? getComputedStyle(finalKorean) : null;
      const wrappingPhrases = ["한 가지", "두 가지", "세 가지", "어떤 사람", "다른 사람", "가장 중요한", "선택할 수 있는", "이야기해 보세요"];
      const fixture = document.createElement("div");
      fixture.className = "simple-handout";
      fixture.style.cssText = "position:fixed;left:-10000px;top:0;width:7mm";
      fixture.innerHTML = `<section class="simple-section simple-final">${wrappingPhrases.map(phrase => `<span>${phrase}</span>`).join("")}<strong>English wrapping remains normal.</strong></section>`;
      document.body.append(fixture);
      const fixtureResults = [...fixture.querySelectorAll("span")].map(node => {
        const text = node.textContent;
        let offset = 0;
        const tokens = text.split(/\s+/u).map(token => {
          const start = text.indexOf(token, offset);
          offset = start + token.length;
          return { token, lines: characterLines(node, token).length ? [...new Set(characterLines(node, token))].length : 0 };
        });
        return { text, tokens };
      });
      const fixtureEnglishStyle = getComputedStyle(fixture.querySelector("strong"));
      const englishWrapping = { wordBreak: fixtureEnglishStyle.wordBreak, overflowWrap: fixtureEnglishStyle.overflowWrap };
      fixture.remove();
      return {
        domPages: pages.length,
        pageParts: pages.map(node => [...node.children].map(child => ({ name: child.className || child.tagName, height: child.getBoundingClientRect().height }))),
        pageSize: pages.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })),
        overflow: pages.map(node => ({ vertical: node.scrollHeight - node.clientHeight, horizontal: node.scrollWidth - node.clientWidth })),
        contentCollision: pages.map(node => {
          const body = node.querySelector(".simple-body");
          const footer = node.querySelector(".simple-emergency");
          const pageRect = node.getBoundingClientRect();
          const contentBottom = pageRect.bottom - Number.parseFloat(getComputedStyle(node).paddingBottom);
          const lastBottom = body?.lastElementChild?.getBoundingClientRect().bottom ?? 0;
          const footerTop = footer && getComputedStyle(footer).display !== "none" ? footer.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
          return Math.max(0, lastBottom - contentBottom, lastBottom - footerTop);
        }),
        bottomClearanceMm: pages.map(node => {
          const pageRect = node.getBoundingClientRect();
          const content = [...node.querySelectorAll(":scope > .simple-header,:scope > .simple-title,:scope > .simple-body > .simple-section,:scope > .simple-emergency")]
            .filter(child => getComputedStyle(child).display !== "none" && child.getBoundingClientRect().height > 0);
          const bottom = Math.max(...content.map(child => child.getBoundingClientRect().bottom));
          return (pageRect.bottom - bottom) * 25.4 / 96;
        }),
        emergencyVisible: [...handout.querySelectorAll(".simple-emergency")]
          .filter(node => getComputedStyle(node).display !== "none" && node.getBoundingClientRect().height > 0).length,
        koreanWrapping: {
          wordBreak: finalKoreanStyle?.wordBreak ?? null,
          overflowWrap: finalKoreanStyle?.overflowWrap ?? null,
          lineBreak: finalKoreanStyle?.lineBreak ?? null,
          whiteSpace: finalKoreanStyle?.whiteSpace ?? null,
          oneThingLines: characterLines(finalKorean, "한 가지"),
          fixtures: fixtureResults,
          englishWordBreak: englishWrapping.wordBreak,
          englishOverflowWrap: englishWrapping.overflowWrap
        },
        sectionContentOverflow: pages.map(node => Math.max(0, ...[...node.querySelectorAll(":scope > .simple-body > .simple-section")].map(section => {
          const sectionBottom = section.getBoundingClientRect().bottom;
          const contentBottom = Math.max(sectionBottom, ...[...section.querySelectorAll("*")].map(child => child.getBoundingClientRect().bottom));
          return contentBottom - sectionBottom;
        }))),
        largeBoxes: pages.map(node => node.querySelectorAll(".simple-story,.simple-materials,.simple-result").length),
        fullQuestionCards: [...handout.querySelectorAll(".simple-questions li")].filter(node => {
          const style = getComputedStyle(node);
          return [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
            .every(value => Number.parseFloat(value) > 0);
        }).length,
        sectionHeights: pages.map(node => [...node.querySelectorAll(":scope > .simple-body > .simple-section")].map(section => ({
          name: section.querySelector("h2")?.textContent || "",
          height: section.getBoundingClientRect().height
        }))),
        activityParts: [...handout.querySelectorAll(".simple-activity")].map(activity => [...activity.children].map(node => ({
          name: node.className || node.tagName,
          height: node.getBoundingClientRect().height,
          top: node.getBoundingClientRect().top - activity.getBoundingClientRect().top,
          bottom: node.getBoundingClientRect().bottom - activity.getBoundingClientRect().top
        }))),
        type: {
          title: minimum(".simple-title h1"),
          sectionMajor: minimum(".simple-story h2,.simple-activity>h2"),
          sectionWorking: minimum(".simple-page-1>.simple-section:not(.simple-story):not(.simple-reset) h2"),
          sectionSupport: minimum(".simple-reset h2,.simple-result h2,.simple-think h2"),
          storyEnglish: minimum(".simple-story-copy p:first-child"),
          storyKorean: minimum(".simple-story-copy p + p"),
          question: minimum(".simple-questions strong,.simple-final>strong,.simple-think>strong"),
          questionWeights: weight(".simple-questions strong"),
          korean: minimum(".simple-questions>li>span,.simple-instruction,.simple-steps li,.simple-participation,.simple-result>span,.simple-final>span"),
          leaderNote: minimum(".simple-leader-note")
        },
        structure: {
          story: handout.querySelectorAll(".simple-story").length,
          easy: [...handout.querySelectorAll("h2")].filter(node => node.textContent === "EASY TALK").length,
          real: [...handout.querySelectorAll("h2")].filter(node => node.textContent === "REAL TALK").length,
          english: handout.querySelectorAll(".simple-english p").length,
          steps: handout.querySelectorAll(".simple-steps li").length,
          result: handout.querySelectorAll(".simple-result").length,
          thinkHarder: handout.querySelectorAll(".simple-think").length,
          final: handout.querySelectorAll(".simple-final").length
        }
      };
    });
    const pdf = join(pdfOutput, `2026-08-31-${role}.pdf`);
    await page.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
    const physicalPages = (await PDFDocument.load(await readFile(pdf))).getPageCount();
    report.print[role] = { ...metrics, physicalPages, pdf };
    await page.close();
  }
} finally {
  report.consoleErrors = consoleErrors;
  report.externalAiRequests = externalAiRequests.length;
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

const pass = Object.values(report.print).every(item => item.domPages === 2 && item.physicalPages === 2
  && item.overflow.every(value => value.vertical <= 1 && value.horizontal <= 1)
  && item.contentCollision.every(value => value <= 1)
  && item.sectionContentOverflow.every(value => value <= 1)
  && item.bottomClearanceMm.every(value => value >= 11.5)
  && item.largeBoxes.every(value => value <= 3)
  && item.fullQuestionCards === 0
  && item.type.title >= 20 && item.type.sectionMajor >= 13 && item.type.sectionWorking >= 11.5 && item.type.sectionSupport >= 9.5
  && item.type.questionWeights.every(value => value === 600) && item.type.storyEnglish >= 10.5
  && item.type.storyKorean >= 10 && item.type.question >= 11 && item.type.korean >= 9.99
  && (item.type.leaderNote === null || item.type.leaderNote >= 9)
  && item.structure.story === 1 && item.structure.easy === 1 && item.structure.real === 1
  && item.structure.english === 4 && item.structure.steps === 4 && item.structure.result === 1
  && item.structure.thinkHarder === 1 && item.structure.final === 1
  && item.koreanWrapping.wordBreak === "keep-all" && item.koreanWrapping.overflowWrap === "normal"
  && item.koreanWrapping.lineBreak === "strict" && new Set(item.koreanWrapping.oneThingLines).size === 1
  && item.koreanWrapping.fixtures.every(fixture => fixture.tokens.every(token => token.lines === 1))
  && item.koreanWrapping.englishWordBreak === "normal" && item.koreanWrapping.englishOverflowWrap === "normal")
  && report.screen.every(item => item.horizontalOverflow <= 0)
  && report.print.student.emergencyVisible === 0 && report.print.leader.emergencyVisible === 1
  && report.consoleErrors.length === 0 && report.externalAiRequests === 0;
report.pass = pass;
await writeFile(join(evidence, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!pass) process.exitCode = 1;
