import { applyTurkishRegexPreClean, applyTurkishRegexWithLogs, hasOcrAnomaly, computeTextDiff } from '../src/lib/turkish-ocr-rules.ts';
import { parseBatchResponse } from '../src/lib/processor.ts';
import { TdkDictionary } from '../src/lib/tdk-dictionary.ts';
import { extractBlocksFromHtml, reconstructChapterHtml, createEpubFromChapters, renumberAndSynthesizeFootnotes } from '../src/lib/epub-engine.ts';
import { parsePdf, findRepresentativePdfPage, extractFootnotesAndBodyFromPage } from '../src/lib/pdf-engine.ts';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  buildTranslationUserPrompt,
  getLanguageName,
  BOOK_TRANSLATION_SYSTEM_PROMPT,
} from '../src/lib/openrouter.ts';
import assert from 'node:assert';

global.DOMParser = new JSDOM().window.DOMParser;
global.XMLSerializer = new JSDOM().window.XMLSerializer;

console.log('Running verification tests for Turkish OCR fixes...');
await TdkDictionary.getInstance().init();
console.log(`TDK Dictionary loaded with ${TdkDictionary.getInstance().getWordCount()} words.`);

// 1. Test Hyphenation Exclusions and OCR rules
const testCases = [
  {
    input: "Bu durum çok tuhaftır- ama yine de devam etti.",
    expected: "Bu durum çok tuhaftır - ama yine de devam etti.",
    check: (res) => {
      assert(!res.includes("tuhaftırama"), "Must NOT contain 'tuhaftırama'");
      assert.strictEqual(res, "Bu durum çok tuhaftır - ama yine de devam etti.");
    }
  },
  {
    input: "Onu bulamamıştım- sadece merak etmiştim.",
    expected: "Onu bulamamıştım - sadece merak etmiştim.",
    check: (res) => {
      assert(!res.includes("bulamamıştimsadece"), "Must NOT contain 'bulamamıştimsadece'");
      assert.strictEqual(res, "Onu bulamamıştım - sadece merak etmiştim.");
    }
  },
  {
    input: "Net hatırlayabiliyorum- sonunda bulduk.",
    expected: "Net hatırlayabiliyorum - sonunda bulduk.",
    check: (res) => {
      assert(!res.includes("hatırlayabiliyorumsonunda"), "Must NOT contain 'hatırlayabiliyorumsonunda'");
      assert.strictEqual(res, "Net hatırlayabiliyorum - sonunda bulduk.");
    }
  },
  {
    input: "Araba geliyor- bitip gidecek.",
    expected: "Araba geliyor - bitip gidecek.",
    check: (res) => {
      assert(!res.includes("geliyorbitip"), "Must NOT contain 'geliyorbitip'");
      assert.strictEqual(res, "Araba geliyor - bitip gidecek.");
    }
  },
  {
    input: "Ona benzeyen- o kadındı.",
    expected: "Ona benzeyen - o kadındı.",
    check: (res) => {
      assert(!res.includes("benzeyeno"), "Must NOT contain 'benzeyeno'");
      assert.strictEqual(res, "Ona benzeyen - o kadındı.");
    }
  },
  {
    input: "Tarihi yapı- lamaz denilen surlar.",
    expected: "Tarihi yapılamaz denilen surlar.",
    check: (res) => {
      assert(res.includes("yapılamaz"), "Must contain 'yapılamaz'");
      assert.strictEqual(res, "Tarihi yapılamaz denilen surlar.");
    }
  },
  {
    input: "Tarihi yapı-<br/>lamaz denilen surlar.",
    expected: "Tarihi yapılamaz denilen surlar.",
    check: (res) => {
      assert(res.includes("yapılamaz"), "Must merge with <br/> tag");
    }
  },
  {
    input: "Tarihi yapı-lamaz denilen surlar.",
    expected: "Tarihi yapılamaz denilen surlar.",
    check: (res) => {
      assert(res.includes("yapılamaz"), "Must merge direct suffix hyphen");
    }
  },
  {
    input: "Bunu anla- madım çünkü zor.",
    expected: "Bunu anlamadım çünkü zor.",
    check: (res) => {
      assert(res.includes("anlamadım"), "Must contain 'anlamadım'");
      assert.strictEqual(res, "Bunu anlamadım çünkü zor.");
    }
  },
  {
    input: "Çocuk baş- ladı koşmaya.",
    expected: "Çocuk başladı koşmaya.",
    check: (res) => {
      assert(res.includes("başladı"), "Must contain 'başladı'");
    }
  },
  {
    input: "Yeni öğ- renci geldi.",
    expected: "Yeni öğrenci geldi.",
    check: (res) => {
      assert(res.includes("öğrenci"), "Must contain 'öğrenci'");
    }
  },
  {
    input: "Sürekli geliş- tirme yaptık.",
    expected: "Sürekli geliştirme yaptık.",
    check: (res) => {
      assert(res.includes("geliştirme"), "Must contain 'geliştirme'");
    }
  },
  {
    input: "yarm sabah erkenden kalktı",
    expected: "yarın sabah erkenden kalktı",
    check: (res) => {
      assert.strictEqual(res, "yarın sabah erkenden kalktı");
    }
  },
  {
    input: "kamında ağrı vardı, bumu ağrıyor",
    expected: "karnında ağrı vardı, burnu ağrıyor",
    check: (res) => {
      assert(res.includes("karnında"), "Must contain 'karnında'");
      assert(res.includes("burnu"), "Must contain 'burnu'");
    }
  },
  {
    input: "öğmeciler clünya turuna çıktı",
    expected: "öğrenciler dünya turuna çıktı",
    check: (res) => {
      assert(res.includes("öğrenciler"), "Must contain 'öğrenciler'");
      assert(res.includes("dünya"), "Must contain 'dünya'");
    }
  },
  {
    input: "karamlık gecede imsanlar yürüdü",
    expected: "karanlık gecede insanlar yürüdü",
    check: (res) => {
      assert(res.includes("karanlık"), "Must contain 'karanlık'");
      assert(res.includes("insanlar"), "Must contain 'insanlar'");
    }
  },
  {
    input: "tarnarn oldu ve zarnan geçti",
    expected: "tamam oldu ve zaman geçti",
    check: (res) => {
      assert(res.includes("tamam"), "Must contain 'tamam'");
      assert(res.includes("zaman"), "Must contain 'zaman'");
    }
  },
  {
    input: "Eski bir tanıdığı andınyordu, sesini de andıryordu.",
    expected: "Eski bir tanıdığı andırıyordu, sesini de andırıyordu.",
    check: (res) => {
      assert(res.includes("andırıyordu"), "Must fix 'andınyordu' -> 'andırıyordu'");
    }
  },
  {
    input: "Uzakta bir ışık görünrnüyordu, tükenrnez bir karanlık vardı.",
    expected: "Uzakta bir ışık görünmüyordu, tükenmez bir karanlık vardı.",
    check: (res) => {
      assert(res.includes("görünmüyordu"), "Must fix 'görünrnüyordu' -> 'görünmüyordu'");
      assert(res.includes("tükenmez"), "Must fix 'tükenrnez' -> 'tükenmez'");
    }
  },
  {
    input: "Ve muhtemelen her ebeveynin farkına vardığı bir şeyi de anladım - her doğum, ne olursa olsun, bir Kutsal Doğum'dur - Aile içi küçük bir Kutsal Doğum.",
    expected: "Ve muhtemelen her ebeveynin farkına vardığı bir şeyi de anladım - her doğum, ne olursa olsun, bir Kutsal Doğum'dur - Aile içi küçük bir Kutsal Doğum.",
    check: (res) => {
      assert(res.includes("Kutsal Doğum'dur - Aile"), "Parenthetical double dash must be preserved intact");
      assert.strictEqual(res, "Ve muhtemelen her ebeveynin farkına vardığı bir şeyi de anladım - her doğum, ne olursa olsun, bir Kutsal Doğum'dur - Aile içi küçük bir Kutsal Doğum.");
    }
  },
  {
    input: "Evrende galaksi- sonsuz derinliğe uzanır.",
    expected: "Evrende galaksi - sonsuz derinliğe uzanır.",
    check: (res) => {
      assert(!res.includes("galaksisonsuz"), "Must NOT merge arbitrary noun pairs");
      assert(res.includes("galaksi - sonsuz"), "Must preserve dash between distinct words");
    }
  },
  {
    input: "O felsefe- psikoloji kadar eski bir alandır.",
    expected: "O felsefe - psikoloji kadar eski bir alandır.",
    check: (res) => {
      assert(!res.includes("felsefepsikoloji"), "Must NOT merge arbitrary noun pairs");
      assert(res.includes("felsefe - psikoloji"), "Must preserve dash");
    }
  },
  {
    input: "Bunu açıkça yazdı- kimse itiraz etmedi.",
    expected: "Bunu açıkça yazdı - kimse itiraz etmedi.",
    check: (res) => {
      assert(!res.includes("yazdıkimse"), "Must NOT merge finished verb with noun");
      assert(res.includes("yazdı - kimse"), "Must preserve dash after finished verb");
    }
  },
  {
    input: "Kafamda lenfoepitelyoma (kelimenin kendisi dahi kanserli) . . . bir, bilemedin bir buçuk yıl . . . dönüp duruyordu.",
    expected: "Kafamda lenfoepitelyoma (kelimenin kendisi dahi kanserli) ... bir, bilemedin bir buçuk yıl ... dönüp duruyordu.",
    check: (res) => {
      assert(res.includes("..."), "Must normalize '. . .' -> '...'");
    }
  },
  {
    input: "Mladost 1 'deki evde oturduk.",
    expected: "Mladost 1'deki evde oturduk.",
    check: (res) => {
      assert(res.includes("Mladost 1'deki"), "Must fix \"Mladost 1 'deki\" -> \"Mladost 1'deki\"");
    }
  },
  {
    input: "Sonra eve uzun bir yürüyüş yaptık. 124 Ve ancak Mladost 1'deki evde oturduk.",
    expected: "Sonra eve uzun bir yürüyüş yaptık. Ve ancak Mladost 1'deki evde oturduk.",
    check: (res) => {
      assert(!res.includes("124"), "Must remove leaked page number between sentences");
      assert(res.includes("yaptık. Ve ancak"), "Sentences must join cleanly");
    }
  },
  {
    input: "Bir de göğsümü sıkıştırıyor... 2.",
    expected: "Bir de göğsümü sıkıştırıyor...",
    check: (res) => {
      assert(!res.includes("2."), "Must remove leaked page number at paragraph end");
      assert.strictEqual(res, "Bir de göğsümü sıkıştırıyor...");
    }
  },
  {
    input: "N de en gelmedi.,, Bu doğru deil.",
    expected: "Neden gelmedi. Bu doğru değil.",
    check: (res) => {
      assert(res.includes("Neden gelmedi"), "Must stitch 'N de en' -> 'Neden'");
      assert(res.includes("doğru değil"), "Must repair 'deil' -> 'değil'");
      assert(!res.includes(",,"), "Must clean multiple consecutive commas");
    }
  },
  {
    input: "g e l d i ve baladı konuşmaya.",
    expected: "geldi ve başladı konuşmaya.",
    check: (res) => {
      assert(res.includes("geldi"), "Must stitch 'g e l d i' -> 'geldi'");
      assert(res.includes("başladı"), "Must repair 'baladı' -> 'başladı'");
    }
  },
  {
    input: "k i t a p l a r ı masaya bıraktı ve d ü ş ü n d ü.",
    expected: "kitapları masaya bıraktı ve düşündü.",
    check: (res) => {
      assert(res.includes("kitapları"), "Must stitch 'k i t a p l a r ı' -> 'kitapları'");
      assert(res.includes("düşündü"), "Must stitch 'd ü ş ü n d ü' -> 'düşündü'");
    }
  },
  {
    input: "T ar i h i olayları a n l a t t ı.",
    expected: "Tarihi olayları anlattı.",
    check: (res) => {
      assert(res.includes("Tarihi"), "Must stitch 'T ar i h i' -> 'Tarihi' with uppercase preserved");
      assert(res.includes("anlattı"), "Must stitch 'a n l a t t ı' -> 'anlattı'");
    }
  },
  {
    input: 'Kalktım ayağa. "İyi ş anslar."',
    expected: 'Kalktım ayağa. "İyi şanslar."',
    check: (res) => {
      assert(res.includes("İyi şanslar"), "Must bind single letter 'ş' rightwards to 'şanslar'");
      assert(!res.includes("i̇yiş"), "Must NOT create 'i̇yiş'");
    }
  },
  {
    input: '"Luciditee\'nin E serisini sen yapmışsın. Çeyrek M, de ğil mi?"',
    expected: '"Luciditee\'nin E serisini sen yapmışsın. Çeyrek M, değil mi?"',
    check: (res) => {
      assert(res.includes("değil mi"), "Must repair 'de ğil' -> 'değil'");
      assert(res.includes("E serisini"), "Must NOT merge 'E' into 'Luciditee'");
    }
  },
  {
    input: 'Rowan\'ın aklı en iyi karanlıkta çalışır.',
    expected: 'Rowan\'ın aklı en iyi karanlıkta çalışır.',
    check: (res) => {
      assert(res.includes("en iyi"), "Must NOT merge valid standalone 'en' + 'iyi'");
    }
  },
  {
    input: '"Öyle mi?" dedim. "Onu mu kastettin, Rowan?"',
    expected: '"Öyle mi?" dedim. "Onu mu kastettin, Rowan?"',
    check: (res) => {
      assert(res.includes("Onu mu"), "Must NOT merge question clitic 'mu' into 'onumu'");
    }
  },
  {
    input: 'Gersh Andy\'ye ayı ve güneşi vadedecek',
    expected: 'Gersh Andy\'ye ayı ve güneşi vadedecek',
    check: (res) => {
      assert(res.includes("Andy'ye ayı"), "Must NOT merge 'Andy'ye' + 'ayı'");
    }
  },
  {
    input: 'Hak etmedi ğimde bile bana hep iyi davranmıştı.',
    expected: 'Hak etmediğimde bile bana hep iyi davranmıştı.',
    check: (res) => {
      assert(res.includes("etmediğimde"), "Must reconnect suffix 'etmedi ğimde' -> 'etmediğimde'");
      assert(res.includes("hep iyi"), "Must NOT merge 'hep' + 'iyi'");
    }
  },
  {
    input: 'O yüzden onaylama yışı dokunuyordu.',
    expected: 'O yüzden onaylamayışı dokunuyordu.',
    check: (res) => {
      assert(res.includes("onaylamayışı"), "Must reconnect suffix 'onaylama yışı' -> 'onaylamayışı'");
    }
  },
  {
    input: '"Tek işi olan sen değilsin!',
    expected: '"Tek işi olan sen değilsin!',
    check: (res) => {
      assert(res.includes("Tek işi"), "Must NOT merge 'Tek' + 'işi'");
    }
  },
  {
    input: 'Caleb\'ımın, di ğer tüm Caleblardan daha iyi, claha farklı göründü ğünü söylemem lazım.',
    expected: 'Caleb\'ımın, diğer tüm Caleblardan daha iyi, daha farklı göründüğünü söylemem lazım.',
    check: (res) => {
      assert(res.includes("diğer tüm"), "Must repair 'di ğer' -> 'diğer' and keep 'tüm' separate");
      assert(res.includes("daha farklı"), "Must repair 'claha' -> 'daha'");
      assert(res.includes("göründüğünü"), "Must repair 'göründü ğünü' -> 'göründüğünü'");
    }
  },
  {
    input: 'Sende ne fikir ler var, Rowan?',
    expected: 'Sende ne fikirler var, Rowan?',
    check: (res) => {
      assert(res.includes("fikirler"), "Must reconnect plural suffix 'fikir ler' -> 'fikirler'");
    }
  },
  {
    input: 'dünyayı değiş tirmek istiyor.',
    expected: 'dünyayı değiştirmek istiyor.',
    check: (res) => {
      assert(res.includes("değiştirmek"), "Must reconnect verbal suffix 'değiş tirmek' -> 'değiştirmek'");
    }
  },
  {
    input: '"Faraday kesesi," dedi k aynı anda üçümüz birden.',
    expected: '"Faraday kesesi," dedik aynı anda üçümüz birden.',
    check: (res) => {
      assert(res.includes("dedik aynı"), "Must bind 'k' leftwards to 'dedi' -> 'dedik'");
      assert(!res.includes("kaynı"), "Must NOT create 'kaynı'");
    }
  },
  {
    input: 'taklala r atıyordu.',
    expected: 'taklalar atıyordu.',
    check: (res) => {
      assert(res.includes("taklalar atıyordu"), "Must bind 'r' leftwards to 'taklala' -> 'taklalar'");
      assert(!res.includes("ratıyordu"), "Must NOT create 'ratıyordu'");
    }
  },
  {
    input: 'Dr. Joo örtülere sarmala nmış yığını özenle bıraktı kolla rıma.',
    expected: 'Dr. Joo örtülere sarmalanmış yığını özenle bıraktı kollarıma.',
    check: (res) => {
      assert(res.includes("sarmalanmış"), "Must reconnect 'sarmala nmış' -> 'sarmalanmış'");
      assert(res.includes("kollarıma"), "Must reconnect 'kolla rıma' -> 'kollarıma'");
    }
  },
  {
    input: '"B·ıraz soruştur umd . . ."',
    expected: '"Biraz soruştur umd..."',
    check: (res) => {
      assert(res.includes("Biraz"), "Must clean intra-word bullet/dot 'B·ıraz' -> 'Biraz'");
    }
  },
  {
    input: 'bir dava bulunduğunu söylemek zorundasın. O tür açıklamalar',
    expected: 'bir dava bulunduğunu söylemek zorundasın. O tür açıklamalar',
    check: (res) => {
      assert(res.includes("O tür"), "Must NOT merge 'O' + 'tür' into 'Otür'");
    }
  }
];

