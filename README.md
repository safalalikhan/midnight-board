# The Midnight Board

A cinematic Victorian séance room with a plain HTML/CSS/JavaScript frontend
and a small Express backend. The original clickable symbols and reset remain,
with settings and transcript in expandable sections below the board.
No frontend framework, database, or build step is needed.

## Run locally

Use Node.js 20.19+ (a currently supported LTS release is preferable).
From this project folder:

```sh
npm install
npm start
```

Open **http://localhost:3000**. One Express process serves both the frontend
and backend; do not use a separate Python server or double-click the HTML for
this version. Stop with Control+C. `npm run dev` restarts the server when code
changes; refresh the browser to see frontend changes.

The local `.env` is configured with `GHOST_PROVIDER=scripted`. No API key is required. If setting up a new checkout, copy
`.env.example` to `.env`. To explicitly enable the optional paid OpenAI provider, set these lines in `.env`:

```dotenv
GHOST_PROVIDER=openai
OPENAI_API_KEY=your_key_here
```

Restart the server after editing configuration. Never paste the key into
`index.html`, `script.js`, screenshots, issues, or chat. `.env` is ignored by Git
and is not served by Express. `.env.example` contains no credentials and is safe
to commit. If a real key is ever committed, revoke it; ignoring it afterward
will not remove it from Git history.

By default, the app uses the complete **scripted ghost engine**, even if a key
is present. The UI labels these replies. OpenAI failures also use this engine. Enabling AI sends submitted question text and the current conversation
to OpenAI. We set `store: false`; that is not a promise of zero provider retention.

## Files and how they connect

| File | Role |
| --- | --- |
| `index.html` | Page content, question form, transcript, microphone, settings, and exit dialog. |
| `style.css` | Walnut textures, candlelight, fog, Victorian ornament, responsive layout, and accessible focus styles. |
| `script.js` | Browser events, speech recognition, rendering, animation, and optional tab storage. |
| `server.js` | Express routes, authoritative session context, validation, limits, and provider orchestration. |
| `ghost-responses.js` | Original dialogue library, intent classifier, lore, name recognition, non-repetition, and rare events. |
| `ghost-providers.js` | Server-only provider boundary and optional OpenAI adapter. |
| `.env` | Local-only secret configuration; never commit this file. |
| `.env.example` | Safe configuration template. |
| `package.json` / `package-lock.json` | Commands and reproducible dependencies. |
| `tests/` | Automated DOM and HTTP tests; no real OpenAI calls or microphone use. |

HTML loads CSS with `<link>` and JavaScript with `<script defer>`. `defer` lets
the HTML parse before JavaScript looks for its elements. The browser uses
`fetch()` to send JSON to Express on the same origin. Only Express reads the key.

The request flow is:

```text
Typing or microphone transcript → review question → submit
  → POST /api/session (first question only)
  → POST /api/ghost { question }
  → server validation + session quota + rate limits + daily allowance
  → scripted engine (default) or optional OpenAI
  → transcript + animated planchette
```

The server creates an unpredictable session token. It keeps the authoritative
history and remaining question count in memory; clients cannot submit invented
assistant messages or override their quota. `GET /api/session` restores that
state after a refresh. `DELETE /api/session` clears it when ending or leaving.
Sessions expire after two hours and are lost on a server restart. Expired saved
transcripts remain readable, but start a new séance to ask more questions.

## Interaction and accessibility

- Questions are limited to 120 UTF-16 code units, matching HTML `maxlength` and
  JavaScript string length; some emoji count as two. Limits apply in the browser
  and on the server. Speech longer than this is truncated with a visible notice.
- Microphone input is optional and only starts after a click. It fills the same
  field as typing and never submits automatically. Denied permission, absent
  support, hardware/network errors, and no speech all leave typing available.
  Use localhost or HTTPS. Your browser's speech service may process audio
  remotely. This application does not record or store microphone audio.
- Idle movement pauses during requests and reply spelling. The full reply is
  readable immediately; the planchette then visits its A–Z/0–9 symbols.
  Standalone YES, NO, and GOODBYE use their dedicated symbols; other punctuation/spaces are skipped. Disable animation at any time; reduced-motion
  preferences disable it automatically. Manual board selection still works.
- Controls have labels and keyboard support; status messages use live regions.
  The decorative planchette cannot intercept button clicks.
- End Séance and Leave first open an atmospheric native modal dialog. Stay or
  Escape cancels. End clears the conversation and shows a closed-circle screen;
  Leave clears it and navigates to `about:blank`. No attempt is made to trap the
  visitor or force-close their tab.
- After meaningful interaction, refresh/tab close may show the browser's
  standard `beforeunload` confirmation. Browsers control its text and may omit
  it, particularly on mobile. Ending intentionally removes that listener.

## Optional persistence

“Remember this séance” is off by default. When enabled, `sessionStorage` holds
text, draft, session token, and remaining count in this tab. Refresh displays a
welcome-back message and reconciles with the server. Disabling the option or
ending the séance removes this app's stored data. Storage failures fall back
to memory. No microphone recordings are ever stored.

