import { applyTurkishRegexPreClean, applyTurkishRegexWithLogs, hasOcrAnomaly } from '../src/lib/turkish-ocr-rules.ts';
import { parseBatchResponse } from '../src/lib/processor.ts';
import {
  buildTranslationUserPrompt,
  getLanguageName,
  BOOK_TRANSLATION_SYSTEM_PROMPT,
} from '../src/lib/openrouter.ts';
import assert from 'node:assert';

console.log('Running verification tests for Turkish OCR fixes...');

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

console.log('All parseBatchResponse tests passed successfully!');
