import JSZip from 'jszip';
import fs from 'node:fs';

async function inspectEpub() {
  const epubPath = '/home/halil/Downloads/Bırak Yapsınlar Teorisi - Mel Robbins (Nepal Yayınları)_duzeltilmis (3).epub';
  if (!fs.existsSync(epubPath)) {
    console.error('EPUB not found:', epubPath);
    return;
  }

  const data = fs.readFileSync(epubPath);
  const zip = new JSZip();
  await zip.loadAsync(data);

  console.log('--- INSPECTING CONVERTED EPUB ---');
  
  const files = Object.keys(zip.files).filter(f => f.endsWith('.xhtml'));
  console.log(`Found ${files.length} XHTML chapter files.`);

  let totalHeadings = 0;
  let totalBlocks = 0;

  for (const filePath of files) {
    const content = await zip.file(filePath).async('text');
    // Find all <h1>, <h2>, <h3>
    const headings = content.match(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/gi) || [];
    const paragraphs = content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];

    totalHeadings += headings.length;
    totalBlocks += headings.length + paragraphs.length;

    console.log(`\nFile: ${filePath} (Headings: ${headings.length}, Paras: ${paragraphs.length})`);
    for (const h of headings) {
      console.log(`   [HEADING] ${h.replace(/<[^>]*>/g, '').trim()}`);
    }
  }

  console.log(`\nTotal Chapters: ${files.length}, Total Headings: ${totalHeadings}, Total Blocks: ${totalBlocks}`);
}

inspectEpub().catch(console.error);
