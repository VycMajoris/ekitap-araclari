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
  Database,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Wrench,
  Server,
  Languages,
  Plus,
} from 'lucide-react';
import {
  OpenRouterModel,
  ProcessingOptions,
  LlmProvider,
  TranslationStyle,
} from '@/lib/types';
import {
  POPULAR_FREE_MODELS,
  fetchOpenRouterModels,
  TURKISH_OCR_SYSTEM_PROMPT,
  SUPPORTED_SOURCE_LANGUAGES,
  SUPPORTED_TARGET_LANGUAGES,
  TRANSLATION_STYLES,
} from '@/lib/openrouter';
import {
  GEMINI_API_MODELS,
} from '@/lib/antigravity';
import { getCacheStats, clearCache } from '@/lib/cache';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ProcessingOptions;
  onOptionsChange: (newOptions: ProcessingOptions) => void;
  currentTheme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
  initialTab?: LlmProvider;
}

export const OPENAI_PRESETS = [
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    url: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'gpt-4.5-preview'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'groq',
    name: 'Groq (Süper Hızlı)',
    url: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'qwen-2.5-32b', 'mixtral-8x7b-32768'],
  },
  {
    id: 'ollama',
    name: 'Ollama (Lokal / PC)',
    url: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5', 'mistral', 'deepseek-r1'],
  },
  {
    id: 'custom',
    name: 'Özel Sunucu / Diğer',
    url: '',
    defaultModel: '',
    models: [],
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  currentTheme = 'system',
  onThemeChange,
  initialTab,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>(POPULAR_FREE_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; estimatedSizeKb: number }>({ count: 0, estimatedSizeKb: 0 });
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [newTermKey, setNewTermKey] = useState('');
  const [newTermVal, setNewTermVal] = useState('');

  const activeTab: LlmProvider = initialTab || (options.provider === 'antigravity' ? 'gemini_api' : options.provider) || 'gemini_api';
  const isDevMode = Boolean(options.isDevMode);

  const handleAddGlossaryTerm = () => {
    if (!newTermKey.trim()) return;
    const currentGlossary = { ...(options.glossary || {}) };
    currentGlossary[newTermKey.trim()] = newTermVal.trim();
    onOptionsChange({ ...options, glossary: currentGlossary });
    if (typeof window !== 'undefined') {
      localStorage.setItem('ekitap_glossary', JSON.stringify(currentGlossary));
    }
    setNewTermKey('');
    setNewTermVal('');
  };

  const handleRemoveGlossaryTerm = (key: string) => {
    const currentGlossary = { ...(options.glossary || {}) };
    delete currentGlossary[key];
    onOptionsChange({ ...options, glossary: currentGlossary });
    if (typeof window !== 'undefined') {
      localStorage.setItem('ekitap_glossary', JSON.stringify(currentGlossary));
    }
  };

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

    if (tab === 'gemini_api') {
      if (!GEMINI_API_MODELS.some((m) => m.id === options.model)) {
        nextModel = GEMINI_API_MODELS[0].id;
      }
    } else if (tab === 'openrouter') {
      if (!models.some((m) => m.id === options.model)) {
        nextModel = models[0]?.id || POPULAR_FREE_MODELS[0].id;
      }
    } else if (tab === 'custom_openai') {
      nextModel = options.customOpenAiModel || 'gpt-4o-mini';
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
            <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleSelectTab('gemini_api')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'gemini_api'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span className="truncate">Google AI Studio</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('openrouter')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'openrouter'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate">OpenRouter</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('custom_openai')}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'custom_openai'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-purple-500" />
                <span className="truncate">OpenAI / Özel</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Google AI Studio (Gemini Key) */}
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
                    AI Studio&apos;dan Ücretsiz Anahtar Al <ExternalLink className="w-3 h-3" />
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
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 rounded-xl p-3 text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed space-y-1">
                  <p>
                    <strong>💡 Tamamen Ücretsiz &amp; Kişisel Kota:</strong> Google AI Studio anahtarınız ile günde 1.500 istek (ortalama 15-20 tam kitap) ücretsiz işlenebilir.
                  </p>
                  <p>
                    Kota bittiğinde fatura çıkmaz; kota dolunca otomatik durur ve süre dolunca tekrar açılır.
                  </p>
                </div>
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

          {activeTab === 'custom_openai' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                  Hızlı Sağlayıcı Şablonu (Presets)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {OPENAI_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const newUrl = preset.url || options.customOpenAiBaseUrl || '';
                        const newModel = preset.defaultModel || options.customOpenAiModel || 'gpt-4o-mini';
                        onOptionsChange({
                          ...options,
                          customOpenAiBaseUrl: newUrl,
                          customOpenAiModel: newModel,
                          model: newModel,
                        });
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('epub_ocr_openai_base_url', newUrl);
                          localStorage.setItem('epub_ocr_openai_model', newModel);
                          localStorage.setItem('epub_ocr_model', newModel);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-500" />
                  API Base URL (Endpoint)
                </label>
                <input
                  type="text"
                  value={options.customOpenAiBaseUrl || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onOptionsChange({ ...options, customOpenAiBaseUrl: val });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('epub_ocr_openai_base_url', val);
                    }
                  }}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                />
                <p className="text-[11px] text-zinc-500">
                  OpenAI, DeepSeek, Groq, Ollama (örn: <code>http://localhost:11434/v1</code>) veya herhangi bir OpenAI uyumlu API uç noktası.
                </p>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-500" />
                  API Anahtarı (API Key)
                </label>
                <div className="relative">
                  <input
                    type={showOpenAiKey ? 'text' : 'password'}
                    value={options.customOpenAiKey || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onOptionsChange({ ...options, customOpenAiKey: val });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('epub_ocr_openai_key', val);
                      }
                    }}
                    placeholder="sk-..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showOpenAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Lokal Ollama sunucuları için API anahtarı boş bırakılabilir.
                </p>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-500" />
                  Model Adı
                </label>
                <input
                  type="text"
                  value={options.customOpenAiModel || options.model || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onOptionsChange({ ...options, customOpenAiModel: val, model: val });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('epub_ocr_openai_model', val);
                      localStorage.setItem('epub_ocr_model', val);
                    }
                  }}
                  placeholder="gpt-4o-mini veya deepseek-chat"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Book Translation Settings */}
          <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Languages className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                  Akıllı Kitap Çevirisi Tercihleri
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Bağlam korumalı edebi kitap çevirisi için dil, üslup ve özel terim ayarları.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Kaynak Dil
                </label>
                <select
                  value={options.sourceLanguage || 'auto'}
                  onChange={(e) => {
                    const val = e.target.value;
                    onOptionsChange({ ...options, sourceLanguage: val });
                    if (typeof window !== 'undefined') localStorage.setItem('ekitap_source_lang', val);
                  }}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {SUPPORTED_SOURCE_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Hedef Dil
                </label>
                <select
                  value={options.targetLanguage || 'tr'}
                  onChange={(e) => {
                    const val = e.target.value;
                    onOptionsChange({ ...options, targetLanguage: val });
                    if (typeof window !== 'undefined') localStorage.setItem('ekitap_target_lang', val);
                  }}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {SUPPORTED_TARGET_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Çeviri Üslubu ve Ton
              </label>
              <select
                value={options.translationStyle || 'literary'}
                onChange={(e) => {
                  const val = e.target.value as TranslationStyle;
                  onOptionsChange({ ...options, translationStyle: val });
                  if (typeof window !== 'undefined') localStorage.setItem('ekitap_trans_style', val);
                }}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {TRANSLATION_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.description})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <div>
                <span className="font-semibold text-xs text-zinc-900 dark:text-white block">
                  Kayan Bağlam Hafızası (Rolling Context Memory)
                </span>
                <p className="text-[11px] text-zinc-500">
                  Önceki paragrafları sonraki isteklerde referans vererek zamir ve karakter tutarlılığını korur.
                </p>
              </div>
              <input
                type="checkbox"
                checked={options.enableRollingContext !== false}
                onChange={(e) => {
                  const val = e.target.checked;
                  onOptionsChange({ ...options, enableRollingContext: val });
                  if (typeof window !== 'undefined') localStorage.setItem('ekitap_rolling_ctx', String(val));
                }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 cursor-pointer"
              />
            </div>

            {/* Custom Glossary */}
            <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Özel Karakter &amp; Terim Sözlüğü (Glossary)</span>
                <span className="text-[10px] text-zinc-400 font-normal">İsteğe Bağlı</span>
              </label>
              <p className="text-[11px] text-zinc-500">
                Kitapta geçen özel isimlerin, mekânların veya terimlerin tam olarak nasıl çevrilmesini istediğinizi tanımlayın.
              </p>

              {options.glossary && Object.keys(options.glossary).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(options.glossary).map(([term, trans]) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 shadow-2xs"
                    >
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{term}</span>
                      <span className="text-zinc-400">&rarr;</span>
                      <span>{trans}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGlossaryTerm(term)}
                        className="text-zinc-400 hover:text-rose-500 ml-1 transition-colors cursor-pointer"
                        title="Terimi Sil"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Orijinal Terim (Örn: Hogwarts)"
                  value={newTermKey}
                  onChange={(e) => setNewTermKey(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Hedef Çeviri (Örn: Hogwarts)"
                  value={newTermVal}
                  onChange={(e) => setNewTermVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGlossaryTerm();
                    }
                  }}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddGlossaryTerm}
                  disabled={!newTermKey.trim()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ekle</span>
                </button>
              </div>
            </div>
          </div>

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
