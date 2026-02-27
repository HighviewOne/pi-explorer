/* ═══════════════════════════════════════════════════════
   Pi Explorer — script.js
   Floating digits, smooth scroll, Pi memorization game
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ─── Pi digits (200 after the decimal point) ─── */
const PI_DIGITS =
  '1415926535' +
  '8979323846' +
  '2643383279' +
  '5028841971' +
  '6939937510' +
  '5820974944' +
  '5923078164' +
  '0628620899' +
  '8628034825' +
  '3421170679' +
  '8214808651' +
  '3282306647' +
  '0938446095' +
  '5058223172' +
  '5359408128' +
  '4811174502' +
  '8410270193' +
  '8521105559' +
  '6446229489' +
  '5493038196';

/* ─── Milestones ─── */
const MILESTONES = [
  { at:  5,  msg: '☥ Five digits! The ancient Egyptians used about this many in their calculations.' },
  { at: 10,  msg: '⚡ 10 digits! You now know more Pi than most people on Earth.' },
  { at: 20,  msg: '🔺 20 digits! The Great Pyramid builders would be astonished.' },
  { at: 31,  msg: '📜 31 digits! You\'ve matched the best precision of the Rhind Papyrus era.' },
  { at: 50,  msg: '🚀 50 digits! NASA only needs 15 to fly to other planets — you\'ve tripled that!' },
  { at: 75,  msg: '⭐ 75 digits! You\'re entering champion territory.' },
  { at: 100, msg: '🏆 100 DIGITS!! You are a true Pi Master!' },
  { at: 150, msg: '∞ 150 digits!! You would win most Pi competitions on Earth!' },
  { at: 200, msg: '👑 ALL 200 DIGITS! You are the Pi Explorer Supreme!' },
];

/* ─── Game state ─── */
let active      = false;
let idx         = 0;
let bestScore   = parseInt(localStorage.getItem('piExplorerBest') || '0', 10);
let mileSeen    = new Set();

/* ─── DOM references ─── */
const el = {
  typedDigits:  document.getElementById('typedDigits'),
  cursor:       document.getElementById('gameCursor'),
  currentScore: document.getElementById('currentScore'),
  personalBest: document.getElementById('personalBest'),
  gameStatus:   document.getElementById('gameStatus'),
  gameMsg:      document.getElementById('gameMsg'),
  milestoneMsg: document.getElementById('milestoneMsg'),
  digitHint:    document.getElementById('digitHint'),
  startBtn:     document.getElementById('startBtn'),
  hiddenInput:  document.getElementById('hiddenInput'),
  displayArea:  document.getElementById('piDisplayArea'),
  refDigits:    document.getElementById('refDigits'),
};

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
el.personalBest.textContent = bestScore;
buildRefDigits();

el.startBtn.addEventListener('click', startGame);
el.displayArea.addEventListener('click', () => {
  if (active) el.hiddenInput.focus();
});

/* Keyboard input (desktop) */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (!/^[0-9]$/.test(e.key)) return;
  e.preventDefault();
  if (!active) {
    startGame();
    /* delay one frame so game is active before processing the digit */
    requestAnimationFrame(() => processDigit(e.key));
  } else {
    processDigit(e.key);
  }
});

/* Mobile: capture from hidden text input */
el.hiddenInput.addEventListener('input', function () {
  const val = this.value.replace(/\D/g, '');
  this.value = '';
  if (!active || !val) return;
  processDigit(val[val.length - 1]);
});

/* ═══════════════════════════════════════════
   GAME FUNCTIONS
   ═══════════════════════════════════════════ */
function startGame() {
  active   = true;
  idx      = 0;
  mileSeen = new Set();

  el.typedDigits.innerHTML = '';
  el.currentScore.textContent = '0';
  el.gameStatus.textContent   = 'Playing';
  el.digitHint.textContent    = 'Type the first digit after the decimal point…';
  el.startBtn.textContent     = 'Restart';

  hideMsg();
  hideMilestone();
  updateRefDisplay(0);

  el.cursor.style.display = 'inline';
  el.hiddenInput.focus();
}

function processDigit(d) {
  if (!active) return;
  if (idx >= PI_DIGITS.length) return;

  if (d === PI_DIGITS[idx]) {
    correct(d);
  } else {
    wrong(PI_DIGITS[idx]);
  }
}

