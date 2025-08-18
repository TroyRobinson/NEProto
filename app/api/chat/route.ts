import { NextResponse } from 'next/server';

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

type CensusVariable = { label: string; concept: string };

async function searchCensusMetrics(query: string) {
  const res = await fetch('https://api.census.gov/data/2022/acs/acs5/variables.json');
  const data = await res.json();
  const entries = Object.entries(data.variables as Record<string, CensusVariable>);
  const matches = entries
    .filter(([name, info]) =>
      name.toLowerCase().includes(query.toLowerCase()) ||
      info.label.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5)
    .map(([name, info]) => ({ name, label: info.label, concept: info.concept }));
  return matches;
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'search_census_metrics',
      description: 'Search US Census ACS 5-year 2022 variables matching a query string',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term for census variable labels or names' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_metric',
      description: 'Add a census metric to the selection dropdown',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Census variable name' },
          label: { type: 'string', description: 'Human readable label for the variable' }
        },
        required: ['name', 'label']
      }
    }
  }
];

type ChatMessage = { role: string; content?: string; [key: string]: unknown };

async function callOpenRouter(messages: ChatMessage[]) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': 'https://example.com',
      'X-Title': 'NEProto'
    },
    body: JSON.stringify({ model: 'openai/gpt-5-mini', messages, tools })
  });
  return resp.json();
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const history: ChatMessage[] = [
    {
      role: 'system',
      content: 'You help users explore metrics from the US Census. Use tools to search for metrics and add them when asked.'
    },
    ...messages
  ];

  let addedMetric: { name: string; label: string } | null = null;

  for (let i = 0; i < 3; i++) {
    const data = await callOpenRouter(history);
    const msg = data.choices?.[0]?.message;
    if (!msg) break;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      history.push(msg);
      for (const call of msg.tool_calls) {
        const args = JSON.parse(call.function.arguments || '{}');
        if (call.function.name === 'search_census_metrics') {
          const result = await searchCensusMetrics(args.query);
          history.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        } else if (call.function.name === 'add_metric') {
          addedMetric = { name: args.name, label: args.label };
          history.push({ role: 'tool', tool_call_id: call.id, content: 'added' });
        }
      }
      continue;
    }

    return NextResponse.json({ reply: msg.content, addedMetric });
  }

  return NextResponse.json({ reply: 'Unable to complete request.', addedMetric });
}

