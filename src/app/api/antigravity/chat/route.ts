import { NextRequest, NextResponse } from 'next/server';

function mapToBackendModel(model: string): string {
  const clean = model.replace(/^antigravity-/, '');
  if (clean === 'gemini-3.5-flash') return 'gemini-3.5-flash-low';
  if (clean === 'gemini-3-pro') return 'gemini-3-pro-low';
  if (clean === 'gemini-3.1-pro') return 'gemini-3.1-pro-low';
  if (clean === 'gemini-3.7-flash') return 'gemini-3-flash';
  return clean;
}

const ENDPOINTS = [
  'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:streamGenerateContent?alt=sse',
  'https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse',
  'https://cloudcode-pa.googleapis.com/v1internal:generateContent',
];

function extractTextFromResponse(data: any): string {
  const candidates = data.response?.candidates || data.candidates;
  if (Array.isArray(candidates)) {
    const texts: string[] = [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part?.text) {
            texts.push(part.text);
          }
        }
      }
      if (candidate.text) {
        texts.push(candidate.text);
      }
    }
    if (texts.length > 0) {
      return texts.join('');
    }
  }

  if (data.response?.text) return data.response.text;
  if (data.text) return data.text;
  if (data.content) return data.content;
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const body = await req.json();
    const { model, messages, temperature, project_id } = body;

    if (!model) {
      return NextResponse.json({ error: 'Missing model' }, { status: 400 });
    }

    let systemPrompt = '';
    let userContent = '';

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg.role === 'system') {
          systemPrompt += (systemPrompt ? '\n\n' : '') + (msg.content || '');
        } else if (msg.role === 'user') {
          userContent += (userContent ? '\n\n' : '') + (msg.content || '');
        }
      }
    }

    if (!userContent && typeof body.content === 'string') {
      userContent = body.content;
    }

    const backendModel = mapToBackendModel(model);
    const payload = {
      project: project_id || 'rising-fact-p41fc',
      model: backendModel,
      request: {
        contents: [
          {
            role: 'user',
            parts: [{ text: userContent }],
          },
        ],
        systemInstruction: systemPrompt ? {
          parts: [{ text: systemPrompt }]
        } : undefined,
        generationConfig: {
          temperature: temperature ?? 0.1,
        },
      },
    };

    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Antigravity/1.18.3 Chrome/138.0.7204.235 Electron/37.3.1 Safari/537.36',
      'Client-Metadata': '{"ideType":"ANTIGRAVITY","platform":"WINDOWS","pluginType":"GEMINI"}',
    };

    let upstreamRes: Response | null = null;
    let lastErrorText = '';
    let lastStatus = 502;

    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          upstreamRes = res;
          break;
        } else {
          lastStatus = res.status;
          const errText = await res.text();
          lastErrorText = errText || `Upstream error (${res.status})`;
          console.error(`Antigravity upstream error [${res.status}] at ${url}:`, errText);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        lastErrorText = msg;
        console.error(`Antigravity fetch error at ${url}:`, msg);
      }
    }

    if (!upstreamRes || !upstreamRes.ok) {
      return NextResponse.json(
        { error: lastErrorText || 'Antigravity upstream endpoints failed' },
        { status: lastStatus }
      );
    }

    const textResponse = await upstreamRes.text();
    let fullText = '';

    if (textResponse.includes('data:')) {
      const lines = textResponse.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.substring(5).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const extracted = extractTextFromResponse(parsed);
            if (extracted) {
              fullText += extracted;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (!fullText) {
      try {
        const data = JSON.parse(textResponse);
        fullText = extractTextFromResponse(data) || textResponse;
      } catch {
        fullText = textResponse;
      }
    }

    return NextResponse.json({
      content: fullText,
      text: fullText,
      model: model,
      choices: [{ message: { content: fullText } }],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Antigravity route error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
