import { createEpubFromChapters, parseEpub, packageEpub } from '../src/lib/epub-engine.ts';
import { applyTurkishRegexPreClean } from '../src/lib/turkish-ocr-rules.ts';
import assert from 'node:assert';

console.log('--- TEST: PDF-to-EPUB Synthesis and Validation ---');

async function runTests() {
  const metadata = {
    title: 'Test Kitabı - Dünyalar Savaşı',
    creator: 'H. G. Wells',
    language: 'tr',
    identifier: 'urn:uuid:test-12345',
    format: 'pdf',
    pageCount: 42,
  };

  const sampleBlocks = [
    {
      id: '1-0',
      elementTag: 'h2',
      originalHtml: 'BÖLÜM 1: GELİŞ',
      originalText: 'BÖLÜM 1: GELİŞ',
      correctedHtml: 'BÖLÜM 1: GELİŞ',
      correctedText: 'BÖLÜM 1: GELİŞ',
      status: 'pending',
      diffCount: 0,
    },
    {
      id: '1-1',
      elementTag: 'p',
      originalHtml: 'On dokuzuncu yüzyılın son yıllarında hiç kimseden yarm ne olacağı beklenmiyordu.',
      originalText: 'On dokuzuncu yüzyılın son yıllarında hiç kimseden yarm ne olacağı beklenmiyordu.',
      correctedHtml: 'On dokuzuncu yüzyılın son yıllarında hiç kimseden yarm ne olacağı beklenmiyordu.',
      correctedText: 'On dokuzuncu yüzyılın son yıllarında hiç kimseden yarm ne olacağı beklenmiyordu.',
      status: 'pending',
      diffCount: 0,
    },
    {
      id: '1-2',
      elementTag: 'p',
      originalHtml: 'Bu durum çok tuhaftır- ama yine de kamı aç olan öğmeciler yürümeye devam etti.',
      originalText: 'Bu durum çok tuhaftır- ama yine de kamı aç olan öğmeciler yürümeye devam etti.',
      correctedHtml: 'Bu durum çok tuhaftır- ama yine de kamı aç olan öğmeciler yürümeye devam etti.',
      correctedText: 'Bu durum çok tuhaftır- ama yine de kamı aç olan öğmeciler yürümeye devam etti.',
      status: 'pending',
      diffCount: 0,
    },
  ];

  const chapters = [
    {
      id: 'chapter_1',
      href: 'OEBPS/chapter_01.xhtml',
      title: 'BÖLÜM 1: GELİŞ',
      rawContent: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="tr">
<head>
  <meta charset="utf-8" />
  <title>BÖLÜM 1: GELİŞ</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  <section class="chapter">
    <h2>BÖLÜM 1: GELİŞ</h2>
    <p>On dokuzuncu yüzyılın son yıllarında hiç kimseden yarm ne olacağı beklenmiyordu.</p>
    <p>Bu durum çok tuhaftır- ama yine de kamı aç olan öğmeciler yürümeye devam etti.</p>
  </section>
</body>
</html>`,
      blocks: sampleBlocks,
      isSelected: true,
      status: 'idle',
      stats: {
        totalBlocks: sampleBlocks.length,
        processedBlocks: 0,
        fixedWords: 0,
      },
    },
  ];

  // 1. Test createEpubFromChapters
  console.log('1. Testing createEpubFromChapters...');
  const zip = await createEpubFromChapters(metadata, chapters);
  assert(zip.file('mimetype'), 'mimetype file must exist');
  assert(zip.file('META-INF/container.xml'), 'META-INF/container.xml must exist');
  assert(zip.file('OEBPS/content.opf'), 'OEBPS/content.opf must exist');
  assert(zip.file('OEBPS/toc.ncx'), 'OEBPS/toc.ncx must exist');
  assert(zip.file('OEBPS/nav.xhtml'), 'OEBPS/nav.xhtml must exist');
  assert(zip.file('OEBPS/styles.css'), 'OEBPS/styles.css must exist');
  assert(zip.file('OEBPS/chapter_01.xhtml'), 'OEBPS/chapter_01.xhtml must exist');

  const mimetypeContent = await zip.file('mimetype').async('text');
  assert.strictEqual(mimetypeContent.trim(), 'application/epub+zip', 'mimetype content must match');

  console.log('   EPUB container structure verified successfully.');

  // 2. Test packageEpub (generating Blob/Binary)
  console.log('2. Testing packageEpub...');
  const epubBlob = await packageEpub(zip, chapters);
  assert(epubBlob.size > 0, 'EPUB blob size must be greater than 0');
  console.log(`   EPUB Blob generated successfully. Size: ${epubBlob.size} bytes.`);

  // 3. Test OCR rule application on PDF-extracted blocks
  console.log('3. Testing Turkish OCR rules on PDF text blocks...');
  for (const block of sampleBlocks) {
    const cleaned = applyTurkishRegexPreClean(block.originalText);
    console.log(`   Original: "${block.originalText}"`);
    console.log(`   Cleaned:  "${cleaned}"`);
    
    if (block.id === '1-1') {
      assert(cleaned.includes('yarın'), 'yarm must be cleaned to yarın');
    }
    if (block.id === '1-2') {
      assert(cleaned.includes('tuhaftır - ama'), 'Hyphen with - ama must be protected');
      assert(!cleaned.includes('tuhaftırama'), 'tuhaftırama must NOT be generated');
      assert(cleaned.includes('karnı'), 'kamı must be cleaned to karnı');
      assert(cleaned.includes('öğrenciler'), 'öğmeciler must be cleaned to öğrenciler');
    }
  }

  console.log('\nAll PDF-to-EPUB converter and OCR engine tests PASSED!\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
