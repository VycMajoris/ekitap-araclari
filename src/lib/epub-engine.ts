import JSZip from 'jszip';
import { EpubMetadata, EpubChapter, TextBlock } from './types';

/**
 * Resolves relative paths inside an EPUB archive.
 */
function resolvePath(baseDir: string, relativePath: string): string {
  if (!baseDir) return relativePath;
  const stack = baseDir.split('/').filter(Boolean);
  const parts = relativePath.split('/');

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

/**
 * Helper to get directory path from a file path.
 */
function getDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash !== -1 ? filePath.substring(0, lastSlash) : '';
}

/**
 * Parse an EPUB file into structured chapters and metadata.
 */
export async function parseEpub(fileData: ArrayBuffer | File): Promise<{
  zip: JSZip;
  metadata: EpubMetadata;
  chapters: EpubChapter[];
}> {
  const zip = new JSZip();
  await zip.loadAsync(fileData);

  // 1. Locate container.xml
  const containerXmlFile = zip.file('META-INF/container.xml');
  if (!containerXmlFile) {
    throw new Error('Geçersiz EPUB: META-INF/container.xml bulunamadı.');
  }
  const containerXmlText = await containerXmlFile.async('text');
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXmlText, 'application/xml');
  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');

  if (!opfPath) {
    throw new Error('Geçersiz EPUB: OPF dosya yolu belirlenemedi.');
  }

  // 2. Locate and parse content.opf
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`OPF dosyası bulunamadı: ${opfPath}`);
  }
  const opfText = await opfFile.async('text');
  const opfDoc = parser.parseFromString(opfText, 'application/xml');
  const opfDir = getDirectory(opfPath);

  // Extract Metadata
  const metadata: EpubMetadata = {
    title: opfDoc.querySelector('metadata > title, metadata > dc\\:title')?.textContent || 'Başlıksız Kitap',
    creator: opfDoc.querySelector('metadata > creator, metadata > dc\\:creator')?.textContent || undefined,
    language: opfDoc.querySelector('metadata > language, metadata > dc\\:language')?.textContent || 'tr',
    identifier: opfDoc.querySelector('metadata > identifier, metadata > dc\\:identifier')?.textContent || undefined,
    publisher: opfDoc.querySelector('metadata > publisher, metadata > dc\\:publisher')?.textContent || undefined,
    format: 'epub',
  };

  // 3. Parse Manifest (id -> href)
  const manifestItems = new Map<string, { href: string; mediaType: string }>();
  const itemEls = opfDoc.querySelectorAll('manifest > item');
  itemEls.forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') || '';
    if (id && href) {
      manifestItems.set(id, {
        href: resolvePath(opfDir, href),
        mediaType,
      });
    }
  });

  // 4. Parse Spine (reading order)
  const spineItemrefs = opfDoc.querySelectorAll('spine > itemref');
  const chapters: EpubChapter[] = [];

  let chapterIdx = 1;
  for (let i = 0; i < spineItemrefs.length; i++) {
    const idref = spineItemrefs[i].getAttribute('idref');
    if (!idref) continue;

    const manifestItem = manifestItems.get(idref);
    if (!manifestItem) continue;

    const { href, mediaType } = manifestItem;
    // Only process HTML / XHTML content documents
    if (
      !mediaType.includes('html') &&
      !mediaType.includes('xhtml') &&
      !mediaType.includes('xml')
    ) {
      continue;
    }

    const chapterFile = zip.file(href);
    if (!chapterFile) continue;

    const rawContent = await chapterFile.async('text');
    const { title, blocks } = extractBlocksFromHtml(rawContent, chapterIdx);

    chapters.push({
      id: idref,
      href,
      title: title || `Bölüm ${chapterIdx}`,
      rawContent,
      blocks,
      isSelected: true,
      status: 'idle',
      stats: {
        totalBlocks: blocks.length,
        processedBlocks: 0,
        fixedWords: 0,
      },
    });

    chapterIdx++;
  }

  return { zip, metadata, chapters };
}

/**
 * Extract paragraph/heading text blocks while keeping tag integrity.
 */
