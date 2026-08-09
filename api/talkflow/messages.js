"use strict";
const { json, messageBodyForUpstream, rateLimit, readJson, requireSession, upstreamError, verifySameOrigin } = require("../../server/talkflow/security");
module.exports = async (request, response) => {
  if (request.method !== "POST") return json(response, 405, { error: { type: "method_not_allowed", message: "지원하지 않는 요청입니다." } }, { allow: "POST" });
  if (!verifySameOrigin(request, response) || !requireSession(request, response) || !rateLimit(request, response, "proxy", 30, 60 * 1000)) return;
  if (!process.env.ANTHROPIC_API_KEY) return json(response, 503, { error: { type: "server_not_configured", message: "AI 서버 설정이 필요합니다." } });
  const body = await readJson(request, response); if (!body) return;
  const upstreamBody = messageBodyForUpstream(body);
  if (!upstreamBody) return json(response, 400, { error: { type: "invalid_request", message: "Talk Flow 생성 요청 형식이 올바르지 않습니다." } });
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify(upstreamBody) });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) { const error = upstreamError(upstream.status, payload, upstream.headers.get("request-id")); return json(response, error.status, error.body); }
    json(response, 200, { id: payload.id || "", type: payload.type || "message", role: payload.role || "assistant", content: Array.isArray(payload.content) ? payload.content : [], model: payload.model || upstreamBody.model, stop_reason: payload.stop_reason || null, usage: payload.usage || {} });
  } catch { json(response, 502, { error: { type: "network_error", message: "AI 서버에 연결할 수 없습니다." } }); }
};
