import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '../../../lib/logStore';
import {
  CENSUS_VARIABLES,
  type CensusVariable,
} from '../../../lib/censusVariables';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

type SearchResult = Omit<CensusVariable, 'keywords'>;
const searchCache = new Map<string, SearchResult[]>();

async function searchCensus(query: string): Promise<SearchResult[]> {
  const q = query.toLowerCase();
  if (searchCache.has(q)) return searchCache.get(q)!;
  addLog({
    service: 'US Census',
    direction: 'request',
    message: { type: 'search', query },
  });
  const results = CENSUS_VARIABLES.filter(
    (v) =>
      v.label.toLowerCase().includes(q) ||
      v.keywords.some((k) => k.includes(q))
  )
    .slice(0, 5)
    .map(({ id, label, concept }) => ({ id, label, concept }));
  searchCache.set(q, results);
  addLog({
    service: 'US Census',
    direction: 'response',
    message: results,
  });
  return results;
}

async function callOpenRouter(payload: Record<string, unknown>) {
  addLog({ service: 'OpenRouter', direction: 'request', message: payload });
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
  addLog({ service: 'OpenRouter', direction: 'response', message: json });
  return json;
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_census',
        description:
          'Search a curated list of US Census ACS 2023 5-year variables matching a query. Returns a list of matching variable ids and descriptions.',
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
  }
}

