import React from 'react';
import { BookOpen, Sparkles, Settings as SettingsIcon, Terminal } from 'lucide-react';
import { LlmProvider, ProcessingOptions } from '@/lib/types';
import { POPULAR_FREE_MODELS } from '@/lib/openrouter';
import { ANTIGRAVITY_MODELS, GEMINI_API_MODELS } from '@/lib/antigravity';

export interface HeaderProps {
  onOpenSettings: () => void;
  options?: ProcessingOptions;
  provider?: LlmProvider;
  apiKeyConfigured?: boolean;
  modelName?: string;
  isDebugOpen?: boolean;
  onToggleDebugOpen?: () => void;
  logCount?: number;
  isDebugMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  options,
  provider: propProvider,
  apiKeyConfigured = false,
  modelName = '',
  isDebugOpen = false,
  onToggleDebugOpen,
  logCount = 0,
  isDebugMode = false,
}) => {
  const activeProvider: LlmProvider = options?.provider || propProvider || 'openrouter';
  const activeModelId = options?.model || modelName;

  const isReady = (() => {
    if (activeProvider === 'antigravity') {
      return Boolean(options?.antigravityAuth?.accessToken);
    }
    if (activeProvider === 'gemini_api') {
      return Boolean(options?.geminiApiKey?.trim());
    }
    return Boolean(options ? options.apiKey?.trim() : apiKeyConfigured);
  })();

  const displayModelLabel = (() => {
    if (activeProvider === 'antigravity') {
      const model = ANTIGRAVITY_MODELS.find((m) => m.id === activeModelId);
      const shortId = model ? model.id : activeModelId || 'gemini-3.5-flash';
      return `Google (${shortId})`;
    }
    if (activeProvider === 'gemini_api') {
      const model = GEMINI_API_MODELS.find((m) => m.id === activeModelId);
      const shortId = model ? model.id : activeModelId || 'gemini-2.0-flash';
      return `AI Studio (${shortId})`;
    }
    // openrouter
    if (activeModelId?.includes('llama-3.3') || modelName?.includes('Llama 3.3')) {
      return 'OpenRouter (Llama 3.3)';
    }
    if (activeModelId?.includes('gemini-2.0-flash') || modelName?.includes('Gemini 2.0 Flash')) {
      return 'OpenRouter (Gemini 2.0 Flash)';
    }
    const orModel = POPULAR_FREE_MODELS.find((m) => m.id === activeModelId);
    if (orModel) {
      const name = orModel.name.replace(/\s*\(Ücretsiz\)/i, '').trim();
      return `OpenRouter (${name})`;
    }
    return `OpenRouter (${activeModelId || 'Llama 3.3'})`;
  })();

  const providerBadge = (() => {
    if (activeProvider === 'antigravity') return 'Google Antigravity';
    if (activeProvider === 'gemini_api') return 'Google AI Studio';
    return 'OpenRouter Free LLM';
  })();

  const buttonText = isReady
    ? 'Ayarlar'
    : activeProvider === 'antigravity'
    ? 'Giriş Yap'
    : 'API Anahtarı Gerekli';

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-zinc-900 dark:text-white">
                EPUB Türkçe OCR Düzeltici
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full px-2 py-0.5">
                <Sparkles className="w-3 h-3" />
                {providerBadge}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              PDF&apos;ten dönüştürme ve harf birleşme hatalarını (yarm &rarr; yarın) otomatik onarır
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <span
              className={`w-2 h-2 rounded-full ${
                isReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
              {displayModelLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleDebugOpen}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-all border cursor-pointer ${
              isDebugOpen
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white border-zinc-400 dark:border-zinc-600'
                : isDebugMode
                ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
            }`}
            title="Değişiklik Günlüğü &amp; Debug Konsolu"
          >
            <Terminal
              className={`w-4 h-4 ${
                isDebugMode
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            />
            <span>Günlük</span>
            {logCount > 0 && (
              <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                {logCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-all border cursor-pointer ${
              isReady
                ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20 animate-bounce'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>{buttonText}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
