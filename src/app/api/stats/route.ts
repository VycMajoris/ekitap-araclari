import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface GlobalStats {
  totalConverted: number;
  totalTranslated: number;
  totalWordsFixed: number;
  lastUpdated: string;
}

interface KVNamespace {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expiration?: number; expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
}

export const DEFAULT_STATS: GlobalStats = {
  totalConverted: 0,
  totalTranslated: 0,
  totalWordsFixed: 0,
  lastUpdated: new Date().toISOString(),
};

let inMemoryStats: GlobalStats = { ...DEFAULT_STATS };

function getCloudflareKv(req?: NextRequest): KVNamespace | null {
  try {
    if (typeof globalThis !== 'undefined') {
      const g = globalThis as any;
      if (g.STATS_KV && typeof g.STATS_KV.get === 'function') return g.STATS_KV;
      if (g.env?.STATS_KV && typeof g.env.STATS_KV.get === 'function') return g.env.STATS_KV;
      if (g.__env__?.STATS_KV && typeof g.__env__.STATS_KV.get === 'function') return g.__env__.STATS_KV;
    }
    if (typeof process !== 'undefined' && process.env) {
      const p = process.env as any;
      if (p.STATS_KV && typeof p.STATS_KV.get === 'function') return p.STATS_KV;
    }
    if (req) {
      const r = req as any;
      if (r.env?.STATS_KV && typeof r.env.STATS_KV.get === 'function') return r.env.STATS_KV;
      if (r.context?.env?.STATS_KV && typeof r.context.env.STATS_KV.get === 'function') return r.context.env.STATS_KV;
    }
  } catch {}
  return null;
}

async function fetchCloudflareKvRest(action: 'get' | 'put', value?: string): Promise<any> {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !namespaceId || !apiToken) return null;

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/stats`;
    if (action === 'get') {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        return await res.json();
      }
    } else if (action === 'put' && value) {
      await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'text/plain',
        },
        body: value,
      });
    }
  } catch {}
  return null;
}

async function readStatsAsync(req?: NextRequest): Promise<GlobalStats> {
  const kv = getCloudflareKv(req);
  if (kv) {
    try {
      const kvData = await kv.get('stats', 'json');
      if (kvData && typeof kvData === 'object') {
        inMemoryStats = {
          totalConverted: Number(kvData.totalConverted) || 0,
          totalTranslated: Number(kvData.totalTranslated) || 0,
          totalWordsFixed: Number(kvData.totalWordsFixed) || 0,
          lastUpdated: kvData.lastUpdated || new Date().toISOString(),
        };
        return inMemoryStats;
      } else {
        try {
          await kv.put('stats', JSON.stringify(DEFAULT_STATS));
        } catch {}
        inMemoryStats = { ...DEFAULT_STATS };
        return inMemoryStats;
      }
    } catch (err) {
      console.warn('Cloudflare KV okuma hatası:', err);
    }
  }

  const restData = await fetchCloudflareKvRest('get');
  if (restData && typeof restData === 'object') {
    inMemoryStats = {
      totalConverted: Number(restData.totalConverted) || 0,
      totalTranslated: Number(restData.totalTranslated) || 0,
      totalWordsFixed: Number(restData.totalWordsFixed) || 0,
      lastUpdated: restData.lastUpdated || new Date().toISOString(),
    };
    return inMemoryStats;
  }

  return inMemoryStats;
}

async function writeStatsAsync(stats: GlobalStats, req?: NextRequest): Promise<void> {
  inMemoryStats = stats;
  const kv = getCloudflareKv(req);
  const jsonPayload = JSON.stringify(stats);
  if (kv) {
    try {
      await kv.put('stats', jsonPayload);
    } catch (err) {
      console.warn('Cloudflare KV yazma hatası:', err);
    }
  }
  await fetchCloudflareKvRest('put', jsonPayload);
}

export async function GET(req: NextRequest) {
  const stats = await readStatsAsync(req);
  return NextResponse.json({
    success: true,
    stats: {
      totalConverted: stats.totalConverted,
      totalTranslated: stats.totalTranslated,
      totalWordsFixed: stats.totalWordsFixed,
      lastUpdated: stats.lastUpdated,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as 'convert' | 'translate';
    const fixedWords = Number(body.fixedWords) || 0;

    const stats = await readStatsAsync(req);

    if (action === 'convert') {
      stats.totalConverted += 1;
    } else if (action === 'translate') {
      stats.totalTranslated += 1;
    }

    if (fixedWords > 0) {
      stats.totalWordsFixed += Math.min(Math.max(0, fixedWords), 100000);
    }

    stats.lastUpdated = new Date().toISOString();
    await writeStatsAsync(stats, req);

    return NextResponse.json({
      success: true,
      stats: {
        totalConverted: stats.totalConverted,
        totalTranslated: stats.totalTranslated,
        totalWordsFixed: stats.totalWordsFixed,
        lastUpdated: stats.lastUpdated,
      },
    });
  } catch (err) {
    console.error('Stats kaydetme hatası:', err);
    return NextResponse.json(
      { success: false, error: 'İstatistik kaydedilemedi' },
      { status: 500 }
    );
  }
}
