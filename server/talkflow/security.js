"use strict";

const crypto = require("node:crypto");
const { PLAN_TOOL, CONTENT_TOOL, PROMPT_PROFILE, buildPromptPayload } = require("../../talkflow/simple-generation");
const LegacyRepairPrompt = require("../../talkflow/legacy-repair-prompt");

const SESSION_COOKIE = "__Host-talkflow_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const ALLOWED_MODELS = new Set(["claude-sonnet-4-6"]);
const CANONICAL_TOOLS = new Map([[PLAN_TOOL.name, PLAN_TOOL], [CONTENT_TOOL.name, CONTENT_TOOL]]);
const LEGACY_CONTEXT_KEYS = new Set(["activity", "activitySupport", "assignedOpposition", "axis", "category", "commonErrors", "conversationFlow", "conversationMaterial", "createdAt", "date", "deeperFollowUp", "demoKo", "easyEntry", "emergency", "en", "estimatedMinutes", "example", "exampleFollowUp", "final", "finalClose", "finalQuestion", "finalRound", "followUp", "goal", "groupResult", "hidden", "hook", "id", "instruction", "instructionEn", "instructionKo", "issues", "ko", "leader", "leaderNotes", "longKo", "mainActivity", "mainDiscussion", "material", "materials", "mechanism", "midGame", "minutes", "name", "openEndedDecision", "operatorStatus", "options", "optionsText", "output", "page", "participantOutput", "phrases", "prompt", "promptAxes", "quality", "question", "questionEn", "questionKo", "quickActivity", "quietKo", "reasonPrompt", "recommendedSkip", "reset", "roles", "score", "sensitiveWarning", "session1", "session2", "sessionOne", "sessionTwo", "smallTalk", "sourceRef", "speakingMechanisms", "starter", "status", "steps", "stepsKo", "target", "thinkHarder", "timeCutKo", "timedTurn", "title", "titleEn", "titleKo", "topicMode", "translation", "type", "updatedAt", "usage", "usefulPhrases", "whenConversationStops"]);
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
  return Boolean(messageBodyForUpstream(body));
}

