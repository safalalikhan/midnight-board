import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
function setup(t, { speech = false, saved, fetcher, reduced = true } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost:3000', runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const w = dom.window;
  const $ = s => w.document.querySelector(s);
  let active;
  let starts = 0;
  const calls = [];
  const listeners = new Set();
  const add = w.addEventListener.bind(w), remove = w.removeEventListener.bind(w);
  w.addEventListener = (type, fn, ...rest) => { listeners.add(type); add(type, fn, ...rest); };
  w.removeEventListener = (type, fn, ...rest) => { listeners.delete(type); remove(type, fn, ...rest); };
  w.matchMedia = () => ({ matches: reduced, addEventListener() {} });
  let idle;
  w.setInterval = callback => { idle = callback; return 1; };
  // Advance each animation to its destination without wall-clock delays.
  const schedule = w.setTimeout.bind(w);
  w.requestAnimationFrame = callback => schedule(() => callback(w.performance.now() + 10000), 0);
  w.cancelAnimationFrame = id => w.clearTimeout(id);
  w.Math.random = () => .5;
  w.AbortController = AbortController;
  w.AbortSignal = AbortSignal;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  if (saved) w.sessionStorage.setItem('midnight-board-session-v1', JSON.stringify(saved));
  if (speech) w.SpeechRecognition = class {
    constructor() { active = this; }
    start() { starts++; }
    abort() { this.onend?.(); }
  };
  w.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (fetcher) return fetcher(url, options);
    return { ok: true, json: async () => url === '/api/session'
      ? { sessionId: 'a'.repeat(64), remaining: 20, messages: [] }
      : { reply: 'HELLO', source: 'scripted', remaining: 19 } };
  };
  w.eval(script);
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const input = value => { $('#question').value = value; $('#question').dispatchEvent(new w.Event('input')); };
  const submit = () => $('#question-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  return { w, $, calls, listeners, tick, input, submit, idle: () => idle(), get active() { return active; }, get starts() { return starts; } };
}

