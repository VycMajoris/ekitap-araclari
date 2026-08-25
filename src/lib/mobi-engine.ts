import JSZip from 'jszip';
import { EpubChapter, EpubMetadata, TextBlock } from './types';

function decompressPalmDoc(data: Uint8Array): Uint8Array {
  const output: number[] = [];
  let i = 0;

  while (i < data.length) {
    const byte = data[i++];
    if (byte === 0x00) {
      output.push(0x00);
    } else if (byte >= 0x01 && byte <= 0x08) {
      for (let j = 0; j < byte && i < data.length; j++) {
        output.push(data[i++]);
      }
    } else if (byte <= 0x7f) {
      output.push(byte);
    } else if (byte >= 0x80 && byte <= 0xbf) {
      if (i < data.length) {
        const nextByte = data[i++];
        const distance = ((byte & 0x3f) << 3) | (nextByte >> 5);
        const length = (nextByte & 0x1f) + 3;
        const startPos = output.length - distance;
        for (let j = 0; j < length; j++) {
          const char = output[startPos + j];
          if (char !== undefined) {
            output.push(char);
          }
        }
      }
    } else {
      output.push(0x20);
      output.push(byte ^ 0x80);
    }
  }

  return new Uint8Array(output);
}

function extractTextBlocksFromHtml(html: string, chapterId: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const tagRegex = /<(p|h1|h2|h3|h4|h5|h6|li|blockquote)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  let blockIndex = 0;

  while ((match = tagRegex.exec(html)) !== null) {
    const elementTag = match[1].toLowerCase();
    const originalHtml = match[0];
    const innerContent = match[3];

    const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
    let originalText = '';
    if (tempDiv) {
      tempDiv.innerHTML = innerContent;
      originalText = (tempDiv.textContent || tempDiv.innerText || '').trim();
    } else {
      originalText = innerContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    }

    if (originalText.length > 0) {
      blocks.push({
        id: `${chapterId}_block_${blockIndex++}`,
        elementTag,
        originalHtml,
        originalText,
        correctedHtml: originalHtml,
        correctedText: originalText,
        status: 'pending',
        diffCount: 0,
      });
    }
  }

  if (blocks.length === 0) {
    const rawParas = html.split(/<br\s*\/?>|\n\n+/i);
    for (let i = 0; i < rawParas.length; i++) {
      const clean = rawParas[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (clean.length > 0) {
        const pTag = `<p>${clean}</p>`;
        blocks.push({
          id: `${chapterId}_block_${i}`,
          elementTag: 'p',
          originalHtml: pTag,
          originalText: clean,
          correctedHtml: pTag,
          correctedText: clean,
          status: 'pending',
          diffCount: 0,
        });
      }
    }
  }

  return blocks;
}

export async function parseMobi(file: File): Promise<{
  zip: JSZip;
  metadata: EpubMetadata;
  chapters: EpubChapter[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);

  const decoder = new TextDecoder('utf-8');
  let title = file.name.replace(/\.mobi$/i, '');

  let rawTitle = '';
  for (let i = 0; i < 32; i++) {
    const byte = dataView.getUint8(i);
    if (byte === 0) break;
    rawTitle += String.fromCharCode(byte);
  }
  if (rawTitle.trim()) {
    title = rawTitle.trim();
  }

  const numRecords = dataView.getUint16(76);
  const recordOffsets: number[] = [];

  for (let i = 0; i < numRecords; i++) {
    const offset = dataView.getUint32(78 + i * 8);
    recordOffsets.push(offset);
  }

  if (recordOffsets.length === 0) {
    throw new Error('MOBI dosyası geçerli kayıt başlığı içermiyor.');
  }

  const rec0Offset = recordOffsets[0];
  const compression = dataView.getUint16(rec0Offset);
  const recordCount = dataView.getUint16(rec0Offset + 8);

  let author = '';
  let fullBookHtml = '';

  const textChunks: string[] = [];
  const maxTextRecords = Math.min(recordCount, recordOffsets.length - 1);

  for (let i = 1; i <= maxTextRecords; i++) {
    const start = recordOffsets[i];
    const end = i < recordOffsets.length - 1 ? recordOffsets[i + 1] : uint8.length;
    const chunkData = uint8.subarray(start, end);

    if (compression === 2) {
      const decompressed = decompressPalmDoc(chunkData);
      textChunks.push(decoder.decode(decompressed));
    } else {
      textChunks.push(decoder.decode(chunkData));
    }
  }

  fullBookHtml = textChunks.join('');

  try {
    const mobiHeaderOffset = rec0Offset + 16;
    let isMobi = true;
    for (let i = 0; i < 4; i++) {
      if (uint8[mobiHeaderOffset + i] !== 'MOBI'.charCodeAt(i)) {
        isMobi = false;
        break;
      }
    }

    if (isMobi) {
      const fullNameOffset = dataView.getUint32(mobiHeaderOffset + 84);
      const fullNameLength = dataView.getUint32(mobiHeaderOffset + 88);
      if (fullNameOffset && fullNameLength && rec0Offset + fullNameOffset + fullNameLength <= uint8.length) {
        const titleBytes = uint8.subarray(
          rec0Offset + fullNameOffset,
          rec0Offset + fullNameOffset + fullNameLength
        );
        const parsedTitle = decoder.decode(titleBytes).trim();
        if (parsedTitle) {
          title = parsedTitle;
        }
      }

      const exthFlags = dataView.getUint32(mobiHeaderOffset + 112);
      if (exthFlags & 0x40) {
        const headerLen = dataView.getUint32(mobiHeaderOffset + 4);
        const exthOffset = mobiHeaderOffset + headerLen;
        if (
          uint8[exthOffset] === 'E'.charCodeAt(0) &&
          uint8[exthOffset + 1] === 'X'.charCodeAt(0) &&
          uint8[exthOffset + 2] === 'T'.charCodeAt(0) &&
          uint8[exthOffset + 3] === 'H'.charCodeAt(0)
        ) {
          const exthCount = dataView.getUint32(exthOffset + 8);
          let currPos = exthOffset + 12;
          for (let e = 0; e < exthCount && currPos < uint8.length - 8; e++) {
            const recType = dataView.getUint32(currPos);
            const recLen = dataView.getUint32(currPos + 4);
            if (recLen < 8) break;
            const dataBytes = uint8.subarray(currPos + 8, currPos + recLen);

            if (recType === 100) {
              author = decoder.decode(dataBytes).trim();
            } else if (recType === 503 && !title) {
              title = decoder.decode(dataBytes).trim();
            }
            currPos += recLen;
          }
        }
      }
    }
  } catch (err) {
    console.warn('MOBI EXTH metadata ayrıştırma uyarısı:', err);
  }

  const chapters: EpubChapter[] = [];
  const rawChapterSplits = fullBookHtml.split(/(?=<mbp:pagebreak|<h[1-2][^>]*>)/i);

  if (rawChapterSplits.length <= 1) {
    const rawParts = fullBookHtml.split(/(?=<div class="chapter"|<hr\s*\/?>)/i);
    if (rawParts.length > 1) {
      rawChapterSplits.splice(0, rawChapterSplits.length, ...rawParts);
    }
  }

  let chIdx = 1;
  for (const part of rawChapterSplits) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const chapterId = `chapter_${chIdx}`;
    let chapterTitle = `Bölüm ${chIdx}`;

    const titleMatch = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/i.exec(trimmed);
    if (titleMatch) {
      const cleanTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      if (cleanTitle.length > 0 && cleanTitle.length < 100) {
        chapterTitle = cleanTitle;
      }
    }

    const blocks = extractTextBlocksFromHtml(trimmed, chapterId);
    if (blocks.length > 0) {
      chapters.push({
        id: chapterId,
        href: `OEBPS/${chapterId}.xhtml`,
        title: chapterTitle,
        rawContent: trimmed,
        modifiedContent: trimmed,
        blocks,
        isSelected: true,
        status: 'idle',
        stats: {
          totalBlocks: blocks.length,
          processedBlocks: 0,
          fixedWords: 0,
        },
      });
      chIdx++;
    }
  }

  if (chapters.length === 0) {
    const singleBlocks = extractTextBlocksFromHtml(fullBookHtml, 'chapter_1');
    chapters.push({
      id: 'chapter_1',
      href: 'OEBPS/chapter_1.xhtml',
      title: title,
      rawContent: fullBookHtml,
      modifiedContent: fullBookHtml,
      blocks: singleBlocks,
      isSelected: true,
      status: 'idle',
      stats: {
        totalBlocks: singleBlocks.length,
        processedBlocks: 0,
        fixedWords: 0,
      },
    });
  }

  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const manifestItems = chapters
    .map((c) => `    <item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join('\n');
  const spineItems = chapters.map((c) => `    <itemref idref="${c.id}"/>`).join('\n');

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author || 'Bilinmiyor'}</dc:creator>
    <dc:language>tr</dc:language>
    <dc:identifier id="BookId">urn:uuid:${Date.now()}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`
  );

  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
${chapters
  .map(
    (c, i) => `    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${c.title}</text></navLabel>
      <content src="${c.id}.xhtml"/>
    </navPoint>`
  )
  .join('\n')}
  </navMap>
</ncx>`
  );

  for (const ch of chapters) {
    const xhtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${ch.title}</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <style type="text/css">
    body { font-family: sans-serif; line-height: 1.6; text-align: justify; padding: 5%; }
    p { margin-bottom: 1em; text-indent: 1.5em; text-align: justify; }
    h1, h2, h3 { text-align: center; margin: 1.5em 0 1em 0; }
  </style>
</head>
<body>
  <h2>${ch.title}</h2>
  ${ch.rawContent}
</body>
</html>`;
    zip.file(`OEBPS/${ch.id}.xhtml`, xhtmlContent);
  }

  const metadata: EpubMetadata = {
    title,
    creator: author,
    language: 'tr',
    format: 'mobi',
  };

  return { zip, metadata, chapters };
}

