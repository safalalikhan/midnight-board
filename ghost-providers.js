// Server-only provider boundary. Unimplemented adapters fail explicitly at startup.
export const PROVIDERS = Object.freeze(['scripted', 'gemini', 'groq', 'openai']);
const instructions = `You are the Midnight Board's mysterious fictional ghost in a Halloween game.
Reply naturally to the visitor and remember this conversation. Use one short sentence,
preferably under 90 characters, never over 120 characters. Plain English text only.
Be eerie but kind. Never claim real supernatural powers, surveillance, or contact with actual dead people.
Never threaten, manipulate, or discourage leaving. For serious distress or real-world advice,
drop the spooky role and respond supportively without pretending to know the future.`;

export function getProvider(name, { apiKey, fetchAI }) {
  if (!PROVIDERS.includes(name)) throw new Error('Unknown GHOST_PROVIDER');
  if (name === 'gemini' || name === 'groq') throw new Error(`${name} adapter is not implemented yet; use scripted or openai.`);
  if (name === 'scripted') return null;
  return async ({ question, history, context, signal }) => {
    if (!apiKey) throw new Error('Provider key not configured');
    const response = await fetchAI('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        instructions: `${instructions} Established fictional identity: ${context.ghost.name}. ${context.ghost.backstory}`,
        input: [...history.map(({ role, content }) => ({ role, content })), { role: 'user', content: question }],
        reasoning: { effort: 'none' }, max_output_tokens: 100, store: false
      })
    });
    if (!response.ok) throw new Error('Provider unavailable');
    const data = await response.json();
    const text = data.output?.filter(item => item.type === 'message')
      .flatMap(item => item.content || []).filter(item => item.type === 'output_text')
      .map(item => item.text).join(' ').trim();
    if (!text || data.status === 'incomplete') throw new Error('No complete response');
    return text.slice(0, 120);
  };
}