test('existing board and reset still work; typing is capped at 120', t => {
  const h = setup(t);
  assert.equal(h.w.document.querySelectorAll('[data-symbol]').length, 39);
  assert.equal(h.listeners.has('beforeunload'), false);
  h.$('[data-symbol="A"]').click();
  assert.equal(h.$('#selection').textContent, 'A');
  h.$('#reset').click();
  assert.equal(h.$('#selection').textContent, '—');
  h.input('x'.repeat(130));
  assert.equal(h.$('#question').value.length, 120);
  assert.equal(h.$('#counter').textContent, '120 / 120 characters');
  assert.equal(h.listeners.has('beforeunload'), true);
  assert.equal(h.$('#microphone').disabled, true);
});
test('typed question uses backend session and labeled fallback', async t => {
  const h = setup(t);
  h.input('Who are you?'); h.submit(); await h.tick();
  assert.deepEqual(JSON.parse(h.calls[1].options.body), { question: 'Who are you?' });
  assert.equal(h.calls[1].options.headers['X-Session-ID'], 'a'.repeat(64));
  assert.match(h.$('#conversation').textContent, /Ghost \(scripted\): HELLO/);
  assert.equal(h.$('#question-count').textContent, '19 / 20 questions remaining');
  assert.equal(h.w.sessionStorage.length, 0);
});
test('speech never starts automatically, clamps transcript, and shares submit pipeline', async t => {
  const h = setup(t, { speech: true });
  assert.equal(h.starts, 0);
  h.$('#microphone').click();
  assert.equal(h.starts, 1);
  h.active.onresult({ results: [[{ transcript: 'a'.repeat(140) }]] });
  h.active.onend();
  assert.equal(h.$('#question').value.length, 120);
  assert.match(h.$('#speech-status').textContent, /shortened/);
  assert.equal(h.calls.length, 0);
  h.submit(); await h.tick();
  assert.equal(JSON.parse(h.calls[1].options.body).question.length, 120);
});
test('permission denial permits typing, ending ignores late speech results', t => {
  const h = setup(t, { speech: true });
  h.$('#microphone').click();
  h.active.onerror({ error: 'not-allowed' }); h.active.onend();
  assert.match(h.$('#speech-status').textContent, /denied/);
  assert.equal(h.$('#question').disabled, false);
  h.$('#microphone').click();
  const old = h.active;
  h.$('#end-session').click();
  assert.equal(h.$('#exit-dialog').open, true);
  h.$('#confirm-end').click();
  old.onresult({ results: [[{ transcript: 'late speech' }]] });
  assert.equal(h.$('#question').value, '');
  assert.equal(h.listeners.has('beforeunload'), false);
  assert.equal(h.$('#ended').hidden, false);
});
test('opt-in persists text, restores server context, and clears on end', async t => {
  const h = setup(t);
  h.$('#remember').click(); h.input('Hello'); h.submit(); await h.tick();
  const saved = JSON.parse(h.w.sessionStorage.getItem('midnight-board-session-v1'));
  assert.equal(saved.messages.length, 2);
  assert.equal(saved.sessionId, 'a'.repeat(64));
  const restored = setup(t, { saved, fetcher: async () => ({ ok: true, json: async () => ({ messages: saved.messages, remaining: 19 }) }) });
  await restored.tick();
  assert.match(restored.$('#status').textContent, /Back so soon/);
  assert.match(restored.$('#conversation').textContent, /HELLO/);
  assert.equal(restored.listeners.has('beforeunload'), false);
  h.$('#end-session').click(); h.$('#confirm-end').click();
  assert.equal(h.w.sessionStorage.length, 0);
});
test('server quota errors stop further submission and preserve question', async t => {
  const h = setup(t, { fetcher: async url => ({ ok: url === '/api/session', status: 429, json: async () => url === '/api/session'
    ? { sessionId: 'a'.repeat(64) } : { error: 'All 20 questions have been used.', remaining: 0 } }) });
  h.input('One more?'); h.submit(); await h.tick();
  assert.equal(h.$('#submit-question').disabled, true);
  assert.equal(h.$('#question').value, 'One more?');
  assert.match(h.$('#status').textContent, /All 20/);
});
test('ending during a response prevents a stale reply and supports a fresh session', async t => {
  let resolveReply;
  const h = setup(t, { fetcher: async (url, options) => {
    if (url === '/api/ghost') return new Promise(resolve => { resolveReply = resolve; });
    return { ok: true, json: async () => ({ sessionId: 'b'.repeat(64) }) };
  } });
  h.input('Hello'); h.submit(); await h.tick();
  h.$('#end-session').click(); h.$('#confirm-end').click();
  resolveReply({ ok: true, json: async () => ({ reply: 'STALE', remaining: 19 }) });
  await h.tick();
  assert.equal(h.$('#conversation').textContent, '');
  h.$('#restart').click();
  assert.equal(h.$('#question-count').textContent, '20 / 20 questions remaining');
  assert.equal(h.$('#submit-question').disabled, false);
});

test('idle movement pauses while awaiting AI and reduced motion disables it', async t => {
  let finish;
  const h = setup(t, { reduced: false, fetcher: async url => {
    if (url === '/api/ghost') return new Promise(resolve => { finish = resolve; });
    return { ok: true, json: async () => ({ sessionId: 'c'.repeat(64) }) };
  } });
  for (const button of h.w.document.querySelectorAll('#letters button')) {
    Object.defineProperty(button, 'offsetLeft', { value: 100 });
  }
  h.idle(); await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(h.$('#planchette').style.left, '100px');
  h.input('Hello'); h.submit(); await h.tick();
  h.$('#planchette').style.left = '50px';
  h.idle(); assert.equal(h.$('#planchette').style.left, '50px');
  h.$('#motion').click();
  const stoppedAt = h.$('#planchette').style.left;
  finish({ ok: true, json: async () => ({ reply: 'AB', source: 'ai', remaining: 19 }) });
  await h.tick(); h.idle();
  assert.equal(h.$('#planchette').style.left, stoppedAt);
});
test('unavailable storage does not break typing or submission', async t => {
  const h = setup(t);
  Object.defineProperty(h.w, 'sessionStorage', { get() { throw new Error('blocked'); } });
  h.$('#remember').click(); h.input('Hello'); h.submit(); await h.tick();
  assert.equal(h.$('#remember').checked, false);
  assert.equal(h.$('#conversation').children.length, 2);
});
test('ending during session creation disposes of the late session', async t => {
  let started;
  const h = setup(t, { fetcher: async (url, options) => {
    if (options.method === 'POST') return new Promise(resolve => { started = resolve; });
    return { ok: true };
  } });
  h.input('Hello'); h.submit(); await h.tick();
  h.$('#end-session').click(); h.$('#confirm-end').click();
  started({ ok: true, json: async () => ({ sessionId: 'd'.repeat(64) }) });
  await h.tick();
  assert.equal(h.calls.at(-1).options.method, 'DELETE');
  assert.equal(h.calls.some(call => call.url === '/api/ghost'), false);
});