export async function packageMobi(
  chapters: EpubChapter[],
  metadata?: EpubMetadata | null
): Promise<Blob> {
  const encoder = new TextEncoder();
  const bookTitle = metadata?.title || 'eKitap';
  const authorName = metadata?.creator || '';

  const htmlParts: string[] = [];
  htmlParts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${bookTitle}</title></head><body>`);

  for (const ch of chapters) {
    let chapterHtml = ch.modifiedContent || ch.rawContent || '';
    if (ch.blocks && ch.blocks.length > 0) {
      for (const block of ch.blocks) {
        if (block.correctedHtml && block.originalHtml) {
          chapterHtml = chapterHtml.replace(block.originalHtml, block.correctedHtml);
        }
      }
    }
    htmlParts.push(`<h2>${ch.title}</h2>`);
    htmlParts.push(chapterHtml);
    htmlParts.push('<mbp:pagebreak/>');
  }

  htmlParts.push('</body></html>');
  const fullHtml = htmlParts.join('\n');
  const textBytes = encoder.encode(fullHtml);

  const chunkSize = 4096;
  const numTextRecords = Math.ceil(textBytes.length / chunkSize) || 1;
  const textRecordSlices: Uint8Array[] = [];

  for (let i = 0; i < numTextRecords; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, textBytes.length);
    textRecordSlices.push(textBytes.subarray(start, end));
  }

  const titleBytes = encoder.encode(bookTitle);
  const authorBytes = encoder.encode(authorName);

  const exthRecords: { tag: number; data: Uint8Array }[] = [];
  if (authorName) {
    exthRecords.push({ tag: 100, data: authorBytes });
  }
  exthRecords.push({ tag: 503, data: titleBytes });
  exthRecords.push({ tag: 106, data: encoder.encode(new Date().toISOString().slice(0, 10)) });

  let exthPayloadLength = 12;
  for (const rec of exthRecords) {
    exthPayloadLength += 8 + rec.data.length;
  }
  const exthPad = (4 - (exthPayloadLength % 4)) % 4;
  const exthTotalLength = exthPayloadLength + exthPad;

  const exthBuffer = new Uint8Array(exthTotalLength);
  const exthView = new DataView(exthBuffer.buffer);
  exthBuffer.set(encoder.encode('EXTH'), 0);
  exthView.setUint32(4, exthTotalLength, false);
  exthView.setUint32(8, exthRecords.length, false);

  let exthWritePos = 12;
  for (const rec of exthRecords) {
    exthView.setUint32(exthWritePos, rec.tag, false);
    exthView.setUint32(exthWritePos + 4, 8 + rec.data.length, false);
    exthBuffer.set(rec.data, exthWritePos + 8);
    exthWritePos += 8 + rec.data.length;
  }

  const palmdocHeaderLength = 16;
  const mobiHeaderLength = 232;
  const rec0Length = palmdocHeaderLength + mobiHeaderLength + exthTotalLength + titleBytes.length;
  const rec0Buffer = new Uint8Array(rec0Length);
  const rec0View = new DataView(rec0Buffer.buffer);

  rec0View.setUint16(0, 1, false);
  rec0View.setUint16(2, 0, false);
  rec0View.setUint32(4, textBytes.length, false);
  rec0View.setUint16(8, numTextRecords, false);
  rec0View.setUint16(10, chunkSize, false);
  rec0View.setUint32(12, 0, false);

  const mobiOffset = 16;
  rec0Buffer.set(encoder.encode('MOBI'), mobiOffset);
  rec0View.setUint32(mobiOffset + 4, mobiHeaderLength, false);
  rec0View.setUint32(mobiOffset + 8, 2, false);
  rec0View.setUint32(mobiOffset + 12, 65001, false);
  rec0View.setUint32(mobiOffset + 16, Math.floor(Math.random() * 0xffffffff), false);
  rec0View.setUint32(mobiOffset + 20, 6, false);

  for (let p = 24; p < 80; p += 4) {
    rec0View.setUint32(mobiOffset + p, 0xffffffff, false);
  }

  rec0View.setUint32(mobiOffset + 80, numTextRecords + 1, false);
  const fullNameOffsetInRec0 = palmdocHeaderLength + mobiHeaderLength + exthTotalLength;
  rec0View.setUint32(mobiOffset + 84, fullNameOffsetInRec0, false);
  rec0View.setUint32(mobiOffset + 88, titleBytes.length, false);
  rec0View.setUint32(mobiOffset + 92, 1055, false);
  rec0View.setUint32(mobiOffset + 96, 0, false);
  rec0View.setUint32(mobiOffset + 100, 0, false);
  rec0View.setUint32(mobiOffset + 104, 6, false);
  rec0View.setUint32(mobiOffset + 108, 0xffffffff, false);
  rec0View.setUint32(mobiOffset + 112, 0x40, false);

  rec0Buffer.set(exthBuffer, palmdocHeaderLength + mobiHeaderLength);
  rec0Buffer.set(titleBytes, fullNameOffsetInRec0);

  const flisRecord = encoder.encode('FLIS\x00\x00\x00\x08\x00\x41\x00\x00\x00\x00\x00\x00\xff\xff\xff\xff\x00\x01\x00\x03\x00\x00\x00\x00\x00\x00\x00\x00');
  const fcisRecord = encoder.encode('FCIS\x00\x00\x00\x14\x00\x00\x00\x10\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x20\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00');
  const eofRecord = new Uint8Array([0xe9, 0x8e, 0x0d, 0x0a]);

  const allRecords: Uint8Array[] = [rec0Buffer, ...textRecordSlices, flisRecord, fcisRecord, eofRecord];
  const totalNumRecords = allRecords.length;

  const pdbHeaderLength = 78;
  const recordListLength = totalNumRecords * 8 + 2;
  let currentOffset = pdbHeaderLength + recordListLength;

  const recordOffsets: number[] = [];
  for (const rec of allRecords) {
    recordOffsets.push(currentOffset);
    currentOffset += rec.length;
  }

  const fileBuffer = new Uint8Array(currentOffset);
  const fileView = new DataView(fileBuffer.buffer);

  const sanitizedName = (bookTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31) || 'Book');
  const nameBytes = encoder.encode(sanitizedName);
  fileBuffer.set(nameBytes.subarray(0, 31), 0);

  fileView.setUint16(32, 0, false);
  fileView.setUint16(34, 0, false);
  const now = Math.floor(Date.now() / 1000);
  fileView.setUint32(36, now, false);
  fileView.setUint32(40, now, false);
  fileBuffer.set(encoder.encode('BOOK'), 60);
  fileBuffer.set(encoder.encode('MOBI'), 64);
  fileView.setUint32(68, Math.floor(Math.random() * 0xffffffff), false);
  fileView.setUint16(76, totalNumRecords, false);

  for (let i = 0; i < totalNumRecords; i++) {
    const tableOffset = 78 + i * 8;
    fileView.setUint32(tableOffset, recordOffsets[i], false);
    fileView.setUint8(tableOffset + 4, 0);
    fileView.setUint8(tableOffset + 5, (i >> 16) & 0xff);
    fileView.setUint8(tableOffset + 6, (i >> 8) & 0xff);
    fileView.setUint8(tableOffset + 7, i & 0xff);
  }

  for (let i = 0; i < totalNumRecords; i++) {
    fileBuffer.set(allRecords[i], recordOffsets[i]);
  }

  return new Blob([fileBuffer], { type: 'application/x-mobipocket-ebook' });
}
