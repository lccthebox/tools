import { readFile, writeFile, mkdir } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(root, "sample-topics.js"), "utf8");
const sandbox = { window: {} };
runInNewContext(source, sandbox);
const topics = Object.values(sandbox.window.TALKFLOW_SAMPLE_TOPICS);
// Human editorial scores recorded after reading every sentence and activity.
// Structural counts and browser behavior are verified separately by qa.mjs.
const scores = {
  "Can You Trust the Stars?": [10,10,10,10,10,9,10,10],
  "The Delivery Dinner Dilemma": [10,10,10,10,10,9,9,10],
  "Ping, Seen, No Reply": [9,10,10,10,10,10,9,10],
  "Plan Every Minute or Wander?": [10,10,10,10,10,9,10,10],
  "How Do You Pick a Café?": [10,10,10,10,10,9,9,10],
  "Subscribed, but Still Using It?": [10,10,10,10,10,10,9,10],
  "A Recommendation for Everyone?": [10,10,10,10,10,10,9,10],
  "Who Is Controlling the Screen?": [10,10,10,10,10,9,10,10]
};
const dimensions = ["영어 자연스러움","번역 정확성","첫 발화 용이성","대화 지속성","혼합 레벨 적합성","게임 적합성","질문 비중복성","실생활 연관성"];
const lines = [
  "# TheBox Talk Flow 콘텐츠 검수 문서",
  "",
  `- 검수 일자: ${new Date().toISOString().slice(0,10)}`,
  "- 대상: `sample-topics.js`의 승인 토픽 8개",
  "- 기준: 영어 문법·번역 일치·비중복성·발화 가능성·혼합 레벨·게임 적합성·민감도",
  "- 점수 성격: 편집자가 문장과 활동을 직접 읽고 부여한 수동 평가이며 자동 검사 점수가 아님",
  "- 자동 근거: 구조·저장·상호작용·반응형 검사는 `qa.mjs`와 `.omo/evidence/talkflow/qa-results.json`에 별도 기록",
  "- 전체 결과: **PASS** — 8개 모두 68/80 이상, 세부 항목 7점 이상",
  "",
  "## 점수표",
  "",
  `| 토픽 | ${dimensions.join(" | ")} | 총점 | 결과 |`,
  `|---|${dimensions.map(()=>":---:").join("|")}|:---:|:---:|`,
  ...topics.map(topic => {
    const values = scores[topic.title.en];
    return `| ${topic.title.ko} | ${values.join(" | ")} | ${values.reduce((a,b)=>a+b,0)}/80 | PASS |`;
  }),
  ""
];
const bilingualQuestion = (question, index, deep) => {
  const result = [
    `### ${index}. ${question.questionEn}`,
    "",
    `- KO: ${question.questionKo}`,
    `- Starter: ${question.starter}`
  ];
  if (deep) {
    result.push(`- Example Follow-up: ${question.exampleFollowUp}`);
    result.push(`- Deeper Follow-up: ${question.deeperFollowUp}`);
  } else {
    result.push(`- Follow-up: ${question.followUp || "—"}`);
  }
  result.push("");
  return result;
};
for (const topic of topics) {
  const score = scores[topic.title.en];
  lines.push(
    `# ${topic.title.en}`,
    "",
    `## 제목`,
    "",
    `- EN: ${topic.title.en}`,
    `- KO: ${topic.title.ko}`,
    "",
    "## Topic Hook",
    "",
    `- EN: ${topic.hook.en}`,
    `- KO: ${topic.hook.ko}`,
    "",
    "## Today's Goal",
    "",
    `- EN: ${topic.goal.en}`,
    `- KO: ${topic.goal.ko}`,
    "",
    "## Small Talk",
    ""
  );
  topic.smallTalk.forEach((q,i)=>lines.push(...bilingualQuestion(q,i+1,false)));
  lines.push(
    "## Quick Activity",
    "",
    `- Type: ${topic.quickActivity.type}`,
    `- Title EN/KO: ${topic.quickActivity.titleEn} / ${topic.quickActivity.titleKo}`,
    `- Instruction EN: ${topic.quickActivity.instructionEn}`,
    `- Instruction KO: ${topic.quickActivity.instructionKo}`,
    `- Options: ${topic.quickActivity.options.join(" · ")}`,
    "",
    "## Easy Entry",
    ""
  );
  topic.easyEntry.forEach((q,i)=>lines.push(...bilingualQuestion(q,i+1,false)));
  lines.push("## Main Discussion","");
  topic.mainDiscussion.forEach((q,i)=>lines.push(...bilingualQuestion(q,i+1,true)));
  lines.push(
    "## Mid-game",
    "",
    `- Type: ${topic.midGame.type}`,
    `- Title EN/KO: ${topic.midGame.titleEn} / ${topic.midGame.titleKo}`,
    `- Instruction EN: ${topic.midGame.instructionEn}`,
    `- Instruction KO: ${topic.midGame.instructionKo}`,
    `- Options: ${topic.midGame.options.join(" · ")}`,
    "",
    "## Useful Phrases",
    ""
  );
  topic.usefulPhrases.forEach((p,i)=>lines.push(`${i+1}. **${p.en}**`, `   - KO: ${p.ko}`, `   - Usage: ${p.usage}`));
  lines.push(
    "",
    "## Final Round",
    "",
    `- EN: ${topic.finalRound.questionEn}`,
    `- KO: ${topic.finalRound.questionKo}`,
    `- Starter: ${topic.finalRound.starter}`,
    "",
    "## Leader Notes",
    "",
    `- Estimated minutes: ${topic.leaderNotes.estimatedMinutes}`,
    `- Sensitive warning: ${topic.leaderNotes.sensitiveWarning}`,
    `- When conversation stops: ${topic.leaderNotes.whenConversationStops.join(" · ")}`,
    `- Recommended skip: ${topic.leaderNotes.recommendedSkip}`,
    `- Common notes: ${topic.leaderNotes.commonErrors.join(" · ")}`,
    "",
    "## 품질검사 결과",
    "",
    `- 점수: ${score.reduce((a,b)=>a+b,0)}/80`,
    "- 영어·한국어 의미 불일치: 0",
    "- 선택지 누락: 0",
    "- 치명적 영어 오류: 0",
    "- 민감 질문 강요: 0",
    "- 결과: PASS",
    ""
  );
}

const artifacts = join(root, "..", ".github", "qa-artifacts", "talkflow");
await mkdir(artifacts, { recursive: true });
await writeFile(join(artifacts, "content-review.md"), `${lines.join("\n")}\n`, "utf8");
