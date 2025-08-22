import { NextResponse, NextRequest } from 'next/server';
import { addLog } from '../../../../lib/logStore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  try {
    addLog({ service: 'ProPublica', direction: 'request', message: { endpoint: 'search', q } });
    const upstream = await fetch(
      `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(q)}&state%5Bid%5D=OK`
    );
    const data = await upstream.json();
    addLog({ service: 'ProPublica', direction: 'response', message: data });
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error(error);
    addLog({
      service: 'ProPublica',
      direction: 'response',
      message: { error: String(error) },
    });
    return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
  }
}