test('planchette visits response letters in order', async t => {
  const h = setup(t, { reduced: false });
  const visited = [];
  for (const button of h.w.document.querySelectorAll('#letters button')) {
    Object.defineProperty(button, 'offsetLeft', { get() { visited.push(button.dataset.symbol); return 10; } });
  }
  const originalTimer = h.w.setTimeout.bind(h.w);
  h.w.setTimeout = (callback, delay) => originalTimer(callback, delay === 390 ? 0 : delay);
  h.input('Hello'); h.submit();
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.deepEqual(visited, ['H', 'E', 'L', 'L', 'O']);
  assert.equal(h.$('#submit-question').disabled, false);
});

test('all 39 symbol centers align through scaled bounds and board borders', t => {
  const h = setup(t);
  const board = h.$('.board');
  board.getBoundingClientRect = () => ({ left: 30, top: 70, width: 500, height: 300 });
  for (const [property, value] of Object.entries({ offsetWidth: 1000, offsetHeight: 600, clientLeft: 8, clientTop: 8 })) {
    Object.defineProperty(board, property, { value });
  }
  let index = 0;
  for (const button of board.querySelectorAll('[data-symbol]')) {
    const x = 60 + index * 4, y = 100 + index * 2;
    button.getBoundingClientRect = () => ({ left: x, top: y, width: 20, height: 24 });
    button.click();
    assert.equal(h.$('#planchette').style.left, `${(x + 10 - 30) * 2 - 8}px`, button.dataset.symbol);
    assert.equal(h.$('#planchette').style.top, `${(y + 12 - 70) * 2 - 8}px`, button.dataset.symbol);
    index++;
  }
  // Layout changed after rotation/resizing; a new center must be measured.
  h.$('[data-symbol="GOODBYE"]').getBoundingClientRect = () => ({ left: 100, top: 200, width: 80, height: 40 });
  h.w.dispatchEvent(new h.w.Event('resize'));
  assert.equal(h.$('#planchette').style.left, '212px');
  assert.equal(h.$('#planchette').style.top, '292px');
});

test('arrival makes free scripted contact without listening, audio, or quota consumption', async t => {
  const h = setup(t);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.match(h.$('#presence').textContent, /ritual narration/);
  assert.match(h.$('#status').textContent, /come at last/);
  assert.equal(h.calls.length, 0);
  assert.equal(h.$('#question-count').textContent, '20 / 20 questions remaining');
  assert.equal(h.$('#sound').getAttribute('aria-pressed'), 'false');
  assert.equal(h.starts, 0);
});

