import { parsePdf } from '../src/lib/pdf-engine.ts';
import fs from 'node:fs';

async function testRealBook() {
  const pdfPath = '/home/halil/Downloads/Bırak Yapsınlar Teorisi - Mel Robbins (Nepal Yayınları).pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found');
    return;
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

  console.log('Parsing real book PDF...');
  const result = await parsePdf(buffer, {
    onProgress: (p) => {
      if (p.currentPage % 50 === 0 || p.currentPage === p.totalPages) {
        console.log(`[${p.stage}] Page ${p.currentPage}/${p.totalPages}`);
      }
    }
  });

  console.log('\n=== REAL BOOK PARSE RESULT ===');
  console.log('Title:', result.metadata.title);
  console.log('Author:', result.metadata.creator);
  console.log('Total Pages:', result.pageCount);
  console.log('Total Chapters:', result.chapters.length);

  for (let i = 0; i < result.chapters.length; i++) {
    const ch = result.chapters[i];
    console.log(`\nChapter ${i + 1}: "${ch.title}" (${ch.blocks.length} blocks)`);
    // Print first 2 blocks
    ch.blocks.slice(0, 2).forEach(b => {
      console.log(`   [${b.elementTag}] ${b.originalText.slice(0, 80)}...`);
    });
  }
}

testRealBook().catch(console.error);
