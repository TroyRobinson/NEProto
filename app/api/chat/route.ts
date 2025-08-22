import { NextRequest, NextResponse } from 'next/server';
import { searchCensus, validateVariableId, type CensusVariable } from '../../../lib/censusTools';
import { callOpenRouter } from '../../../lib/openRouter';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}


export async function POST(req: NextRequest) {
  const { messages, config, mode } = await req.json();

  const { year = '2023', dataset = 'acs/acs5' } = config || {};

  if (mode === 'fast-admin') {
    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_census',
          description:
            `Search the US Census ${year} ${dataset} dataset for variables matching a query. Returns a list of matching variable ids and descriptions.`,
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
    ];

    const convo: Message[] = [...messages];
    const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];
    let lastSearch: CensusVariable[] | null = null;
    let lastSearchEmpty = false;
    let pendingAdd: { id: string; label: string } | null = null;

    while (true) {
      const response = await callOpenRouter({
        model: 'openai/gpt-oss-120b:nitro',
        messages: convo,
        tools,
        tool_choice: 'auto',
        reasoning: { effort: 'low' },
        text: { verbosity: 'low' },
        max_output_tokens: 100,
      });

      const message = response.choices?.[0]?.message;
      const toolCalls = message?.tool_calls ?? [];
      convo.push(message as Message);

      if (!toolCalls.length) {
        if (message && 'reasoning' in (message as Record<string, unknown>)) {
          delete (message as Record<string, unknown>).reasoning;
        }
        if (!message?.content?.trim()) {
          if (pendingAdd) {
            return NextResponse.json({
              message: {
                role: 'assistant',
                content: `Added "${pendingAdd.label}" to your metrics list.`,
              },
              toolInvocations,
            });
          }
          if (lastSearchEmpty) {
            return NextResponse.json({
              message: {
                role: 'assistant',
                content: 'No matching Census variables found. Try a different search term.',
              },
              toolInvocations,
            });
          }
          if (lastSearch && lastSearch.length) {
            const best = lastSearch[0];
            toolInvocations.push({
              name: 'add_metric',
              args: { id: best.id, label: best.label },
            });
            return NextResponse.json({
              message: {
                role: 'assistant',
                content: `Added "${best.label}" to your metrics list.`,
              },
              toolInvocations,
            });
          }
        }
        return NextResponse.json({ message, toolInvocations });
      }

      for (const call of toolCalls) {
        const name = call.function.name;
        const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
        let result: unknown;
        if (name === 'search_census') {
          const searchResults = await searchCensus(args.query as string, year, dataset);
          lastSearch = searchResults;
          lastSearchEmpty = searchResults.length === 0;
          result = searchResults;
        } else if (name === 'add_metric') {
          const id = args.id as string;
          const match = lastSearch?.find((v) => v.id === id);
          if (!match) {
            result = { ok: false, error: 'id not in recent search results' };
          } else if (await validateVariableId(id, year, dataset)) {
            result = { ok: true };
            toolInvocations.push({ name, args: { id, label: match.label } });
            pendingAdd = { id, label: match.label };
            lastSearch = null;
            lastSearchEmpty = false;
          } else {
            result = { ok: false, error: 'Unknown variable id' };
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

  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_census',
        description:
          `Search the US Census ${year} ${dataset} dataset for variables matching a query. Returns a list of matching variable ids and descriptions.`,
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
  ];

  const convo: Message[] = [...messages];
  const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];
  let escalate = false;

  const run = async (model: string) => {
    while (true) {
      const response = await callOpenRouter({
        model,
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
        if (message && 'reasoning' in (message as Record<string, unknown>)) {
          delete (message as Record<string, unknown>).reasoning;
        }
        return message;
      }

      for (const call of toolCalls) {
        const name = call.function.name;
        const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
        let result: unknown;
        if (name === 'search_census') {
          const res = await searchCensus(args.query as string, year, dataset);
          if (res.length === 0 && model !== 'openai/gpt-5-mini') {
            escalate = true;
          }
          result = res;
        } else if (name === 'add_metric') {
          const id = args.id as string;
          if (await validateVariableId(id, year, dataset)) {
            result = { ok: true };
            toolInvocations.push({ name, args });
          } else {
            result = { ok: false, error: 'Unknown variable id' };
          }
        }
        convo.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: call.id,
        });
      }
    }
  };

  let message = await run('openai/gpt-oss-120b:nitro');
  if (escalate) {
    convo.push({
      role: 'assistant',
      content: 'The data we are considering is not found, I\'m going to search deeper.',
    });
    message = await run('openai/gpt-5-mini');
  }
  return NextResponse.json({ message, toolInvocations });
}

