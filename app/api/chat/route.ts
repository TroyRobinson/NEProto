import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

async function searchCensus(query: string) {
  // Search variables from the 2021 ACS 5-year dataset
  const resp = await fetch('https://api.census.gov/data/2021/acs/acs5/variables.json');
  const json = await resp.json();
  const variables = json.variables as Record<string, { label: string; concept: string }>;
  const q = query.toLowerCase();
  const results = Object.entries(variables)
    .filter(([, info]) => info.label.toLowerCase().includes(q))
    .slice(0, 5)
    .map(([id, info]) => ({ id, label: info.label, concept: info.concept }));
  return results;
}

async function callOpenRouter(payload: Record<string, unknown>) {
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
  return res.json();
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_census',
        description:
          'Search the US Census ACS 2021 5-year dataset for variables matching a query. Returns a list of matching variable ids and descriptions.',
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
          'Add a Census variable to the user\'s metric selection dropdown. Provide the variable id and a human readable label.',
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

  const initial = await callOpenRouter({
    model: 'openai/gpt-5-mini',
    messages,
    tools,
  });

  const first = initial.choices?.[0]?.message;
  const toolCalls = first?.tool_calls ?? [];
  const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];
  const convo: Message[] = [...messages, first];

  for (const call of toolCalls) {
    const name = call.function.name;
    const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
    let result: unknown;
    if (name === 'search_census') {
      result = await searchCensus(args.query as string);
    } else if (name === 'add_metric') {
      result = { ok: true };
      toolInvocations.push({ name, args });
    }
    convo.push({
      role: 'tool',
      content: JSON.stringify(result),
      tool_call_id: call.id,
    });
  }

  let finalMessage = first;
  if (toolCalls.length > 0) {
    const second = await callOpenRouter({
      model: 'openai/gpt-5-mini',
      messages: convo,
    });
    finalMessage = second.choices?.[0]?.message;
  }

  return NextResponse.json({
    message: finalMessage,
    toolInvocations,
  });
}

