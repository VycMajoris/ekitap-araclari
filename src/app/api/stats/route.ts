import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface GlobalStats {
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

const DEFAULT_STATS: GlobalStats = {
  totalConverted: 0,
  totalTranslated: 0,
  totalWordsFixed: 0,
  lastUpdated: new Date().toISOString(),
};

function getStoragePath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      return path.join('/tmp', 'ekitap_stats.json');
    }
  }
  return path.join(dataDir, 'stats.json');
}

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

function readStats(): GlobalStats {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      inMemoryStats = {
        totalConverted: Number(parsed.totalConverted) || DEFAULT_STATS.totalConverted,
        totalTranslated: Number(parsed.totalTranslated) || DEFAULT_STATS.totalTranslated,
        totalWordsFixed: Number(parsed.totalWordsFixed) || DEFAULT_STATS.totalWordsFixed,
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
          totalConverted: Number(kvData.totalConverted) || DEFAULT_STATS.totalConverted,
          totalTranslated: Number(kvData.totalTranslated) || DEFAULT_STATS.totalTranslated,
          totalWordsFixed: Number(kvData.totalWordsFixed) || DEFAULT_STATS.totalWordsFixed,
          lastUpdated: kvData.lastUpdated || new Date().toISOString(),
        };
        return inMemoryStats;
      }
    } catch (err) {
      console.warn('Cloudflare KV okuma hatası, yerel depolamaya geçiliyor:', err);
    }
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
  if (kv) {
    try {
      await kv.put('stats', JSON.stringify(stats));
    } catch (err) {
      console.warn('Cloudflare KV yazma hatası:', err);
    }
  }
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
