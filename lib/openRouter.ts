import { addLog } from './logStore';

async function logViaApi(origin: string, entry: { service: string; direction: 'request' | 'response'; message: unknown; last?: string }) {
  try {
    await fetch(`${origin}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // swallow logging errors
  }
}

export async function callOpenRouter(payload: Record<string, unknown>, origin?: string) {
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
  const requestEntry = {
    service: 'OpenRouter',
    direction: 'request' as const,
    message: logPayload,
    last: msgs[msgs.length - 1]?.content,
  };
  if (origin) await logViaApi(origin, requestEntry); else addLog(requestEntry);
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
  const responseEntry = {
    service: 'OpenRouter',
    direction: 'response' as const,
    message: logResponse,
    last: cleaned.choices?.[0]?.message?.content,
  };
  if (origin) await logViaApi(origin, responseEntry); else addLog(responseEntry);
  return json;
}
