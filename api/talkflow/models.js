"use strict";
const { ALLOWED_MODELS, json, rateLimit, requireSession, upstreamError } = require("../../server/talkflow/security");
module.exports = async (request, response) => {
  if (request.method !== "GET") return json(response, 405, { error: { type: "method_not_allowed", message: "지원하지 않는 요청입니다." } }, { allow: "GET" });
  if (!requireSession(request, response) || !rateLimit(request, response, "proxy", 30, 60 * 1000)) return;
  if (!process.env.ANTHROPIC_API_KEY) return json(response, 503, { error: { type: "server_not_configured", message: "AI 서버 설정이 필요합니다." } });
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/models", { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", accept: "application/json" } });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) { const error = upstreamError(upstream.status, payload, upstream.headers.get("request-id")); return json(response, error.status, error.body); }
    const data = (payload.data || []).filter(model => ALLOWED_MODELS.has(model.id)).map(model => ({ id: model.id, display_name: model.display_name || model.id, created_at: model.created_at || "" }));
    json(response, 200, { data });
  } catch { json(response, 502, { error: { type: "network_error", message: "AI 서버에 연결할 수 없습니다." } }); }
};
