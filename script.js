// Find the HTML elements that our JavaScript will update.
const board = document.querySelector(".board");
const letters = document.querySelector("#letters");
const numbers = document.querySelector("#numbers");
const selection = document.querySelector("#selection");
const resetButton = document.querySelector("#reset");

// Reuse one function instead of writing 36 nearly identical HTML buttons.
function createSymbols(symbols, container) {
  for (const symbol of symbols) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = symbol;
    button.dataset.symbol = symbol;
    container.append(button);
  }
}

createSymbols("ABCDEFGHIJKLMNOPQRSTUVWXYZ", letters);
createSymbols("1234567890", numbers);

function clearSelection() {
  for (const button of board.querySelectorAll("[data-symbol]")) {
    button.classList.remove("is-selected");
    button.setAttribute("aria-pressed", "false");
  }
  selection.textContent = "—";
}

// Listen on the board: clicks from its buttons bubble up to this element.
board.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-symbol]");
  if (!button) return;

  clearSelection();
  button.classList.add("is-selected");
  button.setAttribute("aria-pressed", "true");
  selection.textContent = button.dataset.symbol;
});

resetButton.addEventListener("click", clearSelection);
clearSelection();

// Session state lives in this tab. Storage is explicitly opt-in.
const $ = (selector) => document.querySelector(selector);
const question = $('#question');
const form = $('#question-form');
const status = $('#status');
const remember = $('#remember');
const motion = $('#motion');
const marker = $('#planchette');
const dialog = $('#exit-dialog');
const microphone = $('#microphone');
const speechStatus = $('#speech-status');
const storageKey = 'midnight-board-session-v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let messages = [];
let sessionId = null;
const QUESTION_LIMIT = 20;
let remaining = QUESTION_LIMIT;
let sessionExpired = false;
let busy = false;
let ended = false;
let meaningfulInteraction = false;
let request = null;
let generation = 0;
let recognition = null;
let listening = false;
let markerTarget = null;

function beforeUnload(event) {
  event.preventDefault();
  event.returnValue = '';
}
function markInteraction() {
  if (ended || meaningfulInteraction) return;
  meaningfulInteraction = true;
  if ('onbeforeunload' in window) window.addEventListener('beforeunload', beforeUnload);
}
function updateQuestion() {
  question.value = question.value.slice(0, 120);
  $('#counter').textContent = `${question.value.length} / 120 characters`;
  question.setCustomValidity('');
}
question.addEventListener('input', () => { updateQuestion(); markInteraction(); });
board.addEventListener('click', (event) => {
  if (event.target.closest('button')) markInteraction();
});
function renderConversation() {
  $('#conversation').replaceChildren();
  for (const message of messages) {
    const item = document.createElement('li');
    item.textContent = `${message.role === 'user' ? 'You' : message.source === 'scripted' ? 'Ghost (scripted)' : 'Ghost (AI)'}: ${message.content}`;
    $('#conversation').append(item);
  }
}
function saveSession() {
  try {
    if (remember.checked && !ended) {
      sessionStorage.setItem(storageKey, JSON.stringify({ messages, draft: question.value, sessionId, remaining }));
    } else sessionStorage.removeItem(storageKey);
  } catch {
    remember.checked = false;
    status.textContent = 'Tab storage is unavailable. This séance continues in memory only.';
  }
}
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
  if (saved && Array.isArray(saved.messages) && saved.messages.length <= QUESTION_LIMIT * 2 &&
      saved.messages.every(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 240)) {
    messages = saved.messages;
    sessionId = typeof saved.sessionId === 'string' && /^[a-f0-9]{64}$/.test(saved.sessionId) ? saved.sessionId : null;
    remaining = Number.isInteger(saved.remaining) ? Math.max(0, Math.min(QUESTION_LIMIT, saved.remaining)) : QUESTION_LIMIT;
    question.value = typeof saved.draft === 'string' ? saved.draft.slice(0, 120) : '';
    remember.checked = true;
    status.textContent = 'Back so soon? The candle remembers your whispers…';
  }
} catch { /* Unavailable or damaged storage must not prevent typing. */ }
renderConversation();
updateQuestion();
remember.addEventListener('change', saveSession);
question.addEventListener('input', saveSession);

