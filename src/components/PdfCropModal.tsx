import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crop,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  RotateCcw,
  Sliders,
  Maximize2,
  FileText,
  AlertCircle,
  X,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import {
  PdfCropBounds,
  PdfRepresentativePageInfo,
  PdfChapterMode,
  findRepresentativePdfPage,
  getPdfJs,
} from '@/lib/pdf-engine';

interface PdfCropModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (cropBounds: PdfCropBounds, preserveAllLines: boolean, extractImages: boolean, chapterMode?: PdfChapterMode) => void;
}

export const PdfCropModal: React.FC<PdfCropModalProps> = ({
  isOpen,
  file,
  onClose,
  onConfirm,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<PdfRepresentativePageInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [cropBounds, setCropBounds] = useState<PdfCropBounds>({
    topPercent: 0.04,
    bottomPercent: 0.04,
    leftPercent: 0.01,
    rightPercent: 0.01,
  });
  const [preserveAllLines, setPreserveAllLines] = useState<boolean>(false);
  const [extractImages, setExtractImages] = useState<boolean>(false);
  const [chapterMode, setChapterMode] = useState<PdfChapterMode>('auto');
  const [activePreset, setActivePreset] = useState<'auto' | 'full' | 'novel' | 'wide' | 'custom'>('auto');
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  const [pdfDocInstance, setPdfDocInstance] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !file) {
      setPdfDocInstance(null);
      setPageInfo(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const initPdf = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const pdfjsLib = await getPdfJs();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
        });
        const doc = await loadingTask.promise;

        if (!isMounted) return;
        setPdfDocInstance(doc);
        setTotalPages(doc.numPages);

        const rep = await findRepresentativePdfPage(file);
        if (!isMounted) return;

        setPageInfo(rep);
        setCurrentPage(rep.pageNumber);
        setCropBounds(rep.recommendedCrop);
        setActivePreset('auto');
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error('PDF sayfa analizi hatası:', err);
        setError(err instanceof Error ? err.message : 'PDF sayfası yüklenirken hata oluştu.');
        setIsLoading(false);
      }
    };

    initPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [isOpen, file]);

  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDocInstance || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDocInstance.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current ? containerRef.current.clientWidth : 480;
        const targetWidth = Math.max(300, Math.min(containerWidth - 32, 600));
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF sayfa render uyarısı:', err);
        }
      }
    },
    [pdfDocInstance]
  );

  useEffect(() => {
    if (pdfDocInstance && currentPage && !isLoading) {
      renderPage(currentPage);
    }
  }, [pdfDocInstance, currentPage, isLoading, renderPage]);

  const handlePageChange = async (newPage: number) => {
    if (!pdfDocInstance || newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const handlePresetSelect = (preset: 'auto' | 'full' | 'novel' | 'wide') => {
    setActivePreset(preset);
    if (preset === 'full') {
      setCropBounds({ topPercent: 0, bottomPercent: 0, leftPercent: 0, rightPercent: 0 });
      setPreserveAllLines(true);
    } else if (preset === 'auto' && pageInfo) {
      setCropBounds(pageInfo.recommendedCrop);
      setPreserveAllLines(false);
    } else if (preset === 'novel') {
      setCropBounds({ topPercent: 0.05, bottomPercent: 0.05, leftPercent: 0.02, rightPercent: 0.02 });
      setPreserveAllLines(false);
    } else if (preset === 'wide') {
      setCropBounds({ topPercent: 0.08, bottomPercent: 0.08, leftPercent: 0.04, rightPercent: 0.04 });
      setPreserveAllLines(false);
    }
  };

  const updateBound = (key: keyof PdfCropBounds, value: number) => {
    setActivePreset('custom');
    setCropBounds((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(0.35, Math.round(value * 100) / 100)),
    }));
  };

  const handleConfirm = () => {
    onConfirm(cropBounds, preserveAllLines, extractImages, chapterMode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs border border-emerald-500/20 shrink-0">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  PDF Metin Alanı ve Marj Seçimi
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                  OCR & Çeviri Koruması
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sayfa numaraları veya üstbilgilerin metne karışmaması, kenardaki yazıların kaybolmaması için alanı doğrulayın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                showGuide
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-emerald-600/90 to-teal-600/90 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
              }`}
              title="Nasıl Kullanılır? ve İpuçları"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Nasıl Kullanılır?</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showGuide && (
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-amber-500/10 border-b border-emerald-200/60 dark:border-emerald-900/40 p-4 sm:p-5 shrink-0 transition-all text-xs">
            <div className="max-w-4xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-bold text-sm">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>📖 PDF Metin Alanı ve Kırpma Rehberi</span>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                >
                  Rehberi Gizle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                <div className="bg-white/80 dark:bg-zinc-800/80 border border-emerald-500/20 rounded-xl p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    🛡️ 1. Korumalı Mod Nedir ve Ne İşe Yarar?
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Normal modda sistem sayfa başındaki veya sonundaki kısa satırları sayfa numarası sanabilir. <strong>Korumalı Mod açıldığında</strong>, yeşil kutu içindeki kısa diyaloglar (<em>"— Kim var?"</em>) veya paragraf sonları (<em>"dedi ve gitti."</em>) <strong>kesinlikle silinmez, %100 korunur</strong>. Tam sayfa kitaplarda mutlaka açın.
                  </p>
                </div>

                <div className="bg-white/80 dark:bg-zinc-800/80 border border-emerald-500/20 rounded-xl p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    🎯 2. Sayfa Numaraları & Üstbilgiler
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Sayfanın altındaki veya üstündeki tekil sayfa numaralarını (örn: <em>"124"</em>) yeşil kutunun dışında bırakın. Böylece OCR ve yapay zeka çevirisi cümlelerin arasına gereksiz sayfa numarası eklemez.
                  </p>
                </div>

                <div className="bg-white/80 dark:bg-zinc-800/80 border border-emerald-500/20 rounded-xl p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    📄 3. Tam Sayfa (%0 Kırpma)
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Sayfa numarası veya üst başlığı olmayan, kenarlara kadar dolu kitaplar için <strong>"Tam Sayfa"</strong> şablonuna tıklayın. Tek tıkla tüm sayfayı sıfır kırpmayla alır.
                  </p>
                </div>

                <div className="bg-white/80 dark:bg-zinc-800/80 border border-emerald-500/20 rounded-xl p-3 space-y-1 shadow-2xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    🧩 4. Heceleme Tireleri ve Bölüm Başlıkları
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Satır sonlarındaki heceleme tirelerinin (<em>"yapı- lamaz"</em>) birleşebilmesi için sağ marjı harfleri kesmeyecek şekilde tutun. Bölüm başlıklarının da yeşil alan içinde kaldığından emin olun.
                  </p>
                </div>

                <div className="bg-white/80 dark:bg-zinc-800/80 border border-blue-500/20 rounded-xl p-3 space-y-1 shadow-2xs md:col-span-2">
                  <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    🖼️ 5. Kitap İçi Görseller ve İllüstrasyonlar
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Kitabınızda resimler, çizimler, diyagramlar veya haritalar varsa <strong>&ldquo;Görselleri Dahil Et&rdquo;</strong> kutucuğunu işaretleyin. Resimler e-kitaba otomatik gömülür ve ait olduğu sayfa/paragraf sırasına yerleştirilir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Canvas Preview (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-zinc-100/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 min-h-[380px] relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  PDF taranıyor ve temsili sayfa inceleniyor...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-rose-500">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            ) : (
              <div ref={containerRef} className="w-full flex flex-col items-center">
                {/* Visual Canvas Container with Dynamic Bounding Box Overlay */}
                <div className="relative shadow-xl rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-white inline-block">
                  <canvas ref={canvasRef} className="block max-h-[440px] w-auto" />

                  {/* Shaded Areas & Bounding Box Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Top Shaded Excluded Area */}
                    <div
                      className="absolute left-0 right-0 top-0 bg-zinc-900/60 dark:bg-black/70 backdrop-blur-[1px] border-b border-rose-400/80 flex items-center justify-center"
                      style={{ height: `${cropBounds.topPercent * 100}%` }}
                    >
                      {cropBounds.topPercent >= 0.03 && (
                        <span className="text-[10px] font-bold text-rose-200 bg-rose-950/80 px-1.5 py-0.5 rounded shadow-xs">
                          Üst Marj (%{Math.round(cropBounds.topPercent * 100)})
                        </span>
                      )}
                    </div>

                    {/* Bottom Shaded Excluded Area */}
                    <div
                      className="absolute left-0 right-0 bottom-0 bg-zinc-900/60 dark:bg-black/70 backdrop-blur-[1px] border-t border-rose-400/80 flex items-center justify-center"
                      style={{ height: `${cropBounds.bottomPercent * 100}%` }}
                    >
                      {cropBounds.bottomPercent >= 0.03 && (
                        <span className="text-[10px] font-bold text-rose-200 bg-rose-950/80 px-1.5 py-0.5 rounded shadow-xs">
                          Alt Marj (%{Math.round(cropBounds.bottomPercent * 100)})
                        </span>
                      )}
                    </div>

                    {/* Left Shaded Excluded Area */}
                    <div
                      className="absolute left-0 bg-zinc-900/60 dark:bg-black/70 backdrop-blur-[1px] border-r border-rose-400/80"
                      style={{
                        top: `${cropBounds.topPercent * 100}%`,
                        bottom: `${cropBounds.bottomPercent * 100}%`,
                        width: `${cropBounds.leftPercent * 100}%`,
                      }}
                    />

                    {/* Right Shaded Excluded Area */}
                    <div
                      className="absolute right-0 bg-zinc-900/60 dark:bg-black/70 backdrop-blur-[1px] border-l border-rose-400/80"
                      style={{
                        top: `${cropBounds.topPercent * 100}%`,
                        bottom: `${cropBounds.bottomPercent * 100}%`,
                        width: `${cropBounds.rightPercent * 100}%`,
                      }}
                    />

                    {/* Active Included Bounding Box */}
                    <div
                      className="absolute border-2 border-emerald-500 bg-emerald-500/10 shadow-inner flex flex-col justify-between p-1.5"
                      style={{
                        top: `${cropBounds.topPercent * 100}%`,
                        bottom: `${cropBounds.bottomPercent * 100}%`,
                        left: `${cropBounds.leftPercent * 100}%`,
                        right: `${cropBounds.rightPercent * 100}%`,
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/90 px-1.5 py-0.5 rounded shadow-xs">
                          Metin Alanı
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-zinc-900/80 px-2 py-0.5 rounded-full shadow-xs">
                          {preserveAllLines ? 'Tüm Satırlar Alınacak' : 'İçerik Ayrıştırılacak'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Page Navigation Toolbar */}
                <div className="mt-3 flex items-center justify-between w-full max-w-sm px-2 py-1.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs shadow-xs">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Önceki Sayfa"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-200">
                    <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Önizleme Sayfası: <strong className="text-zinc-900 dark:text-white">{currentPage}</strong> / {totalPages}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Sonraki Sayfa"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Controls & Presets (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Quick Presets */}
            <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  Hızlı Şablonlar
                </span>
                {activePreset === 'custom' && (
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                    Özel Ayar
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('auto')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    activePreset === 'auto'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Otomatik
                    </span>
                    {activePreset === 'auto' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Algılanan metin sınırları
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetSelect('full')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    activePreset === 'full'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-950 dark:text-blue-100 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-blue-500" /> Tam Sayfa
                    </span>
                    {activePreset === 'full' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    %0 Kırpma (Sıfır kayıp)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetSelect('novel')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    activePreset === 'novel'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold">Standart Roman</span>
                    {activePreset === 'novel' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    %5 Üst / %5 Alt Marj
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetSelect('wide')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    activePreset === 'wide'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold">Geniş Marj</span>
                    {activePreset === 'wide' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    %8 Üst / %8 Alt Marj
                  </span>
                </button>
              </div>
            </div>

            {/* Advanced Toggles: Korumalı Mod & Görseller */}
            <div className="space-y-2.5">
              {/* Korumalı Mod */}
              <div className="p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveAllLines}
                    onChange={(e) => setPreserveAllLines(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-zinc-900 dark:text-zinc-100 font-bold">Korumalı Mod (Filtreleri Kapat)</strong>
                      <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">
                        Sıfır Kayıp
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                      Sayfa başı/sonu kısa diyalog ve cümlelerin silinmesini engeller; seçili alandaki her satırı %100 alır.
                    </p>
                  </div>
                </label>
              </div>

              {/* Kitap Görsellerini Dahil Et */}
              <div className="p-3 rounded-2xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extractImages}
                    onChange={(e) => setExtractImages(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                      <strong className="text-zinc-900 dark:text-zinc-100 font-bold">Kitap Görsellerini ve İllüstrasyonları Dahil Et</strong>
                      <span className="text-[9px] font-extrabold uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md">
                        Görsel
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                      PDF içindeki resimleri, çizimleri ve haritaları ayıklayıp EPUB içinde ilgili sayfa/paragraf konumuna otomatik yerleştirir.
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                  <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                  <span>Bölümleme Mantığı</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChapterMode('auto')}
                    className={`p-2 rounded-xl border text-left text-[11px] font-medium transition-all cursor-pointer ${
                      chapterMode === 'auto'
                        ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-400 text-purple-900 dark:text-purple-200 shadow-2xs font-bold'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="block font-bold">Akıllı Başlık Algılama</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">BÖLÜM, KISIM gibi ana başlıkları otomatik bulur.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChapterMode('fixed_pages')}
                    className={`p-2 rounded-xl border text-left text-[11px] font-medium transition-all cursor-pointer ${
                      chapterMode === 'fixed_pages'
                        ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-400 text-purple-900 dark:text-purple-200 shadow-2xs font-bold'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="block font-bold">Sabit Sayfa Bölümleme</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">Başlığı olmayan kitapları 15 sayfada bir böler.</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Sliders */}
            <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                  Hassas Marj Ayarları
                </span>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('auto')}
                  className="text-[11px] text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Sıfırla
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Top Slider */}
                <div>
                  <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    <span>Üst Marj (Header)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      %{Math.round(cropBounds.topPercent * 100)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.25"
                    step="0.01"
                    value={cropBounds.topPercent}
                    onChange={(e) => updateBound('topPercent', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Bottom Slider */}
                <div>
                  <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    <span>Alt Marj (Footer / Sayfa No)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      %{Math.round(cropBounds.bottomPercent * 100)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.25"
                    step="0.01"
                    value={cropBounds.bottomPercent}
                    onChange={(e) => updateBound('bottomPercent', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Left Slider */}
                <div>
                  <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    <span>Sol Marj</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      %{Math.round(cropBounds.leftPercent * 100)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.20"
                    step="0.01"
                    value={cropBounds.leftPercent}
                    onChange={(e) => updateBound('leftPercent', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Right Slider */}
                <div>
                  <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    <span>Sağ Marj</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      %{Math.round(cropBounds.rightPercent * 100)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.20"
                    step="0.01"
                    value={0.20 - cropBounds.rightPercent}
                    onChange={(e) => updateBound('rightPercent', 0.20 - parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/80 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Info className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Belirlenen metin sınırları tüm {totalPages} sayfaya uygulanacaktır.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-xs transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Alanı Onayla ve Devam Et
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
