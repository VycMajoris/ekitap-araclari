import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Cpu,
  Sliders,
  RotateCw,
  ExternalLink,
  Eye,
  EyeOff,
  Code,
  Bug,
  LogOut,
  CheckCircle2,
  Database,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Wrench,
} from 'lucide-react';
import {
  OpenRouterModel,
  ProcessingOptions,
  LlmProvider,
  AntigravityAuthData,
} from '@/lib/types';
import {
  POPULAR_FREE_MODELS,
  fetchOpenRouterModels,
  TURKISH_OCR_SYSTEM_PROMPT,
} from '@/lib/openrouter';
import {
  ANTIGRAVITY_MODELS,
  GEMINI_API_MODELS,
  generatePkce,
  getAntigravityAuthUrl,
} from '@/lib/antigravity';
import { getCacheStats, clearCache } from '@/lib/cache';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ProcessingOptions;
  onOptionsChange: (newOptions: ProcessingOptions) => void;
  onLoginGoogle?: () => void;
  currentTheme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  onLoginGoogle,
  currentTheme = 'system',
  onThemeChange,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>(POPULAR_FREE_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<{ count: number; estimatedSizeKb: number }>({ count: 0, estimatedSizeKb: 0 });
  const [isClearingCache, setIsClearingCache] = useState(false);

  const activeTab: LlmProvider = options.provider || 'openrouter';
  const isDevMode = Boolean(options.isDevMode);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'openrouter') {
        handleFetchModels();
      }
      getCacheStats().then((stats) => setCacheStats(stats));
    }
  }, [isOpen, activeTab]);

  const handleFetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const fetched = await fetchOpenRouterModels(options.apiKey);
      setModels(fetched);
    } catch {
      setModels(POPULAR_FREE_MODELS);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await clearCache();
      const updated = await getCacheStats();
      setCacheStats(updated);
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleSelectTab = (tab: LlmProvider) => {
    let nextModel = options.model;

    if (tab === 'antigravity') {
      if (!ANTIGRAVITY_MODELS.some((m) => m.id === options.model)) {
        nextModel = ANTIGRAVITY_MODELS[0].id;
      }
    } else if (tab === 'gemini_api') {
      if (!GEMINI_API_MODELS.some((m) => m.id === options.model)) {
        nextModel = GEMINI_API_MODELS[0].id;
      }
    } else if (tab === 'openrouter') {
      if (!models.some((m) => m.id === options.model)) {
        nextModel = models[0]?.id || POPULAR_FREE_MODELS[0].id;
      }
    }

    const newOptions: ProcessingOptions = {
      ...options,
      provider: tab,
      model: nextModel,
    };
    onOptionsChange(newOptions);
    if (typeof window !== 'undefined') {
      localStorage.setItem('epub_ocr_provider', tab);
      localStorage.setItem('epub_ocr_model', nextModel);
    }
  };

  const handleGoogleLogin = async () => {
    if (onLoginGoogle) {
      onLoginGoogle();
      return;
    }

    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const { verifier, challenge } = await generatePkce();
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const authUrl = getAntigravityAuthUrl(redirectUri, challenge, verifier);

      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Açılır pencere engellendi. Lütfen tarayıcınızın pop-up engelleyicisini kapatın.');
      }

      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GOOGLE_OAUTH_CODE') {
          window.removeEventListener('message', messageHandler);
          const { code } = event.data;
          if (!code) {
            setAuthError('Google yetkilendirme kodu alınamadı.');
            setIsLoggingIn(false);
            return;
          }

          try {
            const res = await fetch('/api/auth/google/callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                verifier,
                redirect_uri: redirectUri,
              }),
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Google token değişimi başarısız oldu.');
            }

            const data = await res.json();
            const authData: AntigravityAuthData = {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
              email: data.email,
              projectId: data.projectId,
            };

            const targetModel =
              options.model && ANTIGRAVITY_MODELS.some((m) => m.id === options.model)
                ? options.model
                : ANTIGRAVITY_MODELS[0].id;

            const newOptions: ProcessingOptions = {
              ...options,
              provider: 'antigravity',
              antigravityAuth: authData,
              model: targetModel,
            };

            onOptionsChange(newOptions);
            if (typeof window !== 'undefined') {
              localStorage.setItem('epub_ocr_provider', 'antigravity');
              localStorage.setItem('epub_ocr_antigravity_auth', JSON.stringify(authData));
              localStorage.setItem('epub_ocr_model', targetModel);
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Google girişi sırasında hata oluştu.';
            setAuthError(msg);
          } finally {
            setIsLoggingIn(false);
          }
        }
      };

      window.addEventListener('message', messageHandler);

      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          window.removeEventListener('message', messageHandler);
          setIsLoggingIn(false);
        }
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Giriş penceresi açılamadı.';
      setAuthError(msg);
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = () => {
    const newOptions: ProcessingOptions = {
      ...options,
      antigravityAuth: undefined,
    };
    onOptionsChange(newOptions);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('epub_ocr_antigravity_auth');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                Uygulama &amp; Model Ayarları
              </h2>
              <p className="text-xs text-zinc-500">Yapay zeka sağlayıcısı ve görünüm tercihleri</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {onThemeChange && (
            <div className="space-y-2">
              <label className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                Görünüm Teması
              </label>
              <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    currentTheme === 'light'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Aydınlık</span>
                </button>

                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    currentTheme === 'dark'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Karanlık</span>
                </button>

                <button
                  type="button"
                  onClick={() => onThemeChange('system')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    currentTheme === 'system'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Sistem</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              Yapay Zeka Sağlayıcısı
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleSelectTab('antigravity')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'antigravity'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <GoogleGIcon className="w-3.5 h-3.5" />
                <span className="truncate">Google Hesabı</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('gemini_api')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'gemini_api'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span className="truncate">AI Studio (Gemini)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('openrouter')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'openrouter'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate">OpenRouter Free</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Google Hesabı (Antigravity) */}
          {activeTab === 'antigravity' && (
            <div className="space-y-4">
              {options.antigravityAuth?.email ? (
                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-zinc-900 dark:text-white font-mono">
                            {options.antigravityAuth.email}
                          </span>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                            Google Bağlı
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Antigravity OAuth ile aktif bağlantı sağlandı.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                    <GoogleGIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                      Google Hesabınızla Giriş Yapın
                    </h3>
                    <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                      Antigravity OAuth entegrasyonu ile Gemini 3.5 Flash, Gemini 3 Pro ve Claude modellerini yüksek kota ve hızla kullanın.
                    </p>
                  </div>
                  {authError && (
                    <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2 rounded-xl">
                      {authError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-600 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <GoogleGIcon className="w-4 h-4" />
                    <span>{isLoggingIn ? 'Giriş Yapılıyor...' : 'Google ile Giriş Yap (Antigravity OAuth)'}</span>
                  </button>
                </div>
              )}

              {/* Antigravity Model Selection */}
              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-500" />
                  Model Seçimi
                </label>
                <select
                  value={options.model}
                  onChange={(e) => {
                    const val = e.target.value;
                    onOptionsChange({ ...options, model: val });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('epub_ocr_model', val);
                    }
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {ANTIGRAVITY_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {ANTIGRAVITY_MODELS.find((m) => m.id === options.model)?.description && (
                  <p className="text-[11px] text-zinc-500 italic">
                    {ANTIGRAVITY_MODELS.find((m) => m.id === options.model)?.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Google AI Studio (Gemini Key) */}
          {activeTab === 'gemini_api' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-500" />
                    Google AI Studio (Gemini) API Anahtarı
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    AI Studio&apos;dan Anahtar Al <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={options.geminiApiKey || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onOptionsChange({ ...options, geminiApiKey: val });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('epub_ocr_gemini_api_key', val);
                      }
                    }}
                    placeholder="AIzaSy..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Google AI Studio anahtarınız doğrudan Google Generative Language API ile güvenle iletişim kurar.
                </p>
              </div>

              {/* Gemini Model Selection */}
              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  Gemini Model Seçimi
                </label>
                <select
                  value={options.model}
                  onChange={(e) => {
                    const val = e.target.value;
                    onOptionsChange({ ...options, model: val });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('epub_ocr_model', val);
                    }
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {GEMINI_API_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {GEMINI_API_MODELS.find((m) => m.id === options.model)?.description && (
                  <p className="text-[11px] text-zinc-500 italic">
                    {GEMINI_API_MODELS.find((m) => m.id === options.model)?.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: OpenRouter (Ücretsiz API Key) */}
          {activeTab === 'openrouter' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-500" />
                    OpenRouter API Anahtarı
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    Ücretsiz Anahtar Al <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={options.apiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      onOptionsChange({ ...options, apiKey: val });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('epub_ocr_api_key', val);
                      }
                    }}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  API anahtarınız yalnızca tarayıcınızın yerel hafızasında saklanır, asla harici bir sunucuya gönderilmez.
                </p>
              </div>

              {/* OpenRouter Model Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    Ücretsiz Model Seçimi
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={isLoadingModels}
                    className="text-xs text-zinc-500 hover:text-emerald-500 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Modelleri Yenile"
                  >
                    <RotateCw className={`w-3 h-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                    Yenile
                  </button>
                </div>
                <select
                  value={options.model}
                  onChange={(e) => {
                    const val = e.target.value;
                    onOptionsChange({ ...options, model: val });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('epub_ocr_model', val);
                    }
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isFree ? '(Ücretsiz)' : ''}
                    </option>
                  ))}
                </select>
                {models.find((m) => m.id === options.model)?.description && (
                  <p className="text-[11px] text-zinc-500 italic">
                    {models.find((m) => m.id === options.model)?.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Persistent Cache Management */}
          <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                    Kalıcı Blok Önbelleği (IndexedDB)
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Tamamlanan paragrafları saklar, işlem tekrarında token harcatmaz.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearCache}
                disabled={isClearingCache || cacheStats.count === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingCache ? 'Temizleniyor...' : 'Önbelleği Temizle'}</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <span>Kayıtlı Blok: <b className="text-zinc-900 dark:text-white">{cacheStats.count.toLocaleString('tr-TR')}</b></span>
              <span>Tahmini Boyut: <b className="text-zinc-900 dark:text-white">~{cacheStats.estimatedSizeKb} KB</b></span>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                    Geliştirici Modu (Developer Mode)
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Canlı değişiklik günlüğü, prompt editörü ve teknik parametreleri açar.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={isDevMode}
                onChange={(e) => {
                  const val = e.target.checked;
                  onOptionsChange({ ...options, isDevMode: val });
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('epub_ocr_dev_mode', String(val));
                  }
                }}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 cursor-pointer"
              />
            </div>
          </div>

          {isDevMode && (
            <div className="space-y-4 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                <Wrench className="w-3.5 h-3.5" />
                <span>Gelişmiş Geliştirici Ayarları</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Bug className="w-4 h-4 text-emerald-500" />
                    Detaylı Debug &amp; Günlükleme Modu (Konsol + Arayüz logları)
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(options.debugMode)}
                    onChange={(e) =>
                      onOptionsChange({ ...options, debugMode: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Yapılan tüm regex kural eşleşmelerini ve LLM düzeltmelerini canlı olarak Değişiklik Günlüğü panelinde kayıt altına alır.
                </p>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Concurrency */}
                <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      Eşzamanlı İstek (Concurrency)
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {options.concurrency}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={options.concurrency}
                    onChange={(e) =>
                      onOptionsChange({ ...options, concurrency: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Chunk Size */}
                <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      Paket Boyutu (Batch Chars)
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {options.chunkSize} chr
                    </span>
                  </div>
                  <input
                    type="range"
                    min="800"
                    max="3000"
                    step="200"
                    value={options.chunkSize}
                    onChange={(e) =>
                      onOptionsChange({ ...options, chunkSize: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Collapsible System Prompt */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-500" />
                    Özel Sistem Talimatı (System Prompt)
                  </span>
                  <span className="text-zinc-400">{showPromptEditor ? 'Gizle' : 'Göster'}</span>
                </button>
                {showPromptEditor && (
                  <div className="p-4 bg-white dark:bg-zinc-900 space-y-2">
                    <textarea
                      value={options.customPrompt || TURKISH_OCR_SYSTEM_PROMPT}
                      onChange={(e) =>
                        onOptionsChange({ ...options, customPrompt: e.target.value })
                      }
                      rows={8}
                      className="w-full font-mono text-[11px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onOptionsChange({ ...options, customPrompt: TURKISH_OCR_SYSTEM_PROMPT })
                      }
                      className="text-[11px] text-zinc-500 hover:text-emerald-500 underline cursor-pointer"
                    >
                      Varsayılan Prompt&apos;a Sıfırla
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-colors cursor-pointer"
          >
            Kaydet ve Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
