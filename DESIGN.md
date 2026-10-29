# TheBox Talk Flow Design Contract

## Active direction: TheBox Topic v4.3 MASTER

### Member reading surface: supplied mobile / desktop reference contract

- The supplied `thebox-app-mobile-color-spec` plus the companion mobile and desktop HTML are the visual source of truth for the member route. This is a presentation-only contract; data loading, completion records, topic expansion, and calendar behavior remain unchanged.
- App identity is `#A9302E`; category is an existing dynamic `--category` value; ink is `#1C1C1A`; supporting gray is `#5F5F58` / `#96968D`; rules are `#E8E7E2`; canvas is `#FAFAF9`; surfaces are white. Brand red is never reused as a topic-category color.
- The member surface uses Noto Sans KR only. It has one 1000px desktop column with 36px page inset and a 375px mobile column with 18px inset. Mobile and desktop share the same hierarchy rather than distinct products.
- Header anatomy: white 30px rounded red T mark, 15px brand name, and a quiet outlined logout control. The topic header uses a 10.5px uppercase gray eyebrow, 26px month title, compact tabs, and 32px outlined month controls.
- The calendar and expanded topic use one white, 14px-radius, 1px-rule surface. Calendar availability, selected topic categories, and completion checks are the existing DOM states; CSS must not fabricate topic data or completion counts.
- Topic accordions have a compact category-and-title header. Expanded editorial blocks use 12px uppercase category labels, 14.5px / 1.75 story text, thin rules, four compact key-word chips, and light option rows. The two existing completion forms are the only filled or emphasized surfaces.
- At 640px and below: header inset is 18px, document inset is 18px, month controls are 32px, calendar cells remain one row of seven days, accordion headers stack category above title, key words become two columns, and all question/option material becomes a single readable column. CJK content uses `word-break: keep-all` with normal overflow wrapping.

- Each topic is exactly two A4 pages. Page 1 is Template A Story (85%) or Template B Icebreakers (15%), set once by `TEMPLATE_A_PERCENT` in `talkflow/topic-v4-generation.js`; Page 2 is always Article/Advanced. Page 2 is sourced first, then Page 1 is planned with a different category and a materially unrelated premise.
- Template A contains TODAY'S STORY, four KEY WORDS, QUICK VOTE, three EASY TALK questions, three REAL TALK questions, and four TODAY'S ENGLISH expressions.
- Template B contains six RANDOM QUESTIONS and six BALANCE GAME rows. RANDOM WORDS is prohibited.
- Article contains TODAY'S ARTICLE, five KEY WORDS, YOUR STANCE with three choices, and five DISCUSSION questions.
- Story names come from the approved Korean K-pop/K-sports list and only appear in explicitly fictional, universal situations.
- Page categories differ and permanently map to the v4.3 category palette. Print and member screens use the same category colors.
- A4 is 794×1123px with 44px vertical and 52px horizontal padding. Source Serif 4 is reserved for the main title; Noto Sans KR owns all other text.
- Member navigation is calendar-first. Its two view labels are `달력으로 보기` and `리스트로 보기`; calendar cells show availability without titles and the monthly list shows date, category, and title.
- A published topic opens as two independent category-and-title accordions, both collapsed by default. Page 1 saves “여러분이라면?”; Article saves a three-choice comprehension check.
- `내가 읽은 토픽 보기` is a closed-by-default personal disclosure below the month browser. It lists only the signed-in member’s saved reading records for the active month, never changes shared topic content, and each row returns to that topic.
- RSS-based Articles place one compact `ORIGINAL SOURCE` citation between the Article label and learning adaptation. It uses the Article category color, the existing hairline rule, a 12.5px linked publisher/title line, and no extra surface.
- Brand red `#A9302E` is limited to app identity and date/status accents. Category colors are `#35507A`, `#B25C39`, `#6B4C7A`, `#9C7A1E`, `#A65166`, `#2C6E6B`, `#1F4D3D`, and `#355E3B`.
- Member entry is a compact identity gate, not a landing-page hero. It accepts the existing name, phone number, and birth-date confirmation fields. The Member Lounge’s one-time handoff may also open the same signed-in topic view automatically. On phones the brand header, introduction, and form start in the first viewport with 24–40px vertical rhythm; no viewport-centering or decorative empty band may push the form below the fold. The canvas uses `#F7F7F6`, brand identity uses `#A9302E`, form surfaces stay white, and the confirmation action uses evergreen `#2B5940`.
- Member entry inputs must stay white in browser autofill, retain a 48px minimum target, and use the existing evergreen focus ring. The login card uses one quiet border and the existing low-elevation shadow.
- New v4.3 content never includes legacy Jury, leader, session, activity, Round Two, Random Words, host, or timing blocks. A manager-only Korean review card exposes the Article source link and blocks approval when its final judgment is `수정 필요`; it is never included in print or member content. Published topics may also show a compact, manager-only unique-member count (`멤버 열람 N명`) without member names.
- The manager-only monthly poster is a separate B4 landscape print surface, never part of member routes. Its exact paper box is 364mm × 257mm with 14mm / 16mm / 10mm top-side-bottom inset, a `#EDECE6` preview canvas, and a white printed page.
- Poster hierarchy is limited to red English month plus ink year, `THE BOX TOPIC`, a 3px red header rule, white weekday type on a red bar, a dynamic 5-or-6-row calendar grid, and centered `B` mark plus `THE BOX` footer. Cells contain only a red date and, where present, one colored 7px category dot plus an auto-fit 2–6-word topic phrase. They never expose category labels, activity names, source links, full questions, badges, or secondary visual decoration. Poster dots intentionally use the reduced five-tone `POSTER_CATEGORY_COLORS` set in `talkflow/app.js` (navy, gold, wine, rose, green), not the eight page colors, so a month reads as a few calm groups.
- The poster’s print CSS page size is installed only while this view is active so regular A4 handout printing retains its own page setting. Calendar rows use dynamic equal `1fr` tracks and the phrase renderer reduces only from 16.5px to 11px if needed; it does not clip a phrase.

