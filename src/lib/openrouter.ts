import { OpenRouterModel, TranslationStyle } from './types';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_SOURCE_LANGUAGES: LanguageOption[] = [
  { code: 'auto', name: 'Otomatik Algıla (Auto-Detect)', nativeName: 'Auto' },
  { code: 'en', name: 'İngilizce', nativeName: 'English' },
  { code: 'de', name: 'Almanca', nativeName: 'Deutsch' },
  { code: 'fr', name: 'Fransızca', nativeName: 'Français' },
  { code: 'es', name: 'İspanyolca', nativeName: 'Español' },
  { code: 'it', name: 'İtalyanca', nativeName: 'Italiano' },
  { code: 'ru', name: 'Rusça', nativeName: 'Русский' },
  { code: 'ja', name: 'Japonca', nativeName: '日本語' },
  { code: 'zh', name: 'Çince', nativeName: '中文' },
  { code: 'ar', name: 'Arapça', nativeName: 'العربية' },
  { code: 'pt', name: 'Portekizce', nativeName: 'Português' },
  { code: 'nl', name: 'Felemenkçe', nativeName: 'Nederlands' },
  { code: 'la', name: 'Latince', nativeName: 'Latina' },
  { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe' },
];

export const SUPPORTED_TARGET_LANGUAGES: LanguageOption[] = [
  { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe' },
  { code: 'en', name: 'İngilizce', nativeName: 'English' },
  { code: 'de', name: 'Almanca', nativeName: 'Deutsch' },
  { code: 'fr', name: 'Fransızca', nativeName: 'Français' },
  { code: 'es', name: 'İspanyolca', nativeName: 'Español' },
  { code: 'it', name: 'İtalyanca', nativeName: 'Italiano' },
  { code: 'ru', name: 'Rusça', nativeName: 'Русский' },
  { code: 'ja', name: 'Japonca', nativeName: '日本語' },
  { code: 'zh', name: 'Çince', nativeName: '中文' },
  { code: 'ar', name: 'Arapça', nativeName: 'العربية' },
  { code: 'pt', name: 'Portekizce', nativeName: 'Português' },
  { code: 'nl', name: 'Felemenkçe', nativeName: 'Nederlands' },
];

export const TRANSLATION_STYLES: { id: TranslationStyle; name: string; description: string }[] = [
  {
    id: 'literary',
    name: 'Edebi & Akıcı Roman',
    description: 'Diyalog doğallığı, karakter tonu ve edebi zenginliği koruyan akıcı çeviri.',
  },
  {
    id: 'academic',
    name: 'Akademik & Bilimsel',
    description: 'Terminolojik hassasiyet, nesnel anlatım ve kaynak doğruluğu odaklı çeviri.',
  },
  {
    id: 'casual',
    name: 'Sade & Günlük Dil',
    description: 'Açık, anlaşılır, yalın ve doğrudan ifadeye dayalı çeviri.',
  },
];

export const BOOK_TRANSLATION_SYSTEM_PROMPT = `Sen dünyaca ünlü edebiyat ve akademik eserleri hedef dile çeviren ödüllü bir edebi çevirmen ve metin editörüsün.
Görevin: Verilen e-kitap metin bloklarını kaynak dilden hedef dile, bağlamı, karakter ilişkilerini, anlatıcı tonunu ve atmosferi eksiksiz koruyarak çevirmektir.

KİTAP ÇEVİRİSİ TEMEL İLKELERİ VE KAÇINILACAK 7 HATA:
1. KELİME KELİME (HARFİYEN) ÇEVİRİ TUZAĞINDAN KAÇIN:
   - Asla mekanik, kelimesi kelimesine çeviri yapma. Kaynak dildeki cümleyi hedef dilin doğal sözdizimi, zenginliği ve edebi akıcılığı ile yeniden canlandır.
   - Türkçede eğreti duran yapay çeviri kalıplarından ('tarafından yapıldı', 'yapılmaktadır', 'o bir...') kaçın.
2. YAZARIN SES TONU VE ÜSLUBUNU KORU:
   - Yazarın anlatım ritmini, mizahını, hüznünü, gerilimini veya felsefi derinliğini hedef dile aynı duyguyla aktar.
   - Eserin türüne uygun yaklaşım sergile: Romanlarda duygusal akıcılık ve canlı betimlemeler, akademik eserlerde kavramsal netlik.
3. KÜLTÜREL UYARLAMA VE DEYİM YERELLEŞTİRMESİ:
   - Deyimleri ve mecazları kelime kelimesine çevirme; hedef dildeki en güçlü edebi ve kültürel karşılıklarıyla aktar.
   - Kültürel esprileri ve referansları hedef okuyucunun aynı hissi alacağı doğallıkta uyarla.
4. DİYALOG DOĞALLIĞI VE KARAKTER SESLERİ:
   - Karakterlerin yaş, statü ve kişiliklerine özgü konuşma tarzlarını koru.
   - Karakterler arası hitap şekillerini ('sen' / 'siz'), önceki bağlamdaki (Previous Context) samimiyet derecesine sadık kalarak sürdür.
   - Satır başındaki konuşma çizgilerini (— veya -) asla silme veya bozma.
5. ZAMİR VE KARAKTER/TERİM TUTARLILIĞI:
   - Önceki bağlamda ve sözlükte (Glossary) belirtilen özel isimleri, mekân adlarını ve kurgusal terimleri kitap boyunca %100 tutarlı çevir.
   - Farklı dillerdeki cinsiyet zamirlerini hikâyenin akışına göre doğru şahsa bağla.
6. BİÇİMLENDİRME VE HTML ETİKET KORUMASI:
   - Verilen HTML etiketlerini (örn: <p>, <h1>, <h2>, <h3>, <blockquote>, <em>, <strong>, <b>, <i>, <span>, <a> vb.) AYNEN OLDUĞU GİBİ KORU.
   - İtalik (<em>/<i>) veya kalın (<strong>/<b>) vurgulu ifadelerin çevirisini de aynı etiket içine yerleştir.
7. METİN BÜTÜNLÜĞÜ VE SIFIR HALÜSİNASYON:
   - Hiçbir cümleyi, paragrafı veya düşünceyi atlama, özetleme veya kesme.
   - Metne kendi yorumunu, dipnot veya gereksiz eklemeler katma.

ÇIKTI FORMATI:
- Sana [BLOCK_0]...[/BLOCK_0] etiketleri arasında iletilen her bir paragrafı, yine [BLOCK_0]...[/BLOCK_0] etiketleri içerisinde ve sırasını değiştirmeden ver.
- Başında veya sonunda selamlama, açıklama veya markdown kod bloğu (\`\`\`) ASLA kullanma.`;

export function getLanguageName(code: string): string {
  const found =
    SUPPORTED_SOURCE_LANGUAGES.find((l) => l.code === code) ||
    SUPPORTED_TARGET_LANGUAGES.find((l) => l.code === code);
  return found ? found.name : code;
}

export function buildTranslationUserPrompt({
  sourceLang = 'auto',
  targetLang = 'tr',
  style = 'literary',
  bookTitle,
  chapterTitle,
  rollingContext,
  glossary,
  content,
}: {
  sourceLang?: string;
  targetLang?: string;
  style?: TranslationStyle;
  bookTitle?: string;
  chapterTitle?: string;
  rollingContext?: { source: string; translated: string }[];
  glossary?: Record<string, string>;
  content: string;
}): string {
  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);
  const styleObj = TRANSLATION_STYLES.find((s) => s.id === style) || TRANSLATION_STYLES[0];

  const sections: string[] = [];

  sections.push(`[GÖREV VE HEDEF]
Kaynak Dil: ${sourceName} (${sourceLang})
Hedef Dil: ${targetName} (${targetLang})
Çeviri Üslubu: ${styleObj.name} - ${styleObj.description}`);

  if (bookTitle || chapterTitle) {
    sections.push(`[ESER BAĞLAMI]
${bookTitle ? `Kitap Başlığı: ${bookTitle}` : ''}
${chapterTitle ? `Bölüm Başlığı: ${chapterTitle}` : ''}`.trim());
  }

  if (glossary && Object.keys(glossary).length > 0) {
    const glossaryItems = Object.entries(glossary)
      .map(([term, trans]) => `• ${term} -> ${trans}`)
      .join('\n');
    sections.push(`[ÖZEL TERİM VE KARAKTER SÖZLÜĞÜ (Bu karşılıklara kesinlikle uy)]
${glossaryItems}`);
  }

  if (rollingContext && rollingContext.length > 0) {
    const ctxItems = rollingContext
      .slice(-3) // last 3 blocks max
      .map(
        (c, idx) =>
          `[Önceki Paragraf ${idx + 1}]\nKaynak: ${c.source.slice(0, 300)}\nÇeviri: ${c.translated.slice(0, 300)}`
      )
      .join('\n\n');
    sections.push(`[AKICILIK VE ZAMİR BAĞLAMI (Önceki Paragraflar - Yalnızca tutarlılık referansı içindir, tekrar çevirme)]
${ctxItems}`);
  }

  sections.push(`[ÇEVRİLECEK METİN BLOKLARI]
Lütfen aşağıdaki blokları yukarıdaki bağlam ve kurallara göre ${targetName} diline çevir. Her bloğu [BLOCK_X]...[/BLOCK_X] etiketleri içinde iade et:

${content}`);

  return sections.join('\n\n');
}

export const POPULAR_FREE_MODELS: OpenRouterModel[] = [
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free - En Hızlı)',
    description: 'Çok hızlı, yüksek istek limiti ve yüksek doğruluklu Google modeli.',
    isFree: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct (Free)',
    description: 'En yüksek Türkçe anlama ve düzeltme kalitesi, 128k bağlam.',
    isFree: true,
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct:free',
    name: 'Qwen 2.5 72B Instruct (Free)',
    description: 'Çok dilli metin işleme ve dil bilgisi konusunda çok güçlü.',
    isFree: true,
  },
  {
    id: 'mistralai/mistral-small-24b-instruct-2501:free',
    name: 'Mistral Small 24B (Free)',
    description: 'Hızlı, dengeli ve kararlı Türkçe metin düzeltme.',
    isFree: true,
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 (Free)',
    description: 'Güçlü akıl yürütme modeli, karmaşık OCR bozulmalarında başarılı.',
    isFree: true,
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B Instruct (Free)',
    description: 'Hafif ve hızlı model.',
    isFree: true,
  },
];

