import { addLog } from './logStore';

export async function callOpenRouter(payload: Record<string, unknown>) {
  addLog({ service: 'OpenRouter', direction: 'request', message: payload });
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter error: ${res.status}`);
  }
  const json = await res.json();
  addLog({ service: 'OpenRouter', direction: 'response', message: json });
  return json;
}