The blocks are editorial content, not nested cards. Only the existing completion
form may use a filled surface.

## Previous direction: Simple Conversation v3 (legacy compatibility only)

### Screen reading view

- Student, leader, and print-route screen previews are reading views, not fixed-height A4 simulations. Paper height grows with content; only actual print media fixes two A4 pages.
- Reuse evergreen ink, muted Korean support, DM Sans/Noto Sans KR, and the serif topic title. Reading tokens: width 800px, body 18px, Korean/support 16px, section label 13px, title 32px (28px on phones), spacing 8/16/24/32px, page inset 24–48px. Mobile inset is 16px. The nested handout body must not inherit the app shell main padding.
- Questions are single-column numbered editorial rows, with 600-weight English and regular Korean beneath. No question boxes. Materials remain two columns on desktop, one on phones; activity steps retain 2×2 on desktop and stack on phones.
- Story is an unboxed reading passage. One thin rule introduces each major section. Expressions and leader notes are supporting text, not another row of task cards. Group Result retains a quiet writing line.
- One page switch lives in the existing date navigation. The reading toolbar offers only its role, an A4 print clarification, and print action; no redundant page switch or paper zoom.
- Every question, translation, activity, extension, final question, and leader note remains present. No content, storage, generation, validation, or actual print rule changes.
- Persona gate: a mixed-confidence learner can read one question at a time; a coordinator can find printing without duplicate controls; a leader can read supporting notes without covering student content. Korean must keep whole words; no fixed screen clipping or horizontal document overflow at 375/768/1280/1600px.

New topics use the `simple-v1` two-page editorial system. Existing saved topics and `/topics/` retain their previous renderer and are never converted automatically.

