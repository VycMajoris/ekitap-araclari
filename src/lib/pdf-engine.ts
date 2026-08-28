import { EpubMetadata, EpubChapter, TextBlock, PdfCropBounds, EpubImageAsset } from './types';
import { createEpubFromChapters } from './epub-engine';
import JSZip from 'jszip';

export type { PdfCropBounds, EpubImageAsset } from './types';

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
  cropBounds?: PdfCropBounds;
  preserveAllLines?: boolean;
  extractImages?: boolean;
  onProgress?: (progress: PdfParseProgress) => void;
}

export interface PdfRepresentativePageInfo {
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
  recommendedCrop: PdfCropBounds;
  textItemCount: number;
  isScannedImageOnly: boolean;
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
  isImageHtml?: boolean;
  imageAsset?: EpubImageAsset;
}

const FINISHED_WORD_OR_SUFFIX_REGEX = /(?:[dt][ıiuü]m|[dt][ıiuü]n|[dt][ıiuü]k|[dt][ıiuü]n[ıiuü]z|[dt][ıiuü]ler|m[ıiuü]şt[ıiuü]m|m[ıiuü]şt[ıiuü]n|m[ıiuü]şt[ıiuü]k|m[ıiuü]şt[ıiuü]ler|m[ıiuü]ş|m[ıiuü]şiz|m[ıiuü]şsiniz|m[ıiuü]şler|[ıiuü]?yor|[ıiuü]?yorum|[ıiuü]?yorsun|[ıiuü]?yoruz|[ıiuü]?yorsunuz|[ıiuü]?yorlar|[ae]c[ae]k|[ae]c[ae]ğ[ıi]m|[ae]c[ae]ksin|[ae]c[ae]ğiz|[ae]c[ae]ksiniz|[ae]c[ae]kl[ae]r|[ıiuü]r|[ae]r|m[ae]l[ıi]|m[ae]l[ıi]y[ıi]m|m[ae]l[ıi]sin|m[ae]l[ıi]yiz|s[ae]m|s[ae]n|s[ae]k|s[ae]niz|s[ae]l[ae]r|[ae]r[ae]k|[ıiuü]nc[ae]|d[ıiuü]ğ[ıi]|d[ıiuü]kt[ae]n|m[ae]d[ae]n|y[ae]n|[ae]n|d[ıiuü]kç[ae]|k[ae]n|[dt][ıiuü]r|[dt][ıiuü]|[dt][ae]n|[dt][ae]|l[ae]r|l[ae]ri|l[ae]re|l[ae]rd[ae]|l[ae]rd[ae]n|[ıiuü]n|[ıiuü]m|[ıiuü]z|s[ıiuü]|s[ıiuü]n[ıiuü]|s[ıiuü]n[ae]|s[ıiuü]nd[ae]|s[ıiuü]nd[ae]n|y[ae]|y[ıiuü]|n[ıiuü]n|n[ıiuü]|n[ae]|nd[ae]|nd[ae]n|'dur|'dür|'dır|'dir|'tur|'tür|'tır|'tir)$/i;

