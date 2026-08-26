import fs from 'node:fs';
import path from 'node:path';

async function buildWordList() {
  console.log('Fetching latest TDK autocomplete dictionary...');
  const res = await fetch('https://sozluk.gov.tr/autocomplete.json', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }

  const data = await res.json();
  const trLower = (s) =>
    s
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/[âä]/g, 'a')
      .replace(/[îï]/g, 'i')
      .replace(/[ûü]/g, 'u');

  const words = new Set();
  for (const item of data) {
    if (!item.madde) continue;
    const raw = item.madde.trim();
    if (!raw || raw.startsWith('-') || raw.startsWith('.')) continue;

    const clean = trLower(raw);
    if (clean) {
      if (!clean.includes(' ')) {
        words.add(clean);
      }
      const tokens = clean.replace(/[.,()\-']/g, ' ').split(/\s+/);
      for (const t of tokens) {
        if (t.length >= 2 && !/^\d+$/.test(t)) {
          words.add(t);
        }
      }
    }
  }

  const sortedList = Array.from(words).sort((a, b) => a.localeCompare(b, 'tr'));
  const outDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'tdk-words.txt');
  fs.writeFileSync(outPath, sortedList.join('\n'), 'utf8');
  console.log(
    `Saved ${sortedList.length} words to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`
  );
}

buildWordList();
