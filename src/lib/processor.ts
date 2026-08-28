import { EpubChapter, TextBlock, ProcessingOptions, ProcessingStats, DebugLogEntry } from './types';
import { applyTurkishRegexPreClean, applyTurkishRegexWithLogs, computeTextDiff, hasOcrAnomaly } from './turkish-ocr-rules';
import {
  callOpenRouterCorrection,
  TURKISH_OCR_SYSTEM_PROMPT,
  BOOK_TRANSLATION_SYSTEM_PROMPT,
  buildTranslationUserPrompt,
  getLanguageName,
} from './openrouter';
import { callAntigravityCorrection, callGeminiApiCorrection } from './antigravity';
import { getCachedCorrection, saveBatchCachedCorrections } from './cache';
import { TdkDictionary } from './tdk-dictionary';

export async function callOpenAiCustomCorrection({
  baseUrl,
  apiKey,
  model,
  content,
  temperature = 0.1,
  signal,
  customPrompt,
  taskType,
}: {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  content: string;
  temperature?: number;
  signal?: AbortSignal;
  customPrompt?: string;
  taskType?: 'ocr_fix' | 'translate';
}): Promise<string> {
  const defaultSystem =
    taskType === 'translate' ? BOOK_TRANSLATION_SYSTEM_PROMPT : TURKISH_OCR_SYSTEM_PROMPT;
  const systemMessage = customPrompt || defaultSystem;
  const cleanBaseUrl = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  const endpoint = `${cleanBaseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const maxRetries = 4;
  let delay = 2000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('İşlem kullanıcı tarafından durduruldu.', 'AbortError');
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model.trim() || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content },
          ],
          temperature,
        }),
        signal,
      });

      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error('API istek limiti (Rate Limit / 429 - Kota Doldu) aşıldı. Lütfen birkaç saniye bekleyin veya hesap kotanızı kontrol edin.');
        }
        const retryAfterHeader = response.headers.get('Retry-After');
        let waitMs = retryAfterHeader ? Math.max(parseFloat(retryAfterHeader) * 1000, delay) : delay;
        if (cleanBaseUrl.includes('groq.com')) {
          waitMs = Math.max(waitMs, attempt === 0 ? 3000 : 7000);
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        delay = Math.min(delay * 1.8, 15000);
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message || errorData?.message || `API hatası (${response.status} ${response.statusText})`
        );
      }

      const data = await response.json();
      let result = data.choices?.[0]?.message?.content || '';

      result = result.trim();
      if (result.startsWith('```html')) {
        result = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      } else if (result.startsWith('```xml')) {
        result = result.replace(/^```xml\s*/i, '').replace(/```\s*$/i, '');
      } else if (result.startsWith('```')) {
        result = result.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      }

      return result.trim();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.8, 15000);
    }
  }

  throw new Error('API isteği başarısız oldu.');
}

export interface ProcessorCallbacks {
  onBlockUpdated?: (chapterId: string, block: TextBlock) => void;
  onChapterUpdated?: (chapter: EpubChapter) => void;
  onStatsUpdated?: (stats: ProcessingStats) => void;
  onDebugLog?: (entry: DebugLogEntry) => void;
  onError?: (chapterId: string, error: string) => void;
}

/**
 * Group suspicious blocks into character-bounded chunks for efficient LLM processing.
 */
export interface QueuedBlockItem {
  chapterId: string;
  chapterTitle: string;
  block: TextBlock;
}

