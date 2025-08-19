import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '../../../lib/openRouter';
import { init } from '@instantdb/admin';
import schema from '../../../instant.schema';
import type { Stat } from '../../../types/stat';

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const adminToken = process.env.INSTANT_ADMIN_TOKEN!;
const adminDb = init({ appId, adminToken, schema });

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
        name: 'find_stat',
        description: 'Search stored stats for variables matching a query. Returns variable ids and descriptions.',
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
        description: 'Add an existing stat to the map. Provide the variable id and a label.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['id', 'label'],
        },
      },
    },
  ];

  const convo: Message[] = [
    {
      role: 'system',
      content:
        'You help users find previously saved stats. Use find_stat to search by natural language. If you successfully add one with add_metric, reply with "Added to map!". If nothing matches, say "No matching stat found."',
    },
    ...messages,
  ];
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
      if (name === 'find_stat') {
        const q = (args.query as string) || '';
        const queryRes = await adminDb.query({
          stats: {
            where: {
              or: [
                { title: { $ilike: `%${q}%` } },
                { description: { $ilike: `%${q}%` } },
              ],
            },
          },
        });
        const stats = (queryRes.stats || []) as Stat[];
        result = stats.map((s) => ({ id: s.variableId, label: s.description }));
      } else if (name === 'add_metric') {
        toolInvocations.push({ name, args });
        result = { ok: true };
      }
      convo.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: call.id });
    }
  }
}