function messageBodyForUpstream(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  if (body.operation === "legacy_repair") {
    if (Object.keys(body).some(key => !["operation", "model", "max_tokens", "scope", "topicContext", "prompt"].includes(key))) return null;
    if (!ALLOWED_MODELS.has(body.model) || body.max_tokens !== 6000 || !/^(?:complete topic|[a-zA-Z0-9_.]{1,80})$/.test(body.scope || "")) return null;
    if (!validLegacyContext(body.topicContext) || JSON.stringify(body.topicContext).length > 80000) return null;
    const prompt = LegacyRepairPrompt.build(body.scope, body.topicContext);
    if (body.prompt !== prompt) return null;
    return { model: body.model, max_tokens: 6000, messages: [{ role: "user", content: prompt }] };
  }
  if (Object.keys(body).some(key => !["model", "max_tokens", "messages", "tools", "tool_choice"].includes(key))) return false;
  if (!ALLOWED_MODELS.has(body.model) || !Number.isInteger(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > 6000) return false;
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 8) return false;
  if (!body.messages.every(message => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string" && message.content.length >= 1 && message.content.length <= 100000 && Object.keys(message).every(key => ["role", "content"].includes(key)))) return false;
  if (body.tools === undefined) {
    if (body.tool_choice !== undefined || body.messages.length !== 1 || body.messages[0].role !== "user") return false;
    const content = body.messages[0].content;
    return content === "Reply with OK." && body.max_tokens <= 16 ? body : null;
  }
  if (!Array.isArray(body.tools) || body.tools.length !== 1) return false;
  const tool = body.tools[0];
  const canonical = tool && CANONICAL_TOOLS.get(tool.name);
  if (!canonical || JSON.stringify(tool) !== JSON.stringify(canonical)) return false;
  if (body.messages.length !== 1 || body.messages[0].role !== "user" || !validGenerationPrompt(body.messages[0].content, tool.name)) return false;
  return body.tool_choice?.type === "tool" && body.tool_choice?.name === tool.name && Object.keys(body.tool_choice).every(key => ["type", "name"].includes(key)) ? body : null;
}

function validGenerationPrompt(content, toolName) {
  let payload;
  try { payload = JSON.parse(content); } catch { return false; }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const keys = ["stage", "contract", "fixedDesign", "languageExposure", "generationRules", "topic", "monthlyDiversity", "approvedPlan", "previousValidationIssues", "previousCandidate", "retryRule"];
  if (Object.keys(payload).some(key => !keys.includes(key))) return false;
  const expectedStage = toolName === PLAN_TOOL.name ? "plan" : "content";
  if (payload.stage !== expectedStage || payload.contract !== PROMPT_PROFILE.contract) return false;
  if (JSON.stringify(payload.fixedDesign) !== JSON.stringify(PROMPT_PROFILE.fixedDesign)) return false;
  if (JSON.stringify(payload.languageExposure) !== JSON.stringify(PROMPT_PROFILE.languageExposure)) return false;
  if (JSON.stringify(payload.generationRules) !== JSON.stringify(PROMPT_PROFILE.generationRules)) return false;
  if (!payload.topic || !/^\d{4}-\d{2}-\d{2}$/.test(payload.topic.date) || typeof payload.topic.keyword !== "string" || !payload.topic.keyword.trim()) return false;
  if (!Array.isArray(payload.monthlyDiversity) || !Array.isArray(payload.previousValidationIssues)) return false;
  if (!validTopicInput(payload.topic) || !validDiversity(payload.monthlyDiversity) || !validIssues(payload.previousValidationIssues)) return false;
  if (expectedStage === "plan" && payload.approvedPlan !== null || expectedStage === "content" && !matchesSchemaShape(payload.approvedPlan, PLAN_TOOL.input_schema, false)) return false;
  const candidateSchema = expectedStage === "plan" ? PLAN_TOOL.input_schema : CONTENT_TOOL.input_schema;
  if (payload.previousCandidate !== null && !matchesSchemaShape(payload.previousCandidate, candidateSchema, true)) return false;
  const rebuilt = buildPromptPayload({ stage: payload.stage, topic: payload.topic, monthlyDiversity: payload.monthlyDiversity, approvedPlan: payload.approvedPlan, previousValidationIssues: payload.previousValidationIssues, previousCandidate: payload.previousCandidate });
  return JSON.stringify(payload) === JSON.stringify(rebuilt);
}

function validTopicInput(topic) {
  if (!topic || typeof topic !== "object" || Array.isArray(topic) || Object.keys(topic).some(key => !["date", "weekday", "keyword", "mood", "source", "avoid", "repairSection"].includes(key))) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(topic.date) || typeof topic.keyword !== "string" || !topic.keyword.trim()) return false;
  return ["weekday", "keyword", "mood", "source", "avoid", "repairSection"].every(key => typeof topic[key] === "string" && topic[key].length <= 4000);
}

function validDiversity(items) {
  return items.length <= 31 && items.every(item => item && typeof item === "object" && !Array.isArray(item) && !Object.keys(item).some(key => !["style", "activity", "storyOpening", "questionOpenings", "expressions"].includes(key)) && ["style", "activity", "storyOpening"].every(key => typeof item[key] === "string" && item[key].length <= 1000) && ["questionOpenings", "expressions"].every(key => Array.isArray(item[key]) && item[key].length <= 12 && item[key].every(value => typeof value === "string" && value.length <= 1000)));
}

function validIssues(items) {
  return items.length <= 100 && items.every(item => item && typeof item === "object" && !Array.isArray(item) && !Object.keys(item).some(key => !["severity", "id", "group", "location", "message"].includes(key)) && ["severity", "id", "location", "message"].every(key => typeof item[key] === "string" && item[key].length <= 4000) && (item.group === undefined || typeof item.group === "string" && item.group.length <= 1000));
}

function matchesSchemaShape(value, schema, allowMissing) {
  if (!schema || typeof schema !== "object") return false;
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const properties = schema.properties || {};
    if (Object.keys(value).some(key => !Object.hasOwn(properties, key))) return false;
    if (!allowMissing && (schema.required || []).some(key => !Object.hasOwn(value, key))) return false;
    return Object.entries(value).every(([key, entry]) => matchesSchemaShape(entry, properties[key], allowMissing));
  }
  if (schema.type === "array") return Array.isArray(value) && value.length >= (schema.minItems || 0) && value.length <= (schema.maxItems || 100) && value.every(entry => matchesSchemaShape(entry, schema.items, allowMissing));
  if (schema.type === "string") return typeof value === "string" && value.length <= 10000 && (!schema.enum || schema.enum.includes(value));
  if (schema.type === "integer") return Number.isInteger(value) && (schema.minimum === undefined || value >= schema.minimum) && (schema.maximum === undefined || value <= schema.maximum);
  if (schema.type === "boolean") return typeof value === "boolean";
  return false;
}

