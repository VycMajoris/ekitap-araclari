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
  Zap,
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

export interface OpenAiPreset {
  id: string;
  name: string;
  url: string;
  defaultModel: string;
  models: { id: string; name: string }[];
  keyUrl?: string;
  keyPlaceholder?: string;
  badge?: string;
  description?: string;
}

export const OPENAI_PRESETS: OpenAiPreset[] = [
  {
    id: 'groq',
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Önerilen & Çok Hızlı)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra Hızlı)' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Yeni)' },
      { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B (Yeni)' },
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B' },
      { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B (Düşünce Modeli)' },
      { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
    ],
    keyUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    badge: 'Ücretsiz & Süper Hızlı',
    description: 'Groq LPU donanımı ile ultra yüksek hızda ve cömert ücretsiz kota ile çalışan açık kaynak modeller.',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    url: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Hızlı & Ekonomik - Önerilen)' },
      { id: 'gpt-4o', name: 'GPT-4o (Amiral Gemisi)' },
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol (En Gelişmiş Frontier Model)' },
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra (Dengeli Zekâ & Maliyet)' },
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna (Hızlı & Ekonomik Frontier)' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
      { id: 'gpt-5.4', name: 'GPT-5.4' },
      { id: 'gpt-5.5', name: 'GPT-5.5' },
      { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
      { id: 'gpt-5', name: 'GPT-5' },
      { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'o3-mini', name: 'o3-mini (Akıl Yürütme)' },
      { id: 'o3', name: 'o3' },
      { id: 'o3-pro', name: 'o3-pro' },
      { id: 'o1', name: 'o1' },
    ],
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    badge: 'Resmi',
    description: 'Resmi OpenAI API uç noktası, GPT-5.6 Frontier ve GPT-4o serisi modelleri.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3 (Chat - Edebi & Akıcı)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Reasoner - Düşünce Modeli)' },
    ],
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-...',
    badge: 'Ekonomik & Akıcı',
    description: 'DeepSeek resmi API uç noktası ve V3/R1 modelleri.',
  },
  {
    id: 'together',
    name: 'Together AI',
    url: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo' },
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Turbo' },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo' },
    ],
    keyUrl: 'https://api.together.ai/settings/api-keys',
    keyPlaceholder: '...',
    badge: 'Açık Kaynak',
    description: 'Together AI açık kaynaklı model bulut platformu.',
  },
  {
    id: 'ollama',
    name: 'Ollama (Lokal)',
    url: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: [
      { id: 'llama3.3', name: 'Llama 3.3 (70B)' },
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
      { id: 'deepseek-r1', name: 'DeepSeek R1' },
      { id: 'mistral', name: 'Mistral' },
      { id: 'gemma2', name: 'Gemma 2' },
    ],
    keyUrl: '',
    keyPlaceholder: 'Lokal sunucularda API anahtarı boş bırakılabilir',
    badge: 'Lokal / İnternetsiz',
    description: 'Bilgisayarınızda yerel çalışan Ollama sunucusu (API anahtarı gerekmez).',
  },
  {
    id: 'custom',
    name: 'Özel / Diğer',
    url: '',
    defaultModel: '',
    models: [],
    keyUrl: '',
    keyPlaceholder: 'sk-...',
    badge: 'Manuel',
    description: 'Herhangi bir OpenAI uyumlu (v1/chat/completions) özel sunucu veya proxy adresi.',
  },
];

export type UnifiedProviderId =
  | 'google'
  | 'groq'
  | 'openrouter'
  | 'openai'
  | 'deepseek'
  | 'together'
  | 'ollama'
  | 'custom';

export interface UnifiedProviderInfo {
  id: UnifiedProviderId;
  name: string;
  badge?: string;
  description: string;
}

