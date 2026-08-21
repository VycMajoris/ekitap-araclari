import { EpubMetadata, EpubChapter, TextBlock } from './types';
import { createEpubFromChapters } from './epub-engine';
import JSZip from 'jszip';

export interface PdfParseProgress {
  currentPage: number;
  totalPages: number;
  stage: 'loading' | 'extracting' | 'reflowing' | 'synthesizing';
  message?: string;
}

export interface PdfParseOptions {
  pagesPerChapterFallback?: number;
  headerMarginPercent?: number;
  footerMarginPercent?: number;
  onProgress?: (progress: PdfParseProgress) => void;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
}

interface TextLine {
  y: number;
  minX: number;
  maxX: number;
  height: number;
  fontSize: number;
  text: string;
  isHeading?: boolean;
}

interface ExtractedParagraph {
  text: string;
  isHeading: boolean;
  pageNumber: number;
}

const FINISHED_WORD_OR_SUFFIX_REGEX = /(?:[dt][ıiuü]m|[dt][ıiuü]n|[dt][ıiuü]k|[dt][ıiuü]n[ıiuü]z|[dt][ıiuü]ler|m[ıiuü]şt[ıiuü]m|m[ıiuü]şt[ıiuü]n|m[ıiuü]şt[ıiuü]k|m[ıiuü]şt[ıiuü]ler|m[ıiuü]ş|m[ıiuü]şiz|m[ıiuü]şsiniz|m[ıiuü]şler|[ıiuü]?yor|[ıiuü]?yorum|[ıiuü]?yorsun|[ıiuü]?yoruz|[ıiuü]?yorsunuz|[ıiuü]?yorlar|[ae]c[ae]k|[ae]c[ae]ğ[ıi]m|[ae]c[ae]ksin|[ae]c[ae]ğiz|[ae]c[ae]ksiniz|[ae]c[ae]kl[ae]r|[ıiuü]r|[ae]r|m[ae]l[ıi]|m[ae]l[ıi]y[ıi]m|m[ae]l[ıi]sin|m[ae]l[ıi]yiz|s[ae]m|s[ae]n|s[ae]k|s[ae]niz|s[ae]l[ae]r|[ae]r[ae]k|[ıiuü]nc[ae]|d[ıiuü]ğ[ıi]|d[ıiuü]kt[ae]n|m[ae]d[ae]n|y[ae]n|[ae]n|d[ıiuü]kç[ae]|k[ae]n|[dt][ıiuü]r|[dt][ıiuü]|[dt][ae]n|[dt][ae]|l[ae]r|l[ae]ri|l[ae]re|l[ae]rd[ae]|l[ae]rd[ae]n|[ıiuü]n|[ıiuü]m|[ıiuü]z|s[ıiuü]|s[ıiuü]n[ıiuü]|s[ıiuü]n[ae]|s[ıiuü]nd[ae]|s[ıiuü]nd[ae]n|y[ae]|y[ıiuü]|n[ıiuü]n|n[ıiuü]|n[ae]|nd[ae]|nd[ae]n|'dur|'dür|'dır|'dir|'tur|'tür|'tır|'tir)$/i;

async function getPdfJs() {
  if (typeof window === 'undefined') {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return pdfjsLib;
  }

  const pdfjsLib = await import('pdfjs-dist');
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  } catch (e) {
    console.warn('PDF.js worker initialization warning:', e);
  }

  return pdfjsLib;
}

