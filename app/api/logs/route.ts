import { NextRequest, NextResponse } from 'next/server';
import { addLog, getLogs, clearLogs } from '../../../lib/logStore';

export async function GET() {
  return NextResponse.json({ logs: getLogs() });
}

export async function POST(req: NextRequest) {
  const entry = await req.json();
  addLog(entry);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  clearLogs();
  return NextResponse.json({ ok: true });
}
