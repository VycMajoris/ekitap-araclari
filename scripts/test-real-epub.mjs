import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { applyTurkishRegexWithLogs } from '../src/lib/turkish-ocr-rules.ts';

async function main() {
  const epubPath = path.resolve('dunyalarinsavasi.epub');
  if (!fs.existsSync(epubPath)) {
    console.error(`EPUB file not found at ${epubPath}`);
    process.exit(1);
  }

  console.log(`Reading EPUB from: ${epubPath}`);
  const fileBuffer = fs.readFileSync(epubPath);

  const zip = new JSZip();
  await zip.loadAsync(fileBuffer);

  // 1. Parse container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('META-INF/container.xml not found in EPUB');
  }
  const containerText = await containerFile.async('text');
  const $container = cheerio.load(containerText, { xmlMode: true });
  const opfPath = $container('rootfile').attr('full-path');

  if (!opfPath) {
    throw new Error('OPF path not found in container.xml');
  }

  // 2. Parse content.opf
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`OPF file not found at: ${opfPath}`);
  }
  const opfText = await opfFile.async('text');
  const $opf = cheerio.load(opfText, { xmlMode: true });

  const opfDir = path.dirname(opfPath);
  function resolveHref(href) {
    if (!opfDir || opfDir === '.') return href;
    return path.posix.join(opfDir, href);
  }

  const title = $opf('metadata > dc\\:title, metadata > title').text() || 'Unknown Title';
  const creator = $opf('metadata > dc\\:creator, metadata > creator').text() || 'Unknown Author';
  console.log(`Book Title: ${title}`);
  console.log(`Book Author: ${creator}`);

  // Manifest items
  const manifestMap = new Map();
  $opf('manifest > item').each((_, el) => {
    const id = $opf(el).attr('id');
    const href = $opf(el).attr('href');
    const mediaType = $opf(el).attr('media-type');
    if (id && href) {
      manifestMap.set(id, { href: resolveHref(href), mediaType });
    }
  });

  // Spine items
  const spineIds = [];
  $opf('spine > itemref').each((_, el) => {
    const idref = $opf(el).attr('idref');
    if (idref) spineIds.push(idref);
  });

  let totalChapters = 0;
  let totalBlocks = 0;
  let totalChangesCount = 0;
  const allLogs = [];
  const ruleStats = new Map(); // ruleName -> { count: number, changeMap: Map<string, number> }

  for (const idref of spineIds) {
    const item = manifestMap.get(idref);
    if (!item) continue;

    const { href, mediaType } = item;
    if (!mediaType.includes('html') && !mediaType.includes('xhtml') && !mediaType.includes('xml')) {
      continue;
    }

    const chapterFile = zip.file(href);
    if (!chapterFile) {
      console.warn(`Chapter file missing in zip: ${href}`);
      continue;
    }

    const htmlContent = await chapterFile.async('text');
    const $ch = cheerio.load(htmlContent);

    let chapterTitle = $ch('title').first().text().trim();
    if (!chapterTitle) {
      chapterTitle = $ch('h1, h2, h3').first().text().trim();
    }
    if (!chapterTitle) {
      chapterTitle = path.basename(href);
    }

    totalChapters++;

    // Extract blocks
    const targetSelectors = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt';
    const blocks = [];
    let blockIdx = 0;

    $ch(targetSelectors).each((_, el) => {
      const $el = $ch(el);
      if ($el.parent().closest(targetSelectors).length > 0) return;
      const text = $el.text().trim();
      if (text.length < 2) return;
      if ($el.find('pre, code, math, svg').length > 0) return;

      blocks.push({
        id: `${totalChapters}-${blockIdx++}`,
        text,
      });
    });

    totalBlocks += blocks.length;

    for (const block of blocks) {
      const { cleaned, logs } = applyTurkishRegexWithLogs(block.text, block.id, idref, chapterTitle);
      if (logs.length > 0) {
        for (const log of logs) {
          allLogs.push(log);
          if (!ruleStats.has(log.ruleName)) {
            ruleStats.set(log.ruleName, { count: 0, changeMap: new Map() });
          }
          const stats = ruleStats.get(log.ruleName);
          for (const change of log.changes) {
            stats.count++;
            totalChangesCount++;
            const key = `${change.before} -> ${change.after}`;
            stats.changeMap.set(key, (stats.changeMap.get(key) || 0) + 1);
          }
        }
      }
    }
  }

  console.log('\n========================================');
  console.log(' EPUB OCR FIXER - REAL BOOK TEST REPORT');
  console.log('========================================');
  console.log(`Book: ${title} by ${creator}`);
  console.log(`Total Chapters Scanned: ${totalChapters}`);
  console.log(`Total Blocks Scanned: ${totalBlocks}`);
  console.log(`Total Regex Changes Made: ${totalChangesCount}`);
  console.log(`Total Rules Triggered: ${ruleStats.size}`);
  console.log('----------------------------------------');

  console.log('\n### BREAKDOWN BY RULE:');
  for (const [ruleName, stats] of ruleStats.entries()) {
    console.log(`\n• Rule: "${ruleName}"`);
    console.log(`  Total Occurrences: ${stats.count}`);
    console.log(`  Sample Changes:`);
    for (const [changeKey, freq] of stats.changeMap.entries()) {
      console.log(`    [Freq: ${freq}] ${changeKey}`);
    }
  }

  console.log('\n========================================');
  console.log(' REPORT GENERATION COMPLETE');
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Error running test-real-epub:', err);
  process.exit(1);
});
