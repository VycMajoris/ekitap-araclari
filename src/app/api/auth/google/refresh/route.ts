import { NextRequest, NextResponse } from 'next/server';
import { ANTIGRAVITY_CLIENT_ID, ANTIGRAVITY_CLIENT_SECRET } from '@/lib/antigravity';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json({ error: 'Missing refresh_token' }, { status: 400 });
    }

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || ANTIGRAVITY_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET || ANTIGRAVITY_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json({ error: 'Token refresh failed', details: errText }, { status: tokenRes.status });
    }

    const data = await tokenRes.json();
    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
      refresh_token: data.refresh_token || refresh_token,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
