import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const previous = { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY, fetch: globalThis.fetch };
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY = "anon-test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ token: "member-token" }) });
const handler = require("../api/talkflow/member-login");

function request() {
  const stream = Readable.from([JSON.stringify({ name: "홍길동", phone: "01012345678", birth: "19900101" })]);
  stream.method = "POST";
  stream.headers = { host: "example.test", origin: "https://example.test", "x-talkflow-request": "app", "x-vercel-forwarded-for": "203.0.113.9" };
  return stream;
}
function response() {
  return { statusCode: 0, headers: {}, body: "", setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = value || ""; } };
}

try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = response();
    await handler(request(), result);
    assert.equal(result.statusCode, 200, `legitimate shared-network retry ${attempt + 1} remains available`);
  }
  const blocked = response();
  await handler(request(), blocked);
  assert.equal(blocked.statusCode, 429, "the shared-network guard remains bounded after sixty attempts");
} finally {
  globalThis.fetch = previous.fetch;
  for (const [name, value] of [["SUPABASE_URL", previous.url], ["SUPABASE_ANON_KEY", previous.anon], ["SUPABASE_SERVICE_ROLE_KEY", previous.service]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
}

console.log("PASS member-login-rate-limit-qa: sixty shared-network attempts remain available and the next is blocked.");