- White A4, charcoal copy, deep-green accents, generous whitespace, and thin rules.
- Page 1: serif title, one story/situation, EASY TALK ×3, REAL TALK ×3, TODAY'S ENGLISH ×4, and one actionable QUICK VOTE.
- Page 2: one activity with real materials, a 2×2 four-step decision path, GROUP RESULT, one THINK HARDER question, and FINAL QUESTION.
- Leader copies retain the hierarchy and add short near-section notes plus bottom emergency phrases.
- Print page 2 uses the shared 12mm page inset, full-width Story evidence below the activity introduction, and content-sized activity rows. Leader emergency phrases occupy a normal-flow footer row, never an absolute overlay. Font sizes and screen layout remain unchanged.
- No full-width dark bands, nested card decoration, or visible generation labels.
- Korean uses `word-break: keep-all`. Material numbers use circular high-contrast badges that remain distinct in grayscale.
- Print floors: title 20pt; question 11pt; Korean guidance, activity, and materials 9pt; helper 8pt; leader note 8.5pt.
- Print hierarchy uses three explicit tiers: Story/Activity as 13-14pt anchors, Easy/Real/English as 11.5-12.5pt working sections, and Vote/Everyone/Think guidance as 9.5-10.5pt support.
- Printable questions are editorial rows, never cards: a quiet number, 600-weight English, medium-charcoal Korean support, generous vertical rhythm, and one thin divider. Only evidence materials and the group result may remain bounded work areas.
- The actual Simple v3 Quick Vote remains a choose-one vote, but print renders its existing options as three paper-native check rows with writing rules rather than screen tags; no ranking semantics are invented when the topic does not supply ranking material.

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
- Simple workbook print aliases: `--simple-print-title-size`, `--simple-print-tier-major-size`, `--simple-print-tier-working-size`, `--simple-print-tier-support-size`, `--simple-print-question-size`, `--simple-print-korean-size`, `--simple-print-note-size`, `--simple-print-hairline`, and `--simple-print-space-*`. These aliases own the printable hierarchy; selectors consume tokens rather than redefining the scale.
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
- `member-entry`: desktop two-column and mobile single-column states, browser-autofilled input state, validation error, submitting, and authenticated handoff.
- `workflow-step`: pending, current, complete.
- `operator-panel`: date/topic input, generation progress, review result, final actions.
- `month-calendar`: weekday header, operating day, non-operating day, empty, review, printable, and used states.
- `date-action`: automatic generation and guided generation states for an empty operating date.
- `topic-create-dialog`: automatic generation is the default state with no topic input; guided topic input and optional source/avoidance/direction controls are progressive disclosures. Guided validation is inline and never uses native required bubbles.
- `topic-category-preferences`: visible two-select control inside the existing topic-create dialog. Page 1 supports automatic, everyday-category, and icebreaker choices; Article supports automatic or one exact RSS category. The same explicit category on both selects is an inline generation block, never a silent fallback.
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
- `topic-completion`: unanswered, saving, completed, and error. One short reflection is the completion action; it never changes the shared topic.
- `topic-history`: a compact monthly disclosure listing completed dates, topic titles, and saved one-line reflections. Completed date pills include a checkmark and accessible completion label.
- `topic-completion`: unanswered, saving, completed, and error. One short reflection is the completion action; it never changes the shared topic.
- `topic-history`: a compact monthly disclosure listing completed dates, topic titles, and saved one-line reflections. Completed date pills include a checkmark and accessible completion label.
- `a4-page`: screen preview and print state.
- `bilingual-rule`: English action text is primary; its Korean operational meaning sits directly below at 75–80% scale.
- `evidence-choice`: review body, BUY / DON'T BUY checks, and a visible evidence-mark line.

## 6. Interaction and accessibility

- Every control is a real button, input, select, or labelled group.
- Topic completion uses a labelled textarea, visible character count, disabled saving state, and a polite status message. A saved response remains editable and is restored on return visits.
- Topic completion uses a labelled textarea, visible character count, disabled saving state, and a polite status message. A saved response remains editable and is restored on return visits.
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
- Page 1 uses one deterministic, real Korean-star display name from the approved roster. A name already used by another completed topic in the same month is unavailable; the generator and validator receive the same selected name, so a repeated name cannot pass as a Plan.
- Member visibility begins on 2026-10-01. The member API filters older topic and completion-record dates, the member calendar cannot navigate earlier than October 2026, and pre-launch dates remain administrator-only.
- The v4.1 review actions include a danger-styled delete control. Deleting a topic removes its local administrator draft and its same-date shared member publication after explicit confirmation.
- Printed sections use a shared white-surface, deep-green left rule, charcoal body, neutral bordered phrase-chip system, and remain separable in grayscale.

## 8. Accepted debt

- The application is a dependency-free vanilla JavaScript tool with string-template renderers. This change keeps that architecture to protect deployed storage and Gist behavior.
- Real classroom timing and printer hardware behavior require offline observation after local QA.
- Speaking readiness proves the designed constraints and printable materials, not real-world learner participation; first-speech latency, ASK/REACT counts, leader interventions, and actual 20-minute duration remain pilot measurements.
- Public-holiday lookup is not network-backed in this local build; coordinators can exclude specific dates and copy weekday settings month to month.