// Measure relative to the board's padding edge, including transformed letter arcs.
let markerMotion = null;
let markerPosition = null;
let movementSequence = 0;
function symbolPosition(button) {
  const target = button.getBoundingClientRect();
  const surface = board.getBoundingClientRect();
  if (!surface.width) return { x: button.offsetLeft + button.offsetWidth / 2, y: button.offsetTop + button.offsetHeight / 2 };
  const scaleX = board.offsetWidth / surface.width;
  const scaleY = board.offsetHeight / surface.height;
  return {
    x: (target.left + target.width / 2 - surface.left) * scaleX - board.clientLeft,
    y: (target.top + target.height / 2 - surface.top) * scaleY - board.clientTop
  };
}
function paintMarker(point, angle = 0) {
  markerPosition = point;
  marker.style.left = `${point.x}px`;
  marker.style.top = `${point.y}px`;
  // Transform origin and SVG window share the same 50,50 coordinate.
  marker.style.transform = `translate(-50%, -38.4615%) rotate(${angle}deg)`;
}
function stopMovement() {
  if (markerMotion) {
    cancelAnimationFrame(markerMotion.frame);
    markerMotion.resolve(false);
    markerMotion = null;
  }
}
function moveTo(button, { duration = 620, immediate = false, idle = false } = {}) {
  if (!button) return Promise.resolve(false);
  stopMovement();
  markerTarget = button;
  const end = symbolPosition(button);
  if (immediate || !canAnimate() || document.hidden) {
    paintMarker(end);
    return Promise.resolve(true);
  }
  const start = markerPosition || { x: board.clientWidth / 2, y: board.clientHeight * .73 };
  const dx = end.x - start.x, dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const bend = Math.min(42, distance * .15) * (Math.random() < .5 ? -1 : 1);
  const control = { x: (start.x + end.x) / 2 - dy / distance * bend, y: (start.y + end.y) / 2 + dx / distance * bend };
  const turn = (Math.random() - .5) * (idle ? 5 : 12);
  const started = performance.now();
  return new Promise(resolve => {
    const movement = { frame: 0, resolve };
    markerMotion = movement;
    function frame(now) {
      if (markerMotion !== movement) return;
      const progress = Math.min(1, Math.max(0, (now - started) / duration));
      // Smoothstep gives natural acceleration and a gentle settling at each letter.
      const t = progress * progress * (3 - 2 * progress);
      const point = {
        x: (1-t)**2 * start.x + 2*(1-t)*t*control.x + t*t*end.x,
        y: (1-t)**2 * start.y + 2*(1-t)*t*control.y + t*t*end.y
      };
      paintMarker(point, Math.sin(Math.PI * t) * turn);
      if (progress < 1) movement.frame = requestAnimationFrame(frame);
      else { markerMotion = null; paintMarker(end); resolve(true); }
    }
    movement.frame = requestAnimationFrame(frame);
  });
}
function canAnimate() { return motion.checked && !reducedMotion.matches; }
function syncMotion() {
  document.body.classList.toggle('no-motion', !canAnimate());
  if (!canAnimate()) {
    stopMovement();
    clearGhostEffect();
    if (markerTarget) moveTo(markerTarget, { immediate: true });
  }
}
motion.checked = !reducedMotion.matches;
motion.addEventListener('change', syncMotion);
reducedMotion.addEventListener('change', syncMotion);
syncMotion();
// A resize can occur mid-flight. Re-measure instead of keeping stale pixels.
function alignMarker() { if (markerTarget) moveTo(markerTarget, { immediate: true }); }
window.addEventListener('resize', alignMarker);
if (window.ResizeObserver) new ResizeObserver(alignMarker).observe(board);
document.fonts?.ready.then(alignMarker);
for (const [index, button] of [...letters.children].entries()) {
  const column = index % 13;
  button.style.setProperty('--arc', `${Math.pow((column - 6) / 6, 2) * 19}px`);
  button.style.setProperty('--tilt', `${(column - 6) * 1.1}deg`);
}
setInterval(() => {
  if (busy || ended || remaining === 0 || dialog.open || document.hidden || !canAnimate() || markerMotion || introActive) return;
  const symbols = [...board.querySelectorAll('[data-symbol]')];
  const nearby = markerPosition ? symbols.filter(button => {
    const point = symbolPosition(button);
    return Math.hypot(point.x - markerPosition.x, point.y - markerPosition.y) < board.clientWidth * .24;
  }) : [...letters.children];
  const choices = nearby.length ? nearby : symbols;
  moveTo(choices[Math.floor(Math.random() * choices.length)], { duration: 2200, idle: true });
}, 4800);
const waitFor = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function spellReply(reply, token) {
  const sequence = ++movementSequence;
  // YES, NO and GOODBYE use their own engraved destinations when spoken alone.
  const word = reply.toUpperCase().trim().replace(/[.!?]+$/, '');
  const symbols = ['YES', 'NO', 'GOODBYE'].includes(word) ? [word] : [...reply.toUpperCase()];
  for (const character of symbols) {
    if (token !== generation || sequence !== movementSequence || ended || dialog.open || document.hidden || !canAnimate()) return;
    const button = [...board.querySelectorAll('[data-symbol]')].find(b => b.dataset.symbol === character);
    if (button) {
      const arrived = await moveTo(button, { duration: Math.max(140, Math.min(320, 10000 / symbols.length)) + Math.random() * 40 });
      if (!arrived) return;
      // Occasional stillness adds hesitation without jitter or repeated flashing.
      if (Math.random() < .12) await waitFor(230);
    }
  }
}
async function finalGoodbye(token) {
  if (token !== generation || ended) return;
  document.body.classList.add('final-contact');
  $('#presence').textContent = 'The final candle';
  $('#final-message').hidden = false;
  await moveTo(board.querySelector('[data-symbol="GOODBYE"]'), { duration: 1700 });
}
function updateControls() {
  question.disabled = busy || ended || remaining === 0;
  $('#submit-question').disabled = busy || ended || listening || remaining === 0 || sessionExpired;
  microphone.disabled = busy || ended || remaining === 0 || sessionExpired || !SpeechRecognition;
  form.setAttribute('aria-busy', String(busy));
  $('#question-count').textContent = `${remaining} / ${QUESTION_LIMIT} questions remaining`;
}

