import React, { useState, useMemo } from 'react';
import { DocumentRecord, DocumentStatus } from '../types';
import { COMPANIES } from '../data/companies';
import {
  FileText,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  HelpCircle,
  Archive,
  Send,
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Download,
  Calendar,
  Building2,
  Plus,
} from 'lucide-react';

interface DocumentTableProps {
  documents: DocumentRecord[];
  onViewDoc: (doc: DocumentRecord) => void;
  onEditDoc: (doc: DocumentRecord) => void;
  onDeleteDoc: (id: string) => void;
  onStatusChange: (id: string, newStatus: DocumentStatus) => void;
  onOpenNewDoc?: () => void;
}

type SortField = 'date' | 'docNumber' | 'priority' | 'company';
type SortOrder = 'asc' | 'desc';

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onViewDoc,
  onEditDoc,
  onDeleteDoc,
  onStatusChange,
  onOpenNewDoc,
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'docNumber') {
        comparison = a.docNumber.localeCompare(b.docNumber);
      } else if (sortField === 'company') {
        comparison = a.company.localeCompare(b.company);
      } else if (sortField === 'priority') {
        const priorityWeight = { Acil: 3, Yüksek: 2, Normal: 1 };
        comparison = priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [documents, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedDocuments.slice(start, start + itemsPerPage);
  }, [sortedDocuments, currentPage, itemsPerPage]);

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'Onaylandı':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Onaylandı
          </span>
        );
      case 'İşlemde':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
            İşlemde
          </span>
        );
      case 'Cevap Bekleniyor':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <HelpCircle className="w-3.5 h-3.5" />
            Cevap Bekleniyor
          </span>
        );
      case 'Teslim Edildi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Send className="w-3.5 h-3.5" />
            Teslim Edildi
          </span>
        );
      case 'Arşivlendi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/40 text-slate-300 border border-slate-600/40">
            <Archive className="w-3.5 h-3.5" />
            Arşivlendi
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Acil':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            Acil
          </span>
        );
      case 'Yüksek':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Yüksek
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
            Normal
          </span>
        );
    }
  };

  const getCompanyPill = (companyKey: string) => {
    const comp = COMPANIES[companyKey as keyof typeof COMPANIES];
    if (!comp) return <span className="text-slate-300">{companyKey}</span>;

    let badgeColors = 'border-slate-700 text-slate-300 bg-slate-800/60';
    if (companyKey === 'bayburt_ozka') {
      badgeColors = 'border-amber-500/40 text-amber-300 bg-amber-950/40';
    } else if (companyKey === 'selahattin_kaldirim') {
      badgeColors = 'border-blue-500/40 text-blue-300 bg-blue-950/40';
    } else if (companyKey === 'arnavutkoy_seka_ozka') {
      badgeColors = 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40';
    } else if (companyKey === 'mamak_seka_ozka') {
      badgeColors = 'border-purple-500/40 text-purple-300 bg-purple-950/40';
    } else if (companyKey === 'senbay_ozka') {
      badgeColors = 'border-rose-500/40 text-rose-300 bg-rose-950/40';
    }

    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-tight border ${badgeColors}`}
      >
        {comp.shortName}
      </span>
    );
  };

  const handleExportExcel = () => {
    if (documents.length === 0) return;
    const headers = ['EVRAK NO', 'ŞİRKET', 'TÜR', 'YÖN', 'TARİH', 'İLGİLİ KURUM/KİŞİ', 'KONU', 'DURUM', 'ÖNCELİK'];
    const rows = documents.map((d) => [
      d.docNumber,
      COMPANIES[d.company]?.shortName || d.company,
      d.docType,
      d.direction,
      d.date,
      d.senderRecipient,
      d.subject,
      d.status,
      d.priority,
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Evrak_Listesi_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Table Top Controls: Title, New Document Button & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center flex-wrap gap-2.5">
          {/* İstenen: Her tablonun başına YENİ EVRAK KAYDI BUTONU */}
          {onOpenNewDoc && (
            <button
              type="button"
              id="btn-archive-table-new-doc"
              onClick={onOpenNewDoc}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all duration-300 shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:shadow-[0_0_35px_rgba(245,158,11,0.65)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>YENİ EVRAK KAYDI</span>
            </button>
          )}

          {/* EXCEL İNDİR */}
          <button
            type="button"
            id="btn-archive-export-excel"
            onClick={handleExportExcel}
            disabled={documents.length === 0}
            title="Tüm Listeyi Excel / CSV Olarak İndir"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
            <span>EXCEL İNDİR</span>
          </button>

          {/* PDF İNDİR */}
          <button
            type="button"
            id="btn-archive-export-pdf"
            onClick={handleExportPDF}
            disabled={documents.length === 0}
            title="Listeyi PDF Olarak Yazdır / Kaydet"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText className="w-4 h-4 stroke-[2.2]" />
            <span>PDF İNDİR</span>
          </button>

          <div className="text-xs text-slate-400">
            Toplam <span className="font-bold text-slate-100">{documents.length}</span> kayıttan{' '}
            <span className="font-bold text-amber-400">{paginatedDocs.length}</span> evrak listeleniyor
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle (Table vs Cards) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800">
            <button
              type="button"
              id="view-mode-table"
              onClick={() => setViewMode('table')}
              title="Tablo Görünümü"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="view-mode-cards"
              onClick={() => setViewMode('cards')}
              title="Kart Görünümü"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Items per page */}
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-900/80 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40 cursor-pointer"
          >
            <option value={10}>10 Satır</option>
            <option value={15}>15 Satır</option>
            <option value={25}>25 Satır</option>
            <option value={50}>50 Satır</option>
          </select>
        </div>
      </div>

      {/* No Records Empty State */}
      {paginatedDocs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-200">Aranan Kriterde Evrak Bulunamadı</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Lütfen arama teriminizi değiştirin, şirket filtresini kontrol edin veya yeni bir evrak kaydı ekleyin.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* BEYAZ TABLO & MAVİ ÇİZGİLİ SATIRLAR */
        <div className="overflow-hidden rounded-2xl border-2 border-blue-300 bg-white shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-blue-500 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('docNumber')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Evrak No</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tarih</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Firma / Şantiye</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3">Tür & Yön</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Muhatap / Gönderen</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Konu & İçerik</th>
                  <th className="py-3.5 px-3">Durum</th>
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Öncelik</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center">Ek</th>
                  <th className="py-3.5 px-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-blue-200 text-xs bg-white">
                {paginatedDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="bg-white hover:bg-blue-50/70 transition-colors duration-150 group border-b border-blue-200"
                  >
                    {/* Evrak No */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewDoc(doc)}
                        className="hover:underline text-left text-blue-900 hover:text-blue-700 flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{doc.docNumber}</span>
                      </button>
                    </td>

                    {/* Tarih */}
                    <td className="py-3.5 px-3 text-slate-800 whitespace-nowrap font-medium">
                      {doc.date}
                    </td>

                    {/* Firma / Şantiye */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getCompanyPill(doc.company)}
                    </td>

                    {/* Tür & Yön */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {doc.direction === 'Gelen' ? (
                          <span className="p-1 rounded bg-blue-100 text-blue-800 border border-blue-300" title="Gelen Evrak">
                            <ArrowDownLeft className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300" title="Giden Evrak">
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        )}
                        <span className="text-slate-800 font-medium truncate max-w-[130px]" title={doc.docType}>
                          {doc.docType}
                        </span>
                      </div>
                    </td>

                    {/* Muhatap / Gönderen */}
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      <div className="truncate max-w-[220px]" title={doc.senderRecipient}>
                        {doc.senderRecipient}
                      </div>
                      {doc.referenceNo && (
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          Ref: {doc.referenceNo}
                        </div>
                      )}
                    </td>

                    {/* Konu & Açıklama */}
                    <td className="py-3.5 px-4 text-slate-900">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-950 line-clamp-1" title={doc.subject}>
                        {doc.subject}
                      </div>
                      {doc.description && (
                        <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          {doc.description}
                        </div>
                      )}
                    </td>

                    {/* Durum - Quick Switcher */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="relative inline-block group/status">
                        {getStatusBadge(doc.status)}
                        <select
                          value={doc.status}
                          onChange={(e) => onStatusChange(doc.id, e.target.value as DocumentStatus)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          title="Durumu Değiştir"
                        >
                          <option value="İşlemde">İşlemde</option>
                          <option value="Onaylandı">Onaylandı</option>
                          <option value="Cevap Bekleniyor">Cevap Bekleniyor</option>
                          <option value="Teslim Edildi">Teslim Edildi</option>
                          <option value="Arşivlendi">Arşivlendi</option>
                        </select>
                      </div>
                    </td>

                    {/* Öncelik */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getPriorityBadge(doc.priority)}
                    </td>

                    {/* Ek / Dosya */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {doc.attachedFileName ? (
                        <button
                          type="button"
                          onClick={() => onViewDoc(doc)}
                          title={`${doc.attachedFileName} (${doc.attachedFileSize || 'Belge'})`}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center gap-1 border border-blue-200"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="text-[10px] hidden xl:inline max-w-[60px] truncate">
                            {doc.attachedFileSize}
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>

                    {/* İşlemler (GÜNCELLE VE SİL BUTONLARI) */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDoc(doc)}
                          title="Detay Görüntüle"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors border border-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* GÜNCELLE BUTONU */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`"${doc.docNumber}" numaralı evrak kaydını güncellemek ve düzenlemek istiyor musunuz?`)) {
                              onEditDoc(doc);
                            }
                          }}
                          title="Evrakı Düzenle / Güncelle"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>GÜNCELLE</span>
                        </button>

                        {/* SİL BUTONU */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`"${doc.docNumber}" numaralı evrak kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
                              onDeleteDoc(doc.id);
                            }
                          }}
                          title="Evrakı Sil"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>SİL</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* RESPONSIVE CARD VIEW (Optimized for Mobile & Quick Reading) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {paginatedDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-2xl border border-slate-800/90 bg-slate-950/70 backdrop-blur-xl hover:border-slate-700 shadow-lg flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    {doc.direction === 'Gelen' ? (
                      <span className="p-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className="font-mono font-bold text-xs text-amber-400">
                      {doc.docNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(doc.priority)}
                    {getStatusBadge(doc.status)}
                  </div>
                </div>

                {/* Company pill & Type */}
                <div className="flex items-center gap-2 mb-2">
                  {getCompanyPill(doc.company)}
                  <span className="text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {doc.docType}
                  </span>
                </div>

                {/* Subject */}
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 mb-1.5">
                  {doc.subject}
                </h4>

                {/* Sender */}
                <div className="text-xs text-slate-300 flex items-center gap-1.5 mb-2">
                  <span className="text-slate-400">Muhatap:</span>
                  <span className="font-medium truncate">{doc.senderRecipient}</span>
                </div>

                {/* Description */}
                {doc.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                    {doc.description}
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-medium text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {doc.date}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewDoc(doc)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1 font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Görüntüle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditDoc(doc)}
                    className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:bg-amber-500/20"
                    title="Düzenle"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`"${doc.docNumber}" silinecektir. Onaylıyor musunuz?`)) {
                        onDeleteDoc(doc.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-500/20"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400">
            Sayfa <span className="font-bold text-white">{currentPage}</span> / {totalPages}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="pagination-prev"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Önceki
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              // Show limited pagination buttons
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-900/60 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return (
                  <span key={pageNum} className="text-slate-600 px-1">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              type="button"
              id="pagination-next"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
