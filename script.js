/* ═══════════════════════════════════════════════════════
   Pi Explorer — script.js
   Floating digits, timeline, nav, Pi memorization game
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ─── Pi digits (1,000 after the decimal point; checked against mpmath) ─── */
const PI_DIGITS =
  '14159265358979323846264338327950288419716939937510' +
  '58209749445923078164062862089986280348253421170679' +
  '82148086513282306647093844609550582231725359408128' +
  '48111745028410270193852110555964462294895493038196' +
  '44288109756659334461284756482337867831652712019091' +
  '45648566923460348610454326648213393607260249141273' +
  '72458700660631558817488152092096282925409171536436' +
  '78925903600113305305488204665213841469519415116094' +
  '33057270365759591953092186117381932611793105118548' +
  '07446237996274956735188575272489122793818301194912' +
  '98336733624406566430860213949463952247371907021798' +
  '60943702770539217176293176752384674818467669405132' +
  '00056812714526356082778577134275778960917363717872' +
  '14684409012249534301465495853710507922796892589235' +
  '42019956112129021960864034418159813629774771309960' +
  '51870721134999999837297804995105973173281609631859' +
  '50244594553469083026425223082533446850352619311881' +
  '71010003137838752886587533208381420617177669147303' +
  '59825349042875546873115956286388235378759375195778' +
  '18577805321712268066130019278766111959092164201989';
const TOTAL = PI_DIGITS.length;

/* ─── Milestones (absolute digit counts) ───
   Challenge runs show all of them; Practice runs only show the ones marked
   anyMode, and only if the run started before `from` (so you typed through it). */
const MILESTONES = [
  { at:    5, msg: '☥ Five digits! That\'s already more precise than any value the ancient Egyptians used.' },
  { at:   10, msg: '⚡ 10 digits! You now know more Pi than most people on Earth.' },
  { at:   20, msg: '🔺 20 digits! The Great Pyramid builders would be astonished.' },
  { at:   31, msg: '🌙 31 digits! Nearly double the 16 decimals Al-Kashi computed in 1424.' },
  { at:   50, msg: '🚀 50 digits! NASA only needs 15 to fly to other planets — you\'ve tripled that!' },
  { at:   75, msg: '⭐ 75 digits! You\'re entering champion territory.' },
  { at:  100, msg: '🏆 100 DIGITS!! You are a true Pi Master!' },
  { at:  150, msg: '∞ 150 digits!! You would win most Pi competitions on Earth!' },
  { at:  200, msg: '👑 200 digits! Hardly anyone on Earth gets this far.' },
  { at:  300, msg: '🏛️ 300 digits! Archimedes would want to shake your hand.' },
  { at:  500, msg: '🔱 500 digits — halfway to a thousand!' },
  { at:  767, from: 761, anyMode: true,
    msg: '9️⃣ The Feynman Point! Six 9s in a row (digits 762–767) — right where Feynman joked he\'d stop.' },
];

/* ─── Storage (may be blocked in private windows) ─── */
const BEST_KEY = 'piExplorerBest';
function loadBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; }
  catch { return 0; }
}
function saveBest(n) {
  try { localStorage.setItem(BEST_KEY, n); } catch { /* not persisted */ }
}

/* Local calendar date as YYYY-MM-DD (offset in days, e.g. -1 = yesterday) */
function localISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* Date the personal best was set, stored as local YYYY-MM-DD */
const BEST_DATE_KEY = 'piExplorerBestDate';
function loadBestDate() {
  try { return localStorage.getItem(BEST_DATE_KEY) || ''; }
  catch { return ''; }
}
function saveBestDate() {
  const iso = localISO();
  bestDate = iso;
  try { localStorage.setItem(BEST_DATE_KEY, iso); } catch { /* not persisted */ }
}
function formatBestDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Daily streak: { last: 'YYYY-MM-DD' of the last day played, count: days in a row } */
const STREAK_KEY = 'piExplorerStreak';
function loadStreak() {
  try {
    const s = JSON.parse(localStorage.getItem(STREAK_KEY) || 'null');
    if (s && typeof s.last === 'string' && Number.isInteger(s.count) && s.count > 0) return s;
  } catch { /* fall through */ }
  return { last: '', count: 0 };
}
function saveStreak() {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(streak)); } catch { /* not persisted */ }
}