export const TURKISH_OCR_SYSTEM_PROMPT = `Sen uzman bir Türkçe metin editörü ve OCR/dönüştürme hatası düzelticisisin.
Görevin: PDF'ten EPUB'a dönüştürülmüş Türkçe kitap metinlerindeki OCR, harf birleşme ve yanlış hece/boşluk ayrışma hatalarını aslına uygun şekilde düzeltmektir.

DÜZELTİLECEK HATA TÜRLERİ:
1. Harf Birleşmesi / Yanlış Okuma:
   - 'rn' harflerinin 'm' olması (Örn: 'yarm' -> 'yarın', 'kamı' -> 'karnı', 'öğmeci' -> 'öğrenci', 'somaki' -> 'sonraki')
   - 'cl' harflerinin 'd' olması veya 'd' harflerinin 'cl' olması (Örn: 'claha' -> 'daha', 'cliye' -> 'diye')
   - 'li' / 'h', 'vv' / 'w', 'nn' / 'm' karışıklıkları
2. Yanlış Bölünmüş Heceler ve Kelimeler (PDF Boşluk Hataları):
   - Kelime içinde yanlış ayrılmış heceler (Örn: 'Kut sal' -> 'Kutsal', 'yapıl maktadır' -> 'yapılmaktadır', 'ge liyor' -> 'geliyor', 'başka ları' -> 'başkaları')
3. Türkçe Karakter Bozulmaları:
   - ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u harflerinin kaybolması veya yanlış çıkması (Örn: 'yapilmis' -> 'yapılmış', 'isik' -> 'ışık')
4. Kelime İçi Kesme / Tireleme Hataları:
   - Satır sonu tirelerinin kelimeyi bölmesi (Örn: 'anla- mıyorum' -> 'anlamıyorum')
5. Noktalama / Boşluk Hataları:
   - Kalıplaşmış birleşik kelimelerin ayrı yazılması (Örn: 'bir çok' -> 'birçok', 'her hangi' -> 'herhangi', 'bir kaç' -> 'birkaç', 'hiç bir' -> 'hiçbir')

KESİN KURALLAR:
1. ÇİFT TİRE VE ARA SÖZ KORUMASI: Cümle içindeki ara söz veya açıklama belirten çift tireleri (Örn: "... anladım - her doğum, ne olursa olsun, bir Kutsal Doğum'dur - Aile içi..." veya "— ... —") KESİNLİKLE KORU! İki tireyi asla tek çizgiye düşürme veya tirelerden birini silme.
2. DİYALOG TİRELERİ: Satır başındaki konuşma çizgilerini (— veya -) asla silme.
3. BAŞLIK VE PARAGRAF ETİKETİ DÜZENLEMESİ:
   - Eğer bir blok gerçek bir bölüm veya alt bölüm başlığı ise (Örn: 'BİRİNCİ BÖLÜM: Kontrol Edemediğiniz Şeyler', 'Stres Yönetimi', 'Benim Hikayem', 'Yetişkin Dostluklarında Ustalaşmak') ve <p> olarak verilmişse, onu <h2>Başlık</h2> olarak formatla.
   - Eğer bir blok normal bir anlatı/paragraf cümlesi olduğu halde yanlışlıkla <h2> veya <h1> olarak verilmişse (Örn: '<h2>Sonuçta tüm bu tercihler...</h2>' veya '<h2>Sorun değil, dedi</h2>'), onu <p>Cümle...</p> etiketine çevir.
4. Metnin anlamını, yazarın üslubunu veya cümle yapısını KESİNLİKLE değiştirme.
5. Özetleme yapma, yeni cümle ekleme veya çıkarma.
6. Varsa HTML etiketlerini (örn: <span>, <em>, <b>, <i>, <a>, <strong> vb.) AYNEN OLDUĞU GİBİ KORU, etiketlerin içindeki metni düzelt ama etiket yapısını asla bozma.
7. Çıktı olarak SADECE düzeltilmiş metni ver. Başına veya sonuna hiçbir açıklama, selamlama veya markdown kod bloğu (\`\`\`) EKLEME.
8. Metin arasına veya cümle sonlarına sızmış sayfa numaralarını (Örn: '...yaptık. 124 Ve ancak...' veya '...sıkıştırıyor... 2.') TESPİT ET VE SİL.`;

