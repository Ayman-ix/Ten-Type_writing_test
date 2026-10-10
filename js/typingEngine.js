/**
 * typingEngine.js
 * ---------------------------------------------------------------------------
 * Word-based typing engine (mirrors how most typing tests actually work):
 * the target text is a list of words; the hidden input always holds the
 * characters typed for the CURRENT word only; pressing space finalizes that
 * word and advances to the next one.
 *
 * Stats model (deliberate design choice): correct/incorrect character
 * counts are CUMULATIVE per keystroke. If you mistype a character and then
 * backspace to fix it, the visual state updates (so you can see you fixed
 * it), but the mistake still counts toward accuracy/mistakes — exactly like
 * most typing tests. This keeps "accuracy" meaningful (it reflects how
 * clean your typing was) and keeps the counters simple/robust to compute.
 */

const TypingEngine = (function () {

  let trackEl = null;
  let caretEl = null;
  let viewportEl = null;

  let words = [];          // string[]
  let wordMeta = [];        // { target, el, letterSpans[], extraSpans[], typed, finalized }
  let currentWordIndex = 0;

  let correctChars = 0;     // cumulative
  let incorrectChars = 0;   // cumulative

  let started = false;
  let finished = false;
  let allowExtension = false; // "words" mode: keep appending more words

  let callbacks = {};

  function createWordElement(word) {
    const wordEl = document.createElement('div');
    wordEl.className = 'word';
    const letterSpans = [];
    for (const ch of word) {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = ch;
      if (ch === ' ') span.classList.add('is-space');
      wordEl.appendChild(span);
      letterSpans.push(span);
    }
    return { wordEl, letterSpans };
  }

  function buildWordMeta(list) {
    return list.map((word) => {
      const { wordEl, letterSpans } = createWordElement(word);
      return { target: word, el: wordEl, letterSpans, extraSpans: [], typed: '', finalized: false };
    });
  }

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.trackElement
   * @param {HTMLElement} opts.caretElement
   * @param {HTMLElement} opts.viewportElement
   */
  function init(opts) {
    trackEl = opts.trackElement;
    caretEl = opts.caretElement;
    viewportEl = opts.viewportElement;
  }

  /**
   * Loads a fresh word list and resets all state/DOM/counters.
   * @param {string[]} newWords
   * @param {object} opts { extendable: boolean }
   * @param {object} cbs  { onFirstKeystroke, onChange, onComplete, onNeedMoreWords, onWordAdvance }
   */
  function load(newWords, opts, cbs) {
    words = newWords.slice();
    wordMeta = buildWordMeta(words);
    currentWordIndex = 0;
    correctChars = 0;
    incorrectChars = 0;
    started = false;
    finished = false;
    allowExtension = !!(opts && opts.extendable);
    callbacks = cbs || {};

    trackEl.innerHTML = '';
    trackEl.style.transform = 'translate(0px, 0px)';
    const frag = document.createDocumentFragment();
    wordMeta.forEach((w) => frag.appendChild(w.el));
    trackEl.appendChild(frag);

    wordMeta[0].el.classList.add('is-active-word');
    updateCaret();
  }

  /** Appends more words to the end of the current test (used by "words" mode). */
  function appendWords(moreWords) {
    const startIndex = words.length;
    words = words.concat(moreWords);
    const newMeta = buildWordMeta(moreWords);
    const frag = document.createDocumentFragment();
    newMeta.forEach((w) => frag.appendChild(w.el));
    trackEl.appendChild(frag);
    wordMeta = wordMeta.concat(newMeta);
    return startIndex;
  }

  function currentWord() {
    return wordMeta[currentWordIndex];
  }

  function renderCurrentWord() {
    const meta = currentWord();
    const typed = meta.typed;
    const target = meta.target;

    // Regular positions (within target length)
    for (let i = 0; i < meta.letterSpans.length; i++) {
      const span = meta.letterSpans[i];
      span.classList.remove('is-correct', 'is-incorrect');
      if (i < typed.length) {
        span.classList.add(typed[i] === target[i] ? 'is-correct' : 'is-incorrect');
      }
    }

    // Extra characters beyond target length
    const extraCount = Math.max(0, typed.length - target.length);
    while (meta.extraSpans.length < extraCount) {
      const span = document.createElement('span');
      span.className = 'letter is-extra';
      meta.el.appendChild(span);
      meta.extraSpans.push(span);
    }
    while (meta.extraSpans.length > extraCount) {
      const span = meta.extraSpans.pop();
      span.remove();
    }
    for (let i = 0; i < extraCount; i++) {
      meta.extraSpans[i].textContent = typed[target.length + i];
    }
  }

  function updateCaret() {
    const meta = currentWord();
    if (!meta) return;
    const typedLen = meta.typed.length;
    let anchorRect;
    const viewportRect = viewportEl.getBoundingClientRect();

    if (typedLen < meta.letterSpans.length) {
      anchorRect = meta.letterSpans[typedLen].getBoundingClientRect();
    } else if (meta.extraSpans.length > 0) {
      const lastExtra = meta.extraSpans[meta.extraSpans.length - 1];
      const r = lastExtra.getBoundingClientRect();
      anchorRect = { left: r.right, top: r.top };
    } else if (meta.letterSpans.length > 0) {
      const lastLetter = meta.letterSpans[meta.letterSpans.length - 1];
      const r = lastLetter.getBoundingClientRect();
      anchorRect = { left: r.right, top: r.top };
    } else {
      anchorRect = meta.el.getBoundingClientRect();
    }

    const x = anchorRect.left - viewportRect.left;
    const y = anchorRect.top - viewportRect.top;
    caretEl.style.transform = `translate(${x}px, ${y}px)`;
  }

  function updateScroll() {
    const meta = currentWord();
    if (!meta) return;
    const styles = window.getComputedStyle(trackEl);
    const lineHeight = parseFloat(styles.lineHeight) || (parseFloat(styles.fontSize) * 1.7);
    const lineIndex = Math.round(meta.el.offsetTop / lineHeight);
    const topLineIndex = Math.max(0, lineIndex - 1);
    trackEl.style.transform = `translate(0px, ${-topLineIndex * lineHeight}px)`;
  }

  function emitChange() {
    if (typeof callbacks.onChange === 'function') {
      callbacks.onChange(getLiveStats());
    }
  }

  function maybeRequestMoreWords() {
    if (!allowExtension) return;
    const remaining = words.length - 1 - currentWordIndex;
    if (remaining < 8 && typeof callbacks.onNeedMoreWords === 'function') {
      callbacks.onNeedMoreWords();
    }
  }

  function finalizeCurrentWordAndAdvance() {
    const meta = currentWord();
    meta.finalized = true;
    meta.el.classList.remove('is-active-word');

    const isLastWord = currentWordIndex === wordMeta.length - 1;
    if (isLastWord && !allowExtension) {
      finished = true;
      updateCaret();
      completeTest();
      return;
    }

    currentWordIndex++;
    if (wordMeta[currentWordIndex]) {
      wordMeta[currentWordIndex].el.classList.add('is-active-word');
    }
    if (typeof callbacks.onWordAdvance === 'function') callbacks.onWordAdvance(currentWordIndex);
    updateScroll();
    updateCaret();
    maybeRequestMoreWords();
  }

  function completeTest() {
    if (finished && typeof callbacks.onComplete === 'function') {
      callbacks.onComplete(getLiveStats());
    }
  }

  /**
   * Handles a full text value for the current word coming from the hidden
   * input's `input` event (covers typing AND backspace within the word).
   */
  function setCurrentWordTyped(newValue) {
    if (finished) return;

    const meta = currentWord();
    const previousLength = meta.typed.length;

    if (!started && newValue.length > 0) {
      started = true;
      if (typeof callbacks.onFirstKeystroke === 'function') callbacks.onFirstKeystroke();
    }

    // Only newly-added characters count toward cumulative stats; deletions
    // (newValue shorter than before) never subtract from the counters.
    if (newValue.length > previousLength) {
      for (let i = previousLength; i < newValue.length; i++) {
        const typedChar = newValue[i];
        const targetChar = meta.target[i]; // undefined for extra characters
        const isCorrect = typedChar === targetChar;
        if (isCorrect) {
          correctChars++;
        } else {
          incorrectChars++;
        }
        if (typeof callbacks.onKeystroke === 'function') callbacks.onKeystroke(isCorrect);
      }
    }

    meta.typed = newValue;
    renderCurrentWord();
    updateCaret();
    emitChange();

    const target = meta.target;
    const isLastWord = currentWordIndex === wordMeta.length - 1;
    if (isLastWord && !allowExtension && newValue.length >= target.length && newValue.length > 0) {
      finalizeCurrentWordAndAdvance();
    }
  }

  /** Space was pressed: finalize the current word (ignored if word is empty). */
  function submitWord() {
    if (finished) return false;
    const meta = currentWord();
    if (meta.typed.length === 0) return false; // ignore stray spaces
    finalizeCurrentWordAndAdvance();
    return true;
  }

  /**
   * Backspace pressed while the current word's typed value is already
   * empty: step back into the previous word for correction, restoring what
   * was typed there. Returns the restored value (caller syncs the hidden
   * input), or null if there is no previous word to step back into.
   */
  function stepBackToPreviousWord() {
    if (finished || currentWordIndex === 0) return null;
    const prevMeta = wordMeta[currentWordIndex - 1];

    currentWord().el.classList.remove('is-active-word');
    currentWordIndex--;
    prevMeta.finalized = false;
    prevMeta.el.classList.add('is-active-word');

    updateScroll();
    updateCaret();
    emitChange();
    return prevMeta.typed;
  }

  function forceComplete() {
    if (finished) return;
    finished = true;
    completeTest();
  }

  function getLiveStats() {
    const totalChars = correctChars + incorrectChars;
    const wordsTyped = currentWordIndex + (currentWord() && currentWord().typed.length > 0 ? 1 : 0);
    return {
      correctChars,
      incorrectChars,
      totalChars,
      wordsTyped,
      currentWordIndex,
      isFinished: finished,
    };
  }

  function isStarted() { return started; }
  function isFinished() { return finished; }

  return {
    init,
    load,
    appendWords,
    setCurrentWordTyped,
    submitWord,
    stepBackToPreviousWord,
    forceComplete,
    getLiveStats,
    isStarted,
    isFinished,
  };
})();
