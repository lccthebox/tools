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

- App shell keeps the existing top bar, month sidebar, and responsive document flow.
- Operator workflow is a five-step surface above the calendar: date, topic, generate, review, approve/print.
- Student print remains exactly two portrait A4 pages with 10mm × 11mm physical margins.
- Mobile preview scales the paper as one intact A4 composition; the internal print layout never reflows to phone dimensions.

## 5. Reusable primitives and states

- `button`: primary, secondary, danger, disabled, focus-visible.
- `workflow-step`: pending, current, complete.
- `operator-panel`: date/topic input, generation progress, review result, final actions.
- `operator-review`: scaled A4 preview, location-specific diagnostics, partial repair, separated preview and approval actions.
- `conversation-block`: start, story, round, mission, phrase, final.
- `action-cue`: SAY uses a solid marker, ASK a directional dashed marker, and REACT a return/double marker so actions remain distinct without color.
- `story-path`: connected spoken openings rather than fill-in boxes.
- `response-groups`: three immediate ASK phrases and three immediate REACT phrases.
- `quality-panel`: ready, review, regenerate.
- `feedback-card`: unanswered and submitted.
- `a4-page`: screen preview and print state.

## 6. Interaction and accessibility

- Every control is a real button, input, select, or labelled group.
- Keyboard focus remains visible. Status updates use the existing polite live region.
- Technical settings remain available but closed by default.
- No level labels appear. Instructions use short action verbs and concise Korean support.
- Motion is limited to existing scroll and state feedback; no decorative animation.

## 7. Content rules

- English is visually primary.
- Korean appears only for situation, difficult meaning, or activity rules.
- Core flow: CHOOSE → SAY → ADD → ASK → REACT → DECIDE.
- A prompt must permit a short first answer and a longer voluntary expansion.
- Quick Start questions and options share one answer axis; experience prompts do not force choices.
- Page one exposes four topic-specific `SAY THIS` phrases; page two requires one immediate response from `USE ONE NOW`.

## 8. Accepted debt

- The application is a dependency-free vanilla JavaScript tool with string-template renderers. This change keeps that architecture to protect deployed storage and Gist behavior.
- Real classroom timing and printer hardware behavior require offline observation after local QA.