/* Groups of 5 (index = first digit / 5) slipped on in Practice; cleared by drilling */
const MISSED_KEY = 'piExplorerMissed';
function loadMissed() {
  try {
    const arr = JSON.parse(localStorage.getItem(MISSED_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr.filter(n => Number.isInteger(n) && n >= 0 && n < 200) : []);
  } catch { return new Set(); }
}
function saveMissed() {
  try { localStorage.setItem(MISSED_KEY, JSON.stringify([...missedGroups])); } catch { /* not persisted */ }
}

/* ─── Game state ─── */
let mode        = 'challenge';  /* 'challenge' | 'practice' */
let active      = false;
let start       = 0;            /* index of the first digit in this run */
let pos         = 0;            /* index of the next digit to type */
let slips       = 0;            /* practice-mode mistakes */
let bestScore   = loadBest();
let bestDate    = loadBestDate();
let runStartBest = bestScore;   /* best before this run, to detect a true new record */
let mileSeen    = new Set();
let missedGroups = loadMissed();
let streak      = loadStreak();
let peeks       = 0;             /* practice: digits revealed with Peek this run */
let peekedPos   = -1;            /* index currently revealed by Peek, or -1 */
let clean       = 0;             /* practice: digits typed right without help */
let drill       = null;          /* { queue, hadSlip, cleared, timer } while drilling red groups */
let challengeInView = false;
let milestoneTimer = null;

/* ─── DOM references ─── */
const el = {
  typedDigits:  document.getElementById('typedDigits'),
  cursor:       document.getElementById('gameCursor'),
  currentScore: document.getElementById('currentScore'),
  personalBest: document.getElementById('personalBest'),
  bestDate:     document.getElementById('bestDate'),
  scoreLabel:   document.getElementById('scoreLabel'),
  bestLabel:    document.getElementById('bestLabel'),
  gameStatus:   document.getElementById('gameStatus'),
  gameMsg:      document.getElementById('gameMsg'),
  milestoneMsg: document.getElementById('milestoneMsg'),
  digitHint:    document.getElementById('digitHint'),
  startBtn:     document.getElementById('startBtn'),
  hiddenInput:  document.getElementById('hiddenInput'),
  displayArea:  document.getElementById('piDisplayArea'),
  refDigits:    document.getElementById('refDigits'),
  modeChallenge: document.getElementById('modeChallenge'),
  modePractice:  document.getElementById('modePractice'),
  practiceOpts:  document.getElementById('practiceOpts'),
  startSelect:   document.getElementById('startSelect'),
  drillBtn:      document.getElementById('drillBtn'),
  peekBtn:       document.getElementById('peekBtn'),
  peekDigit:     document.getElementById('peekDigit'),
  streak:        document.getElementById('streak'),
};

let refGroups = [];  /* one span per 5 digits */
let refRows   = [];  /* one row per 50 digits */

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
buildRefDigits();
buildStartSelect();
resetToIdle();

el.startBtn.addEventListener('click', () => (drill ? resetToIdle() : startGame()));
el.drillBtn.addEventListener('click', startDrill);
/* keep focus on the hidden input so the phone keyboard stays open */
el.peekBtn.addEventListener('mousedown', (e) => e.preventDefault());
el.peekBtn.addEventListener('click', peek);
renderStreak();
el.displayArea.addEventListener('click', () => {
  if (active) el.hiddenInput.focus({ preventScroll: true });
});
el.modeChallenge.addEventListener('click', () => setMode('challenge'));
el.modePractice.addEventListener('click',  () => setMode('practice'));
el.startSelect.addEventListener('change', resetToIdle);

/* Only capture digit keys while the challenge is on screen (or its input has focus),
   so typing a number elsewhere on the page doesn't hijack the reader */
new IntersectionObserver((entries) => {
  challengeInView = entries[0].isIntersecting;
}, { threshold: 0.3 }).observe(el.displayArea);

/* Keyboard input (desktop) */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (!challengeInView && document.activeElement !== el.hiddenInput) return;
  if ((e.key === 'p' || e.key === 'P') && canPeek()) {
    e.preventDefault();
    peek();
    return;
  }
  if (!/^[0-9]$/.test(e.key)) return;
  e.preventDefault();
  /* startGame() is synchronous, and preventDefault() above stops the key from
     also reaching the hidden input, so the digit can be processed straight away */
  if (!active) {
    if (drill) return;  /* short pause between drill groups */
    startGame();
  }
  processDigit(e.key);
});

