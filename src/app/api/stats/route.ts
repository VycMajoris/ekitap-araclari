import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

function writeStats(stats: GlobalStats): void {
  inMemoryStats = stats;
  try {
    const filePath = getStoragePath();
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf8');
  } catch (err) {
    console.warn('Stats dosya yazma uyarısı:', err);
  }
}

export async function GET() {
  const stats = readStats();
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
    const action = body.action as 'convert' | 'translate' | 'fix';
    const fixedWords = Number(body.fixedWords) || 0;

    const stats = readStats();

    if (action === 'convert') {
      stats.totalConverted += 1;
    } else if (action === 'translate') {
      stats.totalTranslated += 1;
    }

    if (fixedWords > 0) {
      stats.totalWordsFixed += fixedWords;
    }

    stats.lastUpdated = new Date().toISOString();
    writeStats(stats);

    return NextResponse.json({
      success: true,
      stats: {
        totalConverted: stats.totalConverted,
        totalTranslated: stats.totalTranslated,
        totalWordsFixed: stats.totalWordsFixed,
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