test('twentieth answer lands on GOODBYE, retains transcript, disables further questions', async t => {
  let count = 0;
  const h = setup(t, { fetcher: async url => ({ ok: true, json: async () => url === '/api/session'
    ? { sessionId: 'e'.repeat(64) }
    : { reply: 'Farewell', source: 'ai', remaining: 20 - ++count } }) });
  const goodbye = h.$('[data-symbol="GOODBYE"]');
  Object.defineProperty(goodbye, 'offsetLeft', { value: 180 });
  Object.defineProperty(goodbye, 'offsetTop', { value: 240 });
  for (let i = 0; i < 20; i++) { h.input('Hello'); h.submit(); await h.tick(); }
  assert.equal(h.$('#final-message').hidden, false);
  assert.equal(h.$('#planchette').style.left, '180px');
  assert.equal(h.$('#planchette').style.top, '240px');
  assert.equal(h.$('#question-count').textContent, '0 / 20 questions remaining');
  assert.equal(h.$('#conversation').children.length, 40);
  assert.equal(h.$('#submit-question').disabled, true);
  assert.equal(h.$('#microphone').disabled, true);
  assert.equal(h.w.document.body.classList.contains('final-contact'), true);
  h.idle();
  assert.equal(h.$('#planchette').style.left, '180px');
});

test('sound requires a click, mutes on hiding and ending, and fails gracefully', async t => {
  const h = setup(t);
  let created = 0, resumed = 0, suspended = 0;
  h.w.AudioContext = class {
    constructor() { created++; }
    createGain() { return { gain: {}, connect() {} }; }
    createOscillator() { return { frequency: {}, connect() {}, start() {} }; }
    async resume() { resumed++; }
    async suspend() { suspended++; }
  };
  assert.equal(created, 0);
  h.$('#sound').click(); await h.tick();
  assert.equal(created, 1); assert.equal(resumed, 1);
  assert.equal(h.$('#sound').getAttribute('aria-pressed'), 'true');
  Object.defineProperty(h.w.document, 'hidden', { configurable: true, value: true });
  h.w.document.dispatchEvent(new h.w.Event('visibilitychange')); await h.tick();
  assert.equal(suspended, 1);
  assert.equal(h.$('#sound').getAttribute('aria-pressed'), 'false');
  Object.defineProperty(h.w.document, 'hidden', { value: false });
  h.$('#sound').click(); await h.tick();
  h.$('#end-session').click(); h.$('#confirm-end').click(); await h.tick();
  assert.equal(h.$('#sound').getAttribute('aria-pressed'), 'false');
  const unavailable = setup(t);
  unavailable.$('#sound').click(); await unavailable.tick();
  assert.match(unavailable.$('#sound-status').textContent, /unavailable/);
});

test('movement settles exactly and is cancellable midway', async t => {
  const h = setup(t, { reduced: false });
  const frames = new Map();
  let id = 0;
  h.w.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
  h.w.cancelAnimationFrame = frame => frames.delete(frame);
  Object.defineProperty(h.$('[data-symbol="A"]'), 'offsetLeft', { value: 200 });
  Object.defineProperty(h.$('[data-symbol="A"]'), 'offsetTop', { value: 100 });
  h.$('[data-symbol="A"]').click();
  const frame = frames.get(id); frames.delete(id);
  frame(h.w.performance.now() + 240);
  const x = parseFloat(h.$('#planchette').style.left);
  assert.ok(x > 0 && x < 200);
  h.$('#motion').click();
  assert.equal(frames.size, 0);
  assert.equal(h.$('#planchette').style.left, '200px');
  assert.equal(h.$('#planchette').style.top, '100px');
});

test('rare effects accept only known events and respect reduced motion', async t => {
  const fetcher = async url => ({ ok: true, json: async () => url === '/api/session'
    ? { sessionId: 'f'.repeat(64) } : { reply: 'YES', source: 'scripted', remaining: 12, effect: 'cold-mist' } });
  const h = setup(t, { reduced: false, fetcher });
  h.input('A puzzle'); h.submit(); await h.tick();
  assert.equal(h.w.document.body.dataset.ghostEffect, 'cold-mist');
  h.$('#motion').click();
  assert.equal(h.w.document.body.dataset.ghostEffect, undefined);
  const quiet = setup(t, { fetcher });
  quiet.input('A puzzle'); quiet.submit(); await quiet.tick();
  assert.equal(quiet.w.document.body.dataset.ghostEffect, undefined);
});
