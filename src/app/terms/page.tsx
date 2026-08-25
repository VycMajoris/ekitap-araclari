import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | eKitap Araçları',
  description: 'eKitap Araçları web uygulaması Kullanım Koşulları ve Hizmet Şartları',
};

export default function TermsOfServicePage() {
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
          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            <FileText className="w-4 h-4" />
            <span>Hizmet ve Kullanım Şartları</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Kullanım Koşulları (Terms of Service)
          </h1>
          <p className="text-xs text-zinc-500">
            Son Güncelleme: 25 Ağustos 2026 • eKitap Araçları Açık Kaynak Projesi
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            1. Koşulların Kabulü
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <strong>eKitap Araçları</strong> web uygulamasını kullanarak bu sayfada belirtilen tüm koşulları, yürürlükteki yasaları ve üçüncü taraf API politikalarını kabul etmiş sayılırsınız. Bu koşulları kabul etmiyorsanız lütfen uygulamayı kullanmayınız.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-500" />
            2. Açık Kaynak Lisansı (MIT License)
          </h2>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            <p>
              Bu yazılım <strong>MIT Lisansı</strong> altında sunulmaktadır. Yazılımı ticari veya kişisel amaçlarla ücretsiz olarak kullanabilir, kopyalayabilir, değiştirebilir, birleştirebilir ve dağıtabilirsiniz.
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            3. Kullanıcı Yükümlülükleri ve Telif Hakları
          </h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <li>Kullanıcılar, uygulamaya yükledikleri veya dönüştürdükleri e-kitap ve belgelerin telif hakkı sahibi olduklarını veya yasal olarak işleme hakkına sahip olduklarını kabul ederler.</li>
            <li>Uygulama tamamen istemci taraflı (tarayıcıda) çalışmakta olup, kullanıcıların yüklediği içeriklerden veya fikri mülkiyet ihlallerinden eKitap Araçları geliştiricileri sorumlu tutulamaz.</li>
            <li>Uygulama kötüye kullanım, zararlı yazılım dağıtımı veya yasadışı amaçlar için kullanılamaz.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            4. Üçüncü Taraf Entegrasyonları ve API Kullanımı
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Kullanıcıların kendi sağladıkları Google AI Studio, Google OAuth, OpenRouter veya SMTP/Resend anahtarlarıyla yapılan işlemler ilgili sağlayıcıların hizmet koşullarına tabidir. Kullanıcılar kendi API kotalarından ve harcamalarından kendileri sorumludur.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            5. Değişiklikler ve Güncellemeler
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Bu kullanım koşulları zaman zaman güncellenebilir. Değişiklikler bu sayfada yayınlandığı andan itibaren geçerli sayılır.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; 2026 eKitap Araçları • Açık Kaynaklı Proje</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:underline">
              Gizlilik Politikası
            </Link>
            <Link href="/terms" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
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
