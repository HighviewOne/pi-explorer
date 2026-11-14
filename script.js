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

/* ─── Game state ─── */
let mode        = 'challenge';  /* 'challenge' | 'practice' */
let active      = false;
let start       = 0;            /* index of the first digit in this run */
let pos         = 0;            /* index of the next digit to type */
let slips       = 0;            /* practice-mode mistakes */
let bestScore   = loadBest();
let runStartBest = bestScore;   /* best before this run, to detect a true new record */
let mileSeen    = new Set();
let challengeInView = false;
let milestoneTimer = null;

/* ─── DOM references ─── */
const el = {
  typedDigits:  document.getElementById('typedDigits'),
  cursor:       document.getElementById('gameCursor'),
  currentScore: document.getElementById('currentScore'),
  personalBest: document.getElementById('personalBest'),
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
};

let refGroups = [];  /* one span per 5 digits */
let refRows   = [];  /* one row per 50 digits */

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
buildRefDigits();
buildStartSelect();
resetToIdle();

el.startBtn.addEventListener('click', startGame);
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
  if (!/^[0-9]$/.test(e.key)) return;
  if (!challengeInView && document.activeElement !== el.hiddenInput) return;
  e.preventDefault();
  /* startGame() is synchronous, and preventDefault() above stops the key from
     also reaching the hidden input, so the digit can be processed straight away */
  if (!active) startGame();
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
  active = false;
  const practice = mode === 'practice';
  start = practice ? Number(el.startSelect.value) || 0 : 0;
  pos   = start;
  slips = 0;

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
  el.startBtn.textContent   = 'Restart';

  el.hiddenInput.focus({ preventScroll: true });
}

function processDigit(d) {
  if (!active || pos >= TOTAL) return;
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
  appendDigit(d, 'digit-ok', pos);
  markRef(pos, false);
  pos++;

  if (mode === 'challenge' && pos > bestScore) {
    bestScore = pos;
    saveBest(bestScore);
  }
  updateStats();
  el.digitHint.textContent = `Digit ${pos} ✓ — now type digit ${pos + 1}…`;

  checkMilestone(pos);
  if (pos >= TOTAL) allComplete();
}

/* Practice: show the right digit in red and carry on */
function slip(want) {
  slips++;
  appendDigit(want, 'digit-miss', pos);
  markRef(pos, true);
  pos++;
  shake();
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
  el.digitHint.textContent = 'Click "Play Again" or press a digit key to start over.';
  el.startBtn.textContent  = 'Play Again';
}

function updateStats() {
  if (mode === 'practice') {
    el.scoreLabel.textContent   = 'Correct';
    el.bestLabel.textContent    = 'Slips';
    el.currentScore.textContent = pos - start - slips;
    el.personalBest.textContent = slips;
  } else {
    el.scoreLabel.textContent   = 'Current Score';
    el.bestLabel.textContent    = 'Personal Best ✦';
    el.currentScore.textContent = pos;
    el.personalBest.textContent = bestScore;
  }
}

function shake() {
  el.displayArea.classList.remove('shake');
  void el.displayArea.offsetWidth; /* reflow to restart animation */
  el.displayArea.classList.add('shake');
  setTimeout(() => el.displayArea.classList.remove('shake'), 500);
}

/* ═══════════════════════════════════════════
   MILESTONE SYSTEM
   ═══════════════════════════════════════════ */
function checkMilestone(count) {
  for (const m of MILESTONES) {
    if (count !== m.at || mileSeen.has(m.at)) continue;
    if (mode === 'practice' && !(m.anyMode && start <= m.from)) continue;
    mileSeen.add(m.at);
    showMilestone(m.msg);
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

if (hamburgerBtn && navBar) {
  /* Toggle open/close */
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navBar.classList.toggle('open');
    hamburgerBtn.setAttribute('aria-expanded', isOpen);
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

  /* Close if user scrolls (feels natural on mobile) */
  window.addEventListener('scroll', () => {
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