A separately opened tab receives a new séance. Some browsers copy sessionStorage
when duplicating a tab; such a duplicate can resume the same séance and quota.
Without persistence, a reload starts a new frontend session; an abandoned server
session expires. Closing a browser tab is not a reliable server deletion signal.

## Model, costs, and safeguards

Optional OpenAI model: **gpt-5.6-luna**, with reasoning effort `none`. It is intended for
cost-sensitive workloads. Listed standard text prices checked October 30, 2026:
**US$0.20 / million input tokens, US$1.20 / million output tokens**.
[Official model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

Illustrative estimate: 1,000 input tokens + 60 output tokens is $0.000272 per
reply, or $0.00272 for ten replies. Actual costs vary with tokenization and
conversation length; this is not a guaranteed bill. The server requests one
short sentence, limits output to 100 tokens, and caps displayed replies at 120
characters. It uses no paid tools and makes no automatic retries.

Safeguards implemented:

- Maximum **20 accepted questions per séance**, including scripted replies.
  Failed provider attempts still consume a question because they may cost money.
- **6 question requests/minute and 30/hour per IP**, plus 10 new séances/hour/IP.
- One in-flight question per séance; 2 KB request-body limit; server validation.
- **100 paid API attempts per UTC day across this server**, configurable downward
  with `MAX_DAILY_AI_REQUESTS` (0 = scripted-only). The reservation is written
  before calling OpenAI to `.data/daily-usage.json` and survives restarts.
  Missing credentials, exhausted allowance, unreadable usage storage, a provider
  error, or a 20-second provider timeout uses a labeled scripted reply.
- Only public frontend files are served. Provider errors and questions are not
  written to server logs. Cross-origin browser API calls are rejected.

Keep `.data` intact: deleting it resets the daily allowance. This local prototype
supports **one server process**. Sessions and IP rate limits are memory-based
and reset on restart; the daily paid-call ledger does not. Anonymous sessions
are not verified identities, so opening new sessions is not a lifetime visitor
cap. The global daily ceiling is the additional spending safeguard.

Before public deployment, use a shared durable store with atomic quota updates,
configure the reverse proxy and HTTPS, and review abuse controls. Do not run
multiple workers against this file-based counter. The server currently binds
only to localhost. This implementation has not been deployed.

Use a separate OpenAI project/key for this app, monitor actual usage, and configure
available account billing controls. App limits do not control other uses of that
key, and account budget alerts should not be assumed to be hard spending cutoffs.

## Testing

```sh
npm test
```

Tests use jsdom for browser logic and Supertest for local HTTP routes, with mocked
AI and speech services. They require permission to bind local sockets and incur
no OpenAI charges. They cover limits, context isolation, rate limiting, fallbacks,
secret-file protection, storage, speech errors, and cancellation races.

Real-browser manual checks still matter:

1. Open on desktop and a narrow mobile viewport; use Tab, Enter, Space, and Escape.
2. Observe idle movement; submit a question and check reply spelling; turn motion off.
3. Test microphone allow/deny/no-speech in a supported browser and typing in an
   unsupported browser. Check the browser's microphone indicator stops on exit.
4. Enable persistence, submit, refresh, and verify history and remaining count.
5. Ask twenty questions with enough spacing for the rate limit, then verify the cap.
6. End while a reply is pending; verify no stale response appears. Start again.
7. With a real configured key, verify an AI-labeled reply and context-aware follow-up.

Automated tests do not verify visual layout, actual browser permission prompts,
or the quality/availability of a live OpenAI response.


## Cinematic redesign

The presentation uses CSS and inline SVG only: no new packages, external fonts,
tracking, stock images, or audio downloads. Public HTML, metadata, and assets
contain no creator attribution. The original Express routes, model, and quota
safeguards are unchanged.

### Stage 1: the room

Layered gradients create the aged walnut surface. Inline SVG adds engraved
Victorian borders and a wooden planchette with a transparent viewing window.
CSS candles, a static SVG grain layer, and two slowly drifting fog layers create
atmosphere without video or large bitmap assets. The board dominates the layout;
the question field and counter sit directly below it. Native `details` controls
keep settings, privacy guidance, and the transcript available without extra panels.
The page fills at least the viewport and scrolls naturally on smaller screens.

### Stage 2: motion

`symbolPosition()` measures each symbol's rendered bounding rectangle relative
to the board, accounting for borders and scaling. That includes the arched desktop
letter rows and the compact mobile grid. `moveTo()` follows a quadratic Bézier
curve using `requestAnimationFrame`, smooth acceleration/deceleration, a small
rotation, and an exact final landing. The rotation origin is the viewing window,
so the window stays aligned with the chosen symbol. Resize observation recalculates
positions. Every movement is cancellable, including during exit and reduced-motion
changes. Brief pauses between occasional letters provide hesitation.

### Stage 3: pacing and sound

Arrival fades the board into candlelight. A **scripted** first-contact greeting
appears automatically if the visitor has not already started interacting; it
makes no API call, starts no microphone/audio, and uses none of the twenty questions.
An existing saved séance resumes instead of receiving another introduction.

As the séance progresses, fog density and candle variation increase slightly.
Rare disturbances are single slow background dimmings, separated by at least
45 seconds, with no flashing or strobing. After question twenty, the planchette
settles over GOODBYE and the final candle dims. The last answer and transcript
remain readable until the visitor chooses End Séance or Leave; neither quota
nor history is silently reset.

Sound is off by default. The Sound control uses the browser Web Audio API to
synthesize a quiet three-note drone. There are no audio recordings or downloads.
It mutes when the tab is hidden, when microphone input starts, and when the séance
ends; it never automatically resumes. Unsupported audio leaves the experience
usable in silence.

Reduced-motion preferences and the “Movement & atmospheric effects” checkbox
suppress animated effects. Replies stay immediately readable even during spelling.
These controls change only presentation, never the twenty-question server limit.

### Redesign verification

Automated tests cover all 39 symbol centers with scaled geometry, resize
realignment, mid-flight cancellation, spelling order, idle suspension, first
contact without network calls, final GOODBYE, optional audio, and existing
session/permission/error behavior. Geometry is simulated: it does not replace
real desktop/mobile layout inspection. Browser automation was unavailable and
native Computer Use permissions were not granted during this redesign, so visual
appearance, real sound playback, and real microphone permission flows still need
manual verification.

Additional manual checks: review the layout at 320px, 390px, 768px and desktop
widths; rotate a phone during movement; increase text zoom; toggle reduced motion;
verify the planchette window over YES/NO/GOODBYE; complete twenty questions; and check
sound stops immediately when leaving or starting the microphone.


## Scripted ghost engine

`GHOST_PROVIDER=scripted` is the default. It never calls OpenAI or consumes the
paid-call budget, even when `OPENAI_API_KEY` is present. All keys and dialogue
modules stay server-side; only the three frontend files are publicly served.

`ghost-responses.js` contains **384 unique hand-written core responses**, grouped
into 16 intents, plus six rare-event lines and variants for an unnamed visitor.
Each category has 24 core lines: eight quiet, eight uneasy, eight deep. The stages
advance on turns 1–6, 7–13, and 14–20. Keyword/phrase rules prioritize specific
questions (names, backstory, family, etc.) over generic yes/no patterns. Unmatched
questions receive varied archive-themed replies, never one universal fallback.
This is a bounded authored game, not general-purpose language understanding.

Ember is always the archivist lost in the flooded archive of 1889. Session memory
holds that fixed lore, an optional explicitly volunteered first/display name,
used response IDs/text, rare-event counters, and the existing conversation history.
“My name is Ada Lovelace” retains only Ada as the display name; it does not create
a profile. We do not infer identity from family references or record audio.
Submitted question text remains in the existing transcript until the session ends.

Every chosen response is excluded from the rest of the séance. With “Remember
this séance” enabled, a refresh resumes the same server session, including used
responses, lore, name, transcript, and remaining count. These remain in server
memory, not a new personal-data database. A restart or two-hour expiry still ends
the server session; a browser refresh alone does not. Refresh without the opt-in
starts a new séance, as before. Finishing and starting another intentionally resets
response history.

Rare events have a 6% chance on eligible unknown/secret questions from turns 8–19,
with at least five turns between events and at most two events per séance. Their
allowlisted hints create a double shadow, cold mist, or candle dimming. Effects
respect reduced motion, clear on exit/hidden tab, and are not replayed on refresh.
Personal questions and lore questions are never replaced by these rare lines.
Longer replies use faster planchette travel to avoid excessive spelling time.

### Provider extension points

| `GHOST_PROVIDER` | Status |
| --- | --- |
| `scripted` | Fully playable now; no key, provider network traffic, or API cost. |
| `openai` | Existing integration retained; requires server-side key and usage allowance. |
| `gemini` | Reserved name; startup explicitly fails until its adapter is implemented. |
| `groq` | Reserved name; startup explicitly fails until its adapter is implemented. |

Add future transports in `ghost-providers.js` behind its common generation
interface; keep session validation, limits, and fallback in `server.js`. Unknown
provider values fail explicitly instead of silently enabling a paid provider.

### Try a complete séance

```sh
npm install
npm start
```

Open http://localhost:3000. In `.env`, keep `GHOST_PROVIDER=scripted`, then restart
the server if you changed configuration. Try “Who are you?”, “How did you die?”,
“My name is Ada”, “What is my name?”, “What did I ask?”, and “Tell me a secret”.
Enable the remember option, refresh, and repeat a question to check that its answer
changes while the established name and lore remain consistent. The twentieth
answer ends with the existing GOODBYE animation; a twenty-first question is denied.
Rate limits remain enabled, so allow the board time between questions.

Run `npm test` for engine variety, phrase matching, non-repetition across all
categories, serializable context, server session resumption, twenty-question
limits, key isolation, provider fallback, rare effects, and frontend regressions.
All provider calls in tests are mocked; no paid calls are needed.