function extractBlocksFromHtml(
  htmlContent: string,
  chapterIdx: number
): { title: string; blocks: TextBlock[] } {
  const parser = new DOMParser();
  // Try parsing as XHTML or standard HTML
  let doc = parser.parseFromString(htmlContent, 'application/xhtml+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    doc = parser.parseFromString(htmlContent, 'text/html');
  }

  let title = doc.querySelector('title')?.textContent?.trim() || '';
  if (!title) {
    const heading = doc.querySelector('h1, h2, h3');
    title = heading?.textContent?.trim() || '';
  }

  const blocks: TextBlock[] = [];
  const targetSelectors = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt';
  const elements = doc.querySelectorAll(targetSelectors);

  let blockIdx = 0;
  elements.forEach((el) => {
    // Avoid nested block duplication (e.g. <p> inside <li> or <blockquote>)
    if (el.parentElement?.closest(targetSelectors)) {
      return;
    }

    const text = el.textContent?.trim() || '';
    // Skip empty or trivial whitespace blocks
    if (text.length < 2) return;

    // Check if element has non-text nodes like math, pre, code that shouldn't be touched
    if (el.querySelector('pre, code, math, svg')) {
      return;
    }

    const html = el.innerHTML;
    blocks.push({
      id: `${chapterIdx}-${blockIdx++}`,
      elementTag: el.tagName.toLowerCase(),
      originalHtml: html,
      originalText: text,
      correctedHtml: html,
      correctedText: text,
      status: 'pending',
      diffCount: 0,
    });
  });

  for (let i = 0; i < blocks.length - 1; i++) {
    const b1 = blocks[i];
    const b2 = blocks[i + 1];
    if (b1.elementTag === 'p' && b2.elementTag === 'p') {
      const trimmed1 = b1.originalText.trim();
      const trimmed2 = b2.originalText.trim();
      if (
        /[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]-$/.test(trimmed1) &&
        /^[a-zçğıöşü]/.test(trimmed2)
      ) {
        const mergedText = trimmed1.slice(0, -1) + trimmed2;
        const mergedHtml = b1.originalHtml.replace(/-\s*$/, '') + b2.originalHtml;
        b1.originalHtml = mergedHtml;
        b1.originalText = mergedText;
        b1.correctedHtml = mergedHtml;
        b1.correctedText = mergedText;
        b2.originalHtml = '';
        b2.originalText = '';
        b2.correctedHtml = '';
        b2.correctedText = '';
        b2.status = 'completed';
      }
    }
  }

  return { title, blocks: blocks.filter((b) => b.originalText.length > 0 || b.originalHtml.length > 0) };
}

/**
 * Replaces modified blocks back into chapter's original XHTML/HTML content.
 */
export function reconstructChapterHtml(chapter: EpubChapter): string {
  if (!chapter.blocks || chapter.blocks.length === 0) {
    return chapter.rawContent;
  }

  try {
    const parser = new DOMParser();
    let isXhtml = true;
    let doc = parser.parseFromString(chapter.rawContent, 'application/xhtml+xml');
    if (doc.querySelector('parsererror')) {
      isXhtml = false;
      doc = parser.parseFromString(chapter.rawContent, 'text/html');
    }

    const targetSelectors = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt';
    const elements = Array.from(doc.querySelectorAll(targetSelectors)).filter(
      (el) => !el.parentElement?.closest(targetSelectors) && !el.querySelector('pre, code, math, svg')
    );

    let blockIndex = 0;
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (text.length < 2) continue;

      if (blockIndex < chapter.blocks.length) {
        const block = chapter.blocks[blockIndex];
        const targetTag = block.elementTag || el.tagName.toLowerCase();

        const safeHtml = block.correctedHtml || el.innerHTML;

        try {
          if (targetTag !== el.tagName.toLowerCase()) {
            const newEl = isXhtml
              ? doc.createElementNS('http://www.w3.org/1999/xhtml', targetTag)
              : doc.createElement(targetTag);
            newEl.innerHTML = safeHtml;
            el.parentNode?.replaceChild(newEl, el);
          } else if (block.correctedHtml && block.correctedHtml !== block.originalHtml) {
            el.innerHTML = safeHtml;
          }
        } catch {
          try {
            el.textContent = block.correctedText || el.textContent;
          } catch {}
        }
        blockIndex++;
      }
    }

    if (isXhtml) {
      const serializer = new XMLSerializer();
      const serialized = serializer.serializeToString(doc);
      if (serialized.includes('<parsererror')) {
        return doc.documentElement.outerHTML || chapter.rawContent;
      }
      return serialized;
    } else {
      return doc.documentElement.outerHTML || chapter.rawContent;
    }
  } catch (e) {
    console.warn(`Bölüm HTML yeniden oluşturma hatası (${chapter.id}):`, e);
    return chapter.rawContent;
  }
}

/**
 * Packs the updated chapters and files into a new valid .epub Blob.
 */