export async function getPdfJs() {
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

async function analyzePdfPage(
  pdfDoc: any,
  pageNum: number
): Promise<{
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
  textItemCount: number;
  rawBounds: { minX: number; maxX: number; minY: number; maxY: number };
  detectedCrop: PdfCropBounds;
}> {
  const totalPages = pdfDoc.numPages;
  const safePageNum = Math.max(1, Math.min(totalPages, pageNum));

  const page = await pdfDoc.getPage(safePageNum);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent({ includeMarkedContent: true });

  let minX = viewport.width;
  let maxX = 0;
  let minY = viewport.height;
  let maxY = 0;
  let textItemCount = 0;

  for (const item of textContent.items) {
    if (!('str' in item) || !item.str || !item.str.trim()) continue;
    const transform = item.transform;
    const tx = transform[4];
    const ty = transform[5];
    const fontSize = Math.abs(transform[3]) || item.height || 12;
    const topY = viewport.height - ty;
    const itemWidth = item.width || item.str.length * (fontSize * 0.5);
    const itemHeight = item.height || fontSize;

    minX = Math.min(minX, tx);
    maxX = Math.max(maxX, tx + itemWidth);
    minY = Math.min(minY, topY);
    maxY = Math.max(maxY, topY + itemHeight);
    textItemCount++;
  }

  const hasText = textItemCount > 0 && minX < maxX && minY < maxY;
  const detectedCrop: PdfCropBounds = hasText
    ? {
        topPercent: Math.max(0, Math.min(0.25, Math.floor((minY / viewport.height) * 100) / 100)),
        bottomPercent: Math.max(0, Math.min(0.25, Math.floor((1 - (maxY / viewport.height)) * 100) / 100)),
        leftPercent: Math.max(0, Math.min(0.25, Math.floor((minX / viewport.width) * 100) / 100)),
        rightPercent: Math.max(0, Math.min(0.25, Math.floor((1 - (maxX / viewport.width)) * 100) / 100)),
      }
    : { topPercent: 0, bottomPercent: 0, leftPercent: 0, rightPercent: 0 };

  return {
    pageNumber: safePageNum,
    totalPages,
    width: viewport.width,
    height: viewport.height,
    textItemCount,
    rawBounds: { minX, maxX, minY, maxY },
    detectedCrop,
  };
}

export async function getPdfPageInfo(
  fileData: ArrayBuffer | File,
  pageNum: number
): Promise<{
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
  textItemCount: number;
  rawBounds: { minX: number; maxX: number; minY: number; maxY: number };
  detectedCrop: PdfCropBounds;
}> {
  let buffer: ArrayBuffer;
  if (fileData instanceof File) {
    buffer = await fileData.arrayBuffer();
  } else {
    buffer = fileData;
  }

  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer.slice(0)),
    useSystemFonts: true,
  });
  const pdfDoc = await loadingTask.promise;
  return analyzePdfPage(pdfDoc, pageNum);
}

export async function findRepresentativePdfPage(
  fileData: ArrayBuffer | File
): Promise<PdfRepresentativePageInfo> {
  let buffer: ArrayBuffer;
  if (fileData instanceof File) {
    buffer = await fileData.arrayBuffer();
  } else {
    buffer = fileData;
  }

  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer.slice(0)),
    useSystemFonts: true,
  });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  if (totalPages <= 1) {
    const info = await analyzePdfPage(pdfDoc, 1);
    return {
      pageNumber: 1,
      totalPages: 1,
      width: info.width,
      height: info.height,
      recommendedCrop: info.detectedCrop,
      textItemCount: info.textItemCount,
      isScannedImageOnly: info.textItemCount === 0,
    };
  }

  const candidates = new Set<number>();
  candidates.add(Math.max(1, Math.round(totalPages * 0.2)));
  candidates.add(Math.max(1, Math.round(totalPages * 0.35)));
  candidates.add(Math.max(1, Math.round(totalPages * 0.5)));
  candidates.add(Math.max(1, Math.round(totalPages * 0.65)));
  candidates.add(Math.max(1, Math.round(totalPages * 0.8)));
  if (totalPages >= 5) candidates.add(5);
  if (totalPages >= 10) candidates.add(10);
  candidates.add(1);

  let bestPage = Math.round(totalPages * 0.5) || 1;
  let maxTextItems = -1;
  let bestInfo: Awaited<ReturnType<typeof analyzePdfPage>> | null = null;

  for (const pageNum of Array.from(candidates).sort((a, b) => a - b)) {
    if (pageNum > totalPages || pageNum < 1) continue;
    try {
      const info = await analyzePdfPage(pdfDoc, pageNum);
      if (info.textItemCount > maxTextItems) {
        maxTextItems = info.textItemCount;
        bestPage = pageNum;
        bestInfo = info;
      }
    } catch (e) {
      console.warn(`Sayfa ${pageNum} analizi atlandı:`, e);
    }
  }

  if (!bestInfo) {
    bestInfo = await analyzePdfPage(pdfDoc, 1);
  }

  return {
    pageNumber: bestPage,
    totalPages,
    width: bestInfo.width,
    height: bestInfo.height,
    recommendedCrop: bestInfo.detectedCrop,
    textItemCount: bestInfo.textItemCount,
    isScannedImageOnly: maxTextItems === 0,
  };
}

