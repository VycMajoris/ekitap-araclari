import React, { useState } from 'react';
import {
  Sparkles,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';

interface GoogleAiStudioNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGeminiSettings: () => void;
}

export const GoogleAiStudioNoticeModal: React.FC<GoogleAiStudioNoticeModalProps> = ({
  isOpen,
  onClose,
  onOpenGeminiSettings,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('ekitap_hide_notice_v0.5.0', 'true');
    }
    onClose();
  };

  const handleGoToSettings = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('ekitap_hide_notice_v0.5.0', 'true');
    }
    onOpenGeminiSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 border-b border-zinc-100 dark:border-zinc-800/80 p-6">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs border border-emerald-500/20 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full inline-block mb-1">
                v0.5.0 Sürüm Yenilikleri
              </span>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white leading-snug">
                eKitap Araçları v0.5.0 Yenilikleri
              </h3>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-h-[65vh] overflow-y-auto">
          <div className="bg-gradient-to-br from-emerald-50/90 to-blue-50/90 dark:from-emerald-950/40 dark:to-blue-950/40 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-white text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Neler Yeni? (v0.5.0)</span>
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Son Güncelleme
              </span>
            </div>
            <ul className="text-[11px] text-zinc-700 dark:text-zinc-200 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Sıfır Kaymalı EPUB Bölüm Onarımı:</strong> Heceleme tireleriyle bölünen paragraflar birleştirildiğinde bölüm genelindeki paragrafların kayması engellendi.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Cloudflare Pages Edge KV Sayaç Motoru:</strong> Sunucusuz doğrudan edge worker üzerinde çalışan gerçek zamanlı küresel sayaç mimarisi devreye alındı.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <span>
                  <strong>İnteraktif Açılır Pencere (Popup Footnote) &amp; EPUB 3 Dipnotları:</strong> PDF&apos;lerdeki dipnot numaralarını (¹, ², [1]) ve sayfa altı açıklamalarını otomatik algılayıp Apple Books, KOReader, Kindle ve Kobo için yerinde açılan interaktif popup kartlara dönüştürme eklendi.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Türkçe Şapkalı Harf &amp; OCR Hassasiyeti:</strong> Edebi eserlerdeki şapkalı ünlüler (*hâlâ, rüzgâr, kâğıt*) anomali filtresinden çıkarılarak Türkçe yerel harf dönüşümleri korundu.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Google AI Studio ile Ücretsiz Kullanım</span>
            </h4>
            <p className="text-[11px] text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
              Google, tüm kullanıcılara Google AI Studio üzerinden günde <strong>1.500 istek (15-20 tam kitap)</strong> tamamen ücretsiz sunar. Kredi kartı gerekmez, kota bittiğinde fatura çıkmaz ve süre dolunca otomatik yenilenir.
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 flex items-start gap-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <p>
              <strong>Google OAuth Girişi Hakkında Not:</strong> Google&apos;ın güvenlik politikası güncellemeleri nedeniyle dahili hesap girişi yerine doğrudan kişisel Google AI Studio ve Groq API anahtarları kullanılmaktadır.
            </p>
          </div>
        </div>

        {/* Footer & Actions */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/80 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 hover:bg-amber-200/70 border border-amber-300/50 dark:border-amber-800/50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>AI Studio&apos;dan Ücretsiz Anahtar Al</span>
            </a>

            <button
              type="button"
              onClick={handleGoToSettings}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Anahtarı Ayarlara Gir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-400">
            <label className="flex items-center gap-2 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Bu bilgilendirmeyi bir daha gösterme</span>
            </label>

            <button
              type="button"
              onClick={handleClose}
              className="hover:underline cursor-pointer"
            >
              Şimdilik Atla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