function validLegacyContext(context) {
  if (!context || typeof context !== "object" || Array.isArray(context) || Object.keys(context).some(key => !["title", "category", "topicMode", "target"].includes(key))) return false;
  if (!validBilingual(context.title) || !validBilingual(context.category) || !["general", "context"].includes(context.topicMode)) return false;
  return validLegacyValue(context.target, 0);
}

function validBilingual(value) {
  return value && typeof value === "object" && !Array.isArray(value) && !Object.keys(value).some(key => !["en", "ko"].includes(key)) && ["en", "ko"].every(key => typeof value[key] === "string" && value[key].length <= 10000);
}

function validLegacyValue(value, depth) {
  if (depth > 12) return false;
  if (value === null || typeof value === "boolean" || Number.isFinite(value)) return true;
  if (typeof value === "string") return value.length <= 10000;
  if (Array.isArray(value)) return value.length <= 100 && value.every(entry => validLegacyValue(entry, depth + 1));
  return value && typeof value === "object" && Object.keys(value).length <= 100 && Object.keys(value).every(key => LEGACY_CONTEXT_KEYS.has(key)) && Object.values(value).every(entry => validLegacyValue(entry, depth + 1));
}

function upstreamError(status, payload, requestId = "", context = {}) {
  const type = sanitizeDiagnosticText(payload?.error?.type, "upstream_error", 100);
  const diagnostic = {
    httpStatus: status,
    type,
    message: sanitizeDiagnosticText(payload?.error?.message, "Malformed or empty Anthropic error response.", 700),
    request_id: sanitizeDiagnosticText(payload?.request_id || requestId, "", 200),
    stage: sanitizeDiagnosticText(context.stage, "unknown", 80),
    model: sanitizeDiagnosticText(context.model, "unknown", 100),
    timestamp: sanitizeDiagnosticText(context.timestamp, new Date().toISOString(), 100)
  };
  const safeStatus = status === 401 || status === 403 ? status : status === 429 ? 429 : status >= 500 ? 502 : 400;
  const messages = { authentication_error: "AI 서버 인증을 확인할 수 없습니다.", rate_limit_error: "AI 사용량 제한에 도달했습니다.", overloaded_error: "AI 서버가 혼잡합니다." };
  return { status: safeStatus, body: { error: { type, message: messages[type] || "AI 생성 요청을 처리하지 못했습니다.", request_id: diagnostic.request_id } }, diagnostic };
}

function sanitizeDiagnosticText(value, fallback, maxLength) {
  const text = typeof value === "string" && value.trim() ? value : fallback;
  return String(text || "").replace(/sk-ant-[A-Za-z0-9_-]+/g, "[redacted]").replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function anthropicErrorLogLine(diagnostic) {
  return `[talkflow-anthropic-error] status=${diagnostic.httpStatus} type=${diagnostic.type} message=${diagnostic.message} request_id=${diagnostic.request_id} stage=${diagnostic.stage} model=${diagnostic.model} timestamp=${diagnostic.timestamp}`;
}

function anthropicRequestStage(body) {
  if (body?.operation === "legacy_repair") return "legacy_repair";
  const toolName = body?.tools?.[0]?.name;
  if (toolName === PLAN_TOOL.name) return "plan";
  if (toolName === CONTENT_TOOL.name) return "content";
  return "connection_test";
}

module.exports = { ALLOWED_MODELS, anthropicErrorLogLine, anthropicRequestStage, createSession, json, messageBodyForUpstream, rateLimit, readJson, requireSession, serverConfigured, sessionCookie, upstreamError, validMessageBody, verifyPassword, verifySameOrigin, verifySession };
