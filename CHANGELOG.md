# Değişiklik Günlüğü (Changelog)

Bu projedeki tüm önemli değişiklikler bu dosyada belgelenmektedir.
Format, [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardına dayanmaktadır ve bu proje [Semantic Versioning (SemVer)](https://semver.org/lang/tr/) kurallarına uyar.

---

## [0.2.1] - 2026-08-26

### 🛠️ Düzeltmeler (Fixed)
* **📖 Calibre & Eski EPUB `<div>` Paragraf Desteği:** `<p>` etiketi içermeyen ancak metin barındıran `<div>`, `<section>`, `<article>` etiketli EPUB'ların (örneğin Calibre ile dönüştürülmüş Küçük Prens vb. e-kitaplar) ayrıştırılamama ve çevrilememe sorunu giderildi; 800+ metin bloğu eksiksiz ayrıştırılıp yeniden oluşturulabilir hale getirildi.
* **🌐 Canlı Ortam (Serverless) Zaman Aşımı Optimizasyonu:** Cloudflare Pages ve Vercel fonksiyon zaman aşımı (timeout) sınırları için AI çeviri paket boyutu 4.500 karaktere optimize edildi; isteklerin 2-5 saniye içinde tamamlanması sağlandı.
* **📊 Canlı Çeviri İstatistikleri ve Kelime Sayacı:** Çeviri modunda her blok işlendiğinde çevrilen kelime sayısının (`totalFixedWords`) anlık olarak arayüzde ve bölüm kartlarında güncellenmesi sağlandı.
* **⚠️ Hata Görünürlüğü:** AI paket işleme hatalarının sessizce yutulması engellendi; hata durumunda arayüzde doğrudan kırmızı uyarı gösterilmesi sağlandı.

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
