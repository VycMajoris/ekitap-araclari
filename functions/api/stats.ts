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

const BASELINE_STATS: GlobalStats = {
  totalConverted: 142,
  totalTranslated: 68,
  totalWordsFixed: 24500,
  lastUpdated: '2026-08-30T00:00:00.000Z',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const kv = context.env.STATS_KV;
  if (!kv) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'STATS_KV binding missing in Cloudflare Pages Settings',
        stats: BASELINE_STATS,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  try {
    const raw = await kv.get('stats');
    let stats: GlobalStats = { ...BASELINE_STATS };
    if (raw) {
      const parsed = JSON.parse(raw);
      stats = {
        totalConverted: Math.max(Number(parsed.totalConverted) || 0, BASELINE_STATS.totalConverted),
        totalTranslated: Math.max(Number(parsed.totalTranslated) || 0, BASELINE_STATS.totalTranslated),
        totalWordsFixed: Math.max(Number(parsed.totalWordsFixed) || 0, BASELINE_STATS.totalWordsFixed),
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    } else {
      await kv.put('stats', JSON.stringify(BASELINE_STATS));
    }

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'KV read failed', stats: BASELINE_STATS }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const kv = context.env.STATS_KV;
  if (!kv) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'STATS_KV binding missing in Cloudflare Pages Settings',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  try {
    const body: any = await context.request.json().catch(() => ({}));
    const action = body.action as 'convert' | 'translate' | 'fix' | 'sync';
    const fixedWords = Number(body.fixedWords) || 0;
    const clientConverted = Number(body.totalConverted) || 0;
    const clientTranslated = Number(body.totalTranslated) || 0;
    const clientWordsFixed = Number(body.totalWordsFixed) || 0;

    const raw = await kv.get('stats');
    let stats: GlobalStats = { ...BASELINE_STATS };
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        stats = {
          totalConverted: Math.max(Number(parsed.totalConverted) || 0, BASELINE_STATS.totalConverted),
          totalTranslated: Math.max(Number(parsed.totalTranslated) || 0, BASELINE_STATS.totalTranslated),
          totalWordsFixed: Math.max(Number(parsed.totalWordsFixed) || 0, BASELINE_STATS.totalWordsFixed),
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };
      } catch {}
    }

    if (action === 'sync') {
      stats.totalConverted = Math.max(stats.totalConverted, clientConverted);
      stats.totalTranslated = Math.max(stats.totalTranslated, clientTranslated);
      stats.totalWordsFixed = Math.max(stats.totalWordsFixed, clientWordsFixed);
    } else {
      if (action === 'convert') {
        stats.totalConverted += 1;
      } else if (action === 'translate') {
        stats.totalTranslated += 1;
      }
      if (fixedWords > 0) {
        stats.totalWordsFixed += fixedWords;
      }
      if (clientConverted > 0) {
        stats.totalConverted = Math.max(stats.totalConverted, clientConverted);
      }
      if (clientTranslated > 0) {
        stats.totalTranslated = Math.max(stats.totalTranslated, clientTranslated);
      }
      if (clientWordsFixed > 0) {
        stats.totalWordsFixed = Math.max(stats.totalWordsFixed, clientWordsFixed);
      }
    }

    stats.lastUpdated = new Date().toISOString();
    await kv.put('stats', JSON.stringify(stats));

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'KV write failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
};
