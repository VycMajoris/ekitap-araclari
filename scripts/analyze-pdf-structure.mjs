import fs from 'node:fs';

async function analyzePdfStructure() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfPath = '/home/halil/Downloads/Bırak Yapsınlar Teorisi - Mel Robbins (Nepal Yayınları).pdf';

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  console.log(`Analyzing all 399 pages of PDF for visual structure, TOC, and real chapter headings...\n`);

  for (let p = 1; p <= 50; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();
    const rawItems = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({
        str: it.str.trim(),
        y: Math.round(vp.height - it.transform[5]),
        x: Math.round(it.transform[4]),
        fontSize: Math.round(Math.abs(it.transform[3]) || it.height || 12)
      }));

    if (rawItems.length === 0) continue;

    // Check if this page has large font titles or TOC or chapter patterns
    const hasLargeFont = rawItems.some(it => it.fontSize >= 14 && it.y > 50 && it.y < 450);
    const textPreview = rawItems.map(it => it.str).join(' ').slice(0, 100);
    const isToc = /İÇİNDEKİLER|İçindekiler|\.{5,}/.test(textPreview);

    if (hasLargeFont || isToc || rawItems.length < 8) {
      console.log(`Page ${p} (${rawItems.length} items, isToc: ${isToc}):`);
      rawItems.forEach(it => {
        if (it.fontSize >= 12 || it.str.length > 20 || isToc) {
          console.log(`   [y=${it.y}, x=${it.x}, sz=${it.fontSize}] "${it.str}"`);
        }
      });
      console.log('---');
    }
  }
}

analyzePdfStructure().catch(console.error);
