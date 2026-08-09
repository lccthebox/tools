(function (global) {
  "use strict";
  const headers = { "content-type": "application/json", "x-talkflow-request": "app" };
  async function request(path, options = {}) {
    let response, payload;
    try {
      response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options, headers: { ...headers, ...(options.headers || {}) } });
      payload = await response.json();
    } catch (cause) {
      const error = new Error("AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."); error.type = "network_error"; error.cause = cause; throw error;
    }
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `HTTP ${response.status}`); error.httpStatus = response.status; error.type = payload?.error?.type || "http_error"; error.requestId = payload?.error?.request_id || ""; error.stopRetry = response.status === 404 && error.type === "not_found_error"; throw error;
    }
    return payload;
  }
  global.TalkFlowAiClient = Object.freeze({
    status: () => request("/api/talkflow/status", { method: "GET" }),
    login: password => request("/api/talkflow/login", { method: "POST", body: JSON.stringify({ password }) }),
    logout: () => request("/api/talkflow/logout", { method: "POST", body: "{}" }),
    listModels: ({ signal } = {}) => request("/api/talkflow/models", { method: "GET", signal }),
    generate: (body, { signal } = {}) => request("/api/talkflow/messages", { method: "POST", body: JSON.stringify(body), signal })
  });
})(window);