function encodeBmpImage(
  width: number,
  height: number,
  rawData: Uint8Array | Uint8ClampedArray,
  channels: number
): Uint8Array {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  buffer[0] = 0x42;
  buffer[1] = 0x4D;
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);

  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);

  let offset = 54;
  const totalPixels = width * height;

  let isAllZeroAlpha = false;
  let hasRealAlpha = false;
  if (channels === 4 && rawData.length >= totalPixels * 4) {
    let nonZeroAlpha = 0;
    let non255Alpha = 0;
    for (let p = 3; p < totalPixels * 4; p += 4) {
      if (rawData[p] !== 0) nonZeroAlpha++;
      if (rawData[p] !== 255) non255Alpha++;
    }
    isAllZeroAlpha = nonZeroAlpha === 0;
    hasRealAlpha = !isAllZeroAlpha && non255Alpha > 0;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * channels;
      let r = 0;
      let g = 0;
      let b = 0;

      if (channels === 1) {
        const v = rawData[srcIdx] ?? 0;
        r = v;
        g = v;
        b = v;
      } else if (channels === 3) {
        r = rawData[srcIdx] ?? 0;
        g = rawData[srcIdx + 1] ?? 0;
        b = rawData[srcIdx + 2] ?? 0;
      } else if (channels === 4) {
        const rawR = rawData[srcIdx] ?? 0;
        const rawG = rawData[srcIdx + 1] ?? 0;
        const rawB = rawData[srcIdx + 2] ?? 0;
        const rawA = isAllZeroAlpha ? 255 : (rawData[srcIdx + 3] ?? 255);

        if (hasRealAlpha && rawA < 255) {
          const normA = rawA / 255;
          r = Math.round(rawR * normA + 255 * (1 - normA));
          g = Math.round(rawG * normA + 255 * (1 - normA));
          b = Math.round(rawB * normA + 255 * (1 - normA));
        } else {
          r = rawR;
          g = rawG;
          b = rawB;
        }
      }

      buffer[offset++] = b;
      buffer[offset++] = g;
      buffer[offset++] = r;
    }
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      buffer[offset++] = 0;
    }
  }

  return buffer;
}