for (const [idx, tc] of testCases.entries()) {
  const result = applyTurkishRegexPreClean(tc.input);
  console.log(`Test case ${idx + 1}: input="${tc.input}" -> output="${result}"`);
  tc.check(result);
}

// 2. Test applyTurkishRegexWithLogs
console.log('Testing applyTurkishRegexWithLogs...');
const sampleText = "Tarihi yapı- lamaz denilen surlar. yarm sabah Bu durum çok tuhaftır- ama yine de devam etti.";
const { cleaned, logs } = applyTurkishRegexWithLogs(sampleText, "block-1", "chapter-1", "Test Chapter");

console.log(`Cleaned text: "${cleaned}"`);
console.log(`Generated ${logs.length} log entry(ies).`);

assert(logs.length > 0, "Logs should not be empty");
for (const log of logs) {
  assert.strictEqual(log.source, 'regex', "Log source must be 'regex'");
  assert(typeof log.ruleName === 'string' && log.ruleName.length > 0, "Log ruleName must be a non-empty string");
  assert(Array.isArray(log.changes) && log.changes.length > 0, "Log changes must be a non-empty array");
  for (const change of log.changes) {
    assert(typeof change.before === 'string', "Change before must be string");
    assert(typeof change.after === 'string', "Change after must be string");
  }
}

