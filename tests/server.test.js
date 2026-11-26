import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp, createBudget } from '../server.js';
function appFor(t, options = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'midnight-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return createApp({ provider: 'scripted', apiKey: '', budgetDirectory: directory, requestLimit: 100, hourlyLimit: 100, ...options });
}
const start = async app => (await request(app).post('/api/session')).body.sessionId;
const ask = (app, id, question = 'Hello') => request(app).post('/api/ghost').set('X-Session-ID', id).send({ question });
const aiResponse = text => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }) });

test('public files work; secrets, source, dependencies, and usage file are private', async t => {
  const app = appFor(t);
  assert.equal((await request(app).get('/')).status, 200);
  for (const url of ['/.env', '/.env.example', '/server.js', '/ghost-responses.js', '/ghost-providers.js', '/package.json', '/.data/daily-usage.json', '/node_modules/express/package.json']) {
    assert.equal((await request(app).get(url)).status, 404, url);
  }
});
test('validates questions server-side and accepts exactly 120 characters', async t => {
  const app = appFor(t); const id = await start(app);
  for (const text of ['', '   ', 'x'.repeat(121), null, 3]) assert.equal((await ask(app, id, text)).status, 400);
  const response = await ask(app, id, 'x'.repeat(120));
  assert.equal(response.status, 200);
  assert.equal(response.body.remaining, 19);
  assert.equal(response.body.source, 'scripted');
  assert.equal((await ask(app, 'invalid')).status, 410);
});
test('twenty-question quota is authoritative; history isolated and deletion ends session', async t => {
  const app = appFor(t); const id = await start(app); const other = await start(app);
  for (let i = 0; i < 20; i++) assert.equal((await ask(app, id)).body.remaining, 19 - i);
  assert.equal((await ask(app, id)).status, 429);
  const state = await request(app).get('/api/session').set('X-Session-ID', id);
  assert.equal(state.body.messages.length, 40);
  assert.equal(state.body.remaining, 0);
  assert.equal((await ask(app, other)).body.remaining, 19);
  assert.equal((await request(app).delete('/api/session').set('X-Session-ID', id)).status, 204);
  assert.equal((await ask(app, id)).status, 410);
});
test('AI receives server-owned context, fixed model and bounded output without exposing credentials', async t => {
  const calls = [];
  const app = appFor(t, { provider: 'openai', apiKey: 'test-only-secret', fetchAI: async (url, options) => { calls.push({ url, ...options }); return aiResponse('I am Ember.'); } });
  const id = await start(app);
  const first = await ask(app, id, 'Who are you?');
  await ask(app, id, 'Do you remember me?');
  const body = JSON.parse(calls[1].body);
  assert.equal(body.input.length, 3);
  assert.equal(body.input[1].content, 'I am Ember.');
  assert.equal(body.model, 'gpt-5.6-luna');
  assert.equal(body.max_output_tokens, 100);
  assert.equal(body.store, false);
  assert.equal(first.body.source, 'ai');
  assert.equal(JSON.stringify(first.body).includes('test-only-secret'), false);
});
test('provider errors and exhausted budget return labeled fallback without retries', async t => {
  let calls = 0;
  const app = appFor(t, { provider: 'openai', apiKey: 'test', dailyLimit: 1, fetchAI: async () => { calls++; throw new Error('private provider error'); } });
  const id = await start(app);
  assert.equal((await ask(app, id)).body.source, 'scripted');
  assert.equal((await ask(app, id)).body.source, 'scripted');
  assert.equal(calls, 1);
});
test('daily reservation survives recreation and fails closed on corrupted storage', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'midnight-budget-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  assert.equal(createBudget(directory, 1)(), true);
  assert.equal(createBudget(directory, 1)(), false);
  writeFileSync(path.join(directory, 'daily-usage.json'), 'corrupted');
  assert.equal(createBudget(directory, 100)(), false);
});
test('IP throttling and cross-origin requests cannot invoke AI', async t => {
  const app = appFor(t, { requestLimit: 1 }); const id = await start(app);
  assert.equal((await ask(app, id)).status, 200);
  assert.equal((await ask(app, id)).status, 429);
  assert.equal((await request(app).post('/api/session').set('Origin', 'https://other.example')).status, 403);
  assert.equal((await request(app).post('/api/ghost').set('X-Session-ID', id).send({ question: 'x'.repeat(3000) })).status, 413);
});
test('concurrent questions cannot spend twice; timeouts fall back', async t => {
  let called;
  const invoked = new Promise(resolve => { called = resolve; });
  const app = appFor(t, { provider: 'openai', apiKey: 'test', aiTimeout: 100, fetchAI: async (url, options) => {
    called();
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('timeout'))));
  } });
  const id = await start(app);
  const pending = ask(app, id).then(result => result);
  await invoked;
  assert.equal((await ask(app, id)).status, 409);
  assert.equal((await pending).body.source, 'scripted');
});

test('scripted mode ignores configured keys and preserves variety/context across refresh', async t => {
  let paidCalls = 0;
  const app = appFor(t, { apiKey: 'must-not-be-used', fetchAI: async () => { paidCalls++; throw new Error('Unexpected paid call'); } });
  const id = await start(app);
  const replies = new Set();
  const introduction = await ask(app, id, 'My name is Ada');
  replies.add(introduction.body.reply);
  for (let i = 1; i < 20; i++) {
    if (i === 10) {
      const restored = await request(app).get('/api/session').set('X-Session-ID', id);
      assert.equal(restored.body.remaining, 10);
      assert.equal(restored.body.messages.length, 20);
    }
    const result = await ask(app, id, 'What is my name?');
    assert.equal(result.status, 200);
    assert.match(result.body.reply, /Ada/);
    assert.equal(replies.has(result.body.reply), false);
    replies.add(result.body.reply);
  }
  assert.equal((await ask(app, id)).status, 429);
  assert.equal(paidCalls, 0);
  const other = await start(app);
  assert.doesNotMatch((await ask(app, other, 'What is my name?')).body.reply, /Ada/);
});
test('unimplemented and unknown provider configurations fail explicitly', t => {
  for (const provider of ['gemini', 'groq', 'typo']) {
    assert.throws(() => appFor(t, { provider }), /adapter|GHOST_PROVIDER/);
  }
});
test('rare scripted events expose only allowlisted presentation hints', async t => {
  const app = appFor(t, { random: () => 0 });
  const id = await start(app);
  for (let i = 1; i < 8; i++) assert.equal((await ask(app, id, 'A puzzle')).body.effect, null);
  const result = await ask(app, id, 'A puzzle');
  assert.equal(result.body.effect, 'double-shadow');
  assert.equal(result.body.source, 'scripted');
  assert.equal(result.body.remaining, 12);
});
