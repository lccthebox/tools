# TheBox Talk Flow Design Contract

## Active direction: Simple Conversation v3

New topics use the `simple-v1` two-page editorial system. Existing saved topics and `/topics/` retain their previous renderer and are never converted automatically.

- White A4, charcoal copy, deep-green accents, generous whitespace, and thin rules.
- Page 1: serif title, one story/situation, EASY TALK ×3, REAL TALK ×3, TODAY'S ENGLISH ×4, and one actionable QUICK VOTE.
- Page 2: one activity with real materials, a 2×2 four-step decision path, GROUP RESULT, one THINK HARDER question, and FINAL QUESTION.
- Leader copies retain the hierarchy and add short near-section notes plus bottom emergency phrases.
- No full-width dark bands, nested card decoration, or visible generation labels.
- Korean uses `word-break: keep-all`. Material numbers use circular high-contrast badges that remain distinct in grayscale.
- Print floors: title 20pt; question 11pt; Korean guidance, activity, and materials 9pt; helper 8pt; leader note 8.5pt.

The previous bound-field direction below is retained only for compatibility with existing topics.

## Active workspace direction: preparation first

- The global navigation contains exactly three destinations: `토픽 준비`, `일괄 인쇄`, and `설정`. Topic review, student preview, and leader preview are contextual tabs inside a selected date, not global destinations.
- `토픽 준비` opens on `해야 할 일`: at most eight priority items followed by the current week's operating dates. `전체 월` and `달력` are explicit secondary views.
- `해야 할 일` orders generation failures, review needs, approval-ready topics, near-term missing topics, then other missing topics. Approved work is contextual and visually muted.
- `전체 월` is a compact week-grouped list of operating dates with one action per row and filters for all, attention, missing, approved, and legacy states.
- The compact calendar is a secondary status view and never contains nested work buttons or boxed status badges.
- Each date row shows one lifecycle label and one primary action. Selecting the row opens a 460px right-side date drawer; at phone widths the drawer becomes a full-screen sheet.
- The drawer preserves focus, closes with its close button, Escape, or backdrop, and restores focus to the selected row. Its contextual tabs are `내용 검수`, `학생용`, and `리더용`.
- Lifecycle copy is limited to `미작성`, `생성 중`, `검수 필요`, `승인 가능`, `승인 완료`, `생성 실패`, and `이전 형식`. Internal storage and schema states are not exposed.
- Simple Conversation student and leader previews share a quiet toolbar with page 1/page 2, zoom, and print controls. Existing approved legacy topics retain their operational student/leader screens, while the dedicated print route remains the source of the intact A4 composition.
- `일괄 인쇄` is a dedicated workspace with approved-date selection, student/leader role choice, exact page count, preview, and print.
- `설정` uses a two-pane dialog: connection, operating schedule, and data sections on the left; one focused section on the right. Secret values never appear in the DOM.
- Responsive checkpoints are 375, 768, 1280, and 1600px. The document or chronological list is the only page scroll owner; drawers and A4 preview surfaces own their local overflow.
- UI state is represented by query parameters on the current pathname: `section`, `view`, `month`, `date`, `tab`, `page`, and `panel`. Meaningful navigation pushes one history entry; normalization and filters replace the current entry.
- `popstate` only restores UI state. It never saves, validates, generates, approves, deletes, or calls an external API. Scroll positions live in `history.state` and are restored after rendering.
- Browser Back closes a date detail before leaving its originating list, then traverses topic views in reverse order. Direct-linked details close by replacing to their month view; no history sentinel traps the user.

## 1. Product and users

Talk Flow is an operational tool for a non-technical study coordinator, a discussion leader, and mixed-confidence adult English learners. The primary job is to move from date selection to a printable conversation guide without exposing storage or API mechanics.

## 2. Existing visual language

