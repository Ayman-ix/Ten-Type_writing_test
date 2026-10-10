/**
 * app.js
 * ---------------------------------------------------------------------------
 * Wires together storage/api/textGenerator/typingEngine/timer/statistics and
 * drives the DOM. This is the only file that touches the DOM directly.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------

  const navLinks = document.querySelectorAll('.nav-link[data-view]');
  const views = {
    test: document.getElementById('view-test'),
    stats: document.getElementById('view-stats'),
    about: document.getElementById('view-about'),
  };

  const themeToggle = document.getElementById('themeToggle');
  const settingsToggle = document.getElementById('settingsToggle');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const settingsDrawer = document.getElementById('settingsDrawer');

  const modeChips = document.querySelectorAll('.chip[data-mode]');
  const durationChips = document.querySelectorAll('.chip[data-duration]');
  const customDurationInput = document.getElementById('customDurationInput');
  const customChip = document.querySelector('.chip-custom');

  const testConfig = document.getElementById('testConfig');
  const statBar = document.getElementById('statBar');
  const statWpmEl = document.getElementById('statWpm');
  const statAccuracyEl = document.getElementById('statAccuracy');
  const statMistakesEl = document.getElementById('statMistakes');
  const statTimeEl = document.getElementById('statTime');

  const typingStage = document.getElementById('typingStage');
  const typingArea = document.getElementById('typingArea');
  const typingTrack = document.getElementById('typingTrack');
  const caretEl = document.getElementById('caret');
  const hiddenInput = document.getElementById('hiddenInput');
  const typingHint = document.getElementById('typingHint');

  const liveTestActions = document.getElementById('liveTestActions');
  const restartBtn = document.getElementById('restartBtn');

  const resultsSection = document.getElementById('results');
  const resultsBadge = document.getElementById('resultsBadge');
  const resultWpmEl = document.getElementById('resultWpm');
  const resultAccuracyEl = document.getElementById('resultAccuracy');
  const resultRawWpmEl = document.getElementById('resultRawWpm');
  const resultCorrectEl = document.getElementById('resultCorrect');
  const resultIncorrectEl = document.getElementById('resultIncorrect');
  const resultWordsEl = document.getElementById('resultWords');
  const resultTimeEl = document.getElementById('resultTime');
  const tryAgainBtn = document.getElementById('tryAgainBtn');

  const summaryEls = {
    bestWpm: document.getElementById('sumBestWpm'),
    avgWpm: document.getElementById('sumAvgWpm'),
    bestAccuracy: document.getElementById('sumBestAccuracy'),
    testsCompleted: document.getElementById('sumTestsCompleted'),
    totalWords: document.getElementById('sumTotalWords'),
    totalChars: document.getElementById('sumTotalChars'),
  };
  const historyBody = document.getElementById('historyBody');
  const historyEmpty = document.getElementById('historyEmpty');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  const themeSegments = document.querySelectorAll('[data-setting-theme]');
  const durationSegments = document.querySelectorAll('[data-setting-duration]');
  const soundSegments = document.querySelectorAll('[data-setting-sound]');
  const fontSizeRange = document.getElementById('fontSizeRange');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');

  const liveRegion = document.getElementById('liveRegion');

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  const FONT_SIZE_STEPS = {
    1: { rem: 1.05, label: 'small' },
    2: { rem: 1.25, label: 'medium-small' },
    3: { rem: 1.5, label: 'medium' },
    4: { rem: 1.8, label: 'large' },
    5: { rem: 2.1, label: 'x-large' },
  };

  let settings = Storage.getSettings();
  let currentMode = 'quote';       // 'quote' | 'words'
  let currentDuration = settings.defaultDuration || 30;

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------

  function announce(message) {
    liveRegion.textContent = message;
  }

  function formatSeconds(s) {
    return `${Math.max(0, Math.round(s))}s`;
  }

  function focusHiddenInput() {
    hiddenInput.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------
  // View switching (Typing test / Statistics / About)
  // ---------------------------------------------------------------------

  function showView(name) {
    Object.keys(views).forEach((key) => {
      views[key].hidden = key !== name;
    });
    navLinks.forEach((link) => {
      const isActive = link.dataset.view === name;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (name === 'stats') renderStatisticsView();
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', () => showView(link.dataset.view));
  });

  document.querySelector('.logo').addEventListener('click', (e) => {
    e.preventDefault();
    showView('test');
  });

  // ---------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------

  function applyTheme(theme, { persist = true } = {}) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
    themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    themeSegments.forEach((btn) => {
      const active = btn.dataset.settingTheme === theme;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    if (persist) {
      settings.theme = theme;
      Storage.saveSettings(settings);
    }
  }

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  themeSegments.forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.settingTheme));
  });

  // ---------------------------------------------------------------------
  // Font size
  // ---------------------------------------------------------------------

  function applyFontSize(step, { persist = true } = {}) {
    const config = FONT_SIZE_STEPS[step] || FONT_SIZE_STEPS[3];
    document.documentElement.style.setProperty('--typing-size', `${config.rem}rem`);
    fontSizeRange.value = String(step);
    fontSizeValue.textContent = config.label;
    if (persist) {
      settings.fontSizeStep = Number(step);
      Storage.saveSettings(settings);
    }
  }

  fontSizeRange.addEventListener('input', () => applyFontSize(fontSizeRange.value));

  // ---------------------------------------------------------------------
  // Sound
  // ---------------------------------------------------------------------

  function applySound(enabled, { persist = true } = {}) {
    Sound.setEnabled(enabled);
    soundSegments.forEach((btn) => {
      const active = (btn.dataset.settingSound === 'on') === enabled;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    if (persist) {
      settings.soundEnabled = enabled;
      Storage.saveSettings(settings);
    }
  }

  soundSegments.forEach((btn) => {
    btn.addEventListener('click', () => applySound(btn.dataset.settingSound === 'on'));
  });

  // ---------------------------------------------------------------------
  // Default duration (settings drawer)
  // ---------------------------------------------------------------------

  function applyDefaultDurationSetting(value, { persist = true } = {}) {
    durationSegments.forEach((btn) => {
      const active = Number(btn.dataset.settingDuration) === Number(value);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    if (persist) {
      settings.defaultDuration = Number(value);
      Storage.saveSettings(settings);
    }
  }

  durationSegments.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyDefaultDurationSetting(btn.dataset.settingDuration);
      setDuration(btn.dataset.settingDuration);
    });
  });

  // ---------------------------------------------------------------------
  // Settings drawer open/close
  // ---------------------------------------------------------------------

  function openSettings() {
    settingsDrawer.hidden = false;
    drawerOverlay.hidden = false;
    settingsToggle.setAttribute('aria-expanded', 'true');
    closeSettingsBtn.focus();
  }

  function closeSettings() {
    settingsDrawer.hidden = true;
    drawerOverlay.hidden = true;
    settingsToggle.setAttribute('aria-expanded', 'false');
    settingsToggle.focus();
  }

  function isSettingsOpen() {
    return !settingsDrawer.hidden;
  }

  settingsToggle.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  drawerOverlay.addEventListener('click', closeSettings);

  resetSettingsBtn.addEventListener('click', () => {
    settings = Storage.resetSettings();
    applySettingsToUI(settings);
    announce('Settings reset to default.');
  });

  function applySettingsToUI(s) {
    applyTheme(s.theme, { persist: false });
    applyFontSize(s.fontSizeStep, { persist: false });
    applySound(s.soundEnabled, { persist: false });
    applyDefaultDurationSetting(s.defaultDuration, { persist: false });
  }

  // ---------------------------------------------------------------------
  // Mode & duration selection
  // ---------------------------------------------------------------------

  function setMode(mode) {
    currentMode = mode;
    modeChips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.mode === mode));
    startNewTest();
  }

  function getCustomDurationValue() {
    const raw = Number(customDurationInput.value);
    if (!isFinite(raw) || raw <= 0) return 30;
    return Math.min(600, Math.max(5, Math.round(raw)));
  }

  function setDuration(durationValue) {
    const isCustom = durationValue === 'custom';
    durationChips.forEach((chip) => {
      const active = isCustom ? chip.classList.contains('chip-custom') : chip.dataset.duration === String(durationValue);
      chip.classList.toggle('is-active', active);
    });
    currentDuration = isCustom ? getCustomDurationValue() : Number(durationValue);
    startNewTest();
  }

  modeChips.forEach((chip) => {
    chip.addEventListener('click', () => setMode(chip.dataset.mode));
  });

  durationChips.forEach((chip) => {
    if (chip.dataset.duration === 'custom') return; // handled separately below
    chip.addEventListener('click', () => setDuration(chip.dataset.duration));
  });

  customDurationInput.addEventListener('click', (e) => e.stopPropagation());
  customChip.addEventListener('click', () => setDuration('custom'));
  customDurationInput.addEventListener('change', () => {
    if (customChip.classList.contains('is-active')) setDuration('custom');
  });

  // ---------------------------------------------------------------------
  // Typing engine wiring
  // ---------------------------------------------------------------------

  TypingEngine.init({ trackElement: typingTrack, caretElement: caretEl, viewportElement: typingArea });

  function generateInitialWords(mode) {
    if (mode === 'words') {
      return { words: TextGenerator.getWords(60), extendable: true };
    }
    return { words: TextGenerator.getPassage(), extendable: false };
  }

  function resetStatBar() {
    statWpmEl.textContent = '0';
    statAccuracyEl.textContent = '100%';
    statMistakesEl.textContent = '0';
    statTimeEl.textContent = formatSeconds(currentDuration);
  }

  function startNewTest() {
    TestTimer.arm(currentDuration, { onTick: handleTimerTick, onEnd: handleTimerEnd });

    const { words, extendable } = generateInitialWords(currentMode);
    TypingEngine.load(words, { extendable }, {
      onFirstKeystroke: handleFirstKeystroke,
      onChange: handleEngineChange,
      onComplete: handleTestComplete,
      onNeedMoreWords: handleNeedMoreWords,
      onKeystroke: handleKeystrokeSound,
    });

    hiddenInput.value = '';
    hiddenInput.disabled = false;
    resetStatBar();

    resultsSection.hidden = true;
    testConfig.hidden = false;
    statBar.hidden = false;
    typingStage.hidden = false;
    liveTestActions.hidden = false;

    typingHint.classList.remove('is-hidden');
    typingArea.classList.remove('is-focused');
  }

  function handleNeedMoreWords() {
    TypingEngine.appendWords(TextGenerator.getWords(30));
  }

  function handleFirstKeystroke() {
    TestTimer.start();
    typingHint.classList.add('is-hidden');
  }

  function handleKeystrokeSound(isCorrect) {
    if (isCorrect) Sound.keyCorrect();
    else Sound.keyIncorrect();
  }

  function handleEngineChange(liveStats) {
    const elapsed = TestTimer.hasStarted() ? TestTimer.getElapsedSeconds() : 0;
    const wpm = Statistics.calculateWpm(liveStats.correctChars, elapsed);
    const accuracy = Statistics.calculateAccuracy(liveStats.correctChars, liveStats.totalChars);

    statWpmEl.textContent = String(Math.round(wpm));
    statAccuracyEl.textContent = `${Math.round(accuracy)}%`;
    statMistakesEl.textContent = String(liveStats.incorrectChars);
  }

  function handleTimerTick(elapsedSeconds, remainingSeconds) {
    statTimeEl.textContent = formatSeconds(remainingSeconds);
    // Keep WPM ticking up even between keystrokes.
    const liveStats = TypingEngine.getLiveStats();
    handleEngineChange(liveStats);
  }

  function handleTimerEnd() {
    TypingEngine.forceComplete();
  }

  function handleTestComplete(finalStats) {
    const elapsedSeconds = TestTimer.getElapsedSeconds();
    TestTimer.stop();
    hiddenInput.disabled = true;
    hiddenInput.blur();

    const result = Statistics.buildResultSummary({
      mode: currentMode,
      duration: currentDuration,
      correctChars: finalStats.correctChars,
      incorrectChars: finalStats.incorrectChars,
      wordsTyped: finalStats.wordsTyped,
      elapsedSeconds,
    });

    Sound.testComplete();

    Api.submitTestResult(result).then(({ isNewBest }) => {
      renderResults(result, isNewBest);
      announce(`Test complete. ${result.wpm} words per minute, ${result.accuracy}% accuracy.`);
    });
  }

  function renderResults(result, isNewBest) {
    testConfig.hidden = true;
    statBar.hidden = true;
    typingStage.hidden = true;
    liveTestActions.hidden = true;

    resultsBadge.hidden = !isNewBest;
    resultWpmEl.textContent = String(result.wpm);
    resultAccuracyEl.textContent = `${result.accuracy}%`;
    resultRawWpmEl.textContent = String(result.rawWpm);
    resultCorrectEl.textContent = String(result.correctChars);
    resultIncorrectEl.textContent = String(result.incorrectChars);
    resultWordsEl.textContent = String(result.wordsTyped);
    resultTimeEl.textContent = formatSeconds(result.elapsedSeconds);

    resultsSection.hidden = false;
  }

  // ---------------------------------------------------------------------
  // Hidden input <-> typing engine
  // ---------------------------------------------------------------------

  function handleInput() {
    let value = hiddenInput.value.replace(/\n/g, '');

    // Handle one or more completed words in a single input event (fast
    // typing, IME commits, or pasted text all land here identically).
    while (value.indexOf(' ') !== -1) {
      const spaceIndex = value.indexOf(' ');
      const wordPart = value.slice(0, spaceIndex);
      TypingEngine.setCurrentWordTyped(wordPart);
      TypingEngine.submitWord();
      value = value.slice(spaceIndex + 1);
    }

    TypingEngine.setCurrentWordTyped(value);
    hiddenInput.value = value;
  }

  hiddenInput.addEventListener('input', handleInput);

  hiddenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && hiddenInput.value.length === 0) {
      const restored = TypingEngine.stepBackToPreviousWord();
      if (restored !== null) {
        e.preventDefault();
        hiddenInput.value = restored;
      }
    }
  });

  hiddenInput.addEventListener('focus', () => {
    typingArea.classList.add('is-focused');
  });
  hiddenInput.addEventListener('blur', () => {
    typingArea.classList.remove('is-focused');
  });

  typingArea.addEventListener('click', () => {
    if (!hiddenInput.disabled) focusHiddenInput();
  });
  typingArea.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement !== hiddenInput) {
      e.preventDefault();
      focusHiddenInput();
    }
  });

  // ---------------------------------------------------------------------
  // Restart controls
  // ---------------------------------------------------------------------

  function restart() {
    startNewTest();
    focusHiddenInput();
  }

  restartBtn.addEventListener('click', restart);
  tryAgainBtn.addEventListener('click', restart);

  // ---------------------------------------------------------------------
  // Global keyboard shortcuts
  // ---------------------------------------------------------------------

  function trapFocusInDrawer(e) {
    const focusable = settingsDrawer.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function isEngagedWithTypingTest() {
    if (views.test.hidden) return false;
    const activeEl = document.activeElement;
    return activeEl === hiddenInput || activeEl === typingArea || activeEl === document.body || activeEl === restartBtn;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isSettingsOpen()) {
        closeSettings();
      } else if (!views.test.hidden) {
        e.preventDefault();
        restart();
      }
      return;
    }

    if (e.key === 'Tab' && isSettingsOpen()) {
      trapFocusInDrawer(e);
      return;
    }

    // Tab restarts the test, but only when the user is actually engaged
    // with it — otherwise ordinary keyboard navigation of the header,
    // settings drawer, and other views would be hijacked.
    if (e.key === 'Tab' && isEngagedWithTypingTest()) {
      e.preventDefault();
      restart();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !views.test.hidden) {
      e.preventDefault();
      restart();
    }
  });

  // ---------------------------------------------------------------------
  // Statistics view
  // ---------------------------------------------------------------------

  function renderStatisticsView() {
    Api.getStatistics().then((summary) => {
      summaryEls.bestWpm.textContent = summary.bestWpm === null ? '–' : summary.bestWpm;
      summaryEls.avgWpm.textContent = summary.avgWpm === null ? '–' : summary.avgWpm;
      summaryEls.bestAccuracy.textContent = summary.bestAccuracy === null ? '–' : `${summary.bestAccuracy}%`;
      summaryEls.testsCompleted.textContent = summary.testsCompleted;
      summaryEls.totalWords.textContent = summary.totalWords;
      summaryEls.totalChars.textContent = summary.totalChars;
    });

    Api.getTestHistory().then((history) => {
      historyBody.innerHTML = '';
      historyEmpty.hidden = history.length > 0;

      history.slice(0, 25).forEach((entry) => {
        const row = document.createElement('tr');
        const when = new Date(entry.timestamp);
        const whenLabel = isFinite(when.getTime())
          ? when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          : '–';

        row.innerHTML = `
          <td>${whenLabel}</td>
          <td>${entry.mode}</td>
          <td>${entry.wpm}</td>
          <td>${entry.accuracy}%</td>
          <td>${entry.duration}s</td>
        `;
        historyBody.appendChild(row);
      });
    });
  }

  clearHistoryBtn.addEventListener('click', () => {
    Storage.clearHistory();
    renderStatisticsView();
    announce('Test history cleared.');
  });

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------

  function boot() {
    applySettingsToUI(settings);
    currentDuration = settings.defaultDuration || 30;
    setDuration(currentDuration); // also triggers the first startNewTest()

    if (!Storage.isAvailable()) {
      announce('Local storage is unavailable in this browser, so results will not be saved after you leave the page.');
    }
  }

  boot();
})();