/* Mobile: capture from hidden text input */
el.hiddenInput.addEventListener('input', function () {
  const val = this.value.replace(/\D/g, '');
  this.value = '';
  if (!active || !val) return;
  processDigit(val[val.length - 1]);
});

/* ═══════════════════════════════════════════
   MODE
   ═══════════════════════════════════════════ */
function setMode(m) {
  if (m === mode) return;
  mode = m;
  const practice = mode === 'practice';
  el.modeChallenge.classList.toggle('active', !practice);
  el.modePractice.classList.toggle('active', practice);
  el.modeChallenge.setAttribute('aria-pressed', String(!practice));
  el.modePractice.setAttribute('aria-pressed', String(practice));
  el.practiceOpts.hidden = !practice;
  resetToIdle();
}

/* Clear the board and wait for a new run in the current mode */
function resetToIdle() {
  if (drill) { clearTimeout(drill.timer); drill = null; }
  active = false;
  const practice = mode === 'practice';
  start = practice ? Number(el.startSelect.value) || 0 : 0;
  pos   = start;
  slips = 0;
  peeks = 0;
  clean = 0;
  clearPeek();

  el.typedDigits.innerHTML = '';
  showContext();
  el.cursor.style.display = 'inline';
  el.gameStatus.textContent = 'Ready';
  el.startBtn.textContent   = practice ? 'Start Practice' : 'Begin the Journey';
  el.digitHint.textContent  = practice
    ? `Starting at digit ${start + 1}. Press a digit key, or click Start Practice below`
    : 'Press any digit key, or click Begin below';

  hideMsg();
  hideMilestone();
  resetRef();
  scrollRefTo(start);
  updateStats();
  refreshDrillBtn();
}

/* ═══════════════════════════════════════════
   GAME FUNCTIONS
   ═══════════════════════════════════════════ */
function startGame() {
  resetToIdle();
  active   = true;
  mileSeen = new Set();
  runStartBest = bestScore;

  el.gameStatus.textContent = mode === 'practice' ? 'Practising' : 'Playing';
  el.digitHint.textContent  = start === 0
    ? 'Type the first digit after the decimal point…'
    : `Type digit ${start + 1}…`;
  if (mode === 'practice') el.digitHint.textContent += ' (stuck? press P or tap Peek)';
  el.startBtn.textContent   = 'Restart';
  refreshPeekBtn();

  el.hiddenInput.focus({ preventScroll: true });
}

function processDigit(d) {
  if (!active || pos >= TOTAL) return;
  recordActivity();
  const want = PI_DIGITS[pos];
  if (d === want)              correct(d);
  else if (mode === 'practice') slip(want);
  else                          wrong(want);
}

/* Practice runs that start mid-way show the 10 digits before as dimmed context */
function showContext() {
  if (start === 0) return;
  const from = Math.max(0, start - 10);
  if (from > 0) {
    const dots = document.createElement('span');
    dots.className = 'digit-context';
    dots.textContent = '…';
    el.typedDigits.appendChild(dots);
  }
  for (let i = from; i < start; i++) appendDigit(PI_DIGITS[i], 'digit-context', i);
}

function appendDigit(d, cls, i) {
  /* group spacing every 5 digits */
  if (i % 5 === 0 && el.typedDigits.childElementCount > 0) {
    const gap = document.createElement('span');
    gap.className = 'digit-gap';
    gap.innerHTML = '&thinsp;';
    el.typedDigits.appendChild(gap);
  }
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = d;
  el.typedDigits.appendChild(span);
  /* keep the newest digit in view once the display wraps */
  el.displayArea.scrollTop = el.displayArea.scrollHeight;
}

