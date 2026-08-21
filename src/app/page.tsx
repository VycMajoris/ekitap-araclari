'use client';

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { Header } from '@/components/Header';
import { UploadSection } from '@/components/UploadSection';
import { SettingsModal } from '@/components/SettingsModal';
import { DebugConsole } from '@/components/DebugConsole';
import { StatsBar } from '@/components/StatsBar';
import { ChapterList } from '@/components/ChapterList';
import { DiffViewer } from '@/components/DiffViewer';
import {
  EpubMetadata,
  EpubChapter,
  ProcessingOptions,
  ProcessingStats,
  TextBlock,
  DebugLogEntry,
  LlmProvider,
  AntigravityAuthData,
} from '@/lib/types';
import { parseEpub, packageEpub } from '@/lib/epub-engine';
import { parsePdf } from '@/lib/pdf-engine';
import { processEpubChapters } from '@/lib/processor';
import { POPULAR_FREE_MODELS } from '@/lib/openrouter';
import { AlertTriangle } from 'lucide-react';

const DEFAULT_OPTIONS: ProcessingOptions = {
  provider: 'antigravity',
  apiKey: '',
  geminiApiKey: '',
  model: 'gemini-3.5-flash',
  concurrency: 1,
  chunkSize: 3000,
  useRegexPreClean: true,
  useLlm: true,
  scanMode: 'smart',
  temperature: 0.1,
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

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPacking, setIsPacking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load API key and settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('epub_ocr_api_key') || '';
      const storedGeminiKey = localStorage.getItem('epub_ocr_gemini_api_key') || '';
      const storedProvider = (localStorage.getItem('epub_ocr_provider') as LlmProvider) || 'antigravity';
      const storedModel = localStorage.getItem('epub_ocr_model') || (
        storedProvider === 'antigravity'
          ? 'gemini-3.5-flash'
          : storedProvider === 'gemini_api'
          ? 'gemini-2.0-flash'
          : 'google/gemini-2.0-flash-exp:free'
      );
      const storedAuth = localStorage.getItem('epub_ocr_antigravity_auth');
      let antigravityAuth: AntigravityAuthData | undefined = undefined;
      if (storedAuth) {
        try {
          antigravityAuth = JSON.parse(storedAuth);
        } catch {}
      }
      setOptions((prev) => ({
        ...prev,
        provider: storedProvider,
        apiKey: storedKey,
        geminiApiKey: storedGeminiKey,
        antigravityAuth,
        model: storedModel,
      }));
    }
  }, []);

  const handleOptionsChange = (newOptions: ProcessingOptions) => {
    setOptions(newOptions);
    if (typeof window !== 'undefined') {
      if (newOptions.provider) localStorage.setItem('epub_ocr_provider', newOptions.provider);
      localStorage.setItem('epub_ocr_api_key', newOptions.apiKey);
      if (newOptions.geminiApiKey !== undefined) localStorage.setItem('epub_ocr_gemini_api_key', newOptions.geminiApiKey);
      if (newOptions.antigravityAuth) {
        localStorage.setItem('epub_ocr_antigravity_auth', JSON.stringify(newOptions.antigravityAuth));
      } else {
        localStorage.removeItem('epub_ocr_antigravity_auth');
      }
      localStorage.setItem('epub_ocr_model', newOptions.model);
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

      let loadedZip: JSZip;
      let loadedMeta: EpubMetadata;
      let loadedChapters: EpubChapter[];

      if (isPdf) {
        setLoadingMessage('PDF sayfaları ayrıştırılıyor ve EPUB yapısına dönüştürülüyor...');
        const result = await parsePdf(uploadedFile, {
          onProgress: (p) => {
            if (p.message) setLoadingMessage(p.message);
          },
        });
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
    const isConfigured =
      (options.provider === 'antigravity' && Boolean(options.antigravityAuth?.accessToken)) ||
      (options.provider === 'gemini_api' && Boolean(options.geminiApiKey?.trim())) ||
      (options.provider === 'openrouter' && Boolean(options.apiKey?.trim()));

    if (options.useLlm && !isConfigured) {
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
      await processEpubChapters(
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
                return { ...ch, blocks: newBlocks };
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
          },
        },
        controller.signal
      );
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

  const handleDownload = async () => {
    if (!zip || chapters.length === 0) return;
    setIsPacking(true);
    try {
      const blob = await packageEpub(zip, chapters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = file?.name?.replace(/\.(epub|pdf)$/i, '') || 'kitap';
      a.download = `${baseName}_duzeltilmis.epub`;
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

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || null;
  const activeModel =
    POPULAR_FREE_MODELS.find((m) => m.id === options.model)?.name || options.model;
  const selectedCount = chapters.filter((c) => c.isSelected).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Navbar Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        options={options}
        apiKeyConfigured={Boolean(options.apiKey.trim())}
        modelName={activeModel}
        isDebugOpen={isDebugOpen}
        onToggleDebugOpen={() => setIsDebugOpen(!isDebugOpen)}
        logCount={debugLogs.length}
        isDebugMode={Boolean(options.debugMode)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
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

        {/* Upload or Book Info Card */}
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

        {/* If Book is loaded, show Controls & Workspace */}
        {metadata && (
          <>
            {/* Stats & Action Bar */}
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
              onResetProgress={handleResetProgress}
              selectedCount={selectedCount}
            />

            {/* Split Workspace: Left Chapter List | Right Live Diff Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Chapters (4 cols) */}
              <div className="lg:col-span-4 h-[640px]">
                <ChapterList
                  chapters={chapters}
                  selectedChapterId={selectedChapterId}
                  onSelectChapter={(id) => setSelectedChapterId(id)}
                  onToggleChapterSelect={handleToggleChapterSelect}
                  onToggleAll={handleToggleAll}
                />
              </div>

              {/* Right Column: Live Diff Viewer (8 cols) */}
              <div className="lg:col-span-8 h-[640px]">
                <DiffViewer chapter={selectedChapter} />
              </div>
            </div>
          </>
        )}

        {/* Empty State Features Info */}
        {!metadata && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Karakter Birleşme &amp; OCR Onarımı
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                PDF&apos;ten dönüştürürken birleşen <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-emerald-600">rn &rarr; m</code> (<span className="italic">yarm &rarr; yarın, kamı &rarr; karnı, öğmeci &rarr; öğrenci</span>) ve <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-emerald-600">cl &rarr; d</code> gibi Türkçe hataları cümle bağlamına göre onarır.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                EPUB Yapısını &amp; Formatını Koruma
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                HTML etiketlerini (<code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">&lt;p&gt;</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">&lt;span&gt;</code>, <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">&lt;em&gt;</code>), dipnotları, görsel ve bölüm sırasını bozmadan doğrudan metin düğümlerini günceller.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                OpenRouter Ücretsiz Modeller
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Llama 3.3 70B, Qwen 2.5 72B, Gemini 2.0 Flash ve Mistral gibi ücretsiz modeller ile sıfır maliyetle çalışır. Rate limit korumalı akıllı kuyruk yönetimi içerir.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onOptionsChange={handleOptionsChange}
      />

      {/* Debug Console Drawer */}
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

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-4 text-center text-xs text-zinc-400">
        <p>
          EPUB Türkçe OCR Düzeltici &bull; Vercel &amp; Cloudflare Uyumlu İstemci Tarafı Web Uygulaması
        </p>
      </footer>
    </div>
  );
}
