'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import { Header } from '@/components/Header';
import { UploadSection } from '@/components/UploadSection';
import { SettingsModal } from '@/components/SettingsModal';
import { SendToDeviceModal } from '@/components/SendToDeviceModal';
import { DebugConsole } from '@/components/DebugConsole';
import { StatsBar } from '@/components/StatsBar';
import { ChapterList } from '@/components/ChapterList';
import { DiffViewer } from '@/components/DiffViewer';
import { GoogleAiStudioNoticeModal } from '@/components/GoogleAiStudioNoticeModal';
import { PdfCropModal } from '@/components/PdfCropModal';
import { GlobalStatsCards } from '@/components/GlobalStatsCards';
import {
  EpubMetadata,
  EpubChapter,
  ProcessingOptions,
  ProcessingStats,
  TextBlock,
  DebugLogEntry,
  LlmProvider,
  AntigravityAuthData,
  TaskType,
  TranslationStyle,
  PdfCropBounds,
} from '@/lib/types';
import { parseEpub, packageEpub } from '@/lib/epub-engine';
import { parsePdf } from '@/lib/pdf-engine';
import { parseMobi, packageMobi } from '@/lib/mobi-engine';
import { processEpubChapters } from '@/lib/processor';
import {
  POPULAR_FREE_MODELS,
  SUPPORTED_SOURCE_LANGUAGES,
  SUPPORTED_TARGET_LANGUAGES,
  TRANSLATION_STYLES,
} from '@/lib/openrouter';
import {
  AlertTriangle,
  Zap,
  Sparkles,
  Cpu,
  Languages,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';

const DEFAULT_OPTIONS: ProcessingOptions = {
  taskType: 'ocr_fix',
  sourceLanguage: 'auto',
  targetLanguage: 'tr',
  translationStyle: 'literary',
  enableRollingContext: true,
  provider: 'antigravity',
  apiKey: '',
  geminiApiKey: '',
  model: 'gemini-3.7-flash',
  concurrency: 1,
  chunkSize: 3000,
  useRegexPreClean: true,
  useLlm: false,
  scanMode: 'rules_only',
  temperature: 0.1,
  isDevMode: false,
};

const INITIAL_STATS: ProcessingStats = {
  totalChapters: 0,
  completedChapters: 0,
  totalBlocks: 0,
  processedBlocks: 0,
  totalFixedWords: 0,
  elapsedSeconds: 0,
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [zip, setZip] = useState<JSZip | null>(null);
  const [metadata, setMetadata] = useState<EpubMetadata | null>(null);
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS);
  const [stats, setStats] = useState<ProcessingStats>(INITIAL_STATS);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPacking, setIsPacking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<LlmProvider | undefined>(undefined);
  const [isAiNoticeOpen, setIsAiNoticeOpen] = useState(false);
  const [isSendToDeviceOpen, setIsSendToDeviceOpen] = useState(false);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [isPdfCropModalOpen, setIsPdfCropModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const applyTheme = (targetTheme: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = targetTheme === 'dark' || (targetTheme === 'system' && prefersDark);
    setIsDarkTheme(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setCurrentTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ekitap_theme', newTheme);
    }
    applyTheme(newTheme);
  };

  const handleToggleTheme = () => {
    const nextTheme = isDarkTheme ? 'light' : 'dark';
    handleThemeChange(nextTheme);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('ekitap_theme') as 'light' | 'dark' | 'system') || 'system';
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);

      const storedKey = localStorage.getItem('epub_ocr_api_key') || '';
      const storedGeminiKey = localStorage.getItem('epub_ocr_gemini_api_key') || '';
      const storedGeminiTier = (localStorage.getItem('ekitap_gemini_tier') as 'free' | 'paid') || 'free';
      const storedGroqTier = (localStorage.getItem('ekitap_groq_tier') as 'free' | 'paid') || 'free';
      const storedOpenAiKey = localStorage.getItem('epub_ocr_openai_key') || '';
      const storedOpenAiBaseUrl = localStorage.getItem('epub_ocr_openai_base_url') || 'https://api.openai.com/v1';
      const storedOpenAiModel = localStorage.getItem('epub_ocr_openai_model') || 'gpt-4o-mini';
      const rawStoredProvider = localStorage.getItem('epub_ocr_provider');
      const storedProvider: LlmProvider =
        rawStoredProvider === 'gemini_api' || rawStoredProvider === 'openrouter' || rawStoredProvider === 'custom_openai'
          ? rawStoredProvider
          : 'gemini_api';
      const storedModel = localStorage.getItem('epub_ocr_model') || (
        storedProvider === 'gemini_api'
          ? 'gemini-3.7-flash'
          : storedProvider === 'custom_openai'
          ? storedOpenAiModel
          : 'meta-llama/llama-3.3-70b-instruct:free'
      );
      const storedDevMode = localStorage.getItem('epub_ocr_dev_mode') === 'true';
      const storedTaskType = (localStorage.getItem('ekitap_task_type') as TaskType) || 'ocr_fix';
      const storedSourceLang = localStorage.getItem('ekitap_source_lang') || 'auto';
      const storedTargetLang = localStorage.getItem('ekitap_target_lang') || 'tr';
      const storedTransStyle = (localStorage.getItem('ekitap_trans_style') as TranslationStyle) || 'literary';
      const storedRollingCtx = localStorage.getItem('ekitap_rolling_ctx') !== 'false';
      const storedGlossaryStr = localStorage.getItem('ekitap_glossary');
      let storedGlossary: Record<string, string> | undefined = undefined;
      if (storedGlossaryStr) {
        try {
          storedGlossary = JSON.parse(storedGlossaryStr);
        } catch {}
      }

      const storedAuth = localStorage.getItem('epub_ocr_antigravity_auth');
      let antigravityAuth: AntigravityAuthData | undefined = undefined;
      if (storedAuth) {
        try {
          antigravityAuth = JSON.parse(storedAuth);
        } catch {}
      }

      const hasConfiguredAi = Boolean(
        antigravityAuth?.accessToken ||
        storedGeminiKey.trim() ||
        storedKey.trim() ||
        storedOpenAiKey.trim() ||
        (storedOpenAiBaseUrl && (storedOpenAiBaseUrl.includes('localhost') || storedOpenAiBaseUrl.includes('127.0.0.1')))
      );

      const storedScanMode = localStorage.getItem('epub_ocr_scan_mode') as
        | 'smart'
        | 'rules_only'
        | 'deep_llm'
        | null;

      const effectiveScanMode: 'smart' | 'rules_only' | 'deep_llm' =
        storedScanMode || (hasConfiguredAi ? 'smart' : 'rules_only');
      const effectiveUseLlm = effectiveScanMode !== 'rules_only';

      setOptions((prev) => ({
        ...prev,
        taskType: storedTaskType,
        sourceLanguage: storedSourceLang,
        targetLanguage: storedTargetLang,
        translationStyle: storedTransStyle,
        enableRollingContext: storedRollingCtx,
        glossary: storedGlossary,
        provider: storedProvider,
        apiKey: storedKey,
        geminiApiKey: storedGeminiKey,
        geminiTier: storedGeminiTier,
        groqTier: storedGroqTier,
        customOpenAiKey: storedOpenAiKey,
        customOpenAiBaseUrl: storedOpenAiBaseUrl,
        customOpenAiModel: storedOpenAiModel,
        antigravityAuth,
        model: storedModel,
        scanMode: effectiveScanMode,
        useLlm: effectiveUseLlm,
        isDevMode: storedDevMode,
      }));

      const hideNotice = localStorage.getItem('ekitap_hide_notice_v0.4.2') === 'true';
      if (!hideNotice) {
        const timer = setTimeout(() => {
          setIsAiNoticeOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isProcessing) {
      interval = setInterval(() => {
        setStats((prev) => {
          const now = Date.now();
          const elapsed = prev.startTime
            ? Math.max(1, Math.round((now - prev.startTime) / 1000))
            : prev.elapsedSeconds + 1;
          return {
            ...prev,
            elapsedSeconds: elapsed,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const handleOptionsChange = (newOptions: ProcessingOptions) => {
    setOptions(newOptions);
    if (typeof window !== 'undefined') {
      if (newOptions.taskType) localStorage.setItem('ekitap_task_type', newOptions.taskType);
      if (newOptions.sourceLanguage) localStorage.setItem('ekitap_source_lang', newOptions.sourceLanguage);
      if (newOptions.targetLanguage) localStorage.setItem('ekitap_target_lang', newOptions.targetLanguage);
      if (newOptions.translationStyle) localStorage.setItem('ekitap_trans_style', newOptions.translationStyle);
      if (newOptions.scanMode) localStorage.setItem('epub_ocr_scan_mode', newOptions.scanMode);
      if (newOptions.enableRollingContext !== undefined) {
        localStorage.setItem('ekitap_rolling_ctx', String(newOptions.enableRollingContext));
      }
      if (newOptions.glossary) {
        localStorage.setItem('ekitap_glossary', JSON.stringify(newOptions.glossary));
      }
      if (newOptions.provider) localStorage.setItem('epub_ocr_provider', newOptions.provider);
      localStorage.setItem('epub_ocr_api_key', newOptions.apiKey);
      if (newOptions.geminiApiKey !== undefined) localStorage.setItem('epub_ocr_gemini_api_key', newOptions.geminiApiKey);
      if (newOptions.customOpenAiKey !== undefined) localStorage.setItem('epub_ocr_openai_key', newOptions.customOpenAiKey);
      if (newOptions.customOpenAiBaseUrl !== undefined) localStorage.setItem('epub_ocr_openai_base_url', newOptions.customOpenAiBaseUrl);
      if (newOptions.customOpenAiModel !== undefined) localStorage.setItem('epub_ocr_openai_model', newOptions.customOpenAiModel);
      if (newOptions.antigravityAuth) {
        localStorage.setItem('epub_ocr_antigravity_auth', JSON.stringify(newOptions.antigravityAuth));
      } else {
        localStorage.removeItem('epub_ocr_antigravity_auth');
      }
      localStorage.setItem('epub_ocr_model', newOptions.model);
      localStorage.setItem('epub_ocr_dev_mode', String(Boolean(newOptions.isDevMode)));
    }
  };

  const handleFileLoaded = async (uploadedFile: File) => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    setLoadingMessage('Dosya okunuyor...');

    try {
      const isPdf =
        uploadedFile.name.toLowerCase().endsWith('.pdf') ||
        uploadedFile.type === 'application/pdf';
      const isMobi =
        uploadedFile.name.toLowerCase().endsWith('.mobi') ||
        uploadedFile.type === 'application/x-mobipocket-ebook';

      if (isPdf) {
        setPendingPdfFile(uploadedFile);
        setIsPdfCropModalOpen(true);
        setIsLoadingFile(false);
        setLoadingMessage('');
        return;
      }

      let loadedZip: JSZip;
      let loadedMeta: EpubMetadata;
      let loadedChapters: EpubChapter[];

      if (isMobi) {
        setLoadingMessage('MOBI dosyası okunuyor ve ayrıştırılıyor...');
        const result = await parseMobi(uploadedFile);
        loadedZip = result.zip;
        loadedMeta = result.metadata;
        loadedChapters = result.chapters;
      } else {
        setLoadingMessage('EPUB arşivi açılıyor ve bölümler ayrıştırılıyor...');
        const result = await parseEpub(uploadedFile);
        loadedZip = result.zip;
        loadedMeta = result.metadata;
        loadedChapters = result.chapters;
      }

      setFile(uploadedFile);
      setZip(loadedZip);
      setMetadata(loadedMeta);
      setChapters(loadedChapters);

      const totalBlocks = loadedChapters.reduce((acc, c) => acc + c.blocks.length, 0);
      setStats({
        totalChapters: loadedChapters.length,
        completedChapters: 0,
        totalBlocks,
        processedBlocks: 0,
        totalFixedWords: 0,
        elapsedSeconds: 0,
      });

      if (loadedChapters.length > 0) {
        setSelectedChapterId(loadedChapters[0].id);
      }
    } catch (err: unknown) {
      console.error('Dosya yükleme hatası:', err);
      const msg = err instanceof Error ? err.message : 'Dosya ayrıştırılamadı.';
      setErrorMessage(msg);
    } finally {
      setIsLoadingFile(false);
      setLoadingMessage('');
    }
  };

  const handlePdfCropConfirm = async (
    cropBounds: PdfCropBounds,
    preserveAllLines: boolean,
    extractImages: boolean
  ) => {
    if (!pendingPdfFile) return;
    const uploadedFile = pendingPdfFile;
    setIsPdfCropModalOpen(false);
    setIsLoadingFile(true);
    setErrorMessage(null);
    setLoadingMessage('PDF sayfaları seçilen marj sınırlarına göre ayrıştırılıyor...');

    try {
      const result = await parsePdf(uploadedFile, {
        cropBounds,
        preserveAllLines,
        extractImages,
        onProgress: (p) => {
          if (p.message) setLoadingMessage(p.message);
        },
      });

      setFile(uploadedFile);
      setZip(result.zip);
      setMetadata(result.metadata);
      setChapters(result.chapters);

      const totalBlocks = result.chapters.reduce((acc, c) => acc + c.blocks.length, 0);
      setStats({
        totalChapters: result.chapters.length,
        completedChapters: 0,
        totalBlocks,
        processedBlocks: 0,
        totalFixedWords: 0,
        elapsedSeconds: 0,
      });

      if (result.chapters.length > 0) {
        setSelectedChapterId(result.chapters[0].id);
      }

      fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      })
        .then(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ekitap_stats_updated'));
          }
        })
        .catch(() => {});
    } catch (err: unknown) {
      console.error('PDF ayrıştırma hatası:', err);
      const msg = err instanceof Error ? err.message : 'PDF dosyası ayrıştırılamadı.';
      setErrorMessage(msg);
    } finally {
      setIsLoadingFile(false);
      setLoadingMessage('');
      setPendingPdfFile(null);
    }
  };

  const handlePdfCropClose = () => {
    setIsPdfCropModalOpen(false);
    setPendingPdfFile(null);
    setIsLoadingFile(false);
  };

  const handleLoadDemo = async () => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/ornek-bozuk-turkce.epub');
      if (!response.ok) {
        throw new Error('Örnek EPUB dosyası sunucudan yüklenemedi.');
      }
      const arrayBuffer = await response.arrayBuffer();
      const demoFile = new File([arrayBuffer], 'ornek-bozuk-turkce.epub', {
        type: 'application/epub+zip',
      });
      await handleFileLoaded(demoFile);
    } catch (err: unknown) {
      console.error('Demo EPUB yükleme hatası:', err);
      const msg = err instanceof Error ? err.message : 'Örnek EPUB yüklenirken hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleLoadPdfDemo = async () => {
    setIsLoadingFile(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/ornek-bozuk-turkce.pdf');
      if (!response.ok) {
        throw new Error('Örnek PDF dosyası sunucudan yüklenemedi.');
      }
      const arrayBuffer = await response.arrayBuffer();
      const demoFile = new File([arrayBuffer], 'ornek-bozuk-turkce.pdf', {
        type: 'application/pdf',
      });
      await handleFileLoaded(demoFile);
    } catch (err: unknown) {
      console.error('Demo PDF yükleme hatası:', err);
      const msg = err instanceof Error ? err.message : 'Örnek PDF yüklenirken hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleResetFile = () => {
    if (isProcessing) {
      abortControllerRef.current?.abort();
    }
    setFile(null);
    setZip(null);
    setMetadata(null);
    setChapters([]);
    setSelectedChapterId(null);
    setStats(INITIAL_STATS);
    setDebugLogs([]);
    setIsProcessing(false);
    setErrorMessage(null);
  };

  const handleToggleChapterSelect = (chapterId: string, isSelected: boolean) => {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, isSelected } : c))
    );
  };

  const handleToggleAll = (selectAll: boolean) => {
    setChapters((prev) => prev.map((c) => ({ ...c, isSelected: selectAll })));
  };

  const handleStartProcessing = async () => {
    // If user has a Gemini API key configured, ensure provider is gemini_api if it was stuck on antigravity
    let effectiveOptions = { ...options };
    if (effectiveOptions.provider === 'antigravity' || !effectiveOptions.provider) {
      if (effectiveOptions.geminiApiKey?.trim()) {
        effectiveOptions.provider = 'gemini_api';
        effectiveOptions.model = effectiveOptions.model || 'gemini-3.7-flash';
        setOptions(effectiveOptions);
      } else if (effectiveOptions.apiKey?.trim()) {
        effectiveOptions.provider = 'openrouter';
        setOptions(effectiveOptions);
      } else if (effectiveOptions.customOpenAiKey?.trim()) {
        effectiveOptions.provider = 'custom_openai';
        setOptions(effectiveOptions);
      }
    }

    const isConfigured =
      (effectiveOptions.provider === 'gemini_api' && Boolean(effectiveOptions.geminiApiKey?.trim())) ||
      (effectiveOptions.provider === 'custom_openai' && Boolean(effectiveOptions.customOpenAiKey?.trim() || effectiveOptions.customOpenAiBaseUrl?.includes('localhost') || effectiveOptions.customOpenAiBaseUrl?.includes('127.0.0.1'))) ||
      (effectiveOptions.provider === 'openrouter' && Boolean(effectiveOptions.apiKey?.trim())) ||
      (effectiveOptions.provider === 'antigravity' && Boolean(effectiveOptions.antigravityAuth?.accessToken));

    const requiresAi =
      effectiveOptions.taskType === 'translate' ||
      effectiveOptions.scanMode === 'smart' ||
      effectiveOptions.scanMode === 'deep_llm' ||
      effectiveOptions.useLlm;

    if (requiresAi && !isConfigured) {
      setErrorMessage(
        'Yapay Zekâ (AI) işlemi için lütfen Ayarlar panelinden ücretsiz bir Google AI Studio veya OpenRouter API anahtarı tanımlayın. API anahtarı olmadan devam etmek için "Yıldırım Hızı (Regex)" modunu seçebilirsiniz.'
      );
      setSettingsInitialTab('gemini_api');
      setIsSettingsOpen(true);
      return;
    }

    const selectedChapters = chapters.filter((c) => c.isSelected);
    if (selectedChapters.length === 0) {
      alert('Lütfen en az bir bölüm seçin.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const finalStats = await processEpubChapters(
        chapters,
        options,
        {
          onBlockUpdated: (chapterId: string, updatedBlock: TextBlock) => {
            setChapters((prevChapters) =>
              prevChapters.map((ch) => {
                if (ch.id !== chapterId) return ch;
                const newBlocks = ch.blocks.map((b) =>
                  b.id === updatedBlock.id ? { ...updatedBlock } : b
                );
                return {
                  ...ch,
                  blocks: newBlocks,
                  stats: {
                    ...ch.stats,
                    fixedWords: ch.stats.fixedWords + (updatedBlock.diffCount || 0),
                  },
                };
              })
            );
          },
          onChapterUpdated: (updatedChapter: EpubChapter) => {
            setChapters((prevChapters) =>
              prevChapters.map((ch) =>
                ch.id === updatedChapter.id ? { ...updatedChapter } : ch
              )
            );
          },
          onStatsUpdated: (newStats: ProcessingStats) => {
            setStats(newStats);
          },
          onDebugLog: (entry: DebugLogEntry) => {
            setDebugLogs((prev) => [entry, ...prev]);
          },
          onError: (chapterId: string, error: string) => {
            console.error(`Bölüm hatası (${chapterId}):`, error);
            setErrorMessage(error);
          },
        },
        controller.signal,
        metadata?.title
      );

      const fixedCount =
        finalStats?.totalFixedWords ??
        chapters.reduce(
          (sum, ch) => sum + ch.blocks.reduce((bSum, b) => bSum + (b.diffCount || 0), 0),
          0
        );

      const isTrans = options.taskType === 'translate';
      let localTotals = { totalConverted: 0, totalTranslated: 0, totalWordsFixed: 0 };
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('ekitap_global_stats_persistent');
          const cur = raw ? JSON.parse(raw) : { totalConverted: 0, totalTranslated: 0, totalWordsFixed: 0 };
          localTotals = {
            totalConverted: (Number(cur.totalConverted) || 0) + (isTrans ? 0 : 1),
            totalTranslated: (Number(cur.totalTranslated) || 0) + (isTrans ? 1 : 0),
            totalWordsFixed: (Number(cur.totalWordsFixed) || 0) + fixedCount,
          };
          localStorage.setItem('ekitap_global_stats_persistent', JSON.stringify(localTotals));
        } catch {}
      }

      fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isTrans ? 'translate' : 'convert',
          fixedWords: fixedCount,
          totalConverted: localTotals.totalConverted,
          totalTranslated: localTotals.totalTranslated,
          totalWordsFixed: localTotals.totalWordsFixed,
        }),
      })
        .then(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ekitap_stats_updated'));
          }
        })
        .catch(() => {});
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Kullanıcı durdurdu.');
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
    }
  };

  const handleResetProgress = () => {
    if (isProcessing) return;
    setDebugLogs([]);
    setChapters((prev) =>
      prev.map((ch) => ({
        ...ch,
        status: 'idle',
        errorMessage: undefined,
        stats: {
          totalBlocks: ch.blocks.length,
          processedBlocks: 0,
          fixedWords: 0,
        },
        blocks: ch.blocks.map((b) => ({
          ...b,
          status: 'pending',
          correctedHtml: b.originalHtml,
          correctedText: b.originalText,
          diffCount: 0,
        })),
      }))
    );

    const totalBlocks = chapters.reduce((acc, c) => acc + c.blocks.length, 0);
    setStats({
      totalChapters: chapters.length,
      completedChapters: 0,
      totalBlocks,
      processedBlocks: 0,
      totalFixedWords: 0,
      elapsedSeconds: 0,
    });
  };

  const handleGetEpubBlob = async (): Promise<Blob | null> => {
    if (!zip || chapters.length === 0) return null;
    return await packageEpub(zip, chapters);
  };

  const handleDownload = async () => {
    if (!zip || chapters.length === 0) return;
    setIsPacking(true);
    try {
      const blob = await packageEpub(zip, chapters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = file?.name?.replace(/\.(epub|pdf|mobi)$/i, '') || 'kitap';
      const suffix =
        options.taskType === 'translate'
          ? `_${options.targetLanguage || 'tr'}_cevrilmis`
          : '_duzeltilmis';
      a.download = `${baseName}${suffix}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('EPUB paketleme hatası:', err);
      alert('Düzeltilmiş EPUB dosyası paketlenirken hata oluştu.');
    } finally {
      setIsPacking(false);
    }
  };

  const handleDownloadMobi = async () => {
    if (chapters.length === 0) return;
    setIsPacking(true);
    try {
      const exportMeta = metadata ? { ...metadata } : undefined;
      if (exportMeta && options.taskType === 'translate' && options.targetLanguage) {
        exportMeta.language = options.targetLanguage;
      }
      const blob = await packageMobi(chapters, exportMeta);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = file?.name?.replace(/\.(epub|pdf|mobi)$/i, '') || 'kitap';
      const suffix =
        options.taskType === 'translate'
          ? `_${options.targetLanguage || 'tr'}_cevrilmis`
          : '_duzeltilmis';
      a.download = `${baseName}${suffix}.mobi`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('MOBI paketleme hatası:', err);
      alert('Düzeltilmiş MOBI dosyası paketlenirken hata oluştu.');
    } finally {
      setIsPacking(false);
    }
  };

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || null;
  const activeModel =
    POPULAR_FREE_MODELS.find((m) => m.id === options.model)?.name || options.model;
  const selectedCount = chapters.filter((c) => c.isSelected).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        options={options}
        apiKeyConfigured={Boolean(options.apiKey.trim())}
        modelName={activeModel}
        isDebugOpen={isDebugOpen}
        onToggleDebugOpen={() => setIsDebugOpen(!isDebugOpen)}
        logCount={debugLogs.length}
        isDebugMode={Boolean(options.debugMode)}
        isDevMode={Boolean(options.isDevMode)}
        isDarkTheme={isDarkTheme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-4 rounded-2xl flex items-start gap-3 text-xs shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">İşlem Sırasında Hata Oluştu:</span>
              <p>{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 font-bold ml-2 cursor-pointer"
            >
              Kapat
            </button>
          </div>
        )}

        <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              v0.4.1
            </span>
            <span>
              <strong>Yenilik:</strong> Canlı global istatistik sayacı, interaktif PDF alan seçimi ve kitap içi görsel/illüstrasyon ayıklama motoru eklendi.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAiNoticeOpen(true)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Detayları Gör</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <UploadSection
          onFileLoaded={handleFileLoaded}
          onLoadDemo={handleLoadDemo}
          onLoadPdfDemo={handleLoadPdfDemo}
          metadata={metadata}
          chapterCount={chapters.length}
          totalBlocks={stats.totalBlocks}
          isLoading={isLoadingFile}
          loadingMessage={loadingMessage}
          fileName={file?.name}
          fileSize={file?.size}
          onReset={handleResetFile}
        />

        {/* Task Type Switcher & Processing Mode */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <label className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                İşlem ve Çalışma Modu
              </label>
              <span className="text-[11px] text-zinc-500">
                Yapmak istediğiniz işlemi (OCR Onarım veya Akıllı Çeviri) seçin
              </span>
            </div>

            {/* Task Type Pill Tabs */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() =>
                  handleOptionsChange({
                    ...options,
                    taskType: 'ocr_fix',
                    useRegexPreClean: true,
                    useLlm: true,
                    scanMode: 'smart',
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  (options.taskType || 'ocr_fix') === 'ocr_fix'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Türkçe OCR Onarımı</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleOptionsChange({
                    ...options,
                    taskType: 'translate',
                    useLlm: true,
                    useRegexPreClean: false,
                    scanMode: 'deep_llm',
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  options.taskType === 'translate'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Languages className="w-3.5 h-3.5 text-blue-500" />
                <span>Akıllı Kitap Çevirisi (AI)</span>
              </button>
            </div>
          </div>

          {/* Translation Options Sub-bar */}
          {options.taskType === 'translate' && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">Diller:</span>
                  <select
                    value={options.sourceLanguage || 'auto'}
                    onChange={(e) =>
                      handleOptionsChange({ ...options, sourceLanguage: e.target.value })
                    }
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                  >
                    {SUPPORTED_SOURCE_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>

                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />

                  <select
                    value={options.targetLanguage || 'tr'}
                    onChange={(e) =>
                      handleOptionsChange({ ...options, targetLanguage: e.target.value })
                    }
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                  >
                    {SUPPORTED_TARGET_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>

                  <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">&bull;</span>

                  <span className="font-bold text-zinc-700 dark:text-zinc-300">Üslup:</span>
                  <select
                    value={options.translationStyle || 'literary'}
                    onChange={(e) =>
                      handleOptionsChange({
                        ...options,
                        translationStyle: e.target.value as TranslationStyle,
                      })
                    }
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                  >
                    {TRANSLATION_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-100/80 dark:bg-blue-900/40 px-2.5 py-1 rounded-xl shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Kayan Bağlam Hafızası Aktif</span>
                </div>
              </div>

              <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                  <p>
                    <strong className="font-semibold text-amber-950 dark:text-amber-100">Yapay Zekâ Çeviri Bilgilendirmesi:</strong> Bu özellik, büyük dil modelleri ve kayan bağlam belleği kullanarak yabancı dildeki eserleri hedef dile edebi akıcılıkla çevirir.
                  </p>
                  <p className="text-amber-700 dark:text-amber-400">
                    Yapay zekâ çevirisi; karakter ses tonu, diyalog ritmi, deyim yerelleştirmesi ve bağlam tutarlılığını en üst düzeyde korumayı hedefler ancak profesyonel bir insan edebiyat çevirmeninin veya yazarın özgün üslubunu %100 kusursuz koruma garantisi vermez. Kişisel okuma ve ön taslak hazırlığı için tavsiye edilir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mode Selection Cards */}
          {options.taskType === 'translate' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  handleOptionsChange({
                    ...options,
                    enableRollingContext: true,
                    scanMode: 'deep_llm',
                    useLlm: true,
                  })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  options.enableRollingContext !== false
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-950 dark:text-blue-200 shadow-xs ring-1 ring-blue-500/30'
                    : 'bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Bağlam Korumalı Edebi Çeviri
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                    Önerilen
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Önceki paragrafların tonunu, anlatıcı dilini ve karakter zamirlerini koruyarak akıcı çeviri yapar.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleOptionsChange({
                    ...options,
                    enableRollingContext: false,
                    scanMode: 'deep_llm',
                    useLlm: true,
                  })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  options.enableRollingContext === false
                    ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 text-purple-950 dark:text-purple-200 shadow-xs ring-1 ring-purple-500/30'
                    : 'bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-500" />
                    Bağımsız Blok Çevirisi
                  </span>
                  <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-1.5 py-0.5 rounded">
                    Standart
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Paragrafları bağımsız bloklar halinde çevirir. Teknik ve kısa metinler için uygundur.
                </p>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  handleOptionsChange({
                    ...options,
                    scanMode: 'smart',
                    useLlm: true,
                    useRegexPreClean: true,
                  })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  (options.scanMode || 'smart') === 'smart'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Akıllı Hibrit
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                    Önerilen
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Kural temizliği + şüpheli kelimelere yapay zeka desteği. Hızlı ve dengeli.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleOptionsChange({
                    ...options,
                    scanMode: 'rules_only',
                    useLlm: false,
                    useRegexPreClean: true,
                  })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  options.scanMode === 'rules_only'
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200 shadow-xs ring-1 ring-amber-500/30'
                    : 'bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Yıldırım Hızı (Regex)
                  </span>
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                    0 Saniye
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Yalnızca morfolojik kural motoru. API anahtarı gerektirmez, anında biter.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleOptionsChange({
                    ...options,
                    scanMode: 'deep_llm',
                    useLlm: true,
                    useRegexPreClean: true,
                  })
                }
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  options.scanMode === 'deep_llm'
                    ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 text-purple-950 dark:text-purple-200 shadow-xs ring-1 ring-purple-500/30'
                    : 'bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-500" />
                    Tam Derin Tarama
                  </span>
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
                    Tüm Metin
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Her paragraf istisnasız seçili yapay zeka ile taranır ve düzeltilir.
                </p>
              </button>
            </div>
          )}
        </div>

        {metadata && (
          <>
            <StatsBar
              stats={stats}
              isProcessing={isProcessing}
              isCompleted={
                stats.totalBlocks > 0 && stats.processedBlocks === stats.totalBlocks
              }
              isPacking={isPacking}
              onStart={handleStartProcessing}
              onStop={handleStopProcessing}
              onDownload={handleDownload}
              onDownloadMobi={handleDownloadMobi}
              onSendToDevice={() => setIsSendToDeviceOpen(true)}
              onResetProgress={handleResetProgress}
              selectedCount={selectedCount}
              taskType={options.taskType}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 h-[640px]">
                <ChapterList
                  chapters={chapters}
                  selectedChapterId={selectedChapterId}
                  onSelectChapter={(id) => setSelectedChapterId(id)}
                  onToggleChapterSelect={handleToggleChapterSelect}
                  onToggleAll={handleToggleAll}
                />
              </div>

              <div className="lg:col-span-8 h-[640px]">
                <DiffViewer
                  chapter={selectedChapter}
                  taskType={options.taskType}
                  sourceLang={options.sourceLanguage}
                  targetLang={options.targetLanguage}
                />
              </div>
            </div>
          </>
        )}

        {!metadata && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  PDF &amp; EPUB Karakter Birleşme Onarımı
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  PDF ve OCR kaynaklı harf birleşme ve bölünme hatalarını Türkçe dilbilgisi kuralları ve bağlamsal yapay zeka ile onarır.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Orijinal Format ve Başlık Koruma
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Kitap içindeki HTML etiketlerini, dipnotları, bölüm başlıklarını ve içindekiler tablosunu bozmadan korur ve iki yana yaslar.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Hızlı ve Yerel İşleme
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Tüm dönüştürme ve paketleme işlemleri doğrudan tarayıcınızda gerçekleşir. Kalıcı IndexedDB önbelleği ile token tasarrufu sağlar.
                </p>
              </div>
            </div>

            <GlobalStatsCards />
          </div>
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setSettingsInitialTab(undefined);
        }}
        options={options}
        onOptionsChange={handleOptionsChange}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        initialTab={settingsInitialTab}
      />

      <GoogleAiStudioNoticeModal
        isOpen={isAiNoticeOpen}
        onClose={() => setIsAiNoticeOpen(false)}
        onOpenGeminiSettings={() => {
          setIsAiNoticeOpen(false);
          setSettingsInitialTab('gemini_api');
          setIsSettingsOpen(true);
        }}
      />

      <SendToDeviceModal
        isOpen={isSendToDeviceOpen}
        onClose={() => setIsSendToDeviceOpen(false)}
        getEpubBlob={handleGetEpubBlob}
        fileName={file?.name || 'kitap.epub'}
      />

      <PdfCropModal
        isOpen={isPdfCropModalOpen}
        file={pendingPdfFile}
        onClose={handlePdfCropClose}
        onConfirm={handlePdfCropConfirm}
      />

      {options.isDevMode && (
        <DebugConsole
          isOpen={isDebugOpen}
          onClose={() => setIsDebugOpen(false)}
          logs={debugLogs}
          onClearLogs={() => setDebugLogs([])}
          isDebugMode={Boolean(options.debugMode)}
          onToggleDebugMode={(enabled) =>
            handleOptionsChange({ ...options, debugMode: enabled })
          }
        />
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-5 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">eKitap Araçları</span>
            <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
            <span>Açık Kaynaklı Web Uygulaması</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Gizlilik Politikası
            </Link>
            <Link href="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Kullanım Koşulları
            </Link>
            <a
              href="https://github.com/halilozdgn/ekitap-araclari"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