function correct(d) {
  const helped = peekedPos === pos;  /* typed after peeking: right, but not from memory */
  clearPeek();
  appendDigit(d, helped ? 'digit-peeked' : 'digit-ok', pos);
  markRef(pos, helped);
  if (helped) {
    missedGroups.add(Math.floor(pos / 5));
    saveMissed();
  } else {
    clean++;
  }
  pos++;
  if (drill) { drillStep(); return; }
  if (helped) refreshDrillBtn();

  if (mode === 'challenge' && pos > bestScore) {
    bestScore = pos;
    saveBest(bestScore);
    if (pos === runStartBest + 1) saveBestDate();  /* once per run, when the record is first beaten */
  }
  updateStats();
  el.digitHint.textContent = `Digit ${pos} ✓ — now type digit ${pos + 1}…`;

  checkMilestone(pos);
  if (pos >= TOTAL) allComplete();
}

/* Practice: show the right digit in red and carry on */
function slip(want) {
  clearPeek();
  slips++;
  appendDigit(want, 'digit-miss', pos);
  markRef(pos, true);
  missedGroups.add(Math.floor(pos / 5));
  saveMissed();
  pos++;
  shake();
  if (drill) { drill.hadSlip = true; drillStep(want); return; }
  refreshDrillBtn();
  updateStats();
  el.digitHint.textContent = `Oops — digit ${pos} is ${want}. Keep going with digit ${pos + 1}…`;

  checkMilestone(pos);
  if (pos >= TOTAL) allComplete();
}

function wrong(correctDigit) {
  active = false;
  el.gameStatus.textContent = 'Game Over';
  el.cursor.style.display   = 'none';
  shake();

  const scoreText = pos === 0
    ? 'The first digit after <strong>3.</strong> is…'
    : `You reached digit <strong>${pos}</strong>! Digit ${pos + 1} is…`;

  el.gameMsg.className = 'game-msg wrong';
  el.gameMsg.innerHTML =
    `<strong>Not quite!</strong> ${scoreText}` +
    `<span class="wrong-digit-reveal">${correctDigit}</span>` +
    (pos > runStartBest
      ? '🎉 That was a new personal best!'
      : '');
  if (pos > runStartBest && pos >= 5) celebrate(false);

  el.digitHint.textContent = 'Click "Try Again" or press a digit key to start over.';
  el.startBtn.textContent  = 'Try Again';
}

function allComplete() {
  active = false;
  el.gameStatus.textContent = 'Complete!';
  el.cursor.style.display   = 'none';
  el.gameMsg.className = 'game-msg best';
  if (mode === 'challenge') {
    el.gameMsg.innerHTML =
      '👑 <strong>INCREDIBLE!</strong> You\'ve recited all 1,000 digits of Pi without a single mistake!<br>You are the <em>Pi Explorer Supreme</em>!';
  } else {
    const typed = TOTAL - start;
    el.gameMsg.innerHTML = slips === 0
      ? `👑 <strong>Perfect practice!</strong> Digits ${start + 1}–1,000 with no slips. Time for a Challenge run?`
      : `<strong>Practice complete!</strong> ${typed - slips} of ${typed} digits right, ${slips} slip${slips === 1 ? '' : 's'}. The red groups below are the ones to study.`;
  }
  celebrate(true);
  refreshPeekBtn();
  el.digitHint.textContent = 'Click "Play Again" or press a digit key to start over.';
  el.startBtn.textContent  = 'Play Again';
}

