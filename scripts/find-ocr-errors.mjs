import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

async function main() {
  const targetFile = process.argv[2] || 'public/ornek-bozuk-turkce.epub';
  const epubPath = path.resolve(targetFile);
  if (!fs.existsSync(epubPath)) {
    console.error(`EPUB file not found at ${epubPath}`);
    process.exit(1);
  }

  console.log(`Reading EPUB from: ${epubPath}`);
  const fileBuffer = fs.readFileSync(epubPath);

  const zip = new JSZip();
  await zip.loadAsync(fileBuffer);

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('META-INF/container.xml not found');
  const containerText = await containerFile.async('text');
  const $container = cheerio.load(containerText, { xmlMode: true });
  const opfPath = $container('rootfile').attr('full-path');
  if (!opfPath) throw new Error('OPF path not found');

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`OPF not found at ${opfPath}`);
  const opfText = await opfFile.async('text');
  const $opf = cheerio.load(opfText, { xmlMode: true });

  const opfDir = path.dirname(opfPath);
  function resolveHref(href) {
    if (!opfDir || opfDir === '.') return href;
    return path.posix.join(opfDir, href);
  }

  const title = $opf('metadata > dc\\:title, metadata > title').text() || 'Unknown Title';
  const creator = $opf('metadata > dc\\:creator, metadata > creator').text() || 'Unknown Author';

  const manifestMap = new Map();
  $opf('manifest > item').each((_, el) => {
    const id = $opf(el).attr('id');
    const href = $opf(el).attr('href');
    const mediaType = $opf(el).attr('media-type');
    if (id && href) {
      manifestMap.set(id, { href: resolveHref(href), mediaType });
    }
  });

  const spineIds = [];
  $opf('spine > itemref').each((_, el) => {
    const idref = $opf(el).attr('idref');
    if (idref) spineIds.push(idref);
  });

  let totalChapters = 0;
  let totalBlocks = 0;

  const findings = {
    mAsRn: new Map(),         // m that might be rn (karamlık, bumu, öğme, kame, modem, somaki, farkıma, davram, tuma, koma, kamı, yarm, imsan, ayrımlı, yalmız, yamlış, düşümce, korkumç, öğmeci, görüm, vb.)
    rnAsM: new Map(),         // rn that might be m
    clAsD: new Map(),         // cl that might be d (claha, cliye, clur, clil, clüşün, clünya, clönem, cla, cle, vb.)
    liVsH: new Map(),         // li / h confusion
    vvAsW: new Map(),         // vv / w confusion
    missingDiacritics: new Map(), // missing diacritics (ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u)
    suspiciousWords: new Map(),   // unknown / suspicious words
    hyphenSplits: [],
    spacedPunctuation: []
  };

  function addFinding(map, word, contextInfo) {
    if (!map.has(word)) {
      map.set(word, { count: 0, contexts: [] });
    }
    const entry = map.get(word);
    entry.count++;
    if (entry.contexts.length < 3) {
      entry.contexts.push(contextInfo);
    }
  }

  for (const idref of spineIds) {
    const item = manifestMap.get(idref);
    if (!item) continue;
    const { href, mediaType } = item;
    if (!mediaType.includes('html') && !mediaType.includes('xhtml') && !mediaType.includes('xml')) continue;

    const chapterFile = zip.file(href);
    if (!chapterFile) continue;

    const htmlContent = await chapterFile.async('text');
    const $ch = cheerio.load(htmlContent);

    let chapterTitle = $ch('title').first().text().trim();
    if (!chapterTitle) chapterTitle = $ch('h1, h2, h3').first().text().trim();
    if (!chapterTitle) chapterTitle = path.basename(href);
    totalChapters++;

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
      const text = block.text;

      // Hyphen splits
      const hyphenSplitRegex = /([abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+)-\s+([abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+)/g;
      let match;
      while ((match = hyphenSplitRegex.exec(text)) !== null) {
        findings.hyphenSplits.push({
          chapter: chapterTitle,
          snippet: text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + match[0].length + 30)),
          match: match[0]
        });
      }

      // Space before punctuation
      const spacePunctRegex = /\s+([,\.!?:;])/g;
      while ((match = spacePunctRegex.exec(text)) !== null) {
        findings.spacedPunctuation.push({
          chapter: chapterTitle,
          snippet: text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + match[0].length + 30)),
          match: match[0]
        });
      }

      // Words extraction
      const words = text.match(/[abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0-9]+/g) || [];

      for (const word of words) {
        const lower = word.toLocaleLowerCase('tr-TR');
        const contextInfo = { chapter: chapterTitle, text: text.length > 120 ? text.substring(0, 120) + '...' : text, word };

        // 1. cl that might be d (claha, cliye, clur, clil, clüşün, clünya, clönem, cla, cle, vb.)
        if (/\bcl[aeıioöuü]/i.test(lower) || /\bcl[a-zçğıöşü]+\b/i.test(lower)) {
          // Exclude proper names if desired, or check if it's not a known foreign word like "Clarke" unless suspicious
          addFinding(findings.clAsD, word, contextInfo);
        }

        // 2. m that might be rn (karamlık, bumu, öğme, kame, modem, somaki, farkıma, davram, tuma, koma, kamı, yarm, imsan, ayrımlı, yalmız, yamlış, düşümce, korkumç, öğmeci, görüm, vb.)
        const mAsRnPattern = /\b(yarm|kamı|öğmeci|somaki|soma|farkıma|davram|tuma|koma|imsan|ayrımlı|yalmız|yamlış|düşümce|korkumç|görüm|bumu|karamlık|öğme|kame|modem)\b/i;
        if (mAsRnPattern.test(lower) || lower.includes('am l') || lower.includes('amlik') || lower.includes('umuk') || lower.includes('umdu') || lower.includes('umca')) {
          addFinding(findings.mAsRn, word, contextInfo);
        }

        // 3. rn that might be m
        // e.g. words containing rn where m is expected (like durna -> duma, etc.)
        if (/(?:durna|urna|irni)/i.test(lower)) {
          addFinding(findings.rnAsM, word, contextInfo);
        }

        // 4. li / h confusion (e.g. o1du, mahal1e, etc. or specific letter swaps)
        if (/[0-9]/.test(word) && /[lhi]/.test(word)) {
          addFinding(findings.liVsH, word, contextInfo);
        }

        // 5. vv / w confusion
        if (/vv/i.test(lower)) {
          addFinding(findings.vvAsW, word, contextInfo);
        }

        // 6. Missing diacritics / ASCII substitutes in Turkish words (c/ç, g/ğ, s/ş, u/ü, o/ö, i/ı)
        // Let's check for common words lacking diacritics or containing ASCII letters in positions where Turkish diacritics are standard (e.g., soz -> söz, cocuk -> çocuk, etc.)
        const asciiSuspects = /\b(soz|cocuk|guzel|bugun|degil|hic|bircok|herhangi|birkac|biraz|hicbir|nasil|neden|nicin|oldu|oluyor|geliyor|geldi|gitti|biliyor)\b/i;
        if (asciiSuspects.test(lower)) {
          addFinding(findings.missingDiacritics, word, contextInfo);
        }

        // 7. Unknown / suspicious words (e.g., words with weird symbols, non-alpha, or strange vowels)
        if (/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/.test(word)) {
          // symbols inside words
        }
      }
    }
  }

  console.log('\n==================================================');
  console.log(' OCR ERROR DETECTION REPORT: DUNYALARIN SAVASI');
  console.log('==================================================');
  console.log(`Book Title: ${title}`);
  console.log(`Book Author: ${creator}`);
  console.log(`Total Chapters Scanned: ${totalChapters}`);
  console.log(`Total Blocks Scanned: ${totalBlocks}`);
  console.log('--------------------------------------------------');

  function printCategory(title, mapOrArray, isMap = true) {
    console.log(`\n### ${title} (Total distinct patterns: ${isMap ? mapOrArray.size : mapOrArray.length})`);
    if (isMap) {
      if (mapOrArray.size === 0) {
        console.log('  (None found)');
        return;
      }
      for (const [word, data] of mapOrArray.entries()) {
        console.log(`  • "${word}" (Frequency: ${data.count})`);
        data.contexts.forEach(ctx => {
          console.log(`    - [${ctx.chapter}] "${ctx.text}"`);
        });
      }
    } else {
      if (mapOrArray.length === 0) {
        console.log('  (None found)');
        return;
      }
      mapOrArray.slice(0, 15).forEach(item => {
        console.log(`  • [${item.chapter}] ${item.match || item.word} -> "${item.snippet || item.text}"`);
      });
    }
  }

  printCategory("1. 'cl' that might be 'd' (e.g. claha, cliye, clur, clil, clüşün, clünya, clönem, cla, cle)", findings.clAsD, true);
  printCategory("2. 'm' that might be 'rn' (e.g. yarm, kamı, öğmeci, somaki, karamlık, bumu, vb.)", findings.mAsRn, true);
  printCategory("3. 'rn' that might be 'm'", findings.rnAsM, true);
  printCategory("4. 'li' / 'h' confusion / digit substitutions", findings.liVsH, true);
  printCategory("5. Double 'vv' / 'w' confusion", findings.vvAsW, true);
  printCategory("6. Missing Diacritics / ASCII Substitutes (ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u)", findings.missingDiacritics, true);
  printCategory("7. Hyphenated Line Splits (e.g. yapı- lamaz)", findings.hyphenSplits, false);
  printCategory("8. Space Before Punctuation (e.g. kelime , başka)", findings.spacedPunctuation, false);

  console.log('\n==================================================');
  console.log(' REPORT COMPLETE');
  console.log('==================================================\n');
}

main().catch((err) => {
  console.error('Error running find-ocr-errors:', err);
  process.exit(1);
});