/**
 * Fetch available free models from OpenRouter dynamically.
 */
export async function fetchOpenRouterModels(apiKey?: string): Promise<OpenRouterModel[]> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers,
    });

    if (!response.ok) {
      return POPULAR_FREE_MODELS;
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      return POPULAR_FREE_MODELS;
    }

    const freeModels: OpenRouterModel[] = data.data
      .filter((m: { id: string; pricing?: { prompt?: string; completion?: string } }) => {
        const id = m.id || '';
        const isFreePrice =
          m.pricing?.prompt === '0' && m.pricing?.completion === '0';
        return id.includes(':free') || isFreePrice;
      })
      .map((m: { id: string; name?: string; description?: string; context_length?: number }) => ({
        id: m.id,
        name: m.name || m.id,
        description: m.description,
        context_length: m.context_length,
        isFree: true,
      }));

    return freeModels.length > 0 ? freeModels : POPULAR_FREE_MODELS;
  } catch {
    return POPULAR_FREE_MODELS;
  }
}

/**
 * Call OpenRouter with adaptive exponential backoff for 429 rate-limiting.
 */
export async function callOpenRouterCorrection({
  apiKey,
  model,
  content,
  temperature = 0.1,
  signal,
  customPrompt,
}: {
  apiKey: string;
  model: string;
  content: string;
  temperature?: number;
  signal?: AbortSignal;
  customPrompt?: string;
}): Promise<string> {
  const maxRetries = 6;
  let delay = 3000;

  const systemMessage = customPrompt || TURKISH_OCR_SYSTEM_PROMPT;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('İşlem kullanıcı tarafından durduruldu.', 'AbortError');
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://epub-ocr-fixer.vercel.app',
          'X-Title': 'Turkish EPUB OCR Fixer',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: content },
          ],
          temperature,
        }),
        signal,
      });

      if (response.status === 429) {
        // Rate limited
        if (attempt === maxRetries) {
          throw new Error('OpenRouter istek limiti (Rate Limit) aşıldı. Lütfen model ayarlarından Gemini 2.0 Flash seçmeyi deneyin veya biraz bekleyin.');
        }
        const retryAfterHeader = response.headers.get('Retry-After');
        const waitMs = retryAfterHeader ? Math.max(parseInt(retryAfterHeader, 10) * 1000, delay) : delay;
        console.warn(`[OpenRouter Rate Limit 429] ${Math.round(waitMs / 1000)} saniye bekleniyor... (Deneme ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        delay = Math.min(delay * 1.8, 25000);
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData?.error?.message ||
          `OpenRouter API hatası (Kod: ${response.status} ${response.statusText})`;
        throw new Error(message);
      }

      const data = await response.json();
      let result = data.choices?.[0]?.message?.content || '';

      // Clean markdown code blocks if the model wrapped output in ```html or ```
      result = result.trim();
      if (result.startsWith('```html')) {
        result = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      } else if (result.startsWith('```xml')) {
        result = result.replace(/^```xml\s*/i, '').replace(/```\s*$/i, '');
      } else if (result.startsWith('```')) {
        result = result.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      }

      return result.trim();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      if (attempt === maxRetries) {
        throw err;
      }
      console.warn(`[OpenRouter Retry] Hata: ${err}. ${Math.round(delay / 1000)} sn sonra tekrar deneniyor...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.8, 25000);
    }
  }

  throw new Error('Beklenmeyen bir hata oluştu.');
}
