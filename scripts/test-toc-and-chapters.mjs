import fs from 'node:fs';

async function testExtraction() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = '/home/halil/Downloads/Bırak Yapsınlar Teorisi - Mel Robbins (Nepal Yayınları).pdf';

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  console.log(`Analyzing PDF: ${doc.numPages} pages...`);

  const tocEntries = [];

  for (let p = 1; p <= 15; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rawLines = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => it.str.trim());

    const pageText = rawLines.join(' ');
    if (/İÇİNDEKİLER|iÇiNDEKiLER|İçindekiler/i.test(pageText) || rawLines.some(l => /\.{4,}/.test(l))) {
      console.log(`Found TOC on page ${p}!`);
      
      for (let i = 0; i < rawLines.length; i++) {
        const nextLines = rawLines.slice(i, i + 6).join(' ');
        const pageMatch = nextLines.match(/\.{3,}\s*(\d{1,3})/);
        if (pageMatch) {
          const num = parseInt(pageMatch[1], 10);
          if (!tocEntries.some(e => e.targetPage === num) && num >= 10) {
            const cleanTitle = nextLines.split(/\.{3,}/)[0].replace(/\s+/g, ' ').trim();
            tocEntries.push({
              title: cleanTitle,
              targetPage: num,
              rawLine: nextLines
            });
          }
        }
      }
    }
  }

  console.log(`\nFound ${tocEntries.length} TOC Chapter Entries:`);
  tocEntries.forEach((entry, idx) => {
    console.log(`  ${idx + 1}. [Page ${entry.targetPage}] "${entry.title}"`);
  });
}

testExtraction().catch(console.error);