- Warm paper canvas, white work surfaces, deep evergreen ink, mint and restrained yellow accents.
- DM Sans leads English hierarchy; Noto Sans KR supports concise Korean guidance.
- Screen surfaces may use modest radii and shadows. Bound-field print surfaces use a charcoal header and footer, neutral rules, no decorative shadows, and restrained evergreen activity accents.
- The printable flow is the fixed eight-section reference contract: WHY THIS TOPIC, POP QUIZ, ICEBREAKER QUESTIONS, SPARK WORDS BINGO, GAME + HOW TO PLAY, SITUATION, DISCUSSION, and USEFUL EXPRESSIONS.

## 3. Tokens

- Color: `--ink`, `--muted`, `--paper`, `--surface`, `--line`, `--green`, `--green-2`, `--yellow`, `--yellow-2`, `--red`, `--red-2`, `--blue`.
- Bound-field print aliases: charcoal ink/header `#111614`, secondary ink `#5c6560`, evergreen accent `#1f5c40`, soft evergreen `#eef4f0`, warning ochre `#8a6a12`, warm warning surface `#fbf5e6`, and neutral rule `#dce0dd`.
- Spacing follows 4px increments; dense print spacing may use millimetres.
- Screen type: 11–50px existing scale. Print minimums: title 18pt, core question 11pt, action line 9.5pt, Korean support 8.5pt.
- Radius: 7, 9, 12, 15, 18, and 24px existing component scale.

## 4. Layout

- App shell keeps the top bar and document flow. The calendar view owns document scroll; the A4 review frame owns only its internal page preview scroll.
- Desktop calendar uses a seven-column month grid with weekday headers. At 800px and below it becomes a single-column chronological operating-date list.
- The default operator path is calendar → date action → draft generation → two-page review → approval → PDF. Technical controls remain outside that path.
- Student and leader print remain exactly two portrait A4 pages. The page body uses 10mm top, 13mm side, and 5mm bottom padding between shared header and footer bars.
- Mobile preview scales the paper as one intact A4 composition; the internal print layout never reflows to phone dimensions.
- Page one is Session 1: topic rationale, three-item natural-English quiz, three bound icebreakers, and 3×3 spark-word bingo. Page two is Session 2: one immutable game, one shared situation, three discussion prompts, and six useful expressions.

## 5. Reusable primitives and states

- `button`: primary, secondary, danger, disabled, focus-visible.
- `workflow-step`: pending, current, complete.
- `operator-panel`: date/topic input, generation progress, review result, final actions.
- `month-calendar`: weekday header, operating day, non-operating day, empty, review, printable, and used states.
- `date-action`: automatic generation and guided generation states for an empty operating date.
- `generation-progress`: four concise status messages without storage, API, prompt, or schema details.
- `operator-review`: scaled A4 preview, location-specific diagnostics, partial repair, separated preview and approval actions.
- `two-page-preview`: page-one and page-two thumbnails side by side on desktop and stacked on mobile; opens a full-size, keyboard-dismissable A4 dialog.
- `lifecycle-state`: one visible progression only — draft, review, approved, print-ready, completed. Internal PDF and approval fields remain backward compatible.
- `regeneration-menu`: one secondary disclosure containing issue repair, question, activity, option, and translation regeneration actions.
- `common-brief`: three facts, one example, three keywords, source line, and optional QR link; capped at 15% of page one.
- `session-header`: Session 1 exposes easy entry, experience, evidence, and interaction; Session 2 exposes activity, information gap, roles, and group decision.
- `reset-activity`: compact 3–5 minute no-preparation warm reset.
- `quick-vote`: initial choice only, with two or three visible options and an explicit no-reason-yet instruction.
- `think-harder`: exactly one bilingual conflict question between Group Result and Final Question.
- `main-activity`: goal, complete choices or roles, numbered procedure, useful English, and result.
- `group-decision`: compact result control plus the everyone-speaks rule.
- `speaking-readiness`: five plain-language checks for material, axis diversity, turns, opposition, and open-ended decision; states are ready, review, and regenerate.
- `conversation-material`: a complete review, message, statistic, scenario, schedule, or option set that gives learners evidence to judge; never a label-only chip.
- `bound-question`: one question owns its starter, unique follow-up, optional choices/escape, and BASIC/PLUS ladder; renderers never access a flat stem array.
- `pop-quiz-item`: incorrect English, corrected English, and a concise Korean nuance explanation.
- `spark-bingo`: a fixed 3×3 vocabulary grid with part-of-speech-correct Korean meanings and one experience-required rule.
- `immutable-game`: exactly one Session 2 game whose type, name, rules, roles, options, inputs, and numbers are copied and rendered without post-processing.
- `shared-situation`: bilingual background plus concrete facts shared by the game and discussion.
- `useful-expression`: one of six distinct conversational functions, rendered in a two-column list.
- `approval-gate`: green when clear, yellow for warnings with approval enabled, red for blockers with approval disabled and automatic repair exposed.
- `timed-round`: a named round with visible minutes, per-person time, follow-up requirement, and a no-advance-until-everyone-speaks rule.
- `assigned-opposition`: two contrasting role briefs that let adults disagree without exposing their personal view.
- `information-gap`: participant-created or sequentially revealed information that cannot be completed silently.
- `conversation-block`: start, story, round, mission, phrase, final.
- `action-cue`: SAY uses a solid marker, ASK a directional dashed marker, and REACT a return/double marker so actions remain distinct without color.
- `story-path`: connected spoken openings rather than fill-in boxes.
- `response-groups`: three immediate ASK phrases and three immediate REACT phrases.
- `quality-panel`: ready, review, regenerate.
- `feedback-card`: unanswered and submitted.
- `a4-page`: screen preview and print state.
- `bilingual-rule`: English action text is primary; its Korean operational meaning sits directly below at 75–80% scale.
- `evidence-choice`: review body, BUY / DON'T BUY checks, and a visible evidence-mark line.

