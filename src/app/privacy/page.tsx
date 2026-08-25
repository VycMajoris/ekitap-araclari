import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | eKitap Araçları',
  description: 'eKitap Araçları web uygulaması Gizlilik Politikası ve Google Kullanıcı Verileri Bildirimi',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ana Sayfaya Dön</span>
          </Link>
          <span className="font-bold text-sm text-zinc-900 dark:text-white">eKitap Araçları</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-8">
        <div className="space-y-3 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Gizlilik ve Güvenlik Bildirimi</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Gizlilik Politikası (Privacy Policy)
          </h1>
          <p className="text-xs text-zinc-500">
            Son Güncelleme: 25 Ağustos 2026 • eKitap Araçları Açık Kaynak Projesi
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-500" />
            1. Genel Bakış ve Temel İlkemiz
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <strong>eKitap Araçları</strong>, kullanıcıların kitaplarını (EPUB, PDF, MOBI) dönüştürmesini ve OCR kaynaklı metin hatalarını onarmasını sağlayan istemci odaklı (client-side), açık kaynaklı bir web uygulamasıdır. Kullanıcılarımızın gizliliğine ve kişisel verilerinin korunmasına en üst düzeyde önem veriyoruz.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            2. Dosya ve Kitap İçeriklerinin İşlenmesi
          </h2>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Uygulamamıza yüklediğiniz EPUB, PDF veya MOBI kitap dosyaları <strong>%100 tarayıcınızda (istemci tarafında)</strong> işlenir.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <li>Kitap dosyalarınız hiçbir harici sunucuya veya üçüncü taraf depolama alanına yüklenmez.</li>
              <li>Dosyalarınız kaydedilmez, arşivlenmez veya analiz amacıyla toplanmaz.</li>
              <li>Tüm dönüştürme ve paketleme işlemleri cihazınızın kendi işlem gücü ile tarayıcı belleğinde tamamlanır.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" />
            3. Google Kullanıcı Verileri ve Google OAuth Bildirimi
          </h2>
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <p>
              Uygulamamız, Google Antigravity / Gemini modelleriyle entegrasyon sağlamak amacıyla Google OAuth 2.0 kimlik doğrulama mekanizmasını kullanabilir. Google API&apos;leri ile ilgili verilerin kullanımı aşağıdaki kurallara kesin olarak tabidir:
            </p>
            <div className="space-y-2">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                Erişilen Veriler ve Amaç:
              </h3>
              <p className="text-xs">
                Google ile giriş yaptığınızda yalnızca kullanıcının açık rızasıyla üretilen geçici erişim belirteci (access token) ve temel profil e-posta adresi alınır. Bu belirteç yalnızca kullanıcının seçtiği metin düzeltme isteklerini doğrudan Google Generative Language / Gemini API&apos;sine iletmek için kullanılır.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                Veri Depolama ve Paylaşım Politikası:
              </h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs">
                <li>Google hesap verileriniz veya erişim belirteçleriniz hiçbir zaman üçüncü şahıslara aktarılmaz, satılmaz veya ticari/reklam amaçlı kullanılmaz.</li>
                <li>Erişim belirteçleri yalnızca tarayıcınızın kendi yerel belleğinde (<code>localStorage</code>) saklanır.</li>
                <li>Kullanıcı istediği an uygulamadan &quot;Çıkış Yap&quot; butonuna basarak veya Google Hesabı Güvenlik panelinden erişim iznini tek tıkla iptal edebilir.</li>
              </ul>
            </div>

            <p className="text-xs text-zinc-500 italic">
              eKitap Araçları, Google API Hizmetleri Kullanıcı Verileri Politikası&apos;na (Google API Services User Data Policy) ve Sınırlı Kullanım Gereksinimleri&apos;ne (Limited Use requirements) tam uyum sağlar.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" />
            4. Yerel Depolama (LocalStorage ve IndexedDB)
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Uygulama, kullanıcı deneyimini iyileştirmek için yalnızca tarayıcınızın yerel depolama özelliklerini kullanır:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <li><strong>Tema ve Tercihler:</strong> Karanlık/Aydınlık mod seçimi ve hız modu tercihiniz.</li>
            <li><strong>API Anahtarları:</strong> Girdiğiniz OpenRouter veya Google AI Studio anahtarları yalnızca sizin tarayıcınızda kalır.</li>
            <li><strong>Kalıcı Önbellek (IndexedDB):</strong> İşlemi durdurup devam ettirdiğinizde tekrar token harcamamak için tamamlanan paragraflar yerel olarak önbelleğe alınır. İstediğiniz an Ayarlar panelinden &quot;Önbelleği Temizle&quot; butonuyla silebilirsiniz.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            5. İletişim ve Destek
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Gizlilik politikamızla ilgili herhangi bir sorunuz, geri bildiriminiz veya talebiniz olması durumunda{' '}
            <a
              href="https://github.com/halilozdgn/ekitap-araclari/issues"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              GitHub Issues
            </a>{' '}
            üzerinden bizimle iletişime geçebilirsiniz.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; 2026 eKitap Araçları • Açık Kaynaklı Proje</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              Gizlilik Politikası
            </Link>
            <Link href="/terms" className="hover:underline">
              Kullanım Koşulları
            </Link>
            <Link href="/" className="hover:underline">
              Ana Sayfa
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
