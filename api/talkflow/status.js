"use strict";
const { json, serverConfigured, verifySession } = require("../../server/talkflow/security");
module.exports = (request, response) => {
  if (request.method !== "GET") return json(response, 405, { error: { type: "method_not_allowed", message: "지원하지 않는 요청입니다." } }, { allow: "GET" });
  json(response, 200, { configured: serverConfigured(), authenticated: verifySession(request), model: "Claude Sonnet 4.6" });
};
