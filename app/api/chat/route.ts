import { NextRequest, NextResponse } from 'next/server';
import { searchCensus, validateVariableId } from '../../../lib/censusTools';
import { callOpenRouter } from '../../../lib/openRouter';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}


export async function POST(req: NextRequest) {
  const { messages, config, mode, stats } = await req.json();

  if (mode === 'user') {
    const tools = [
      {
        type: 'function',
        function: {
          name: 'select_stat',
          description: 'Select the best matching statistic code from the provided list.',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'Statistic code' },
            },
            required: ['code'],
          },
        },
      },
    ];
    const list = (stats || [])
      .map((s: { code: string; description: string }) => `${s.code}: ${s.description}`)
      .join('\n');
    const convo: Message[] = [
      { role: 'system', content: `You know about these stats:\n${list}` },
      ...(messages ? messages.slice(-1) : []),
    ];
    const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];
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
        return NextResponse.json({ message, toolInvocations });
      }
      for (const call of toolCalls) {
        const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
        const code = args.code as string;
        const exists = (stats || []).some((s: { code: string }) => s.code === code);
        let result: unknown;
        if (exists) {
          result = { ok: true };
          toolInvocations.push({ name: 'select_stat', args: { code } });
        } else {
          result = { ok: false, error: 'Unknown code' };
        }
        convo.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: call.id,
        });
      }
    }
  }

  if (mode === 'fast-admin') {
    const { year = '2023', dataset = 'acs/acs5' } = config || {};
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
    let lastResults: Array<{ id: string; label: string; concept: string }> = [];
    for (let i = 0; i < 5; i++) {
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
        return NextResponse.json({ message, toolInvocations });
      }
      for (const call of toolCalls) {
        const name = call.function.name;
        const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
        let result: unknown;
        if (name === 'search_census') {
          lastResults = await searchCensus(args.query as string, year, dataset);
          result = lastResults;
        } else if (name === 'add_metric') {
          const id = args.id as string;
          const label = args.label as string;
          const exists = lastResults.some(r => r.id === id);
          if (exists && await validateVariableId(id, year, dataset)) {
            result = { ok: true };
            toolInvocations.push({ name, args: { id, label } });
          } else {
            result = { ok: false, error: 'Variable not found in search results' };
          }
        }
        convo.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: call.id,
        });
      }
    }
    return NextResponse.json({ message: { role: 'assistant', content: 'No valid result.' }, toolInvocations });
  }

  const { year = '2023', dataset = 'acs/acs5' } = config || {};

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
      if (message && 'reasoning' in (message as Record<string, unknown>)) {
        delete (message as Record<string, unknown>).reasoning;
      }
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
}