// Both input methods converge here. Only text and context go to the server.
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || ended || listening) return;
  const content = question.value.trim();
  if (!content || content.length > 120) {
    question.setCustomValidity('Enter a question between 1 and 120 characters.');
    question.reportValidity();
    return;
  }
  if (remaining === 0 || sessionExpired) {
    status.textContent = 'This circle is closed. End this séance and begin a new one.';
    return;
  }
  markInteraction();
  busy = true;
  stopMovement();
  movementSequence++;
  document.body.classList.remove('arriving');
  $('#presence').textContent = 'Something is listening';
  updateControls();
  const token = ++generation;
  request = new AbortController();
  const timeout = setTimeout(() => request?.abort(), 30000);
  status.textContent = 'The candle trembles. Waiting for a reply…';
  try {
    await sessionReady;
    if (token !== generation) return;
    if (!sessionId) {
      const started = await fetch('/api/session', { method: 'POST', signal: request.signal });
      const data = await started.json();
      if (!started.ok) throw new Error(data.error || 'Could not begin a séance.');
      if (token !== generation) {
        fetch('/api/session', { method: 'DELETE', headers: { 'X-Session-ID': data.sessionId }, keepalive: true }).catch(() => {});
        return;
      }
      sessionId = data.sessionId;
      saveSession();
    }
    const response = await fetch('/api/ghost', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ question: content }), signal: request.signal
    });
    const data = await response.json();
    if (token !== generation) return;
    if (!response.ok) {
      if (data.remaining === 0) remaining = 0;
      if (response.status === 410) sessionExpired = true;
      throw new Error(data.error || 'The ghost service is unavailable. Please try again.');
    }
    if (typeof data.reply !== 'string' || !data.reply.trim() || data.reply.length > 240) throw new Error('The reply was unreadable. Please try again.');
    if (token !== generation) return;
    clearTimeout(timeout);
    messages.push({ role: 'user', content }, { role: 'assistant', content: data.reply.trim(), source: data.source });
    remaining = data.remaining;
    question.value = '';
    updateQuestion();
    renderConversation();
    saveSession();
    status.textContent = `${data.source === 'scripted' ? 'Ghost (scripted)' : 'Ghost (AI)'}: ${data.reply.trim()}`;
    $('#presence').textContent = data.source === 'scripted' ? 'A scripted whisper' : 'A voice beyond the veil · AI';
    updateAtmosphere();
    applyGhostEffect(data.effect);
    await spellReply(data.reply, token);
    if (remaining === 0) await finalGoodbye(token);
  } catch (error) {
    if (token === generation) status.textContent = error.name === 'AbortError'
      ? 'The whisper timed out. Your question is still here; try again.'
      : `${error.message || 'The server is unavailable.'} Your question is still here.`;
  } finally {
    clearTimeout(timeout);
    if (token === generation) {
      busy = false;
      request = null;
      updateControls();
    }
  }
});