export async function packageEpub(
  zip: JSZip,
  chapters: EpubChapter[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  // Update modified chapters in zip
  for (const chapter of chapters) {
    if (chapter.status === 'completed' || chapter.blocks.some((b) => b.status === 'completed')) {
      const updatedContent = reconstructChapterHtml(chapter);
      zip.file(chapter.href, updatedContent);
    }
  }

  // Create clean new zip to ensure mimetype is first and uncompressed
  const newZip = new JSZip();

  // 1. mimetype MUST be first and STORE (uncompressed)
  newZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. Add all other files with DEFLATE compression
  const allFiles: { path: string; file: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, file) => {
    if (relativePath !== 'mimetype' && !file.dir) {
      allFiles.push({ path: relativePath, file });
    }
  });

  for (const item of allFiles) {
    const content = await item.file.async('uint8array');
    newZip.file(item.path, content, {
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });
  }

  return await newZip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );
}

export async function createEpubFromChapters(
  metadata: EpubMetadata,
  chapters: EpubChapter[]
): Promise<JSZip> {
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  const stylesCss = `@charset "UTF-8";
html, body {
  margin: 0;
  padding: 0;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.65;
  color: #111111;
  padding: 4% 5%;
  text-align: justify;
  text-justify: inter-word;
}
h1, h2, h3, h4 {
  font-family: serif, "Times New Roman", Times, Georgia;
  font-weight: bold;
  line-height: 1.25;
  margin-top: 1.6em;
  margin-bottom: 0.9em;
  text-align: center;
}
h1 { font-size: 1.8em; }
h2 { font-size: 1.35em; }
p {
  margin: 0;
  padding: 0;
  text-align: justify;
  text-justify: inter-word;
  text-indent: 1.5em;
  margin-bottom: 0.35em;
  hyphens: auto;
  -webkit-hyphens: auto;
  -moz-hyphens: auto;
}
p:first-of-type, h1 + p, h2 + p, h3 + p {
  text-indent: 0;
}
.chapter {
  margin-bottom: 3em;
}`;
  zip.file('OEBPS/styles.css', stylesCss);

  const uid = metadata.identifier || `urn:uuid:${Date.now()}`;
  const title = escapeXml(metadata.title || 'Başlıksız Kitap');
  const creator = escapeXml(metadata.creator || 'Bilinmeyen Yazar');
  const lang = metadata.language || 'tr';
  const modifiedDate = new Date().toISOString().replace(/\.[0-9]{3}/, '');

  let navPoints = '';
  chapters.forEach((ch, idx) => {
    const playOrder = idx + 1;
    const chTitle = escapeXml(ch.title || `Bölüm ${playOrder}`);
    const relHref = ch.href.replace(/^OEBPS\//, '');
    navPoints += `    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel>
        <text>${chTitle}</text>
      </navLabel>
      <content src="${relHref}"/>
    </navPoint>\n`;
  });

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${title}</text>
  </docTitle>
  <navMap>
${navPoints}  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', tocNcx);

  let navList = '';
  chapters.forEach((ch, idx) => {
    const chTitle = escapeXml(ch.title || `Bölüm ${idx + 1}`);
    const relHref = ch.href.replace(/^OEBPS\//, '');
    navList += `      <li><a href="${relHref}">${chTitle}</a></li>\n`;
  });

  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>İçindekiler</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>İçindekiler</h1>
    <ol>
${navList}    </ol>
  </nav>
</body>
</html>`;
  zip.file('OEBPS/nav.xhtml', navXhtml);

  let manifestItems = '';
  let spineItemrefs = '';

  chapters.forEach((ch) => {
    const relHref = ch.href.replace(/^OEBPS\//, '');
    manifestItems += `    <item id="${ch.id}" href="${relHref}" media-type="application/xhtml+xml" />\n`;
    spineItemrefs += `    <itemref idref="${ch.id}" />\n`;
  });

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0" xml:lang="${lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title id="title">${title}</dc:title>
    <dc:creator id="creator">${creator}</dc:creator>
    <dc:language>${lang}</dc:language>
    <dc:identifier id="BookId">${uid}</dc:identifier>
    <meta property="dcterms:modified">${modifiedDate}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="css" href="styles.css" media-type="text/css" />
${manifestItems}  </manifest>
  <spine toc="ncx">
${spineItemrefs}  </spine>
</package>`;
  zip.file('OEBPS/content.opf', contentOpf);

  for (const ch of chapters) {
    zip.file(ch.href, ch.rawContent);
  }

  return zip;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