function updateStats() {
  if (drill) {
    el.scoreLabel.textContent   = 'Groups Left';
    el.bestLabel.textContent    = 'Slips';
    el.currentScore.textContent = drill.queue.length;
    el.personalBest.textContent = slips;
    el.bestDate.textContent     = peekText();
  } else if (mode === 'practice') {
    el.scoreLabel.textContent   = 'Correct';
    el.bestLabel.textContent    = 'Slips';
    el.currentScore.textContent = clean;
    el.personalBest.textContent = slips;
    el.bestDate.textContent     = peekText();
  } else {
    el.scoreLabel.textContent   = 'Current Score';
    el.bestLabel.textContent    = 'Personal Best ✦';
    el.currentScore.textContent = pos;
    el.personalBest.textContent = bestScore;
    const when = bestScore > 0 && bestDate ? formatBestDate(bestDate) : '';
    el.bestDate.textContent     = when ? `set ${when}` : '';
  }
  refreshPeekBtn();
}

const peekText = () => (peeks ? `${peeks} peek${peeks === 1 ? '' : 's'}` : '');

function shake() {
  el.displayArea.classList.remove('shake');
  void el.displayArea.offsetWidth; /* reflow to restart animation */
  el.displayArea.classList.add('shake');
  setTimeout(() => el.displayArea.classList.remove('shake'), 500);
}

/* ═══════════════════════════════════════════
   DRILL — repeat each red group until it's typed perfectly
   ═══════════════════════════════════════════ */
function refreshDrillBtn() {
  const n = missedGroups.size;
  el.drillBtn.hidden = n === 0 || !!drill;
  el.drillBtn.textContent = `Drill my red groups (${n})`;
}

function startDrill() {
  resetToIdle();
  if (!missedGroups.size) return;
  drill = { queue: [...missedGroups].sort((a, b) => a - b), hadSlip: false, cleared: 0, timer: null };
  slips = 0;
  peeks = 0;
  hideMsg();
  el.startBtn.textContent = 'Stop Drill';
  refreshDrillBtn();
  nextDrillGroup();
}

function nextDrillGroup() {
  start = drill.queue[0] * 5;
  pos   = start;
  drill.hadSlip = false;
  clearPeek();
  el.typedDigits.innerHTML = '';
  showContext();
  el.cursor.style.display   = 'inline';
  el.gameStatus.textContent = 'Drilling';
  el.digitHint.textContent  = `Drill: type digits ${start + 1}–${start + 5}…`;
  scrollRefTo(start);
  active = true;
  updateStats();
  el.hiddenInput.focus({ preventScroll: true });
}

/* After each digit in a drill; `want` is set when it was a slip */
function drillStep(want) {
  if (pos < start + 5) {
    updateStats();
    el.digitHint.textContent = want
      ? `Oops — digit ${pos} is ${want}. Keep going…`
      : `Digit ${pos} ✓ — keep going…`;
    return;
  }
  /* group finished */
  active = false;
  const g = drill.queue.shift();
  if (drill.hadSlip) {
    drill.queue.push(g);
    el.digitHint.textContent = `Not quite — digits ${start + 1}–${start + 5} will come round again.`;
  } else {
    missedGroups.delete(g);
    saveMissed();
    refGroups[g].classList.remove('missed');
    refGroups[g].classList.add('lit');
    drill.cleared++;
    el.digitHint.textContent = `✓ Digits ${start + 1}–${start + 5} cleared!`;
  }
  updateStats();
  if (drill.queue.length) drill.timer = setTimeout(nextDrillGroup, 900);
  else finishDrill();
}

function finishDrill() {
  const n = drill.cleared;
  drill = null;
  pos = start; slips = 0; peeks = 0;
  el.gameStatus.textContent = 'Complete!';
  el.cursor.style.display   = 'none';
  el.gameMsg.className = 'game-msg best';
  el.gameMsg.innerHTML = `🎉 <strong>All red groups cleared!</strong> You drilled ${n} group${n === 1 ? '' : 's'} until ${n === 1 ? 'it was' : 'they were'} perfect.`;
  celebrate(true);
  el.startBtn.textContent  = 'Start Practice';
  el.digitHint.textContent = 'Pick a starting point, then press a digit key or click Start Practice.';
  updateStats();
  refreshDrillBtn();
}

/* ═══════════════════════════════════════════
   PEEK (Practice and Drill only)
   ═══════════════════════════════════════════ */
function canPeek() { return active && mode === 'practice'; }

function refreshPeekBtn() { el.peekBtn.hidden = !canPeek(); }

