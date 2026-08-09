"use strict";

const crypto = require("node:crypto");
const { PLAN_TOOL, CONTENT_TOOL } = require("../../talkflow/simple-generation");

const SESSION_COOKIE = "__Host-talkflow_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const ALLOWED_MODELS = new Set(["claude-sonnet-4-6"]);
const CANONICAL_TOOLS = new Map([[PLAN_TOOL.name, PLAN_TOOL], [CONTENT_TOOL.name, CONTENT_TOOL]]);
const buckets = globalThis.__talkflowRateBuckets || (globalThis.__talkflowRateBuckets = new Map());

function json(response, status, body, headers = {}) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.end(JSON.stringify(body));
}

function clientAddress(request) {
  return String(request.headers["x-vercel-forwarded-for"] || request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "unknown").split(",").at(-1).trim();
}

function rateLimit(request, response, scope, limit, windowMs) {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 1000) for (const [entry, value] of buckets) if (value.resetAt <= now) buckets.delete(entry);
  if (bucket.count <= limit) return true;
  json(response, 429, { error: { type: "rate_limited", message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." } }, { "retry-after": String(Math.ceil((bucket.resetAt - now) / 1000)) });
  return false;
}

function parseCookies(request) {
  return Object.fromEntries(String(request.headers.cookie || "").split(";").map(part => part.trim().split(/=(.*)/s)).filter(parts => parts[0]).map(([name, value]) => [name, decodeURIComponent(value || "")]));
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionSecret() {
  return process.env.TALKFLOW_SESSION_SECRET || "";
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function createSession() {
  if (!sessionSecret()) throw new Error("server_not_configured");
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS, nonce: crypto.randomBytes(12).toString("base64url") })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySession(request) {
  if (!sessionSecret()) return false;
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator < 1 || !safeEqual(token.slice(separator + 1), sign(token.slice(0, separator)))) return false;
  try {
    const payload = JSON.parse(Buffer.from(token.slice(0, separator), "base64url").toString("utf8"));
    return Number.isInteger(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function requireSession(request, response) {
  if (verifySession(request)) return true;
  json(response, 401, { error: { type: "login_required", message: "관리자 로그인이 필요합니다." } });
  return false;
}

function parsePasswordHash(value) {
  const [scheme, costText, blockText, parallelText, saltText, digestText] = String(value || "").split("$");
  const cost = Number(costText), blockSize = Number(blockText), parallelization = Number(parallelText);
  if (scheme !== "scrypt" || !Number.isInteger(cost) || !Number.isInteger(blockSize) || !Number.isInteger(parallelization) || !saltText || !digestText) return null;
  try { return { cost, blockSize, parallelization, salt: Buffer.from(saltText, "base64url"), digest: Buffer.from(digestText, "base64url") }; } catch { return null; }
}

function verifyPassword(password) {
  const parsed = parsePasswordHash(process.env.TALKFLOW_ADMIN_PASSWORD_HASH);
  if (!parsed || typeof password !== "string" || password.length < 8 || password.length > 256) return false;
  const derived = crypto.scryptSync(password, parsed.salt, parsed.digest.length, { N: parsed.cost, r: parsed.blockSize, p: parsed.parallelization, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(derived, parsed.digest);
}

function serverConfigured() {
  return Boolean(parsePasswordHash(process.env.TALKFLOW_ADMIN_PASSWORD_HASH) && sessionSecret() && process.env.ANTHROPIC_API_KEY);
}

function verifySameOrigin(request, response) {
  if (request.method === "GET" || request.method === "HEAD") return true;
  if (request.headers["x-talkflow-request"] !== "app") { json(response, 403, { error: { type: "forbidden", message: "허용되지 않은 요청입니다." } }); return false; }
  const origin = request.headers.origin;
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  if (origin && host) {
    try { if (new URL(origin).host !== host) { json(response, 403, { error: { type: "forbidden", message: "허용되지 않은 출처입니다." } }); return false; } } catch { json(response, 403, { error: { type: "forbidden", message: "허용되지 않은 출처입니다." } }); return false; }
  }
  return true;
}

async function readJson(request, response, maxBytes = 120000) {
  const declared = Number(request.headers["content-length"] || 0);
  if (declared > maxBytes) { json(response, 413, { error: { type: "payload_too_large", message: "요청 크기가 너무 큽니다." } }); return null; }
  let size = 0, raw = "";
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) { json(response, 413, { error: { type: "payload_too_large", message: "요청 크기가 너무 큽니다." } }); return null; }
    raw += chunk;
  }
  try { return JSON.parse(raw || "{}"); } catch { json(response, 400, { error: { type: "invalid_request", message: "JSON 요청 형식이 올바르지 않습니다." } }); return null; }
}

function validMessageBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  if (Object.keys(body).some(key => !["model", "max_tokens", "messages", "tools", "tool_choice"].includes(key))) return false;
  if (!ALLOWED_MODELS.has(body.model) || !Number.isInteger(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > 6000) return false;
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 8) return false;
  if (!body.messages.every(message => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string" && message.content.length >= 1 && message.content.length <= 100000 && Object.keys(message).every(key => ["role", "content"].includes(key)))) return false;
  if (body.tools === undefined) {
    if (body.tool_choice !== undefined || body.messages.length !== 1 || body.messages[0].role !== "user") return false;
    const content = body.messages[0].content;
    return content === "Reply with OK." && body.max_tokens <= 16 || content.startsWith("Create or repair TheBox Talk Flow ") && content.includes("<talkflow-standard ") && content.endsWith("</talkflow-standard>") && body.max_tokens === 6000;
  }
  if (!Array.isArray(body.tools) || body.tools.length !== 1) return false;
  const tool = body.tools[0];
  const canonical = tool && CANONICAL_TOOLS.get(tool.name);
  if (!canonical || JSON.stringify(tool) !== JSON.stringify(canonical)) return false;
  if (body.messages.length !== 1 || body.messages[0].role !== "user" || !validGenerationPrompt(body.messages[0].content, tool.name)) return false;
  return body.tool_choice?.type === "tool" && body.tool_choice?.name === tool.name && Object.keys(body.tool_choice).every(key => ["type", "name"].includes(key));
}

function validGenerationPrompt(content, toolName) {
  let payload;
  try { payload = JSON.parse(content); } catch { return false; }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const keys = ["stage", "contract", "fixedDesign", "languageExposure", "generationRules", "topic", "monthlyDiversity", "approvedPlan", "previousValidationIssues", "previousCandidate", "retryRule"];
  if (Object.keys(payload).some(key => !keys.includes(key))) return false;
  const expectedStage = toolName === PLAN_TOOL.name ? "plan" : "content";
  if (payload.stage !== expectedStage || !String(payload.contract || "").startsWith("TheBox Talk Flow Simple Conversation v3.")) return false;
  if (!payload.fixedDesign || JSON.stringify(payload.fixedDesign.styles) !== JSON.stringify(["story", "case", "trend"]) || !Array.isArray(payload.fixedDesign.activities)) return false;
  if (!Array.isArray(payload.generationRules) || payload.generationRules.length !== 10 || payload.generationRules.some(rule => typeof rule !== "string" || !rule.trim())) return false;
  if (!payload.topic || !/^\d{4}-\d{2}-\d{2}$/.test(payload.topic.date) || typeof payload.topic.keyword !== "string" || !payload.topic.keyword.trim()) return false;
  if (!Array.isArray(payload.monthlyDiversity) || !Array.isArray(payload.previousValidationIssues)) return false;
  return payload.retryRule === "Create every required content field once." || payload.retryRule === "Keep valid fields unchanged and repair only the listed locations.";
}

function upstreamError(status, payload, requestId = "") {
  const type = payload?.error?.type || "upstream_error";
  const safeStatus = status === 401 || status === 403 ? status : status === 429 ? 429 : status >= 500 ? 502 : 400;
  const messages = { authentication_error: "AI 서버 인증을 확인할 수 없습니다.", rate_limit_error: "AI 사용량 제한에 도달했습니다.", overloaded_error: "AI 서버가 혼잡합니다." };
  return { status: safeStatus, body: { error: { type, message: messages[type] || "AI 생성 요청을 처리하지 못했습니다.", request_id: payload?.request_id || requestId || "" } } };
}

module.exports = { ALLOWED_MODELS, createSession, json, rateLimit, readJson, requireSession, serverConfigured, sessionCookie, upstreamError, validMessageBody, verifyPassword, verifySameOrigin, verifySession };
