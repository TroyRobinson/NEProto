import { addLog } from './logStore';

export async function callOpenRouter(payload: Record<string, unknown>) {
  const msgs = Array.isArray((payload as { messages?: unknown[] }).messages)
    ? ((payload as { messages?: { content?: string }[] }).messages as { content?: string }[])
    : [];
  const logPayload = {
    model: (payload as { model?: string }).model,
    messages: msgs.length,
    tools: Array.isArray((payload as { tools?: unknown[] }).tools)
      ? (payload as { tools?: unknown[] }).tools!.length
      : undefined,
  };
  addLog({
    service: 'OpenRouter',
    direction: 'request',
    message: logPayload,
    last: msgs[msgs.length - 1]?.content,
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
  addLog({
    service: 'OpenRouter',
    direction: 'response',
    message: logResponse,
    last: cleaned.choices?.[0]?.message?.content,
  });
  return json;
}