## 6. Interaction and accessibility

- Every control is a real button, input, select, or labelled group.
- Keyboard focus remains visible. Status updates use the existing polite live region.
- Technical settings remain available but closed by default.
- Calendar cards expose one lifecycle status only. Status always combines text with a non-color marker; contradictory approval/PDF/used labels are never shown together.
- Empty operating dates expose a ghost `자동 생성` action and a quiet `주제 지정` action. Non-operating dates expose no generation control.
- No level labels appear. Instructions use short action verbs and concise Korean support.
- Motion is limited to existing scroll and state feedback; no decorative animation.

## 7. Content rules

- English is visually primary.
- Korean appears for rationale, quiz explanation, vocabulary meaning/rule, situation background, game rules, useful-expression meaning, and operating rules. It does not appear beside icebreaker/discussion questions, choices, starters, follow-ups, or ladder examples.
- Student activity instructions use `~하세요`; original review examples use consistent `~해요`.
- Core flow: notice natural English → answer quickly → expand from experience → use shared facts → play one game → discuss → reuse spoken expressions.
- A prompt must permit a short first answer and a longer voluntary expansion.
- Quick Start questions and options share one answer axis; experience prompts do not force choices.
- Every icebreaker and discussion prompt has a unique topic-specific follow-up; generic START/ADD/GO FURTHER scaffolding is prohibited.
- Approval is driven by B1–B11 blockers and W1–W12 warnings. Any blocker disables approval; warnings stay visible but do not prevent approval.
- Student and leader modes share one renderer; leader mode only appends leader-note blocks and a data-derived TIME CUT line.
- Automatic generation saves a review draft and never approves it. Existing or approved dates are never overwritten.
- Printed sections use a shared white-surface, deep-green left rule, charcoal body, neutral bordered phrase-chip system, and remain separable in grayscale.

## 8. Accepted debt

- The application is a dependency-free vanilla JavaScript tool with string-template renderers. This change keeps that architecture to protect deployed storage and Gist behavior.
- Real classroom timing and printer hardware behavior require offline observation after local QA.
- Speaking readiness proves the designed constraints and printable materials, not real-world learner participation; first-speech latency, ASK/REACT counts, leader interventions, and actual 20-minute duration remain pilot measurements.
- Public-holiday lookup is not network-backed in this local build; coordinators can exclude specific dates and copy weekday settings month to month.
