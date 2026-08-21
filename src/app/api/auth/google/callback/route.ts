import { NextRequest, NextResponse } from 'next/server';
import { ANTIGRAVITY_CLIENT_ID, ANTIGRAVITY_CLIENT_SECRET } from '@/lib/antigravity';

export async function GET() {
  const html = `<!DOCTYPE html>
<html><body><script>
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (window.opener) {
    window.opener.postMessage({ type: 'GOOGLE_OAUTH_CODE', code, state }, '*');
  }
  window.close();
</script></body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, verifier, redirect_uri } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const params = new URLSearchParams({
      code,
      client_id: ANTIGRAVITY_CLIENT_ID,
      client_secret: ANTIGRAVITY_CLIENT_SECRET,
      redirect_uri: redirect_uri || 'http://localhost:3000/api/auth/google/callback',
      grant_type: 'authorization_code',
    });

    if (verifier) {
      params.append('code_verifier', verifier);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json({ error: 'Token exchange failed', details: errText }, { status: tokenRes.status });
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    let email = '';
    if (access_token) {
      try {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        if (userinfoRes.ok) {
          const userData = await userinfoRes.json();
          email = userData.email || '';
        }
      } catch (e) {
        console.error('Failed to fetch userinfo:', e);
      }
    }

    return NextResponse.json({
      access_token,
      refresh_token,
      expires_in: expires_in || 3600,
      email,
      projectId: 'rising-fact-p41fc',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
