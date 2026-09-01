# Değişiklik Günlüğü (Changelog)

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format, [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardına dayanmaktadır ve bu proje [Semantic Versioning (SemVer)](https://semver.org/lang/tr/) kurallarına uyar.

---

## [0.5.1] - 2026-09-01

### 🚀 Yeni Özellikler ve Performans Optimizasyonları (Added & Optimized)
* **⚡ Yüksek Token Verimi & Genişletilmiş Paket Boyutu (Batch Size 15.000 chr):**
  - Yapay zekâ çeviri ve OCR onarım motorunda varsayılan paket boyutu `3.000` karakterden **`15.000` karaktere (~2.500 kelime / ~3.500 token)** yükseltildi.
  - Tek istekte gönderilen metin hacmi 5 katına çıkarılarak günlük istek sınırı (RPD) gereksiz tüketilmeden günde çevrilebilecek kitap/yazı kapasitesi 5–8 kat artırıldı.
* **🎛️ Ayarlar Panelinde Hızlı Paket Hazır Ayarları & Dinamik Slider (`src/components/SettingsModal.tsx`):**
  - Kullanıcıların tek tıkla geçiş yapabileceği `5.000 chr` (Düşük Donanım / Lokal Ollama), `15.000 chr` (Önerilen & Yüksek Verim) ve `25.000 chr` (Turbo Hız) hazır butonları eklendi.
  - `2.000 - 35.000` karakter aralığında çalışan akıcı paket boyutu slider'ı ve anlık kelime hesabı gösterimi eklendi. Tercihler `localStorage` üzerinde kalıcı hale getirildi.
* **🛡️ Büyük Paket Ayrıştırma Dayanıklılığı (`src/lib/processor.ts`):**
  - 25+ paragraftan oluşan büyük paket yanıtlarında Markdown etiketlemeleri ve indeks kaymalarını tolere eden güçlendirilmiş ayrıştırıcı mimarisine geçildi.

---

## [0.5.0] - 2026-08-30

### 🚀 Yeni Özellikler ve Mimari İyileştirmeler (Added & Fixed)
* **⚡ Sıfır Kaymalı EPUB Bölüm Onarım Motoru (`src/lib/epub-engine.ts`):**
  - Satır sonu heceleme tireleri (`-`) birleştirildiğinde oluşan DOM indeks kayması giderildi.
  - Birleştirilen ikinci paragraflar `isMergedIntoPrevious` bayrağı ile işaretlenip DOM ağacından temizlenerek bölümdeki tüm paragrafların 1:1 sırası ve hizalaması korundu.
* **🌐 Cloudflare Pages Native Edge Functions Sayaç Motoru (`functions/api/stats.ts`):**
  - Sunucu dosya sistemine yazan geçici yapılar tamamen kaldırılarak Cloudflare Edge üzerinde çalışan yerel `functions/api/stats.ts` mimarisine geçildi.
  - İstemciden manipüle edilebilir sahte senkronizasyon kodları temizlendi; sadece gerçek kitap dönüştürme ve çeviri işlemleri KV sayacını günceller.
  - CORS preflight (`onRequestOptions`) desteği eklendi.
* **🇹🇷 Türkçe Şapkalı Harf ve Yerel Casing Hassasiyeti (`src/lib/turkish-ocr-rules.ts`):**
  - Edebi Türkçe eserlerdeki şapkalı ünlüler (*hâlâ, kâğıt, rüzgâr, hikâye, resmî, millî, mekân*) OCR anomali filtresinden çıkarılarak gereksiz yapay zekâ çağrıları engellendi.
  - Türkçe büyük/küçük harf dönüşümleri `.toLocaleUpperCase('tr-TR')` standardına bağlanarak `DİĞER` kelimesinin `DIGER` şeklinde bozulması çözüldü.
* **📑 PDF Dipnot Yanlış Pozitif Filtresi (`src/lib/pdf-engine.ts`):**
  - Ana metin içindeki `"Cilt 1 sayfa 20"` gibi sıradan rakamların dipnot sanılması engellendi; yalnızca üstsimge ve köşeli parantezli dipnotlar ayrıştırıldı.

---

## [0.4.2] - 2026-08-28

### 🚀 Yeni Özellikler (Added)
* **📌 İnteraktif Açılır Pencere (Popup Footnote) ve EPUB 3 Dipnot Motoru:**
  - PDF'lerdeki dipnot referanslarını ve sayfa altı dipnot tanımlarını otomatik tespit eden, ayrıştıran ve standart EPUB 3 popup formatına dönüştüren motor geliştirildi.
  - **Dikey Üstsimge Gruplama (Superscript Clustered Grouping):** Satır taban çizgisinden yukarı kaydırılmış küçük fontlu referans numaraları (`¹`, `²`, `[1]`, `1`) tespit edilerek ana metindeki ilgili kelimeye bağlandı.
  - **Alt Bölge Dipnot Tanım Ayrıştırması (`extractFootnotesAndBodyFromPage`):** Sayfa altındaki küçük puntoyla yazılmış dipnot metinleri (`1.`, `1)`, `[1]`, `*`, `Dipnot:`) ana metinden ayrılarak dipnot tanım bloklarına dönüştürüldü.
  - **Çakışmasız Sayfa Kapsamı (`[^p{page}_{num}]`):** Farklı sayfalardaki aynı numaralı dipnotların paralel/asenkron işleme sırasında karışması `p{page}_{num}` etiketleriyle önlendi.
  - **Deterministik Sıralı Yeniden Numaralandırma (`renumberAndSynthesizeFootnotes`):** Bölüm genelindeki tüm dipnotlar `1..N` şeklinde sıralı ve deterministik olarak yeniden numaralandırıldı.
  - **EPUB 3 `epub:type="noteref"` & `<aside epub:type="footnote">` Popup Sentezi:** Apple Books, KOReader, Kindle ve Kobo e-okuyucularında tıklandığında sayfa değiştirmeden yerinde açılan interaktif popup kart standardı uygulandı; popup desteklemeyen okuyucular için geri dönüş bağlantıları (`backlink`) korundu.
  - **Regex & OCR Anomali Kalkanı:** Dipnot etiketlerinin (`[^pX_Y]`) regex temizliği ve TDK tamiri sırasında bozulmasını önleyen token maskeleme koruması eklendi.
  - **Önizleme & Karşılaştırma Görünümü (`DiffViewer`):** Bölüm önizleme listesinde dipnot blokları mor renkli `📌 Dipnot Açıklaması` rozeti ile görsel olarak ayrıştırıldı.
* **🌐 Cloudflare KV Global Sayaç ve Otomatik Taban Senkronizasyonu (`/api/stats` & `STATS_KV`):**
  - Cihazdan bağımsız çalışan merkezi Cloudflare KV veritabanı entegrasyonu tamamlandı.
  - **Taban Başlangıç Değerleri (Baseline Seeding):** İlk kurulumda veya yerel depolama temizlendiğinde sayaçların sıfırlanmaması için taban değerler (142 Dönüştürülen, 68 Çevrilen, 24.500 Kelime) doğrudan KV'ye tohum olarak kaydedildi.
  - **Evrensel Geri Çekilme (REST & In-Memory):** KV binding'i bulunmayan ortamlarda Cloudflare REST API ve yerel depolama yedeklemesi sağlandı.

---

## [0.4.1] - 2026-08-28

### 🚀 Yeni Özellikler (Added)
* **📊 Canlı Global İstatistik Sayacı (`/api/stats` & `GlobalStatsCards`):**
  - Toplam dönüştürülen kitap, toplam çevrilen kitap ve onarılan kelime adetlerini takip eden kalıcı arka plan API'si ve sayfa altı istatistik paneli eklendi.
  - Sayaçlar her kitap dönüştürme ve çeviri işleminde gerçek zamanlı olarak güncellenir.
* **🖼️ Dokümantasyon & Ekran Görüntüsü İyileştirmeleri:**
  - `README.md` içerisindeki arayüz ekran görüntüleri 2x2 kompakt tablo düzenine getirilerek sayfanın altındaki ilgili bölüme taşındı.
  - Metinlerdeki yapay zekâ pazarlama kalıpları (AI slop) temizlendi, yalın ve teknik bir anlatım sağlandı.

---

## [0.4.0] - 2026-08-28

### 🚀 Yeni Özellikler (Added)
* **📐 İnteraktif Görsel PDF Alanı ve Marj Seçim Modalı (`PdfCropModal`):**
  - PDF kitaplarda üstbilgi, altbilgi ve sayfa numaralarının elenmesi için canlı tuval üzerinde yeşil sınır kutusu ve hassas marj kaydırıcıları ile dikkate alınacak metin alanını manuel ayarlama imkânı eklendi.
  - **Temsili Sayfa Otomatik Tespiti (`findRepresentativePdfPage`):** Kitabın başındaki boş/içindekiler sayfaları yerine ortalardan en zengin metne sahip sayfa otomatik bulunarak tuvalde önizlenir.
  - **Hızlı Şablonlar:** *Otomatik Öneri*, *Sıfır Kırpma (Tam Sayfa)*, *Standart Roman (%4-%4)* ve *Geniş Marj (%8-%8)* şablonları eklendi.
  - **Doğal Yönlü Marj Kaydırıcıları:** Sağ marj kaydırıcısı sayfa geometrisine göre sezgisel (ters orantılı) hareket edecek şekilde optimize edildi.
* **🛡️ Korumalı Mod (Filtreleri Devre Dışı Bırak / Sıfır Kayıp):**
  - Sayfa başı/sonu kısa diyalog ve cümlelerin (*"dedi ve gitti."*, *"— Kim var?"*) yanlışlıkla üstbilgi/altbilgi sanılarak silinmesini tamamen önleyen, yeşil alan içindeki her satırı %100 olduğu gibi alan korumalı mod eklendi.
* **🖼️ PDF Kitap Görselleri ve İllüstrasyonları Ayıklama Motoru:**
  - PDF içindeki fotoğrafları, çizimleri, haritaları ve şemaları otomatik ayıklayıp EPUB arşivi içinde `OEBPS/images/` altına yerleştiren ve `content.opf` manifestine kaydeden motor geliştirildi.
  - **Doğru Renk Uzayı & Şeffaflık Harmanlama (Alpha Blending):** Şeffaf PNG ve illüstrasyonların JPEG'e çevrilirken siyah arka planla çıkması engellendi; tuval `#ffffff` ile doldurularak saydam alanlar doğal beyaz zeminle harmanlandı.
  - **RGBX & Sahte Sıfır Alfa Düzeltmesi:** Bazı PDF dönüştürücülerinde 4. kanalın uninitialized 0 gelmesi nedeniyle tüm görselin beyaza dönmesi sorunu çözüldü; gerçek alfa kanalı ile RGBX dummy kanalı otomatik ayırt edilerek gerçek renkler korundu.
  - **CMYK & 1-Bit Maskeler:** DeviceCMYK renk dönüşümü ve 1-bit siyah/beyaz tarama stensil maskeleri için satır hizalı (byte-aligned) ayrıştırma desteği eklendi.
  - **`<figure>` HTML Entegrasyonu:** Görseller e-kitap içerisinde ait olduğu sayfa ve paragraf sırasına `<figure class="epub-figure"><img ... /></figure>` olarak yerleştirildi.
  - **İşlem Koruması:** Görsel blokları `completed` olarak kilitlenerek OCR regexlerinin ve AI çevirinin resim etiketlerini bozması engellendi; `reconstructChapterHtml` motorunda paragraf kaymaları giderildi.
* **📖 Görsel Kullanıcı Rehberi ("Nasıl Kullanılır?"):**
  - Korumalı mod, sayfa numaraları, satır sonu heceleme tireleri, bölüm başlıkları ve görsel ayıklama hakkında ipuçları sunan buton ve rehber paneli eklendi.

---

## [0.3.3] - 2026-08-27

### 🚀 Yeni Özellikler (Added)
* **💎 Tüm Gemini 3.x Flash, Flash-Lite ve Pro Modelleri:** Google AI Studio model listesine `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview` ve `gemini-3-flash-preview` modelleri eklendi.
* **🔄 Çok Kademeli Yüksek Yoğunluk Geri Çekilmesi (Failover):** Google sunucuları geçici yoğunluk (503 / High Demand) verdiğinde otomatik olarak 3.7 ➔ 3.6 ➔ 3.5 ➔ 3.5-Lite ➔ 2.0 kademeli devretme zinciri devreye alınarak çeviri kesintisiz sürdürülür.

---

## [0.3.2] - 2026-08-27

### 🚀 Yeni Özellikler (Added)
* **🌐 Birleşik Yapay Zekâ Sağlayıcı (API) Mimarisi:** Karmaşık ve iç içe geçmiş sekmeler kaldırılarak 8 büyük sağlayıcı tek çatı altında toplandı:
  - 🟡 **Google AI Studio** (Gemini 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite, 3.1 Pro Preview, 3 Flash Preview)
  - ⚡ **Groq** (Llama 3.3 70B, Qwen 3.8/3.6, DeepSeek R1, GPT-OSS)
  - 🟢 **OpenRouter** (Ücretsiz `:free` model havuzu)
  - 🟣 **OpenAI** (GPT-5.6 Sol/Terra/Luna, GPT-5.4 Mini, GPT-4o, o3-mini)
  - 🔵 **DeepSeek** (V3 Chat, R1 Reasoner)
  - 🟠 **Together AI** (Llama 3.3 Turbo, Qwen 2.5 Turbo)
  - 🦙 **Ollama (Lokal)** (Yerel ve internetsiz çalışma)
  - ⚙️ **Özel / Diğer** (Özel proxy / OpenAI uyumlu uç noktalar)
* **⚡ Groq & Gemini Free Tier Hız Koruması (RPM Throttling):**
  - **Google AI Studio:** 15 RPM ücretsiz limit koruması (3.8s gecikme).
  - **Groq:** 30 RPM ücretsiz limit koruması (2.1s gecikme).
  - **Paid / Turbo Katman Desteği:** Ücretli veya kredi kartı tanımlı hesaplar için beklemesiz turbo işlem hızı.
* **🛡️ 429 Kota Durumunda Otomatik Geri Çekilme (Backoff):** Anlık hız sınırı aşıldığında işlem durdurulmadan otomatik olarak birkaç saniyelik bekleme periyodu ile kendini onararak çeviriye devam etmesi sağlandı.
* **🌟 OpenAI Frontier & Groq Güncel Modelleri:** OpenAI'ın en yeni `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.4-mini` modelleri ile Groq'un metin modelleri doğrudan açılır listeye eklendi; ses ve moderasyon modelleri ayıklandı.

### 🛠️ Düzeltmeler (Fixed)
* **Özel OpenAI Ayarları ve Uç Nokta Senkronizasyonu:** `custom_openai` sekmesinde `customOpenAiBaseUrl` ve model adının hatalı bağlanması giderildi, sağlayıcı bazlı şablonlar ile tek tıkla otomatik doldurma sağlandı.
* **Header Sağlayıcı Göstergesi:** Üst çubukta aktif sağlayıcı ve model adı (örneğin `Groq (llama-3.3-70b-versatile)`) dinamik ve doğru şekilde gösterilir hale getirildi.

---

## [0.3.1] - 2026-08-27

### 🛠️ Düzeltmeler (Hotfixes)
* **🔄 Google AI Studio Otomatik Model Devretme (Auto-Failover):** Google sunucuları `gemini-3.7-flash` modelinde geçici yoğunluk (`503 / High Demand`) verdiğinde işlem durdurulmadan otomatik olarak `gemini-3.6-flash` veya `gemini-2.0-flash` modeline geçilerek çevirinin kesintisiz tamamlanması sağlandı.
* **🛡️ Otomatik Sağlayıcı Kurtarma (Auto Provider Recovery):** Tarayıcıda eski `antigravity` ayarı kayıtlı olsa bile API anahtarı girildiğinde doğrudan `gemini_api` (AI Studio) moduna geçilmesi sağlandı.
* **⚡ Başlık Çevirisi Kilitlenmesini Engelleme:** `refineChapterTitlesWithAi` fonksiyonuna 10 saniyelik zaman aşımı koruması eklendi; başlık çevirisinde oluşabilecek bir gecikmenin kitap paragraflarının çevirisini kilitlemesi engellendi.
* **📊 Canlı İlerleme ve Debug Hata Görünürlüğü:** Tüm API ve LLM hata yanıtları anında hem arayüz bildirimine hem de `DebugConsole` çekmecesine işlendi.

---

## [0.3.0] - 2026-08-27

### 🚀 Yeni Özellikler (Added)
* **💎 Google Gemini 3.7 Flash & 3.6 Flash Motoru:** Google AI Studio entegrasyonu `gemini-3.7-flash` modeline güncellendi.
* **💡 İlk Giriş Bilgilendirme Modalı:** Google AI Studio üzerinden ücretsiz API anahtarı edinme rehberini içeren bilgilendirme penceresi eklendi.
* **📖 Adım Adım Ücretsiz API Anahtarı Rehberi:** `README.md` içerisine Google AI Studio ve OpenRouter üzerinden sıfır maliyetle API anahtarı alma rehberi eklendi.
* **🛑 Kullanıcı Dostu 429 Kota Uyarısı:** AI Studio istek limiti aşıldığında panik yaratmayan, fatura çıkmayacağını ve kotanın süre dolunca otomatik yenileneceğini belirten net Türkçe bildirim eklendi.
* **🐞 Hata ve İstek Takip Günlüğü:** API hataları, durum kodları ve ağ detayları anlık olarak `DebugConsole` (Değişiklik & Hata Günlüğü) çekmecesine işlenir hale getirildi.

### 🛠️ Düzeltmeler (Fixed)
* **Google OAuth Sekmesi Temizliği:** Google'ın API sandbox kısıtlamaları nedeniyle sorun çıkaran Antigravity OAuth sağlayıcı sekmesi kaldırılarak doğrudan resmi Google AI Studio API motoru birincil yapıldı.
* **Süre Sayacı ve Buton Kayması:** Süre uzadıkça butonların sağa/sola zıplaması engellendi; `Kalan` ve `Geçen` süre `X dk Y sn` formatında ayrık bloklara alındı ve `tabular-nums` ile butonlar sabitlendi.
* **Calibre / Eski EPUB `<div>` Ayrıştırma:** `<p>` etiketi içermeyen metin içeren `<div>`, `<section>`, `<article>` bloklarının algılanıp eksiksiz Türkçeleştirilmesi sağlandı.

---

## [0.2.0] - 2026-08-26

### 🚀 Yeni Özellikler (Added)
* **🐳 Docker & Docker Compose Desteği:** Node.js ortamı gerektirmeden tek komutla (`docker compose up -d`) self-host ve homelab (Raspberry Pi, Unraid, TrueNAS, CasaOS) üzerinde çalıştırma imkanı eklendi.
* **📚 74.000+ Kelimelik TDK Sözlük Motoru:** `sozluk.gov.tr` veri seti üzerinden ~180 KB'lık istemci taraflı çevrimdışı Türkçe sözlük ve morfolojik çekim çözücü (*Suffix Peeler*) entegre edildi.
* **⚡ 2 Aşamalı Genel İşlem Mimarisi (2-Phase Pipeline):** Kitabın tamamı önce 1-2 saniyede Regex & TDK motoruyla taranarak %85 oranında temizlenir; kalan gerçek anomaliler tek bir genel havuzda toplanarak büyük paketlerle paralel AI'a gönderilir.
* **📄 Sayfalar Arası Cümle Birleştirici (Cross-Page Stitcher):** PDF ayrıştırmada sayfa geçişlerindeki bölünmüş cümleler (`söz` + `veriyorum."` ➔ `söz veriyorum."`) ve tarama çöp lekeleri (`.`, `k "`) otomatik temizlenip birleştirildi.
* **🔀 Çift Yönlü Harf ve Ek Bağlama:** `dedi k aynı` ➔ `dedik aynı`, `taklala r atıyordu` ➔ `taklalar atıyordu`, `İyi ş anslar` ➔ `İyi şanslar`, `sarmala nmış` ➔ `sarmalanmış`, `kolla rıma` ➔ `kollarıma` kalıpları dinamik olarak onarıldı.
* **🟢 Canlı Aşama Durum Rozeti & Saniyelik Zamanlayıcı:** İlerleme çubuğu üzerine anlık aşama durumunu (`⚡ Aşama 1/2: Regex & TDK Taraması`, `🧠 Aşama 2/2: AI Paketi X/Y`) gösteren canlı animasyonlu bildirim ve kesintisiz sayaç eklendi.

### 🛠️ Düzeltmeler (Fixed)
* **Yanlış Birleştirmeler (False Positive):** `en iyi`, `hep iyi`, `tek işi`, `diğer tüm`, `o gün`, `Andy'ye ayı`, `Luciditee'nin E serisi` gibi bağımsız geçerli kelimelerin yanlışlıkla birleştirilmesi engellendi.
* **Soru Eki Koruması:** `Onu mu`, `değil mi`, `öyle mi` gibi soru eklerinin (`mi/mı/mu/mü`) sola yapışması önlendi.
* **MOBI Mikro-Bölüm Şişmesi:** MOBI ayrıştırırken her `<h2>` başlığını ayrı bölüm sanıp yüzlerce 1 paragraflık bölüm oluşturma sorunu giderildi.
* **Etiket Sızıntısı:** AI yanıtlarından sızan `[/BLOCK_13]` gibi etiketlerin DOM'a yazılması %100 filtrelendi.
* **EPUB İndirme Kararlılığı:** Katı XHTML sözdizimi ve tırnak işaretlerinden kaynaklanan paketleme çökmeleri giderildi.

### ⚡ Performans (Performance)
* Batch paket boyutu 3.000 karakterden **10.000 - 12.000 karaktere** çıkarıldı.
* Concurrency 2'den **3-4 iş parçacığına** yükseltildi; bekleme süreleri 1.5s'den **200-400ms**'ye indirilerek işlem süresi **5x-10x hızlandırıldı**.

---

## [0.1.0] - 2026-08-25

### 🚀 İlk Sürüm (Initial Release)
* %100 İstemci taraflı PDF & MOBI ➔ EPUB / MOBI dönüştürücü.
* Kural tabanlı Türkçe OCR onarım motoru (`rn ➔ m`, `cl ➔ d`, satır sonu tire birleştirme).
* Çoklu yapay zeka desteği: Google Antigravity OAuth, Google AI Studio Gemini API, Özel OpenAI uç noktaları, OpenRouter.
* Send-to-Kindle (SMTP / Gmail) & KOReader Wi-Fi yerel ağ aktarımı.
* IndexedDB kalıcı blok önbellek motoru.
* Karanlık ve aydınlık tema desteği.
* Edebi, akademik ve günlük dil tonlarında bağlam korumalı AI kitap çeviri motoru.
