import React from 'react';
import {
  FileText,
  AlertTriangle,
  ExternalLink,
  X,
  Download,
  Database,
  Building2,
  Calendar,
  CreditCard,
  Hash,
  Eye,
} from 'lucide-react';
import { ARCHIVE_DASHBOARD_URL, ArchiveCheckResult } from '../utils/archiveStorage';

interface ArchiveDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  evrakNo: string;
  result: ArchiveCheckResult | null;
  isLoading: boolean;
  recordDetails?: {
    tarih?: string;
    donem?: string;
    firmaUnvani?: string;
    isinAdi?: string;
    tutar?: string | number;
    bankaAdi?: string;
  };
}

export const ArchiveDocModal: React.FC<ArchiveDocModalProps> = ({
  isOpen,
  onClose,
  evrakNo,
  result,
  isLoading,
  recordDetails,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Başlığı */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                isLoading
                  ? 'bg-blue-950/80 border border-blue-500/40 text-blue-400'
                  : result?.exists
                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-950/80 border border-amber-500/40 text-amber-400'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : result?.exists ? (
                <Eye className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {isLoading
                    ? 'Evrak Arşivi Sorgulanıyor...'
                    : result?.exists
                    ? 'Evrak Arşivde Bulundu'
                    : 'Evrak Yok (Belge Bulunamadı)'}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  No: {evrakNo}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Supabase Depolama Havuzu: <strong className="text-blue-400 font-mono">ARSIVCEKLER</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-200">
          {/* İlgili Evrak Kartı */}
          {recordDetails && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {recordDetails.firmaUnvani && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Firma Ünvanı</span>
                  <strong className="text-white text-xs">{recordDetails.firmaUnvani}</strong>
                </div>
              )}
              {recordDetails.tarih && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Evrak Tarihi</span>
                  <span className="text-slate-200 font-mono">{recordDetails.tarih}</span>
                </div>
              )}
              {recordDetails.donem && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dönem</span>
                  <span className="text-blue-300 font-bold">{recordDetails.donem}</span>
                </div>
              )}
              {recordDetails.bankaAdi && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Banka</span>
                  <span className="text-slate-200">{recordDetails.bankaAdi}</span>
                </div>
              )}
              {recordDetails.isinAdi && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">İşin Adı</span>
                  <span className="text-slate-300">{recordDetails.isinAdi}</span>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-white">
                "{evrakNo}" evrakı ARSIVCEKLER havuzunda kontrol ediliyor...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Lütfen bekleyin, Supabase Storage bağlantısı kuruluyor.
              </p>
            </div>
          ) : result?.exists ? (
            /* EVRAK VAR - GÖSTERİM ALANI */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-300">
                    Dijital Evrak Bulundu: {result.fileName}
                  </h4>
                  <p className="text-xs text-emerald-400/80 mt-0.5">
                    Evrak ARSIVCEKLER deposundan başarıyla getirildi. Aşağıdaki önizlemeden inceleyebilir veya indirebilirsiniz.
                  </p>
                </div>
              </div>

              {/* Önizleme Penceresi */}
              <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden flex flex-col items-center justify-center min-h-[250px]">
                {result.fileType === 'image' ? (
                  <img
                    src={result.fileUrl}
                    alt={`Evrak ${evrakNo}`}
                    className="max-h-[400px] w-auto object-contain mx-auto"
                  />
                ) : (
                  <iframe
                    src={result.fileUrl}
                    title={`Evrak ${evrakNo}`}
                    className="w-full h-[400px] border-0"
                  />
                )}
              </div>

              {/* Butonlar */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <a
                  href={result.fileUrl}
                  download={result.fileName || `evrak-${evrakNo}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>İndir</span>
                </a>
                <a
                  href={result.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Tam Ekranda Aç</span>
                </a>
              </div>
            </div>
          ) : (
            /* EVRAK YOK - UYARI ALANI */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/40 border-2 border-amber-500/40 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wide">
                    EVRAK YOK UYARISI
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                    <strong className="text-white font-mono font-bold">"{evrakNo}"</strong> numaralı evraka ait herhangi bir dijital çek / evrak görseli veya PDF dosyası <strong className="text-white font-mono">ARSIVCEKLER</strong> depolama kovasında bulunamadı.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    Depolama Adresi:
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">project/mgtunrfpzbyfnmeloeeq/storage</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Hedef Kova:</span>
                  <span className="font-mono font-bold text-amber-400">ARSIVCEKLER</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                  Not: Dosya adı olarak evrak numarasının ({evrakNo}.pdf, {evrakNo}.jpg vb.) kova içerisine yüklenmiş olması gerekmektedir.
                </p>
              </div>

              {/* Supabase Dashboard Arşiv Linki */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Kapat
                </button>
                <a
                  href={ARCHIVE_DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-200 bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/50 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>ARSIVCEKLER Kovasını Supabase'de Aç</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
