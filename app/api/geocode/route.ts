import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  if (!q) {
    return NextResponse.json({ error: 'Missing q' }, { status: 400 });
  }
  try {
    const upstream = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      {
        headers: { 'User-Agent': 'NEProto' },
      }
    );
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to geocode' }, { status: 500 });
  }
}
