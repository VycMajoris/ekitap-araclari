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
      localStorage.setItem('ekitap_hide_aistudio_notice', 'true');
    }
    onClose();
  };

  const handleGoToSettings = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('ekitap_hide_aistudio_notice', 'true');
    }
    onOpenGeminiSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with decorative gradient */}
        <div className="relative bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-emerald-500/10 border-b border-zinc-100 dark:border-zinc-800/80 p-6">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs border border-amber-500/20 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Önemli Bilgilendirme
              </span>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white leading-snug">
                Yapay Zekâ (AI) ve Çeviri Kullanımı
              </h3>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Google Hesap Girişi (OAuth) Kısıtlaması Hakkında</span>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Google&apos;ın son güvenlik ve API politika güncellemeleri nedeniyle doğrudan Google OAuth ile giriş yapılarak kullanılan dahili sandbox uç noktaları genel erişime kısıtlanmıştır.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Resmi ve Kesintisiz Çözüm: Google AI Studio</span>
            </h4>
            <p>
              Google, tüm kullanıcılara <strong>Google AI Studio</strong> üzerinden en güncel Gemini modellerini (Gemini 3.6 Flash, 3.7 Flash vb.) tamamen <strong>ücretsiz</strong> olarak sunmaktadır:
            </p>

            <ul className="space-y-2 text-[11px] bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Günde 1.500 İstek Ücretsiz:</strong> Günde ortalama <strong>15 - 20 tam kitap</strong> çevirebilir ve sınırsız OCR onarımı yapabilirsiniz.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Kredi Kartı Gerekmez:</strong> 10 saniyede Google hesabınızla ücretsiz API anahtarı oluşturabilirsiniz.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>%100 Kişisel Kota:</strong> Başkalarının yoğunluğundan etkilenmez, doğrudan en yüksek hızda çalışır.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between font-bold text-blue-950 dark:text-blue-200 text-xs">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>v0.3.2 Sürüm Yenilikleri</span>
              </span>
              <span className="text-[10px] bg-blue-200/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                Yenilikler
              </span>
            </div>
            <ul className="text-[11px] text-blue-900/90 dark:text-blue-300/90 space-y-1.5 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold mt-0.5">&bull;</span>
                <span><strong>Birleşik API Paneli:</strong> Google AI Studio, Groq, OpenRouter, OpenAI, DeepSeek, Together ve Ollama tek listede birleştirildi.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold mt-0.5">&bull;</span>
                <span><strong>Groq (Llama 3.3 70B):</strong> Ultra yüksek hız ve 30 RPM ücretsiz kota korumasıyla eklendi.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold mt-0.5">&bull;</span>
                <span><strong>OpenAI Frontier Serisi:</strong> GPT-5.6 Sol, Terra, Luna ve GPT-5.4 Mini modelleri hazır seçeneklere dahil edildi.</span>
              </li>
            </ul>
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
