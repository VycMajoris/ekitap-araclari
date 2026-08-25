<div align="center">

# 📚 eKitap Araçları (eBook Tools)

**Akıllı EPUB & PDF Düzenleyici, OCR Onarıcı ve Format Dönüştürücü**

%100 Tarayıcı Üzerinde Çalışan, Gizlilik Odaklı, Türkçe Dilbilgisi ve Yapay Zeka Destekli eKitap Araç Seti.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Tests: 23 Passed](https://img.shields.io/badge/Tests-23%2F23%20Passed-success)](scripts/verify-fixes.mjs)

[Özellikler](#-özellikler) • [Cihaza Gönder Rehberi](#-cihaza-gönder-rehberi-kindle--koreader) • [Çalışma Modları](#-işleme-ve-hız-modları) • [Kurulum](#-hızlı-başlangıç) • [Mimari](#-teknik-mimari) • [Lisans](#-lisans)

</div>

---

## 🌟 Neden eKitap Araçları?

PDF formatındaki kitapları EPUB'a çevirirken veya taranmış (OCR) e-kitapları okurken sıkça karşılaşılan:
- **Karakter Birleşmeleri**: `rn → m` (*yarm → yarın*, *kamı → karnı*, *öğmeci → öğrenci*), `cl → d`, `vv → w`
- **Satır Sonu Bölünmeleri**: `yapı- lamaz → yapılamaz`, `baş- ladı → başladı`, `geliş- tirme → geliştirme`
- **Parantez İçi ve Ara Söz Tireleri**: Ara sözlerdeki (`- ... -` veya `— ... —`) ve diyalog tirelerinin yanlışlıkla silinmesi
- **Bölük Pörçük Başlıklar**: Normal metinlerin başlık sanılması, gerçek bölüm başlıklarının kaybolması
- **Sunucu Yükleme Limitleri**: Vercel veya sunucu taraflı 4.5MB payload sınırları ve zaman aşımı sorunları

**eKitap Araçları**, tüm bu sorunları **%100 istemci tarafında (tarayıcıda)** çözen modern, açık kaynaklı bir web uygulamasıdır. Kitap dosyanız hiçbir sunucuya yüklenmez.

---

## 🚀 Özellikler

### 1. 📖 İstemci Taraflı PDF & MOBI ➔ EPUB / MOBI Dönüştürücü
- `pdfjs-dist` ve yerel PalmDOC/MOBI ikili motoruyla doğrudan tarayıcınızda çalışır.
- EPUB, PDF ve **MOBI** formatındaki kitapları açabilir, onarabilir ve hem **EPUB** hem de eski Kindle cihazları için **MOBI** olarak dışa aktarabilir.
- Fiziksel glif mesafesi (gap analysis) ile harf aralıklarını korur, gereksiz kelime içi boşlukları engeller.
- Sayfa üst/alt bilgi (header/footer) ve sayfa numaralarını otomatik temizler.
- İçindekiler tablosunu (*TOC*) tek parça halinde korur ve kitap bölümlerini akıllıca ayırır.

### 2. 🔍 Türkçe Morfoloji & Kural Tabanlı OCR Motoru
- Sabit kelime listelerine bağlı kalmadan Türkçe ek ve kök kurallarına dayalı morfolojik regex motoru içerir.
- Cümle içi ara söz tirelerini (`- ... -`) ve diyalog çizgilerini korur.
- İki yana yaslı (`text-align: justify`) temiz CSS ile e-okuyucu ve Kindle uyumlu EPUB üretir.

### 3. 🧠 Çoklu Yapay Zeka (LLM) Sağlayıcı Desteği
- **Google Hesabı (Antigravity OAuth)**: Gemini 3.7 Flash, Gemini 3.5 Flash, Gemini 3 Pro ve Claude modellerini yüksek hız ve kotayla kullanma imkanı.
- **Google AI Studio (Gemini Key)**: Doğrudan resmi Gemini API anahtarı (`AIzaSy...`) ile bağlantı.
- **OpenRouter Free Modeller**: Llama 3.3 70B, Qwen 2.5 72B, Gemini 2.0 Flash ve Mistral modelleriyle sıfır maliyetli kullanım.

### 4. ⚡ İşleme ve Hız Modları
Ana sayfadan tek tıkla seçilebilen 3 farklı çalışma modu:
- ⚡ **Akıllı Hibrit (Önerilen)**: Kural tabanlı ön temizlik yapılır; sadece şüpheli ve belirsiz kelimeler yapay zekaya gönderilir (~1-2 dk, sıfır rate limit).
- 🚀 **Yıldırım Hızı (Regex)**: Yalnızca kural motoru çalışır. API anahtarı gerekmez, 0 saniyede tamamlanır.
- 🧠 **Tam Derin Tarama**: Tüm paragraflar istisnasız seçili yapay zeka ile taranır.

### 5. 📱 Cihaza Gönder (Send-to-Kindle & KOReader Wi-Fi)
- **Send to Kindle**: `@kindle.com` adresinize Gmail/SMTP veya Resend ile doğrudan tek tıkla e-posta gönderimi.
- **KOReader Wi-Fi Aktarımı**: Yerel ağ üzerinden KOReader yüklü e-okuyucunuza (Kindle, Kobo, PocketBook, reMarkable) kablosuz dosya yükleme.
- **QR Kod & Yerel İndirme**: E-okuyucunun web tarayıcısından tek tıkla indirme imkanı.

### 6. 💾 Kalıcı IndexedDB Önbelleği
- İşlem durdurulduğunda veya sayfa yenilendiğinde tamamlanan paragraflar tarayıcı IndexedDB deposunda saklanır.
- Aynı kitap tekrar işlendiğinde daha önce taranan bloklar için tekrar token harcanmaz.

### 7. 🛠️ Geliştirici (Developer) Modu
- Ayarlardan tek tıkla açılıp kapatılabilen sade / gelişmiş görünüm.
- Canlı regex ve LLM değişiklik günlüğü (*Diff Console*), JSON dışa aktarma.
- Özel Sistem Talimatı (*System Prompt*) düzenleyici, eşzamanlılık (*concurrency*) ve paket boyutu ayarı.

### 8. 🌓 Karanlık ve Aydınlık Tema
- Göz yormayan modern karanlık mod ve aydınlık tema desteği (parlama önleyici script ile).

---

## 📱 Cihaza Gönder Rehberi (Kindle & KOReader)

### A. Send to Kindle (E-Posta ile Gönderim)
1. **Amazon Onaylı Liste Ayarı (Tek Seferlik):**
   - Amazon web sitesinde **İçerik ve Cihazlar (Manage Your Content and Devices) > Tercihler (Preferences) > Kişisel Belge Ayarları (Personal Document Settings)** sayfasına gidin.
   - **Onaylı Kişisel Belge E-posta Listesi (Approved Personal Document E-mail List)** alanına göndereceğiniz e-posta adresinizi (örnek: Gmail adresiniz) ekleyin.
2. **Uygulamadan Gönderme:**
   - Kitap onarımı tamamlandıktan sonra **Cihaza Gönder** butonuna tıklayın.
   - Kindle e-posta adresinizi (`adiniz@kindle.com`) ve Gmail Uygulama Şifrenizi (*App Password*) girin.
   - **Kindle'a Gönder** butonuna basın. Birkaç dakika içinde kitabınız kablosuz olarak Kindle'ınızda görünecektir.

### B. KOReader (Wi-Fi ile Doğrudan Aktarım)
1. E-Okuyucunuzda (Kindle, Kobo, reMarkable vb.) KOReader uygulamasını açın.
2. **Üst Menü > Ağ > Wi-Fi Dosya Aktarımı (Web Server)** seçeneğini başlatın.
3. Ekranda görüntülenen yerel IP adresini (örn: `http://192.168.1.50:8080`) uygulamadaki KOReader kutusuna girin.
4. **KOReader'a Aktar** butonuna tıklayın. Dosya doğrudan cihaz hafızasına yüklenecektir.

---

## 🛠️ Hızlı Başlangıç

### Gereksinimler
- **Node.js**: v18.18+ veya v20+
- **npm**, **pnpm**, **yarn** veya **bun**

### 1. Repoyu Klonlayın
```bash
git clone https://github.com/halilozdgn/ekitap-araclari.git
cd ekitap-araclari
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

### 4. Testleri Çalıştırın
```bash
npm test
```

### 5. Üretim Derlemesi (Build)
```bash
npm run build
npm start
```

---

## 🏗️ Teknik Mimari

```
src/
├── app/
│   ├── api/
│   │   ├── antigravity/      # Google OAuth proxy ve chat endpoints
│   │   ├── auth/google/      # Google OAuth PKCE token exchange
│   │   ├── kindle/send/      # Send to Kindle SMTP & Resend API
│   │   └── koreader/upload/  # KOReader Wi-Fi yükleme proxy
│   ├── globals.css           # Tailwind CSS v4 & theme variables
│   ├── layout.tsx            # Metadata, fonts & theme flash prevention
│   └── page.tsx              # Ana sayfa ve işleme paneli
├── components/
│   ├── ChapterList.tsx       # Kitap bölümleri ve durum göstergesi
│   ├── DebugConsole.tsx      # Geliştirici değişiklik günlüğü çekmecesi
│   ├── DiffViewer.tsx        # Yan yana ve satır içi canlı diff önizleme
│   ├── Header.tsx            # Logo, marka, tema değiştirici ve durum
│   ├── SendToDeviceModal.tsx # Kindle & KOReader cihaz aktarım modalı
│   ├── SettingsModal.tsx     # Sağlayıcı, API key, önbellek & dev ayarları
│   ├── StatsBar.tsx          # İlerleme çubuğu, sayaçlar ve indirme
│   └── UploadSection.tsx     # EPUB & PDF sürükle-bırak yükleme alanı
└── lib/
    ├── antigravity.ts        # Google OAuth PKCE ve model tanımları
    ├── cache.ts              # IndexedDB kalıcı blok önbellek motoru
    ├── epub-engine.ts        # EPUB ayrıştırma, DOM onarımı & JSZip paketleme
    ├── openrouter.ts         # OpenRouter API client ve kuyruk yönetimi
    ├── pdf-engine.ts         # Client-side PDF-to-EPUB ayrıştırma motoru
    ├── processor.ts          # Blok paketleme, dinamik başlık ve LLM yöneticisi
    ├── turkish-ocr-rules.ts  # Türkçe morfoloji regex ve tire koruma kuralları
    └── types.ts              # TypeScript arayüz ve tip tanımları
```

---

## 🧪 Test Kapsamı

Projede yer alan 23 adet Türkçe morfolojik birim testi:
- Ara söz tirelerinin korunması (`- ... -`)
- Cümle başı/sonu tireleme hatalarının onarılması
- Satır sonu hece bölmelerinin birleştirilmesi
- Çoklu nokta (`...`) ve OCR boşluk anomalilerinin düzeltilmesi
- Gerçek dünya kitap tarama örneklerinin doğrulanması

Testleri çalıştırmak için:
```bash
npm test
```

---

## 🤝 Katkıda Bulunma

Katkılarınızı memnuniyetle kabul ediyoruz!

1. Bu depoyu Fork edin (`fork`)
2. Yeni bir özellik dalı oluşturun (`git checkout -b feat/harika-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: harika ozellik eklendi'`)
4. Dalınıza push edin (`git push origin feat/harika-ozellik`)
5. Bir **Pull Request** açın

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır. Dilediğiniz gibi kullanabilir, değiştirebilir ve dağıtabilirsiniz.

---

<div align="center">
Geliştirici: <b>Halil Özdoğan</b> • <a href="https://github.com/halilozdgn">GitHub Profili</a>
</div>
