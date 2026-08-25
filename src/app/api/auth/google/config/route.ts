import { NextResponse } from 'next/server';
import { ANTIGRAVITY_CLIENT_ID } from '@/lib/antigravity';

export async function GET() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    ANTIGRAVITY_CLIENT_ID;

  const isCustomConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );

  return NextResponse.json({
    clientId,
    isCustomConfigured,
  });
}
