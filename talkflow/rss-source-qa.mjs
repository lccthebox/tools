import assert from "node:assert/strict";
import { ARTICLE_WINDOW_MS, FEEDS, articleIdentity, clearCache, latestArticle, parseRss, safeUrl, selectArticle } from "../server/talkflow/rss-source.js";

assert.ok(FEEDS.length >= 24, "the Article picker must aggregate a broad multi-publisher RSS pool");
assert.equal(ARTICLE_WINDOW_MS, 90 * 24 * 60 * 60 * 1000, "weekly and monthly popular Articles remain eligible for ninety days");

const feed = { publisher: "Test News", url: "https://news.example/rss" };
const xml = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Older &amp; useful]]></title><link>https://news.example/older</link><description><![CDATA[<p>Short <b>news</b> summary.</p>]]></description><pubDate>Tue, 22 Sep 2026 10:00:00 GMT</pubDate></item><item><title>Newest story</title><link>https://news.example/newest</link><description>Latest summary</description><pubDate>Wed, 23 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
const parsed = parseRss(xml, feed);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].excerpt, "Short news summary.");
assert.equal(parsed[1].url, "https://news.example/newest");
clearCache();
const latest = await latestArticle(async () => new Response(xml, { status: 200 }), Date.parse("2026-09-23T13:00:00Z"));
assert.equal(latest.title, "Newest story");
assert.equal(latest.publisher.length > 0, true);
assert.equal(latest.url, "https://news.example/newest");
const alternate = await latestArticle(async () => new Response(xml, { status: 200 }), Date.parse("2026-09-23T13:00:00Z"), [latest.url]);
assert.equal(alternate.url, "https://news.example/older", "monthly generation must receive a different Article source after the latest source was used");
assert.equal(safeUrl("https://news.example/article?utm_source=test&ref=menu#story"), "https://news.example/article?ref=menu");
const now = Date.parse("2026-09-23T13:00:00Z");
const makeArticle = ({ category, title, excerpt, ageHours, url }) => {
  const article = { publisher: "Test News", category, title, excerpt, url, publishedAt: new Date(now - ageHours * 60 * 60 * 1000).toISOString() };
  return { ...article, ...articleIdentity(article) };
};
const babyBanks = makeArticle({ category: "SOCIAL TRENDS", title: "Baby banks face a growing gap", excerpt: "Baby banks and local charities are helping families find essential supplies.", ageHours: 1, url: "https://news.example/baby-banks" });
const relatedBabyBanks = makeArticle({ category: "CONSUMER & ECONOMY", title: "Charities feel pressure as baby banks run low", excerpt: "Families turn to baby banks when charity donations cannot meet demand.", ageHours: 2, url: "https://news.example/charity-pressure" });
const digitalLife = makeArticle({ category: "TECH & DIGITAL", title: "How families are setting healthier phone boundaries", excerpt: "Parents and teenagers are discussing screen time at home.", ageHours: 4, url: "https://news.example/phone-boundaries" });
const oldArticle = makeArticle({ category: "CULTURE", title: "An older arts story", excerpt: "A community arts project welcomes new visitors.", ageHours: 91 * 24, url: "https://news.example/old" });
const distinct = selectArticle([babyBanks, relatedBabyBanks, digitalLife, oldArticle], now, { excludedUrls: [babyBanks.url], excludedTitles: [babyBanks.title], excludedSubjects: [babyBanks.subjectKey], usedCategories: ["SOCIAL TRENDS"] });
assert.equal(distinct.url, digitalLife.url, "a related Article and an Article older than ninety days must not be selected for the same month");
const diverse = selectArticle([babyBanks, digitalLife], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: ["SOCIAL TRENDS"] });
assert.equal(diverse.url, babyBanks.url, "a conversation-friendly Social Trends Article must outrank TECH & DIGITAL until the monthly balance needs a harder category");
// Given the friendly categories already have two Article slots and TECH & DIGITAL has none,
// when both are available, then one more friendly Article is selected before the technical slot.
assert.equal(selectArticle([babyBanks, digitalLife], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: ["SOCIAL TRENDS"], categoryCounts: { "SOCIAL TRENDS": 2, "TECH & DIGITAL": 0 } }).url, babyBanks.url, "friendly categories should reach the 3:1 target before TECH & DIGITAL is selected");
// Given the friendly categories have reached their three-to-one target for the month,
// when both are available, then the technical Article can be selected to retain variety.
assert.equal(selectArticle([babyBanks, digitalLife], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: ["SOCIAL TRENDS"], categoryCounts: { "SOCIAL TRENDS": 3, "TECH & DIGITAL": 0 } }).url, digitalLife.url, "TECH & DIGITAL should return only after three conversation-friendly Articles");
// Given TECH & DIGITAL has already been used several times this month, when an unused safe category is available,
// then the less-used category wins even when the Tech article is more popular.
const popularTech = { ...makeArticle({ category: "TECH & DIGITAL", title: "Popular phone launch", excerpt: "A new device is attracting a lot of attention.", ageHours: 1, url: "https://news.example/popular-tech" }), popularityScore: 1000 };
const underusedCulture = makeArticle({ category: "CULTURE", title: "Local museums make late visits easier", excerpt: "Visitors discuss how evening access changes a familiar cultural routine.", ageHours: 3, url: "https://news.example/underused-culture" });
assert.equal(selectArticle([popularTech, underusedCulture], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: ["TECH & DIGITAL"], categoryCounts: { "TECH & DIGITAL": 3, CULTURE: 0 } }).url, underusedCulture.url, "the least-used category must outrank a repeated Tech & Digital category");
assert.equal(selectArticle([popularTech, underusedCulture], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], excludedCategories: [], preferredCategories: ["CULTURE"], usedCategories: [] }).url, underusedCulture.url, "an operator-selected Article category must filter the RSS pool before ranking");
assert.equal(selectArticle([popularTech, underusedCulture], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], excludedCategories: ["CULTURE"], preferredCategories: [], usedCategories: [] }).url, popularTech.url, "the Article picker must exclude the selected Page 1 category to keep both pages distinct");
const repeatedPublisherCulture = { ...underusedCulture, publisher: "BBC News · Entertainment & Arts", url: "https://news.example/bbc-culture" };
const freshPublisherCulture = { ...underusedCulture, publisher: "The Guardian · Culture", title: "Museums offer a new late opening", url: "https://news.example/guardian-culture" };
assert.equal(selectArticle([repeatedPublisherCulture, freshPublisherCulture], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: [], categoryCounts: { CULTURE: 0 }, publisherCounts: { "BBC News · Entertainment & Arts": 2, "The Guardian · Culture": 0 } }).url, freshPublisherCulture.url, "a less-used publisher must outrank a repeated publisher within the same category");
// Given two safe articles in the same category, when an older weekly/monthly popular item has far more interest,
// then it is preferred over a just-published low-interest item within the four-week window.
const latestLowInterest = makeArticle({ category: "TECH & DIGITAL", title: "A tiny app update", excerpt: "A small software update has arrived for users.", ageHours: 1, url: "https://news.example/latest-low-interest" });
const monthlyPopular = { ...makeArticle({ category: "TECH & DIGITAL", title: "How libraries are helping neighbours borrow more easily", excerpt: "A widely discussed service change helps people share books and tools locally.", ageHours: 21 * 24, url: "https://news.example/monthly-popular" }), popularityScore: 750 };
assert.equal(selectArticle([latestLowInterest, monthlyPopular], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: [] }).url, monthlyPopular.url, "weekly and monthly popular Articles may outrank a newer low-interest item");
const sexualContent = makeArticle({ category: "CULTURE", title: "Celebrity faces sexual misconduct allegations", excerpt: "The entertainment story includes explicit sexual allegations.", ageHours: 1, url: "https://news.example/sexual-content" });
const religiousContent = makeArticle({ category: "RELATIONSHIPS & FAMILY", title: "Church leaders discuss a new religious initiative", excerpt: "The faith group plans a community event at the church.", ageHours: 2, url: "https://news.example/religious-content" });
const neutralArticle = makeArticle({ category: "TECH & DIGITAL", title: "Libraries test a simpler digital borrowing service", excerpt: "Readers can discuss how a small technology change affects everyday routines.", ageHours: 3, url: "https://news.example/neutral-content" });
const familySafe = selectArticle([sexualContent, religiousContent, neutralArticle], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: ["TECH & DIGITAL"] });
assert.equal(familySafe.url, neutralArticle.url, "sexual and religious RSS candidates must never outrank a neutral Article");
// Given an RSS item about a campus civil lawsuit, when it is the only recent result,
// then it is rejected instead of becoming a fallback topic.
const campusLawsuit = makeArticle({ category: "SOCIAL TRENDS", title: "Cornell University faces a civil lawsuit over a campus case", excerpt: "The institution is responding to a legal complaint.", ageHours: 1, url: "https://news.example/campus-lawsuit" });
assert.equal(selectArticle([campusLawsuit], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: [] }), null, "crime-adjacent legal and campus case coverage must not become a fallback Article");
// Everyday-conversation pool: no UK local, hard-news, illness or niche-tech feeds.
for (const url of ["feeds.bbci.co.uk/news/england","feeds.bbci.co.uk/news/world","feeds.bbci.co.uk/news/health","feeds.bbci.co.uk/news/science_and_environment","reddit.com/r/worldnews","reddit.com/r/science","news.ycombinator.com"]) assert.ok(!FEEDS.some(feed => feed.url.includes(url)), `${url} is not an everyday-conversation source`);
for (const url of ["theguardian.com/society","reddit.com/r/business"]) assert.ok(!FEEDS.some(feed => feed.url.includes(url)), `${url} brings politics into Article candidates`);
for (const title of ["Trump administration eases peptide access","Workers protest new rules","Diesel theft rises with fuel prices","Hackers leak agents details"]) assert.equal(selectArticle([{ publisher: "Test News", category: "LIFE", title, excerpt: "", url: "https://news.example/"+encodeURIComponent(title), publishedAt: new Date(now).toISOString() }], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: [], categoryCounts: {}, publisherCounts: {} }), null, `"${title}" must not be offered as an Article`);
for (const title of ["30 years of cancer care centres","RAF base chemical contamination worst in UK","Singer slams former colleague in public feud","NHS waiting lists grow"]) assert.equal(selectArticle([{ publisher: "Test News", category: "LIFE", title, excerpt: "", url: "https://news.example/"+encodeURIComponent(title), publishedAt: new Date(now).toISOString() }], now, { excludedUrls: [], excludedTitles: [], excludedSubjects: [], usedCategories: [], categoryCounts: {}, publisherCounts: {} }), null, `"${title}" must not be offered as an Article`);
console.log("PASS rss-source-qa: RSS candidates retain links, reject month-level topic overlap, stay within ninety days, and prefer unused categories and publishers.");
