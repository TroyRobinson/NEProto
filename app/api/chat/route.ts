import { NextRequest, NextResponse } from 'next/server';
import { searchCensus, validateVariableId } from '../../../lib/censusTools';
import { callOpenRouter } from '../../../lib/openRouter';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

const VAR_ID = /[A-Z][0-9]{5}_[0-9]{3}[A-Z]?E/;
const ID_LIST = new RegExp(`^${VAR_ID.source}(\s*,\s*${VAR_ID.source})*$`);
const ACTION = /^(add|map|show|plot|display|load)\s+([a-z0-9\s]{1,50})$/i;

export async function POST(req: NextRequest) {
  const { messages, config, stats, activeStats, metrics } = await req.json();
  const last = messages[messages.length - 1];
  const text = (last?.content || '').trim();
  const { year = '2023', dataset = 'acs/acs5' } = config || {};

  if (ID_LIST.test(text)) {
    const ids = text.split(/\s*,\s*/);
    const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];
    const labels: string[] = [];
    for (const id of ids) {
      if (await validateVariableId(id, year, dataset)) {
        const match = (await searchCensus(id, year, dataset)).find(v => v.id === id);
        const label = match?.label || id;
        toolInvocations.push({ name: 'add_metric', args: { id, label } });
        labels.push(`"${label}"`);
      }
    }
    const content = labels.length
      ? `Added ${labels.join(', ')} to your metrics list.`
      : 'No valid Census variable ids provided.';
    return NextResponse.json({
      message: { role: 'assistant', content },
      toolInvocations,
    });
  }

  const action = text.match(ACTION);
  if (action) {
    const query = action[2].trim();
    const wordCount = query.split(/\s+/).length;
    if (wordCount >= 1 && wordCount <= 7 && !/[.?]/.test(query)) {
      const results = await searchCensus(query, year, dataset);
      if (results.length) {
        const best = results[0];
        const toolInvocations = [
          { name: 'add_metric', args: { id: best.id, label: best.label } },
        ];
        return NextResponse.json({
          message: { role: 'assistant', content: `Added "${best.label}" to your metrics list.` },
          toolInvocations,
        });
      }
      return handleConversational(messages, config, stats, activeStats, metrics, true, query);
    }
  }

  return handleConversational(messages, config, stats, activeStats, metrics);
}

async function handleConversational(
  messages: Message[],
  config: Record<string, unknown>,
  stats: Array<{ code: string; description: string }> = [],
  activeStats: Array<{ code: string; description: string; data: unknown }> = [],
  metrics: Array<{ id: string; label: string }> = [],
  startDeep = false,
  failedQuery = ''
) {
  const { year = '2023', dataset = 'acs/acs5' } = config || {};
  const tools = [
    {
      type: 'function',
      function: {
        name: 'search_census',
        description: `Search the US Census ${year} ${dataset} dataset for variables matching a query. Returns a list of matching variable ids and descriptions.`,
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
    {
      type: 'function',
      function: {
        name: 'select_stat',
        description: 'Select the best matching statistic code from the provided list.',
        parameters: {
          type: 'object',
          properties: { code: { type: 'string', description: 'Statistic code' } },
          required: ['code'],
        },
      },
    },
  ];

  const convo: Message[] = [...messages];
  if (stats.length) {
    const list = stats.map(s => `${s.code}: ${s.description}`).join('\n');
    convo.splice(1, 0, { role: 'system', content: `Available stats:\n${list}` });
  }
  if (activeStats.length) {
    convo.splice(1, 0, {
      role: 'system',
      content: `Active stats data: ${JSON.stringify(activeStats)}`,
    });
  }
  if (metrics.length) {
    const names = metrics.map(m => m.label).join(', ');
    convo.splice(1, 0, { role: 'system', content: `Loaded metrics: ${names}` });
  }
  if (startDeep && failedQuery) {
    convo.push({
      role: 'system',
      content: `Initial search for "${failedQuery}" returned no results. Try a different approach.`,
    });
  }

  const toolInvocations: { name: string; args: Record<string, unknown> }[] = [];
  let model = startDeep ? 'openai/gpt-5-mini' : 'openai/gpt-oss-120b:nitro';
  let lastSearchEmpty = false;

  while (true) {
    const response = await callOpenRouter({
      model,
      messages: convo,
      tools,
      tool_choice: 'auto',
      reasoning: { effort: 'low' },
      text: { verbosity: 'low' },
      max_output_tokens: 200,
    });
    const message = response.choices?.[0]?.message;
    const toolCalls = message?.tool_calls ?? [];
    convo.push(message as Message);

    if (!toolCalls.length) {
      if (lastSearchEmpty && model === 'openai/gpt-oss-120b:nitro') {
        model = 'openai/gpt-5-mini';
        convo.push({
          role: 'system',
          content: 'Previous Census search returned no results. Search deeper or explain.',
        });
        lastSearchEmpty = false;
        continue;
      }
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
        const searchResults = await searchCensus(args.query as string, year, dataset);
        lastSearchEmpty = searchResults.length === 0;
        result = searchResults;
      } else if (name === 'add_metric') {
        const id = args.id as string;
        const label = args.label as string;
        if (await validateVariableId(id, year, dataset)) {
          result = { ok: true };
          toolInvocations.push({ name, args: { id, label } });
        } else {
          result = { ok: false, error: 'Unknown variable id' };
        }
      } else if (name === 'select_stat') {
        const code = args.code as string;
        const exists = stats.some(s => s.code === code);
        if (exists) {
          result = { ok: true };
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

