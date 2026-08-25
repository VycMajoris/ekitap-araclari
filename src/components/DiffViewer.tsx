import React, { useState } from 'react';
import {
  FileCode2,
  CheckCircle2,
  Sparkles,
  Columns,
  Rows,
  Filter,
  Search,
  Copy,
  Check,
  Languages,
} from 'lucide-react';
import { EpubChapter, TextBlock, TaskType } from '../lib/types';
import { computeTextDiff } from '../lib/turkish-ocr-rules';
import { getLanguageName } from '../lib/openrouter';

interface DiffViewerProps {
  chapter: EpubChapter | null;
  taskType?: TaskType;
  sourceLang?: string;
  targetLang?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  chapter,
  taskType = 'ocr_fix',
  sourceLang = 'auto',
  targetLang = 'tr',
}) => {
  const [onlyDiffs, setOnlyDiffs] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  if (!chapter) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <FileCode2 className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
        <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">
          Önizleme İçin Bölüm Seçin
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          Sol listeden bir bölüme tıklayarak orijinal ve işlenmiş metinleri canlı olarak karşılaştırabilirsiniz.
        </p>
      </div>
    );
  }

  const isTranslation = taskType === 'translate';

  const filteredBlocks = chapter.blocks.filter((b) => {
    if (onlyDiffs && b.diffCount === 0 && b.originalText === b.correctedText) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.originalText.toLowerCase().includes(q) ||
        b.correctedText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyText = (blockId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlockId(blockId);
    setTimeout(() => setCopiedBlockId(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col h-full max-h-[640px]">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
            <span>{chapter.title}</span>
            {chapter.stats.fixedWords > 0 && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isTranslation
                    ? 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950'
                }`}
              >
                {isTranslation ? (
                  <>
                    <Languages className="w-3 h-3" />
                    {chapter.stats.fixedWords} Kelime Çevrildi
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    {chapter.stats.fixedWords} Kelime Düzeltildi
                  </>
                )}
              </span>
            )}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {chapter.href} &bull; Toplam {chapter.blocks.length} Paragraf
          </p>
        </div>

        {/* View mode & Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Bölümde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-36"
            />
          </div>

          {/* Only Diffs toggle */}
          <button
            onClick={() => setOnlyDiffs(!onlyDiffs)}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
              onlyDiffs
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Yalnızca Değişenler</span>
          </button>

          {/* View mode toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Yan Yana Karşılaştırma"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Satır İçi Vurgulama"
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Block List */}
      <div className="overflow-y-auto space-y-3 pr-1 flex-1">
        {filteredBlocks.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-xs">
            {onlyDiffs
              ? isTranslation
                ? 'Bu bölümde henüz çevirisi yapılan bir paragraf bulunmuyor.'
                : 'Bu bölümde henüz düzeltme yapılan bir paragraf bulunmuyor.'
              : 'Eşleşen paragraf bulunamadı.'}
          </div>
        ) : (
          filteredBlocks.map((block, idx) => (
            <BlockItem
              key={block.id}
              block={block}
              index={idx + 1}
              viewMode={viewMode}
              isTranslation={isTranslation}
              sourceLangName={getLanguageName(sourceLang)}
              targetLangName={getLanguageName(targetLang)}
              isCopied={copiedBlockId === block.id}
              onCopy={() => handleCopyText(block.id, block.correctedText)}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface BlockItemProps {
  block: TextBlock;
  index: number;
  viewMode: 'split' | 'unified';
  isTranslation?: boolean;
  sourceLangName?: string;
  targetLangName?: string;
  isCopied: boolean;
  onCopy: () => void;
}

const BlockItem: React.FC<BlockItemProps> = ({
  block,
  index,
  viewMode,
  isTranslation = false,
  sourceLangName = 'Kaynak',
  targetLangName = 'Türkçe',
  isCopied,
  onCopy,
}) => {
  const isChanged = block.originalText !== block.correctedText;
  const { diffs } = computeTextDiff(block.originalText, block.correctedText);

  return (
    <div
      className={`rounded-2xl border p-3.5 text-xs transition-all ${
        isChanged
          ? isTranslation
            ? 'bg-white dark:bg-zinc-950/80 border-blue-300/80 dark:border-blue-800/80 shadow-xs'
            : 'bg-white dark:bg-zinc-950/80 border-emerald-300/80 dark:border-emerald-800/80 shadow-xs'
          : 'bg-zinc-50/50 dark:bg-zinc-950/30 border-zinc-200/70 dark:border-zinc-800/70'
      }`}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-zinc-600 dark:text-zinc-300">
            #{index} &lt;{block.elementTag}&gt;
          </span>
          {block.status === 'completed' ? (
            <span
              className={`font-semibold flex items-center gap-1 ${
                isTranslation
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {isTranslation ? 'Çevrildi' : `${block.diffCount} Düzeltme`}
            </span>
          ) : block.status === 'processing' ? (
            <span className="text-blue-500 font-medium animate-pulse flex items-center gap-1">
              İşleniyor...
            </span>
          ) : block.status === 'error' ? (
            <span className="text-rose-500 font-medium">Hata Oluştu</span>
          ) : (
            <span className="text-zinc-400">İşlenmedi</span>
          )}
        </div>

        <button
          onClick={onCopy}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
          title="İşlenmiş metni kopyala"
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Kopyalandı</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Kopyala</span>
            </>
          )}
        </button>
      </div>

      {/* Content Rendering */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 leading-relaxed">
          {/* Left: Original */}
          <div
            className={`border rounded-xl p-3 ${
              isTranslation
                ? 'bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80'
                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                isTranslation
                  ? 'text-zinc-500 dark:text-zinc-400'
                  : 'text-rose-600/70 dark:text-rose-400/70'
              }`}
            >
              {isTranslation ? `Orijinal (${sourceLangName})` : 'Orijinal (OCR Bozuk)'}
            </span>
            <div className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {isTranslation ? (
                block.originalText
              ) : (
                diffs.map((part, i) => {
                  if (part.type === 'removed') {
                    return (
                      <span
                        key={i}
                        className="bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-medium line-through px-0.5 rounded"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  if (part.type === 'equal') {
                    return <span key={i}>{part.value}</span>;
                  }
                  return null;
                })
              )}
            </div>
          </div>

          {/* Right: Corrected / Translated */}
          <div
            className={`border rounded-xl p-3 ${
              isTranslation
                ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40'
                : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                isTranslation
                  ? 'text-blue-600/80 dark:text-blue-400/80'
                  : 'text-emerald-600/70 dark:text-emerald-400/70'
              }`}
            >
              {isTranslation ? `Çeviri (${targetLangName})` : 'Düzeltilmiş (Onarılmış)'}
            </span>
            <div className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans">
              {isTranslation ? (
                block.status === 'completed' ? (
                  block.correctedText
                ) : block.status === 'processing' ? (
                  <span className="italic text-blue-500 animate-pulse">Çevriliyor...</span>
                ) : block.status === 'error' ? (
                  <span className="italic text-rose-500">Çeviri sırasında hata oluştu. Yeniden denenebilir.</span>
                ) : (
                  <span className="italic text-zinc-400 dark:text-zinc-500">
                    Henüz çevrilmedi (Sırada bekliyor...)
                  </span>
                )
              ) : (
                diffs.map((part, i) => {
                  if (part.type === 'added') {
                    return (
                      <span
                        key={i}
                        className="bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 font-bold px-0.5 rounded shadow-xs"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  if (part.type === 'equal') {
                    return <span key={i}>{part.value}</span>;
                  }
                  return null;
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Inline Diff */
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
          {isTranslation ? (
            <div className="space-y-2">
              <div className="text-zinc-500 dark:text-zinc-400 text-[11px] pb-1 border-b border-zinc-200/50 dark:border-zinc-800/50">
                {block.originalText}
              </div>
              <div className="text-zinc-900 dark:text-white font-medium">
                {block.status === 'completed' ? (
                  block.correctedText
                ) : block.status === 'processing' ? (
                  <span className="italic text-blue-500 animate-pulse font-normal">Çevriliyor...</span>
                ) : block.status === 'error' ? (
                  <span className="italic text-rose-500 font-normal">Çeviri sırasında hata oluştu.</span>
                ) : (
                  <span className="italic text-zinc-400 dark:text-zinc-500 font-normal">
                    Henüz çevrilmedi (Sırada bekliyor...)
                  </span>
                )}
              </div>
            </div>
          ) : (
            diffs.map((part, i) => {
              if (part.type === 'removed') {
                return (
                  <span
                    key={i}
                    className="bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-medium line-through px-0.5 rounded mx-0.5"
                  >
                    {part.value}
                  </span>
                );
              }
              if (part.type === 'added') {
                return (
                  <span
                    key={i}
                    className="bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 font-bold px-0.5 rounded mx-0.5"
                  >
                    {part.value}
                  </span>
                );
              }
              return <span key={i}>{part.value}</span>;
            })
          )}
        </div>
      )}
    </div>
  );
};