// 3. Test Translation Prompt Generator & Context Preservation
console.log('Testing Translation Prompt Generator...');

assert(BOOK_TRANSLATION_SYSTEM_PROMPT.includes('7 HATA'), 'Must include 7 translation errors/principles');
assert(BOOK_TRANSLATION_SYSTEM_PROMPT.includes('KELİME KELİME'), 'Must caution against word-for-word translation');
assert(BOOK_TRANSLATION_SYSTEM_PROMPT.includes('YAZARIN SES TONU'), 'Must emphasize author voice & tone');

const promptSample = buildTranslationUserPrompt({
  sourceLang: 'en',
  targetLang: 'tr',
  style: 'literary',
  bookTitle: 'Harry Potter and the Sorcerer\'s Stone',
  chapterTitle: 'Chapter 1: The Boy Who Lived',
  rollingContext: [
    {
      source: "Mr. Dursley was the director of a firm called Grunnings.",
      translated: "Bay Dursley, Grunnings adında bir firmanın yöneticisiydi."
    }
  ],
  glossary: {
    'Muggle': 'Muggle',
    'Privet Drive': 'Privet Drive'
  },
  content: '[BLOCK_0]\n<p>He was a big, beefy man with hardly any neck.</p>\n[/BLOCK_0]'
});

console.log('Sample Translation Prompt Output:\n', promptSample);

assert(promptSample.includes('İngilizce'), 'Must resolve English language name');
assert(promptSample.includes('Türkçe'), 'Must resolve Turkish target language name');
assert(promptSample.includes('Harry Potter and the Sorcerer\'s Stone'), 'Must include book title');
assert(promptSample.includes('Chapter 1: The Boy Who Lived'), 'Must include chapter title');
assert(promptSample.includes('Bay Dursley, Grunnings adında'), 'Must include rolling context');
assert(promptSample.includes('Muggle -> Muggle'), 'Must include glossary mapping');
assert(promptSample.includes('[BLOCK_0]'), 'Must include formatted input block');

assert.strictEqual(getLanguageName('en'), 'İngilizce');
assert.strictEqual(getLanguageName('de'), 'Almanca');
assert.strictEqual(getLanguageName('tr'), 'Türkçe');
assert.strictEqual(getLanguageName('auto'), 'Otomatik Algıla (Auto-Detect)');

console.log('All unit assertions passed successfully!');

// 4. Test parseBatchResponse robustness
console.log('Testing parseBatchResponse multi-tag resilience...');

// Standard format
const res1 = parseBatchResponse('[BLOCK_0]\n<p>Paragraf 1</p>\n[/BLOCK_0]\n\n[BLOCK_1]\n<p>Paragraf 2</p>\n[/BLOCK_1]', 2);
assert.strictEqual(res1.length, 2);
assert.strictEqual(res1[0], '<p>Paragraf 1</p>');
assert.strictEqual(res1[1], '<p>Paragraf 2</p>');

// XML / Angle bracket format
const res2 = parseBatchResponse('<BLOCK_0><p>Paragraf 1</p></BLOCK_0>\n<BLOCK_1><p>Paragraf 2</p></BLOCK_1>', 2);
assert.strictEqual(res2.length, 2);
assert.strictEqual(res2[0], '<p>Paragraf 1</p>');
assert.strictEqual(res2[1], '<p>Paragraf 2</p>');

// Turkish BLOK format
const res3 = parseBatchResponse('[BLOK_0]\n<p>Paragraf 1</p>\n[/BLOK_0]\n\n[BLOK_1]\n<p>Paragraf 2</p>\n[/BLOK_1]', 2);
assert.strictEqual(res3.length, 2);
assert.strictEqual(res3[0], '<p>Paragraf 1</p>');
assert.strictEqual(res3[1], '<p>Paragraf 2</p>');