function correct(d) {
  /* group spacing every 5 digits */
  if (idx > 0 && idx % 5 === 0) {
    const gap = document.createElement('span');
    gap.className = 'digit-gap';
    gap.innerHTML = '&thinsp;';
    el.typedDigits.appendChild(gap);
  }

  const span = document.createElement('span');
  span.className = 'digit-ok';
  span.textContent = d;
  el.typedDigits.appendChild(span);

  idx++;
  el.currentScore.textContent = idx;
  el.digitHint.textContent    = `Digit ${idx} ✓ — now type digit ${idx + 1}…`;

  /* scroll display to bottom if wrapped */
  el.displayArea.scrollTop = el.displayArea.scrollHeight;

  /* personal best */
  if (idx > bestScore) {
    bestScore = idx;
    localStorage.setItem('piExplorerBest', bestScore);
    el.personalBest.textContent = bestScore;
  }

  updateRefDisplay(idx);
  checkMilestone(idx);

  if (idx >= PI_DIGITS.length) {
    allComplete();
  }
}

function wrong(correctDigit) {
  active = false;
  el.gameStatus.textContent = 'Game Over';
  el.cursor.style.display   = 'none';

  /* shake the display */
  el.displayArea.classList.remove('shake');
  void el.displayArea.offsetWidth; /* reflow to restart animation */
  el.displayArea.classList.add('shake');
  setTimeout(() => el.displayArea.classList.remove('shake'), 500);

  const scoreText = idx === 0
    ? 'The first digit after <strong>3.</strong> is…'
    : `You reached digit <strong>${idx}</strong>!`;

  el.gameMsg.className = 'game-msg wrong';
  el.gameMsg.innerHTML =
    `<strong>Not quite!</strong> ${scoreText}` +
    `<span class="wrong-digit-reveal">${correctDigit}</span>` +
    (idx > 0 && idx === bestScore
      ? '<br>🎉 That was a new personal best!'
      : '');

  el.digitHint.textContent = 'Click "Restart" or press a digit key to try again.';
  el.startBtn.textContent  = 'Try Again';
}

function allComplete() {
  el.gameStatus.textContent = 'Complete!';
  el.cursor.style.display   = 'none';
  el.gameMsg.className = 'game-msg best';
  el.gameMsg.innerHTML =
    '👑 <strong>INCREDIBLE!</strong> You\'ve memorised all 200 digits of Pi!<br>You are the <em>Pi Explorer Supreme</em>!';
  el.startBtn.textContent = 'Play Again';
}

/* ═══════════════════════════════════════════
   MILESTONE SYSTEM
   ═══════════════════════════════════════════ */
function checkMilestone(count) {
  for (const m of MILESTONES) {
    if (count === m.at && !mileSeen.has(m.at)) {
      mileSeen.add(m.at);
      showMilestone(m.msg);
      return;
    }
  }
}

let milestoneTimer = null;
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
   REFERENCE DIGIT GROUPS
   ═══════════════════════════════════════════ */
function buildRefDigits() {
  el.refDigits.innerHTML = '';
  for (let i = 0; i < 50; i += 5) {
    const span = document.createElement('span');
    span.className = 'ref-group';
    span.id = `rg${i}`;
    span.textContent = PI_DIGITS.slice(i, i + 5);
    el.refDigits.appendChild(span);
  }
}

function updateRefDisplay(count) {
  for (let i = 0; i < 50; i += 5) {
    const grp = document.getElementById(`rg${i}`);
    if (!grp) continue;
    if (count >= i + 5) {
      grp.classList.add('lit');
    } else {
      grp.classList.remove('lit');
    }
  }
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
   SMOOTH SCROLL (fallback for older browsers)
   ═══════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

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
  navBar.style.boxShadow = window.scrollY > 60
    ? '0 2px 24px rgba(0,0,0,0.6)'
    : 'none';
}, { passive: true });

/* ═══════════════════════════════════════════
   COPY LINK BUTTON
   ═══════════════════════════════════════════ */
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('https://highviewone.github.io/pi-explorer/');
      copyBtn.textContent = '✓';
      copyBtn.style.borderColor = 'var(--gold-lt)';
      copyBtn.style.color = 'var(--gold-lt)';
      setTimeout(() => {
        copyBtn.textContent = '🔗';
        copyBtn.style.borderColor = '';
        copyBtn.style.color = '';
      }, 2000);
    } catch {
      /* fallback for browsers that block clipboard without HTTPS */
      copyBtn.textContent = '✓';
      setTimeout(() => { copyBtn.textContent = '🔗'; }, 2000);
    }
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
}
