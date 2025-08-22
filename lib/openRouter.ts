import { addLog } from './logStore';

export async function callOpenRouter(payload: Record<string, unknown>) {
  const messages = Array.isArray((payload as { messages?: unknown[] }).messages)
    ? (payload as { messages?: unknown[] }).messages!
    : undefined;
  const logPayload = {
    model: (payload as { model?: string }).model,
    messages: messages?.length,
    tools: Array.isArray((payload as { tools?: unknown[] }).tools)
      ? (payload as { tools?: unknown[] }).tools!.length
      : undefined,
    last: messages?.[messages.length - 1]?.content,
  };
  addLog({ service: 'OpenRouter', direction: 'request', message: logPayload });
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
  const cleaned = JSON.parse(
    JSON.stringify(json, (key, value) =>
      key === 'reasoning' || key === 'reasoning_details' ? undefined : value
    )
  );
  const logResponse = {
    model: cleaned.model,
    choices: cleaned.choices?.map((c: { finish_reason?: string }) => ({
      finish_reason: c.finish_reason,
    })),
  };
  addLog({ service: 'OpenRouter', direction: 'response', message: logResponse });
  return json;
}
