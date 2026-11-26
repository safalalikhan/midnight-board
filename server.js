import 'dotenv/config';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { QUESTION_LIMIT, createGhostContext, explicitName, scriptedReply } from './ghost-responses.js';
import { getProvider } from './ghost-providers.js';

const root = path.dirname(fileURLToPath(import.meta.url));
// Reserve BEFORE sending: even failed/aborted requests may incur provider costs.
// The file survives restarts. Corrupt or unwritable storage disables paid calls.
export function createBudget(directory, limit) {
  const file = path.join(directory, 'daily-usage.json');
  return function reserve() {
    try {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      let usage;
      try { usage = JSON.parse(readFileSync(file, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') return false; }
      const day = new Date().toISOString().slice(0, 10);
      if (usage && (typeof usage.day !== 'string' || !Number.isInteger(usage.count) || usage.count < 0)) return false;
      if (!usage || usage.day !== day) usage = { day, count: 0 };
      if (usage.count >= limit) return false;
      usage.count++;
      writeFileSync(`${file}.tmp`, JSON.stringify(usage), { mode: 0o600 });
      renameSync(`${file}.tmp`, file);
      return true;
    } catch { return false; }
  };
}

export function createApp({
  provider = process.env.GHOST_PROVIDER || 'scripted',
  random = Math.random,
  apiKey = process.env.OPENAI_API_KEY || '',
  fetchAI = fetch,
  budgetDirectory = path.join(root, '.data'),
  dailyLimit = Math.min(100, Math.max(0, Number(process.env.MAX_DAILY_AI_REQUESTS ?? 100) || 0)),
  requestLimit = 6,
  hourlyLimit = 30,
  aiTimeout = 20000
} = {}) {
  const app = express();
  const sessions = new Map();
  const generate = getProvider(provider, { apiKey, fetchAI });
  const reserve = createBudget(budgetDirectory, dailyLimit);
  app.disable('x-powered-by');
  // Only explicit frontend files are public. Never serve the project directory.
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      'Permissions-Policy': 'microphone=(self)',
      'Cache-Control': 'no-store'
    });
    next();
  });
  for (const [route, file] of [['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'], ['/script.js', 'script.js']]) {
    app.get(route, (req, res) => res.sendFile(path.join(root, file)));
  }
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (req.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${req.protocol}://${req.get('host')}`)) {
      return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    }
    next();
  });
  app.use('/api', express.json({ limit: '2kb' }));
  const limits = (limit, windowMs) => rateLimit({
    windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'The board needs a rest. Please wait before trying again.' }
  });
  app.post('/api/session', limits(10, 60 * 60 * 1000), (req, res) => {
    for (const [id, session] of sessions) {
      if (Date.now() > session.expires) { session.controller?.abort(); sessions.delete(id); }
    }
    if (sessions.size >= 1000) return res.status(503).json({ error: 'The board is full. Try again later.' });
    const id = randomBytes(32).toString('hex');
    sessions.set(id, { messages: [], ghost: createGhostContext(), count: 0, expires: Date.now() + 2 * 60 * 60 * 1000, busy: false });
    res.json({ sessionId: id, remaining: QUESTION_LIMIT, messages: [] });
  });
  function sessionFor(req, res, next) {
    const id = req.get('x-session-id');
    const session = sessions.get(id);
    if (!session || Date.now() > session.expires) {
      session?.controller?.abort();
      sessions.delete(id);
      return res.status(410).json({ error: 'This séance expired. End it and start a new one.' });
    }
    req.seance = session;
    req.seanceId = id;
    next();
  }
  app.get('/api/session', sessionFor, (req, res) => res.json({
    messages: req.seance.messages, remaining: QUESTION_LIMIT - req.seance.count
  }));
  app.delete('/api/session', sessionFor, (req, res) => {
    req.seance.controller?.abort();
    sessions.delete(req.seanceId);
    res.sendStatus(204);
  });
  app.post('/api/ghost', limits(requestLimit, 60000), limits(hourlyLimit, 3600000), sessionFor, async (req, res) => {
    const question = req.body?.question;
    if (typeof question !== 'string' || !question.trim() || question.length > 120) {
      return res.status(400).json({ error: 'Questions must contain 1–120 characters.' });
    }
    const session = req.seance;
    if (session.busy) return res.status(409).json({ error: 'Wait for the current whisper to finish.' });
    if (session.count >= QUESTION_LIMIT) return res.status(429).json({ error: 'All 20 questions have been used. End this séance to begin another.', remaining: 0 });
    session.busy = true;
    session.count++; // Atomic before await: concurrent requests cannot bypass the cap.
    const content = question.trim();
    const visitorName = explicitName(content);
    if (visitorName) session.ghost.visitorName = visitorName;
    let result;
    const controller = new AbortController();
    session.controller = controller;
    const onClose = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', onClose);
    const timer = setTimeout(() => controller.abort(), aiTimeout);
    try {
      if (generate && apiKey && reserve()) {
        const reply = await generate({ question: content, history: session.messages, context: session.ghost, signal: controller.signal });
        if (session.ghost.usedReplies.includes(reply)) throw new Error('Repeated provider response');
        session.ghost.usedReplies.push(reply);
        result = { reply, source: 'ai', effect: null };
      }
    } catch { /* Provider failures use the complete scripted engine, without retries. */ }
    finally {
      clearTimeout(timer);
      res.off('close', onClose);
      session.busy = false;
      session.controller = null;
    }
    if (!sessions.has(req.seanceId)) return;
    result ??= scriptedReply(content, session.ghost, session.messages, session.count, random);
    session.messages.push({ role: 'user', content }, { role: 'assistant', content: result.reply, source: result.source });
    // A refresh may disconnect the caller; keep the accepted turn available for resumption.
    if (!res.destroyed) res.json({ ...result, remaining: QUESTION_LIMIT - session.count });
  });
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((error, req, res, next) => {
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'The request could not be read.' });
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, '127.0.0.1', () => {
    console.log(`The Midnight Board: http://localhost:${port}`);
    console.log(`Ghost provider: ${process.env.GHOST_PROVIDER || 'scripted'}. Twenty-question séances enabled.`);
  });
}
