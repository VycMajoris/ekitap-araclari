import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Book, User, Globe, FileCode, Loader2 } from 'lucide-react';
import { EpubMetadata } from '../lib/types';

interface UploadSectionProps {
  onFileLoaded: (file: File) => void;
  onLoadDemo?: () => void;
  onLoadPdfDemo?: () => void;
  metadata: EpubMetadata | null;
  chapterCount: number;
  totalBlocks: number;
  isLoading: boolean;
  loadingMessage?: string;
  fileName?: string;
  fileSize?: number;
  onReset: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onFileLoaded,
  onLoadDemo,
  onLoadPdfDemo,
  metadata,
  chapterCount,
  totalBlocks,
  isLoading,
  loadingMessage,
  fileName,
  fileSize,
  onReset,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const name = files[0].name.toLowerCase();
      if (name.endsWith('.epub') || name.endsWith('.pdf') || name.endsWith('.mobi')) {
        onFileLoaded(files[0]);
      } else {
        alert('Lütfen geçerli bir .epub, .pdf veya .mobi dosyası seçin.');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileLoaded(files[0]);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (isLoading) {
    return (
      <div className="border-2 border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-3xl p-10 text-center shadow-sm animate-pulse">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
            Dosya Ayrıştırılıyor ve Yapılandırılıyor
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            {loadingMessage || 'Metin blokları, başlıklar ve paragraflar taranıyor...'}
          </p>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-3 py-1 rounded-full font-medium">
            Tarayıcı üzerinde yerel olarak işleniyor
          </div>
        </div>
      </div>
    );
  }

  if (metadata) {
    const isPdf = metadata.format === 'pdf' || fileName?.toLowerCase().endsWith('.pdf');
    const isMobi = metadata.format === 'mobi' || fileName?.toLowerCase().endsWith('.mobi');

    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
              isPdf
                ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                : isMobi
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isPdf ? <FileCode className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-zinc-900 dark:text-white">
                  {metadata.title}
                </h2>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isPdf
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    : isMobi
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {isPdf ? 'PDF Dönüştürüldü' : isMobi ? 'MOBI Yüklendi' : 'EPUB Yüklendi'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {metadata.creator && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    {metadata.creator}
                  </span>
                )}
                {metadata.language && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    Dil: {metadata.language.toUpperCase()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Book className="w-3.5 h-3.5 text-zinc-400" />
                  {chapterCount} Bölüm ({totalBlocks.toLocaleString('tr-TR')} Paragraf/Blok)
                  {metadata.pageCount ? ` • ${metadata.pageCount} Sayfa` : ''}
                </span>
                {fileName && (
                  <span className="text-zinc-400 dark:text-zinc-500">
                    Dosya: {fileName} ({formatFileSize(fileSize)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onReset}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white underline underline-offset-4 shrink-0 self-end sm:self-center cursor-pointer"
          >
            Farklı Dosya Seç
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
          : 'border-zinc-300 dark:border-zinc-800 hover:border-emerald-400 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 shadow-sm'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf,.mobi,application/epub+zip,application/pdf,application/x-mobipocket-ebook"
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-md shadow-emerald-500/10">
          <UploadCloud className="w-8 h-8 animate-pulse" />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            EPUB
          </span>
          <span className="text-zinc-400 font-bold">&bull;</span>
          <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            PDF
          </span>
          <span className="text-zinc-400 font-bold">&bull;</span>
          <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            MOBI
          </span>
        </div>

        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
          EPUB, PDF veya MOBI Kitap Dosyasını Sürükleyip Bırakın
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          veya cihazınızdan seçmek için buraya tıklayın
        </p>

        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 mb-3">
          <span>%100 Tarayıcıda Doğrudan EPUB &amp; MOBI Olarak İşlenir</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onLoadDemo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadDemo();
              }}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
            >
              📖 Örnek Bozuk EPUB ile Test Et &rarr;
            </button>
          )}

          {onLoadPdfDemo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadPdfDemo();
              }}
              className="text-xs font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
            >
              📄 Örnek Bozuk PDF ile Test Et &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
