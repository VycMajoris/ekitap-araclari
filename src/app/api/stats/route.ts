import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

export const BASELINE_STATS: GlobalStats = {
  totalConverted: 142,
  totalTranslated: 68,
  totalWordsFixed: 24500,
  lastUpdated: '2026-08-30T00:00:00.000Z',
};

function getStoragePath(): string {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        return path.join('/tmp', 'ekitap_stats.json');
      }
    }
    return path.join(dataDir, 'stats.json');
  } catch {
    return '/tmp/ekitap_stats.json';
  }
}

let inMemoryStats: GlobalStats = { ...BASELINE_STATS };

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

function readStats(): GlobalStats {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      inMemoryStats = {
        totalConverted: Math.max(Number(parsed.totalConverted) || 0, BASELINE_STATS.totalConverted),
        totalTranslated: Math.max(Number(parsed.totalTranslated) || 0, BASELINE_STATS.totalTranslated),
        totalWordsFixed: Math.max(Number(parsed.totalWordsFixed) || 0, BASELINE_STATS.totalWordsFixed),
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
      return inMemoryStats;
    }
  } catch (err) {
    console.warn('Stats dosya okuma uyarısı:', err);
  }
  return inMemoryStats;
}

async function readStatsAsync(req?: NextRequest): Promise<GlobalStats> {
  const kv = getCloudflareKv(req);
  if (kv) {
    try {
      const kvData = await kv.get('stats', 'json');
      if (kvData && typeof kvData === 'object') {
        inMemoryStats = {
          totalConverted: Math.max(Number(kvData.totalConverted) || 0, BASELINE_STATS.totalConverted),
          totalTranslated: Math.max(Number(kvData.totalTranslated) || 0, BASELINE_STATS.totalTranslated),
          totalWordsFixed: Math.max(Number(kvData.totalWordsFixed) || 0, BASELINE_STATS.totalWordsFixed),
          lastUpdated: kvData.lastUpdated || new Date().toISOString(),
        };
        return inMemoryStats;
      } else {
        try {
          await kv.put('stats', JSON.stringify(BASELINE_STATS));
        } catch {}
        inMemoryStats = { ...BASELINE_STATS };
        return inMemoryStats;
      }
    } catch (err) {
      console.warn('Cloudflare KV okuma hatası, yerel depolamaya geçiliyor:', err);
    }
  }

  const restData = await fetchCloudflareKvRest('get');
  if (restData && typeof restData === 'object') {
    inMemoryStats = {
      totalConverted: Math.max(Number(restData.totalConverted) || 0, BASELINE_STATS.totalConverted),
      totalTranslated: Math.max(Number(restData.totalTranslated) || 0, BASELINE_STATS.totalTranslated),
      totalWordsFixed: Math.max(Number(restData.totalWordsFixed) || 0, BASELINE_STATS.totalWordsFixed),
      lastUpdated: restData.lastUpdated || new Date().toISOString(),
    };
    return inMemoryStats;
  }

  return readStats();
}

function writeStats(stats: GlobalStats): void {
  inMemoryStats = stats;
  try {
    const filePath = getStoragePath();
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf8');
  } catch (err) {
    console.warn('Stats dosya yazma uyarısı:', err);
  }
}

async function writeStatsAsync(stats: GlobalStats, req?: NextRequest): Promise<void> {
  writeStats(stats);
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
    const action = body.action as 'convert' | 'translate' | 'fix' | 'sync';
    const fixedWords = Number(body.fixedWords) || 0;
    const clientConverted = Number(body.totalConverted) || 0;
    const clientTranslated = Number(body.totalTranslated) || 0;
    const clientWordsFixed = Number(body.totalWordsFixed) || 0;

    const stats = await readStatsAsync(req);

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
