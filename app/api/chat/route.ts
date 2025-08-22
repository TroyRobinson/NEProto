import { NextRequest, NextResponse } from 'next/server';
import {
  searchCensus,
  validateVariableId,
  getVariableById,
  type CensusVariable,
} from '../../../lib/censusTools';
import { callOpenRouter } from '../../../lib/openRouter';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

function parseMetricIds(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const idList = trimmed.match(
    /^([A-Z]\d{5}_\d{3}E)(\s*,\s*[A-Z]\d{5}_\d{3}E)*$/i
  );
  if (!idList) return [];
  return trimmed.split(/\s*,\s*/);
}

function parseActionQuery(input: string): string | null {
  const match = input.trim().match(/^(add|map|show)\s+([^?!.]+)$/i);
  if (!match) return null;
  const rest = match[2].trim();
  const words = rest.split(/\s+/);
  if (words.length < 1 || words.length > 7) return null;
  return rest;
}

export async function runModel(
  model: string,
  convo: Message[],
  stats: Array<{ code: string; description: string; data?: unknown }> = [],
  year: string,
  dataset: string,
  callModel: typeof callOpenRouter = callOpenRouter
) {
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
    {
      type: 'function',
      function: {
        name: 'load_stat',
        description: 'Load a stored statistic by code.',
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

  const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];
  let lastSearch: CensusVariable[] | null = null;
  let lastSearchEmpty = false;

  while (true) {
    const response = await callModel({
      model,
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
      return { message, toolInvocations, lastSearchEmpty };
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
          lastSearch = null;
          lastSearchEmpty = false;
        } else {
          result = { ok: false, error: 'Unknown variable id' };
        }
      } else if (name === 'load_stat') {
        const code = args.code as string;
        const stat = stats.find((s) => s.code === code);
        if (stat) {
          result = { ok: true, stat };
          toolInvocations.push({ name, args: { code } });
        } else {
          result = { ok: false, error: 'Unknown code' };
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

export async function POST(req: NextRequest) {
  const { messages: incoming, config, stats } = await req.json();
  const {
    year = '2023',
    dataset = 'acs/acs5',
    region = 'Oklahoma County ZCTAs',
    geography = 'zip code tabulation area',
  } = config || {};

  const statsSummary = (stats || [])
    .map((s) => `${s.code}: ${s.description}`)
    .join(' | ');
  const systemPrompt = `You help users find US Census statistics. Limit responses to ${region} using ${dataset} ${year} data for ${geography}. Be brief, a few sentences, plain text only. Use load_stat with a code to retrieve data. Available stats: ${statsSummary}`;
  const messages: Message[] = incoming;
  if (!messages.length || messages[0].role !== 'system') {
    messages.unshift({ role: 'system', content: systemPrompt });
  } else {
    messages[0] = { ...messages[0], content: `${messages[0].content} Be brief, a few sentences, plain text only.` };
  }

  const lastUser = [...messages]
    .reverse()
    .find((m: Message) => m.role === 'user')?.content || '';

  const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];

  const ids = parseMetricIds(lastUser);
  if (ids.length) {
    const added: string[] = [];
    for (const id of ids) {
      if (await validateVariableId(id, year, dataset)) {
        const info = await getVariableById(id, year, dataset);
        const label = info?.label || id;
        toolInvocations.push({ name: 'add_metric', args: { id, label } });
        added.push(`${label} (${id})`);
      }
    }
    const content = added.length
      ? `Added ${added.join(', ')} to your metrics list.`
      : 'No valid Census variable ids found.';
    return NextResponse.json({
      message: { role: 'assistant', content },
      toolInvocations,
    });
  }

  const action = parseActionQuery(lastUser);
  if (action) {
    const results = await searchCensus(action, year, dataset);
    if (results.length) {
      const best = results[0];
      toolInvocations.push({ name: 'add_metric', args: { id: best.id, label: best.label } });
      return NextResponse.json({
        message: {
          role: 'assistant',
          content: `Added "${best.label}" (${best.id}) to your metrics list.`,
        },
        toolInvocations,
      });
    }
    // fall through to full chat if not found
  }

  const convo: Message[] = [...messages];
  const first = await runModel('openai/gpt-oss-120b:nitro', convo, stats, year, dataset);
  toolInvocations.push(...first.toolInvocations);
  if (first.lastSearchEmpty) {
    convo.push({
      role: 'assistant',
      content: "The data we are considering is not found, I'm going to search deeper.",
    });
    const deeper = await runModel('openai/gpt-5-mini', convo, stats, year, dataset);
    toolInvocations.push(...deeper.toolInvocations);
    return NextResponse.json({ message: deeper.message, toolInvocations });
  }
  return NextResponse.json({ message: first.message, toolInvocations });
}