/* Show the next digit faintly; typing it then counts as helped, not remembered */
function peek() {
  if (!canPeek() || peekedPos === pos || pos >= TOTAL) return;
  peekedPos = pos;
  peeks++;
  if (drill) drill.hadSlip = true;  /* a peeked group has to come round again */
  el.peekDigit.textContent = PI_DIGITS[pos];
  el.digitHint.textContent = `Peek: digit ${pos + 1} is ${PI_DIGITS[pos]} — now type it.`;
  updateStats();
  el.hiddenInput.focus({ preventScroll: true });
}

function clearPeek() {
  peekedPos = -1;
  el.peekDigit.textContent = '';
}

/* ═══════════════════════════════════════════
   DAILY STREAK
   ═══════════════════════════════════════════ */
/* Called on every digit; does real work only on the first digit of a new day */
function recordActivity() {
  const today = localISO();
  if (streak.last === today) return;
  streak.count = streak.last === localISO(-1) ? streak.count + 1 : 1;
  streak.last  = today;
  saveStreak();
  renderStreak();
  if (streak.count > 1) showMilestone(`🔥 ${streak.count} days in a row! Come back tomorrow to make it ${streak.count + 1}.`);
}

function renderStreak() {
  const { last, count } = streak;
  let text = '';
  if (last === localISO()) {
    text = count === 1
      ? '🔥 Day 1 of your streak — come back tomorrow to keep it going'
      : `🔥 ${count}-day streak`;
  } else if (last === localISO(-1)) {
    text = `🔥 ${count}-day streak — play today to keep it going!`;
  }
  el.streak.textContent = text;
  el.streak.hidden = !text;
}

/* ═══════════════════════════════════════════
   MILESTONE SYSTEM
   ═══════════════════════════════════════════ */
function checkMilestone(count) {
  for (const m of MILESTONES) {
    if (count !== m.at || mileSeen.has(m.at)) continue;
    if (drill) return;
    if (mode === 'practice' && !(m.anyMode && start <= m.from)) continue;
    mileSeen.add(m.at);
    showMilestone(m.msg);
    celebrate(false);
    return;
  }
}

function showMilestone(msg) {
  el.milestoneMsg.textContent = msg;
  el.milestoneMsg.classList.add('visible');
  clearTimeout(milestoneTimer);
  milestoneTimer = setTimeout(() => {
    el.milestoneMsg.classList.remove('visible');
  }, 5000);
}
function hideMilestone() {
  clearTimeout(milestoneTimer);
  el.milestoneMsg.classList.remove('visible');
  el.milestoneMsg.textContent = '';
}
function hideMsg() {
  el.gameMsg.className  = 'game-msg';
  el.gameMsg.innerHTML  = '';
}

/* ═══════════════════════════════════════════
   CONFETTI (skipped when reduced motion is on)
   ═══════════════════════════════════════════ */
const CONFETTI_COLORS = ['#f0c840', '#c9a227', '#faf0c8', '#e8d5a8', '#1a9090', '#c0391b'];
let confettiCanvas = null, confettiParts = [], confettiRunning = false;

function celebrate(big) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!confettiCanvas) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'confetti-canvas';
    confettiCanvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(confettiCanvas);
  }
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width  = window.innerWidth * dpr;
  confettiCanvas.height = window.innerHeight * dpr;
  confettiCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);

  /* burst from the top centre of the digit display */
  const r = el.displayArea.getBoundingClientRect();
  const ox = r.left + r.width / 2, oy = Math.max(40, r.top);
  const n = big ? 160 : 60;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;  /* mostly upward */
    const v = (big ? 9 : 6) + Math.random() * (big ? 8 : 5);
    confettiParts.push({
      x: ox + (Math.random() - 0.5) * r.width * 0.4, y: oy,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
      pi: Math.random() < 0.15,  /* a few golden π symbols */
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      life: 0, max: 90 + Math.random() * 60,
    });
  }
  if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(confettiFrame); }
}

