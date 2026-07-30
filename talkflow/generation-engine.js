(function (root) {
  "use strict";

  const VERSION = "v2-fail-closed";
  const STANDARD_VERSION = "2";
  const TEMPLATE_VERSION = "4";
  const AXES = [
    "habit",
    "recentExperience",
    "evaluation",
    "comparison",
    "problemSolving",
    "decision",
    "prediction",
    "systemOpinion"
  ];
  const MECHANISMS = [
    "informationGap",
    "personalArtifact",
    "timedTurn",
    "assignedOpposition",
    "openEndedDecision"
  ];
  const PLACEHOLDER = /^(?:option\s*[a-d]|ask and react\.?|use this evidence\.?|add details\.?|tbd|example|placeholder)$/i;
  const SKELETON = Object.freeze({
    sessionOne: Object.freeze([
      { id: "quickStart", labelEn: "Quick Start", labelKo: "빠른 시작", minutes: 10 },
      { id: "personalExperience", labelEn: "Personal / Experience Round", labelKo: "개인 경험 라운드", minutes: 15 },
      { id: "evidenceDecision", labelEn: "Evidence / Decision Round", labelKo: "근거와 판단 라운드", minutes: 20 },
      { id: "shortWrapUp", labelEn: "Short Wrap-up", labelKo: "짧은 마무리", minutes: 5 }
    ]),
    sessionTwo: Object.freeze([
      { id: "reset", labelEn: "Reset", labelKo: "리셋", minutes: 5 },
      { id: "mainActivity", labelEn: "Main Activity", labelKo: "본 활동", minutes: 20 },
      { id: "roleChallenge", labelEn: "Role / Challenge", labelKo: "역할과 도전", minutes: 10 },
      { id: "finalDecision", labelEn: "Final Decision", labelKo: "최종 결정", minutes: 5 }
    ])
  });

  const textSchema = { type: "string", minLength: 1 };
  const bilingualSchema = {
    type: "object",
    additionalProperties: false,
    required: ["en", "ko"],
    properties: { en: textSchema, ko: textSchema }
  };
  const speakingHelpSchema = {
    type: "array",
    minItems: 2,
    maxItems: 3,
    items: bilingualSchema
  };
  const questionSchema = {
    type: "object",
    additionalProperties: false,
    required: ["axis", "questionEn", "questionKo", "speakingHelp"],
    properties: {
      axis: { type: "string", enum: AXES },
      questionEn: textSchema,
      questionKo: textSchema,
      speakingHelp: speakingHelpSchema
    }
  };
  const planSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "centralTopic",
      "questionAxes",
      "materialType",
      "sessionTwoActivity",
      "speakingMechanisms",
      "finalGroupResult"
    ],
    properties: {
      centralTopic: bilingualSchema,
      questionAxes: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        uniqueItems: true,
        items: { type: "string", enum: AXES }
      },
      materialType: {
        type: "string",
        enum: ["reviews", "messages", "priceConditions", "scenarioCards", "roleInformation", "schedule", "statistics", "cases"]
      },
      sessionTwoActivity: {
        type: "string",
        enum: ["informationGap", "blindRanking", "assignedRoleDebate", "openDecisionChallenge", "writeTheFake"]
      },
      speakingMechanisms: {
        type: "array",
        minItems: 3,
        uniqueItems: true,
        items: { type: "string", enum: MECHANISMS }
      },
      finalGroupResult: bilingualSchema
    }
  };
  const contentSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "quickStart",
      "personalExperience",
      "evidenceDecision",
      "shortWrapUp",
      "conversationMaterials",
      "reset",
      "mainActivity",
      "roleChallenge",
      "finalDecision",
      "speakingFrames",
      "leaderGuide",
      "bilingualInstructions"
    ],
    properties: {
      title: bilingualSchema,
      quickStart: questionSchema,
      personalExperience: {
        ...questionSchema,
        required: [...questionSchema.required, "alternativeEn", "alternativeKo"],
        properties: {
          ...questionSchema.properties,
          alternativeEn: textSchema,
          alternativeKo: textSchema
        }
      },
      evidenceDecision: questionSchema,
      shortWrapUp: questionSchema,
      conversationMaterials: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "title", "items", "decisionPrompt"],
          properties: {
            type: textSchema,
            title: bilingualSchema,
            items: { type: "array", minItems: 3, items: bilingualSchema },
            decisionPrompt: bilingualSchema
          }
        }
      },
      reset: {
        type: "object",
        additionalProperties: false,
        required: ["titleEn", "titleKo", "instructionEn", "instructionKo"],
        properties: {
          titleEn: textSchema,
          titleKo: textSchema,
          instructionEn: textSchema,
          instructionKo: textSchema
        }
      },
      mainActivity: {
        type: "object",
        additionalProperties: false,
        required: ["titleEn", "titleKo", "goalEn", "goalKo", "steps", "participantOutput"],
        properties: {
          titleEn: textSchema,
          titleKo: textSchema,
          goalEn: textSchema,
          goalKo: textSchema,
          steps: { type: "array", minItems: 3, items: bilingualSchema },
          participantOutput: bilingualSchema
        }
      },
      roleChallenge: {
        type: "object",
        additionalProperties: false,
        required: ["titleEn", "titleKo", "ruleEn", "ruleKo", "roles"],
        properties: {
          titleEn: textSchema,
          titleKo: textSchema,
          ruleEn: textSchema,
          ruleKo: textSchema,
          roles: {
            type: "array",
            minItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["nameEn", "nameKo", "briefEn", "briefKo"],
              properties: {
                nameEn: textSchema,
                nameKo: textSchema,
                briefEn: textSchema,
                briefKo: textSchema
              }
            }
          }
        }
      },
      finalDecision: {
        type: "object",
        additionalProperties: false,
        required: [
          "promptEn",
          "promptKo",
          "everyoneSpeaksRuleEn",
          "everyoneSpeaksRuleKo",
          "resultLabelEn",
          "resultLabelKo"
        ],
        properties: {
          promptEn: textSchema,
          promptKo: textSchema,
          everyoneSpeaksRuleEn: textSchema,
          everyoneSpeaksRuleKo: textSchema,
          resultLabelEn: textSchema,
          resultLabelKo: textSchema
        }
      },
      speakingFrames: {
        type: "array",
        minItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["purpose", "en", "ko"],
          properties: { purpose: textSchema, en: textSchema, ko: textSchema }
        }
      },
      leaderGuide: {
        type: "object",
        additionalProperties: false,
        required: ["timingEn", "timingKo", "supportEn", "supportKo"],
        properties: {
          timingEn: textSchema,
          timingKo: textSchema,
          supportEn: textSchema,
          supportKo: textSchema
        }
      },
      bilingualInstructions: {
        type: "object",
        additionalProperties: false,
        required: [
          "orderEn",
          "orderKo",
          "rolesEn",
          "rolesKo",
          "timeEn",
          "timeKo",
          "finalResultEn",
          "finalResultKo",
          "alternativeParticipationEn",
          "alternativeParticipationKo"
        ],
        properties: Object.fromEntries([
          "orderEn",
          "orderKo",
          "rolesEn",
          "rolesKo",
          "timeEn",
          "timeKo",
          "finalResultEn",
          "finalResultKo",
          "alternativeParticipationEn",
          "alternativeParticipationKo"
        ].map((key) => [key, textSchema]))
      }
    }
  };

  const GENERATED_TOPIC_SCHEMA = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://thebox.example/talkflow/generated-topic-v2.schema.json",
    title: "TheBox Talk Flow Generated Topic v2",
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "sessionOne",
      "sessionTwo",
      "conversationMaterials",
      "speakingFrames",
      "leaderGuide",
      "bilingualInstructions"
    ],
    properties: {
      id: textSchema,
      date: textSchema,
      category: textSchema,
      title: bilingualSchema,
      generationEngine: { const: VERSION },
      generatedConversation: { const: true },
      standardVersion: { const: STANDARD_VERSION },
      templateVersion: { const: TEMPLATE_VERSION },
      generationRequest: { type: "object" },
      topicPlan: planSchema,
      promptAxes: { type: "array", minItems: 3, items: { type: "string", enum: AXES } },
      speakingMechanisms: { type: "object" },
      sessionOne: {
        type: "object",
        required: ["minutes", "sections"],
        properties: {
          minutes: { const: 50 },
          sections: { type: "array", minItems: 4, maxItems: 4 }
        }
      },
      sessionTwo: {
        type: "object",
        required: ["minutes", "sections"],
        properties: {
          minutes: { const: 40 },
          sections: { type: "array", minItems: 4, maxItems: 4 }
        }
      },
      conversationMaterials: contentSchema.properties.conversationMaterials,
      speakingFrames: contentSchema.properties.speakingFrames,
      leaderGuide: contentSchema.properties.leaderGuide,
      bilingualInstructions: contentSchema.properties.bilingualInstructions,
      quality: { type: "object" },
      operatorStatus: { type: "object" },
      hidden: { type: "boolean" },
      createdAt: textSchema,
      updatedAt: textSchema
    }
  };

  const PLAN_TOOL = Object.freeze({
    name: "submit_topic_plan",
    description: "Submit only the constrained Talk Flow topic plan.",
    input_schema: planSchema
  });
  const CONTENT_TOOL = Object.freeze({
    name: "submit_content_fill",
    description: "Fill only the approved fixed Talk Flow content fields.",
    input_schema: contentSchema
  });

  const issue = (group, location, message) => ({ group, location, message });
  const hasText = (value) => typeof value === "string" && value.trim().length > 0;
  const hasHangul = (value) => /[가-힣]/.test(String(value || ""));
  const hasLatin = (value) => /[A-Za-z]/.test(String(value || ""));
  const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  const isPlaceholder = (value) => hasText(value) && PLACEHOLDER.test(value.trim());
  const QUESTION_STOP_WORDS = new Set(["a", "an", "the", "do", "does", "did", "is", "are", "was", "were", "what", "which", "when", "where", "who", "why", "how", "you", "your", "for", "to", "of", "now"]);
  const meaningTokens = (value) => new Set(String(value || "").toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => !QUESTION_STOP_WORDS.has(word)) || []);
  function repeatsMeaning(left, right) {
    const a = meaningTokens(left), b = meaningTokens(right);
    if (a.size < 2 || b.size < 2) return false;
    const overlap = [...a].filter((token) => b.has(token)).length;
    return overlap / Math.min(a.size, b.size) >= 0.75;
  }

  function validateSchema(value, schema, path, issues) {
    if (schema.type === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        issues.push(issue("structure", path, "JSON Schema 객체 형식이 필요합니다."));
        return;
      }
      (schema.required || []).forEach((key) => {
        if (!(key in value)) issues.push(issue("structure", `${path}.${key}`, "JSON Schema 필수 필드가 없습니다."));
      });
      if (schema.additionalProperties === false) {
        Object.keys(value).filter((key) => !(key in (schema.properties || {}))).forEach((key) => {
          issues.push(issue("structure", `${path}.${key}`, "JSON Schema에 없는 필드는 사용할 수 없습니다."));
        });
      }
      Object.entries(schema.properties || {}).forEach(([key, child]) => {
        if (key in value) validateSchema(value[key], child, `${path}.${key}`, issues);
      });
      return;
    }
    if (schema.type === "array") {
      if (!Array.isArray(value)) {
        issues.push(issue("structure", path, "JSON Schema 배열 형식이 필요합니다."));
        return;
      }
      if (schema.minItems && value.length < schema.minItems) issues.push(issue("structure", path, `JSON Schema 최소 ${schema.minItems}개 항목이 필요합니다.`));
      if (schema.maxItems && value.length > schema.maxItems) issues.push(issue("structure", path, `JSON Schema 최대 ${schema.maxItems}개 항목만 허용합니다.`));
      if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) issues.push(issue("structure", path, "JSON Schema 중복 배열 항목은 허용되지 않습니다."));
      value.forEach((entry, index) => validateSchema(entry, schema.items || {}, `${path}[${index}]`, issues));
      return;
    }
    if (schema.type === "string") {
      if (typeof value !== "string") issues.push(issue("structure", path, "JSON Schema 문자열 형식이 필요합니다."));
      else if (schema.minLength && value.length < schema.minLength) issues.push(issue("content", path, "필수 내용이 비어 있습니다."));
    }
    if (schema.enum && !schema.enum.includes(value)) issues.push(issue("structure", path, "JSON Schema 허용값이 아닙니다."));
  }

  function findInvalidText(value, path = "content", results = []) {
    if (typeof value === "string") {
      if (!value.trim()) results.push(issue("content", path, "필수 내용이 비어 있습니다."));
      else if (isPlaceholder(value)) results.push(issue("content", path, `금지된 placeholder "${value}"가 있습니다.`));
      return results;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => findInvalidText(entry, `${path}[${index}]`, results));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, entry]) => findInvalidText(entry, `${path}.${key}`, results));
    }
    return results;
  }

  function requiredObject(object, keys, path, group, issues) {
    if (!object || typeof object !== "object" || Array.isArray(object)) {
      issues.push(issue(group, path, "필수 객체가 없습니다."));
      return false;
    }
    keys.forEach((key) => {
      if (!(key in object)) issues.push(issue(group, `${path}.${key}`, "필수 필드가 없습니다."));
    });
    return true;
  }

  function validatePlan(plan) {
    const issues = [];
    validateSchema(plan, planSchema, "plan", issues);
    if (!requiredObject(plan, planSchema.required, "plan", "structure", issues)) return { ok: false, issues };
    if (!hasText(plan.centralTopic?.en) || !hasLatin(plan.centralTopic?.en) || hasHangul(plan.centralTopic?.en)) {
      issues.push(issue("content", "plan.centralTopic.en", "영문 중심 주제가 필요합니다."));
    }
    if (!hasText(plan.centralTopic?.ko) || !hasHangul(plan.centralTopic?.ko)) {
      issues.push(issue("content", "plan.centralTopic.ko", "한국어 중심 주제가 필요합니다."));
    }
    const axes = Array.isArray(plan.questionAxes) ? plan.questionAxes : [];
    const counts = axes.reduce((map, axis) => map.set(axis, (map.get(axis) || 0) + 1), new Map());
    if (new Set(axes).size < 3) issues.push(issue("structure", "plan.questionAxes", "서로 다른 질문 축이 최소 3개 필요합니다."));
    if ([...counts.values()].some((count) => count > 2)) issues.push(issue("structure", "plan.questionAxes", "같은 질문 축은 최대 2개만 사용할 수 있습니다."));
    if (axes.some((axis) => !AXES.includes(axis))) issues.push(issue("structure", "plan.questionAxes", "허용되지 않은 질문 축이 있습니다."));
    const mechanisms = Array.isArray(plan.speakingMechanisms) ? plan.speakingMechanisms : [];
    if (new Set(mechanisms).size < 3) issues.push(issue("speaking", "plan.speakingMechanisms", "발화 강제 장치가 최소 3개 필요합니다."));
    if (mechanisms.some((item) => !MECHANISMS.includes(item))) issues.push(issue("speaking", "plan.speakingMechanisms", "허용되지 않은 발화 장치가 있습니다."));
    if (!hasText(plan.sessionTwoActivity)) issues.push(issue("structure", "plan.sessionTwoActivity", "Session 2 활동이 필요합니다."));
    if (!hasText(plan.finalGroupResult?.en) || !hasText(plan.finalGroupResult?.ko)) {
      issues.push(issue("content", "plan.finalGroupResult", "영어·한국어 최종 그룹 결과가 필요합니다."));
    }
    return { ok: issues.length === 0, issues };
  }

  function validateQuestion(question, path, issues) {
    if (!requiredObject(question, questionSchema.required, path, "content", issues)) return;
    if (!AXES.includes(question.axis)) issues.push(issue("structure", `${path}.axis`, "허용된 질문 축이 필요합니다."));
    if (!hasText(question.questionEn) || !hasLatin(question.questionEn) || hasHangul(question.questionEn)) issues.push(issue("content", `${path}.questionEn`, "영어 질문이 필요합니다."));
    if (!hasText(question.questionKo) || !hasHangul(question.questionKo)) issues.push(issue("content", `${path}.questionKo`, "한국어 질문이 필요합니다."));
    if (!Array.isArray(question.speakingHelp) || question.speakingHelp.length < 2 || question.speakingHelp.length > 3) {
      issues.push(issue("speaking", `${path}.speakingHelp`, "말하기 도움은 2~3줄이어야 합니다."));
    }
  }

  function validateContent(content, plan) {
    const issues = [];
    validateSchema(content, contentSchema, "content", issues);
    if (!requiredObject(content, contentSchema.required, "content", "structure", issues)) return { ok: false, issues };
    issues.push(...findInvalidText(content));
    if (!hasText(content.title?.en) || !hasLatin(content.title?.en) || hasHangul(content.title?.en)) issues.push(issue("content", "title.en", "영문 제목은 영어로 작성해야 합니다."));
    if (!hasText(content.title?.ko) || !hasHangul(content.title?.ko)) issues.push(issue("content", "title.ko", "한국어 제목은 한국어로 작성해야 합니다."));
    if (normalize(content.title?.en) === normalize(content.title?.ko)) issues.push(issue("content", "title", "영문·한국어 제목이 중복되었습니다."));

    const questions = [
      ["quickStart", content.quickStart],
      ["personalExperience", content.personalExperience],
      ["evidenceDecision", content.evidenceDecision],
      ["shortWrapUp", content.shortWrapUp]
    ];
    questions.forEach(([path, value]) => validateQuestion(value, path, issues));
    if (!hasText(content.personalExperience?.alternativeEn) || !hasText(content.personalExperience?.alternativeKo)) {
      issues.push(issue("content", "personalExperience.alternative", "영어·한국어 대체 참여 방법이 필요합니다."));
    }
    const axisCounts = questions.reduce((map, [, value]) => map.set(value?.axis, (map.get(value?.axis) || 0) + 1), new Map());
    if (new Set(questions.map(([, value]) => value?.axis).filter(Boolean)).size < 3) issues.push(issue("structure", "questions.axis", "질문 축이 최소 3개 필요합니다."));
    if ([...axisCounts.values()].some((count) => count > 2)) issues.push(issue("structure", "questions.axis", "같은 질문 축은 최대 2개만 사용할 수 있습니다."));
    const normalizedQuestions = questions.map(([, value]) => normalize(value?.questionEn)).filter(Boolean);
    if (new Set(normalizedQuestions).size !== normalizedQuestions.length) issues.push(issue("content", "questions", "같은 질문 또는 표현만 바꾼 질문이 반복됩니다."));
    for (let left = 0; left < questions.length; left++) {
      for (let right = left + 1; right < questions.length; right++) {
        if (repeatsMeaning(questions[left][1]?.questionEn, questions[right][1]?.questionEn)) {
          issues.push(issue("content", `questions.${questions[left][0]}+${questions[right][0]}`, "포함관계이거나 표현만 바꾼 질문이 반복됩니다."));
        }
      }
    }
    const starters = questions.flatMap(([, value]) => value?.speakingHelp || []).map((frame) => normalize(frame.en)).filter(Boolean);
    if (new Set(starters).size !== starters.length) issues.push(issue("speaking", "speakingHelp", "같은 Starter 또는 말하기 도움이 반복됩니다."));

    if (!Array.isArray(content.conversationMaterials) || content.conversationMaterials.length < 1) {
      issues.push(issue("content", "conversationMaterials", "실제로 읽고 판단할 자료가 최소 1세트 필요합니다."));
    } else {
      content.conversationMaterials.forEach((material, materialIndex) => {
        const path = `conversationMaterials[${materialIndex}]`;
        if (!Array.isArray(material.items) || material.items.length < 3) issues.push(issue("content", `${path}.items`, "판단 자료는 완전한 항목 3개 이상이어야 합니다."));
        (material.items || []).forEach((item, itemIndex) => {
          if (!hasText(item.en) || !hasText(item.ko)) issues.push(issue("content", `${path}.items[${itemIndex}]`, "자료의 영어·한국어 내용이 비어 있습니다."));
        });
        if (!hasText(material.decisionPrompt?.en) || !hasText(material.decisionPrompt?.ko)) issues.push(issue("content", `${path}.decisionPrompt`, "자료를 사용하는 판단 질문이 필요합니다."));
      });
    }

    if (!Array.isArray(content.mainActivity?.steps) || content.mainActivity.steps.length < 3) {
      issues.push(issue("structure", "sessionTwo.mainActivity.steps", "Session 2 활동 순서가 3단계 이상 필요합니다."));
    }
    if (!hasText(content.mainActivity?.participantOutput?.en) || !hasText(content.mainActivity?.participantOutput?.ko)) {
      issues.push(issue("speaking", "sessionTwo.mainActivity.participantOutput", "Session 2 참가자 산출물이 필요합니다."));
    }
    if (!Array.isArray(content.roleChallenge?.roles) || content.roleChallenge.roles.length < 2) {
      issues.push(issue("speaking", "sessionTwo.roleChallenge.roles", "서로 다른 역할이 최소 2개 필요합니다."));
    }
    if (!hasText(content.finalDecision?.everyoneSpeaksRuleEn) || !hasText(content.finalDecision?.everyoneSpeaksRuleKo)) {
      issues.push(issue("speaking", "sessionTwo.finalDecision.everyoneSpeaksRule", "전원 발화 규칙이 영어·한국어로 필요합니다."));
    }
    if (!hasText(content.finalDecision?.resultLabelEn) || !hasText(content.finalDecision?.resultLabelKo)) {
      issues.push(issue("content", "sessionTwo.finalDecision.resultLabel", "최종 그룹 결과가 영어·한국어로 필요합니다."));
    }
    if (!Array.isArray(content.speakingFrames) || new Set((content.speakingFrames || []).map((frame) => frame.purpose)).size < 3) {
      issues.push(issue("speaking", "speakingFrames", "용도가 다른 말하기 장치가 최소 3개 필요합니다."));
    }
    const requiredKorean = [
      ["reset.instructionKo", content.reset?.instructionKo],
      ["mainActivity.goalKo", content.mainActivity?.goalKo],
      ["roleChallenge.ruleKo", content.roleChallenge?.ruleKo],
      ["finalDecision.promptKo", content.finalDecision?.promptKo],
      ["bilingualInstructions.orderKo", content.bilingualInstructions?.orderKo],
      ["bilingualInstructions.rolesKo", content.bilingualInstructions?.rolesKo],
      ["bilingualInstructions.timeKo", content.bilingualInstructions?.timeKo],
      ["bilingualInstructions.finalResultKo", content.bilingualInstructions?.finalResultKo],
      ["bilingualInstructions.alternativeParticipationKo", content.bilingualInstructions?.alternativeParticipationKo]
    ];
    requiredKorean.forEach(([path, value]) => {
      if (!hasText(value) || !hasHangul(value)) issues.push(issue("content", path, "필수 한국어 활동 안내가 필요합니다."));
    });
    const planResult = validatePlan(plan);
    issues.push(...planResult.issues);
    return { ok: issues.length === 0, issues: dedupe(issues) };
  }

  function dedupe(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item.group}|${item.location}|${item.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const clone = (value) => JSON.parse(JSON.stringify(value));
  function section(meta, content) {
    return { ...meta, content: clone(content) };
  }

  function buildTopic(request, plan, content) {
    const planResult = validatePlan(plan);
    const contentResult = validateContent(content, plan);
    if (!planResult.ok || !contentResult.ok) {
      const error = new Error("Validated Topic Plan and Content Fill are required.");
      error.issues = dedupe([...planResult.issues, ...contentResult.issues]);
      throw error;
    }
    const createdAt = new Date().toISOString();
    return {
      id: `talkflow-${request.date}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
      date: request.date,
      category: request.mood || "경험 중심",
      title: clone(content.title),
      generationEngine: VERSION,
      generatedConversation: true,
      standardVersion: STANDARD_VERSION,
      templateVersion: TEMPLATE_VERSION,
      topicPlan: clone(plan),
      promptAxes: [...new Set([
        content.quickStart.axis,
        content.personalExperience.axis,
        content.evidenceDecision.axis,
        content.shortWrapUp.axis
      ])],
      speakingMechanisms: Object.fromEntries(MECHANISMS.map((name) => [name, plan.speakingMechanisms.includes(name)])),
      sessionOne: {
        minutes: 50,
        sections: [
          section(SKELETON.sessionOne[0], content.quickStart),
          section(SKELETON.sessionOne[1], content.personalExperience),
          section(SKELETON.sessionOne[2], content.evidenceDecision),
          section(SKELETON.sessionOne[3], content.shortWrapUp)
        ]
      },
      sessionTwo: {
        minutes: 40,
        sections: [
          section(SKELETON.sessionTwo[0], content.reset),
          section(SKELETON.sessionTwo[1], content.mainActivity),
          section(SKELETON.sessionTwo[2], content.roleChallenge),
          section(SKELETON.sessionTwo[3], content.finalDecision)
        ]
      },
      conversationMaterials: clone(content.conversationMaterials),
      speakingFrames: clone(content.speakingFrames),
      leaderGuide: clone(content.leaderGuide),
      bilingualInstructions: clone(content.bilingualInstructions),
      quality: { status: "review", score: 0, issues: [] },
      operatorStatus: {
        generationStatus: "complete",
        reviewStatus: "review",
        printStatus: "unchecked",
        used: false
      },
      hidden: false,
      createdAt,
      updatedAt: createdAt
    };
  }

  function contentFromTopic(topic) {
    const one = Object.fromEntries((topic.sessionOne?.sections || []).map((item) => [item.id, item.content]));
    const two = Object.fromEntries((topic.sessionTwo?.sections || []).map((item) => [item.id, item.content]));
    return {
      title: topic.title,
      quickStart: one.quickStart,
      personalExperience: one.personalExperience,
      evidenceDecision: one.evidenceDecision,
      shortWrapUp: one.shortWrapUp,
      conversationMaterials: topic.conversationMaterials,
      reset: two.reset,
      mainActivity: two.mainActivity,
      roleChallenge: two.roleChallenge,
      finalDecision: two.finalDecision,
      speakingFrames: topic.speakingFrames,
      leaderGuide: topic.leaderGuide,
      bilingualInstructions: topic.bilingualInstructions
    };
  }

  function evaluate(topic) {
    const issues = [];
    if (!topic || topic.generationEngine !== VERSION) {
      issues.push(issue("structure", "generationEngine", "구형 v1 fallback 또는 지원하지 않는 생성 구조입니다."));
    } else {
      const oneIds = (topic.sessionOne?.sections || []).map((item) => item.id);
      const twoIds = (topic.sessionTwo?.sections || []).map((item) => item.id);
      if (JSON.stringify(oneIds) !== JSON.stringify(SKELETON.sessionOne.map((item) => item.id)) || topic.sessionOne?.minutes !== 50) {
        issues.push(issue("structure", "sessionOne", "Session 1 고정 Skeleton과 50분 구성이 일치하지 않습니다."));
      }
      if (JSON.stringify(twoIds) !== JSON.stringify(SKELETON.sessionTwo.map((item) => item.id)) || topic.sessionTwo?.minutes !== 40) {
        issues.push(issue("structure", "sessionTwo", "Session 2 고정 Skeleton과 40분 구성이 일치하지 않습니다."));
      }
      const result = validateContent(contentFromTopic(topic), topic.topicPlan);
      issues.push(...result.issues);
    }
    const unique = dedupe(issues);
    const statuses = {
      structure: unique.some((entry) => entry.group === "structure") ? "fail" : "ready",
      content: unique.some((entry) => entry.group === "content") ? "fail" : "ready",
      speaking: unique.some((entry) => entry.group === "speaking") ? "fail" : "ready"
    };
    return {
      ready: Object.values(statuses).every((status) => status === "ready"),
      statuses,
      issues: unique
    };
  }

  function isLegacyOrInvalidDraft(topic) {
    if (!topic) return false;
    if (topic.operatorStatus?.generationStatus === "failed") return true;
    if (topic.generatedConversation && topic.generationEngine !== VERSION) return true;
    return topic.generationEngine === VERSION && !evaluate(topic).ready;
  }

  root.TalkFlowGeneration = Object.freeze({
    VERSION,
    STANDARD_VERSION,
    TEMPLATE_VERSION,
    AXES,
    MECHANISMS,
    SKELETON,
    PLAN_TOOL,
    CONTENT_TOOL,
    GENERATED_TOPIC_SCHEMA,
    validatePlan,
    validateContent,
    buildTopic,
    evaluate,
    isLegacyOrInvalidDraft,
    contentFromTopic
  });
})(typeof window === "undefined" ? globalThis : window);