// Unclosed sequential blocks
const res4 = parseBatchResponse('[BLOCK_0] Paragraf 1 [BLOCK_1] Paragraf 2', 2);
assert.strictEqual(res4.length, 2);
assert.strictEqual(res4[0], 'Paragraf 1');
assert.strictEqual(res4[1], 'Paragraf 2');

// Markdown code fence wrapped
const res5 = parseBatchResponse('```html\n[BLOCK_0]\n<p>Paragraf 1</p>\n[/BLOCK_0]\n```', 1);
assert.strictEqual(res5.length, 1);
assert.strictEqual(res5[0], '<p>Paragraf 1</p>');

// Leaked tag stripping
const res6 = parseBatchResponse('[BLOCK_0]\n<p>Paragraf 1 [/BLOCK_13] [BLOCK_14]</p>\n[/BLOCK_0]', 1);
assert.strictEqual(res6.length, 1);
assert.strictEqual(res6[0], '<p>Paragraf 1</p>');

console.log('All parseBatchResponse tests passed successfully!');

// 5. Test hasOcrAnomaly Detection
console.log('Testing hasOcrAnomaly multi-factor evaluation...');

assert.strictEqual(hasOcrAnomaly("Bu tamamen temiz ve düzgün bir Türkçe cümledir."), false, "Clean sentence must have NO anomaly");
assert.strictEqual(hasOcrAnomaly("Bu cümlede \uFFFD bozuk karakter var."), true, "Replacement char must trigger anomaly");
assert.strictEqual(hasOcrAnomaly("N de en geldi ama olmadı"), true, "Split letters must trigger anomaly");
assert.strictEqual(hasOcrAnomaly("O da bir insandı ve ya da geldi."), false, "Valid short Turkish phrases must not trigger anomaly");
assert.strictEqual(hasOcrAnomaly("Bozuk noktalama .,, vardı"), true, "Irregular punctuation must trigger anomaly");
assert.strictEqual(hasOcrAnomaly("krtklm buraya gelemez"), true, "4+ consonants 'krtklm' must trigger anomaly");

console.log('All hasOcrAnomaly tests passed successfully!');

// 6. Test EPUB Block Extraction with Div-based containers (e.g. Calibre generated EPUBs)
console.log('Testing extractBlocksFromHtml and reconstructChapterHtml for div containers...');
const divHtmlSample = `<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Test Book</title></head>
  <body>
    <div class="header"><h1>Chapter 1</h1></div>
    <div class="empty"><p></p></div>
    <div class="text-block"><span>First sentence in a div without p tag.</span></div>
    <div class="text-block"><span>Second sentence in another div.</span></div>
  </body>
</html>`;

const { title: extractedTitle, blocks: extractedBlocks } = extractBlocksFromHtml(divHtmlSample, 1);
assert.strictEqual(extractedTitle, 'Test Book');
assert.strictEqual(extractedBlocks.length, 3);
assert.strictEqual(extractedBlocks[0].originalText, 'Chapter 1');
assert.strictEqual(extractedBlocks[1].originalText, 'First sentence in a div without p tag.');
assert.strictEqual(extractedBlocks[2].originalText, 'Second sentence in another div.');

// Test reconstruction
extractedBlocks[1].correctedHtml = '<span>First corrected sentence.</span>';
extractedBlocks[1].correctedText = 'First corrected sentence.';
const reconstructedHtml = reconstructChapterHtml({
  id: 'ch-1',
  href: 'ch1.xhtml',
  title: 'Chapter 1',
  rawContent: divHtmlSample,
  blocks: extractedBlocks,
  isSelected: true,
  status: 'completed',
  stats: { totalBlocks: 3, processedBlocks: 3, fixedWords: 1 }
});

assert(reconstructedHtml.includes('First corrected sentence.'), 'Reconstructed HTML must include corrected text in div container');
console.log('All EPUB div-container tests passed successfully!');

// 7. Test PDF Area Selection, Representative Page Analysis & Crop Bounds
console.log('Testing PDF Area Selection and Representative Page Analysis...');
if (fs.existsSync('public/ornek-bozuk-turkce.pdf')) {
  const pdfBuffer = fs.readFileSync('public/ornek-bozuk-turkce.pdf');
  const repPage = await findRepresentativePdfPage(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength));
  
  assert(repPage.totalPages >= 1, 'Total pages must be >= 1');
  assert(repPage.pageNumber >= 1 && repPage.pageNumber <= repPage.totalPages, 'Representative page must be within document range');
  assert(typeof repPage.recommendedCrop.topPercent === 'number', 'Recommended top crop must be number');
  assert(typeof repPage.recommendedCrop.bottomPercent === 'number', 'Recommended bottom crop must be number');

  // Test full page parsing (preserveAllLines: true)
  const fullResult = await parsePdf(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength), {
    preserveAllLines: true,
    cropBounds: { topPercent: 0, bottomPercent: 0, leftPercent: 0, rightPercent: 0 }
  });

  assert(fullResult.chapters.length >= 1, 'Parsed PDF must generate at least 1 chapter');
  const totalFullBlocks = fullResult.chapters.reduce((acc, c) => acc + c.blocks.length, 0);
  assert(totalFullBlocks >= 1, 'Full page PDF parsing must extract text blocks');

  // Test customized crop bounds
  const croppedResult = await parsePdf(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength), {
    cropBounds: { topPercent: 0.05, bottomPercent: 0.05, leftPercent: 0.02, rightPercent: 0.02 }
  });

  assert(croppedResult.chapters.length >= 1, 'Cropped PDF must generate chapters');
  console.log('All PDF Area Selection and Crop Bounds tests passed successfully!');

  // Test extractImages option on PDF parsing
  const imgResult = await parsePdf(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength), {
    extractImages: true,
    cropBounds: { topPercent: 0.04, bottomPercent: 0.04, leftPercent: 0, rightPercent: 0 }
  });
  assert(imgResult.chapters.length >= 1, 'PDF parsing with extractImages must succeed');
  console.log('PDF Image Extraction test passed successfully!');
}

// 8. Test EPUB Packaging with Image Assets
console.log('Testing createEpubFromChapters with embedded images...');
const sampleMeta = { title: 'Resimli Kitap', creator: 'Test Yazar', language: 'tr' };
const sampleChapters = [
  {
    id: 'ch1',
    href: 'OEBPS/chapter_01.xhtml',
    title: 'Bölüm 1',
    rawContent: '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Bölüm 1</title></head><body><section><p>Metin</p><figure class="epub-figure"><img src="images/img_test.jpg" alt="Test Görseli" /></figure></section></body></html>',
    blocks: [],
    isSelected: true,
    status: 'completed',
    stats: { totalBlocks: 1, processedBlocks: 1, fixedWords: 0 }
  }
];
const dummyImageData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
const sampleImages = [
  {
    id: 'img_test',
    href: 'OEBPS/images/img_test.jpg',
    data: dummyImageData,
    mediaType: 'image/jpeg',
    isCover: false
  }
];

const epubZipWithImages = await createEpubFromChapters(sampleMeta, sampleChapters, sampleImages);
const imgFileInZip = epubZipWithImages.file('OEBPS/images/img_test.jpg');
assert(imgFileInZip !== null, 'Image must be written to OEBPS/images/ inside EPUB zip');

const opfContent = await epubZipWithImages.file('OEBPS/content.opf').async('text');
assert(opfContent.includes('href="images/img_test.jpg"'), 'Manifest in content.opf must register image href');
assert(opfContent.includes('media-type="image/jpeg"'), 'Manifest in content.opf must register image media-type');
console.log('All EPUB Image Asset tests passed successfully!');

