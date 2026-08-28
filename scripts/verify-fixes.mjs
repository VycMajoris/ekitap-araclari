import { applyTurkishRegexPreClean, applyTurkishRegexWithLogs, hasOcrAnomaly } from '../src/lib/turkish-ocr-rules.ts';
import { parseBatchResponse } from '../src/lib/processor.ts';
import { TdkDictionary } from '../src/lib/tdk-dictionary.ts';
import { extractBlocksFromHtml, reconstructChapterHtml, createEpubFromChapters } from '../src/lib/epub-engine.ts';
import { parsePdf, findRepresentativePdfPage } from '../src/lib/pdf-engine.ts';
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



