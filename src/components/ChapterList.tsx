import React from 'react';
import {
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { EpubChapter } from '../lib/types';

interface ChapterListProps {
  chapters: EpubChapter[];
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string) => void;
  onToggleChapterSelect: (chapterId: string, isSelected: boolean) => void;
  onToggleAll: (selectAll: boolean) => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  selectedChapterId,
  onSelectChapter,
  onToggleChapterSelect,
  onToggleAll,
}) => {
  const allSelected = chapters.every((c) => c.isSelected);
  const someSelected = chapters.some((c) => c.isSelected);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col h-full max-h-[640px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-500" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Kitap Bölümleri</h3>
          <span className="text-xs text-zinc-400">({chapters.length})</span>
        </div>

        <button
          onClick={() => onToggleAll(!allSelected)}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {allSelected ? (
            <>
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Seçimi Kaldır</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>Tümünü Seç</span>
            </>
          )}
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto space-y-2 pr-1 flex-1">
        {chapters.map((chapter) => {
          const isCurrent = chapter.id === selectedChapterId;
          const isDone = chapter.status === 'completed';
          const isProc = chapter.status === 'processing';
          const isErr = chapter.status === 'error';

          return (
            <div
              key={chapter.id}
              onClick={() => onSelectChapter(chapter.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isCurrent
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-sm'
                  : 'bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              {/* Checkbox & Title */}
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={chapter.isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleChapterSelect(chapter.id, e.target.checked);
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shrink-0"
                />

                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {chapter.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>{chapter.blocks.length} blok</span>
                    {chapter.stats.fixedWords > 0 && (
                      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Sparkles className="w-2.5 h-2.5" />
                        {chapter.stats.fixedWords} düzeltme
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 flex items-center">
                {isProc && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    İşleniyor
                  </span>
                )}
                {isDone && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Bitti
                  </span>
                )}
                {isErr && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    Hata
                  </span>
                )}
                {!isProc && !isDone && !isErr && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    Bekliyor
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