// No automatic microphone start, retry, or background recording.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
function stopListening() {
  const active = recognition;
  recognition = null;
  listening = false;
  if (active) active.abort();
  microphone.textContent = 'Use microphone';
  updateControls();
}
if (!SpeechRecognition) speechStatus.textContent = 'Speech input is unavailable in this browser. Please type your question.';
microphone.addEventListener('click', () => {
  if (listening) { stopListening(); speechStatus.textContent = 'Microphone stopped. You can type instead.'; return; }
  if (!SpeechRecognition || busy || ended) return;
  markInteraction();
  try {
    setSound(false);
    const active = new SpeechRecognition();
    recognition = active;
    active.lang = document.documentElement.lang || 'en';
    active.continuous = false;
    active.interimResults = false;
    active.onresult = (event) => {
      if (recognition !== active || ended) return;
      const transcript = event.results[0][0].transcript;
      question.value = transcript.slice(0, 120);
      updateQuestion();
      saveSession();
      speechStatus.textContent = transcript.length > 120
        ? 'Speech shortened to 120 characters. Review it before submitting.'
        : 'Speech captured. Review your question, then select Ask the ghost.';
      question.focus();
    };
    active.onerror = (event) => {
      if (recognition !== active) return;
      speechStatus.textContent = ['not-allowed', 'service-not-allowed'].includes(event.error)
        ? 'Microphone permission was denied. You can type your question instead.'
        : 'Speech input could not complete. Try again or type your question.';
    };
    active.onend = () => {
      if (recognition !== active) return;
      recognition = null;
      listening = false;
      microphone.textContent = 'Use microphone';
      if (speechStatus.textContent.startsWith('Listening')) speechStatus.textContent = 'No speech captured. Try again or type.';
      updateControls();
    };
    listening = true;
    microphone.textContent = 'Stop microphone';
    speechStatus.textContent = 'Listening when permission is granted…';
    updateControls();
    active.start();
  } catch {
    stopListening();
    speechStatus.textContent = 'Microphone unavailable. Please type your question.';
  }
});
function openExit() {
  stopListening();
  movementSequence++;
  stopMovement();
  dialog.showModal();
}
$('#end-session').addEventListener('click', openExit);
$('#leave').addEventListener('click', openExit);
$('#stay').addEventListener('click', () => dialog.close());
function endSession() {
  if (sessionId) {
    fetch('/api/session', { method: 'DELETE', headers: { 'X-Session-ID': sessionId }, keepalive: true }).catch(() => {});
  }
  sessionId = null;
  remaining = QUESTION_LIMIT;
  sessionExpired = false;
  ended = true;
  stopMovement();
  movementSequence++;
  setSound(false);
  clearGhostEffect();
  document.body.classList.remove('arriving', 'final-contact', 'disturbance');
  document.body.classList.add('session-ended');
  $('#final-message').hidden = true;
  generation++;
  request?.abort();
  request = null;
  busy = false;
  stopListening();
  messages = [];
  question.value = '';
  remember.checked = false;
  saveSession();
  window.removeEventListener('beforeunload', beforeUnload);
  meaningfulInteraction = false;
  clearSelection();
  renderConversation();
  updateQuestion();
  dialog.close();
  $('.conversation').hidden = true;
  $('.board').hidden = true;
  $('.controls').hidden = true;
  $('#ended').hidden = false;
  $('#ended').focus();
}
$('#confirm-end').addEventListener('click', endSession);
$('#confirm-leave').addEventListener('click', () => { endSession(); window.location.assign('about:blank'); });
$('#restart').addEventListener('click', () => {
  ended = false;
  document.body.classList.remove('session-ended');
  $('#presence').textContent = 'Listen to the silence';
  updateAtmosphere();
  $('.conversation').hidden = false;
  $('.board').hidden = false;
  $('.controls').hidden = false;
  $('#ended').hidden = true;
  status.textContent = 'A fresh candle. A new séance.';
  speechStatus.textContent = SpeechRecognition ? '' : 'Speech input is unavailable. Please type.';
  updateControls();
  question.focus();
});
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('page-hidden', document.hidden);
  if (document.hidden) { stopListening(); stopMovement(); clearGhostEffect(); setSound(false); }
});
window.addEventListener('pagehide', () => { stopListening(); stopMovement(); setSound(false); saveSession(); });
// Restore server-authoritative history and quota, including a reply received during refresh.
const sessionReady = (async () => {
  if (!sessionId) return;
  const token = generation;
  busy = true;
  updateControls();
  try {
    const response = await fetch('/api/session', { headers: { 'X-Session-ID': sessionId }, signal: AbortSignal.timeout(5000) });
    const data = await response.json();
    if (token !== generation) return;
    if (!response.ok) {
      sessionExpired = true;
      status.textContent = 'The old candle has burned out. Your transcript is below; end this séance to begin a new one.';
    } else {
      messages = data.messages;
      remaining = data.remaining;
      renderConversation();
      saveSession();
    }
  } catch {
    if (token === generation) status.textContent = 'Could not reconnect. Your saved transcript is still here; try again when the server returns.';
  } finally {
    if (token === generation) { busy = false; updateControls(); }
  }
})();
updateControls();

