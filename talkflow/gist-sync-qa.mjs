import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require("C:/Users/thebox/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js"); }
const root = fileURLToPath(new URL(".", import.meta.url));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname.replace(/^\/talkflow\//, "/");
    const path = normalize(join(root, pathname === "/" ? "index.html" : pathname.slice(1)));
    if (!path.startsWith(normalize(root))) throw new Error("invalid path");
    response.setHeader("content-type", mime[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.statusCode = 404; response.end("Not found"); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await playwright.chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  let pullRequest = null;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/talkflow/login/", async route => {
    pullRequest = route.request().postDataJSON();
    await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ content: JSON.stringify({ schema: "thebox-talkflow-v1", topics: {} }) })
    });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/?section=settings&panel=gist`, { waitUntil: "networkidle" });
  await page.locator("#gist-token").fill("new-desktop-token");
  await page.locator("#gist-id").fill("imported-gist");
  await page.getByRole("button", { name: "Gist 불러오기" }).click();
  await page.waitForFunction(() => document.querySelector("#notice")?.textContent.includes("Gist에서 불러왔습니다."));
  assert.equal(await page.evaluate(() => sessionStorage.getItem("tb_talkflow_gist_token_v1")), "new-desktop-token", "the current desktop token must be used immediately");
  assert.deepEqual(pullRequest, { operation: "gist_file", gistId: "imported-gist", filename: "thebox-talkflow-2026-08.json", token: "new-desktop-token" }, "the current desktop must send the entered credentials only to the same-origin recovery endpoint");
  assert.match(await page.locator("#notice").textContent(), /Gist에서 불러왔습니다/, "a complete server-fetched raw Gist file must load successfully");
  assert.deepEqual(errors, [], `browser errors: ${errors.join("; ")}`);
  console.log("PASS gist-sync-qa: direct token entry and raw Gist fallback");
} finally {
  await browser.close();
  server.close();
}
