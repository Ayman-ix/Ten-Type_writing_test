# TenType — a typing speed test

A fast, minimal, keyboard-first typing test. Vanilla HTML/CSS/JS, no build step,
no frameworks, ready to deploy as a static site today and to grow a real backend
later without a rewrite.

## Project structure

```
typing-test/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── storage.js        # localStorage wrapper (safe fallback if unavailable)
│   ├── api.js             # data-access layer — the only file a future backend replaces
│   ├── textGenerator.js   # passages + word list (swap for an API later)
│   ├── typingEngine.js    # renders text, tracks correctness, caret, cumulative stats
│   ├── timer.js            # countdown timer, starts on first keystroke
│   ├── statistics.js       # WPM / accuracy / history math (pure functions)
│   ├── sound.js             # Web Audio beeps, no audio files
│   └── app.js                # wires everything to the DOM
└── vercel.json
```

## 1. Running it locally

No build step and no dependencies — it's static files. Any of these work:

```bash
# Option A: Python
cd typing-test
python3 -m http.server 8080
# open http://localhost:8080

# Option B: Node (if you have npx)
npx serve typing-test

# Option C: VS Code
# Right-click index.html → "Open with Live Server"
```

You can't just double-click `index.html` and open it as a `file://` URL in some
browsers, because `fetch`-like module loading and some storage APIs behave
differently there — always serve it over `http://localhost`.

## 2. How the typing engine works

`typingEngine.js` treats the target text as a **list of words**, not one long
string. This matches how people actually type and how the "extra characters"
and "spaces" requirements are meant to behave:

- Each word is rendered as a `<div class="word">` containing one `<span class="letter">`
  per target character.
- The (invisible) `#hiddenInput` always holds **only the characters typed for the
  current word**. When its value contains a space, `app.js` finalizes that word
  and moves to the next one.
- Typing a character marks the matching letter span `is-correct` or `is-incorrect`.
  Typing past a word's length adds extra `is-extra` spans (shown struck-through)
  so over-typing is visible.
- Backspace inside a word is a normal, unhandled browser edit — the next
  `input` event just re-renders that word's letters. Backspacing when the
  current word is already empty steps back into the *previous* word and
  restores exactly what you'd typed there, so you can fix a mistake one word back.
- A caret `<div>` is repositioned (via `transform: translate()`) after every
  keystroke using `getBoundingClientRect()` on the next letter to type.
- The text block only scrolls a full line at a time (not per keystroke), which
  keeps 1–2 lines of "lookahead" visible below the active line.
- In **quote mode**, finishing the last word (reaching its full length) ends
  the test immediately, without waiting for the timer.
- In **words mode**, more random words are silently appended once you're
  within 8 words of the end, so the test never runs out mid-timer.

A hidden `<input>` (rather than raw `keydown` handling) is used deliberately —
it's what makes mobile virtual keyboards, autocorrect-off typing, and IME
input all work correctly for free.

## 3. How WPM is calculated

All the math lives in `statistics.js`, which is pure functions (no DOM), so
it's easy to test and to reuse if you ever move it server-side.

- **Correct/incorrect characters are cumulative per keystroke.** If you
  mistype a letter and then backspace to fix it, the *display* updates to
  show you fixed it, but the mistake still counts against accuracy — this is
  the same convention most typing tests use, and it keeps "accuracy" meaning
  "how clean was your typing," not just "how clean did it end up looking."
- **WPM** = `(correctChars / 5) / elapsedMinutes` — the standard formula
  (1 "word" = 5 characters).
- **Raw WPM** = `(totalChars / 5) / elapsedMinutes`, where `totalChars` =
  correct + incorrect. This is typing speed *including* your mistakes.
- **Accuracy** = `correctChars / totalChars × 100`, clamped to 0–100, and
  defined as 100% when nothing has been typed yet (avoids `NaN` on a fresh
  test).
- Every division in `statistics.js` goes through a `safeDivide()` helper that
  returns a safe fallback instead of `NaN`/`Infinity` if the denominator is 0.
- The live stat bar recomputes on every keystroke *and* every timer tick
  (every 250ms), so WPM keeps moving even if you pause without typing.

## 4. How local storage is used

