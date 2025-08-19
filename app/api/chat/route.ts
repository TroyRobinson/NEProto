import { NextRequest, NextResponse } from 'next/server';
import { searchCensus, validateVariableId } from '../../../lib/censusTools';
import { searchStats } from '../../../lib/statsTools';
import { callOpenRouter } from '../../../lib/openRouter';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}


export async function POST(req: NextRequest) {
  const { messages, config, mode = 'user' } = await req.json();
  const { year = '2023', dataset = 'acs/acs5' } = config || {};

  const tools =
    mode === 'admin'
      ? [
          {
            type: 'function',
            function: {
              name: 'search_census',
              description: `Search the US Census ${year} ${dataset} dataset for variables matching a query. Returns a list of matching variable ids and descriptions.`,
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search term for the desired statistic',
                  },
                },
                required: ['query'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'add_metric',
              description:
                "Add a Census variable to the user's metric selection dropdown. Provide the variable id and a human readable label.",
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
        ]
      : [
          {
            type: 'function',
            function: {
              name: 'search_stats',
              description:
                'Search the local stats database for variables matching a query. Returns a list of variable ids and descriptions.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search term for the desired statistic',
                  },
                },
                required: ['query'],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'add_metric',
              description:
                "Add a stored variable to the user's metric selection dropdown. Provide the variable id and a human readable label.",
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
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    });

    const message = response.choices?.[0]?.message;
    const toolCalls = message?.tool_calls ?? [];
    convo.push(message as Message);

    if (!toolCalls.length) {
      return NextResponse.json({
        message,
        toolInvocations,
      });
    }

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
      let result: unknown;
      if (name === 'search_census') {
        result = await searchCensus(args.query as string, year, dataset);
      } else if (name === 'search_stats') {
        result = await searchStats(args.query as string);
      } else if (name === 'add_metric') {
        if (mode === 'admin') {
          const id = args.id as string;
          if (await validateVariableId(id, year, dataset)) {
            result = { ok: true };
            toolInvocations.push({ name, args });
          } else {
            result = { ok: false, error: 'Unknown variable id' };
          }
        } else {
          result = { ok: true };
          toolInvocations.push({ name, args });
        }
      }
      convo.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: call.id,
      });
    }
  }
}

