import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  Wifi,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  Server,
  HelpCircle,
  QrCode,
  ExternalLink,
} from 'lucide-react';

interface SendToDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  getEpubBlob: () => Promise<Blob | null>;
  fileName: string;
}

type DeviceTab = 'kindle' | 'koreader' | 'browser';
type EmailProvider = 'smtp' | 'resend';

export const SendToDeviceModal: React.FC<SendToDeviceModalProps> = ({
  isOpen,
  onClose,
  getEpubBlob,
  fileName,
}) => {
  const [activeTab, setActiveTab] = useState<DeviceTab>('kindle');

  const [kindleEmail, setKindleEmail] = useState('');
  const [emailProvider, setEmailProvider] = useState<EmailProvider>('smtp');

  const [smtpPreset, setSmtpPreset] = useState<'gmail' | 'outlook' | 'yandex' | 'custom'>('gmail');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);

  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFrom, setResendFrom] = useState('onboarding@resend.dev');

  const [koreaderUrl, setKoreaderUrl] = useState('http://192.168.1.50:8080');

  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKindle = localStorage.getItem('ekitap_kindle_email') || '';
      const savedProvider = (localStorage.getItem('ekitap_email_provider') as EmailProvider) || 'smtp';
      const savedHost = localStorage.getItem('ekitap_smtp_host') || 'smtp.gmail.com';
      const savedPort = localStorage.getItem('ekitap_smtp_port') || '465';
      const savedUser = localStorage.getItem('ekitap_smtp_user') || '';
      const savedPass = localStorage.getItem('ekitap_smtp_pass') || '';
      const savedResendKey = localStorage.getItem('ekitap_resend_key') || '';
      const savedResendFrom = localStorage.getItem('ekitap_resend_from') || 'onboarding@resend.dev';
      const savedKoreader = localStorage.getItem('ekitap_koreader_url') || 'http://192.168.1.50:8080';

      setKindleEmail(savedKindle);
      setEmailProvider(savedProvider);
      setSmtpHost(savedHost);
      setSmtpPort(savedPort);
      setSmtpUser(savedUser);
      setSmtpPass(savedPass);
      setResendApiKey(savedResendKey);
      setResendFrom(savedResendFrom);
      setKoreaderUrl(savedKoreader);
    }
  }, []);

  const handleSmtpPresetChange = (preset: 'gmail' | 'outlook' | 'yandex' | 'custom') => {
    setSmtpPreset(preset);
    if (preset === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort('465');
      setSmtpSecure(true);
    } else if (preset === 'outlook') {
      setSmtpHost('smtp-mail.outlook.com');
      setSmtpPort('587');
      setSmtpSecure(false);
    } else if (preset === 'yandex') {
      setSmtpHost('smtp.yandex.com');
      setSmtpPort('465');
      setSmtpSecure(true);
    }
  };

  const saveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ekitap_kindle_email', kindleEmail);
      localStorage.setItem('ekitap_email_provider', emailProvider);
      localStorage.setItem('ekitap_smtp_host', smtpHost);
      localStorage.setItem('ekitap_smtp_port', smtpPort);
      localStorage.setItem('ekitap_smtp_user', smtpUser);
      localStorage.setItem('ekitap_smtp_pass', smtpPass);
      localStorage.setItem('ekitap_resend_key', resendApiKey);
      localStorage.setItem('ekitap_resend_from', resendFrom);
      localStorage.setItem('ekitap_koreader_url', koreaderUrl);
    }
  };

  const handleSendToKindle = async () => {
    if (!kindleEmail.trim() || !kindleEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Lütfen geçerli bir Kindle e-posta adresi girin.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    saveSettings();

    try {
      const blob = await getEpubBlob();
      if (!blob) {
        throw new Error('EPUB dosyası oluşturulamadı.');
      }

      const cleanFileName = (fileName || 'kitap').replace(/\.(epub|pdf)$/i, '') + '_duzeltilmis.epub';
      const file = new File([blob], cleanFileName, { type: 'application/epub+zip' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('kindleEmail', kindleEmail.trim());
      formData.append('provider', emailProvider);

      if (emailProvider === 'smtp') {
        formData.append('host', smtpHost.trim());
        formData.append('port', smtpPort.trim());
        formData.append('user', smtpUser.trim());
        formData.append('pass', smtpPass.trim());
        formData.append('secure', String(smtpSecure));
      } else {
        formData.append('resendApiKey', resendApiKey.trim());
        formData.append('fromEmail', resendFrom.trim());
      }

      const res = await fetch('/api/kindle/send', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kindle gönderimi başarısız oldu.');
      }

      setStatusMessage({
        type: 'success',
        text: `Kitap başarıyla ${kindleEmail} adresine iletildi! Amazon birkaç dakika içinde Kindle cihazınızla senkronize edecektir.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'E-posta gönderilemedi.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToKoreader = async () => {
    if (!koreaderUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Lütfen KOReader IP adresini girin.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    saveSettings();

    try {
      const blob = await getEpubBlob();
      if (!blob) {
        throw new Error('EPUB dosyası oluşturulamadı.');
      }

      const cleanFileName = (fileName || 'kitap').replace(/\.(epub|pdf)$/i, '') + '_duzeltilmis.epub';
      const file = new File([blob], cleanFileName, { type: 'application/epub+zip' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetUrl', koreaderUrl.trim());

      const res = await fetch('/api/koreader/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'KOReader aktarımı başarısız oldu.');
      }

      setStatusMessage({
        type: 'success',
        text: `Kitap başarıyla KOReader cihazınıza aktarıldı!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Aktarım başarısız oldu.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                E-Okuyucuya Gönder
              </h2>
              <p className="text-xs text-zinc-500">Kindle veya KOReader cihazınıza kablosuz aktarın</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('kindle'); setStatusMessage(null); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'kindle'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Mail className="w-4 h-4 text-emerald-500" />
            <span>Send to Kindle (E-Posta)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('koreader'); setStatusMessage(null); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'koreader'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Wifi className="w-4 h-4 text-blue-500" />
            <span>KOReader (Wi-Fi / LAN)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('browser'); setStatusMessage(null); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'browser'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
            title="Yerel Ağ İndirme & QR Kod"
          >
            <QrCode className="w-4 h-4 text-purple-500" />
            <span className="hidden sm:inline">QR / Tarayıcı</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {activeTab === 'kindle' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  Kindle E-Posta Adresiniz
                </label>
                <input
                  type="email"
                  value={kindleEmail}
                  onChange={(e) => setKindleEmail(e.target.value)}
                  placeholder="kullanici@kindle.com"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-zinc-500">
                  Amazon hesabınızda kayıtlı <code>@kindle.com</code> adresinizi girin.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                  Gönderici E-Posta Yapılandırması
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEmailProvider('smtp')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      emailProvider === 'smtp'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Server className="w-3 h-3" />
                    <span>Gmail / SMTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailProvider('resend')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      emailProvider === 'resend'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Key className="w-3 h-3" />
                    <span>Resend API</span>
                  </button>
                </div>
              </div>

              {emailProvider === 'smtp' ? (
                <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      SMTP Sağlayıcı Seçimi
                    </span>
                    <div className="flex gap-1 text-[11px]">
                      {(['gmail', 'outlook', 'yandex', 'custom'] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSmtpPresetChange(preset)}
                          className={`px-2 py-0.5 rounded-md font-medium uppercase text-[10px] cursor-pointer ${
                            smtpPreset === preset
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        Gönderen E-Posta
                      </label>
                      <input
                        type="email"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="adiniz@gmail.com"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        Uygulama Şifresi (App Password)
                      </label>
                      <input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {smtpPreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          SMTP Sunucu Adresi
                        </label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.example.com"
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          Port
                        </label>
                        <input
                          type="text"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          placeholder="465"
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Resend API Key
                    </label>
                    <input
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder="re_..."
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Gönderen E-Posta (From Email)
                    </label>
                    <input
                      type="text"
                      value={resendFrom}
                      onChange={(e) => setResendFrom(e.target.value)}
                      placeholder="onboarding@resend.dev"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong>Önemli Amazon İpucu:</strong> Amazon&apos;un e-postanızı kabul etmesi için gönderen e-posta adresinizi (*{smtpUser || 'gönderen adresiniz'}*) Amazon hesabınızda <em>İçerik ve Cihazlar &gt; Tercihler &gt; Kişisel Belge Ayarları</em> bölümündeki onaylı listeye eklemelisiniz.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'koreader' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-blue-500" />
                  KOReader Wi-Fi / IP Adresi
                </label>
                <input
                  type="text"
                  value={koreaderUrl}
                  onChange={(e) => setKoreaderUrl(e.target.value)}
                  placeholder="http://192.168.1.50:8080"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
                <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span>Nasıl Kullanılır?</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  <li>E-Okuyucunuzda (Kindle, Kobo, reMarkable vb.) KOReader uygulamasını açın.</li>
                  <li><strong>Üst Menü &gt; Ağ &gt; Wi-Fi Dosya Aktarımı (Web Server)</strong> seçeneğini aktif edin.</li>
                  <li>Ekranda yazan yerel IP adresini (örn: <code>http://192.168.1.50:8080</code>) yukarıdaki kutuya yazın.</li>
                  <li><strong>KOReader&apos;a Gönder</strong> butonuna tıklayın. Dosya doğrudan cihazınıza aktarılacaktır.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'browser' && (
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                    E-Okuyucu veya Telefondan Doğrudan İndirme
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
                    Aynı Wi-Fi ağına bağlıyken Kindle veya Kobo&apos;nuzun web tarayıcısını açıp bilgisayarınızın yerel IP adresine bağlanarak düzeltilmiş kitapları anında indirebilirsiniz.
                  </p>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 inline-flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold select-all">
                  <span>{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>

          {activeTab === 'kindle' && (
            <button
              type="button"
              onClick={handleSendToKindle}
              disabled={isSending || !kindleEmail.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Kindle&apos;a Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kindle&apos;a Gönder</span>
                </>
              )}
            </button>
          )}

          {activeTab === 'koreader' && (
            <button
              type="button"
              onClick={handleSendToKoreader}
              disabled={isSending || !koreaderUrl.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>KOReader&apos;a Aktarılıyor...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>KOReader&apos;a Aktar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
