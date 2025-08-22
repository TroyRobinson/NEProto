import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const segments = req.nextUrl.pathname.split('/');
  const ein = segments[segments.length - 1];
  try {
    const upstream = await fetch(
      `https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`
    );
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }
}
