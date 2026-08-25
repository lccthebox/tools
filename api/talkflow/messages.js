"use strict";
const { anthropicErrorLogLine, anthropicRequestStage, json, messageBodyForUpstream, rateLimit, readJson, requireSession, upstreamError, verifySameOrigin } = require("../../server/talkflow/security");
module.exports = async (request, response) => {
  if (request.method !== "POST") return json(response, 405, { error: { type: "method_not_allowed", message: "지원하지 않는 요청입니다." } }, { allow: "POST" });
  if (!verifySameOrigin(request, response) || !requireSession(request, response) || !rateLimit(request, response, "proxy", 30, 60 * 1000)) return;
  if (!process.env.ANTHROPIC_API_KEY) return json(response, 503, { error: { type: "server_not_configured", message: "AI 서버 설정이 필요합니다." } });
  const body = await readJson(request, response); if (!body) return;
  let upstreamBody;
  try { upstreamBody = messageBodyForUpstream(body); }
  catch (error) { if (error?.type === "CONTENT_FILL_SCHEMA_TOO_COMPLEX_PRECHECK") return json(response, 400, { error: { type: error.type, message: "Content Fill schema did not pass the project complexity precheck." } }); throw error; }
  if (!upstreamBody) return json(response, 400, { error: { type: "invalid_request", message: "Talk Flow 생성 요청 형식이 올바르지 않습니다." } });
  try {
    const startedAt = Date.now();
    const upstream = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify(upstreamBody) });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const error = upstreamError(upstream.status, payload, upstream.headers.get("request-id"), { stage: anthropicRequestStage(body), model: upstreamBody.model });
      console.error(anthropicErrorLogLine(error.diagnostic));
      return json(response, error.status, error.body);
    }
    const usage = payload.usage || {}, requestId = String(payload.request_id || upstream.headers.get("request-id") || "").replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").trim().slice(0, 200);
    const providerMeta = { requestId, stopReason: String(payload.stop_reason || "").slice(0, 80), usage: { inputTokens: Number(usage.input_tokens) || 0, outputTokens: Number(usage.output_tokens) || 0 }, maxTokens: upstreamBody.max_tokens, elapsedMs: Date.now() - startedAt, httpStatus: upstream.status };
    json(response, 200, { id: payload.id || "", type: payload.type || "message", role: payload.role || "assistant", content: Array.isArray(payload.content) ? payload.content : [], model: payload.model || upstreamBody.model, stop_reason: payload.stop_reason || null, usage, provider_meta: providerMeta });
  } catch { json(response, 502, { error: { type: "network_error", message: "AI 서버에 연결할 수 없습니다." } }); }
};
