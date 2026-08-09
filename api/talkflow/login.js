"use strict";
const { createSession, json, rateLimit, readJson, serverConfigured, sessionCookie, verifyPassword, verifySameOrigin } = require("../../server/talkflow/security");
module.exports = async (request, response) => {
  if (request.method !== "POST") return json(response, 405, { error: { type: "method_not_allowed", message: "지원하지 않는 요청입니다." } }, { allow: "POST" });
  if (!serverConfigured()) return json(response, 503, { error: { type: "server_not_configured", message: "AI 서버 설정이 필요합니다." } });
  if (!verifySameOrigin(request, response) || !rateLimit(request, response, "login", 5, 15 * 60 * 1000)) return;
  const body = await readJson(request, response, 2048); if (!body) return;
  if (!verifyPassword(body.password)) return json(response, 401, { error: { type: "invalid_credentials", message: "관리자 비밀번호를 확인해 주세요." } });
  response.setHeader("set-cookie", sessionCookie(createSession()));
  json(response, 200, { authenticated: true });
};