// 9. Test End-to-End PDF Image Extraction and Embedding
console.log('Testing End-to-End PDF Image Extraction and Block Integration...');
const testPdfDoc = await PDFDocument.create();
const testPdfPage = testPdfDoc.addPage([400, 600]);
testPdfPage.drawText('Chapter 1: The Adventure Begins', { x: 50, y: 550, size: 16, color: rgb(0, 0, 0) });
const pngAssetBytes = fs.readFileSync('public/icon.png');
const embeddedPng = await testPdfDoc.embedPng(pngAssetBytes);
testPdfPage.drawImage(embeddedPng, { x: 50, y: 350, width: 200, height: 150 });
testPdfPage.drawText('Illustration caption text below.', { x: 50, y: 320, size: 12, color: rgb(0, 0, 0) });

const generatedPdfBytes = await testPdfDoc.save();
const parsedWithImages = await parsePdf(generatedPdfBytes.buffer.slice(generatedPdfBytes.byteOffset, generatedPdfBytes.byteOffset + generatedPdfBytes.byteLength), {
  extractImages: true,
  preserveAllLines: true,
});

assert.strictEqual(parsedWithImages.metadata.imageCount, 1, 'Extracted metadata must count 1 image');
assert(parsedWithImages.chapters.length >= 1, 'Must generate at least 1 chapter');

const hasFigureBlock = parsedWithImages.chapters[0].blocks.some((b) => b.elementTag === 'figure' && b.originalHtml.includes('<img src="images/'));
assert(hasFigureBlock, 'Chapter must contain a figure block with img tag');

const zipHasImage = parsedWithImages.zip.file('OEBPS/images/img_p1_1.jpg') !== null;
assert(zipHasImage, 'EPUB zip must contain the extracted image file OEBPS/images/img_p1_1.jpg');

const zipOpf = await parsedWithImages.zip.file('OEBPS/content.opf').async('text');
assert(zipOpf.includes('href="images/img_p1_1.jpg"'), 'content.opf manifest must declare images/img_p1_1.jpg');
console.log('End-to-End PDF Image Extraction test passed 100% successfully!');

// 10. Test Figure Block Reconstruction in EPUB Chapters
console.log('Testing Figure Block Preservation in Chapter Reconstruction...');
const chapterWithFigure = {
  id: 'ch-fig',
  href: 'OEBPS/ch_fig.xhtml',
  title: 'Resimli Bölüm',
  rawContent: '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Resimli Bölüm</title></head><body><section><p>Paragraf 1</p><figure class="epub-figure"><img src="images/img_p1_1.jpg" alt="test" /></figure><p>Paragraf 2</p></section></body></html>',
  blocks: [
    { id: '1-0', elementTag: 'p', originalHtml: 'Paragraf 1', originalText: 'Paragraf 1', correctedHtml: 'Paragraf 1 Düzeltildi', correctedText: 'Paragraf 1 Düzeltildi', status: 'completed', diffCount: 1 },
    { id: '1-1', elementTag: 'figure', originalHtml: '<figure class="epub-figure"><img src="images/img_p1_1.jpg" alt="test" /></figure>', originalText: '[Görsel]', correctedHtml: '<figure class="epub-figure"><img src="images/img_p1_1.jpg" alt="test" /></figure>', correctedText: '[Görsel]', status: 'completed', diffCount: 0 },
    { id: '1-2', elementTag: 'p', originalHtml: 'Paragraf 2', originalText: 'Paragraf 2', correctedHtml: 'Paragraf 2 Düzeltildi', correctedText: 'Paragraf 2 Düzeltildi', status: 'completed', diffCount: 1 }
  ],
  isSelected: true,
  status: 'completed',
  stats: { totalBlocks: 3, processedBlocks: 3, fixedWords: 2 }
};

const reHtml = reconstructChapterHtml(chapterWithFigure);
assert(reHtml.includes('Paragraf 1 Düzeltildi'), 'Must contain updated paragraph 1');
assert(reHtml.includes('<figure class="epub-figure"><img src="images/img_p1_1.jpg" alt="test" /></figure>'), 'Must preserve figure block intact');
assert(reHtml.includes('Paragraf 2 Düzeltildi'), 'Must contain updated paragraph 2 without shifting');
console.log('Chapter Reconstruction with Figure blocks passed 100% successfully!');

// 11. Test Cloudflare Pages Function with Real KV Storage Protocol
console.log('Testing Cloudflare Pages Function KV Storage Protocol...');
const { onRequestGet: cfGet, onRequestPost: cfPost } = await import('../functions/api/stats.ts');

const mockKvStore = new Map();
const mockKv = {
  get: async (key) => mockKvStore.get(key) || null,
  put: async (key, val) => { mockKvStore.set(key, val); }
};

// 1. Initial GET on empty KV -> starts with 0
const cfGetRes1 = await cfGet({ env: { STATS_KV: mockKv }, request: new Request('http://localhost/api/stats') });
const cfGetData1 = await cfGetRes1.json();
assert.strictEqual(cfGetData1.success, true);
assert.strictEqual(cfGetData1.stats.totalConverted, 0);
assert.strictEqual(cfGetData1.stats.totalTranslated, 0);
assert.strictEqual(cfGetData1.stats.totalWordsFixed, 0);

// 2. POST convert -> increments totalConverted in KV
const cfPostRes1 = await cfPost({
  env: { STATS_KV: mockKv },
  request: new Request('http://localhost/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'convert', fixedWords: 25 })
  })
});
const cfPostData1 = await cfPostRes1.json();
assert.strictEqual(cfPostData1.success, true);
assert.strictEqual(cfPostData1.stats.totalConverted, 1);
assert.strictEqual(cfPostData1.stats.totalWordsFixed, 25);

// 3. Second GET -> reflects KV persisted data
const cfGetRes2 = await cfGet({ env: { STATS_KV: mockKv }, request: new Request('http://localhost/api/stats') });
const cfGetData2 = await cfGetRes2.json();
assert.strictEqual(cfGetData2.stats.totalConverted, 1);
assert.strictEqual(cfGetData2.stats.totalWordsFixed, 25);
console.log('Cloudflare Pages Function KV Storage Protocol passed 100% successfully!');

// 12. Test Footnote Tag Protection in Turkish OCR Regex & Anomaly Checking
console.log('Testing Footnote Tag Protection in Regex & Anomaly checking...');
const textWithFootnote = "Modern edebiyat kuramı[^p1_1] bu konuda yarm sabah çok önemli bir clünya görüşü sunar.";
const cleanedFnText = applyTurkishRegexPreClean(textWithFootnote);
assert(cleanedFnText.includes('[^p1_1]'), 'Footnote tag [^p1_1] must be preserved intact during regex cleaning');
assert(cleanedFnText.includes('yarın sabah'), 'OCR error "yarm sabah" must still be repaired');
assert(cleanedFnText.includes('dünya görüşü'), 'OCR error "clünya" must still be repaired');
assert.strictEqual(hasOcrAnomaly("Düzgün bir cümle[^p45_1] ve devamı."), false, "Footnote tag must not trigger false OCR anomaly");

const footnoteDefText = "[^p1_1]: Terry Eagleton, Edebiyat Kuramı Giriş, 1983.";
const cleanedDefText = applyTurkishRegexPreClean(footnoteDefText);
assert(cleanedDefText.startsWith('[^p1_1]:'), 'Footnote definition tag must remain preserved');
console.log('Footnote Tag Protection tests passed successfully!');

