import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '../../../lib/openRouter';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export async function POST(req: NextRequest) {
  const { messages: incoming, config, activeMetrics } = await req.json();
  const {
    year = '2023',
    dataset = 'acs/acs5',
    region = 'Oklahoma County',
    geography = 'zip code tabulation area',
  } = config || {};

  const system = `You propose two helpful next-step ideas after reviewing the conversation.
Return STRICT JSON with keys dataIdea and questionIdea.
- Independence: Generate dataIdea and questionIdea independently. Do not make one a rephrasing or direct follow-up of the other. Avoid overlapping the same narrow facet; vary the angle.
- dataIdea (display string): MUST start with "Add data for ", end with "?", and describe a specific, related data slice NOT already active or mentioned. Prefer people-related when relevant. Keep the inside phrase concise (≈3–7 words), under 140 chars total. Avoid duplicating current metrics or variables.
- questionIdea (display string): A first-person, curiosity-driven follow-up from the user's perspective (e.g., "Why is X like Y?", "Compare/contrast X to understand Y", "Why might that area be so high?", "Are there other situations like X in the city?"). Keep under 140 chars.
Only output JSON.`;

  const messages: Message[] = Array.isArray(incoming) ? incoming.slice(-10) : [];
  if (!messages.length || messages[0].role !== 'system') {
    messages.unshift({ role: 'system', content: system });
  } else {
    messages[0] = { ...messages[0], content: system };
  }

  const activeList: Array<{ id?: string; label?: string }> = Array.isArray(activeMetrics) ? activeMetrics : [];
  const avoid = activeList
    .map((m) => [m.id, m.label].filter(Boolean).join(' - '))
    .filter(Boolean)
    .join('; ');
  if (avoid) {
    messages.push({
      role: 'user',
      content: `Active metrics (avoid duplicates): ${avoid}`,
    });
  }

  const origin = new URL(req.url).origin;
  try {
    const resp = await callOpenRouter(
      {
        model: 'openai/gpt-oss-120b:nitro',
        messages,
        max_output_tokens: 200,
        text: { verbosity: 'low' },
        reasoning: { effort: 'low' },
      },
      origin,
    );

    const content = resp.choices?.[0]?.message?.content || '';
    let parsed: { dataIdea?: { text?: string } | string; questionIdea?: { text?: string } | string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}$/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }

    const dataIdeaText = typeof parsed.dataIdea === 'string' ? parsed.dataIdea : parsed.dataIdea?.text;
    const questionIdeaText = typeof parsed.questionIdea === 'string' ? parsed.questionIdea : parsed.questionIdea?.text;

    return NextResponse.json({
      dataIdea: dataIdeaText || '',
      questionIdea: questionIdeaText || '',
      meta: { year, dataset, region, geography },
    });
  } catch {
    // Fall back gracefully with empty suggestions; client hides when empty
    return NextResponse.json({ dataIdea: '', questionIdea: '', meta: { year, dataset, region, geography } });
  }
}