`storage.js` is the only file that touches `localStorage` directly, under
three keys:

- `tentype:settings` — theme, default duration, font size, sound on/off.
- `tentype:personalBests` — best result per test duration, e.g. `{"30": {wpm, accuracy, rawWpm, achievedAt}}`.
- `tentype:history` — the most recent 100 completed tests, newest first.

On load, `storage.js` runs a quick write/read/remove check against
`localStorage`. If that throws (private browsing in some browsers, storage
disabled by policy, sandboxed iframes, etc.), it transparently falls back to
an in-memory object for the rest of the session — the app keeps working,
your results just won't survive a page refresh.

`app.js` and `typingEngine.js` never call `localStorage` directly — they go
through `api.js`, which is what makes step 6 below possible.

## 5. Deploying to Vercel

This is a static site, so there's nothing to configure:

**Option A — Vercel CLI**
```bash
npm i -g vercel
cd typing-test
vercel        # first deploy, follow the prompts
vercel --prod # promote to production
```

**Option B — GitHub + Vercel dashboard**
1. Push this folder to a GitHub repo.
2. In the Vercel dashboard, "Add New… → Project" → import the repo.
3. Framework preset: **Other** (or "None"). No build command, no output
   directory override needed — `index.html` at the repo root is served as-is.
4. Deploy.

`vercel.json` in this repo just adds clean URLs and sane caching for the
`css/`/`js/` folders; it's optional but harmless to keep.

## 6. Connecting a Java Spring Boot + MySQL backend later

The whole app was structured so this is a swap, not a rewrite:

- **`api.js` is the seam.** Every read/write in the app already goes through
  `Api.submitTestResult()`, `Api.getTestHistory()`, `Api.getStatistics()`,
  `Api.getSettings()` / `Api.saveSettings()` — all `async` functions that
  currently call `storage.js` under the hood. Nothing in `app.js` or
  `typingEngine.js` needs to change when these start hitting a network
  instead of `localStorage`.
- Planned endpoint mapping (already reflected in `api.js`'s comments):

  | `api.js` method            | Future endpoint              |
  |-----------------------------|-------------------------------|
  | `submitTestResult(result)`  | `POST /api/tests`             |
  | `getTestHistory()`          | `GET /api/tests`               |
  | `getStatistics()`           | `GET /api/stats`               |
  | `getLeaderboard(duration)`  | `GET /api/leaderboard?duration=60` |

- On the Spring Boot side, a `Test` entity (`userId, mode, duration, wpm,
  rawWpm, accuracy, correctChars, incorrectChars, totalChars, wordsTyped,
  createdAt`) mapped with Spring Data JPA to a MySQL `tests` table covers the
  current result shape almost field-for-field — see the object built in
  `api.js`'s `submitTestResult()`.
- For auth, swap `getSettings()`/`saveSettings()` to read/write a `User`
  record instead of the local settings key, and add a `POST /api/auth/login`
  flow (e.g. JWT) that `api.js` attaches to its `fetch()` calls.
- For global leaderboards, `getLeaderboard(duration)` already exists as a
  stub returning `[]` — point it at a real endpoint and it's live.
- `textGenerator.js` is similarly isolated: swap `getPassage()`/`getWords()`
  for `fetch('/api/texts/random')` calls whenever passages move to a
  database, without touching `typingEngine.js` at all (it only ever receives
  a plain array of word strings).

## Design notes / assumptions

A few judgment calls made while building this, worth knowing about:

- **Tab / Esc / Ctrl+Enter restart shortcuts** are scoped to when you're
  actually engaged with the typing test (focus on the typing area, the
  restart button, or nothing in particular) so they don't hijack normal
  keyboard navigation of the header, settings drawer, or other pages. Esc
  also closes the settings drawer if it's open, before falling back to
  "reset the test."
- **"Mistakes"** in the live stat bar is the cumulative incorrect-keystroke
  count (see WPM section above) — it only goes up, even if you fix a typo,
  which matches how most typing tests define "errors."
- **Words mode** is effectively endless (it keeps appending words), so it
  only ends via the timer — the "finish before the timer ends" behavior
  applies to quote mode, where the passage has a natural end.