// 13. Test Footnote Renumbering and Interactive Popup EPUB 3 XHTML Synthesis
console.log('Testing Footnote Renumbering and EPUB 3 Synthesis...');
const sampleRawBlocks = [
  { text: 'İlk paragraf metni burada yer almaktadır[^p45_1]. İkinci bir referans da var[^p45_2].', isHeading: false },
  { text: 'İkinci paragrafta başka bir sayfadan gelen referans var[^p46_1].', isHeading: false },
  { text: '[^p45_1]: Sayfa 45 birinci dipnot açıklaması.', isFootnote: true },
  { text: '[^p45_2]: Sayfa 45 ikinci dipnot açıklaması.', isFootnote: true },
  { text: '[^p46_1]: Sayfa 46 birinci dipnot açıklaması.', isFootnote: true }
];

const synthResult = renumberAndSynthesizeFootnotes(sampleRawBlocks, 'ch-1');
assert.strictEqual(synthResult.footnotes.length, 3, 'Must extract and map 3 footnotes');
assert.strictEqual(synthResult.footnotes[0].number, 1);
assert.strictEqual(synthResult.footnotes[1].number, 2);
assert.strictEqual(synthResult.footnotes[2].number, 3);

// Verify body noteref markup
assert(synthResult.bodyBlocks[0].html.includes('<a href="#fn-1" id="ref-1" class="epub-noteref" epub:type="noteref"><sup>[1]</sup></a>'), 'Must contain EPUB 3 noteref 1');
assert(synthResult.bodyBlocks[0].html.includes('<a href="#fn-2" id="ref-2" class="epub-noteref" epub:type="noteref"><sup>[2]</sup></a>'), 'Must contain EPUB 3 noteref 2');
assert(synthResult.bodyBlocks[1].html.includes('<a href="#fn-3" id="ref-3" class="epub-noteref" epub:type="noteref"><sup>[3]</sup></a>'), 'Must contain EPUB 3 noteref 3');

// Verify aside footnote definitions
assert(synthResult.chapterXhtml.includes('<aside id="fn-1" class="epub-footnote" epub:type="footnote"><p><a href="#ref-1" class="epub-footnote-backlink">1.</a> Sayfa 45 birinci dipnot açıklaması.</p></aside>'), 'Must synthesize valid EPUB 3 aside footnote 1');
assert(synthResult.chapterXhtml.includes('<aside id="fn-2" class="epub-footnote" epub:type="footnote"><p><a href="#ref-2" class="epub-footnote-backlink">2.</a> Sayfa 45 ikinci dipnot açıklaması.</p></aside>'), 'Must synthesize valid EPUB 3 aside footnote 2');
assert(synthResult.chapterXhtml.includes('<aside id="fn-3" class="epub-footnote" epub:type="footnote"><p><a href="#ref-3" class="epub-footnote-backlink">3.</a> Sayfa 46 birinci dipnot açıklaması.</p></aside>'), 'Must synthesize valid EPUB 3 aside footnote 3');
assert(synthResult.chapterXhtml.includes('epub:type="footnotes"'), 'Must contain footnotes section with epub:type');
console.log('Footnote Renumbering and EPUB 3 Synthesis tests passed successfully!');

// 14. Test PDF Extraction with Footnote References and Bottom Definitions
console.log('Testing PDF Page Footnote Extraction logic...');
const mockPageLines = [
  { y: 100, minX: 50, maxX: 500, height: 12, fontSize: 12, text: 'Bu araştırmada modern yaklaşımlar[^1] ele alınmıştır.' },
  { y: 120, minX: 50, maxX: 480, height: 12, fontSize: 12, text: 'Ayrıca karşılaştırmalı yöntemler de kullanılmıştır.' },
  { y: 550, minX: 50, maxX: 450, height: 9, fontSize: 9, text: '1. Ayrıntılı metodoloji için üçüncü bölüme bakınız.' }
];

const extractedPage = extractFootnotesAndBodyFromPage(mockPageLines, 12, 12, 600);
assert.strictEqual(extractedPage.footnoteParagraphs.length, 1, 'Must extract 1 bottom footnote definition');
assert.strictEqual(extractedPage.footnoteParagraphs[0].footnoteId, 'p12_1');
assert(extractedPage.footnoteParagraphs[0].text.includes('[^p12_1]: Ayrıntılı metodoloji için üçüncü bölüme bakınız.'), 'Footnote definition text must be scoped to page');
assert(extractedPage.bodyParagraphs[0].text.includes('[^p12_1]'), 'Body reference must be scoped to [^p12_1]');
console.log('PDF Page Footnote Extraction logic passed successfully!');

// 15. Test End-to-End PDF Generation with Footnotes and EPUB Output
console.log('Testing End-to-End PDF-to-EPUB Footnote Generation...');
const footnotePdfDoc = await PDFDocument.create();
const fnPage = footnotePdfDoc.addPage([550, 700]);

// Title & Body (ASCII safe for standard PDF Helvetica font)
fnPage.drawText('CHAPTER 1: SCIENTIFIC METHODOLOGY', { x: 50, y: 640, size: 14, color: rgb(0, 0, 0) });
fnPage.drawText('Modern scientific theories', { x: 50, y: 600, size: 12, color: rgb(0, 0, 0) });
// Superscript 1 (placed right after theories at x=202)
fnPage.drawText('1', { x: 202, y: 605, size: 8, color: rgb(0, 0, 0) });
fnPage.drawText(' and epistemological foundations are examined.', { x: 210, y: 600, size: 12, color: rgb(0, 0, 0) });

// Footnote definition at bottom (small font)
fnPage.drawText('1. Karl Popper, The Logic of Scientific Discovery, 1934.', { x: 50, y: 80, size: 8.5, color: rgb(0, 0, 0) });

const fnPdfBytes = await footnotePdfDoc.save();
const parsedFnPdf = await parsePdf(fnPdfBytes.buffer.slice(fnPdfBytes.byteOffset, fnPdfBytes.byteOffset + fnPdfBytes.byteLength), {
  preserveAllLines: true,
  cropBounds: { topPercent: 0.02, bottomPercent: 0.02, leftPercent: 0, rightPercent: 0 }
});

assert(parsedFnPdf.chapters.length >= 1, 'Must generate at least 1 chapter');
assert(parsedFnPdf.metadata.footnoteCount && parsedFnPdf.metadata.footnoteCount >= 1, 'Metadata must count at least 1 footnote');

const ch1Content = parsedFnPdf.chapters[0].rawContent;
assert(ch1Content.includes('epub:type="noteref"'), 'Chapter rawContent must contain epub:type="noteref"');
assert(ch1Content.includes('epub:type="footnote"'), 'Chapter rawContent must contain epub:type="footnote"');
assert(ch1Content.includes('Karl Popper, The Logic of Scientific Discovery'), 'Chapter must include footnote body text');

const stylesInZip = await parsedFnPdf.zip.file('OEBPS/styles.css').async('text');
assert(stylesInZip.includes('epub-noteref'), 'styles.css must include epub-noteref styling');
assert(stylesInZip.includes('epub-footnote'), 'styles.css must include epub-footnote styling');
console.log('End-to-End PDF-to-EPUB Footnote Generation test passed 100% successfully!');

// 16. Test Global Stats API Serverless Endpoint
console.log('Testing Global Stats API Serverless Endpoint...');
const { DEFAULT_STATS, GET, POST } = await import('../src/app/api/stats/route.ts');
assert.strictEqual(DEFAULT_STATS.totalConverted, 0);
assert.strictEqual(DEFAULT_STATS.totalTranslated, 0);
assert.strictEqual(DEFAULT_STATS.totalWordsFixed, 0);

const initialGetReq = new Request('http://localhost:3000/api/stats');
const initialGetRes = await GET(initialGetReq);
const initialGetData = await initialGetRes.json();
assert.strictEqual(initialGetData.success, true);
assert(typeof initialGetData.stats.totalConverted === 'number');

