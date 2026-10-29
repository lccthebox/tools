"use strict";

const { json, rateLimit, requireSession, verifySameOrigin } = require("../../server/talkflow/security");
const { latestArticle, safeUrl } = require("../../server/talkflow/rss-source");

function selectionOptions(request) {
  try {
    const params = new URL(request.url, "https://thebox.local").searchParams;
    const categoryCounts = params.getAll("categoryCount").slice(0, 20).reduce((counts, value) => {
      const separator = String(value).lastIndexOf("|");
      const category = String(value).slice(0, separator).trim();
      const count = Number(String(value).slice(separator + 1));
      if (separator > 0 && category.length <= 40 && Number.isInteger(count) && count >= 0 && count <= 31) counts[category] = count;
      return counts;
    }, {});
    const publisherCounts = params.getAll("publisherCount").slice(0, 31).reduce((counts, value) => {
      const separator = String(value).lastIndexOf("|");
      const publisher = String(value).slice(0, separator).trim();
      const count = Number(String(value).slice(separator + 1));
      if (separator > 0 && publisher.length <= 120 && Number.isInteger(count) && count >= 0 && count <= 31) counts[publisher] = count;
      return counts;
    }, {});
    return {
      excludedUrls: params.getAll("exclude").slice(0, 40).map(safeUrl).filter(Boolean),
      excludedTitles: params.getAll("excludeTitle").slice(0, 40),
      excludedSubjects: params.getAll("excludeSubject").slice(0, 40),
      excludedCategories: params.getAll("excludeCategory").slice(0, 8),
      preferredCategories: params.getAll("preferredCategory").slice(0, 8),
      usedCategories: params.getAll("usedCategory").slice(0, 40),
      categoryCounts,
      publisherCounts
    };
  } catch {
    return { excludedUrls: [], excludedTitles: [], excludedSubjects: [], excludedCategories: [], preferredCategories: [], usedCategories: [], categoryCounts: {}, publisherCounts: {} };
  }
}

module.exports = async (request, response) => {
  if (request.method !== "GET") return json(response, 405, { error: { type: "method_not_allowed", message: "지원하지 않는 요청입니다." } }, { allow: "GET" });
  if (!verifySameOrigin(request, response) || !requireSession(request, response) || !rateLimit(request, response, "rss-source", 48, 60 * 1000)) return;
  try {
    json(response, 200, { article: await latestArticle(fetch, Date.now(), selectionOptions(request)) });
  } catch (error) {
    if (error?.code === "rss_category_unavailable") return json(response, 409, { error: { type: "rss_category_unavailable", message: "선택한 카테고리에서 사용할 수 있는 새 기사를 찾지 못했습니다. 다른 카테고리를 선택하거나 잠시 후 다시 시도해 주세요." } });
    json(response, 503, { error: { type: "rss_unavailable", message: "최신 RSS 기사를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." } });
  }
};