export const UNIFIED_PROVIDERS: UnifiedProviderInfo[] = [
  {
    id: 'google',
    name: 'Google AI Studio',
    badge: 'Önerilen & Ücretsiz',
    description: 'Google AI Studio üzerinden günde 1.500 istek ücretsiz Gemini 3.7 / 3.6 Flash modelleri.',
  },
  {
    id: 'groq',
    name: 'Groq',
    badge: 'Süper Hızlı & Ücretsiz',
    description: 'Groq LPU donanımı ile ultra yüksek hızda ve cömert ücretsiz kota ile çalışan açık kaynak modeller.',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Açık Kaynak',
    description: 'OpenRouter üzerinden onlarca ücretsiz (:free) açık kaynaklı yapay zekâ modeli.',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    badge: 'Resmi',
    description: 'Resmi OpenAI API uç noktası, GPT-5.6 Frontier ve GPT-4o serisi modelleri.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'Ekonomik & Akıcı',
    description: 'DeepSeek resmi API uç noktası ve V3 (Chat) / R1 (Reasoner) modelleri.',
  },
  {
    id: 'together',
    name: 'Together AI',
    badge: 'Açık Kaynak',
    description: 'Together AI açık kaynaklı model bulut platformu (Llama 3.3 Turbo, Qwen).',
  },
  {
    id: 'ollama',
    name: 'Ollama (Lokal)',
    badge: 'Lokal / İnternetsiz',
    description: 'Kendi bilgisayarınızda yerel çalışan Ollama sunucusu (API anahtarı gerekmez).',
  },
  {
    id: 'custom',
    name: 'Özel / Diğer',
    badge: 'Manuel',
    description: 'Herhangi bir OpenAI uyumlu (v1/chat/completions) özel sunucu veya proxy adresi.',
  },
];

