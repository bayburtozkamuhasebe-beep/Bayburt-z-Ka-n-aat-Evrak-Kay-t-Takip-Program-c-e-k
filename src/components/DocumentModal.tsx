import React, { useState, useEffect, useRef } from 'react';
import {
  DocumentRecord,
  CompanyKey,
  DocumentType,
  DocumentStatus,
  PriorityLevel,
} from '../types';
import { COMPANY_LIST, COMPANIES } from '../data/companies';
import { generateDocNumber } from '../utils/storage';
import {
  X,
  Plus,
  Save,
  FileText,
  Upload,
  Calendar,
  Building2,
  Paperclip,
  CheckCircle2,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: DocumentRecord) => void;
  editDocument?: DocumentRecord | null;
  defaultCompany?: CompanyKey | 'all';
  totalCount: number;
}

const DOC_TYPES: DocumentType[] = [
  'Gelen Evrak',
  'Giden Evrak',
  'Hakediş Raporu',
  'Fatura & İrsaliye',
  'Sözleşme',
  'Teminat Mektubu',
  'Resmi Yazı / Dilekçe',
  'Şantiye Tutanağı',
  'Proje & Ruhsat',
];

const STATUSES: DocumentStatus[] = [
  'İşlemde',
  'Onaylandı',
  'Cevap Bekleniyor',
  'Arşivlendi',
  'Teslim Edildi',
];

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editDocument,
  defaultCompany,
  totalCount,
}) => {
  const initialCompany: CompanyKey =
    editDocument?.company ||
    (defaultCompany !== 'all' && defaultCompany ? defaultCompany : 'bayburt_ozka');

  const [company, setCompany] = useState<CompanyKey>(initialCompany);
  const [docNumber, setDocNumber] = useState<string>('');
  const [direction, setDirection] = useState<'Gelen' | 'Giden'>('Gelen');
  const [docType, setDocType] = useState<DocumentType>('Gelen Evrak');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [senderRecipient, setSenderRecipient] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<DocumentStatus>('İşlemde');
  const [priority, setPriority] = useState<PriorityLevel>('Normal');
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [attachedFileSize, setAttachedFileSize] = useState<string>('');
  const [registeredBy, setRegisteredBy] = useState<string>('Evrak Kayıt Yetkilisi');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or reset form on open/edit
  useEffect(() => {
    if (editDocument) {
      setCompany(editDocument.company);
      setDocNumber(editDocument.docNumber);
      setDirection(editDocument.direction);
      setDocType(editDocument.docType);
      setDate(editDocument.date);
      setSenderRecipient(editDocument.senderRecipient);
      setReferenceNo(editDocument.referenceNo || '');
      setSubject(editDocument.subject);
      setDescription(editDocument.description || '');
      setStatus(editDocument.status);
      setPriority(editDocument.priority);
      setAttachedFileName(editDocument.attachedFileName || '');
      setAttachedFileSize(editDocument.attachedFileSize || '');
      setRegisteredBy(editDocument.registeredBy || 'Evrak Kayıt Yetkilisi');
    } else {
      const selected =
        defaultCompany !== 'all' && defaultCompany ? defaultCompany : 'bayburt_ozka';
      setCompany(selected);
      setDocNumber(generateDocNumber(selected, totalCount));
      setDirection('Gelen');
      setDocType('Gelen Evrak');
      setDate(new Date().toISOString().slice(0, 10));
      setSenderRecipient('');
      setReferenceNo('');
      setSubject('');
      setDescription('');
      setStatus('İşlemde');
      setPriority('Normal');
      setAttachedFileName('');
      setAttachedFileSize('');
      setRegisteredBy('Evrak Kayıt Yetkilisi');
    }
    setErrors({});
  }, [editDocument, isOpen, defaultCompany, totalCount]);

  // Handle Company change -> update suggested docNumber if adding new
  const handleCompanyChange = (newCompany: CompanyKey) => {
    setCompany(newCompany);
    if (!editDocument) {
      setDocNumber(generateDocNumber(newCompany, totalCount));
    }
  };

  // Handle real file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
      const sizeKB = Math.round(file.size / 1024);
      if (sizeKB > 1024) {
        setAttachedFileSize(`${(sizeKB / 1024).toFixed(1)} MB`);
      } else {
        setAttachedFileSize(`${sizeKB} KB`);
      }
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!docNumber.trim()) errs.docNumber = 'Evrak numarası zorunludur.';
    if (!date) errs.date = 'Tarih seçilmelidir.';
    if (!senderRecipient.trim()) errs.senderRecipient = 'Muhatap / Gönderen kurum belirtilmelidir.';
    if (!subject.trim()) errs.subject = 'Evrak konusu zorunludur.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const nowStr = new Date().toLocaleString('tr-TR');
    const docData: DocumentRecord = {
      id: editDocument ? editDocument.id : `doc-${Date.now()}`,
      docNumber: docNumber.trim(),
      company,
      direction,
      docType,
      date,
      senderRecipient: senderRecipient.trim(),
      referenceNo: referenceNo.trim() || undefined,
      subject: subject.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      attachedFileName: attachedFileName || undefined,
      attachedFileSize: attachedFileSize || undefined,
      registeredBy: registeredBy.trim() || 'Evrak Kayıt Yetkilisi',
      createdAt: editDocument ? editDocument.createdAt : nowStr,
      updatedAt: nowStr,
    };

    onSave(docData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="document-modal-backdrop"
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="document-modal-card"
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {editDocument ? 'Evrak Kaydını Güncelle' : 'Yeni Evrak Kaydı Oluştur'}
              </h3>
              <p className="text-xs text-slate-400">
                Bayburt Öz-Ka İnşaat Evrak Kayıt & Arşiv Takip
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Company Selection Row */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Firma / Şantiye Ortaklığı *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {COMPANY_LIST.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => handleCompanyChange(c.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                    company === c.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 bg-current" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direction & Evrak No & Tarih Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Direction */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Evrak Yönü *
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDirection('Gelen')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    direction === 'Gelen'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Gelen
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('Giden')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    direction === 'Giden'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Giden
                </button>
              </div>
            </div>

            {/* Evrak No */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Evrak Numarası *
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Örn: BYB-2026/0413"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              />
              {errors.docNumber && (
                <p className="text-[11px] text-rose-400 mt-1">{errors.docNumber}</p>
              )}
            </div>

            {/* Tarih */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tarih *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              />
              {errors.date && (
                <p className="text-[11px] text-rose-400 mt-1">{errors.date}</p>
              )}
            </div>
          </div>

          {/* Evrak Türü & Öncelik & Durum */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Evrak Türü */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Evrak Türü
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Durum */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Evrak Durumu
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Öncelik */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Öncelik Derecesi
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Normal">Normal</option>
                <option value="Yüksek">Yüksek</option>
                <option value="Acil">Acil</option>
              </select>
            </div>
          </div>

          {/* Muhatap / Gönderen & Referans No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Muhatap / Gönderen Kurum veya Kişi *
              </label>
              <input
                type="text"
                value={senderRecipient}
                onChange={(e) => setSenderRecipient(e.target.value)}
                placeholder="Örn: Karayolları 10. Bölge Md., Mamak Bel., Taşeron vs."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              {errors.senderRecipient && (
                <p className="text-[11px] text-rose-400 mt-1">{errors.senderRecipient}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                İdare / Kurum Referans No (Varsa)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Örn: KGM-10-847291 veya EBYS No"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Konu (Subject) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Evrak Konusu / Başlık *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Örn: 14 No'lu Hakediş Dosyası veya Viyadük İmalat Onayı"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
            {errors.subject && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.subject}</p>
            )}
          </div>

          {/* Açıklama / İçerik Özeti */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Detaylı Açıklama / Notlar
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Evrakın içeriği, ekleri, teslim koşulları veya şantiye notları..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Dosya / Ek Yükleme Alanı */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                Evrak Eki / Taranmış Belge
              </span>
              {attachedFileName && (
                <button
                  type="button"
                  onClick={() => {
                    setAttachedFileName('');
                    setAttachedFileSize('');
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Eki Kaldır
                </button>
              )}
            </div>

            {attachedFileName ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-amber-500/30 text-xs">
                <div className="flex items-center gap-2 text-slate-200 truncate">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate font-medium">{attachedFileName}</span>
                  <span className="text-[10px] text-slate-400">({attachedFileSize})</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Eklendi
                </span>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.jpg,.jpeg,.png,.zip"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-amber-500/60 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-amber-300 transition-colors"
                >
                  <Upload className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-medium">
                    Bilgisayarınızdan Belge Seçin veya Sürükleyin
                  </span>
                  <span className="text-[10px] text-slate-400">
                    PDF, Word, Excel, DWG veya Görsel formatları
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Kaydı Yapan */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kayıt Yetkilisi / Şantiye Personeli
            </label>
            <input
              type="text"
              value={registeredBy}
              onChange={(e) => setRegisteredBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              id="btn-save-document"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            >
              <Save className="w-4 h-4" />
              <span>{editDocument ? 'Değişiklikleri Kaydet' : 'Evrak Kaydını Tamamla'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
