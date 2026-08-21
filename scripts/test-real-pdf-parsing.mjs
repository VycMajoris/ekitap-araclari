import { parsePdf } from '../src/lib/pdf-engine.ts';
import fs from 'node:fs';
import assert from 'node:assert';

console.log('Testing parsePdf on generated sample PDF...');

async function testPdf() {
  const pdfBytes = fs.readFileSync('public/ornek-bozuk-turkce.pdf');
  const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

  const result = await parsePdf(buffer, {
    onProgress: (p) => {
      console.log(`[Progress: ${p.stage}] Page ${p.currentPage}/${p.totalPages} - ${p.message}`);
    },
  });

  console.log('\n--- PDF PARSE RESULT ---');
  console.log('Title:', result.metadata.title);
  console.log('Author:', result.metadata.creator);
  console.log('Page Count:', result.pageCount);
  console.log('Chapters Count:', result.chapters.length);

  assert(result.chapters.length >= 2, 'Should detect at least 2 chapters (Bölüm 1 and Bölüm 2)');
  assert.strictEqual(result.pageCount, 3, 'Page count must be 3');

  for (const ch of result.chapters) {
    console.log(`\nChapter: "${ch.title}" (${ch.blocks.length} blocks)`);
    for (const b of ch.blocks) {
      console.log(`  [${b.elementTag}] ${b.originalText}`);
    }
  }

  // Check that running headers and footers were filtered out
  for (const ch of result.chapters) {
    for (const b of ch.blocks) {
      assert(!b.originalText.includes('DÜNYALAR SAVAŞI - H. G. WELLS'), 'Running header must be filtered out');
      assert(!/^\s*-\s*\d+\s*-\s*$/.test(b.originalText), 'Page number footer must be filtered out');
    }
  }

  console.log('\nAll running headers and footers were CLEANLY filtered out!');
  console.log('Sample PDF parsing verification PASSED successfully!');
}

testPdf().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
