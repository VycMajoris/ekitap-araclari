const SOFTENING: Record<string, string> = {
  b: 'p',
  c: 'ç',
  d: 't',
  ğ: 'k',
  g: 'k',
};

const SUFFIXES: string[] = [
  'yormuşsunuz', 'yormuşsun', 'yormuşlar', 'yormuşum', 'yormuşuz', 'yormuş',
  'yorduysanız', 'yorduysam', 'yorduysan', 'yorduysa', 'yorduksa', 'yordular',
  'yordunuz', 'yordum', 'yordun', 'yorduk', 'yordu',
  'yorsanız', 'yorsam', 'yorsan', 'yorsa', 'yorsak', 'yorlar',
  'yorsunuz', 'yorsun', 'yorum', 'yoruz', 'yor',
  'iyormuş', 'ıyormuş', 'uyormuş', 'üyormuş',
  'iyordu', 'ıyordu', 'uyordu', 'üyordu',
  'iyoruz', 'ıyoruz', 'uyoruz', 'üyorsunuz',
  'iyorum', 'ıyorum', 'uyorum', 'üyorum',
  'iyorsun', 'ıyorsun', 'uyorsun', 'üyorsun',
  'iyor', 'ıyor', 'uyor', 'üyor',
  'ecektiniz', 'ecektim', 'ecektin', 'ecektik', 'ecekti',
  'acaktınız', 'acaktım', 'acaktın', 'acaktık', 'acaktı',
  'eceğiz', 'acağımız', 'eceğim', 'eceksin', 'eceksiniz', 'ecekler', 'ecek',
  'acağız', 'acağım', 'acaksın', 'acaksınız', 'acaklar', 'acak',
  'mişlerdi', 'mışlardı', 'muşlardı', 'müşlerdi',
  'miştiniz', 'mıştınız', 'muştunuz', 'müştünüz',
  'miştim', 'mıştım', 'muştum', 'müştüm',
  'miştin', 'mıştın', 'muştun', 'müştün',
  'miştik', 'mıştık', 'muştuk', 'müştük',
  'mişti', 'mıştı', 'muştu', 'müştü',
  'mişsiniz', 'mışsınız', 'muşsunuz', 'müşsünüz',
  'mişsin', 'mışsın', 'muşsun', 'müşsün',
  'mişim', 'mışım', 'muşum', 'müşüm',
  'mişiz', 'mışız', 'muşuz', 'müşüz',
  'mişler', 'mışlar', 'muşlar', 'müşler',
  'miştir', 'mıştır', 'muştur', 'müştür',
  'miş', 'mış', 'muş', 'müş',
  'diniz', 'dınız', 'dunuz', 'dünüz', 'tiniz', 'tınız', 'tunuz', 'tünüz',
  'diler', 'dılar', 'dular', 'düler', 'tiler', 'tılar', 'tular', 'tüler',
  'dim', 'dım', 'dum', 'düm', 'tim', 'tım', 'tum', 'tüm',
  'din', 'dın', 'dun', 'dün', 'tin', 'tın', 'tun', 'tün',
  'dik', 'dık', 'duk', 'dük', 'tik', 'tık', 'tuk', 'tük',
  'di', 'dı', 'du', 'dü', 'ti', 'tı', 'tu', 'tü',
  'erdiniz', 'ardınız', 'irdiniz', 'ırdınız', 'urdunuz', 'ürdünüz',
  'erdim', 'ardım', 'irdim', 'ırdım', 'urdum', 'ürdüm',
  'erdin', 'ardın', 'irdin', 'ırdın', 'urdun', 'ürdün',
  'erdik', 'ardık', 'irdik', 'ırdık', 'urduk', 'ürdük',
  'erdi', 'ardı', 'irdi', 'ırdı', 'urdu', 'ürdü',
  'eriz', 'arız', 'iriz', 'ırız', 'uruz', 'ürüz',
  'erim', 'arım', 'irim', 'ırım', 'urum', 'ürüm',
  'ersin', 'arsın', 'irsin', 'ırsın', 'ursun', 'ürsün',
  'erler', 'arlar', 'irler', 'ırlar', 'urlar', 'ürler',
  'er', 'ar', 'ir', 'ır', 'ur', 'ür',
  'mezdim', 'mazdım', 'mezdin', 'mazdın', 'mezdi', 'mazdı', 'mezdik', 'mazdık',
  'meyiz', 'mayız', 'mem', 'mam', 'mezsin', 'mazsın', 'mezsiniz', 'mazsınız',
  'mez', 'maz', 'me', 'ma',
  'meliydiniz', 'malıydınız', 'meliydim', 'malıydım', 'meliyiz', 'malıyız',
  'meli', 'malı',
  'ebilmek', 'abilmek', 'ebildi', 'abildi', 'ebiliyor', 'abiliyor', 'ebilecek', 'abilecek',
  'lerimizden', 'larımızdan', 'lerimizle', 'larımızla',
  'lerinden', 'larından', 'lerindeki', 'larındaki',
  'lerinizden', 'larınızdan', 'lerimizde', 'larımızda', 'lerimize', 'larımıza',
  'lerimizi', 'larımızı', 'lerimiz', 'larımız', 'leriniz', 'larınız',
  'leriyle', 'larıyla', 'lerinde', 'larında', 'lerine', 'larına', 'lerini', 'larını',
  'lerin', 'ların', 'ler', 'lar',
  'imizden', 'ımızdan', 'umuzdan', 'ümüzden',
  'inizden', 'ınızdan', 'unuzdan', 'ünüzden',
  'imizde', 'ımızda', 'umuzda', 'ümüzde',
  'inizde', 'ınızda', 'unuzda', 'ünüzde',
  'imize', 'ımıza', 'umuza', 'ümüze',
  'inize', 'ınıza', 'unuza', 'ünüze',
  'imizi', 'ımızı', 'umuzu', 'ümüzü',
  'inizi', 'ınızı', 'unuzu', 'ünüzü',
  'imiz', 'ımız', 'umuz', 'ümüz',
  'iniz', 'ınız', 'unuz', 'ünüz',
  'sinden', 'sından', 'sundan', 'sünden',
  'sinde', 'sında', 'sunda', 'sünde',
  'sine', 'sına', 'suna', 'süne',
  'sini', 'sını', 'sunu', 'sünü',
  'siyle', 'sıyla', 'suyla', 'süyle',
  'si', 'sı', 'su', 'sü',
  'den', 'dan', 'ten', 'tan',
  'de', 'da', 'te', 'ta',
  'nin', 'nın', 'nun', 'nün',
  'in', 'ın', 'un', 'ün',
  'ye', 'ya', 'e', 'a',
  'yi', 'yı', 'yu', 'yü', 'i', 'ı', 'u', 'ü',
  'le', 'la', 'yle', 'yla',
  'dir', 'dır', 'dur', 'dür', 'tir', 'tır', 'tur', 'tür',
  'lik', 'lık', 'luk', 'lük',
  'siz', 'sız', 'suz', 'süz',
  'li', 'lı', 'lu', 'lü',
  'ci', 'cı', 'cu', 'cü', 'çi', 'çı', 'çu', 'çü',
  'ce', 'ca', 'çe', 'ça', 'ken', 'leyin'
].sort((a, b) => b.length - a.length);

