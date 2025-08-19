import { NextRequest, NextResponse } from 'next/server';
import adminDb from '../../../lib/adminDb';
import { callOpenRouter } from '../../../lib/openRouter';
import { Stat } from '../../../types/stat';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

async function searchStats(query: string) {
  const q = query.toLowerCase();
  const res = (await adminDb.query({
    stats: {
      where: {
        or: [
          { title: { $ilike: `%${q}%` } },
          { description: { $ilike: `%${q}%` } },
        ],
      },
    },
  })) as { stats: Stat[] };
  const list = res.stats || [];
  return list.map((s) => ({ id: s.variable, label: s.title, concept: s.category }));
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_stats',
        description: 'Search stored statistics matching a query.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term for the desired statistic' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'add_metric',
        description: 'Add a stored statistic to the user\'s metric selection dropdown.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Variable identifier' },
            label: { type: 'string', description: 'Human readable label' },
          },
          required: ['id', 'label'],
        },
      },
    },
  ];

  const convo: Message[] = [...messages];
  const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];

  while (true) {
    const response = await callOpenRouter({
      model: 'openai/gpt-5-mini',
      messages: convo,
      tools,
      tool_choice: 'auto',
      reasoning: { effort: 'low' },
      text: { verbosity: 'low' },
    });

    const message = response.choices?.[0]?.message;
    const toolCalls = message?.tool_calls ?? [];
    convo.push(message as Message);

    if (!toolCalls.length) {
      return NextResponse.json({ message, toolInvocations });
    }

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
      let result: unknown;
      if (name === 'search_stats') {
        result = await searchStats(args.query as string);
      } else if (name === 'add_metric') {
        toolInvocations.push({ name, args });
        result = { ok: true };
      }
      convo.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: call.id,
      });
    }
  }
}
