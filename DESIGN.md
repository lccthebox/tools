# TheBox Talk Flow Design Contract

## 1. Product and users

Talk Flow is an operational tool for a non-technical study coordinator, a discussion leader, and mixed-confidence adult English learners. The primary job is to move from date selection to a printable conversation guide without exposing storage or API mechanics.

## 2. Existing visual language

- Warm paper canvas, white work surfaces, deep evergreen ink, mint and restrained yellow accents.
- DM Sans leads English hierarchy; Noto Sans KR supports concise Korean guidance.
- Screen surfaces may use modest radii and shadows. Printed surfaces use black rules, no decorative shadows, and minimal fills.
- The signature element is the ordered conversation path: CHOOSE, SAY, ASK, REACT, DECIDE.

## 3. Tokens

- Color: `--ink`, `--muted`, `--paper`, `--surface`, `--line`, `--green`, `--green-2`, `--yellow`, `--yellow-2`, `--red`, `--red-2`, `--blue`.
- Spacing follows 4px increments; dense print spacing may use millimetres.
- Screen type: 11–50px existing scale. Print minimums: title 18pt, core question 11pt, action line 9.5pt, Korean support 8.5pt.
- Radius: 7, 9, 12, 15, 18, and 24px existing component scale.

## 4. Layout

- App shell keeps the top bar and document flow. The calendar view owns document scroll; the A4 review frame owns only its internal page preview scroll.
- Desktop calendar uses a seven-column month grid with weekday headers. At 800px and below it becomes a single-column chronological operating-date list.
- The default operator path is calendar → date action → draft generation → two-page review → approval → PDF. Technical controls remain outside that path.
- Student print remains exactly two portrait A4 pages with 10mm × 11mm physical margins.
- Mobile preview scales the paper as one intact A4 composition; the internal print layout never reflows to phone dimensions.
- Page one is Session 1, a 50-minute conversation surface. Page two is Session 2, a 40-minute reset, activity, decision, and final-round surface.

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
- `session-header`: Session 1 uses KNOW · SHARE · ASK; Session 2 uses RESET · PLAY · DECIDE.
- `reset-activity`: compact 3–5 minute no-preparation warm reset.
- `main-activity`: goal, complete choices or roles, numbered procedure, useful English, and result.
- `group-decision`: compact result control plus the everyone-speaks rule.
- `speaking-readiness`: five plain-language checks for material, axis diversity, turns, opposition, and open-ended decision; states are ready, review, and regenerate.
- `conversation-material`: a complete review, message, statistic, scenario, schedule, or option set that gives learners evidence to judge; never a label-only chip.
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
- Korean appears for every activity rule needed to complete the task without translating the English; English remains the spoken-output language.
- Student activity instructions use `~하세요`; original review examples use consistent `~해요`.
- Core flow: CHOOSE → SAY → ADD → ASK → REACT → DECIDE.
- A prompt must permit a short first answer and a longer voluntary expansion.
- Quick Start questions and options share one answer axis; experience prompts do not force choices.
- Page one exposes four topic-specific `SAY THIS` phrases; page two requires one immediate response from `USE ONE NOW`.
- Every topic uses at least three speaking mechanisms, at least three prompt axes, one complete conversation material, and one open-ended group decision.
- Page one uses at least two speaking mechanisms. Page two uses at least two and always includes a timed turn or assigned opposition.
- The same REACT phrase appears at most twice; each sheet includes surprise/follow-up, agreement, different experience, opposition, and reason-request language.
- `STRUCTURE READY` covers schema, language, translation, and print validity. `SPEAKING READY` separately covers material, axis diversity, information gap, turns, opposition, open decision, and sustainable activity duration. Only both may produce `CONVERSATION READY`.
- Everyday topics begin immediately without a brief. Context topics include a source-backed `60-SECOND BRIEF` that remains usable without opening the optional link or QR.
- Every Session 1 core prompt supports START, ADD, ASK, and REACT.
- Session 2 is an activity, not another question list: RESET → MAIN ACTIVITY → GROUP DECISION → FINAL ROUND.
- Automatic generation saves a review draft and never approves it. Existing or approved dates are never overwritten.
- Printed sections use a shared white-surface, deep-green left rule, charcoal body, neutral bordered phrase-chip system, and remain separable in grayscale.

## 8. Accepted debt

- The application is a dependency-free vanilla JavaScript tool with string-template renderers. This change keeps that architecture to protect deployed storage and Gist behavior.
- Real classroom timing and printer hardware behavior require offline observation after local QA.
- Speaking readiness proves the designed constraints and printable materials, not real-world learner participation; first-speech latency, ASK/REACT counts, leader interventions, and actual 20-minute duration remain pilot measurements.
- Public-holiday lookup is not network-backed in this local build; coordinators can exclude specific dates and copy weekday settings month to month.
