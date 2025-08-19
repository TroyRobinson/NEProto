import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '../../../lib/logStore';
import { CURATED_VARIABLES } from '../../../lib/censusVariables';
import { COMMON_QUERY_MAP } from '../../../lib/censusQueryMap';

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

const variablesCache = new Map<string, Array<[string, { label: string; concept: string }]>>();
const searchCache = new Map<string, CensusVariable[]>();

async function loadVariables(year: string, dataset: string) {
  const key = `${dataset}-${year}`;
  if (!variablesCache.has(key)) {
    addLog({
      service: 'US Census',
      direction: 'request',
      message: { endpoint: 'variables.json', year, dataset },
    });
    const resp = await fetch(
      `https://api.census.gov/data/${year}/${dataset}/variables.json`
    );
    const json = await resp.json();
    addLog({
      service: 'US Census',
      direction: 'response',
      message: { variables: Object.keys(json.variables).length, year, dataset },
    });
    variablesCache.set(
      key,
      Object.entries(json.variables as Record<string, { label: string; concept: string }>)
    );
  }
  return variablesCache.get(key)!;
}

async function validateVariableId(id: string, year: string, dataset: string) {
  if (CURATED_VARIABLES.some((v) => v.id === id)) return true;
  const vars = await loadVariables(year, dataset);
  return vars.some(([vid]) => vid === id);
}

async function searchCensus(
  query: string,
  year: string,
  dataset: string
): Promise<CensusVariable[]> {
  const q = query.toLowerCase().trim();
  const cacheKey = `${dataset}-${year}-${q}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  if (COMMON_QUERY_MAP[q]) {
    const { id, label, concept } = COMMON_QUERY_MAP[q];
    const result = [{ id, label, concept }];
    searchCache.set(cacheKey, result);
    return result;
  }

  const tokens = q.split(/\s+/);
  const curated = CURATED_VARIABLES.filter((v) =>
    tokens.every(
      (t) =>
        v.label.toLowerCase().includes(t) ||
        v.keywords.some((k) => k.includes(t))
    )
  ).map(({ id, label, concept }) => ({ id, label, concept }));

  if (curated.length) {
    searchCache.set(cacheKey, curated);
    return curated;
  }

  const vars = await loadVariables(year, dataset);
  addLog({
    service: 'US Census',
    direction: 'request',
    message: { type: 'search', query, year, dataset },
  });
  const results = vars
    .filter(([, info]) => info.label.toLowerCase().includes(q))
    .slice(0, 5)
    .map(([id, info]) => ({ id, label: info.label, concept: info.concept }));
  searchCache.set(cacheKey, results);
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
  const { messages, config } = await req.json();
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