function isHeaderOrFooter(
  line: TextLine,
  pageHeight: number,
  headerMargin: number,
  footerMargin: number,
  medianFontSize: number,
  pageNumber?: number
): boolean {
  const topLimit = Math.max(48, pageHeight * headerMargin);
  const bottomLimit = Math.min(pageHeight - 48, pageHeight * (1 - footerMargin));

  const isTop = line.y <= topLimit;
  const isBottom = line.y >= bottomLimit;
  const isWideMargin = line.y <= Math.max(65, pageHeight * 0.16) || line.y >= Math.min(pageHeight - 65, pageHeight * 0.84);

  const trimmed = line.text.trim();

  if (isWideMargin || isTop || isBottom) {
    if (/^[-—~–•*[\]()]?\s*\d{1,4}\.?\s*[-—~–•*[\]()]?$/i.test(trimmed)) return true;
    if (/^[-—~–•*[\]()]?\s*[IVXLCDMivxlcdm]{1,8}\.?\s*[-—~–•*[\]()]?$/i.test(trimmed)) return true;
    if (/^(?:sayfa|page|s\.)\s*\d{1,4}\.?$/i.test(trimmed)) return true;
    if (pageNumber !== undefined && new RegExp(`^[-—~–•*[\\]()\\s]*${pageNumber}\\.?[ -—~–•*[\\]()\\s]*$`).test(trimmed)) return true;
  }

  if (isTop) {
    if (trimmed.length < 120) {
      return true;
    }
  }

  if (isBottom) {
    if (trimmed.length < 90) {
      return true;
    }
  }

  if (line.fontSize <= medianFontSize * 1.15 && /^\d{1,4}\.?$/.test(trimmed)) {
    if (pageNumber !== undefined && Math.abs(parseInt(trimmed, 10) - pageNumber) <= 5) {
      return true;
    }
  }

  return false;
}

function collapseLetterSpacing(text: string): string {
  return text.replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])(?:\s+([a-zA-ZçğıöşüÇĞİÖŞÜ0-9])){2,}\b/g, (match) => {
    return match.replace(/\s+/g, '');
  });
}

