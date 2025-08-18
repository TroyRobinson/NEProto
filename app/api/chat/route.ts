import { NextRequest, NextResponse } from 'next/server';
import type { LogMessage } from '../../../types/log';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

interface CensusVariable {
  id: string;
  label: string;
  concept: string;
}

let variablesCache: Array<[string, { label: string; concept: string }]> | null = null;
const searchCache = new Map<string, CensusVariable[]>();

async function searchCensus(
  query: string,
  logs: LogMessage[]
): Promise<CensusVariable[]> {
  const q = query.toLowerCase();
  if (searchCache.has(q)) return searchCache.get(q)!;
  if (!variablesCache) {
    // Load variables from the 2021 ACS 5-year dataset once per process
    const url = 'https://api.census.gov/data/2021/acs/acs5/variables.json';
    logs.push({ service: 'US Census', direction: 'request', body: url });
    const resp = await fetch(url);
    const json = await resp.json();
    logs.push({ service: 'US Census', direction: 'response', body: json });
    variablesCache = Object.entries(
      json.variables as Record<string, { label: string; concept: string }>
    );
  }
  const results = variablesCache
    .filter(([, info]) => info.label.toLowerCase().includes(q))
    .slice(0, 5)
    .map(([id, info]) => ({ id, label: info.label, concept: info.concept }));
  searchCache.set(q, results);
  return results;
}

async function callOpenRouter(
  payload: Record<string, unknown>,
  logs: LogMessage[]
) {
  logs.push({ service: 'OpenRouter', direction: 'request', body: payload });
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
  logs.push({ service: 'OpenRouter', direction: 'response', body: json });
  return json;
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const logs: LogMessage[] = [];
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
    const response = await callOpenRouter(
      {
        model: 'openai/gpt-5-nano',
        messages: convo,
        tools,
        tool_choice: 'auto',
      },
      logs
    );

    const message = response.choices?.[0]?.message;
    const toolCalls = message?.tool_calls ?? [];
    convo.push(message as Message);

    if (!toolCalls.length) {
      return NextResponse.json({
        message,
        toolInvocations,
        logs,
      });
    }

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
      let result: unknown;
      if (name === 'search_census') {
        result = await searchCensus(args.query as string, logs);
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
  }
}