async function extractImagesFromPage(
  page: any,
  pageNum: number,
  pdfjsLib: any,
  imageCounterRef: { count: number }
): Promise<EpubImageAsset[]> {
  const images: EpubImageAsset[] = [];
  try {
    const ops = await page.getOperatorList();
    const fnArray = ops.fnArray;
    const argsArray = ops.argsArray;

    const isImageOp = (fn: number) => {
      if (!pdfjsLib.OPS) return false;
      return (
        fn === pdfjsLib.OPS.paintImageXObject ||
        fn === pdfjsLib.OPS.paintInlineImageXObject ||
        fn === pdfjsLib.OPS.paintInlineImageXObjectGroup ||
        fn === pdfjsLib.OPS.paintImageMaskXObject ||
        fn === pdfjsLib.OPS.paintImageMaskXObjectGroup ||
        fn === pdfjsLib.OPS.paintSolidColorImageMask ||
        fn === pdfjsLib.OPS.paintImageXObjectRepeat ||
        fn === pdfjsLib.OPS.paintImageMaskXObjectRepeat ||
        fn === pdfjsLib.OPS.paintJpegXObject
      );
    };

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];

      if (isImageOp(fn)) {
        if (!args || args.length === 0) continue;
        const arg0 = args[0];
        if (!arg0) continue;

        try {
          let imgObj: any = null;

          if (typeof arg0 === 'object' && arg0 !== null) {
            imgObj = arg0;
          } else if (typeof arg0 === 'string') {
            const objId = arg0;
            imgObj = await new Promise<any>((resolve) => {
              let settled = false;
              const timer = setTimeout(() => {
                if (!settled) {
                  settled = true;
                  resolve(null);
                }
              }, 10000);

              const done = (data: any) => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  resolve(data);
                }
              };

              const isCommon =
                objId.startsWith('g_') ||
                (page.commonObjs && typeof page.commonObjs.has === 'function' && page.commonObjs.has(objId));
              const objStore = isCommon ? page.commonObjs : page.objs;

              if (objStore && typeof objStore.get === 'function') {
                objStore.get(objId, done);
              } else if (page.objs && typeof page.objs.get === 'function') {
                page.objs.get(objId, done);
              } else if (page.commonObjs && typeof page.commonObjs.get === 'function') {
                page.commonObjs.get(objId, done);
              } else {
                done(null);
              }
            });
          }

          if (!imgObj) continue;

          const width =
            imgObj.width ||
            (imgObj.bitmap && imgObj.bitmap.width) ||
            (imgObj.image && imgObj.image.width) ||
            (imgObj.canvas && imgObj.canvas.width) ||
            imgObj.naturalWidth ||
            0;
          const height =
            imgObj.height ||
            (imgObj.bitmap && imgObj.bitmap.height) ||
            (imgObj.image && imgObj.image.height) ||
            (imgObj.canvas && imgObj.canvas.height) ||
            imgObj.naturalHeight ||
            0;

          if (!width || !height || width < 25 || height < 25) continue;

          let imgBytes: Uint8Array | null = null;
          const mediaType = typeof document !== 'undefined' ? 'image/jpeg' : 'image/bmp';

          if (typeof document !== 'undefined') {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);

                let drawn = false;

                const drawableSource =
                  imgObj.bitmap ||
                  (imgObj.image && typeof imgObj.image === 'object' ? imgObj.image : null) ||
                  (imgObj.canvas && typeof imgObj.canvas === 'object' ? imgObj.canvas : null) ||
                  (typeof ImageBitmap !== 'undefined' && imgObj instanceof ImageBitmap ? imgObj : null) ||
                  (typeof HTMLImageElement !== 'undefined' && imgObj instanceof HTMLImageElement ? imgObj : null) ||
                  (typeof HTMLCanvasElement !== 'undefined' && imgObj instanceof HTMLCanvasElement ? imgObj : null) ||
                  (typeof OffscreenCanvas !== 'undefined' && imgObj instanceof OffscreenCanvas ? imgObj : null);

                if (drawableSource) {
                  try {
                    ctx.drawImage(drawableSource, 0, 0, width, height);
                    drawn = true;
                  } catch (drawErr) {
                    console.warn('Canvas drawImage hatası, piksel işleme deneniyor:', drawErr);
                  }
                }

                if (!drawn && imgObj.data) {
                  const raw = imgObj.data;
                  const imgData = ctx.createImageData(width, height);
                  const totalPixels = width * height;
                  const isCMYK = imgObj.isCMYK || imgObj.colorSpace === 'DeviceCMYK' || imgObj.kind === 4;
                  const isMask =
                    imgObj.isMask ||
                    fn === pdfjsLib.OPS.paintImageMaskXObject ||
                    fn === pdfjsLib.OPS.paintImageMaskXObjectGroup ||
                    fn === pdfjsLib.OPS.paintSolidColorImageMask;
                  const inverseDecode = imgObj.inverseDecode === true;

                  if (isCMYK && raw.length >= totalPixels * 4) {
                    for (let p = 0, q = 0; p < totalPixels * 4; p += 4, q += 4) {
                      const c = raw[p] / 255;
                      const m = raw[p + 1] / 255;
                      const y = raw[p + 2] / 255;
                      const k = raw[p + 3] / 255;
                      imgData.data[q] = Math.round(255 * (1 - c) * (1 - k));
                      imgData.data[q + 1] = Math.round(255 * (1 - m) * (1 - k));
                      imgData.data[q + 2] = Math.round(255 * (1 - y) * (1 - k));
                      imgData.data[q + 3] = 255;
                    }
                  } else if (raw.length >= totalPixels * 4) {
                    let nonZeroAlpha = 0;
                    let non255Alpha = 0;
                    for (let p = 3; p < totalPixels * 4; p += 4) {
                      if (raw[p] !== 0) nonZeroAlpha++;
                      if (raw[p] !== 255) non255Alpha++;
                    }
                    const isAllZeroAlpha = nonZeroAlpha === 0;
                    const hasAlpha = !isAllZeroAlpha && non255Alpha > 0;

                    for (let p = 0, q = 0; p < totalPixels * 4; p += 4, q += 4) {
                      const r = raw[p];
                      const g = raw[p + 1];
                      const b = raw[p + 2];
                      const a = isAllZeroAlpha ? 255 : raw[p + 3];

                      if (hasAlpha && a < 255) {
                        const normA = a / 255;
                        imgData.data[q] = Math.round(r * normA + 255 * (1 - normA));
                        imgData.data[q + 1] = Math.round(g * normA + 255 * (1 - normA));
                        imgData.data[q + 2] = Math.round(b * normA + 255 * (1 - normA));
                        imgData.data[q + 3] = 255;
                      } else {
                        imgData.data[q] = r;
                        imgData.data[q + 1] = g;
                        imgData.data[q + 2] = b;
                        imgData.data[q + 3] = 255;
                      }
                    }
                  } else if (raw.length >= totalPixels * 3) {
                    for (let p = 0, q = 0; p < totalPixels * 3; p += 3, q += 4) {
                      imgData.data[q] = raw[p];
                      imgData.data[q + 1] = raw[p + 1];
                      imgData.data[q + 2] = raw[p + 2];
                      imgData.data[q + 3] = 255;
                    }
                  } else if (raw.length >= totalPixels) {
                    for (let p = 0, q = 0; p < totalPixels; p++, q += 4) {
                      const v = raw[p];
                      imgData.data[q] = v;
                      imgData.data[q + 1] = v;
                      imgData.data[q + 2] = v;
                      imgData.data[q + 3] = 255;
                    }
                  } else if (raw.length >= Math.ceil(width / 8) * height) {
                    const bytesPerRow = Math.ceil(width / 8);
                    const defaultOneIsWhite = !isMask;
                    const oneIsWhite = inverseDecode ? !defaultOneIsWhite : defaultOneIsWhite;

                    let q = 0;
                    for (let y = 0; y < height; y++) {
                      const rowOffset = y * bytesPerRow;
                      for (let x = 0; x < width; x++) {
                        const byteIdx = rowOffset + (x >> 3);
                        const bitIdx = 7 - (x & 7);
                        const bitVal = byteIdx < raw.length ? (raw[byteIdx] >> bitIdx) & 1 : 0;
                        const isWhite = bitVal === 1 ? oneIsWhite : !oneIsWhite;
                        const v = isWhite ? 255 : 0;
                        imgData.data[q] = v;
                        imgData.data[q + 1] = v;
                        imgData.data[q + 2] = v;
                        imgData.data[q + 3] = 255;
                        q += 4;
                      }
                    }
                  }
                  ctx.putImageData(imgData, 0, 0);
                }

                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                const base64Data = dataUrl.split(',')[1];
                if (base64Data) {
                  const binaryStr = atob(base64Data);
                  const len = binaryStr.length;
                  const bytes = new Uint8Array(len);
                  for (let b = 0; b < len; b++) {
                    bytes[b] = binaryStr.charCodeAt(b);
                  }
                  imgBytes = bytes;
                }
              }
            } catch (canvasErr) {
              console.warn('Canvas görsel dönüştürme hatası:', canvasErr);
            }
          } else {
            if (imgObj.data instanceof Uint8Array || imgObj.data instanceof Uint8ClampedArray) {
              const channels =
                imgObj.data.length >= width * height * 4
                  ? 4
                  : imgObj.data.length >= width * height * 3
                  ? 3
                  : 1;
              imgBytes = encodeBmpImage(width, height, imgObj.data, channels);
            } else {
              imgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
            }
          }

          if (imgBytes && imgBytes.length > 0) {
            imageCounterRef.count++;
            const imgId = `img_p${pageNum}_${imageCounterRef.count}`;
            const href = `OEBPS/images/${imgId}.jpg`;
            images.push({
              id: imgId,
              href,
              data: imgBytes,
              mediaType: 'image/jpeg',
              isCover: pageNum === 1 && imageCounterRef.count === 1 && width > 300,
            });
          }
        } catch (imgErr) {
          console.warn(`Görsel ayrıştırılamadı (Sayfa ${pageNum}):`, imgErr);
        }
      }
    }
  } catch (err) {
    console.warn(`Sayfa ${pageNum} görsel tarama uyarısı:`, err);
  }
  return images;
}

