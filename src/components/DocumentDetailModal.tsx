import React from 'react';
import { DocumentRecord, DocumentStatus } from '../types';
import { COMPANIES } from '../data/companies';
import { CompanyLogo } from './CompanyLogo';
import {
  X,
  FileText,
  Printer,
  Edit2,
  Calendar,
  Building2,
  Paperclip,
  CheckCircle2,
  Clock,
  HelpCircle,
  Archive,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Share2,
} from 'lucide-react';

interface DocumentDetailModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
  onEdit: (doc: DocumentRecord) => void;
  onStatusChange: (id: string, newStatus: DocumentStatus) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document: doc,
  onClose,
  onEdit,
  onStatusChange,
}) => {
  if (!doc) return null;

  const comp = COMPANIES[doc.company];

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div
      id="document-detail-backdrop"
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="document-detail-card"
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden my-6 transition-all print:border-none print:shadow-none print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <CompanyLogo className="w-10 h-10" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400">
                  {doc.docNumber}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {doc.docType}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {comp?.name || doc.company}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 print:hidden">
            <button
              type="button"
              onClick={handlePrintSlip}
              title="Evrak Fişini / Dökümünü Yazdır"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(doc);
              }}
              title="Düzenle"
              className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Details Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Tarih</span>
              <span className="font-semibold text-slate-100 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {doc.date}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Evrak Yönü</span>
              <span className="font-semibold text-slate-100 flex items-center gap-1 mt-0.5">
                {doc.direction === 'Gelen' ? (
                  <>
                    <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
                    Gelen Evrak
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    Giden Evrak
                  </>
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Öncelik</span>
              <span className="font-semibold text-slate-100 block mt-0.5">
                {doc.priority === 'Acil' ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Acil
                  </span>
                ) : doc.priority === 'Yüksek' ? (
                  <span className="text-amber-400 font-bold">Yüksek</span>
                ) : (
                  <span className="text-slate-300">Normal</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Mevcut Durum</span>
              <span className="font-semibold text-amber-400 block mt-0.5">
                {doc.status}
              </span>
            </div>
          </div>

          {/* Muhatap & Kurum */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Muhatap / Gönderen Kurum
            </div>
            <div className="text-sm font-bold text-slate-100">
              {doc.senderRecipient}
            </div>
            {doc.referenceNo && (
              <div className="text-xs font-mono text-slate-400 mt-1">
                İdare / EBYS Referans No: <span className="text-amber-400">{doc.referenceNo}</span>
              </div>
            )}
          </div>

          {/* Konu */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Evrak Konusu / Başlık
            </div>
            <div className="text-sm font-semibold text-white bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {doc.subject}
            </div>
          </div>

          {/* Açıklama */}
          {doc.description && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Detaylı Açıklama & Notlar
              </div>
              <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                {doc.description}
              </div>
            </div>
          )}

          {/* Ek Dosya */}
          {doc.attachedFileName && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Ekli Belge
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2.5 text-xs truncate">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200 truncate">
                      {doc.attachedFileName}
                    </div>
                    <div className="text-[10px] text-slate-400">{doc.attachedFileSize || 'Belge Dosyası'}</div>
                  </div>
                </div>

                <a
                  href={`#download-${doc.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`"${doc.attachedFileName}" belgesi şantiye arşivinden indiriliyor.`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  İndir
                </a>
              </div>
            </div>
          )}

          {/* Quick Status Bar */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Durumu Hızlı Güncelle
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['İşlemde', 'Onaylandı', 'Cevap Bekleniyor', 'Teslim Edildi', 'Arşivlendi'] as DocumentStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onStatusChange(doc.id, st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      doc.status === st
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Footer Meta */}
          <div className="pt-2 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80">
            <span>Kayıt Yetkilisi: <strong className="text-slate-300">{doc.registeredBy}</strong></span>
            <span>Son Güncelleme: <strong className="text-slate-300">{doc.updatedAt}</strong></span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(doc);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)]"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Düzenle
          </button>
        </div>
      </div>
    </div>
  );
};
