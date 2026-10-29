"use strict";

const FEEDS = Object.freeze([
  { publisher: "Reddit · Parenting", category: "RELATIONSHIPS & FAMILY", url: "https://www.reddit.com/r/Parenting/top/.rss?t=month" },
  { publisher: "Reddit · Explain Like I'm Five", category: "CULTURE", url: "https://www.reddit.com/r/explainlikeimfive/top/.rss?t=month" },
  { publisher: "BBC News · Technology", category: "TECH & DIGITAL", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { publisher: "BBC News · Business", category: "CONSUMER & ECONOMY", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { publisher: "BBC News · Entertainment & Arts", category: "CULTURE", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml" },
  { publisher: "BBC News · Magazine", category: "LIFE", url: "https://feeds.bbci.co.uk/news/magazine/rss.xml" },
  { publisher: "The Guardian · Life & Style", category: "DINING & LIFESTYLE", url: "https://www.theguardian.com/lifeandstyle/rss" },
  { publisher: "The Guardian · Culture", category: "CULTURE", url: "https://www.theguardian.com/culture/rss" },
  { publisher: "The Guardian · Travel", category: "DINING & LIFESTYLE", url: "https://www.theguardian.com/travel/rss" },
  { publisher: "The Guardian · Money", category: "CONSUMER & ECONOMY", url: "https://www.theguardian.com/money/rss" },
  { publisher: "NPR · Arts & Life", category: "CULTURE", url: "https://feeds.npr.org/1008/rss.xml" },
  { publisher: "Google News · Lifestyle", category: "DINING & LIFESTYLE", url: "https://news.google.com/rss/search?q=lifestyle+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Culture", category: "CULTURE", url: "https://news.google.com/rss/search?q=culture+entertainment+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Community", category: "SOCIAL TRENDS", url: "https://news.google.com/rss/search?q=community+everyday+life+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Work & Life", category: "WORK & CAREER", url: "https://news.google.com/rss/search?q=workplace+routine+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Home Cooking", category: "DINING & LIFESTYLE", url: "https://news.google.com/rss/search?q=home+cooking+tips+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Travel Tips", category: "DINING & LIFESTYLE", url: "https://news.google.com/rss/search?q=travel+tips+everyday+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Household Money", category: "CONSUMER & ECONOMY", url: "https://news.google.com/rss/search?q=household+budget+saving+money+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Hobbies", category: "CULTURE", url: "https://news.google.com/rss/search?q=new+hobby+trend+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Pets", category: "LIFE", url: "https://news.google.com/rss/search?q=pet+owners+daily+life+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Friendship", category: "RELATIONSHIPS & FAMILY", url: "https://news.google.com/rss/search?q=friendship+social+life+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Phones & Apps", category: "TECH & DIGITAL", url: "https://news.google.com/rss/search?q=smartphone+apps+daily+life+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Neighbourhood Life", category: "SOCIAL TRENDS", url: "https://news.google.com/rss/search?q=neighbors+community+daily+life+when%3A3m&hl=en-US&gl=US&ceid=US:en" },
  { publisher: "Google News · Shopping Habits", category: "CONSUMER & ECONOMY", url: "https://news.google.com/rss/search?q=shopping+habits+consumers+when%3A3m&hl=en-US&gl=US&ceid=US:en" }
]);
const CACHE_MS = 10 * 60 * 1000;
const ARTICLE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const CONVERSATION_FRIENDLY_CATEGORIES = new Set(["SOCIAL TRENDS", "CULTURE", "LIFE", "RELATIONSHIPS & FAMILY", "DINING & LIFESTYLE", "WORK & CAREER"]);
const FEATURED_CONVERSATION_CATEGORIES = new Set(["SOCIAL TRENDS", "CULTURE", "LIFE"]);
const TECHNICAL_CATEGORIES = new Set(["TECH & DIGITAL", "CONSUMER & ECONOMY"]);
const FRIENDLY_TO_TECHNICAL_RATIO = 3;
const STOP_WORDS = new Set(["about", "after", "against", "ahead", "also", "amid", "and", "are", "bbc", "been", "before", "between", "but", "can", "could", "does", "for", "from", "have", "into", "its", "more", "new", "not", "over", "says", "that", "the", "their", "there", "these", "they", "this", "was", "what", "when", "where", "which", "who", "will", "with", "would", "you", "your"]);
const SENSITIVE_TERMS = new Set(["boycott", "boycotts", "gaza", "hamas", "iran", "israel", "israeli", "palestine", "palestinian", "russia", "russian", "ukraine", "ukrainian", "heist", "obese", "obesity", "outlaw", "outlaws", "shoplifter", "shoplifters", "shoplifting", "steal", "stealing", "chancellor", "discrimination", "ethnic", "feminism", "inmate", "inmates", "jail", "misogyny", "prison", "prisoner", "prisoners", "racial", "racism", "racist", "sanctions", "sexism", "stereotype", "stereotypes", "tariff", "tariffs", "tax", "taxes", "administration", "adult", "deport", "deportation", "hack", "hacked", "hackers", "immigration", "protest", "protesters", "protests", "stolen", "theft", "trump", "army", "backlash", "cancer", "chemotherapy", "contamination", "councillor", "dementia", "disaster", "disease", "dying", "earthquake", "feud", "flooding", "hospice", "illness", "injured", "nhs", "pollution", "raf", "refugee", "slams", "toxic", "troops", "tumour", "tumor", "abuse", "abused", "allegation", "allegations", "assault", "attack", "bisexual", "bomb", "buddhism", "buddhist", "catholic", "catholicism", "christian", "christianity", "church", "civil", "coercion", "complaint", "complaints", "conflict", "consent", "court", "crime", "criminal", "crisis", "death", "defendant", "died", "election", "explicit", "exploit", "exploitation", "faith", "funeral", "gay", "gender", "government", "harassment", "harassed", "hindu", "hinduism", "homosexual", "investigate", "investigation", "islam", "islamic", "jewish", "judaism", "killed", "lawsuit", "lawsuits", "legal", "lesbian", "lgbt", "lgbtq", "litigation", "military", "minister", "misconduct", "mosque", "murder", "nude", "nudity", "parliament", "plaintiff", "police", "politics", "pope", "porn", "prayer", "president", "pride", "queer", "rape", "religion", "religious", "settlement", "sex", "sexual", "shooting", "survivor", "survivors", "synagogue", "temple", "terror", "trafficking", "transgender", "trial", "vatican", "victim", "victims", "violence", "violent", "war"]);
const cache = globalThis.__theboxRssSourceCache || (globalThis.__theboxRssSourceCache = { articles: null, expiresAt: 0 });

function cleanText(value, max = 1200) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&(?:lt|#60);/gi, "<")
    .replace(/&(?:gt|#62);/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function tagValue(item, tag) {
  const found = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i").exec(item);
  return cleanText(found?.[1] || "");
}

function atomLink(item) {
  const match = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/i.exec(item);
  return cleanText(match?.[1] || "");
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.href.length > 2048) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch {
    return "";
  }
}

function subjectTokens(value) {
  return [...new Set(cleanText(value, 2000).toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g)?.filter(token => token.length > 2 && !STOP_WORDS.has(token)) || [])];
}

function articleIdentity(article) {
  return {
    titleKey: subjectTokens(article?.title).join(" "),
    subjectKey: subjectTokens(`${article?.title || ""} ${article?.excerpt || ""}`).slice(0, 18).join(" ")
  };
}

function overlapsSubject(left, right) {
  const leftTerms = new Set(subjectTokens(left));
  const rightTerms = subjectTokens(right);
  if (!leftTerms.size || !rightTerms.length) return false;
  const shared = rightTerms.filter(term => leftTerms.has(term)).length;
  const smallerSet = Math.min(leftTerms.size, rightTerms.length);
  return shared >= 2 || shared / smallerSet >= 0.7;
}

function normalizeOptions(value) {
  if (Array.isArray(value)) return { excludedUrls: value, excludedTitles: [], excludedSubjects: [], excludedCategories: [], preferredCategories: [], usedCategories: [], categoryCounts: {}, publisherCounts: {} };
  const input = value && typeof value === "object" ? value : {};
  return {
    excludedUrls: Array.isArray(input.excludedUrls) ? input.excludedUrls : [],
    excludedTitles: Array.isArray(input.excludedTitles) ? input.excludedTitles : [],
    excludedSubjects: Array.isArray(input.excludedSubjects) ? input.excludedSubjects : [],
    excludedCategories: Array.isArray(input.excludedCategories) ? input.excludedCategories.map(value => cleanText(value, 40)).filter(Boolean) : [],
    preferredCategories: Array.isArray(input.preferredCategories) ? input.preferredCategories.map(value => cleanText(value, 40)).filter(Boolean) : [],
    usedCategories: Array.isArray(input.usedCategories) ? input.usedCategories : [],
    categoryCounts: input.categoryCounts && typeof input.categoryCounts === "object" ? input.categoryCounts : {},
    publisherCounts: input.publisherCounts && typeof input.publisherCounts === "object" ? input.publisherCounts : {}
  };
}

function parseRss(xml, feed) {
  const source = String(xml || "");
  const records = [...source.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  if (!records.length) records.push(...source.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi));
  return records.map(match => {
    const item = match[1];
    const title = tagValue(item, "title");
    const url = safeUrl(tagValue(item, "link") || atomLink(item) || tagValue(item, "guid"));
    const excerpt = (tagValue(item, "description") || tagValue(item, "content") || tagValue(item, "summary")).slice(0, 500);
    const published = Date.parse(tagValue(item, "pubDate") || tagValue(item, "published") || tagValue(item, "updated"));
    const publishedAt = Number.isFinite(published) ? new Date(published).toISOString() : "";
    const score = Number(/(\d[\d,]*)\s+points?/i.exec(`${item} ${excerpt}`)?.[1]?.replaceAll(",", "")) || 0;
    const article = { publisher: feed.publisher, category: cleanText(feed.category, 40), title, url, excerpt, popularityScore: score, publishedAt };
    return { ...article, ...articleIdentity(article) };
  }).filter(item => item.title && item.url && item.excerpt && item.publishedAt);
}

async function fetchFeed(feed, fetchImpl) {
  const response = await fetchImpl(feed.url, {
    headers: { accept: "application/rss+xml, application/xml, text/xml;q=0.9" },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`RSS ${response.status}`);
  return parseRss(await response.text(), feed);
}

function isRecent(article, now) {
  const age = now - Date.parse(article.publishedAt);
  return Number.isFinite(age) && age >= -2 * 60 * 60 * 1000 && age <= ARTICLE_WINDOW_MS;
}

function isSuitable(article) {
  return !subjectTokens(`${article.title} ${article.excerpt}`).some(token => SENSITIVE_TERMS.has(token));
}

function totalCategoryCount(categoryCounts, categories) {
  return Object.entries(categoryCounts).reduce((total, [category, count]) => total + (categories.has(category) ? Number(count || 0) : 0), 0);
}

function balancedCategoryPool(articles, categoryCounts) {
  const friendly = articles.filter(article => CONVERSATION_FRIENDLY_CATEGORIES.has(article.category));
  const technical = articles.filter(article => TECHNICAL_CATEGORIES.has(article.category));
  if (!friendly.length || !technical.length) return articles;
  const friendlyCount = totalCategoryCount(categoryCounts, CONVERSATION_FRIENDLY_CATEGORIES);
  const technicalCount = totalCategoryCount(categoryCounts, TECHNICAL_CATEGORIES);
  return friendlyCount < (technicalCount + 1) * FRIENDLY_TO_TECHNICAL_RATIO ? friendly : technical;
}

function selectionScore(article, usedCategories, categoryCounts = {}, now) {
  const categoryCount = Number(categoryCounts[article.category] || 0);
  const featuredCategoryBonus = FEATURED_CONVERSATION_CATEGORIES.has(article.category) ? 2000000000000000 : 0;
  const categoryBonus = article.category && !usedCategories.has(article.category) ? 1000000000000 : 0;
  const balanceBonus = Math.max(0, 100 - categoryCount) * 1000000000;
  const suitabilityBonus = isSuitable(article) ? 100000000000 : 0;
  const popularityBonus = Math.min(Number(article.popularityScore || 0), 100000) * 10000000000;
  return featuredCategoryBonus + categoryBonus + balanceBonus + suitabilityBonus + popularityBonus + Date.parse(article.publishedAt) - now;
}

function selectArticle(articles, now, options) {
  const excludedUrls = new Set(options.excludedUrls.map(safeUrl).filter(Boolean));
  const excludedTitles = options.excludedTitles.map(value => subjectTokens(value).join(" ")).filter(Boolean);
  const excludedSubjects = options.excludedSubjects.filter(Boolean);
  const excludedCategories = new Set(options.excludedCategories || []);
  const preferredCategories = new Set(options.preferredCategories || []);
  const usedCategories = new Set(options.usedCategories.map(value => cleanText(value, 40)).filter(Boolean));
  const categoryCounts = options.categoryCounts || {}, publisherCounts = options.publisherCounts || {};
  const candidates = articles.filter(article => isRecent(article, now) && !excludedCategories.has(article.category) && (!preferredCategories.size || preferredCategories.has(article.category)) && !excludedUrls.has(article.url) && !excludedTitles.includes(article.titleKey) && !excludedSubjects.some(value => overlapsSubject(article.subjectKey, value)));
  const suitable = candidates.filter(isSuitable);
  if (!suitable.length) return null;
  const balanced = balancedCategoryPool(suitable, categoryCounts);
  const lowestCategoryCount = Math.min(...balanced.map(article => Number(categoryCounts[article.category] || 0)));
  const leastUsedCategory = balanced.filter(article => Number(categoryCounts[article.category] || 0) === lowestCategoryCount);
  const lowestPublisherCount = Math.min(...leastUsedCategory.map(article => Number(publisherCounts[article.publisher] || 0)));
  return leastUsedCategory.filter(article => Number(publisherCounts[article.publisher] || 0) === lowestPublisherCount).sort((left, right) => selectionScore(right, usedCategories, categoryCounts, now) - selectionScore(left, usedCategories, categoryCounts, now))[0] || null;
}

async function latestArticle(fetchImpl = fetch, now = Date.now(), input = []) {
  if (!cache.articles || cache.expiresAt <= now) {
    const results = await Promise.allSettled(FEEDS.map(feed => fetchFeed(feed, fetchImpl)));
    cache.articles = results.flatMap(result => result.status === "fulfilled" ? result.value : []).sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
    cache.expiresAt = now + CACHE_MS;
  }
  const options = normalizeOptions(input);
  const candidate = selectArticle(cache.articles, now, options);
  if (!candidate) {
    const error = new Error("rss_unavailable");
    error.code = options.preferredCategories.length ? "rss_category_unavailable" : "rss_unavailable";
    throw error;
  }
  return Object.freeze({ publisher: candidate.publisher, category: candidate.category, title: candidate.title, titleKey: candidate.titleKey, subjectKey: candidate.subjectKey, url: candidate.url, excerpt: candidate.excerpt, popularityScore: candidate.popularityScore || 0, publishedAt: candidate.publishedAt });
}

function clearCache() {
  cache.articles = null;
  cache.expiresAt = 0;
}

module.exports = { ARTICLE_WINDOW_MS, FEEDS, articleIdentity, clearCache, latestArticle, parseRss, safeUrl, selectArticle };