export const getUnifiedProviderId = (options: ProcessingOptions): UnifiedProviderId => {
  const provider = options.provider;
  if (provider === 'gemini_api' || provider === 'antigravity') return 'google';
  if (provider === 'openrouter') return 'openrouter';
  if (provider === 'custom_openai') {
    const url = (options.customOpenAiBaseUrl || '').trim().toLowerCase();
    if (url.includes('groq.com')) return 'groq';
    if (url.includes('openai.com')) return 'openai';
    if (url.includes('deepseek.com')) return 'deepseek';
    if (url.includes('together')) return 'together';
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('11434')) return 'ollama';
    return 'custom';
  }
  return 'google';
};

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
  const [isCustomModelManual, setIsCustomModelManual] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>(POPULAR_FREE_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; estimatedSizeKb: number }>({ count: 0, estimatedSizeKb: 0 });
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [newTermKey, setNewTermKey] = useState('');
  const [newTermVal, setNewTermVal] = useState('');

  const activeUnifiedProvider = getUnifiedProviderId(options);
  const activeProviderInfo = UNIFIED_PROVIDERS.find((p) => p.id === activeUnifiedProvider) || UNIFIED_PROVIDERS[0];
  const isDevMode = Boolean(options.isDevMode);

  const handleSelectUnifiedProvider = (providerId: UnifiedProviderId) => {
    setIsCustomModelManual(false);

    if (providerId === 'google') {
      let model = options.model;
      if (!GEMINI_API_MODELS.some((m) => m.id === model)) {
        model = GEMINI_API_MODELS[0].id;
      }
      const newOptions: ProcessingOptions = {
        ...options,
        provider: 'gemini_api',
        model,
      };
      onOptionsChange(newOptions);
      if (typeof window !== 'undefined') {
        localStorage.setItem('epub_ocr_provider', 'gemini_api');
        localStorage.setItem('epub_ocr_model', model);
      }
      return;
    }

    if (providerId === 'openrouter') {
      let model = options.model;
      if (!models.some((m) => m.id === model)) {
        model = models[0]?.id || POPULAR_FREE_MODELS[0].id;
      }
      const newOptions: ProcessingOptions = {
        ...options,
        provider: 'openrouter',
        model,
      };
      onOptionsChange(newOptions);
      if (typeof window !== 'undefined') {
        localStorage.setItem('epub_ocr_provider', 'openrouter');
        localStorage.setItem('epub_ocr_model', model);
      }
      return;
    }

    const preset = OPENAI_PRESETS.find((p) => p.id === providerId) || OPENAI_PRESETS[0];
    const newUrl = preset.url;
    const newModel = preset.defaultModel || options.customOpenAiModel || 'llama-3.3-70b-versatile';

    const newOptions: ProcessingOptions = {
      ...options,
      provider: 'custom_openai',
      customOpenAiBaseUrl: newUrl,
      customOpenAiModel: newModel,
      model: newModel,
    };
    onOptionsChange(newOptions);
    if (typeof window !== 'undefined') {
      localStorage.setItem('epub_ocr_provider', 'custom_openai');
      localStorage.setItem('epub_ocr_openai_base_url', newUrl);
      localStorage.setItem('epub_ocr_openai_model', newModel);
      localStorage.setItem('epub_ocr_model', newModel);
    }
  };

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
      if (activeUnifiedProvider === 'openrouter') {
        handleFetchModels();
      }
      getCacheStats().then((stats) => setCacheStats(stats));
    }
  }, [isOpen, activeUnifiedProvider]);

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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                Yapay Zeka Sağlayıcısı (API)
              </label>
              <span className="text-[11px] text-zinc-400 font-medium">
                {activeProviderInfo.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              {UNIFIED_PROVIDERS.map((p) => {
                const isSelected = activeUnifiedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectUnifiedProvider(p.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-zinc-200/80 dark:border-zinc-700 font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span className="truncate w-full text-center">{p.name}</span>
                  </button>
                );
              })}
            </div>

            {activeProviderInfo.description && (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-xl p-2.5 text-[11px] text-emerald-800/90 dark:text-emerald-300/90 flex items-center justify-between">
                <span>{activeProviderInfo.description}</span>
                {activeProviderInfo.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0 ml-2">
                    {activeProviderInfo.badge}
                  </span>
                )}
              </div>
            )}
          </div>

          {activeUnifiedProvider === 'google' && (
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

              <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <label className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Hesap / Kota Türü</span>
                  <span className="text-[11px] font-normal text-zinc-400">
                    {options.geminiTier === 'paid' ? 'Turbo Hız (Sınırsız RPM)' : '15 RPM Akıllı Hız Koruması'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      onOptionsChange({ ...options, geminiTier: 'free' });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('ekitap_gemini_tier', 'free');
                      }
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      options.geminiTier !== 'paid'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span>Ücretsiz Katman (Free - 15 RPM)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOptionsChange({ ...options, geminiTier: 'paid' });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('ekitap_gemini_tier', 'paid');
                      }
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      options.geminiTier === 'paid'
                        ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span>Ücretli Katman (Paid / Turbo)</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {options.geminiTier === 'paid'
                    ? 'Kredi kartı tanımlı Google Cloud / AI Studio hesapları için paketler bekleme olmadan paralel hızla işlenir.'
                    : 'Ücretsiz AI Studio anahtarlarında dakikalık 15 istek sınırını aşmamak için akıllı hız kontrolü uygulanır.'}
                </p>
              </div>
            </div>
          )}

          {activeUnifiedProvider === 'openrouter' && (
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

          {activeUnifiedProvider !== 'google' && activeUnifiedProvider !== 'openrouter' && (() => {
            const currentPreset = OPENAI_PRESETS.find((p) => p.id === activeUnifiedProvider) || OPENAI_PRESETS[0];
            const hasPresetModels = currentPreset.models.length > 0;
            const isKnownModel = currentPreset.models.some((m) => m.id === options.customOpenAiModel);
            const showCustomInput = !hasPresetModels || !isKnownModel || isCustomModelManual;

            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-xs">
                      <Key className="w-4 h-4 text-purple-500" />
                      <span>{currentPreset.name} API Anahtarı</span>
                    </label>
                    {currentPreset.keyUrl && (
                      <a
                        href={currentPreset.keyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {currentPreset.name}&apos;dan Anahtar Al <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
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
                      placeholder={currentPreset.keyPlaceholder || 'sk-...'}
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
                    {currentPreset.id === 'ollama'
                      ? 'Lokal Ollama sunucusu için API anahtarı boş bırakılabilir.'
                      : 'API anahtarınız yalnızca tarayıcınızın yerel hafızasında saklanır.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-xs">
                      <Cpu className="w-4 h-4 text-purple-500" />
                      <span>Model Seçimi</span>
                    </label>
                    {hasPresetModels && !showCustomInput && (
                      <button
                        type="button"
                        onClick={() => setIsCustomModelManual(true)}
                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                      >
                        Özel Model Yaz
                      </button>
                    )}
                  </div>

                  {hasPresetModels && (
                    <select
                      value={isKnownModel && !isCustomModelManual ? options.customOpenAiModel : 'custom_manual'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom_manual') {
                          setIsCustomModelManual(true);
                        } else {
                          setIsCustomModelManual(false);
                          onOptionsChange({
                            ...options,
                            customOpenAiModel: val,
                            model: val,
                          });
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('epub_ocr_openai_model', val);
                            localStorage.setItem('epub_ocr_model', val);
                          }
                        }
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                    >
                      {currentPreset.models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                      <option value="custom_manual">➕ Farklı / Özel Model Adı Gir...</option>
                    </select>
                  )}

                  {showCustomInput && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={options.customOpenAiModel || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          onOptionsChange({
                            ...options,
                            customOpenAiModel: val,
                            model: val,
                          });
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('epub_ocr_openai_model', val);
                            localStorage.setItem('epub_ocr_model', val);
                          }
                        }}
                        placeholder="Model adını girin (Örn: llama-3.3-70b-versatile, deepseek-chat, gpt-4o)"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                      />
                      {hasPresetModels && isCustomModelManual && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomModelManual(false);
                            const fallback = currentPreset.defaultModel || currentPreset.models[0]?.id || '';
                            onOptionsChange({
                              ...options,
                              customOpenAiModel: fallback,
                              model: fallback,
                            });
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('epub_ocr_openai_model', fallback);
                              localStorage.setItem('epub_ocr_model', fallback);
                            }
                          }}
                          className="text-[11px] text-zinc-500 hover:text-purple-600 dark:hover:text-purple-400 underline cursor-pointer"
                        >
                          Hazır model listesine dön ({currentPreset.name})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {currentPreset.id === 'groq' && (
                  <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <label className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                      <span>Hesap / Kota Türü (Groq)</span>
                      <span className="text-[11px] font-normal text-zinc-400">
                        {options.groqTier === 'paid' ? 'Turbo Hız (Sınırsız RPM)' : '30 RPM Akıllı Hız Koruması'}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => {
                          onOptionsChange({ ...options, groqTier: 'free' });
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('ekitap_groq_tier', 'free');
                          }
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          options.groqTier !== 'paid'
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <span>Ücretsiz Katman (Free - 30 RPM)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onOptionsChange({ ...options, groqTier: 'paid' });
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('ekitap_groq_tier', 'paid');
                          }
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          options.groqTier === 'paid'
                            ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <span>Ücretli Katman (Paid / Turbo)</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      {options.groqTier === 'paid'
                        ? 'Kredi kartı tanımlı Groq hesapları için paketler bekleme olmadan paralel hızla işlenir.'
                        : 'Ücretsiz Groq anahtarlarında dakikalık 30 istek sınırını aşmamak için akıllı hız kontrolü uygulanır.'}
                    </p>
                  </div>
                )}

                <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-xs">
                    <Server className="w-4 h-4 text-purple-500" />
                    <span>API Base URL (Endpoint)</span>
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
                    placeholder="https://api.groq.com/openai/v1"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500">
                    İstekler <code>{`${(options.customOpenAiBaseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '')}/chat/completions`}</code> adresine gönderilir.
                  </p>
                </div>
              </div>
            );
          })()}

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

              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                        Paket Boyutu &amp; Token Verimi (Batch Size)
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        Tek istekte işlenen karakter miktarı. Yüksek değerler çeviriyi hızlandırır ve günlük istek limitinizi (RPD) korur.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                      {(options.chunkSize || 15000).toLocaleString('tr-TR')} chr
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      ~{Math.round((options.chunkSize || 15000) / 6).toLocaleString('tr-TR')} kelime
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOptionsChange({ ...options, chunkSize: 5000 })}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border text-center transition-all cursor-pointer ${
                      options.chunkSize === 5000
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-bold">5.000 chr</div>
                    <div className="text-[10px] text-zinc-400">Düşük Donanım</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOptionsChange({ ...options, chunkSize: 15000 })}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border text-center transition-all cursor-pointer ${
                      (options.chunkSize || 15000) === 15000
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-center gap-1">
                      <span>15.000 chr</span>
                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1 rounded-sm">Önerilen</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">Yüksek Verim</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOptionsChange({ ...options, chunkSize: 25000 })}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border text-center transition-all cursor-pointer ${
                      options.chunkSize === 25000
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-bold">25.000 chr</div>
                    <div className="text-[10px] text-zinc-400">Maksimum Hız</div>
                  </button>
                </div>

                <div className="pt-2 space-y-1">
                  <input
                    type="range"
                    min="2000"
                    max="35000"
                    step="1000"
                    value={options.chunkSize || 15000}
                    onChange={(e) =>
                      onOptionsChange({ ...options, chunkSize: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>2.000 chr (Küçük)</span>
                    <span>15.000 chr (Standart)</span>
                    <span>35.000 chr (Turbo)</span>
                  </div>
                </div>
              </div>

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
                <p className="text-[11px] text-zinc-500">
                  Paralel gönderilecek istek sayısı. Çeviride bağlam tutarlılığı için 1 önerilir.
                </p>
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