const STANDALONE_PARTICLES = new Set([
  've', 'ile', 'ama', 'fakat', 'için', 'gibi', 'bu', 'şu', 'o', 'veya',
  'ise', 'çünkü', 'ya', 'da', 'de', 'ki', 'ne', 'bir', 'her', 'az', 'çok', 'daha'
]);

export class TdkDictionary {
  private static instance: TdkDictionary;
  private wordSet: Set<string> = new Set();
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('node:fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('node:path');
        const p = path.resolve(process.cwd(), 'public/tdk-words.txt');
        if (fs.existsSync(p)) {
          const text = fs.readFileSync(p, 'utf8');
          this.loadFromText(text);
        }
      } catch {}
    }
  }

  public static getInstance(): TdkDictionary {
    if (!TdkDictionary.instance) {
      TdkDictionary.instance = new TdkDictionary();
    }
    return TdkDictionary.instance;
  }

  public loadFromText(text: string): void {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const w = lines[i].trim();
      if (w) this.wordSet.add(w);
    }
    this.loaded = true;
  }

  public async init(assetUrl: string = '/tdk-words.txt'): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        if (typeof window !== 'undefined') {
          const res = await fetch(assetUrl);
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          const text = await res.text();
          this.loadFromText(text);
        } else {
          try {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const p = path.resolve(process.cwd(), 'public/tdk-words.txt');
            if (fs.existsSync(p)) {
              const text = fs.readFileSync(p, 'utf8');
              this.loadFromText(text);
            }
          } catch {
            // Environment fallback
          }
        }
      } catch (err) {
        console.warn('TDK Dictionary initialization warning:', err);
      }
    })();

    return this.loadingPromise;
  }

  public isLoaded(): boolean {
    return this.loaded && this.wordSet.size > 0;
  }

  public getWordCount(): number {
    return this.wordSet.size;
  }

  private normalizeTr(s: string): string {
    return s
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/[âä]/g, 'a')
      .replace(/[îï]/g, 'i')
      .replace(/[ûü]/g, 'u');
  }

  private checkStem(stem: string): boolean {
    if (this.wordSet.has(stem)) return true;
    if (this.wordSet.has(stem + 'mak') || this.wordSet.has(stem + 'mek')) return true;

    if (stem.length > 2 && (stem.endsWith('y') || stem.endsWith('n') || stem.endsWith('s') || stem.endsWith('ş'))) {
      const unbuffered = stem.slice(0, -1);
      if (this.wordSet.has(unbuffered) || this.wordSet.has(unbuffered + 'mak') || this.wordSet.has(unbuffered + 'mek')) {
        return true;
      }
    }
    return false;
  }

  public validate(rawInput: string): boolean {
    if (!rawInput) return false;

    const cleaned = this.normalizeTr(rawInput.replace(/[\s\-_]/g, ''));
    if (cleaned.length < 2) return false;

    if (this.checkStem(cleaned)) return true;

    const queue: string[] = [cleaned];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const candidate = queue.shift()!;
      if (visited.has(candidate) || candidate.length < 2) continue;
      visited.add(candidate);

      if (this.checkStem(candidate)) return true;

      const lastChar = candidate[candidate.length - 1];
      if (SOFTENING[lastChar]) {
        const hardened = candidate.slice(0, -1) + SOFTENING[lastChar];
        if (this.checkStem(hardened)) return true;
        queue.push(hardened);
      }

      for (let i = 0; i < SUFFIXES.length; i++) {
        const s = SUFFIXES[i];
        if (candidate.endsWith(s) && candidate.length > s.length + 1) {
          const stem = candidate.slice(0, -s.length);
          if (this.checkStem(stem)) return true;

          const lastStemChar = stem[stem.length - 1];
          if (SOFTENING[lastStemChar]) {
            const hardenedStem = stem.slice(0, -1) + SOFTENING[lastStemChar];
            if (this.checkStem(hardenedStem)) return true;
            queue.push(hardenedStem);
          }
          queue.push(stem);
        }
      }
    }

    return false;
  }

  public repairDynamicSplitWords(text: string): { repaired: string; fixedCount: number } {
    if (!text || text.length < 3) return { repaired: text, fixedCount: 0 };

    let fixedCount = 0;
    const splitRegex = /(?<![\p{L}\p{N}])(?:[\p{L}]{1,3}\s+){1,15}[\p{L}]{1,3}(?![\p{L}\p{N}])/gu;

    const repaired = text.replace(splitRegex, (match) => {
      const rawTokens = match.trim().split(/\s+/);
      if (rawTokens.length <= 1) return match;

      const formatWord = (tokens: string[], word: string): string => {
        let res = word.toLowerCase();
        if (tokens[0] === tokens[0].toUpperCase() && tokens[0] !== tokens[0].toLowerCase()) {
          res = res.charAt(0).toUpperCase() + res.slice(1);
        }
        return res;
      };

      const chunks: { tokens: string[]; isParticle: boolean }[] = [];
      let currentTokens: string[] = [];

      for (const t of rawTokens) {
        if (STANDALONE_PARTICLES.has(t.toLowerCase()) && t.length >= 2) {
          if (currentTokens.length > 0) {
            chunks.push({ tokens: currentTokens, isParticle: false });
            currentTokens = [];
          }
          chunks.push({ tokens: [t], isParticle: true });
        } else {
          currentTokens.push(t);
        }
      }
      if (currentTokens.length > 0) {
        chunks.push({ tokens: currentTokens, isParticle: false });
      }

      const processedChunks: string[] = [];
      for (const chunk of chunks) {
        if (chunk.isParticle || chunk.tokens.length <= 1) {
          processedChunks.push(chunk.tokens.join(' '));
          continue;
        }

        const joined = chunk.tokens.join('');
        if (joined.length >= 3 && this.validate(joined)) {
          fixedCount++;
          processedChunks.push(formatWord(chunk.tokens, joined));
        } else {
          processedChunks.push(chunk.tokens.join(' '));
        }
      }

      return processedChunks.join(' ');
    });

    return { repaired, fixedCount };
  }
}

export function getTdkDictionary(): TdkDictionary {
  return TdkDictionary.getInstance();
}