const convertPostReq = new Request('http://localhost:3000/api/stats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'convert', fixedWords: 15 })
});
const convertPostRes = await POST(convertPostReq);
const convertPostData = await convertPostRes.json();
assert.strictEqual(convertPostData.success, true);
assert.strictEqual(convertPostData.stats.totalConverted, initialGetData.stats.totalConverted + 1);
assert.strictEqual(convertPostData.stats.totalWordsFixed, initialGetData.stats.totalWordsFixed + 15);
console.log('Global Stats API Serverless Endpoint passed 100% successfully!');

// 17. Test Hyphen-Merge DOM Alignment & Zero Paragraph Shift in reconstructChapterHtml
console.log('Testing Hyphen-Merge DOM Alignment & Zero Paragraph Shift...');
const sampleHyphenHtml = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Test</title></head><body><h1>Chapter 1</h1><p>Bu araştırmada kullanılan yöntem-</p><p>lerin tüm detayları incelenmiştir.</p><p>Üçüncü ve son paragraf buradadır.</p></body></html>';
const extractedChapter = extractBlocksFromHtml(sampleHyphenHtml, 'ch1', 1);
assert.strictEqual(extractedChapter.blocks.length, 4, 'Must extract h1 + p1 + merged_p2 + p3');
const p1Block = extractedChapter.blocks[1];
const p2Block = extractedChapter.blocks[2];
const p3Block = extractedChapter.blocks[3];

assert(p1Block.originalText.includes('yöntemlerin'), 'p1 must contain joined word yöntemlerin');
assert.strictEqual(p2Block.isMergedIntoPrevious, true, 'p2 must be marked as isMergedIntoPrevious');
assert(p3Block.originalText.includes('Üçüncü ve son paragraf'), 'p3 must be untouched');

// Simulate block corrections
p1Block.correctedHtml = 'Bu araştırmada kullanılan yöntemlerin tüm detayları incelenmiştir.';
p3Block.correctedHtml = 'Üçüncü ve son paragraf buradadır.';

const reconstructedHyphenHtml = reconstructChapterHtml({
  id: 'ch1',
  href: 'chapter1.xhtml',
  title: 'Chapter 1',
  rawContent: sampleHyphenHtml,
  blocks: extractedChapter.blocks,
  isSelected: true,
  status: 'completed',
  stats: { totalBlocks: 4, processedBlocks: 4, fixedWords: 0 }
});

assert(reconstructedHyphenHtml.includes('<p>Bu araştırmada kullanılan yöntemlerin tüm detayları incelenmiştir.</p>'), 'Reconstructed HTML must contain merged p1');
assert(reconstructedHyphenHtml.includes('<p>Üçüncü ve son paragraf buradadır.</p>'), 'Reconstructed HTML must contain p3 without DOM shift');
assert(!reconstructedHyphenHtml.includes('<p>lerin tüm detayları'), 'Merged second paragraph p2 must be cleanly removed from DOM');
console.log('Hyphen-Merge DOM Alignment passed 100% with ZERO paragraph shift!');

// 18. Test Turkish Circumflex Vowels (â, î, û) Are NOT Flagged as OCR Anomalies
console.log('Testing Turkish Circumflex Vowels Non-Anomaly Rule...');
const standardCircumflexTurkish = 'Rüzgâr estiğinde kâğıtlar uçuştu, hikâye henüz bitmedi ve hâlâ bekliyoruz.';
assert.strictEqual(hasOcrAnomaly(standardCircumflexTurkish), false, 'Circumflex vowels (â, î, û) must NOT trigger OCR anomaly');
console.log('Turkish Circumflex Vowels Non-Anomaly Rule passed 100% successfully!');

// 19. Test PDF Footnote Non-False-Positive on Standard Body Numbers
console.log('Testing PDF Footnote Non-False-Positive on Body Numbers...');
const mockPageWithBodyNumbers = [
  { y: 100, minX: 50, maxX: 500, height: 12, fontSize: 12, text: 'Cilt 1 sayfa 20 üzerindeki Madde 1 metnidir.' },
  { y: 550, minX: 50, maxX: 450, height: 9, fontSize: 9, text: '1. Sayfa altı dipnot metnidir.' }
];
const extractedBodyPage = extractFootnotesAndBodyFromPage(mockPageWithBodyNumbers, 1, 12, 600);
assert(!extractedBodyPage.bodyParagraphs[0].text.includes('Cilt[^p1_1]'), 'Must NOT convert plain "Cilt 1" into footnote reference');
assert(!extractedBodyPage.bodyParagraphs[0].text.includes('Madde[^p1_1]'), 'Must NOT convert plain "Madde 1" into footnote reference');
console.log('PDF Footnote Non-False-Positive passed 100% successfully!');

// 20. Test Large Batch (15k-25k chars, 25+ blocks) Response Parsing Resilience
console.log('Testing Large Batch (15k-25k chars, 25+ blocks) Response Parsing Resilience...');
const largeBatchBlockCount = 25;
let simulatedResponse = '';
const expectedBlockTexts = [];

for (let i = 0; i < largeBatchBlockCount; i++) {
  const paragraphText = `<p>Bu paragraf ${i}. blok içeriğidir ve büyük paket token verimini test etmek için yeterince uzun edebi bir metin parçası içermektedir. Paragraf detayları burada devam eder.</p>`;
  expectedBlockTexts.push(paragraphText);
  if (i % 3 === 0) {
    simulatedResponse += `**[BLOCK_${i}]**\n${paragraphText}\n**[/BLOCK_${i}]**\n\n`;
  } else if (i % 3 === 1) {
    simulatedResponse += `[BLOCK_${i}]:\n${paragraphText}\n[/BLOCK_${i}]\n\n`;
  } else {
    simulatedResponse += `<BLOCK_${i}>${paragraphText}</BLOCK_${i}>\n\n`;
  }
}

assert(simulatedResponse.length > 4000, 'Simulated batch must contain multi-thousand characters');
const parsedLargeBatch = parseBatchResponse(simulatedResponse, largeBatchBlockCount);
assert.strictEqual(parsedLargeBatch.length, largeBatchBlockCount, `Must parse exactly ${largeBatchBlockCount} blocks`);

for (let i = 0; i < largeBatchBlockCount; i++) {
  assert(parsedLargeBatch[i].includes(`Bu paragraf ${i}. blok içeriğidir`), `Block ${i} content must match exactly without shifting`);
}

let oneBasedResponse = '';
for (let i = 1; i <= largeBatchBlockCount; i++) {
  oneBasedResponse += `[BLOCK_${i}]\n<p>1-tabanlı blok metni ${i}</p>\n[/BLOCK_${i}]\n\n`;
}
const parsedOneBased = parseBatchResponse(oneBasedResponse, largeBatchBlockCount);
assert.strictEqual(parsedOneBased.length, largeBatchBlockCount);
assert(parsedOneBased[0].includes('1-tabanlı blok metni 1'), 'First index must map to 0');
assert(parsedOneBased[24].includes('1-tabanlı blok metni 25'), 'Last index must map to 24');

console.log('Large Batch Response Parsing Resilience passed 100% successfully!');

// 21. Test Dynamic Font-Size Based Reflow in reflowLinesToParagraphs
console.log('Testing Dynamic Font-Size Based Reflow...');
const { extractFootnotesAndBodyFromPage: extractFnAndBody } = await import('../src/lib/pdf-engine.ts');

