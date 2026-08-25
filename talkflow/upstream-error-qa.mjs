import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const security = require("../server/talkflow/security");

const fixtures = [
  [400, "invalid_request_error"],
  [401, "authentication_error"],
  [403, "permission_error"],
  [404, "not_found_error"],
  [429, "rate_limit_error"],
  [500, "api_error"]
];

for (const [status, type] of fixtures) {
  const message = `example diagnostic ${status}\nwith control\u0000`;
  const payload = { type: "error", error: { type, message, secret: "drop-secret" }, request_id: `req_${status}`, prompt: "drop-prompt" };
  const result = security.upstreamError(status, payload, "", { stage: "connection_test", model: "claude-sonnet-4-6", timestamp: "2026-08-10T00:00:00.000Z" });
  assert.equal(result.diagnostic.httpStatus, status);
  assert.equal(result.diagnostic.type, type);
  assert.equal(result.diagnostic.message, `example diagnostic ${status} with control`);
  assert.equal(result.diagnostic.request_id, `req_${status}`);
  assert.equal(result.diagnostic.stage, "connection_test");
  assert.equal(result.diagnostic.model, "claude-sonnet-4-6");
  assert.equal(result.diagnostic.timestamp, "2026-08-10T00:00:00.000Z");
  assert.equal(JSON.stringify(result.body).includes("example diagnostic"), false);
  assert.equal(JSON.stringify(result).includes("drop-secret"), false);
  assert.equal(JSON.stringify(result).includes("drop-prompt"), false);
}

const longMessage = `start\u0007${"x".repeat(800)}`;
const bounded = security.upstreamError(400, { error: { type: "invalid_request_error", message: longMessage } }, "req_header", { stage: "plan", model: "claude-sonnet-4-6" });
assert.equal(bounded.diagnostic.message.length, 700);
assert.doesNotMatch(bounded.diagnostic.message, /[\u0000-\u001f\u007f-\u009f]/);
assert.equal(bounded.diagnostic.request_id, "req_header");

const malformed = security.upstreamError(502, {}, "req_malformed", { stage: "content", model: "claude-sonnet-4-6", timestamp: "2026-08-10T00:00:00.000Z" });
assert.equal(malformed.diagnostic.type, "upstream_error");
assert.equal(malformed.diagnostic.message, "Malformed or empty Anthropic error response.");
assert.equal(malformed.diagnostic.request_id, "req_malformed");

const fakeAnthropicKey = ["sk", "ant", "sensitive", "value"].join("-");
const redacted = security.upstreamError(400, { error: { type: "invalid_request_error", message: `key ${fakeAnthropicKey} rejected` } }, "req_redacted", { stage: "connection_test", model: "claude-sonnet-4-6" });
assert.equal(redacted.diagnostic.message, "key [redacted] rejected");

const logLine = security.anthropicErrorLogLine(bounded.diagnostic);
assert.match(logLine, /^\[talkflow-anthropic-error\] status=400 type=invalid_request_error message=/);
assert.match(logLine, /request_id=req_header stage=plan model=claude-sonnet-4-6 timestamp=/);
assert.doesNotMatch(logLine, /drop-secret|drop-prompt|x-api-key|sk-ant|Reply with OK/);

console.log("upstream-error-qa: PASS (7 fixtures, bounded diagnostic, safe log allowlist)");