function isHeaderOrFooter(
  line: TextLine,
  pageHeight: number,
  headerMargin: number,
  footerMargin: number,
  medianFontSize: number,
  pageNumber?: number,
  preserveAllLines?: boolean
): boolean {
  if (preserveAllLines) {
    return false;
  }

  const topLimit = pageHeight * headerMargin;
  const bottomLimit = pageHeight * (1 - footerMargin);

  const isTop = line.y <= topLimit;
  const isBottom = line.y >= bottomLimit;
  const isOutsideMargins = isTop || isBottom;

  const trimmed = line.text.trim();

  if (isOutsideMargins) {
    if (/^[-—~–•*[\]()]?\s*\d{1,4}\.?\s*[-—~–•*[\]()]?$/i.test(trimmed)) return true;
    if (/^[-—~–•*[\]()]?\s*[IVXLCDMivxlcdm]{1,8}\.?\s*[-—~–•*[\]()]?$/i.test(trimmed)) return true;
    if (/^(?:sayfa|page|s\.)\s*\d{1,4}\.?$/i.test(trimmed)) return true;
    if (pageNumber !== undefined && new RegExp(`^[-—~–•*[\\]()\\s]*${pageNumber}\\.?[ -—~–•*[\\]()\\s]*$`).test(trimmed)) return true;

    if (isTop && trimmed.length <= 80 && !/[.?!]$/.test(trimmed)) {
      return true;
    }
    if (isBottom && trimmed.length <= 60 && !/[.?!]$/.test(trimmed)) {
      return true;
    }
  }

  if (line.fontSize <= medianFontSize * 1.15 && /^\d{1,4}\.?$/.test(trimmed)) {
    if (pageNumber !== undefined && Math.abs(parseInt(trimmed, 10) - pageNumber) <= 1) {
      if (line.y <= Math.max(topLimit, pageHeight * 0.1) || line.y >= Math.min(bottomLimit, pageHeight * 0.9)) {
        return true;
      }
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
        const spaceThreshold = Math.max(2.4, avgFontSize * 0.24);

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
  const crop: PdfCropBounds = options?.cropBounds || {
    topPercent: options?.headerMarginPercent ?? 0.04,
    bottomPercent: options?.footerMarginPercent ?? 0.04,
    leftPercent: 0,
    rightPercent: 0,
  };

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
    data: new Uint8Array(buffer.slice(0)),
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
  const allExtractedImages: EpubImageAsset[] = [];
  const imageCounterRef = { count: 0 };

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    options?.onProgress?.({
      currentPage: pageNum,
      totalPages,
      stage: 'extracting',
      message: `Sayfa ${pageNum} / ${totalPages} ayrıştırılıyor...`,
    });

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    let pageImages: EpubImageAsset[] = [];
    if (options?.extractImages) {
      pageImages = await extractImagesFromPage(page, pageNum, pdfjsLib, imageCounterRef);
    }

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

    if (options?.extractImages && pageImages.length === 0 && rawItems.length === 0 && typeof document !== 'undefined') {
      try {
        const renderCanvas = document.createElement('canvas');
        renderCanvas.width = viewport.width;
        renderCanvas.height = viewport.height;
        const renderCtx = renderCanvas.getContext('2d');
        if (renderCtx) {
          renderCtx.fillStyle = '#ffffff';
          renderCtx.fillRect(0, 0, viewport.width, viewport.height);
          const renderTask = page.render({
            canvas: renderCanvas,
            canvasContext: renderCtx,
            viewport: viewport,
          });
          await renderTask.promise;
          const dataUrl = renderCanvas.toDataURL('image/jpeg', 0.92);
          const base64Data = dataUrl.split(',')[1];
          if (base64Data) {
            const binaryStr = atob(base64Data);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let b = 0; b < len; b++) {
              bytes[b] = binaryStr.charCodeAt(b);
            }
            imageCounterRef.count++;
            const imgId = `img_p${pageNum}_${imageCounterRef.count}`;
            const href = `OEBPS/images/${imgId}.jpg`;
            pageImages.push({
              id: imgId,
              href,
              data: bytes,
              mediaType: 'image/jpeg',
              isCover: pageNum === 1 && imageCounterRef.count === 1,
            });
          }
        }
      } catch (pageRenderErr) {
        console.warn(`Sayfa ${pageNum} görsel tarama yedeği uyarısı:`, pageRenderErr);
      }
    }

    if (pageImages.length > 0) {
      allExtractedImages.push(...pageImages);
    }

    const pageParagraphs: ExtractedParagraph[] = [];

    if (rawItems.length > 0) {
      const pageLines = buildLinesFromItems(rawItems);

      fontSizes.sort((a, b) => a - b);
      const medianFontSize = fontSizes.length > 0 ? fontSizes[Math.floor(fontSizes.length / 2)] : 12;

      const topCutoff = viewport.height * crop.topPercent;
      const bottomCutoff = viewport.height * (1 - crop.bottomPercent);
      const leftCutoff = viewport.width * crop.leftPercent;
      const rightCutoff = viewport.width * (1 - crop.rightPercent);

      const filteredLines = pageLines.filter((line) => {
        if (!options?.preserveAllLines) {
          if (line.y < topCutoff || line.y > bottomCutoff) return false;
          if (line.maxX < leftCutoff || line.minX > rightCutoff) return false;
        }

        return !isHeaderOrFooter(
          line,
          viewport.height,
          crop.topPercent,
          crop.bottomPercent,
          medianFontSize,
          pageNum,
          options?.preserveAllLines
        );
      });

      const textParagraphs = reflowLinesToParagraphs(filteredLines, pageNum, medianFontSize);
      pageParagraphs.push(...textParagraphs);
    }

    if (pageImages.length > 0) {
      for (const img of pageImages) {
        const relHref = img.href.replace(/^OEBPS\//, '');
        pageParagraphs.push({
          text: `<figure class="epub-figure"><img src="${escapeXml(relHref)}" alt="Görsel (Sayfa ${pageNum})" /></figure>`,
          isHeading: false,
          pageNumber: pageNum,
          isImageHtml: true,
          imageAsset: img,
        });
      }
    }

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

  const consolidatedParagraphs: ExtractedParagraph[] = [];

  for (let i = 0; i < allPageParagraphs.length; i++) {
    const pageData = allPageParagraphs[i];
    for (const p of pageData.paragraphs) {
      if (p.isImageHtml) {
        consolidatedParagraphs.push(p);
        continue;
      }

      const trimmed = p.text.trim();
      if (!trimmed) continue;

      if (trimmed.length <= 2 && /^[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+$/i.test(trimmed)) {
        continue;
      }
      if (/^[a-zA-ZçğıöşüÇĞİÖŞÜ]\s*["']?$/.test(trimmed)) {
        continue;
      }

      if (consolidatedParagraphs.length > 0 && !p.isHeading) {
        const lastP = consolidatedParagraphs[consolidatedParagraphs.length - 1];
        if (!lastP.isHeading && !lastP.isImageHtml) {
          const lastText = lastP.text.trim();
          const lastEndsWithPunct = /[.?!:»"']\s*$/.test(lastText);
          const currentStartsWithLower = /^[a-zçğıöşü]/.test(trimmed);

          if (lastText.endsWith('-')) {
            lastP.text = lastText.slice(0, -1) + trimmed;
            lastP.pageNumber = p.pageNumber;
            continue;
          } else if (!lastEndsWithPunct && currentStartsWithLower) {
            lastP.text = lastText + ' ' + trimmed;
            lastP.pageNumber = p.pageNumber;
            continue;
          }
        }
      }

      consolidatedParagraphs.push(p);
    }
  }

  for (const p of consolidatedParagraphs) {
    if (p.isImageHtml) {
      if (!currentChapter) {
        currentChapter = {
          title: metadata.title || 'Bölüm 1',
          startPage: p.pageNumber,
          endPage: p.pageNumber,
          paragraphs: [],
        };
      }
      currentChapter.paragraphs.push(p);
      currentChapter.endPage = p.pageNumber;
      continue;
    }

    if (p.isHeading && p.text.length < 80) {
      const normalizedTitle = collapseLetterSpacing(p.text.trim());
      const isMajorChapterBreak =
        /^(?:(?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SEKİZİNCİ|DOKUZUNCU|ONUNCU|ON\s+BİRİNCİ|ON\s+İKİNCİ|ON\s+ÜÇÜNCÜ|ON\s+DÖRDÜNCÜ|ON\s+BEŞİNCİ|ON\s+ALTINCI|ON\s+YEDİNCİ|ON\s+SEKİZİNCİ|ON\s+DOKUZUNCU|YİRMİNCİ|YİRMİ\s+BİRİNCİ|YİRMİ\s+İKİNCİ)\s+(?:BÖLÜM|KISIM)|(?:BÖLÜM|KISIM|CHAPTER|PART)\s*(?:[0-9]{1,3}|[IVXLCDM]{1,6})?|GİRİŞ|ÖNSÖZ|SON\s*SÖZ|EPİLOG|PROLOG|İÇİNDEKİLER|iÇiNDEKiLER|[0-9]{1,2}\.?$|[IVXLCDM]{1,6}\.?$)/i.test(
          normalizedTitle
        );

      if (currentChapter && (isMajorChapterBreak || currentChapter.paragraphs.length >= 4)) {
        if (currentChapter.paragraphs.length > 0) {
          currentChapter.endPage = p.pageNumber;
          chaptersDrafts.push(currentChapter);
          detectedExplicitChapters++;
        }

        currentChapter = {
          title: normalizedTitle,
          startPage: p.pageNumber,
          endPage: p.pageNumber,
          paragraphs: [p],
        };
        continue;
      } else if (!currentChapter) {
        currentChapter = {
          title: normalizedTitle,
          startPage: p.pageNumber,
          endPage: p.pageNumber,
          paragraphs: [p],
        };
        continue;
      }
    }

    if (!currentChapter) {
      currentChapter = {
        title: metadata.title || 'Bölüm 1',
        startPage: p.pageNumber,
        endPage: p.pageNumber,
        paragraphs: [],
      };
    }

    currentChapter.paragraphs.push(p);
    currentChapter.endPage = p.pageNumber;

    if (
      detectedExplicitChapters === 0 &&
      currentChapter &&
      currentChapter.paragraphs.length >= 30 &&
      p.pageNumber % pagesPerChapterFallback === 0
    ) {
      currentChapter.endPage = p.pageNumber;
      chaptersDrafts.push(currentChapter);
      const nextStart = p.pageNumber + 1;
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
      if (p.isImageHtml) {
        const figureHtml = p.text;
        htmlContent += `    ${figureHtml}\n`;

        blocks.push({
          id: `${chapterNum}-${blockIdx++}`,
          elementTag: 'figure',
          originalHtml: figureHtml,
          originalText: '[Görsel]',
          correctedHtml: figureHtml,
          correctedText: '[Görsel]',
          status: 'completed',
          diffCount: 0,
        });
        continue;
      }

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

  if (allExtractedImages.length > 0) {
    metadata.imageCount = allExtractedImages.length;
  }

  const zip = await createEpubFromChapters(metadata, chapters, allExtractedImages);

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
