import { OpenRouterModel } from './types';

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
