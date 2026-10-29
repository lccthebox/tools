import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/talkflow/login");
const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  if (String(url).startsWith("https://api.github.com/gists/")) return new Response(JSON.stringify({ files: { "thebox-talkflow-2026-08.json": { raw_url: "https://gist.githubusercontent.com/thebox/test/raw/thebox-talkflow-2026-08.json" } } }), { status: 200, headers: { "content-type": "application/json" } });
  if (String(url) === "https://gist.githubusercontent.com/thebox/test/raw/thebox-talkflow-2026-08.json") return new Response(JSON.stringify({ schema: "thebox-talkflow-v1", topics: {} }), { status: 200 });
  throw new Error("unexpected URL");
};
function mockRequest(body) {
  const raw = JSON.stringify(body);
  return {
    method: "POST",
    headers: { "x-talkflow-request": "app", "content-length": String(Buffer.byteLength(raw)) },
    socket: { remoteAddress: "gist-file-qa" },
    async *[Symbol.asyncIterator]() { yield Buffer.from(raw); }
  };
}
function mockResponse() {
  return { headers: {}, statusCode: 0, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = JSON.parse(value); } };
}
try {
  const response = mockResponse();
  await handler(mockRequest({ operation: "gist_file", gistId: "abcde1", filename: "thebox-talkflow-2026-08.json", token: "github_pat_newdesktop" }), response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body.content), { schema: "thebox-talkflow-v1", topics: {} });
  assert.equal(calls.length, 2, "metadata and raw file must be fetched server-side");
  assert.equal(calls[0].options.headers.authorization, "Bearer github_pat_newdesktop");
  assert.equal(calls[1].options.headers.authorization, "Bearer github_pat_newdesktop");
  const invalid = mockResponse();
  await handler(mockRequest({ operation: "gist_file", gistId: "abcde1", filename: "viewer.html", token: "github_pat_newdesktop" }), invalid);
  assert.equal(invalid.statusCode, 400, "only a monthly topic JSON file may be proxied");
  console.log("PASS gist-file-qa: same-origin raw Gist recovery and request bounds");
} finally {
  globalThis.fetch = originalFetch;
}
