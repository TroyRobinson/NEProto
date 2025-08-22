import { addLog } from './logStore';

export async function callOpenRouter(payload: Record<string, unknown>) {
  const last = Array.isArray(payload.messages)
    ? (payload.messages as any[]).slice(-1)[0]
    : undefined;
  addLog({
    service: 'OpenRouter',
    direction: 'request',
    message: {
      model: payload.model,
      lastUser: last?.content,
    },
  });
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
  addLog({
    service: 'OpenRouter',
    direction: 'response',
    message: {
      model: payload.model,
      finish_reason: json.choices?.[0]?.finish_reason,
    },
  });
  return json;
}
