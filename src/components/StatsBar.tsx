import React from 'react';
import {
  Play,
  Square,
  Download,
  Clock,
  Sparkles,
  RotateCcw,
  Loader2,
  Send,
  Languages,
} from 'lucide-react';
import { ProcessingStats, TaskType } from '../lib/types';

export interface StatsBarProps {
  stats: ProcessingStats;
  isProcessing: boolean;
  isCompleted: boolean;
  isPacking: boolean;
  onStart: () => void;
  onStop: () => void;
  onDownload: () => void;
  onDownloadMobi?: () => void;
  onSendToDevice?: () => void;
  onResetProgress: () => void;
  selectedCount: number;
  taskType?: TaskType;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  isProcessing,
  isCompleted,
  isPacking,
  onStart,
  onStop,
  onDownload,
  onDownloadMobi,
  onSendToDevice,
  onResetProgress,
  selectedCount,
  taskType = 'ocr_fix',
}) => {
  const percent =
    stats.totalBlocks > 0
      ? Math.min(100, Math.round((stats.processedBlocks / stats.totalBlocks) * 100))
      : 0;

  const isTranslation = taskType === 'translate';

  const formatSeconds = (sec?: number) => {
    if (sec === undefined || isNaN(sec) || sec < 0) return 'Hesaplanıyor...';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m} dk ${s} sn` : `${s} sn`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-3">
            <span className="text-[11px] font-medium text-zinc-500 block">İlerleme</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-extrabold text-zinc-900 dark:text-white">
                %{percent}
              </span>
              <span className="text-[11px] text-zinc-400">
                ({stats.processedBlocks}/{stats.totalBlocks})
              </span>
            </div>
          </div>

          <div
            className={`border rounded-2xl p-3 ${
              isTranslation
                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-800/40'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
            }`}
          >
            <span
              className={`text-[11px] font-medium flex items-center gap-1 ${
                isTranslation
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {isTranslation ? (
                <>
                  <Languages className="w-3 h-3" /> Çevrilen Kelime
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" /> Düzeltilen Kelime
                </>
              )}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-lg font-extrabold ${
                  isTranslation
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {stats.totalFixedWords.toLocaleString('tr-TR')}
              </span>
              <span
                className={`text-[11px] ${
                  isTranslation
                    ? 'text-blue-600/70 dark:text-blue-400/70'
                    : 'text-emerald-600/70 dark:text-emerald-400/70'
                }`}
              >
                adet
              </span>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-3">
            <span className="text-[11px] font-medium text-zinc-500 block">Bölüm Durumu</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-extrabold text-zinc-900 dark:text-white">
                {stats.completedChapters}
              </span>
              <span className="text-[11px] text-zinc-400">/ {stats.totalChapters}</span>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-3">
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-400" />
              {isProcessing ? 'Kalan / Geçen Süre' : 'Toplam Süre'}
            </span>
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
              {isProcessing ? (
                <div className="flex items-center gap-1.5 truncate">
                  <span>{formatSeconds(stats.estimatedRemainingSeconds)}</span>
                  <span className="text-[10px] text-zinc-400 font-normal">({stats.elapsedSeconds} sn)</span>
                </div>
              ) : (
                `${formatSeconds(stats.elapsedSeconds)}`
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {stats.processedBlocks > 0 && !isProcessing && (
            <button
              onClick={onResetProgress}
              className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800 cursor-pointer"
              title="İlerlemeyi Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {!isProcessing ? (
            <button
              onClick={onStart}
              disabled={selectedCount === 0}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer ${
                isTranslation
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                {isTranslation
                  ? stats.processedBlocks > 0
                    ? 'Çeviriye Devam Et'
                    : 'Çeviriyi Başlat'
                  : stats.processedBlocks > 0
                  ? 'Düzeltmeye Devam Et'
                  : 'Düzeltmeyi Başlat'}
              </span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Durdur / Duraklat</span>
            </button>
          )}

          <button
            onClick={onDownload}
            disabled={stats.processedBlocks === 0 || isProcessing || isPacking}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer"
          >
            {isPacking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Paketleniyor...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>EPUB İndir</span>
              </>
            )}
          </button>

          {onDownloadMobi && (
            <button
              onClick={onDownloadMobi}
              disabled={stats.processedBlocks === 0 || isProcessing || isPacking}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Eski Kindle modelleri için MOBI formatında kaydet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>MOBI</span>
            </button>
          )}

          {onSendToDevice && (
            <button
              onClick={onSendToDevice}
              disabled={stats.processedBlocks === 0 || isProcessing || isPacking}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Kindle veya KOReader cihazınıza kablosuz gönderin"
            >
              <Send className="w-4 h-4" />
              <span>Cihaza Gönder</span>
            </button>
          )}
        </div>
      </div>

      {isProcessing && stats.phaseMessage && (
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stats.phase === 'ai' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${stats.phase === 'ai' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            </span>
            <span className="font-semibold">{stats.phaseMessage}</span>
          </div>
          {stats.totalBatches !== undefined && stats.activeBatchIndex !== undefined && stats.phase === 'ai' && (
            <span className="text-[11px] text-zinc-400 font-mono">
              Paket {stats.activeBatchIndex}/{stats.totalBatches}
            </span>
          )}
        </div>
      )}

      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
            isTranslation
              ? 'bg-gradient-to-r from-blue-500 to-indigo-400'
              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
          }`}
          style={{ width: `${percent}%` }}
        >
          {isProcessing && (
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_1.5s_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)]" />
          )}
        </div>
      </div>
    </div>
  );
};
