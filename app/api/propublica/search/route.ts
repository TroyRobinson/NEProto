import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  try {
    const upstream = await fetch(
      `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(q)}`
    );
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
  }
}
