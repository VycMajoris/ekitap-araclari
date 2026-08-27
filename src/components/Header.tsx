import React from 'react';
import { Settings as SettingsIcon, Terminal, Sun, Moon, Wrench } from 'lucide-react';
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
  isDevMode?: boolean;
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
}

export const BrandLogo: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <div className={`${className} relative flex items-center justify-center shrink-0 select-none transition-transform hover:scale-105`}>
    <img
      src="/logo.svg"
      alt="eKitap Araçları Logo"
      className="w-full h-full object-contain rounded-xl drop-shadow-md"
    />
  </div>
);

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
  isDevMode = false,
  isDarkTheme = true,
  onToggleTheme,
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
    if (activeProvider === 'custom_openai') {
      return Boolean(
        options?.customOpenAiKey?.trim() ||
        options?.customOpenAiBaseUrl?.includes('localhost') ||
        options?.customOpenAiBaseUrl?.includes('127.0.0.1')
      );
    }
    return Boolean(options ? options.apiKey?.trim() : apiKeyConfigured);
  })();

  const displayModelLabel = (() => {
    if (activeProvider === 'antigravity') {
      const model = ANTIGRAVITY_MODELS.find((m) => m.id === activeModelId);
      const shortId = model ? model.id : activeModelId || 'gemini-3.7-flash';
      return `Google (${shortId})`;
    }
    if (activeProvider === 'gemini_api') {
      const model = GEMINI_API_MODELS.find((m) => m.id === activeModelId);
      const shortId = model ? model.id : activeModelId || 'gemini-3.7-flash';
      return `AI Studio (${shortId})`;
    }
    if (activeProvider === 'custom_openai') {
      const customModel = options?.customOpenAiModel || 'gpt-4o-mini';
      return `OpenAI API (${customModel})`;
    }
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

  const buttonText = isReady
    ? 'Ayarlar'
    : activeProvider === 'antigravity'
    ? 'Giriş Yap'
    : 'API Anahtarı Gerekli';

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">
                eKitap Araçları
              </h1>
              {isDevMode && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded-md">
                  <Wrench className="w-2.5 h-2.5" />
                  DEV
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Akıllı EPUB &amp; PDF Düzenleyici ve OCR Onarıcı
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Model Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/90 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
            <span
              className={`w-2 h-2 rounded-full ${
                isReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">
              {displayModelLabel}
            </span>
          </div>

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              title={isDarkTheme ? 'Aydınlık Temaya Geç' : 'Karanlık Temaya Geç'}
              aria-label="Tema Değiştir"
            >
              {isDarkTheme ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>
          )}

          {/* Debug Console Button (Only visible in devMode) */}
          {isDevMode && (
            <button
              type="button"
              onClick={onToggleDebugOpen}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all border cursor-pointer ${
                isDebugOpen
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white border-zinc-400 dark:border-zinc-600'
                  : isDebugMode
                  ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
              }`}
              title="Değişiklik Günlüğü &amp; Debug Konsolu"
            >
              <Terminal
                className={`w-3.5 h-3.5 ${
                  isDebugMode
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              />
              <span className="hidden sm:inline">Günlük</span>
              {logCount > 0 && (
                <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                  {logCount}
                </span>
              )}
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all border cursor-pointer ${
              isReady
                ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20 animate-bounce'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>{buttonText}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
