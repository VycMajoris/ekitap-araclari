import fs from 'node:fs';

async function inspectPdf() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = '/home/halil/Downloads/Bırak Yapsınlar Teorisi - Mel Robbins (Nepal Yayınları).pdf';

  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found');
    return;
  }

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  console.log(`Total PDF Pages: ${doc.numPages}`);

  // Inspect pages 110-118
  for (let p = 110; p <= 118; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    console.log(`\n=== PAGE ${p} (Height: ${vp.height}, Width: ${vp.width}) ===`);
    const rawItems = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({
        str: it.str,
        y: Math.round(vp.height - it.transform[5]),
        x: Math.round(it.transform[4]),
        fontSize: Math.round(Math.abs(it.transform[3]) || it.height || 12)
      }));

    // Top 10 items
    console.log('Top items (Y <= 150):');
    rawItems.filter(it => it.y <= 150).slice(0, 5).forEach(it => {
      console.log(`  [y=${it.y}, x=${it.x}, sz=${it.fontSize}] "${it.str}"`);
    });

    // Bottom 10 items
    console.log('Bottom items (Y >= height - 150):');
    rawItems.filter(it => it.y >= vp.height - 150).slice(-5).forEach(it => {
      console.log(`  [y=${it.y}, x=${it.x}, sz=${it.fontSize}] "${it.str}"`);
    });
  }
}

inspectPdf().catch(console.error);
