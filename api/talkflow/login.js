"use strict";
const { createSession, json, rateLimit, readJson, serverConfigured, sessionCookie, verifyPassword, verifySameOrigin } = require("../../server/talkflow/security");
function validGistId(value) { return /^[a-f0-9]{5,64}$/i.test(String(value || "")); }
function validFilename(value) { return /^thebox-talkflow-\d{4}-\d{2}\.json$/.test(String(value || "")); }
function validToken(value) { return typeof value === "string" && value.trim().length >= 8 && value.trim().length <= 512; }
function githubHeaders(token) { return { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", "user-agent": "TheBox-TalkFlow" }; }
function rawUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && url.hostname === "gist.githubusercontent.com" ? url.href : "";
  } catch { return ""; }
}
function githubFailure(response) {
  if (response.status === 401 || response.status === 403) return { status: 403, message: "Gist 토큰 권한을 확인해 주세요." };
  if (response.status === 404) return { status: 404, message: "Gist를 찾을 수 없습니다. Gist ID와 토큰 권한을 확인하세요." };
  return { status: 502, message: "Gist 원본 파일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." };
}
async function loadGistFile(body, response) {
  const gistId = String(body.gistId || ""), filename = String(body.filename || ""), token = String(body.token || "").trim();
  if (!validGistId(gistId) || !validFilename(filename) || !validToken(token) || Object.keys(body).some(key => !["operation", "gistId", "filename", "token"].includes(key))) return json(response, 400, { error: { type: "invalid_request", message: "Gist 불러오기 요청 형식을 확인해 주세요." } });
  try {
    const metadata = await fetch(`https://api.github.com/gists/${gistId}`, { headers: githubHeaders(token), signal: AbortSignal.timeout(10000) });
    if (!metadata.ok) { const failure = githubFailure(metadata); return json(response, failure.status, { error: { type: "gist_fetch_failed", message: failure.message } }); }
    const payload = await metadata.json(), file = payload?.files?.[filename], url = rawUrl(file?.raw_url);
    if (!url) return json(response, 404, { error: { type: "gist_file_missing", message: `${filename} 파일이 없습니다.` } });
    const raw = await fetch(url, { headers: githubHeaders(token), signal: AbortSignal.timeout(10000) });
    if (!raw.ok) { const failure = githubFailure(raw); return json(response, failure.status, { error: { type: "gist_fetch_failed", message: failure.message } }); }
    const content = await raw.text();
    if (content.length > 4 * 1024 * 1024) return json(response, 413, { error: { type: "gist_file_too_large", message: "Gist 토픽 파일이 너무 큽니다." } });
    return json(response, 200, { content });
  } catch {
    return json(response, 502, { error: { type: "gist_network_error", message: "Gist 원본 파일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." } });
  }
}
module.exports = async (request, response) => {
  if (request.method !== "POST") return json(response, 405, { error: { type: "method_not_allowed", message: "지원하지 않는 요청입니다." } }, { allow: "POST" });
  if (!verifySameOrigin(request, response)) return;
  const body = await readJson(request, response, 4096); if (!body) return;
  if (body.operation === "gist_file") {
    if (!rateLimit(request, response, "gist-file", 12, 60 * 1000)) return;
    return loadGistFile(body, response);
  }
  if (!serverConfigured()) return json(response, 503, { error: { type: "server_not_configured", message: "AI 서버 설정이 필요합니다." } });
  if (!rateLimit(request, response, "login", 5, 15 * 60 * 1000)) return;
  if (!verifyPassword(body.password)) return json(response, 401, { error: { type: "invalid_credentials", message: "관리자 비밀번호를 확인해 주세요." } });
  response.setHeader("set-cookie", sessionCookie(createSession()));
  json(response, 200, { authenticated: true });
};
