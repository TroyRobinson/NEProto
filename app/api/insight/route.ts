import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '../../../lib/openRouter';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const { messages, stats } = await req.json();

  if (!stats || !Array.isArray(stats) || stats.length === 0) {
    return NextResponse.json({ message: { role: 'assistant', content: 'No data available.' } });
  }

  const statLines = stats
    .map(
      (s: { code: string; description: string; data: Record<string, number | null> }) =>
        `${s.code}: ${s.description}\n${Object.entries(s.data)
          .map(([z, v]) => `${z}: ${v}`)
          .join(', ')}`
    )
    .join('\n\n');

  const convo: Message[] = [
    {
      role: 'system',
      content: `You are a helpful data analyst. Use the following statistics with their ZCTA values to answer questions. Respond with a simple conclusion or summary, no more than three sentences, and do not use markdown or other formatting.\n${statLines}`,
    },
    ...(messages || []),
  ];

  const response = await callOpenRouter({
    model: 'openai/gpt-oss-120b:nitro',
    messages: convo,
    reasoning: { effort: 'low' },
    text: { verbosity: 'low' },
    max_output_tokens: 300,
  });

  const message = response.choices?.[0]?.message as Message | undefined;
  if (message && (message as unknown as { reasoning?: unknown }).reasoning) {
    delete (message as unknown as { reasoning?: unknown }).reasoning;
  }

  return NextResponse.json({ message });
}
