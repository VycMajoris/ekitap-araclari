'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Languages, Sparkles } from 'lucide-react';

interface GlobalStatsData {
  totalConverted: number;
  totalTranslated: number;
  totalWordsFixed: number;
}

export const GlobalStatsCards: React.FC = () => {
  const [stats, setStats] = useState<GlobalStatsData>({
    totalConverted: 0,
    totalTranslated: 0,
    totalWordsFixed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats && isMounted) {
            setStats(data.stats);
          }
        }
      } catch {
        // Fallback to initial values gracefully
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
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