function isChapterHeadingLine(lineText: string, fontSize: number, medianFontSize: number, lineY?: number): boolean {
  const text = lineText.trim();
  if (!text || text.length > 60) return false;

  if (lineY !== undefined && lineY <= 48) {
    return false;
  }

  if (!/^[A-ZÇĞİÖŞÜ0-9"']/.test(text)) {
    return false;
  }

  if (/[.?!]\s+[A-ZÇĞİÖŞÜ]/.test(text)) {
    return false;
  }

  if (/\.{4,}/.test(text)) {
    return false;
  }

  const normalized = collapseLetterSpacing(text);

  const explicitChapterPattern =
    /^(?:(?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SEKİZİNCİ|DOKUZUNCU|ONUNCU|ON\s+BİRİNCİ|ON\s+İKİNCİ|ON\s+ÜÇÜNCÜ|ON\s+DÖRDÜNCÜ|ON\s+BEŞİNCİ|ON\s+ALTINCI|ON\s+YEDİNCİ|ON\s+SEKİZİNCİ|ON\s+DOKUZUNCU|YİRMİNCİ|YİRMİ\s+BİRİNCİ|YİRMİ\s+İKİNCİ)\s+(?:BÖLÜM|KISIM)|(?:BÖLÜM|KISIM|CHAPTER|PART)\s*(?:[0-9]{1,3}|[IVXLCDM]{1,6})?|GİRİŞ|ÖNSÖZ|SON\s*SÖZ|EPİLOG|PROLOG|İÇİNDEKİLER|iÇiNDEKiLER)\b/i;

  if (explicitChapterPattern.test(normalized) || explicitChapterPattern.test(text)) {
    if (!/^(?:kısım:|bölümde|bölümden|bölümü)\b/i.test(normalized)) {
      return true;
    }
  }

  if (/^(?:SONUÇ|Sonuç)(?:\s+BÖLÜMÜ)?\s*:?$/i.test(text)) {
    return true;
  }

  if (/^(?:bölüm\s*)?(?:[0-9]{1,2}|[IVXLCDM]{1,6})\.?$/i.test(normalized) && fontSize >= medianFontSize * 1.35) {
    return true;
  }

  if (
    fontSize >= medianFontSize * 1.75 &&
    text.length <= 35 &&
    !/[.,;!?:…»"']$/.test(text) &&
    !/^(?:ve|veya|ile|ama|fakat|çünkü|ancak|bu|şu|o|ben|sen|biz|siz|bir|her|de|da|ki|dedi|diye|sonra|şimdi|artık|kadar|olduğunu|yaptığını|istiyorsunuz|düşünüyorsunuz)\b/i.test(text)
  ) {
    const isAllCaps = normalized === normalized.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(normalized) && normalized.length >= 3;
    const isTitleCase = /^[A-ZÇĞİÖŞÜ]/.test(normalized) && !/[a-zçğıöşü]+[A-ZÇĞİÖŞÜ]/.test(normalized) && normalized.length >= 3;
    if (isAllCaps || isTitleCase) {
      return true;
    }
  }

  return false;
}

function buildLinesFromItems(items: RawTextItem[]): TextLine[] {
  if (items.length === 0) return [];

  const yTolerance = 1.5;
  const lineGroups: RawTextItem[][] = [];

  const sortedRaw = [...items].sort((a, b) => a.y - b.y || a.x - b.x);

  for (const it of sortedRaw) {
    let group = lineGroups.find((g) => {
      const avgY = g.reduce((sum, item) => sum + item.y, 0) / g.length;
      return Math.abs(avgY - it.y) <= yTolerance;
    });

    if (!group) {
      group = [];
      lineGroups.push(group);
    }
    group.push(it);
  }

  const lines: TextLine[] = [];

  for (const group of lineGroups) {
    group.sort((a, b) => a.x - b.x);

    const subGroups: RawTextItem[][] = [];
    let currentSubGroup: RawTextItem[] = [];

    for (let i = 0; i < group.length; i++) {
      const it = group[i];
      if (currentSubGroup.length === 0) {
        currentSubGroup.push(it);
        continue;
      }
      const prevIt = currentSubGroup[currentSubGroup.length - 1];
      const prevEndX = prevIt.x + prevIt.width;
      const gap = it.x - prevEndX;

      if (gap > 45) {
        subGroups.push(currentSubGroup);
        currentSubGroup = [it];
      } else {
        currentSubGroup.push(it);
      }
    }
    if (currentSubGroup.length > 0) {
      subGroups.push(currentSubGroup);
    }

    for (const sub of subGroups) {
      let lineText = '';
      let lastEndX = -1;
      let lastFontSize = 12;
      let minX = Infinity;
      let maxX = -Infinity;
      let maxFontSize = 0;
      let avgY = 0;

      for (let i = 0; i < sub.length; i++) {
        const it = sub[i];
        const str = it.str;
        if (!str) continue;

        minX = Math.min(minX, it.x);
        maxX = Math.max(maxX, it.x + it.width);
        maxFontSize = Math.max(maxFontSize, it.fontSize);
        avgY += it.y;

        if (i === 0 || lastEndX < 0) {
          lineText = str;
          lastEndX = it.x + it.width;
          lastFontSize = it.fontSize || 12;
          continue;
        }

        const gap = it.x - lastEndX;
        const avgFontSize = (lastFontSize + (it.fontSize || 12)) / 2 || 12;
        const spaceThreshold = Math.max(1.8, avgFontSize * 0.18);

        const hasTrailingSpace = lineText.endsWith(' ');
        const hasLeadingSpace = str.startsWith(' ');

        if (hasTrailingSpace || hasLeadingSpace) {
          lineText = lineText.trimEnd() + ' ' + str.trimStart();
        } else if (gap >= spaceThreshold) {
          lineText += ' ' + str;
        } else {
          lineText += str;
        }

        lastEndX = it.x + it.width;
        lastFontSize = it.fontSize || lastFontSize;
      }

      if (lineText.trim().length > 0) {
        lines.push({
          y: avgY / sub.length,
          minX,
          maxX,
          height: maxFontSize || 12,
          fontSize: maxFontSize || 12,
          text: lineText.trim(),
        });
      }
    }
  }

  lines.sort((a, b) => a.y - b.y || a.minX - b.minX);
  return lines;
}

function reflowLinesToParagraphs(
  lines: TextLine[],
  pageNumber: number,
  medianFontSize: number
): ExtractedParagraph[] {
  const paragraphs: ExtractedParagraph[] = [];
  let currentPara: string[] = [];
  let currentIsHeading = false;

  const isTocPage = lines.some((l) => /İÇİNDEKİLER|iÇiNDEKiLER|İçindekiler/i.test(l.text) || /\.{4,}/.test(l.text));

  const flushCurrent = () => {
    if (currentPara.length > 0) {
      const fullText = currentPara.join(' ').replace(/\s+/g, ' ').trim();
      if (fullText.length > 0) {
        paragraphs.push({
          text: fullText,
          isHeading: currentIsHeading,
          pageNumber,
        });
      }
      currentPara = [];
      currentIsHeading = false;
    }
  };

  const leftMargins = lines.map((l) => l.minX).sort((a, b) => a - b);
  const pageLeftMargin = leftMargins.length > 0 ? leftMargins[Math.floor(leftMargins.length * 0.15)] : 50;
  const rightMargins = lines.map((l) => l.maxX).sort((a, b) => a - b);
  const pageRightMargin = rightMargins.length > 0 ? rightMargins[Math.floor(rightMargins.length * 0.85)] : 500;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : null;
    const text = line.text.trim();
    if (!text) continue;

    let isHeading = false;
    if (isTocPage) {
      isHeading = /^(?:İÇİNDEKİLER|iÇiNDEKiLER|İçindekiler)$/i.test(text);
    } else {
      isHeading = isChapterHeadingLine(text, line.fontSize, medianFontSize, line.y);
    }

    if (isHeading) {
      flushCurrent();
      paragraphs.push({
        text,
        isHeading: true,
        pageNumber,
      });
      continue;
    }

    if (
      line.fontSize <= medianFontSize * 1.15 &&
      /^[-—~–•*[\]()]?\s*\d{1,4}\.?\s*[-—~–•*[\]()]?$/.test(text)
    ) {
      continue;
    }

    let shouldJoinHyphenatedWord = false;
    let shouldPreserveDashAtLineEnd = false;

    if (currentPara.length > 0) {
      const lastLine = currentPara[currentPara.length - 1];

      if (/[—–]$/.test(lastLine) || /\s-[-\s]*$/.test(lastLine)) {
        shouldPreserveDashAtLineEnd = true;
      } else if (/[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]-$/.test(lastLine)) {
        const lastWordMatch = lastLine.match(/([a-zA-ZçğıöşüÇĞİÖŞÜ0-9']+)-$/);
        const lastWord = lastWordMatch ? lastWordMatch[1] : '';

        const isFinishedWord =
          FINISHED_WORD_OR_SUFFIX_REGEX.test(lastWord) ||
          /^[A-ZÇĞİÖŞÜ]/.test(text) ||
          lastWord.length >= 6;

        if (isFinishedWord) {
          shouldPreserveDashAtLineEnd = true;
        } else {
          shouldJoinHyphenatedWord = true;
        }
      }
    }

    let isNewParagraph = false;

    if (currentPara.length > 0 && prevLine) {
      const lineGap = line.y - prevLine.y;
      const expectedLineHeight = line.fontSize || medianFontSize;
      const lastLineText = currentPara[currentPara.length - 1];
      const prevLineEndedWithSentencePunctuation = /[.?!:»"']\s*$/.test(lastLineText);

      if (/^[—–-]\s+[A-ZÇĞİÖŞÜa-zçğıöşü]/.test(text)) {
        isNewParagraph = true;
      } else if (lineGap > expectedLineHeight * 1.65) {
        isNewParagraph = true;
      } else if (prevLineEndedWithSentencePunctuation) {
        const isIndented = line.minX > pageLeftMargin + 10;
        const prevLineWasShort = prevLine.maxX < pageRightMargin - 40;

        if (isIndented || prevLineWasShort) {
          isNewParagraph = true;
        }
      }
    }

    if (isNewParagraph) {
      flushCurrent();
    }

    if (shouldJoinHyphenatedWord && currentPara.length > 0) {
      const lastIdx = currentPara.length - 1;
      const strippedPrev = currentPara[lastIdx].slice(0, -1);
      currentPara[lastIdx] = strippedPrev + text;
    } else if (shouldPreserveDashAtLineEnd && currentPara.length > 0) {
      const lastIdx = currentPara.length - 1;
      let prev = currentPara[lastIdx];
      if (prev.endsWith('-') && !prev.endsWith(' -')) {
        prev = prev.slice(0, -1) + ' -';
      }
      currentPara[lastIdx] = prev + ' ' + text;
    } else {
      currentPara.push(text);
    }
  }

  flushCurrent();
  return paragraphs;
}

export async function parsePdf(
  fileData: ArrayBuffer | File,
  options?: PdfParseOptions
): Promise<{
  zip: JSZip;
  metadata: EpubMetadata;
  chapters: EpubChapter[];
  pageCount: number;
}> {
  const pagesPerChapterFallback = options?.pagesPerChapterFallback || 15;
  const headerMargin = options?.headerMarginPercent || 0.08;
  const footerMargin = options?.footerMarginPercent || 0.08;

  let buffer: ArrayBuffer;
  let fileName = 'Kitap';

  if (fileData instanceof File) {
    buffer = await fileData.arrayBuffer();
    fileName = fileData.name.replace(/\.pdf$/i, '');
  } else {
    buffer = fileData;
  }

  options?.onProgress?.({
    currentPage: 0,
    totalPages: 0,
    stage: 'loading',
    message: 'PDF dosyası yükleniyor ve hazırlanıyor...',
  });

  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  let docMetadata: Record<string, unknown> = {};
  try {
    const meta = await pdfDoc.getMetadata();
    docMetadata = (meta.info as Record<string, unknown>) || {};
  } catch (e) {
    console.warn('PDF metadata alınamadı:', e);
  }

  const metadata: EpubMetadata = {
    title: (docMetadata.Title as string)?.trim() || fileName || 'Dönüştürülmüş PDF Kitap',
    creator: (docMetadata.Author as string)?.trim() || (docMetadata.Creator as string)?.trim() || undefined,
    language: 'tr',
    publisher: (docMetadata.Producer as string)?.trim() || undefined,
    identifier: `urn:uuid:pdf-${Date.now()}`,
    format: 'pdf',
    pageCount: totalPages,
  };

  const allPageParagraphs: { page: number; paragraphs: ExtractedParagraph[] }[] = [];
  const fontSizes: number[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    options?.onProgress?.({
      currentPage: pageNum,
      totalPages,
      stage: 'extracting',
      message: `Sayfa ${pageNum} / ${totalPages} ayrıştırılıyor...`,
    });

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent({ includeMarkedContent: true });

    const rawItems: RawTextItem[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str) continue;
      const str = item.str;
      if (!str.trim()) continue;

      const transform = item.transform;
      const tx = transform[4];
      const ty = transform[5];
      const fontSize = Math.abs(transform[3]) || item.height || 12;
      const topY = viewport.height - ty;

      rawItems.push({
        str,
        x: tx,
        y: topY,
        width: item.width || str.length * (fontSize * 0.5),
        height: item.height || fontSize,
        fontSize,
        fontName: item.fontName || '',
      });

      fontSizes.push(fontSize);
    }

    if (rawItems.length === 0) continue;

    const pageLines = buildLinesFromItems(rawItems);

    fontSizes.sort((a, b) => a - b);
    const medianFontSize = fontSizes.length > 0 ? fontSizes[Math.floor(fontSizes.length / 2)] : 12;

    const filteredLines = pageLines.filter(
      (line) => !isHeaderOrFooter(line, viewport.height, headerMargin, footerMargin, medianFontSize, pageNum)
    );

    const pageParagraphs = reflowLinesToParagraphs(filteredLines, pageNum, medianFontSize);
    allPageParagraphs.push({ page: pageNum, paragraphs: pageParagraphs });
  }

  options?.onProgress?.({
    currentPage: totalPages,
    totalPages,
    stage: 'reflowing',
    message: 'Bölümler ve metin blokları yapılandırılıyor...',
  });

  interface ChapterDraft {
    title: string;
    startPage: number;
    endPage: number;
    paragraphs: ExtractedParagraph[];
  }

  const chaptersDrafts: ChapterDraft[] = [];
  let currentChapter: ChapterDraft | null = null;
  let detectedExplicitChapters = 0;

  for (const pageData of allPageParagraphs) {
    for (const p of pageData.paragraphs) {
      if (p.isHeading && p.text.length < 80) {
        const normalizedTitle = collapseLetterSpacing(p.text.trim());
        const isMajorChapterBreak =
          /^(?:(?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SEKİZİNCİ|DOKUZUNCU|ONUNCU|ON\s+BİRİNCİ|ON\s+İKİNCİ|ON\s+ÜÇÜNCÜ|ON\s+DÖRDÜNCÜ|ON\s+BEŞİNCİ|ON\s+ALTINCI|ON\s+YEDİNCİ|ON\s+SEKİZİNCİ|ON\s+DOKUZUNCU|YİRMİNCİ|YİRMİ\s+BİRİNCİ|YİRMİ\s+İKİNCİ)\s+(?:BÖLÜM|KISIM)|(?:BÖLÜM|KISIM|CHAPTER|PART)\s*(?:[0-9]{1,3}|[IVXLCDM]{1,6})?|GİRİŞ|ÖNSÖZ|SON\s*SÖZ|EPİLOG|PROLOG|İÇİNDEKİLER|iÇiNDEKiLER|[0-9]{1,2}\.?$|[IVXLCDM]{1,6}\.?$)/i.test(
            normalizedTitle
          );

        if (currentChapter && (isMajorChapterBreak || currentChapter.paragraphs.length >= 4)) {
          if (currentChapter.paragraphs.length > 0) {
            currentChapter.endPage = pageData.page;
            chaptersDrafts.push(currentChapter);
            detectedExplicitChapters++;
          }

          currentChapter = {
            title: normalizedTitle,
            startPage: pageData.page,
            endPage: pageData.page,
            paragraphs: [p],
          };
          continue;
        } else if (!currentChapter) {
          currentChapter = {
            title: normalizedTitle,
            startPage: pageData.page,
            endPage: pageData.page,
            paragraphs: [p],
          };
          continue;
        }
      }

      if (!currentChapter) {
        currentChapter = {
          title: metadata.title || 'Bölüm 1',
          startPage: pageData.page,
          endPage: pageData.page,
          paragraphs: [],
        };
      }

      currentChapter.paragraphs.push(p);
      currentChapter.endPage = pageData.page;
    }

    if (
      detectedExplicitChapters === 0 &&
      currentChapter &&
      currentChapter.paragraphs.length >= 30 &&
      pageData.page % pagesPerChapterFallback === 0
    ) {
      currentChapter.endPage = pageData.page;
      chaptersDrafts.push(currentChapter);
      const nextStart = pageData.page + 1;
      currentChapter = {
        title: `Bölüm ${chaptersDrafts.length + 1} (Sayfa ${nextStart})`,
        startPage: nextStart,
        endPage: nextStart,
        paragraphs: [],
      };
    }
  }

  if (currentChapter && currentChapter.paragraphs.length > 0) {
    chaptersDrafts.push(currentChapter);
  }

  options?.onProgress?.({
    currentPage: totalPages,
    totalPages,
    stage: 'synthesizing',
    message: 'EPUB arşivi ve görsel bloklar oluşturuluyor...',
  });

  const chapters: EpubChapter[] = [];

  for (let cIdx = 0; cIdx < chaptersDrafts.length; cIdx++) {
    const draft = chaptersDrafts[cIdx];
    const chapterNum = cIdx + 1;
    const href = `OEBPS/chapter_${String(chapterNum).padStart(2, '0')}.xhtml`;
    const chapterId = `chapter_${chapterNum}`;

    const blocks: TextBlock[] = [];
    let htmlContent = `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="tr">\n<head>\n  <meta charset="utf-8" />\n  <title>${escapeXml(draft.title)}</title>\n  <link rel="stylesheet" type="text/css" href="styles.css" />\n</head>\n<body>\n  <section class="chapter">\n`;

    let blockIdx = 0;
    for (const p of draft.paragraphs) {
      const tag = p.isHeading ? 'h2' : 'p';
      const escapedText = escapeXml(p.text);
      const elementHtml = `<${tag}>${escapedText}</${tag}>`;
      htmlContent += `    ${elementHtml}\n`;

      blocks.push({
        id: `${chapterNum}-${blockIdx++}`,
        elementTag: tag,
        originalHtml: escapedText,
        originalText: p.text,
        correctedHtml: escapedText,
        correctedText: p.text,
        status: 'pending',
        diffCount: 0,
      });
    }

    htmlContent += `  </section>\n</body>\n</html>`;

    chapters.push({
      id: chapterId,
      href,
      title: draft.title || `Bölüm ${chapterNum}`,
      rawContent: htmlContent,
      blocks,
      isSelected: true,
      status: 'idle',
      stats: {
        totalBlocks: blocks.length,
        processedBlocks: 0,
        fixedWords: 0,
      },
    });
  }

  const zip = await createEpubFromChapters(metadata, chapters);

  return {
    zip,
    metadata,
    chapters,
    pageCount: totalPages,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
