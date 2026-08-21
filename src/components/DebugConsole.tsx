import React, { useState, useMemo } from 'react';
import {
  Terminal,
  Bug,
  Download,
  Trash2,
  X,
  Search,
  Filter,
  Check,
  Copy,
  Sparkles,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { DebugLogEntry } from '@/lib/types';
import { computeTextDiff } from '@/lib/turkish-ocr-rules';

export interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DebugLogEntry[];
  onClearLogs: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: (enabled: boolean) => void;
}

type FilterType = 'all' | 'regex' | 'llm' | 'error';

export const DebugConsole: React.FC<DebugConsoleProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  isDebugMode,
  onToggleDebugMode,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: logs.length,
      regex: logs.filter((l) => l.source === 'regex').length,
      llm: logs.filter((l) => l.source === 'llm').length,
      error: logs.filter((l) => l.source === 'error').length,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterType === 'regex' && log.source !== 'regex') return false;
      if (filterType === 'llm' && log.source !== 'llm') return false;
      if (filterType === 'error' && log.source !== 'error') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inRule = log.ruleName?.toLowerCase().includes(q) ?? false;
        const inChapter = log.chapterTitle?.toLowerCase().includes(q) ?? false;
        const inBlock = log.blockId?.toLowerCase().includes(q) ?? false;
        const inOrig = log.originalText?.toLowerCase().includes(q) ?? false;
        const inCorr = log.correctedText?.toLowerCase().includes(q) ?? false;
        const inChanges =
          log.changes?.some(
            (c) =>
              c.before.toLowerCase().includes(q) ||
              c.after.toLowerCase().includes(q)
          ) ?? false;

        return inRule || inChapter || inBlock || inOrig || inCorr || inChanges;
      }

      return true;
    });
  }, [logs, filterType, searchQuery]);

  const handleDownloadJson = () => {
    if (logs.length === 0) return;
    const jsonString = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `degisiklik-gunlugu-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLog = (log: DebugLogEntry) => {
    const jsonString = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                  Değişiklik Günlüğü &amp; Debug
                </h2>
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full px-2 py-0.5">
                  {logs.length} Kayıt
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                OCR ve LLM tarafından gerçekleştirilen canlı metin dönüşümleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Debug Mode Toggle */}
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 px-2.5 py-1.5 rounded-xl text-xs">
              <Bug className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium hidden sm:inline">
                Debug Modu
              </span>
              <button
                type="button"
                onClick={() => onToggleDebugMode(!isDebugMode)}
                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isDebugMode ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                title="Debug Modunu Aç/Kapat"
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isDebugMode ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Tümü ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('regex')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                filterType === 'regex'
                  ? 'bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-amber-600'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              Regex ({counts.regex})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('llm')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                filterType === 'llm'
                  ? 'bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-purple-600'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-500" />
              LLM ({counts.llm})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('error')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                filterType === 'error'
                  ? 'bg-white dark:bg-zinc-800 text-rose-700 dark:text-rose-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-rose-600'
              }`}
            >
              <Bug className="w-3 h-3 text-rose-500" />
              Hata ({counts.error})
            </button>
          </div>

          {/* Search Input & Quick Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Günlükte ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={handleDownloadJson}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="JSON İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON İndir</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/40">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-4 border border-zinc-200 dark:border-zinc-700">
                <Terminal className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200 mb-1">
                Henüz Değişiklik Kaydı Yok
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                EPUB düzeltme işlemi başladığında regex kural eşleşmeleri, LLM onarımları ve hata kayıtları burada canlı olarak listelenecektir.
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-3 border border-zinc-200 dark:border-zinc-700">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mb-1">
                Filtreye Uygun Kayıt Bulunamadı
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                Arama sorgunuzu veya kategori filtrenizi değiştirerek tekrar deneyebilirsiniz.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                isCopied={copiedLogId === log.id}
                onCopy={() => handleCopyLog(log)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 font-medium">
            Gösterilen: {filteredLogs.length} / Toplam {logs.length} Kayıt
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Günlüğü Temizle</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold shadow-xs transition-colors cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LogCardProps {
  log: DebugLogEntry;
  isCopied: boolean;
  onCopy: () => void;
}

const LogCard: React.FC<LogCardProps> = ({ log, isCopied, onCopy }) => {
  const isRegex = log.source === 'regex';
  const isLlm = log.source === 'llm';
  const isError = log.source === 'error';

  const sourceTag = useMemo(() => {
    if (isRegex) return `[Regex: ${log.ruleName || 'Kural'}]`;
    if (isLlm) return `[LLM: ${log.ruleName || 'Gemini 2.0 Flash'}]`;
    if (isError) return `[Hata: ${log.ruleName || 'Bilinmeyen Hata'}]`;
    return `[Sistem: ${log.ruleName || 'İşlem'}]`;
  }, [isRegex, isLlm, isError, log.ruleName]);

  const { diffs } = useMemo(() => {
    return computeTextDiff(log.originalText, log.correctedText);
  }, [log.originalText, log.correctedText]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Source Tag Badge */}
          {isRegex && (
            <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
              <Zap className="w-3 h-3 text-amber-500" />
              {sourceTag}
            </span>
          )}
          {isLlm && (
            <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-md">
              <Sparkles className="w-3 h-3 text-purple-500" />
              {sourceTag}
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded-md">
              <Bug className="w-3 h-3 text-rose-500" />
              {sourceTag}
            </span>
          )}
          {!isRegex && !isLlm && !isError && (
            <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md">
              <Terminal className="w-3 h-3 text-blue-500" />
              {sourceTag}
            </span>
          )}

          {/* Chapter & Block */}
          {log.chapterTitle && (
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
              {log.chapterTitle}
            </span>
          )}
          {log.blockId && (
            <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded">
              #{log.blockId}
            </span>
          )}
        </div>

        {/* Timestamp and Copy */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-zinc-400 font-mono">{log.timestamp}</span>
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            title="Kayıt Detayını Kopyala"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Kopyala</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Changes list chips */}
      {log.changes && log.changes.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 block">
            Değişiklik Eşleşmeleri:
          </span>
          <div className="flex flex-wrap gap-2">
            {log.changes.map((change, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs"
              >
                <span className="line-through bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {change.before}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {change.after}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Sentence Preview with Diff Highlights */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 block">
          Cümle Bağlamı &amp; Önizleme:
        </span>
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
          {diffs.map((part, i) => {
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
          })}
        </div>
      </div>
    </div>
  );
};

export default DebugConsole;
