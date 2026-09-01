export interface EpubMetadata {
  title: string;
  creator?: string;
  language?: string;
  identifier?: string;
  publisher?: string;
  coverImage?: string;
  format?: 'epub' | 'pdf' | 'mobi';
  pageCount?: number;
  imageCount?: number;
  footnoteCount?: number;
}

export interface FootnoteItem {
  id: string; // e.g. "p45_1" or "fn-1"
  rawTag: string; // e.g. "[^p45_1]" or "^p45_1"
  number: number; // sequential number 1, 2, 3...
  text: string; // footnote definition body text
  chapterId?: string;
  pageNumber?: number;
}

export interface EpubImageAsset {
  id: string;
  href: string; // e.g. "OEBPS/images/img_01.jpg"
  data: Uint8Array | ArrayBuffer;
  mediaType: string; // e.g. "image/jpeg" or "image/png"
  isCover?: boolean;
}

export interface PdfCropBounds {
  topPercent: number; // 0 to 0.4
  bottomPercent: number; // 0 to 0.4
  leftPercent: number; // 0 to 0.4
  rightPercent: number; // 0 to 0.4
}

export type PdfChapterMode = 'auto' | 'fixed_pages';

export interface TextBlock {
  id: string;
  elementTag: string; // 'p', 'h1', 'h2', 'li', 'blockquote', etc.
  originalHtml: string;
  originalText: string;
  correctedHtml: string;
  correctedText: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  diffCount: number;
  isMergedIntoPrevious?: boolean;
}

export interface EpubChapter {
  id: string;
  href: string; // e.g. "OEBPS/chapter01.xhtml"
  title: string;
  rawContent: string;
  modifiedContent?: string;
  blocks: TextBlock[];
  isSelected: boolean;
  status: 'idle' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  stats: {
    totalBlocks: number;
    processedBlocks: number;
    fixedWords: number;
  };
}

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  isFree?: boolean;
}

export type LlmProvider = 'antigravity' | 'gemini_api' | 'openrouter' | 'custom_openai';

export type TaskType = 'ocr_fix' | 'translate';

export type TranslationStyle = 'literary' | 'academic' | 'casual';

export interface AntigravityAuthData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
  projectId?: string;
}

export interface ProcessingOptions {
  taskType?: TaskType;
  sourceLanguage?: string;
  targetLanguage?: string;
  translationStyle?: TranslationStyle;
  enableRollingContext?: boolean;
  glossary?: Record<string, string>;
  provider?: LlmProvider;
  apiKey: string;
  geminiApiKey?: string;
  geminiTier?: 'free' | 'paid';
  groqTier?: 'free' | 'paid';
  customOpenAiKey?: string;
  customOpenAiBaseUrl?: string;
  customOpenAiModel?: string;
  antigravityAuth?: AntigravityAuthData;
  model: string;
  concurrency: number;
  chunkSize: number; // characters per batch
  useRegexPreClean: boolean;
  useLlm: boolean;
  scanMode?: 'smart' | 'rules_only' | 'deep_llm';
  temperature: number;
  customPrompt?: string;
  debugMode?: boolean;
  isDevMode?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export interface ProcessingStats {
  totalChapters: number;
  completedChapters: number;
  totalBlocks: number;
  processedBlocks: number;
  totalFixedWords: number;
  startTime?: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds?: number;
  phase?: 'regex' | 'ai' | 'idle' | 'completed';
  phaseMessage?: string;
  activeBatchIndex?: number;
  totalBatches?: number;
}

export interface DiffItem {
  type: 'equal' | 'added' | 'removed';
  value: string;
}

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  source: 'regex' | 'llm' | 'system' | 'error';
  ruleName?: string;
  chapterId: string;
  chapterTitle: string;
  blockId: string;
  originalText: string;
  correctedText: string;
  changes: { before: string; after: string }[];
}
