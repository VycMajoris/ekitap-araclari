export interface EpubMetadata {
  title: string;
  creator?: string;
  language?: string;
  identifier?: string;
  publisher?: string;
  coverImage?: string;
  format?: 'epub' | 'pdf' | 'mobi';
  pageCount?: number;
}

export interface TextBlock {
  id: string;
  elementTag: string; // 'p', 'h1', 'h2', 'li', 'blockquote', etc.
  originalHtml: string;
  originalText: string;
  correctedHtml: string;
  correctedText: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  diffCount: number;
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

export type LlmProvider = 'antigravity' | 'gemini_api' | 'openrouter';

export interface AntigravityAuthData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
  projectId?: string;
}

export interface ProcessingOptions {
  provider?: LlmProvider;
  apiKey: string;
  geminiApiKey?: string;
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