function confettiFrame() {
  const ctx = confettiCanvas.getContext('2d');
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  confettiParts = confettiParts.filter(p => p.life < p.max && p.y < window.innerHeight + 20);
  for (const p of confettiParts) {
    p.life++;
    p.vy += 0.25; p.vx *= 0.985; p.vy *= 0.985;
    p.x += p.vx;  p.y += p.vy;  p.rot += p.vr;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.max - p.life) / 30);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    if (p.pi) {
      ctx.fillStyle = '#f0c840';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.fillText('π', -5, 5);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.restore();
  }
  if (confettiParts.length) requestAnimationFrame(confettiFrame);
  else { confettiRunning = false; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
}

/* ═══════════════════════════════════════════
   REFERENCE DIGITS (rows of 50, groups of 5)
   ═══════════════════════════════════════════ */
function buildRefDigits() {
  el.refDigits.innerHTML = '';
  for (let r = 0; r < TOTAL; r += 50) {
    const row = document.createElement('div');
    row.className = 'ref-row';
    const label = document.createElement('span');
    label.className = 'ref-row-label';
    label.textContent = r + 1;
    const groups = document.createElement('div');
    groups.className = 'ref-row-groups';
    for (let i = r; i < Math.min(r + 50, TOTAL); i += 5) {
      const span = document.createElement('span');
      span.className = 'ref-group';
      span.textContent = PI_DIGITS.slice(i, i + 5);
      groups.appendChild(span);
      refGroups.push(span);
    }
    row.append(label, groups);
    el.refDigits.appendChild(row);
    refRows.push(row);
  }
}

function buildStartSelect() {
  for (let s = 0; s < TOTAL; s += 10) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `Digits ${s + 1}–${s + 10}`;
    el.startSelect.appendChild(opt);
  }
}

function resetRef() {
  for (const g of refGroups) g.classList.remove('lit', 'missed');
  for (const i of missedGroups) refGroups[i]?.classList.add('missed');
}

/* Called after digit index i has been typed */
function markRef(i, missed) {
  const g = refGroups[Math.floor(i / 5)];
  if (!g) return;
  if (missed) g.classList.add('missed');
  if (i % 5 === 4) g.classList.add('lit');
  if ((i + 1) % 50 === 0) scrollRefTo(i + 1);
}

/* Scroll the study box (not the page) to the row holding digit index i */
function scrollRefTo(i) {
  const row = refRows[Math.floor(i / 50)];
  if (row) el.refDigits.scrollTop = row.offsetTop - 6;
}

/* ═══════════════════════════════════════════
   FLOATING PI DIGITS (HERO ATMOSPHERE)
   ═══════════════════════════════════════════ */
function createFloatingDigits() {
  const container = document.getElementById('floatingDigits');
  if (!container) return;

  const digits = '31415926535897932384626433832795028841971693993751058209749';
  const count = window.innerWidth < 600 ? 10 : 20;

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'float-d';
    span.textContent = digits[i % digits.length];
    span.style.setProperty('--x',     `${Math.random() * 100}%`);
    span.style.setProperty('--dur',   `${12 + Math.random() * 18}s`);
    span.style.setProperty('--delay', `${-Math.random() * 25}s`);
    span.style.setProperty('--sz',    `${1.2 + Math.random() * 2.8}rem`);
    container.appendChild(span);
  }
}

createFloatingDigits();

/* ═══════════════════════════════════════════
   TIMELINE ANIMATIONS
   ═══════════════════════════════════════════ */
(function () {
  /* 1 — Draw the vertical line when the timeline enters view */
  const timelineEl = document.querySelector('.timeline');
  if (timelineEl) {
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) {
        timelineEl.classList.add('tl-draw');
        obs.disconnect();
      }
    }, { threshold: 0.04 }).observe(timelineEl);
  }

  /* 2 — Reveal each item as it scrolls into view */
  const tlItems = document.querySelectorAll('.tl-item');
  if (tlItems.length) {
    const itemObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('tl-visible');
          itemObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });

    tlItems.forEach(item => itemObs.observe(item));
  }
})();

/* ═══════════════════════════════════════════
   ARCHIMEDES POLYGON EXPLORER
   ═══════════════════════════════════════════ */
