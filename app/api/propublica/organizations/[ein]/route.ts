import { NextResponse, NextRequest } from 'next/server';
import { addLog } from '../../../../../lib/logStore';

export async function GET(req: NextRequest) {
  const segments = req.nextUrl.pathname.split('/');
  const ein = segments[segments.length - 1];
  try {
    addLog({
      service: 'ProPublica',
      direction: 'request',
      message: { type: 'organization', ein },
    });
    const upstream = await fetch(
      `https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`
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
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }
}
