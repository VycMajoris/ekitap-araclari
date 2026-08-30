interface KVNamespace {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expiration?: number; expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

type PagesFunction<Env = unknown, P extends string = string, Data extends Record<string, unknown> = Record<string, unknown>> = (
  context: EventContext<Env, P, Data>
) => Response | Promise<Response>;

interface Env {
  STATS_KV: KVNamespace;
}

interface GlobalStats {
  totalConverted: number;
  totalTranslated: number;
  totalWordsFixed: number;
  lastUpdated: string;
}

const DEFAULT_STATS: GlobalStats = {
  totalConverted: 0,
  totalTranslated: 0,
  totalWordsFixed: 0,
  lastUpdated: new Date().toISOString(),
};

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const kv = context.env?.STATS_KV;
  if (!kv) {
    return new Response(
      JSON.stringify({
        success: true,
        stats: DEFAULT_STATS,
      }),
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  }

  try {
    const raw = await kv.get('stats');
    let stats: GlobalStats = { ...DEFAULT_STATS };
    if (raw) {
      const parsed = JSON.parse(raw);
      stats = {
        totalConverted: Number(parsed.totalConverted) || 0,
        totalTranslated: Number(parsed.totalTranslated) || 0,
        totalWordsFixed: Number(parsed.totalWordsFixed) || 0,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    } else {
      await kv.put('stats', JSON.stringify(DEFAULT_STATS));
    }

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'KV read failed', stats: DEFAULT_STATS }),
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const kv = context.env?.STATS_KV;
  if (!kv) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'STATS_KV binding missing in Cloudflare Pages Settings',
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }

  try {
    const body: any = await context.request.json().catch(() => ({}));
    const action = body.action as 'convert' | 'translate';
    const fixedWords = Number(body.fixedWords) || 0;

    const raw = await kv.get('stats');
    let stats: GlobalStats = { ...DEFAULT_STATS };
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        stats = {
          totalConverted: Number(parsed.totalConverted) || 0,
          totalTranslated: Number(parsed.totalTranslated) || 0,
          totalWordsFixed: Number(parsed.totalWordsFixed) || 0,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };
      } catch {}
    }

    if (action === 'convert') {
      stats.totalConverted += 1;
    } else if (action === 'translate') {
      stats.totalTranslated += 1;
    }

    if (fixedWords > 0) {
      stats.totalWordsFixed += Math.min(Math.max(0, fixedWords), 100000);
    }

    stats.lastUpdated = new Date().toISOString();
    await kv.put('stats', JSON.stringify(stats));

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'KV write failed' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
};
