/**
 * textGenerator.js
 * ---------------------------------------------------------------------------
 * Source of typing content. Kept deliberately isolated from the typing
 * engine: everything here could later be swapped for `fetch('/api/texts')`
 * or a database-backed passage table without touching any other file, as
 * long as `TextGenerator.getPassage()` / `getWords()` keep returning a plain
 * array of word strings.
 */

const TextGenerator = (function () {

  // 32 short passages, 1-3 natural sentences each, varying lengths.
  const PASSAGES = [
    "The quick brown fox jumps over the lazy dog.",
    "A gentle breeze drifted through the open window as the candle flickered softly.",
    "Practice does not make perfect. Only perfect practice makes perfect.",
    "She sells seashells by the seashore, and the shells she sells are surely seashells.",
    "The old library smelled of dust and paper, a comforting reminder of quieter times.",
    "Rain tapped gently against the roof while the city below carried on, unaware of the storm.",
    "Every morning he walked to the same small cafe and ordered the same simple breakfast.",
    "Technology moves quickly, but wisdom often takes its time to catch up.",
    "The mountain trail wound upward through pine trees, disappearing into a thin morning fog.",
    "A single spark, if left unattended, can grow into a fire that consumes everything nearby.",
    "Curiosity is the engine of discovery, driving us to ask questions we never thought to ask before.",
    "The chef added a pinch of salt, tasted the sauce, and smiled with quiet satisfaction.",
    "Long after the concert ended, the melody continued to play softly in her mind.",
    "The old clock in the hallway ticked steadily, indifferent to the chaos of the household.",
    "Somewhere between the first draft and the final version, the story finally found its voice.",
    "The astronauts watched the earth shrink into a small blue marble against the darkness of space.",
    "A well-placed comma can change the entire meaning of a sentence.",
    "The market was full of color and noise, vendors calling out prices over the din of the crowd.",
    "He learned more from his failures than he ever did from his successes.",
    "The river carved its path through solid rock over thousands of patient years.",
    "Good habits are built one small, unremarkable decision at a time.",
    "The garden bloomed early that year, catching everyone in the neighborhood by surprise.",
    "Silence, she realized, could be louder than any argument.",
    "The train pulled away from the station just as the first snowflakes began to fall.",
    "A map is useful only if you are willing to admit you might be lost.",
    "The children built a fort out of blankets and declared it the safest place on earth.",
    "Great ideas rarely arrive fully formed; they are shaped through revision and doubt.",
    "The lighthouse stood alone on the cliff, its beam sweeping steadily across the dark water.",
    "It is easier to stay in motion than it is to start moving again after stopping.",
    "The scientist double-checked her data before allowing herself to believe the results.",
    "Somewhere in the city, a street musician played a tune that nobody would remember by morning.",
    "The best conversations often happen when nobody is trying too hard to have one.",
  ];

  // Common, short, typeable English words for "words" mode.
  const WORD_LIST = [
    "time", "person", "year", "way", "day", "thing", "man", "world", "life", "hand",
    "part", "child", "eye", "woman", "place", "work", "week", "case", "point", "government",
    "company", "number", "group", "problem", "fact", "water", "money", "story", "month", "book",
    "friend", "power", "table", "market", "study", "system", "moment", "word", "house", "family",
    "country", "student", "idea", "school", "night", "picture", "music", "field", "level", "office",
    "door", "health", "art", "history", "party", "result", "change", "morning", "reason", "research",
    "girl", "guy", "food", "war", "issue", "side", "kind", "head", "letter", "car",
    "city", "community", "name", "president", "team", "order", "law", "bird", "movie", "value",
    "paper", "space", "future", "quality", "wall", "amount", "voice", "act", "town", "energy",
    "answer", "baby", "boy", "road", "wife", "police", "mind", "player", "step", "front",
    "simple", "quick", "bright", "clear", "quiet", "strong", "gentle", "brave", "early", "modern",
    "single", "final", "common", "sudden", "distant", "steady", "honest", "eager", "calm", "fresh",
    "read", "write", "speak", "think", "learn", "build", "create", "listen", "travel", "explore",
    "gather", "settle", "wander", "arrive", "depart", "climb", "follow", "search", "remember", "imagine",
  ];

  function shuffleCopy(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Returns a random passage split into an array of words. Punctuation
   * stays attached to its word (typingEngine treats punctuation as regular
   * characters), matching how people actually type prose.
   */
  function getPassage() {
    const passage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
    return passage.split(' ');
  }

  /**
   * Returns `count` random words (no immediate repeats) for "words" mode.
   */
  function getWords(count) {
    const words = [];
    let lastWord = null;
    for (let i = 0; i < count; i++) {
      let candidate;
      do {
        candidate = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
      } while (candidate === lastWord && WORD_LIST.length > 1);
      lastWord = candidate;
      words.push(candidate);
    }
    return words;
  }

  return {
    getPassage,
    getWords,
    shuffleCopy,
    _PASSAGE_COUNT: PASSAGES.length,
  };
})();
