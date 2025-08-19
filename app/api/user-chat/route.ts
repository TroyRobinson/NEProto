import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '../../../lib/openRouter';
import { init } from '@instantdb/admin';
import type { Stat } from '../../../types/stat';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_stats',
        description: 'Search stored stats by code or description.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'add_stat_to_map',
        description: 'Add a stored stat to the map using its variable id.',
        parameters: {
          type: 'object',
          properties: {
            variableId: { type: 'string', description: 'Stat variable id' },
          },
          required: ['variableId'],
        },
      },
    },
  ];

  const convo: Message[] = [...messages];
  const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];

  while (true) {
    const response = await callOpenRouter({
      model: 'openai/gpt-5-nano',
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
        const q = String(args.query || '');
        const queryRes = await db.query({
          stats: {
            $: {
              where: {
                or: [
                  { variableId: { $ilike: `%${q}%` } },
                  { title: { $ilike: `%${q}%` } },
                  { description: { $ilike: `%${q}%` } },
                ],
              },
            },
          },
        });
        const stats = (queryRes.stats as Stat[] | undefined) || [];
        result = stats.map((s) => ({
          variableId: s.variableId,
          description: s.description,
        }));
      } else if (name === 'add_stat_to_map') {
        const variableId = String(args.variableId || '');
        const queryRes = await db.query({
          stats: { $: { where: { variableId } } },
        });
        const stat = (queryRes.stats as Stat[] | undefined)?.[0];
        if (stat) {
          result = { ok: true };
          toolInvocations.push({ name: 'add_stat', args: { id: stat.variableId, label: stat.description } });
        } else {
          result = { ok: false, error: 'Stat not found' };
        }
      }
      convo.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: call.id });
    }
  }
}
