"use strict";
const { json, sessionCookie, verifySameOrigin } = require("../../server/talkflow/security");
module.exports = (request, response) => {
  if (request.method !== "POST") return json(response, 405, { error: { type: "method_not_allowed", message: "지원하지 않는 요청입니다." } }, { allow: "POST" });
  if (!verifySameOrigin(request, response)) return;
  response.setHeader("set-cookie", sessionCookie("", 0));
  json(response, 200, { authenticated: false });
};
