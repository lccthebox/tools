(function (global) {
  "use strict";
  const headers = { "content-type": "application/json", "x-talkflow-request": "app" };
  // Every request ends on its own: generation waits past the server's 90s upstream limit, the rest give up sooner.
  const timeoutSignal = (signal, milliseconds) => { if (typeof AbortSignal === "undefined" || !AbortSignal.timeout) return signal; const timeout = AbortSignal.timeout(milliseconds); return signal && AbortSignal.any ? AbortSignal.any([signal, timeout]) : signal || timeout; };
  async function request(path, options = {}) {
    let response, payload;
    const { timeoutMs = 30 * 1000, ...fetchOptions } = options;
    try {
      response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...fetchOptions, signal: timeoutSignal(fetchOptions.signal, timeoutMs), headers: { ...headers, ...(fetchOptions.headers || {}) } });
      payload = await response.json();
    } catch (cause) {
      if (cause?.name === "TimeoutError") { const error = new Error("서버 응답이 너무 오래 걸립니다. 잠시 후 다시 시도해 주세요."); error.type = "timeout"; error.cause = cause; throw error; }
      const error = new Error("AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."); error.type = "network_error"; error.cause = cause; throw error;
    }
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `HTTP ${response.status}`); error.httpStatus = response.status; error.type = payload?.error?.type || "http_error"; error.requestId = payload?.error?.request_id || ""; error.stopRetry = response.status === 404 && error.type === "not_found_error"; throw error;
    }
    return payload;
  }
  global.TalkFlowAiClient = Object.freeze({
    status: () => request("/api/talkflow/status/", { method: "GET" }),
    login: password => request("/api/talkflow/login/", { method: "POST", body: JSON.stringify({ password }) }),
    logout: () => request("/api/talkflow/logout/", { method: "POST", body: "{}" }),
    listModels: ({ signal } = {}) => request("/api/talkflow/models/", { method: "GET", signal }),
    articleSource: ({ excludeUrls = [], excludeTitles = [], excludeSubjects = [], excludedCategories = [], preferredCategories = [], usedCategories = [], categoryCounts = {}, publisherCounts = {}, signal } = {}) => { const query = new URLSearchParams(), append = (key, values, limit = 40) => { for (const value of Array.isArray(values) ? values.slice(0, limit) : []) query.append(key, String(value)); }, appendCounts = (key, counts, limit) => { for (const [name, count] of Object.entries(counts || {}).slice(0, limit)) if (Number.isInteger(count) && count >= 0) query.append(key, `${name}|${count}`); }; append("exclude", excludeUrls); append("excludeTitle", excludeTitles); append("excludeSubject", excludeSubjects); append("excludeCategory", excludedCategories, 8); append("preferredCategory", preferredCategories, 8); append("usedCategory", usedCategories); appendCounts("categoryCount", categoryCounts, 20); appendCounts("publisherCount", publisherCounts, 31); const suffix = query.size ? `?${query}` : ""; return request(`/api/talkflow/article-source/${suffix}`, { method: "GET", signal }).then(payload => payload.article); },
    generate: (body, { signal } = {}) => request("/api/talkflow/messages/", { method: "POST", body: JSON.stringify(body), signal, timeoutMs: 120 * 1000 })
  });
})(window);
