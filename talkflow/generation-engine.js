(function (root) {
  "use strict";

  const VERSION = "v2-fail-closed";
  const STANDARD_VERSION = "2";
  const TEMPLATE_VERSION = "4";
  const AXES = ["habit", "recentExperience", "evaluation", "comparison", "problemSolving", "decision", "prediction", "systemOpinion"];
  const MECHANISMS = ["informationGap", "personalArtifact", "timedTurn", "assignedOpposition", "openEndedDecision"];
  const EXPRESSION_FUNCTIONS = ["REASON", "SOFT_DISAGREE", "CONDITION", "COMPARE", "EXCEPTION", "CONNECT", "REACT", "FOLLOW_UP"];
  const SKELETON = Object.freeze({
    session1: Object.freeze([
      { id: "why", label: "WHY THIS TOPIC", minutes: 0 },
      { id: "popQuiz", label: "POP QUIZ — DOES THIS SOUND NATURAL?", minutes: 10 },
      { id: "icebreakers", label: "ICEBREAKER QUESTIONS", minutes: 30 },
      { id: "bingo", label: "SPARK WORDS BINGO", minutes: 0 }
    ]),
    session2: Object.freeze([
      { id: "game", label: "GAME + HOW TO PLAY", minutes: 20 },
      { id: "situation", label: "SITUATION", minutes: 0 },
      { id: "discussion", label: "DISCUSSION", minutes: 15 },
      { id: "expressions", label: "USEFUL EXPRESSIONS", minutes: 5 }
    ])
  });

  const text = { type: "string", minLength: 1 };
  const integer = { type: "integer" };
  const object = (required, properties) => ({ type: "object", additionalProperties: false, required, properties });
  const list = (items, minItems, maxItems) => ({ type: "array", items, ...(minItems === undefined ? {} : { minItems }), ...(maxItems === undefined ? {} : { maxItems }) });
  const bilingual = object(["en", "ko"], { en: text, ko: text });
  const planSchema = object(
    ["centralTopic", "questionAxes", "materialType", "sessionTwoActivity", "speakingMechanisms", "finalGroupResult"],
    {
      centralTopic: bilingual,
      questionAxes: { type: "array", minItems: 3, maxItems: 6, uniqueItems: true, items: { type: "string", enum: AXES } },
      materialType: { type: "string", enum: ["reviews", "messages", "priceConditions", "scenarioCards", "roleInformation", "schedule", "statistics", "cases"] },
      sessionTwoActivity: { type: "string", enum: ["informationGap", "blindRanking", "assignedRoleDebate", "openDecisionChallenge", "writeTheFake"] },
      speakingMechanisms: { type: "array", minItems: 3, uniqueItems: true, items: { type: "string", enum: MECHANISMS } },
      finalGroupResult: bilingual
    }
  );
  const popQuizItem = object(["wrong", "right", "why_ko"], { wrong: text, right: text, why_ko: text });
  const ladder = object(["basic", "plus"], { basic: text, plus: text });
  const icebreaker = object(["en", "type", "minutes", "starter", "followup", "ladder"], {
    en: text,
    type: { type: "string", enum: ["quick_choice", "recent_experience", "light_opinion"] },
    minutes: integer,
    options: list(text, 2, 3),
    escape: text,
    starter: text,
    followup: text,
    ladder
  });
  const bingoWord = object(["en", "pos", "ko"], { en: text, pos: { type: "string", enum: ["n.", "v.", "adj.", "phr."] }, ko: text });
  const gameRule = object(["en", "ko"], { en: text, ko: text });
  const gameOption = object(["label", "ko"], { label: text, ko: text });
  const gameRole = object(["name", "task_en", "task_ko"], { name: text, task_en: text, task_ko: text });
  const gameInput = object(["label", "lines"], { label: text, lines: integer });
  const game = object(["type", "name", "minutes", "minFloor", "rules"], {
    type: bilingual,
    name: text,
    minutes: integer,
    minFloor: integer,
    rules: list(gameRule, 4, 6),
    options: list(gameOption, 1),
    roles: list(gameRole, 1),
    inputs: list(gameInput, 1),
    starters: list(text, 1)
  });
  const situation = object(["en", "ko", "facts"], { en: text, ko: text, facts: list(bilingual, 1) });
  const discussion = object(["en", "starter", "followup"], { en: text, starter: text, followup: text });
  const expression = object(["fn", "en", "ko"], { fn: { type: "string", enum: EXPRESSION_FUNCTIONS }, en: text, ko: text });
  const leader = object(["s1_notes", "s2_notes", "timeCut"], {
    s1_notes: list(text, 1),
    s2_notes: list(text, 1),
    timeCut: list(object(["block", "from", "to"], { block: text, from: integer, to: integer }), 1)
  });
  const contentSchema = object(["date", "weekday", "category", "title", "session1", "session2", "leader"], {
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    weekday: text,
    category: bilingual,
    title: bilingual,
    session1: object(["minutes", "why", "popQuiz", "icebreakers", "bingo"], {
      minutes: integer,
      why: bilingual,
      popQuiz: list(popQuizItem, 3, 3),
      icebreakers: list(icebreaker, 3, 3),
      bingo: object(["rule_ko", "words"], { rule_ko: text, words: list(bingoWord, 9, 9) })
    }),
    session2: object(["minutes", "game", "situation", "discussion", "expressions"], {
      minutes: integer,
      game,
      situation,
      discussion: list(discussion, 3, 3),
      expressions: list(expression)
    }),
    leader
  });

  const GENERATED_TOPIC_SCHEMA = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://thebox.example/talkflow/generated-topic-v2.schema.json",
    title: "TheBox Talk Flow Bound-Field Topic",
    ...contentSchema,
    required: [...contentSchema.required, "generationEngine", "generatedConversation", "standardVersion", "templateVersion"],
    properties: {
      ...contentSchema.properties,
      id: text,
      generationEngine: { const: VERSION },
      generatedConversation: { const: true },
      standardVersion: { const: STANDARD_VERSION },
      templateVersion: { const: TEMPLATE_VERSION },
      generationRequest: { type: "object" },
      topicPlan: planSchema,
      quality: { type: "object" },
      operatorStatus: { type: "object" },
      hidden: { type: "boolean" },
      createdAt: text,
      updatedAt: text
    }
  };
  const PLAN_TOOL = Object.freeze({ name: "submit_topic_plan", description: "Submit only the constrained Talk Flow topic plan.", input_schema: planSchema });
  const CONTENT_TOOL = Object.freeze({ name: "submit_content_fill", description: "Return one complete bound-field Talk Flow topic. Never use a fallback field.", input_schema: contentSchema });

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]+/g, " ").trim();
  const hasHangul = (value) => /[가-힣]/.test(String(value || ""));
  const asciiRatio = (value) => {
    const chars = [...String(value || "").replace(/\s/g, "")];
    return chars.length ? chars.filter((char) => char.codePointAt(0) <= 127).length / chars.length : 0;
  };
  const issue = (severity, id, group, location, message) => ({ severity, id, group, location, message });
  const blocker = (id, group, location, message) => issue("blocker", id, group, location, message);
  const warning = (id, group, location, message) => issue("warning", id, group, location, message);
  const dedupe = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item.severity}|${item.id}|${item.location}|${item.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  function validateSchema(value, schema, path, issues) {
    if (schema.const !== undefined && value !== schema.const) issues.push(blocker("B1", "structure", path, `고정값 ${schema.const}와 일치하지 않습니다.`));
    if (schema.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        issues.push(blocker("B1", "structure", path, "필수 객체가 없습니다."));
        return;
      }
      for (const key of schema.required || []) if (!(key in value)) issues.push(blocker("B1", "structure", `${path}.${key}`, "필수 섹션 또는 필드가 없습니다."));
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) if (!(key in (schema.properties || {}))) issues.push(blocker("B1", "structure", `${path}.${key}`, "스키마에 없는 필드입니다."));
      }
      for (const [key, child] of Object.entries(schema.properties || {})) if (key in value) validateSchema(value[key], child, `${path}.${key}`, issues);
      return;
    }
    if (schema.type === "array") {
      if (!Array.isArray(value)) {
        issues.push(blocker("B1", "structure", path, "필수 배열이 없습니다."));
        return;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems) issues.push(blocker("B1", "structure", path, `최소 ${schema.minItems}개가 필요합니다.`));
      if (schema.maxItems !== undefined && value.length > schema.maxItems) issues.push(blocker("B1", "structure", path, `최대 ${schema.maxItems}개만 허용합니다.`));
      if (schema.uniqueItems && new Set(value.map((entry) => JSON.stringify(entry))).size !== value.length) issues.push(blocker("B1", "structure", path, "중복 항목은 허용하지 않습니다."));
      value.forEach((entry, index) => validateSchema(entry, schema.items || {}, `${path}[${index}]`, issues));
      return;
    }
    if (schema.type === "string") {
      if (typeof value !== "string") issues.push(blocker("B1", "content", path, "문자열이 필요합니다."));
      else {
        if (schema.minLength && !value.trim()) issues.push(blocker("B1", "content", path, "필수 내용이 비어 있습니다."));
        if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) issues.push(blocker("B1", "structure", path, "형식이 올바르지 않습니다."));
      }
    }
    if (schema.type === "integer" && !Number.isInteger(value)) issues.push(blocker("B1", "structure", path, "정수가 필요합니다."));
    if (schema.enum && !schema.enum.includes(value)) issues.push(blocker("B1", "structure", path, "허용된 값이 아닙니다."));
  }

  function strings(value, path = "topic", result = []) {
    if (typeof value === "string") result.push({ path, value });
    else if (Array.isArray(value)) value.forEach((entry, index) => strings(entry, `${path}[${index}]`, result));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => strings(entry, `${path}.${key}`, result));
    return result;
  }
  function duplicateValues(entries) {
    const counts = new Map(entries.map((entry) => [normalize(entry), 0]));
    entries.forEach((entry) => counts.set(normalize(entry), (counts.get(normalize(entry)) || 0) + 1));
    return [...counts.entries()].filter(([key, count]) => key && count > 1).map(([key]) => key);
  }
  const words = (value) => String(value || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  function overlap(left, right) {
    const a = new Set(words(left).filter((word) => !["a", "an", "the", "do", "does", "is", "are", "what", "which", "when", "where", "who", "why", "how", "you", "your", "to", "of"].includes(word)));
    const b = new Set(words(right).filter((word) => !["a", "an", "the", "do", "does", "is", "are", "what", "which", "when", "where", "who", "why", "how", "you", "your", "to", "of"].includes(word)));
    if (!a.size || !b.size) return 0;
    return [...a].filter((word) => b.has(word)).length / Math.min(a.size, b.size);
  }
  function standardDeviation(values) {
    if (!values.length) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  }

  function validatePlan(plan) {
    const issues = [];
    validateSchema(plan, planSchema, "plan", issues);
    if (new Set(plan?.questionAxes || []).size < 3) issues.push(blocker("B1", "structure", "plan.questionAxes", "서로 다른 질문 축이 최소 3개 필요합니다."));
    if (new Set(plan?.speakingMechanisms || []).size < 3) issues.push(blocker("B1", "speaking", "plan.speakingMechanisms", "발화 장치가 최소 3개 필요합니다."));
    return { ok: !issues.some((item) => item.severity === "blocker"), issues: dedupe(issues) };
  }

  function validateContent(topic, plan, allTopics = []) {
    const issues = [];
    validateSchema(topic, contentSchema, "topic", issues);
    if (!topic || typeof topic !== "object") return result(issues);

    const s1 = topic.session1 || {}, s2 = topic.session2 || {}, gameValue = s2.game || {};
    if (Array.isArray(gameValue) && gameValue.length > 1 || Array.isArray(s2.games) && s2.games.length > 1) issues.push(blocker("B2", "structure", "session2.game", "Session 2 게임은 정확히 1개여야 합니다."));

    const starters = [...(s1.icebreakers || []), ...(s2.discussion || [])].map((item) => item?.starter).filter(Boolean);
    if (duplicateValues(starters).length) issues.push(blocker("B3", "content", "questions.starter", "같은 starter가 문서 안에서 반복됩니다."));

    const koLists = [
      ["session2.game.rules", (gameValue.rules || []).map((item) => item.ko)],
      ["session2.game.options", (gameValue.options || []).map((item) => item.ko)],
      ["session2.game.roles", (gameValue.roles || []).map((item) => item.task_ko)],
      ["session2.situation.facts", (s2.situation?.facts || []).map((item) => item.ko)],
      ["session2.expressions", (s2.expressions || []).map((item) => item.ko)]
    ];
    for (const [path, values] of koLists) if (duplicateValues(values.filter(Boolean)).length) issues.push(blocker("B4", "content", path, "같은 리스트 안에서 한국어가 중복됩니다."));
    if ((gameValue.rules || []).some((item) => normalize(item.ko) === normalize(gameValue.type?.ko))) issues.push(blocker("B4", "content", "session2.game.rules", "게임 유형 번역과 규칙 번역이 중복됩니다."));

    if (asciiRatio(topic.title?.en) < 0.8) issues.push(blocker("B5", "content", "title.en", "영문 제목의 ASCII 비율이 80% 미만입니다."));
    const labels = [
      ...(gameValue.options || []).map((item, index) => [`session2.game.options[${index}].label`, item.label]),
      ...(gameValue.roles || []).map((item, index) => [`session2.game.roles[${index}].name`, item.name]),
      ...(gameValue.inputs || []).map((item, index) => [`session2.game.inputs[${index}].label`, item.label])
    ];
    const placeholder = /^(?:option\s*[a-z]|tbd|_+|placeholder)?$/i;
    for (const [path, value] of labels) if (placeholder.test(String(value || "").trim())) issues.push(blocker("B6", "content", path, "빈 라벨 또는 placeholder 라벨입니다."));

    const allowedBlocks = new Set(["Pop Quiz", "Icebreaker", "Spark Words Bingo", gameValue.name, "Discussion", "Useful Expressions"]);
    for (const [index, cut] of (topic.leader?.timeCut || []).entries()) if (!allowedBlocks.has(cut.block)) issues.push(blocker("B7", "content", `leader.timeCut[${index}].block`, "현재 토픽에 없는 액티비티 이름입니다."));
    const notesText = [...(topic.leader?.s1_notes || []), ...(topic.leader?.s2_notes || [])].join(" ");
    for (const foreign of ["Write the Fake", "Star Fight", "Reset Vote", "Final Decision"]) {
      if (foreign !== gameValue.name && notesText.includes(foreign)) issues.push(blocker("B7", "content", "leader.notes", `현재 토픽에 없는 액티비티 ${foreign}가 노출됩니다.`));
    }

    const subject = `${topic.title?.en || ""} ${s2.situation?.en || ""}`.toLowerCase();
    if (/\b(?:jacket|coat|shirt|clothes|shoe|bag)\b/.test(subject) && /\b(?:froze|restarted|crashed|rebooted)\b/.test(subject)) issues.push(blocker("B8", "content", "session2.situation", "제목·상황의 대상과 동작이 일치하지 않습니다."));

    const instructionText = [
      ...(gameValue.rules || []).flatMap((item) => [item.en, item.ko]),
      s1.bingo?.rule_ko,
      ...(topic.leader?.s1_notes || []),
      ...(topic.leader?.s2_notes || [])
    ].filter(Boolean).join(" ");
    if (/\b(?:USE A DIFFERENT REACT|EVIDENCE ROUND|GO FURTHER|FINAL DECISION)\b/i.test(instructionText)) issues.push(blocker("B9", "content", "instructions", "시트에 없는 섹션을 참조합니다."));

    const allText = strings(topic);
    if (allText.some((entry) => /\b(?:TRUE|FAKE)\s+sentence\s*:/i.test(entry.value))) issues.push(blocker("B10", "content", "session2.game", "추리 게임의 정답 라벨이 인쇄 데이터에 노출됩니다."));
    const physical = /\b(?:stand|move around|walk|switch seats|find a partner across the room)\b/i;
    for (const entry of allText) if (physical.test(entry.value)) issues.push(blocker("B11", "content", entry.path, "착석 환경에서 실행하기 어려운 물리 지시가 있습니다."));

    const followups = [...(s1.icebreakers || []), ...(s2.discussion || [])].map((item) => item.followup).filter(Boolean);
    if (duplicateValues(followups).length) issues.push(warning("W1", "content", "questions.followup", "후속 질문이 중복됩니다."));
    if ((s2.expressions || []).length !== 6) issues.push(warning("W2", "content", "session2.expressions", "Useful Expressions는 6개여야 합니다."));
    if (new Set((s2.expressions || []).map((item) => item.fn)).size < 6) issues.push(warning("W3", "content", "session2.expressions.fn", "표현 기능이 6가지보다 적습니다."));
    if (standardDeviation((s2.expressions || []).map((item) => words(item.en).length)) < 2) issues.push(warning("W4", "content", "session2.expressions.en", "표현 길이의 분산이 작습니다."));

    for (const entry of allText.filter((item) => /\.ko(?:\]|$)|why_ko|rule_ko/.test(item.path))) {
      if (/(?:습니다|합니다|하세요)/.test(entry.value) && /(?:해요|예요|돼요|이에요)/.test(entry.value)) issues.push(warning("W5", "content", entry.path, "같은 블록에서 한국어 종결어미가 혼용됩니다."));
    }
    for (const [index, item] of (s1.bingo?.words || []).entries()) {
      if (item.pos === "v." && !/(?:하다|되다|주다|받다|끄다|놓다|보내다)$/.test(item.ko)) issues.push(warning("W6", "content", `session1.bingo.words[${index}]`, "동사 품사와 한국어 번역이 일치하지 않습니다."));
      if (item.pos === "adj." && !/(?:한|운|있는|없는|스러운)$/.test(item.ko)) issues.push(warning("W6", "content", `session1.bingo.words[${index}]`, "형용사 품사와 한국어 번역이 일치하지 않습니다."));
      if (item.pos === "n." && /다$/.test(item.ko)) issues.push(warning("W6", "content", `session1.bingo.words[${index}]`, "명사 품사와 한국어 번역이 일치하지 않습니다."));
    }
    const posCounts = (s1.bingo?.words || []).reduce((counts, item) => ({ ...counts, [item.pos]: (counts[item.pos] || 0) + 1 }), {});
    if (!(posCounts["n."] >= 3 && posCounts["n."] <= 5 && posCounts["v."] >= 2 && posCounts["v."] <= 3 && posCounts["adj."] >= 1 && posCounts["adj."] <= 2 && (posCounts["phr."] || 0) <= 1)) issues.push(warning("W7", "content", "session1.bingo.words", "품사 배분 범위를 벗어났습니다."));
    if (s1.minutes !== 50 || s2.minutes !== 40 || (s1.icebreakers || []).reduce((sum, item) => sum + Number(item.minutes || 0), 0) !== 30 || gameValue.minutes + 15 + 5 !== 40) issues.push(warning("W8", "structure", "minutes", "Session 1 또는 Session 2 시간 합계가 맞지 않습니다."));

    const questions = [...(s1.icebreakers || []), ...(s2.discussion || [])];
    for (let left = 0; left < questions.length; left++) for (let right = left + 1; right < questions.length; right++) if (overlap(questions[left].en, questions[right].en) >= 0.7) issues.push(warning("W9", "content", `questions[${left}]+questions[${right}]`, "질문의 핵심 명사·동사가 70% 이상 겹칩니다."));
    const englishOnly = [
      ...(s1.icebreakers || []).flatMap((item) => [item.en, item.starter, item.followup, item.ladder?.basic, item.ladder?.plus, ...(item.options || [])]),
      ...(s2.discussion || []).flatMap((item) => [item.en, item.starter, item.followup])
    ].filter(Boolean);
    if (englishOnly.some(hasHangul)) issues.push(warning("W10", "content", "questions", "질문·starter·followup·ladder에 한국어가 노출됩니다."));
    if (allText.some((entry) => /(?:What would make me.+is|Whether .+ is .+ depends on|For me, the best approach is)/i.test(entry.value))) issues.push(warning("W11", "content", "copy", "AI 문체 패턴이 감지됩니다."));

    const month = topic.date?.slice(0, 7);
    const monthly = (allTopics || []).filter((entry) => entry?.date?.startsWith(month));
    if (monthly.length >= 3) {
      const openings = monthly.flatMap((entry) => [...(entry.session1?.icebreakers || []), ...(entry.session2?.discussion || [])].map((item) => words(item.en).slice(0, 3).join(" "))).filter(Boolean);
      if ([...new Set(openings)].some((opening) => openings.filter((item) => item === opening).length >= 3)) issues.push(warning("W12", "content", "month.questions", "같은 달 안에서 동일 문두가 3회 이상 반복됩니다."));
    }

    if (plan) issues.push(...validatePlan(plan).issues);
    return result(issues);
  }

  function result(rawIssues) {
    const issues = dedupe(rawIssues), blockers = issues.filter((item) => item.severity === "blocker"), warnings = issues.filter((item) => item.severity === "warning");
    return { ok: blockers.length === 0, issues, blockers, warnings };
  }

  function buildTopic(request, plan, content) {
    const planResult = validatePlan(plan), contentResult = validateContent(content, plan);
    const extra = content?.date !== request.date ? [blocker("B1", "structure", "date", "요청 날짜와 생성 날짜가 일치하지 않습니다.")] : [];
    if (!planResult.ok || !contentResult.ok || extra.length) {
      const error = new Error("Validated Topic Plan and Content Fill are required.");
      error.issues = dedupe([...planResult.issues, ...contentResult.issues, ...extra]);
      throw error;
    }
    const createdAt = new Date().toISOString();
    return {
      ...clone(content),
      id: `talkflow-${request.date}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
      generationEngine: VERSION,
      generatedConversation: true,
      standardVersion: STANDARD_VERSION,
      templateVersion: TEMPLATE_VERSION,
      topicPlan: clone(plan),
      quality: { status: "review", score: 0, issues: [] },
      operatorStatus: { generationStatus: "complete", reviewStatus: "review", printStatus: "unchecked", used: false },
      hidden: false,
      createdAt,
      updatedAt: createdAt
    };
  }

  function contentFromTopic(topic) {
    return Object.fromEntries(["date", "weekday", "category", "title", "session1", "session2", "leader"].map((key) => [key, clone(topic[key])]));
  }
  function evaluate(topic, allTopics = []) {
    if (!topic || topic.generationEngine !== VERSION) {
      const issues = [blocker("B1", "structure", "generationEngine", "구형 또는 지원하지 않는 자동 생성 구조입니다.")];
      return { ready: false, ok: false, blockers: issues, warnings: [], issues, statuses: { structure: "fail", content: "ready", speaking: "ready" } };
    }
    const evaluation = validateContent(contentFromTopic(topic), topic.topicPlan, Array.isArray(allTopics) ? allTopics : Object.values(allTopics || {}));
    const statuses = {
      structure: evaluation.blockers.some((item) => item.group === "structure") ? "fail" : "ready",
      content: evaluation.blockers.some((item) => item.group === "content") ? "fail" : "ready",
      speaking: evaluation.blockers.some((item) => item.group === "speaking") ? "fail" : "ready"
    };
    return { ...evaluation, ready: evaluation.ok, statuses };
  }
  function isLegacyOrInvalidDraft(topic) {
    if (!topic) return false;
    if (topic.operatorStatus?.generationStatus === "failed") return true;
    if (topic.generatedConversation && topic.generationEngine !== VERSION) return true;
    return topic.generationEngine === VERSION && !evaluate(topic).ready;
  }

  root.TalkFlowGeneration = Object.freeze({
    VERSION, STANDARD_VERSION, TEMPLATE_VERSION, AXES, MECHANISMS, EXPRESSION_FUNCTIONS, SKELETON,
    PLAN_TOOL, CONTENT_TOOL, GENERATED_TOPIC_SCHEMA, validatePlan, validateContent, buildTopic, evaluate,
    isLegacyOrInvalidDraft, contentFromTopic
  });
})(typeof window === "undefined" ? globalThis : window);
