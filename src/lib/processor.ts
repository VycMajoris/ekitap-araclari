import { EpubChapter, TextBlock, ProcessingOptions, ProcessingStats, DebugLogEntry } from './types';
import { applyTurkishRegexPreClean, applyTurkishRegexWithLogs, computeTextDiff, hasOcrAnomaly } from './turkish-ocr-rules';
import { callOpenRouterCorrection } from './openrouter';
import { callAntigravityCorrection, callGeminiApiCorrection } from './antigravity';
import { getCachedCorrection, saveBatchCachedCorrections } from './cache';

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
function createBlockBatches(blocks: TextBlock[], maxCharsPerBatch: number = 3000): TextBlock[][] {
  const batches: TextBlock[][] = [];
  let currentBatch: TextBlock[] = [];
  let currentLength = 0;

  for (const block of blocks) {
    const textLen = block.originalHtml.length;
    if (currentBatch.length > 0 && currentLength + textLen > maxCharsPerBatch) {
      batches.push(currentBatch);
      currentBatch = [block];
      currentLength = textLen;
    } else {
      currentBatch.push(block);
      currentLength += textLen;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Parses batch response formatted with [BLOCK_N]...[/BLOCK_N] tags.
 */
function parseBatchResponse(response: string, expectedCount: number): string[] {
  const results: string[] = [];
  const regex = /\[BLOCK_(\d+)\]([\s\S]*?)\[\/BLOCK_\1\]/g;
  let match;
  const blockMap = new Map<number, string>();

  while ((match = regex.exec(response)) !== null) {
    const index = parseInt(match[1], 10);
    const content = match[2].trim();
    blockMap.set(index, content);
  }

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
  if (options.provider === 'antigravity' && options.antigravityAuth?.accessToken) {
    return callAntigravityCorrection({
      auth: options.antigravityAuth,
      model: options.model,
      content,
      temperature: options.temperature,
      signal,
      customPrompt: options.customPrompt,
    });
  }
  if (options.provider === 'gemini_api' && options.geminiApiKey?.trim()) {
    return callGeminiApiCorrection({
      apiKey: options.geminiApiKey,
      model: options.model,
      content,
      temperature: options.temperature,
      signal,
      customPrompt: options.customPrompt,
    });
  }
  return callOpenRouterCorrection({
    apiKey: options.apiKey,
    model: options.model,
    content,
    temperature: options.temperature,
    signal,
    customPrompt: options.customPrompt,
  });
}

function parseBlockTagAndContent(raw: string, defaultTag: string = 'p'): { tag: string; innerHtml: string; text: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^<([a-z0-9]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>$/i);
  let tag = defaultTag;
  let innerHtml = trimmed;

  if (match) {
    const matchedTag = match[1].toLowerCase();
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li'].includes(matchedTag)) {
      tag = matchedTag;
      innerHtml = match[2].trim();
    }
  }

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
  batch: TextBlock[],
  options: ProcessingOptions,
  chapterId: string,
  chapterTitle: string,
  callbacks: ProcessorCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (!isProviderReady(options)) return;

  if (batch.length === 1) {
    const singleBlock = batch[0];
    const textBeforeLlm = singleBlock.correctedText;
    try {
      const corrected = await callLlmCorrection({
        options,
        content: `<${singleBlock.elementTag}>${singleBlock.correctedHtml}</${singleBlock.elementTag}>`,
        signal,
      });

      if (corrected && corrected.length > 0) {
        const { tag, innerHtml, text } = parseBlockTagAndContent(corrected, singleBlock.elementTag);
        singleBlock.elementTag = tag;
        singleBlock.correctedHtml = innerHtml;
        singleBlock.correctedText = text;

        if (singleBlock.correctedText !== textBeforeLlm) {
          const llmLog: DebugLogEntry = {
            id: `llm-${singleBlock.id}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('tr-TR'),
            source: 'llm',
            ruleName: `LLM (${options.model})`,
            chapterId,
            chapterTitle,
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
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      console.warn('Tekil blok LLM uyarısı:', err);
    }
  } else {
    const textsBeforeLlm = batch.map((b) => b.correctedText);
    const formattedInput = batch
      .map((b, idx) => `[BLOCK_${idx}]\n<${b.elementTag}>${b.correctedHtml}</${b.elementTag}>\n[/BLOCK_${idx}]`)
      .join('\n\n');

    try {
      const response = await callLlmCorrection({
        options,
        content: `Lütfen aşağıdaki ${batch.length} adet metin bloğundaki Türkçe OCR ve dönüştürme hatalarını düzelt. Gerçek başlıkları <h2>Başlık</h2>, normal paragrafları <p>Cümle...</p> olarak etiketle. Her bloğu [BLOCK_X]...[/BLOCK_X] etiketleri arasında aynen iade et:\n\n${formattedInput}`,
        signal,
      });

      const parsedBlocks = parseBatchResponse(response, batch.length);
      for (let i = 0; i < batch.length; i++) {
        if (parsedBlocks[i] && parsedBlocks[i].length > 0) {
          const block = batch[i];
          const textBeforeLlm = textsBeforeLlm[i];
          const { tag, innerHtml, text } = parseBlockTagAndContent(parsedBlocks[i], block.elementTag);
          block.elementTag = tag;
          block.correctedHtml = innerHtml;
          block.correctedText = text;

          if (block.correctedText !== textBeforeLlm) {
            const llmLog: DebugLogEntry = {
              id: `llm-${block.id}-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString('tr-TR'),
              source: 'llm',
              ruleName: `LLM (${options.model})`,
              chapterId,
              chapterTitle,
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
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      console.warn('Toplu blok LLM uyarısı:', err);
    }
  }

  const cacheEntries: Omit<Parameters<typeof saveBatchCachedCorrections>[0][0], 'key' | 'timestamp'>[] = [];

  for (const block of batch) {
    const { fixedWordCount } = computeTextDiff(block.originalText, block.correctedText);
    block.diffCount = fixedWordCount;
    block.status = 'completed';

    cacheEntries.push({
      originalText: block.originalText,
      correctedHtml: block.correctedHtml,
      correctedText: block.correctedText,
      diffCount: fixedWordCount,
      model: options.model,
      provider: options.provider || 'default',
    });
  }

  if (cacheEntries.length > 0) {
    saveBatchCachedCorrections(cacheEntries).catch((e) =>
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
  for (const ch of chapters) {
    ch.title = applyTurkishRegexPreClean(ch.title);
    callbacks?.onChapterUpdated?.(ch);
  }

  if (!options.useLlm || !isProviderReady(options) || chapters.length === 0) {
    return;
  }

  const titlesList = chapters
    .map((ch, idx) => `[TITLE_${idx}] ${ch.title}`)
    .join('\n');

  const prompt = `Aşağıda bir kitabın bölümlerine ait başlık listesi yer almaktadır. Lütfen bu başlıklardaki OCR, harf birleşme (rn->m, cl->d, l< -> k vb.) ve bozuk karakter hatalarını aslına uygun düzgün Türkçe başlıklar olarak düzelt. Her başlığı [TITLE_X] Düzeltilmiş Başlık formatında tek tek satır olarak geri ver:\n\n${titlesList}`;

  try {
    const response = await callLlmCorrection({
      options,
      content: prompt,
      signal,
    });

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
    console.warn('Başlıkları AI ile iyileştirme uyarısı:', err);
  }
}

/**
 * Main Controller to process selected chapters with concurrency control and smart filtering.
 */
export async function processEpubChapters(
  chapters: EpubChapter[],
  options: ProcessingOptions,
  callbacks: ProcessorCallbacks,
  signal?: AbortSignal
): Promise<void> {
  await refineChapterTitlesWithAi(chapters, options, callbacks, signal);

  const selectedChapters = chapters.filter((c) => c.isSelected);
  const totalBlocks = selectedChapters.reduce((acc, c) => acc + c.blocks.length, 0);
  const scanMode = options.scanMode || 'smart';

  const stats: ProcessingStats = {
    totalChapters: selectedChapters.length,
    completedChapters: 0,
    totalBlocks,
    processedBlocks: 0,
    totalFixedWords: 0,
    startTime: Date.now(),
    elapsedSeconds: 0,
  };

  callbacks.onStatsUpdated?.({ ...stats });

  for (const chapter of selectedChapters) {
    if (signal?.aborted) break;

    chapter.status = 'processing';
    chapter.errorMessage = undefined;
    callbacks.onChapterUpdated?.(chapter);

    try {
      const suspiciousBlocks: TextBlock[] = [];

      // 1. First Pass: Cache Lookup & Regex Pre-Cleaning
      for (const block of chapter.blocks) {
        if (options.useLlm) {
          const cached = await getCachedCorrection(options.model, block.originalText);
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
        if (options.useRegexPreClean) {
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

        if (scanMode === 'rules_only') {
          // Instant completion without LLM
          block.status = 'completed';
          stats.processedBlocks++;
          stats.totalFixedWords += block.diffCount;
          chapter.stats.processedBlocks++;
          chapter.stats.fixedWords += block.diffCount;
          callbacks.onBlockUpdated?.(chapter.id, block);
        } else if (scanMode === 'smart') {
          // Check if block has OCR anomalies or was modified
          const isSuspicious = hasOcrAnomaly(block.originalText) || block.diffCount > 0;
          if (isSuspicious && options.useLlm && isProviderReady(options)) {
            suspiciousBlocks.push(block);
          } else {
            // Already clean block
            block.status = 'completed';
            stats.processedBlocks++;
            stats.totalFixedWords += block.diffCount;
            chapter.stats.processedBlocks++;
            chapter.stats.fixedWords += block.diffCount;
            callbacks.onBlockUpdated?.(chapter.id, block);
          }
        } else {
          // 'deep_llm': send all blocks
          if (options.useLlm && isProviderReady(options)) {
            suspiciousBlocks.push(block);
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

      callbacks.onStatsUpdated?.({ ...stats });

      // 2. Second Pass: LLM on suspicious / target blocks only
      if (suspiciousBlocks.length > 0 && options.useLlm && isProviderReady(options)) {
        const batches = createBlockBatches(suspiciousBlocks, options.chunkSize || 3000);
        const concurrency = Math.max(1, Math.min(options.concurrency || 1, 2));

        for (let i = 0; i < batches.length; i += concurrency) {
          if (signal?.aborted) break;

          const currentBatches = batches.slice(i, i + concurrency);
          await Promise.all(
            currentBatches.map(async (batch) => {
              await processLlmBatch(
                batch,
                options,
                chapter.id,
                chapter.title,
                callbacks,
                signal
              );

              for (const block of batch) {
                stats.processedBlocks++;
                stats.totalFixedWords += block.diffCount;
                chapter.stats.processedBlocks++;
                chapter.stats.fixedWords += block.diffCount;
                callbacks.onBlockUpdated?.(chapter.id, block);
              }
            })
          );

          // Polite throttle delay between LLM batches to respect OpenRouter rate limits
          if (i + concurrency < batches.length && !signal?.aborted) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }

          stats.elapsedSeconds = Math.round((Date.now() - (stats.startTime || Date.now())) / 1000);
          if (stats.processedBlocks > 0) {
            const speed = stats.processedBlocks / stats.elapsedSeconds;
            const remainingBlocks = stats.totalBlocks - stats.processedBlocks;
            stats.estimatedRemainingSeconds = speed > 0 ? Math.round(remainingBlocks / speed) : 0;
          }
          callbacks.onStatsUpdated?.({ ...stats });
        }
      }

      const headingBlock = chapter.blocks.find(
        (b) => b.elementTag === 'h1' || b.elementTag === 'h2' || b.elementTag === 'h3'
      );
      if (headingBlock && headingBlock.correctedText.trim().length > 0 && headingBlock.correctedText.length < 75) {
        chapter.title = headingBlock.correctedText.trim();
      }

      chapter.status = 'completed';
      stats.completedChapters++;
      callbacks.onChapterUpdated?.(chapter);
      callbacks.onStatsUpdated?.({ ...stats });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        chapter.status = 'idle';
        callbacks.onChapterUpdated?.(chapter);
        break;
      }
      const msg = err instanceof Error ? err.message : String(err);
      chapter.status = 'error';
      chapter.errorMessage = msg;
      callbacks.onError?.(chapter.id, msg);
      callbacks.onChapterUpdated?.(chapter);
    }
  }
}