const mockJustifiedLines = [
  { y: 100, minX: 52, maxX: 500, height: 16, fontSize: 16, text: 'Bu satır büyük fontlu bir metnin ilk satırıdır ve' },
  { y: 125, minX: 58, maxX: 495, height: 16, fontSize: 16, text: 'ikinci satır hafif girintili olsa bile cümle ortasında asla bölünmemelidir.' },
  { y: 165, minX: 85, maxX: 490, height: 16, fontSize: 16, text: 'Bu ise yeni bir paragrafın başlangıcıdır.' }
];
const justifiedResult = extractFnAndBody(mockJustifiedLines, 1, 16, 800);
assert.strictEqual(justifiedResult.bodyParagraphs.length, 2, 'Should create exactly 2 paragraphs, not 3');
assert(justifiedResult.bodyParagraphs[0].text.includes('Bu satır büyük fontlu bir metnin ilk satırıdır ve ikinci satır'), 'First paragraph must be merged');
assert(justifiedResult.bodyParagraphs[1].text.includes('Bu ise yeni bir paragrafın başlangıcıdır.'), 'Second paragraph must be distinct');
console.log('Dynamic Font-Size Based Reflow passed 100% successfully!');

// 22. Test Cross-Page Sentence Continuity Across Footnotes and Images
console.log('Testing Cross-Page Sentence Continuity Across Footnotes and Images...');
const mockPage1Lines = [
  { y: 100, minX: 50, maxX: 500, height: 12, fontSize: 12, text: 'Yazar kitabın birinci sayfasında önemli bir tespitte bulundu ve bu tespit' },
  { y: 650, minX: 50, maxX: 400, height: 9, fontSize: 9, text: '1. Bu dipnot sayfa 1 altında yer almaktadır.' }
];
const mockPage2Lines = [
  { y: 100, minX: 50, maxX: 500, height: 12, fontSize: 12, text: 'tüm bilim dünyasını derinden etkiledi.' }
];

const p1Extracted = extractFnAndBody(mockPage1Lines, 1, 12, 700);
const p2Extracted = extractFnAndBody(mockPage2Lines, 2, 12, 700);

const consolidatedTest = [];
const allPagesTest = [
  { page: 1, paragraphs: [...p1Extracted.bodyParagraphs, ...p1Extracted.footnoteParagraphs] },
  { page: 2, paragraphs: [...p2Extracted.bodyParagraphs, ...p2Extracted.footnoteParagraphs] }
];

for (const pageData of allPagesTest) {
  for (const p of pageData.paragraphs) {
    if (p.isImageHtml || p.isFootnote || (p.text.startsWith('[^p') && p.text.includes(']:'))) {
      continue;
    }
    const trimmed = p.text.trim();
    if (!trimmed) continue;

    if (consolidatedTest.length > 0 && !p.isHeading) {
      let lastNormalIndex = -1;
      for (let k = consolidatedTest.length - 1; k >= 0; k--) {
        const cand = consolidatedTest[k];
        if (!cand.isHeading && !cand.isImageHtml && !cand.isFootnote && !cand.text.startsWith('[^p')) {
          lastNormalIndex = k;
          break;
        }
      }

      if (lastNormalIndex >= 0) {
        const lastP = consolidatedTest[lastNormalIndex];
        const lastText = lastP.text.trim();
        const lastEndsWithPunct = /[.?!:»"']\s*$/.test(lastText);
        const currentStartsWithLower = /^[a-zçğıöşü]/.test(trimmed);

        if (lastText.endsWith('-')) {
          lastP.text = lastText.slice(0, -1) + trimmed;
          continue;
        } else if (!lastEndsWithPunct && currentStartsWithLower) {
          lastP.text = lastText + ' ' + trimmed;
          continue;
        }
      }
    }
    consolidatedTest.push(p);
  }
}

assert.strictEqual(consolidatedTest.length, 1, 'Sentence interrupted by footnote across page boundary must merge into 1 paragraph');
assert.strictEqual(consolidatedTest[0].text, 'Yazar kitabın birinci sayfasında önemli bir tespitte bulundu ve bu tespit tüm bilim dünyasını derinden etkiledi.');
console.log('Cross-Page Sentence Continuity passed 100% successfully!');

// 23. Test Hardened Footnote Detection with isVeryNearBottom and Attached Superscripts
console.log('Testing Hardened Footnote Detection and Attached Superscripts...');
const mockPageWithAttachedSuperscript = [
  { y: 200, minX: 50, maxX: 500, height: 12, fontSize: 12, text: 'Önemli bir iddia ortaya atıldı1 ve tartışmalar başladı.' },
  { y: 550, minX: 50, maxX: 450, height: 12, fontSize: 12, text: '1. Bu iddia tarihi kaynaklara dayanır.' }
];
const attachedFnResult = extractFnAndBody(mockPageWithAttachedSuperscript, 5, 12, 600);
assert.strictEqual(attachedFnResult.footnoteParagraphs.length, 1, 'Must detect footnote at bottom even with same font size');
assert(attachedFnResult.bodyParagraphs[0].text.includes('atıldı[^p5_1]'), 'Must link attached number atıldı1 to [^p5_1]');
console.log('Hardened Footnote Detection and Attached Superscripts passed 100% successfully!');

// 24. Test Zero Fake Diff on Footnote Paragraphs in TextBlocks
console.log('Testing Zero Fake Diff in Footnote TextBlocks...');
const tagToFnMap = new Map();
tagToFnMap.set('p10_1', { id: 'fn-1', rawTag: '[^p10_1]', number: 1, text: 'Örnek açıklama' });

const sampleParagraphText = 'Bu cümle bir dipnot[^p10_1] içermektedir.';
const plainTextClean = sampleParagraphText.replace(/\[\^([^\]]+)\]/g, (_m, refTag) => {
  const fnItem = tagToFnMap.get(refTag);
  return fnItem ? `[${fnItem.number}]` : '';
});

const sampleBlock = {
  id: '1-0',
  elementTag: 'p',
  originalHtml: 'Bu cümle bir dipnot<a href="#fn-1"><sup>[1]</sup></a> içermektedir.',
  originalText: plainTextClean,
  correctedHtml: 'Bu cümle bir dipnot<a href="#fn-1"><sup>[1]</sup></a> içermektedir.',
  correctedText: plainTextClean,
  status: 'pending',
  diffCount: 0,
};

assert.strictEqual(sampleBlock.originalText, 'Bu cümle bir dipnot[1] içermektedir.');
assert.strictEqual(sampleBlock.correctedText, 'Bu cümle bir dipnot[1] içermektedir.');
const { diffs, fixedWordCount } = computeTextDiff(sampleBlock.originalText, sampleBlock.correctedText);
assert.strictEqual(fixedWordCount, 0, 'Initial block fixedWordCount must be exactly 0 without fake diffs');
assert.strictEqual(diffs.length, 1, 'Should have only 1 equal diff item');
assert.strictEqual(diffs[0].type, 'equal');
console.log('Zero Fake Diff in Footnote TextBlocks passed 100% successfully!');

// 25. Test Chapter Mode Selection in PdfParseOptions
console.log('Testing Chapter Mode Selection (Fixed Pages vs Auto)...');
const samplePdfWithChapters = await PDFDocument.create();
for (let p = 1; p <= 4; p++) {
  const page = samplePdfWithChapters.addPage([400, 600]);
  page.drawText(`Sayfa ${p} metin icerigi burada yer almaktadir.`, { x: 50, y: 500, size: 12 });
}
const pdfBytes = await samplePdfWithChapters.save();

const autoResult = await parsePdf(pdfBytes.buffer, { chapterMode: 'auto', pagesPerChapterFallback: 2 });
assert(autoResult.chapters.length >= 1, 'Must parse chapters under auto mode');

const fixedResult = await parsePdf(pdfBytes.buffer, { chapterMode: 'fixed_pages', pagesPerChapterFallback: 2 });
assert(fixedResult.chapters.length >= 1, 'Must parse chapters under fixed_pages mode');
console.log('Chapter Mode Selection passed 100% successfully!');