function createQueuedBlockBatches(items: QueuedBlockItem[], maxCharsPerBatch: number = 10000): QueuedBlockItem[][] {
  const batches: QueuedBlockItem[][] = [];
  let currentBatch: QueuedBlockItem[] = [];
  let currentLength = 0;

  for (const item of items) {
    const textLen = item.block.originalHtml.length;
    if (currentBatch.length > 0 && currentLength + textLen > maxCharsPerBatch) {
      batches.push(currentBatch);
      currentBatch = [item];
      currentLength = textLen;
    } else {
      currentBatch.push(item);
      currentLength += textLen;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

export function parseBatchResponse(response: string, expectedCount: number): string[] {
  let cleanResponse = response.trim();
  if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }

  const blockMap = new Map<number, string>();

  const sanitizeContent = (raw: string): string => {
    return raw
      .replace(/(?:\[\/|<(?:\/)?)(?:BLOCK|BLOK)[_\s]?\d+(?:\]|>)/gi, '')
      .replace(/(?:\[|<)(?:BLOCK|BLOK)[_\s]?\d+(?:\]|>)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+<\//g, '</')
      .trim();
  };

  const closedTagRegex = /(?:\[|<)(?:BLOCK|BLOK)[_\s](\d+)(?:\]|>)([\s\S]*?)(?:\[\/|<(?:\/)?)(?:BLOCK|BLOK)[_\s]\1(?:\]|>)/gi;
  let match: RegExpExecArray | null;
  while ((match = closedTagRegex.exec(cleanResponse)) !== null) {
    const index = parseInt(match[1], 10);
    const content = sanitizeContent(match[2]);
    if (content.length > 0) {
      blockMap.set(index, content);
    }
  }

  if (blockMap.size < expectedCount) {
    const openTagRegex = /(?:\[|<)(?:BLOCK|BLOK)[_\s](\d+)(?:\]|>):?([\s\S]*?)(?=(?:\[|<)(?:BLOCK|BLOK)[_\s]\d+(?:\]|>)|$)/gi;
    while ((match = openTagRegex.exec(cleanResponse)) !== null) {
      const index = parseInt(match[1], 10);
      const content = sanitizeContent(match[2]);
      if (content.length > 0 && !blockMap.has(index)) {
        blockMap.set(index, content);
      }
    }
  }

  if (expectedCount === 1 && blockMap.size === 0 && cleanResponse.length > 0) {
    return [sanitizeContent(cleanResponse)];
  }

  if (blockMap.size > 0 && !blockMap.has(0) && blockMap.has(1)) {
    for (let i = 1; i <= expectedCount; i++) {
      if (blockMap.has(i)) {
        blockMap.set(i - 1, blockMap.get(i)!);
      }
    }
  }

  if (blockMap.size === 0 && expectedCount > 1 && cleanResponse.length > 0) {
    const paragraphs = cleanResponse.split(/\n\s*\n/).map((p) => sanitizeContent(p)).filter(Boolean);
    if (paragraphs.length === expectedCount) {
      return paragraphs;
    }
  }

  const results: string[] = [];
  for (let i = 0; i < expectedCount; i++) {
    if (blockMap.has(i)) {
      results.push(blockMap.get(i)!);
    } else {
      results.push('');
    }
  }

  return results;
}

function isProviderReady(options: ProcessingOptions): boolean {
  if (options.provider === 'antigravity') {
    return Boolean(options.antigravityAuth?.accessToken);
  }
  if (options.provider === 'gemini_api') {
    return Boolean(options.geminiApiKey?.trim());
  }
  if (options.provider === 'custom_openai') {
    return Boolean(
      options.customOpenAiKey?.trim() ||
      options.customOpenAiBaseUrl?.includes('localhost') ||
      options.customOpenAiBaseUrl?.includes('127.0.0.1')
    );
  }
  return Boolean(options.apiKey?.trim());
}

async function callLlmCorrection({
  options,
  content,
  signal,
}: {
  options: ProcessingOptions;
  content: string;
  signal?: AbortSignal;
}): Promise<string> {
  const defaultSystem =
    options.taskType === 'translate'
      ? BOOK_TRANSLATION_SYSTEM_PROMPT
      : TURKISH_OCR_SYSTEM_PROMPT;
  const customPrompt = options.customPrompt || defaultSystem;

  if (options.provider === 'custom_openai') {
    return callOpenAiCustomCorrection({
      baseUrl: options.customOpenAiBaseUrl,
      apiKey: options.customOpenAiKey,
      model: options.customOpenAiModel || options.model || 'gpt-4o-mini',
      content,
      temperature: options.temperature,
      signal,
      customPrompt,
      taskType: options.taskType,
    });
  }
  if (options.provider === 'antigravity' && options.antigravityAuth?.accessToken) {
    return callAntigravityCorrection({
      auth: options.antigravityAuth,
      model: options.model,
      content,
      temperature: options.temperature,
      signal,
      customPrompt,
    });
  }
  if (options.provider === 'gemini_api' && options.geminiApiKey?.trim()) {
    return callGeminiApiCorrection({
      apiKey: options.geminiApiKey,
      model: options.model,
      content,
      temperature: options.temperature,
      signal,
      customPrompt,
    });
  }
  return callOpenRouterCorrection({
    apiKey: options.apiKey,
    model: options.model,
    content,
    temperature: options.temperature,
    signal,
    customPrompt,
  });
}

function parseBlockTagAndContent(raw: string, defaultTag: string = 'p'): { tag: string; innerHtml: string; text: string } {
  const cleanRaw = raw
    .replace(/(?:\[\/|<(?:\/)?)(?:BLOCK|BLOK)[_\s]?\d+(?:\]|>)/gi, '')
    .replace(/(?:\[|<)(?:BLOCK|BLOK)[_\s]?\d+(?:\]|>)/gi, '')
    .trim();

  const match = cleanRaw.match(/^<([a-z0-9]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>$/i);
  let tag = defaultTag;
  let innerHtml = cleanRaw;

  if (match) {
    const matchedTag = match[1].toLowerCase();
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li'].includes(matchedTag)) {
      tag = matchedTag;
      innerHtml = match[2].trim();
    }
  }

  innerHtml = innerHtml
    .replace(/(?:\[\/|<(?:\/)?)(?:BLOCK|BLOK)[_\s]?\d+(?:\]|>)/gi, '')
    .replace(/(?:\[|<)(?:BLOCK|BLOK)[_\s]?\d+(?:\]|>)/gi, '')
    .trim();

  const text = innerHtml
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();

  return { tag, innerHtml, text };
}

/**
 * Process a batch of TextBlocks through LLM.
 */
async function processLlmBatch(
  batch: QueuedBlockItem[],
  options: ProcessingOptions,
  bookTitle: string | undefined,
  rollingContext: { source: string; translated: string }[],
  callbacks: ProcessorCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (!isProviderReady(options) || batch.length === 0) return;

  const isTranslation = options.taskType === 'translate';
  const cachePrefix = isTranslation
    ? `trans_${options.sourceLanguage || 'auto'}_${options.targetLanguage || 'tr'}`
    : undefined;
  const cacheEntries: Omit<Parameters<typeof saveBatchCachedCorrections>[0][0], 'key' | 'timestamp'>[] = [];

  if (batch.length === 1) {
    const item = batch[0];
    const singleBlock = item.block;
    const textBeforeLlm = singleBlock.correctedText;

    let userPrompt = `<${singleBlock.elementTag}>${singleBlock.correctedHtml}</${singleBlock.elementTag}>`;
    if (isTranslation) {
      userPrompt = buildTranslationUserPrompt({
        sourceLang: options.sourceLanguage || 'auto',
        targetLang: options.targetLanguage || 'tr',
        style: options.translationStyle || 'literary',
        bookTitle,
        chapterTitle: item.chapterTitle,
        rollingContext: options.enableRollingContext !== false ? rollingContext : undefined,
        glossary: options.glossary,
        content: `[BLOCK_0]\n<${singleBlock.elementTag}>${singleBlock.originalHtml}</${singleBlock.elementTag}>\n[/BLOCK_0]`,
      });
    }

    try {
      const corrected = await callLlmCorrection({
        options,
        content: userPrompt,
        signal,
      });

      if (corrected && corrected.length > 0) {
        let finalContent = corrected;
        if (isTranslation) {
          const parsed = parseBatchResponse(corrected, 1);
          if (parsed[0] && parsed[0].length > 0) {
            finalContent = parsed[0];
          }
        }

        const { tag, innerHtml, text } = parseBlockTagAndContent(finalContent, singleBlock.elementTag);
        singleBlock.elementTag = tag;
        singleBlock.correctedHtml = innerHtml;
        singleBlock.correctedText = text;
        singleBlock.status = 'completed';
        singleBlock.diffCount = isTranslation
          ? singleBlock.correctedText.split(/\s+/).filter(Boolean).length
          : computeTextDiff(singleBlock.originalText, singleBlock.correctedText).fixedWordCount;

        if (isTranslation) {
          rollingContext.push({
            source: singleBlock.originalText,
            translated: singleBlock.correctedText,
          });
          if (rollingContext.length > 5) {
            rollingContext.shift();
          }
        }

        cacheEntries.push({
          originalText: singleBlock.originalText,
          correctedHtml: singleBlock.correctedHtml,
          correctedText: singleBlock.correctedText,
          diffCount: singleBlock.diffCount,
          model: options.model,
          provider: options.provider || 'default',
        });

        if (singleBlock.correctedText !== textBeforeLlm) {
          const ruleLabel = isTranslation
            ? `AI Çeviri (${getLanguageName(options.targetLanguage || 'tr')})`
            : `LLM (${options.model})`;

          const llmLog: DebugLogEntry = {
            id: `llm-${singleBlock.id}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('tr-TR'),
            source: 'llm',
            ruleName: ruleLabel,
            chapterId: item.chapterId,
            chapterTitle: item.chapterTitle,
            blockId: singleBlock.id,
            originalText: textBeforeLlm,
            correctedText: singleBlock.correctedText,
            changes: [{ before: textBeforeLlm, after: singleBlock.correctedText }],
          };
          callbacks.onDebugLog?.(llmLog);
          if (options.debugMode) {
            console.log(`[LLM Debug] Block ${singleBlock.id}:`, llmLog);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Tekil blok LLM hatası:', err);

      const errLog: DebugLogEntry = {
        id: `err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        source: 'error',
        ruleName: `API İstek Hatası (${options.provider || 'default'})`,
        chapterId: item.chapterId,
        chapterTitle: item.chapterTitle,
        blockId: singleBlock.id,
        originalText: textBeforeLlm,
        correctedText: errMsg,
        changes: [{ before: 'İstek Gönderildi', after: errMsg }],
      };
      callbacks.onDebugLog?.(errLog);

      callbacks.onError?.(item.chapterId, `AI İstek Hatası: ${errMsg}`);
      throw err;
    }
  } else {
    const textsBeforeLlm = batch.map((item) => item.block.correctedText);
    const formattedInput = batch
      .map(
        (item, idx) =>
          `[BLOCK_${idx}]\n<${item.block.elementTag}>${isTranslation ? item.block.originalHtml : item.block.correctedHtml}</${item.block.elementTag}>\n[/BLOCK_${idx}]`
      )
      .join('\n\n');

    let batchPrompt = `Lütfen aşağıdaki ${batch.length} adet metin bloğundaki Türkçe OCR ve dönüştürme hatalarını düzelt. Gerçek başlıkları <h2>Başlık</h2>, normal paragrafları <p>Cümle...</p> olarak etiketle. Her bloğu [BLOCK_X]...[/BLOCK_X] etiketleri arasında aynen iade et:\n\n${formattedInput}`;

    if (isTranslation) {
      batchPrompt = buildTranslationUserPrompt({
        sourceLang: options.sourceLanguage || 'auto',
        targetLang: options.targetLanguage || 'tr',
        style: options.translationStyle || 'literary',
        bookTitle,
        chapterTitle: batch[0]?.chapterTitle,
        rollingContext: options.enableRollingContext !== false ? rollingContext : undefined,
        glossary: options.glossary,
        content: formattedInput,
      });
    }

    try {
      const response = await callLlmCorrection({
        options,
        content: batchPrompt,
        signal,
      });

      const parsedBlocks = parseBatchResponse(response, batch.length);
      for (let i = 0; i < batch.length; i++) {
        if (parsedBlocks[i] && parsedBlocks[i].length > 0) {
          const item = batch[i];
          const block = item.block;
          const textBeforeLlm = textsBeforeLlm[i];
          const { tag, innerHtml, text } = parseBlockTagAndContent(parsedBlocks[i], block.elementTag);
          block.elementTag = tag;
          block.correctedHtml = innerHtml;
          block.correctedText = text;
          block.status = 'completed';
          block.diffCount = isTranslation
            ? block.correctedText.split(/\s+/).filter(Boolean).length
            : computeTextDiff(block.originalText, block.correctedText).fixedWordCount;

          if (isTranslation) {
            rollingContext.push({
              source: block.originalText,
              translated: block.correctedText,
            });
            if (rollingContext.length > 5) {
              rollingContext.shift();
            }
          }

          cacheEntries.push({
            originalText: block.originalText,
            correctedHtml: block.correctedHtml,
            correctedText: block.correctedText,
            diffCount: block.diffCount,
            model: options.model,
            provider: options.provider || 'default',
          });

          if (block.correctedText !== textBeforeLlm) {
            const ruleLabel = isTranslation
              ? `AI Çeviri (${getLanguageName(options.targetLanguage || 'tr')})`
              : `LLM (${options.model})`;

            const llmLog: DebugLogEntry = {
              id: `llm-${block.id}-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString('tr-TR'),
              source: 'llm',
              ruleName: ruleLabel,
              chapterId: item.chapterId,
              chapterTitle: item.chapterTitle,
              blockId: block.id,
              originalText: textBeforeLlm,
              correctedText: block.correctedText,
              changes: [{ before: textBeforeLlm, after: block.correctedText }],
            };
            callbacks.onDebugLog?.(llmLog);
            if (options.debugMode) {
              console.log(`[LLM Debug] Block ${block.id}:`, llmLog);
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Toplu blok LLM hatası:', err);

      const errLog: DebugLogEntry = {
        id: `err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        source: 'error',
        ruleName: `API İstek Hatası (${options.provider || 'default'})`,
        chapterId: batch[0]?.chapterId || 'global',
        chapterTitle: batch[0]?.chapterTitle || 'Genel',
        blockId: batch[0]?.block.id || 'batch-error',
        originalText: `Paket (${batch.length} blok)`,
        correctedText: errMsg,
        changes: [{ before: 'İstek Gönderildi', after: errMsg }],
      };
      callbacks.onDebugLog?.(errLog);

      callbacks.onError?.(batch[0]?.chapterId || 'global', `AI Paket Hatası: ${errMsg}`);
      throw err;
    }
  }

  if (cacheEntries.length > 0) {
    saveBatchCachedCorrections(cacheEntries, cachePrefix).catch((e) =>
      console.warn('Önbellek kaydetme uyarısı:', e)
    );
  }
}

export async function refineChapterTitlesWithAi(
  chapters: EpubChapter[],
  options: ProcessingOptions,
  callbacks?: ProcessorCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const isTranslation = options.taskType === 'translate';

  if (!isTranslation) {
    for (const ch of chapters) {
      ch.title = applyTurkishRegexPreClean(ch.title);
      callbacks?.onChapterUpdated?.(ch);
    }
  }

  if (!options.useLlm || !isProviderReady(options) || chapters.length === 0) {
    return;
  }

  // Do not block or abort whole pipeline if title translation fails or times out
  const titlesList = chapters
    .map((ch, idx) => `[TITLE_${idx}] ${ch.title}`)
    .join('\n');

  const targetName = getLanguageName(options.targetLanguage || 'tr');

  const prompt = isTranslation
    ? `Aşağıda bir kitabın bölümlerine ait orijinal başlık listesi yer almaktadır. Lütfen bu başlıkları bağlamı koruyarak ve doğal bir edebi dille ${targetName} diline çevir. Her başlığı [TITLE_X] Çevrilmiş Başlık formatında tek tek satır olarak geri ver:\n\n${titlesList}`
    : `Aşağıda bir kitabın bölümlerine ait başlık listesi yer almaktadır. Lütfen bu başlıklardaki OCR, harf birleşme (rn->m, cl->d, l< -> k vb.) ve bozuk karakter hatalarını aslına uygun düzgün Türkçe başlıklar olarak düzelt. Her başlığı [TITLE_X] Düzeltilmiş Başlık formatında tek tek satır olarak geri ver:\n\n${titlesList}`;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Başlık çevirisi zaman aşımına uğradı, paragraflarla devam ediliyor.')), 10000)
    );

    const response = await Promise.race([
      callLlmCorrection({
        options,
        content: prompt,
        signal,
      }),
      timeoutPromise,
    ]);

    const lines = response.split('\n');
    for (const line of lines) {
      const match = line.match(/\[TITLE_(\d+)\]\s*(.+)/i);
      if (match) {
        const idx = parseInt(match[1], 10);
        const cleanTitle = match[2].trim();
        if (chapters[idx] && cleanTitle.length > 0) {
          chapters[idx].title = cleanTitle;
          callbacks?.onChapterUpdated?.(chapters[idx]);
        }
      }
    }
  } catch (err) {
    console.warn('Başlıkları AI ile iyileştirme atlandı/uyarısı:', err);
  }
}

/**
 * Main Controller to process selected chapters with concurrency control and smart filtering.
 */
export async function processEpubChapters(
  chapters: EpubChapter[],
  options: ProcessingOptions,
  callbacks: ProcessorCallbacks,
  signal?: AbortSignal,
  bookTitle?: string
): Promise<ProcessingStats> {
  const isTranslation = options.taskType === 'translate';
  const requiresAi = options.useLlm || isTranslation || options.scanMode === 'smart' || options.scanMode === 'deep_llm';

  if (requiresAi && !isProviderReady(options)) {
    throw new Error(
      'Yapay Zekâ (AI) işlemi için API anahtarı veya Google girişi gereklidir. Lütfen Ayarlar panelinden giriş yapın veya "Yıldırım Hızı (Regex)" modunu seçin.'
    );
  }

  await TdkDictionary.getInstance().init().catch(() => {});
  await refineChapterTitlesWithAi(chapters, options, callbacks, signal);

  const selectedChapters = chapters.filter((c) => c.isSelected);
  const totalBlocks = selectedChapters.reduce((acc, c) => acc + c.blocks.length, 0);
  const scanMode = options.scanMode || 'smart';
  const cachePrefix = isTranslation
    ? `trans_${options.sourceLanguage || 'auto'}_${options.targetLanguage || 'tr'}`
    : undefined;

  const stats: ProcessingStats = {
    totalChapters: selectedChapters.length,
    completedChapters: 0,
    totalBlocks,
    processedBlocks: 0,
    totalFixedWords: 0,
    startTime: Date.now(),
    elapsedSeconds: 0,
    phase: 'regex',
    phaseMessage: 'Aşama 1/2: Hızlı Regex & TDK Ön Temizliği Yapılıyor...',
  };

  callbacks.onStatsUpdated?.({ ...stats });

  const rollingContext: { source: string; translated: string }[] = [];
  const globalSuspiciousQueue: QueuedBlockItem[] = [];

  for (let chIdx = 0; chIdx < selectedChapters.length; chIdx++) {
    if (signal?.aborted) break;

    const chapter = selectedChapters[chIdx];
    chapter.status = 'processing';
    chapter.errorMessage = undefined;
    callbacks.onChapterUpdated?.(chapter);

    let chapterPendingAiBlocks = 0;

    for (const block of chapter.blocks) {
      if (block.elementTag === 'figure') {
        block.status = 'completed';
        stats.processedBlocks++;
        chapter.stats.processedBlocks++;
        callbacks.onBlockUpdated?.(chapter.id, block);
        continue;
      }

      if (
        block.status === 'completed' &&
        block.correctedText &&
        block.correctedText !== block.originalText
      ) {
        stats.processedBlocks++;
        stats.totalFixedWords += block.diffCount;
        chapter.stats.processedBlocks++;
        chapter.stats.fixedWords += block.diffCount;
        if (isTranslation) {
          rollingContext.push({
            source: block.originalText,
            translated: block.correctedText,
          });
          if (rollingContext.length > 5) rollingContext.shift();
        }
        continue;
      }

      if (options.useLlm) {
        const cached = await getCachedCorrection(options.model, block.originalText, cachePrefix);
        if (cached) {
          block.correctedHtml = cached.correctedHtml;
          block.correctedText = cached.correctedText;
          block.diffCount = cached.diffCount;
          block.status = 'completed';
          stats.processedBlocks++;
          stats.totalFixedWords += block.diffCount;
          chapter.stats.processedBlocks++;
          chapter.stats.fixedWords += block.diffCount;
          callbacks.onBlockUpdated?.(chapter.id, block);

          if (isTranslation) {
            rollingContext.push({
              source: block.originalText,
              translated: block.correctedText,
            });
            if (rollingContext.length > 5) rollingContext.shift();
          }

          callbacks.onDebugLog?.({
            id: `cache-${block.id}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('tr-TR'),
            source: 'system',
            ruleName: `Önbellekten Yüklendi (${cached.model} - 0 Token)`,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            blockId: block.id,
            originalText: block.originalText,
            correctedText: block.correctedText,
            changes: [{ before: block.originalText, after: block.correctedText }],
          });
          continue;
        }
      }

      let text = block.originalHtml;
      if (!isTranslation && options.useRegexPreClean) {
        const { cleaned, logs } = applyTurkishRegexWithLogs(
          text,
          block.id,
          chapter.id,
          chapter.title
        );
        text = cleaned;
        block.correctedHtml = text;

        if (logs.length > 0) {
          for (const log of logs) {
            callbacks.onDebugLog?.(log);
          }
          if (options.debugMode) {
            console.log(`[Regex Debug] Chapter ${chapter.title} Block ${block.id}:`, logs);
            if (typeof console.table === 'function') {
              console.table(logs);
            }
          }
        }
      } else {
        block.correctedHtml = text;
      }

      const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
      if (tempDiv) {
        tempDiv.innerHTML = text;
        block.correctedText = tempDiv.textContent || text;
      } else {
        block.correctedText = text.replace(/<[^>]*>/g, '');
      }

      const { fixedWordCount } = computeTextDiff(block.originalText, block.correctedText);
      block.diffCount = fixedWordCount;

      if (isTranslation) {
        if (options.useLlm && isProviderReady(options)) {
          chapterPendingAiBlocks++;
          globalSuspiciousQueue.push({ chapterId: chapter.id, chapterTitle: chapter.title, block });
        } else {
          block.status = 'completed';
          stats.processedBlocks++;
          callbacks.onBlockUpdated?.(chapter.id, block);
        }
      } else if (scanMode === 'rules_only') {
        block.status = 'completed';
        stats.processedBlocks++;
        stats.totalFixedWords += block.diffCount;
        chapter.stats.processedBlocks++;
        chapter.stats.fixedWords += block.diffCount;
        callbacks.onBlockUpdated?.(chapter.id, block);
      } else if (scanMode === 'smart') {
        const isSuspicious = hasOcrAnomaly(block.correctedText);
        if (isSuspicious && options.useLlm && isProviderReady(options)) {
          chapterPendingAiBlocks++;
          globalSuspiciousQueue.push({ chapterId: chapter.id, chapterTitle: chapter.title, block });
        } else {
          block.status = 'completed';
          stats.processedBlocks++;
          stats.totalFixedWords += block.diffCount;
          chapter.stats.processedBlocks++;
          chapter.stats.fixedWords += block.diffCount;
          callbacks.onBlockUpdated?.(chapter.id, block);
        }
      } else {
        if (options.useLlm && isProviderReady(options)) {
          chapterPendingAiBlocks++;
          globalSuspiciousQueue.push({ chapterId: chapter.id, chapterTitle: chapter.title, block });
        } else {
          block.status = 'completed';
          stats.processedBlocks++;
          stats.totalFixedWords += block.diffCount;
          chapter.stats.processedBlocks++;
          chapter.stats.fixedWords += block.diffCount;
          callbacks.onBlockUpdated?.(chapter.id, block);
        }
      }
    }

    const headingBlock = chapter.blocks.find(
      (b) => b.elementTag === 'h1' || b.elementTag === 'h2' || b.elementTag === 'h3'
    );
    if (headingBlock && headingBlock.correctedText.trim().length > 0 && headingBlock.correctedText.length < 75) {
      chapter.title = headingBlock.correctedText.trim();
    }

    if (chapterPendingAiBlocks === 0) {
      chapter.status = 'completed';
      stats.completedChapters++;
      callbacks.onChapterUpdated?.(chapter);
    }

    stats.phaseMessage = `Aşama 1/2: Hızlı Regex & TDK Taraması (${chIdx + 1}/${selectedChapters.length} Bölüm)`;
    callbacks.onStatsUpdated?.({ ...stats });
  }

  if (globalSuspiciousQueue.length > 0 && options.useLlm && isProviderReady(options) && !signal?.aborted) {
    const defaultChunkSize = isTranslation ? 4500 : 10000;
    const batches = createQueuedBlockBatches(globalSuspiciousQueue, options.chunkSize || defaultChunkSize);

    stats.phase = 'ai';
    stats.totalBatches = batches.length;
    stats.activeBatchIndex = 0;
    stats.phaseMessage = isTranslation
      ? `Aşama 2/2: Yapay Zekâ ile Kitap Çevirisi Başlatıldı (${batches.length} Paket)`
      : `Aşama 2/2: Kalan Şüpheli Paragraflar AI ile Onarılıyor (${batches.length} Paket)`;
    callbacks.onStatsUpdated?.({ ...stats });

    const isHighThroughputProvider =
      options.provider === 'antigravity' ||
      options.provider === 'gemini_api' ||
      options.provider === 'custom_openai';

    const isGeminiPaid = options.provider === 'gemini_api' && options.geminiTier === 'paid';
    const isGroq = options.provider === 'custom_openai' && (options.customOpenAiBaseUrl || '').includes('groq.com');
    const isGroqPaid = isGroq && options.groqTier === 'paid';

    let concurrency = 1;
    if (isTranslation) {
      concurrency = (isGeminiPaid || isGroqPaid) && options.enableRollingContext === false ? 2 : 1;
    } else if (isGeminiPaid || isGroqPaid) {
      concurrency = Math.max(1, Math.min(options.concurrency || 3, 4));
    } else if (options.provider === 'gemini_api' || isGroq) {
      concurrency = 1;
    } else if (isHighThroughputProvider) {
      concurrency = Math.max(1, Math.min(options.concurrency || 2, 3));
    } else {
      concurrency = 1;
    }

    for (let i = 0; i < batches.length; i += concurrency) {
      if (signal?.aborted) break;

      const currentBatches = batches.slice(i, i + concurrency);
      stats.activeBatchIndex = Math.min(batches.length, i + 1);
      stats.phaseMessage = isTranslation
        ? `Aşama 2/2: AI Çeviri Paketi İşleniyor (${stats.activeBatchIndex}/${batches.length})`
        : `Aşama 2/2: AI Onarım Paketi İşleniyor (${stats.activeBatchIndex}/${batches.length})`;
      callbacks.onStatsUpdated?.({ ...stats });

      await Promise.all(
        currentBatches.map(async (batch) => {
          await processLlmBatch(
            batch,
            options,
            bookTitle,
            rollingContext,
            callbacks,
            signal
          );

          for (const item of batch) {
            stats.processedBlocks++;
            const targetChapter = selectedChapters.find((c) => c.id === item.chapterId);
            if (targetChapter) {
              targetChapter.stats.processedBlocks++;
              if (isTranslation) {
                const transWordCount = (item.block.correctedText || '').split(/\s+/).filter(Boolean).length;
                item.block.diffCount = transWordCount;
                stats.totalFixedWords += transWordCount;
                targetChapter.stats.fixedWords += transWordCount;
              } else {
                stats.totalFixedWords += item.block.diffCount;
                targetChapter.stats.fixedWords += item.block.diffCount;
              }

              if (targetChapter.blocks.every((b) => b.status === 'completed')) {
                if (targetChapter.status !== 'completed') {
                  targetChapter.status = 'completed';
                  stats.completedChapters++;
                  callbacks.onChapterUpdated?.(targetChapter);
                }
              } else {
                callbacks.onChapterUpdated?.(targetChapter);
              }
            }
            callbacks.onBlockUpdated?.(item.chapterId, item.block);
          }
        })
      );

      if (i + concurrency < batches.length && !signal?.aborted) {
        let throttleMs = 500;
        if (isGeminiPaid || isGroqPaid) {
          throttleMs = isTranslation ? 300 : 150;
        } else if (options.provider === 'gemini_api') {
          throttleMs = 3800;
        } else if (isGroq) {
          throttleMs = isTranslation ? 2100 : 1200;
        } else if (isHighThroughputProvider) {
          throttleMs = isTranslation ? 800 : 400;
        } else {
          throttleMs = isTranslation ? 2000 : 1500;
        }
        await new Promise((resolve) => setTimeout(resolve, throttleMs));
      }

      stats.elapsedSeconds = Math.max(1, Math.round((Date.now() - (stats.startTime || Date.now())) / 1000));
      const remainingBatches = batches.length - Math.min(batches.length, i + concurrency);
      const batchesDone = Math.min(batches.length, i + concurrency);
      if (batchesDone > 0) {
        const secondsPerBatch = stats.elapsedSeconds / batchesDone;
        stats.estimatedRemainingSeconds = Math.round(remainingBatches * secondsPerBatch);
      } else {
        stats.estimatedRemainingSeconds = 15;
      }
      callbacks.onStatsUpdated?.({ ...stats });
    }
  }

  for (const chapter of selectedChapters) {
    if (chapter.status !== 'completed' && chapter.blocks.every((b) => b.status === 'completed')) {
      chapter.status = 'completed';
      callbacks.onChapterUpdated?.(chapter);
    }
  }

  stats.phase = 'completed';
  stats.phaseMessage = 'İşlem Başarıyla Tamamlandı';
  stats.completedChapters = selectedChapters.filter((c) => c.status === 'completed').length;
  stats.estimatedRemainingSeconds = 0;
  callbacks.onStatsUpdated?.({ ...stats });

  return stats;
}
