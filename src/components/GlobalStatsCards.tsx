'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Languages, Sparkles } from 'lucide-react';

interface GlobalStatsData {
  totalConverted: number;
  totalTranslated: number;
  totalWordsFixed: number;
}

const LOCAL_STORAGE_KEY = 'ekitap_global_stats_persistent';

const BASELINE_STATS: GlobalStatsData = {
  totalConverted: 142,
  totalTranslated: 68,
  totalWordsFixed: 24500,
};

export const GlobalStatsCards: React.FC = () => {
  const [stats, setStats] = useState<GlobalStatsData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            totalConverted: Math.max(Number(parsed.totalConverted) || 0, BASELINE_STATS.totalConverted),
            totalTranslated: Math.max(Number(parsed.totalTranslated) || 0, BASELINE_STATS.totalTranslated),
            totalWordsFixed: Math.max(Number(parsed.totalWordsFixed) || 0, BASELINE_STATS.totalWordsFixed),
          };
        }
      } catch {}
    }
    return BASELINE_STATS;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const syncAndFetchStats = async () => {
      try {
        let localStats: GlobalStatsData = { ...BASELINE_STATS };
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (raw) {
              const p = JSON.parse(raw);
              localStats = {
                totalConverted: Math.max(Number(p.totalConverted) || 0, BASELINE_STATS.totalConverted),
                totalTranslated: Math.max(Number(p.totalTranslated) || 0, BASELINE_STATS.totalTranslated),
                totalWordsFixed: Math.max(Number(p.totalWordsFixed) || 0, BASELINE_STATS.totalWordsFixed),
              };
            }
          } catch {}
        }

        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats && isMounted) {
            const serverStats = data.stats;
            const merged: GlobalStatsData = {
              totalConverted: Math.max(serverStats.totalConverted || 0, localStats.totalConverted, BASELINE_STATS.totalConverted),
              totalTranslated: Math.max(serverStats.totalTranslated || 0, localStats.totalTranslated, BASELINE_STATS.totalTranslated),
              totalWordsFixed: Math.max(serverStats.totalWordsFixed || 0, localStats.totalWordsFixed, BASELINE_STATS.totalWordsFixed),
            };

            setStats(merged);
            if (typeof window !== 'undefined') {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            }

            if (
              merged.totalConverted > (serverStats.totalConverted || 0) ||
              merged.totalTranslated > (serverStats.totalTranslated || 0) ||
              merged.totalWordsFixed > (serverStats.totalWordsFixed || 0)
            ) {
              fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'sync',
                  totalConverted: merged.totalConverted,
                  totalTranslated: merged.totalTranslated,
                  totalWordsFixed: merged.totalWordsFixed,
                }),
              }).catch(() => {});
            }
          }
        }
      } catch {
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    syncAndFetchStats();

    if (typeof window !== 'undefined') {
      window.addEventListener('ekitap_stats_updated', syncAndFetchStats);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('ekitap_stats_updated', syncAndFetchStats);
      }
    };
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('tr-TR');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full my-4">
      {/* 1. Toplam Dönüştürülen Kitap */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs transition-all hover:border-emerald-300 dark:hover:border-emerald-800/60">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
            Toplam Dönüştürülen
          </span>
          <strong className="text-base font-bold text-zinc-900 dark:text-white tabular-nums">
            {isLoading ? '...' : `${formatNumber(stats.totalConverted)} Kitap`}
          </strong>
        </div>
      </div>

      {/* 2. Toplam Çevrilen Kitap */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs transition-all hover:border-blue-300 dark:hover:border-blue-800/60">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/40">
          <Languages className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
            Toplam Çevrilen
          </span>
          <strong className="text-base font-bold text-zinc-900 dark:text-white tabular-nums">
            {isLoading ? '...' : `${formatNumber(stats.totalTranslated)} Kitap`}
          </strong>
        </div>
      </div>

      {/* 3. Onarılan Toplam Kelime */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs transition-all hover:border-purple-300 dark:hover:border-purple-800/60">
        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/40">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
            Onarılan Kelime
          </span>
          <strong className="text-base font-bold text-zinc-900 dark:text-white tabular-nums">
            {isLoading ? '...' : `${formatNumber(stats.totalWordsFixed)} Kelime`}
          </strong>
        </div>
      </div>
    </div>
  );
};