(function () {
  const slider = document.getElementById('archSides');
  if (!slider) return;
  const out    = document.getElementById('archSidesOut');
  const inner  = document.getElementById('archInner');
  const outer  = document.getElementById('archOuter');
  const upper  = document.getElementById('archUpper');
  const lower  = document.getElementById('archLower');
  const gap    = document.getElementById('archGap');
  const steps  = document.querySelectorAll('.arch-steps button');

  /* n vertices on radius R, first one at the top. With the same angles, the
     outer polygon's sides touch the circle half-way between its corners. */
  const points = (n, R) => Array.from({ length: n }, (_, k) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
    return `${(R * Math.cos(a)).toFixed(2)},${(R * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

  function draw(n) {
    const lo = n * Math.sin(Math.PI / n);   /* inside perimeter ÷ diameter */
    const hi = n * Math.tan(Math.PI / n);   /* outside perimeter ÷ diameter */
    inner.setAttribute('points', points(n, 100));
    outer.setAttribute('points', points(n, 100 / Math.cos(Math.PI / n)));
    out.textContent   = n;
    lower.textContent = lo.toFixed(5);
    upper.textContent = hi.toFixed(5);
    gap.textContent   = (hi - lo).toFixed(5);
    slider.setAttribute('aria-valuetext', `${n} sides: π is between ${lo.toFixed(4)} and ${hi.toFixed(4)}`);
    steps.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.sides) === n)));
  }

  slider.addEventListener('input', () => draw(Number(slider.value)));
  steps.forEach(b => b.addEventListener('click', () => {
    slider.value = b.dataset.sides;
    draw(Number(b.dataset.sides));
  }));
  draw(Number(slider.value));
})();

/* ═══════════════════════════════════════════
   NAVBAR — subtle shadow on scroll
   ═══════════════════════════════════════════ */
const navBar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (!navBar) return;
  navBar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ═══════════════════════════════════════════
   COPY LINK BUTTON
   ═══════════════════════════════════════════ */
const SITE_URL = 'https://highviewone.github.io/pi-explorer/';
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
    } catch {
      /* clipboard blocked (e.g. no HTTPS) — let the user copy it by hand */
      window.prompt('Copy this link:', SITE_URL);
      return;
    }
    copyBtn.textContent = '✓';
    copyBtn.setAttribute('aria-label', 'Link copied');
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = '🔗';
      copyBtn.setAttribute('aria-label', 'Copy link');
      copyBtn.classList.remove('copied');
    }, 2000);
  });
}

/* ═══════════════════════════════════════════
   HAMBURGER MENU
   ═══════════════════════════════════════════ */
const hamburgerBtn = document.getElementById('hamburgerBtn');
let menuOpenedAtY = 0;  /* scroll position when the mobile menu was opened */

if (hamburgerBtn && navBar) {
  /* Toggle open/close */
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navBar.classList.toggle('open');
    hamburgerBtn.setAttribute('aria-expanded', isOpen);
    if (isOpen) menuOpenedAtY = window.scrollY;
  });

  /* Close when a nav link is tapped */
  document.querySelectorAll('#navMenu a').forEach(link => {
    link.addEventListener('click', () => {
      navBar.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    });
  });

  /* Close when tapping anywhere outside the nav */
  document.addEventListener('click', (e) => {
    if (!navBar.contains(e.target)) {
      navBar.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
  });

  /* Close once the user really scrolls the page. A small threshold ignores the
     few pixels a mobile browser shifts when its address bar shows or hides. */
  window.addEventListener('scroll', () => {
    if (!navBar.classList.contains('open')) return;
    if (Math.abs(window.scrollY - menuOpenedAtY) < 60) return;
    navBar.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }, { passive: true });

  /* Close on Escape and return focus to the toggle */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navBar.classList.contains('open')) {
      navBar.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      hamburgerBtn.focus();
    }
  });
}

/* ═══════════════════════════════════════════
   OFFLINE SUPPORT (service worker; needs http(s), not file://)
   ═══════════════════════════════════════════ */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* site still works online */ });
  });
}