// Atmosphere is decorative and independent of the paid conversation pipeline.
let introActive = false;
let lastDisturbance = performance.now();
function updateAtmosphere() {
  const intensity = Math.min(1, Math.max(0, (QUESTION_LIMIT - remaining) / QUESTION_LIMIT));
  document.body.style.setProperty('--intensity', intensity);
  document.body.dataset.depth = remaining <= 7 ? 'deep' : remaining <= 14 ? 'near' : 'quiet';
}
function candleTick() {
  if (canAnimate() && !document.hidden && !ended) {
    const intensity = (QUESTION_LIMIT - remaining) / QUESTION_LIMIT;
    for (const candle of document.querySelectorAll('.candle')) {
      candle.style.setProperty('--flame-scale', (0.92 + Math.random() * (0.14 + intensity * .08)).toFixed(3));
      candle.style.setProperty('--flame-lean', `${(Math.random() - .5) * (5 + intensity * 4)}deg`);
    }
    document.body.style.setProperty('--flicker', (.85 + Math.random() * .15).toFixed(3));
    if (remaining < 14 && !dialog.open && performance.now() - lastDisturbance > 45000 && Math.random() < .015) {
      lastDisturbance = performance.now();
      document.body.classList.add('disturbance');
      setTimeout(() => document.body.classList.remove('disturbance'), 1900);
    }
  }
  setTimeout(candleTick, 320 + Math.random() * 220);
}
candleTick();

// Web Audio creates a quiet three-note drone locally. No sound files or autoplay.
let audioContext = null;
let soundWanted = false;
let soundVersion = 0;
const soundButton = $('#sound');
async function setSound(enabled) {
  soundWanted = enabled;
  const version = ++soundVersion;
  soundButton.setAttribute('aria-pressed', String(enabled));
  soundButton.textContent = enabled ? 'Sound on' : 'Sound off';
  try {
    if (!enabled) { if (audioContext) await audioContext.suspend(); return; }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('unsupported');
    if (!audioContext) {
      audioContext = new Audio();
      const gain = audioContext.createGain();
      gain.gain.value = .018;
      gain.connect(audioContext.destination);
      for (const frequency of [55, 82.41, 110.3]) {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
      }
    }
    await audioContext.resume();
    if (version !== soundVersion) { if (!soundWanted) await audioContext.suspend(); return; }
    $('#sound-status').textContent = 'Ambient sound enabled. Select Sound on to mute.';
  } catch {
    if (version !== soundVersion) return;
    soundWanted = false;
    soundButton.setAttribute('aria-pressed', 'false');
    soundButton.textContent = 'Sound off';
    $('#sound-status').textContent = 'Sound is unavailable. The séance continues silently.';
  } finally {
    if (!soundWanted) {
      if ($('#sound-status').textContent.startsWith('Ambient')) $('#sound-status').textContent = '';
    }
  }
}
soundButton.addEventListener('click', () => setSound(!soundWanted));
board.addEventListener('click', event => {
  const target = event.target.closest('button[data-symbol]');
  if (target && !busy && !ended && remaining > 0) {
    movementSequence++;
    moveTo(target, { duration: 480 });
  }
});
async function firstContact() {
  document.body.classList.remove('arriving');
  if (ended || busy || messages.length || meaningfulInteraction || sessionId || document.hidden || dialog.open) return;
  const token = generation;
  introActive = true;
  $('#presence').textContent = 'First contact · ritual narration';
  status.textContent = '“You have come at last. What would you ask of the dark?”';
  try { await spellReply('HELLO', token); }
  finally { introActive = false; }
}
updateAtmosphere();
if (canAnimate() && !sessionId) document.body.classList.add('arriving');
sessionReady.then(() => {
  updateAtmosphere();
  if (remaining === 0 && !sessionExpired) finalGoodbye(generation);
  else if (!sessionId && !messages.length) setTimeout(firstContact, canAnimate() ? 2200 : 0);
});


// Only known server event names can affect presentation. Never replay events on refresh.
var ghostEffectTimer;
function clearGhostEffect() {
  clearTimeout(ghostEffectTimer);
  delete document.body.dataset.ghostEffect;
}
function applyGhostEffect(effect) {
  clearGhostEffect();
  if (!['double-shadow', 'cold-mist', 'candle-dim'].includes(effect) || !canAnimate() || document.hidden || ended) return;
  document.body.dataset.ghostEffect = effect;
  ghostEffectTimer = setTimeout(clearGhostEffect, 3200);
}
