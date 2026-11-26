import test from 'node:test';
import assert from 'node:assert/strict';
import { RESPONSES, RARE_RESPONSES, GHOST, QUESTION_LIMIT, classifyQuestion, createGhostContext, scriptedReply, explicitName } from '../ghost-responses.js';

test('library has over 300 original unique short lines and every intent has 24', () => {
  assert.ok(RESPONSES.length >= 300);
  assert.equal(new Set(RESPONSES.map(r => r.text)).size, RESPONSES.length);
  assert.equal(new Set(RESPONSES.map(r => r.id)).size, RESPONSES.length);
  for (const category of new Set(RESPONSES.map(r => r.category))) {
    assert.equal(RESPONSES.filter(r => r.category === category).length, 24);
  }
  for (const item of RESPONSES) assert.ok(item.text.length <= 65, item.id);
  assert.ok(RARE_RESPONSES.every(item => item.text.length <= 65));
});
test('intent matching favors specific phrases and word boundaries over broad yes/no', () => {
  const samples = {
    'What is your name?': 'names', 'Who are you?': 'identity',
    'How did you die?': 'backstory', 'What happens after death?': 'death',
    'I am scared': 'fear', 'Will I be rich?': 'future',
    'Does my partner love me?': 'love', 'Is my mother here?': 'family',
    'Tell me a secret': 'secrets', 'Do you know my name?': 'visitor_name',
    'Is this safe?': 'warnings', 'Can I leave?': 'endings',
    'Hello': 'greeting', 'Is the candle blue?': 'yesno',
    'Explain quantum physics': 'unknown', 'What did I ask?': 'memory',
    'The highlighter is broken': 'unknown'
  };
  for (const [question, intent] of Object.entries(samples)) assert.equal(classifyQuestion(question), intent, question);
});
test('every category remains non-repeating across twenty turns and serializable refresh state', () => {
  const prompts = ['Who are you?', 'Your name?', 'How did you die?', 'death', 'fear', 'future', 'love', 'family', 'secrets', 'My name is Ada', 'What did I ask?', 'Is this blue?', 'warning', 'unknown topic', 'goodbye', 'hello'];
  for (const prompt of prompts) {
    let context = createGhostContext();
    const history = [];
    const replies = new Set();
    for (let turn = 1; turn <= QUESTION_LIMIT; turn++) {
      if (turn === 10) context = JSON.parse(JSON.stringify(context));
      const result = scriptedReply(prompt, context, history, turn, () => .5);
      assert.equal(replies.has(result.reply), false, prompt);
      assert.ok(result.reply.length <= 100, result.reply);
      replies.add(result.reply);
      history.push({ role: 'user', content: prompt }, { role: 'assistant', content: result.reply });
    }
    assert.equal(replies.size, 20);
  }
});
test('ghost lore and explicitly supplied visitor name remain consistent and isolated', () => {
  const context = createGhostContext();
  assert.equal(explicitName('My sister is Ada'), null);
  assert.equal(explicitName('I am afraid'), null);
  assert.equal(explicitName('My name is Ada Lovelace'), 'Ada');
  const first = scriptedReply('What is my name?', context);
  assert.match(first.reply, /name|identity|unnamed|unsigned/i);
  scriptedReply('My name is Ada', context, [], 2);
  for (let turn = 3; turn <= 10; turn++) assert.match(scriptedReply('What is my name?', context, [], turn).reply, /Ada/);
  assert.deepEqual(context.ghost, GHOST);
  assert.equal(createGhostContext().visitorName, null);
  assert.match(scriptedReply('Your name?', context, [], 11).reply, /Ember/);
  assert.equal(context.visitorName, 'Ada');
});
test('memory refers to prior question and late turns use deeper dialogue', () => {
  const context = createGhostContext();
  const history = [{ role: 'user', content: 'Who are you?' }];
  assert.match(scriptedReply('What did I ask?', context, history).reply, /Who are you/);
  for (const turn of [1, 7, 14, 20]) {
    const result = scriptedReply('Tell me about the archive', context, history, turn);
    assert.equal(result.stage, turn <= 6 ? 0 : turn <= 13 ? 1 : 2);
    const used = context.usedIds.at(-1);
    assert.equal(RESPONSES.find(r => r.id === used).stage, result.stage);
  }
});
test('rare events require appropriate intent, spacing and a bounded count', () => {
  const context = createGhostContext();
  const events = [];
  for (let turn = 1; turn <= 20; turn++) {
    const result = scriptedReply('An unknown puzzle', context, [], turn, () => 0);
    if (result.effect) events.push(turn);
  }
  assert.deepEqual(events, [8, 13]);
  for (const question of ['Who are you?', 'I am scared', 'What is my name?', 'goodbye']) {
    assert.equal(scriptedReply(question, createGhostContext(), [], 15, () => 0).effect, null);
  }
});
