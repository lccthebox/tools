import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const security = require("../server/talkflow/security");
const login = require("../api/talkflow/login");
const status = require("../api/talkflow/status");
const models = require("../api/talkflow/models");
const messages = require("../api/talkflow/messages");
const salt = crypto.randomBytes(16), digest = crypto.scryptSync("correct horse battery staple", salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
process.env.TALKFLOW_ADMIN_PASSWORD_HASH = `scrypt$16384$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
process.env.TALKFLOW_SESSION_SECRET = crypto.randomBytes(32).toString("base64url");
process.env.ANTHROPIC_API_KEY = "qa-upstream-secret";

function mockRequest(method = "GET", body = null, headers = {}) {
  const request = Readable.from(body === null ? [] : [JSON.stringify(body)]); request.method = method; request.headers = { host: "preview.example", origin: "https://preview.example", "x-talkflow-request": "app", ...headers }; request.socket = { remoteAddress: "127.0.0.1" }; return request;
}
function mockResponse() {
  const headers = {}, response = { statusCode: 200, body: "", setHeader(name, value) { headers[name.toLowerCase()] = value; }, getHeader(name) { return headers[name.toLowerCase()]; }, end(value = "") { this.body = value; } }; return { response, headers };
}
async function call(handler, request) { const { response, headers } = mockResponse(); await handler(request, response); return { status: response.statusCode, headers, body: response.body ? JSON.parse(response.body) : {} }; }

let result = await call(status, mockRequest());
assert.equal(result.status, 200); assert.equal(result.body.configured, true); assert.equal(result.body.authenticated, false);
result = await call(login, mockRequest("POST", { password: "wrong-password" })); assert.equal(result.status, 401);
result = await call(login, mockRequest("POST", { password: "correct horse battery staple" })); assert.equal(result.status, 200);
const cookie = String(result.headers["set-cookie"]); assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Strict/); assert.doesNotMatch(cookie, /correct horse|qa-upstream-secret/);
const sessionHeader = { cookie: cookie.split(";")[0] };

let upstreamCalls = 0;
global.fetch = async (url, options) => {
  upstreamCalls += 1; assert.match(url, /^https:\/\/api\.anthropic\.com\/v1\/(models|messages)$/); assert.equal(options.headers["x-api-key"], "qa-upstream-secret");
  if (url.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6", secret: "drop" }, { id: "other-model", display_name: "Other" }] }), { status: 200, headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify({ id: "msg", type: "message", role: "assistant", content: [{ type: "text", text: "OK" }], model: "claude-sonnet-4-6", usage: { input_tokens: 1, output_tokens: 1 }, internal: "drop" }), { status: 200, headers: { "content-type": "application/json" } });
};
result = await call(models, mockRequest("GET", null, sessionHeader)); assert.equal(result.status, 200); assert.deepEqual(result.body.data.map(item => item.id), ["claude-sonnet-4-6"]); assert.equal(result.body.data[0].secret, undefined);
const connectionBody = { model: "claude-sonnet-4-6", max_tokens: 8, messages: [{ role: "user", content: "Reply with OK." }] };
result = await call(messages, mockRequest("POST", connectionBody, sessionHeader)); assert.equal(result.status, 200); assert.equal(result.body.internal, undefined);
result = await call(messages, mockRequest("POST", { ...connectionBody, endpoint: "https://example.com" }, sessionHeader)); assert.equal(result.status, 400);
result = await call(messages, mockRequest("POST", { ...connectionBody, model: "other-model" }, sessionHeader)); assert.equal(result.status, 400);
result = await call(messages, mockRequest("POST", connectionBody)); assert.equal(result.status, 401);
assert.equal(upstreamCalls, 2);
assert.equal(JSON.stringify([result, security.ALLOWED_MODELS]).includes("qa-upstream-secret"), false);
console.log("proxy-security-qa: PASS (authentication, validation, filtering, rate boundary)");
