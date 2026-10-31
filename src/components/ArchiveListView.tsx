import React, { useState, useMemo, useEffect } from 'react';
import { SupabaseEvrakRow, fetchArchiveOrCancelRecords } from '../utils/supabaseClient';
import { checkArchiveDocument, ArchiveCheckResult } from '../utils/archiveStorage';
import { ArchiveDocModal } from './ArchiveDocModal';
import { CompanyLogo } from './CompanyLogo';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  ArrowLeft,
  Search,
  Calendar,
  Building2,
  HardHat,
  Hash,
  CreditCard,
  Briefcase,
  RefreshCw,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Ban,
  Archive,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ArchiveListViewProps {
  type: 'cekarsiv' | 'cekiptal';
  onClose: () => void;
}

export const ArchiveListView: React.FC<ArchiveListViewProps> = ({ type, onClose }) => {
  const isOdenenler = type === 'cekarsiv';
  const pageTitle = isOdenenler ? 'ÖDENENLER (ÇEK ARŞİV)' : 'İPTAL EDİLENLER (ÇEK İPTAL)';
  const badgeText = isOdenenler ? 'Ödenen Evraklar Listesi' : 'İptal Edilen Evraklar Listesi';
  const tableName = isOdenenler ? 'cekarsiv' : 'cekiptal';
  const dashboardUrl = `https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/19101?schema=public/${tableName}`;

  const [records, setRecords] = useState<SupabaseEvrakRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<string>(tableName);

  // Arama filtreleri (çek no, firma ünvanı, işin adı, banka bilgileri)
  const [searchEvrakNo, setSearchEvrakNo] = useState<string>('');
  const [searchFirma, setSearchFirma] = useState<string>('');
  const [searchIsAdi, setSearchIsAdi] = useState<string>('');
  const [searchBanka, setSearchBanka] = useState<string>('');
  const [generalSearch, setGeneralSearch] = useState<string>('');

  // Sayfalama / Devamını Göster
  const INITIAL_ROW_LIMIT = 20;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_ROW_LIMIT);

  // Arşiv Doküman Modalı (ARSIVCEKLER)
  const [archiveModal, setArchiveModal] = useState<{
    isOpen: boolean;
    evrakNo: string;
    isLoading: boolean;
    result: ArchiveCheckResult | null;
    recordDetails?: any;
  }>({
    isOpen: false,
    evrakNo: '',
    isLoading: false,
    result: null,
  });
  const [checkingEvrakNo, setCheckingEvrakNo] = useState<string | null>(null);

  // Verileri çekme
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchArchiveOrCancelRecords(type);
      setRecords(res.data);
      setActiveTable(res.activeTableName);
      if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type]);

  // Evrak no tıklandığında ARSIVCEKLER kontrolü
  const handleEvrakNoClick = async (evrakNo: string, record?: SupabaseEvrakRow) => {
    if (!evrakNo || !evrakNo.trim()) return;
    const trimmed = evrakNo.trim();
    setCheckingEvrakNo(trimmed);
    setArchiveModal({
      isOpen: true,
      evrakNo: trimmed,
      isLoading: true,
      result: null,
      recordDetails: record
        ? {
            tarih: record.evrak_tarihi,
            donem: record.donem,
            firmaUnvani: record.firma_unvani,
            isinAdi: record.isin_adi,
            bankaAdi: record.banka_adi,
            tutar: formatCurrency(record.tutari),
          }
        : undefined,
    });

    try {
      const res = await checkArchiveDocument(trimmed);
      setArchiveModal((prev) => ({
        ...prev,
        isLoading: false,
        result: res,
      }));
    } catch (err: any) {
      setArchiveModal((prev) => ({
        ...prev,
        isLoading: false,
        result: { exists: false, error: err.message },
      }));
    } finally {
      setCheckingEvrakNo(null);
    }
  };

  // Para formatlayıcı
  const formatCurrency = (val: number | string | null | undefined): string => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
    if (isNaN(num)) return '0,00 ₺';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Filtreleme mantığı: Çek No, Firma Ünvanı, İşin Adı, Banka Adı ve Genel Arama
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Çek / Evrak No
      if (searchEvrakNo.trim()) {
        const evrak = (r.evrak_numarasi || '').toLowerCase();
        if (!evrak.includes(searchEvrakNo.trim().toLowerCase())) return false;
      }
      // Firma Ünvanı
      if (searchFirma.trim()) {
        const firma = (r.firma_unvani || '').toLowerCase();
        if (!firma.includes(searchFirma.trim().toLowerCase())) return false;
      }
      // İşin Adı
      if (searchIsAdi.trim()) {
        const isAdi = (r.isin_adi || '').toLowerCase();
        if (!isAdi.includes(searchIsAdi.trim().toLowerCase())) return false;
      }
      // Banka Adı
      if (searchBanka.trim()) {
        const banka = (r.banka_adi || '').toLowerCase();
        if (!banka.includes(searchBanka.trim().toLowerCase())) return false;
      }
      // Genel Arama
      if (generalSearch.trim()) {
        const s = generalSearch.trim().toLowerCase();
        const match =
          (r.evrak_numarasi || '').toLowerCase().includes(s) ||
          (r.firma_unvani || '').toLowerCase().includes(s) ||
          (r.isin_adi || '').toLowerCase().includes(s) ||
          (r.banka_adi || '').toLowerCase().includes(s) ||
          (r.donem || '').toLowerCase().includes(s) ||
          (r.aciklama || '').toLowerCase().includes(s);
        if (!match) return false;
      }

      return true;
    });
  }, [records, searchEvrakNo, searchFirma, searchIsAdi, searchBanka, generalSearch]);

  // Toplam Tutar
  const totalAmount = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => {
      const val = typeof curr.tutari === 'number' ? curr.tutari : parseFloat(String(curr.tutari || 0));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [filteredRecords]);

  // Görüntülenen kayıtlar
  const displayedRecords = filteredRecords.slice(0, visibleCount);
  const hasMore = visibleCount < filteredRecords.length;
  const isExpanded = visibleCount > INITIAL_ROW_LIMIT;

  // Filtreleri temizle
  const handleClearFilters = () => {
    setSearchEvrakNo('');
    setSearchFirma('');
    setSearchIsAdi('');
    setSearchBanka('');
    setGeneralSearch('');
  };

  const hasActiveFilters = Boolean(
    searchEvrakNo || searchFirma || searchIsAdi || searchBanka || generalSearch
  );

  // Excel (.xlsx) Olarak İndir
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('İndirilecek kayıt bulunmamaktadır.');
      return;
    }

    const exportData = filteredRecords.map((r, idx) => ({
      'SIRA NO': idx + 1,
      'EVRAK TARİHİ': r.evrak_tarihi || '',
      DÖNEM: r.donem || '',
      'EVRAK / ÇEK NUMARASI': r.evrak_numarasi || '',
      'FİRMA ÜNVANI': r.firma_unvani || '',
      'BANKA ADI': r.banka_adi || '',
      'İŞİN ADI': r.isin_adi || '',
      'TUTARI (TL)': r.tutari || 0,
      AÇIKLAMA: r.aciklama || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, pageTitle.slice(0, 31));

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${tableName}_dokumu_${dateStr}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060a14] text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* ÜST BAŞLIK & İŞLEM BUTONLARI */}
      <header className="px-4 sm:px-6 py-3.5 bg-slate-950/95 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Geri Dön Butonu */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Ana Sayfaya Dön</span>
          </button>

          <div className="flex items-center gap-2.5">
            <CompanyLogo className="w-9 h-9" />
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md ${
                isOdenenler
                  ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                  : 'bg-gradient-to-br from-red-600 to-rose-700'
              }`}
            >
              {isOdenenler ? <Archive className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                  {pageTitle}
                </h1>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isOdenenler
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {badgeText}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Tablo: {activeTable} (Supabase gboathwmaanqxuwsryud)
              </p>
            </div>
          </div>
        </div>

        {/* Buton Kontrolleri */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Yenile */}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            title="Verileri Yenile"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Excel İndir */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer shadow-md"
            title="Listeyi Excel (.xlsx) olarak indir"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel İndir</span>
          </button>

          {/* Yazdır */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Yazdır</span>
          </button>

          {/* Supabase Dashboard Linki */}
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Supabase Tablo Editörünü Aç"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-300 bg-blue-950/60 border border-blue-800/80 hover:bg-blue-900/60 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Supabase Tablo</span>
          </a>
        </div>
      </header>

      {/* İÇERİK BÖLÜMÜ */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
        {/* İCMAL KARTLARI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Toplam Kayıt Sayısı
            </span>
            <div className="mt-1 text-2xl font-black text-white">{records.length} Evrak</div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Filtrelenen: {filteredRecords.length} Evrak
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-md ${
              isOdenenler
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              {isOdenenler ? 'Ödenen Toplam Tutar' : 'İptal Edilen Toplam Tutar'}
            </span>
            <div className="mt-1 text-2xl font-black text-white font-mono">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Tablodaki güncel bakiye
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              İşlem Tablosu
            </span>
            <div className="mt-1 text-sm font-bold text-blue-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>public.{activeTable}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Taşınan kayıtlar bu tabloda arşivlenir
            </div>
          </div>
        </div>

        {/* DETAYLI ARAMA ALANI: Çek No, Firma Ünvanı, İşin Adı, Banka */}
        <div className="p-4 rounded-2xl bg-white text-slate-900 border-2 border-blue-300 shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Kayıt Arama & Filtreleme (Çek No, Firma, İşin Adı, Banka)
              </span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Filtreleri Temizle</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Çek / Evrak No ile Ara */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ÇEK / EVRAK NO
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchEvrakNo}
                  onChange={(e) => setSearchEvrakNo(e.target.value)}
                  placeholder="Çek no ile ara..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Firma Ünvanı ile Ara */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                FİRMA ÜNVANI
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFirma}
                  onChange={(e) => setSearchFirma(e.target.value)}
                  placeholder="Firma ünvanı ile ara..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* İşin Adı ile Ara */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                İŞİN ADI
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchIsAdi}
                  onChange={(e) => setSearchIsAdi(e.target.value)}
                  placeholder="İşin adı ile ara..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Banka Bilgileri ile Ara */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                BANKA BİLGİSİ
              </label>
              <div className="relative">
                <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchBanka}
                  onChange={(e) => setSearchBanka(e.target.value)}
                  placeholder="Banka adı ile ara..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* HATA MESAJI */}
        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500 bg-rose-950/80 text-rose-200 text-xs font-bold">
            Veri yüklenirken uyarı: {error}
          </div>
        )}

        {/* TABLO ALANI: BEYAZ TABLO & MAVİ ÇİZGİLİ SATIRLAR */}
        <div className="rounded-2xl border-2 border-blue-400 bg-white shadow-xl overflow-hidden">
          <div className="p-4 bg-slate-100 border-b-2 border-blue-500 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                {pageTitle} TABLOSU ({filteredRecords.length} Kayıt)
              </span>
            </div>
            <div className="text-sm sm:text-base text-blue-900 font-mono font-black bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-xs">
              Bakiye Toplamı: {formatCurrency(totalAmount)}
            </div>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-slate-600 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm font-bold">Veriler yükleniyor, lütfen bekleyin...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm font-semibold">
              Eşleşen kayıt bulunamadı veya henüz bu tabloya evrak taşınmamış.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="border-b-2 border-blue-500 bg-slate-100 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                      <th className="py-3.5 px-4 text-center w-14 text-slate-900 font-black">#</th>
                      <th className="py-3.5 px-4 text-slate-900 font-black whitespace-nowrap">EVRAK TARİHİ</th>
                      <th className="py-3.5 px-4 text-slate-900 font-black">DÖNEM</th>
                      <th className="py-3.5 px-4 text-slate-900 font-black whitespace-nowrap">ÇEK / EVRAK NO</th>
                      <th className="py-3.5 px-4 min-w-[220px] text-slate-900 font-black">FİRMA ÜNVANI</th>
                      <th className="py-3.5 px-4 min-w-[170px] text-slate-900 font-black">BANKA ADI</th>
                      <th className="py-3.5 px-4 min-w-[220px] text-slate-900 font-black">İŞİN ADI</th>
                      <th className="py-3.5 px-4 text-right text-slate-900 font-black whitespace-nowrap">TUTARI</th>
                      <th className="py-3.5 px-4 min-w-[180px] text-slate-900 font-black">AÇIKLAMA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-blue-200 text-sm bg-white">
                    {displayedRecords.map((row, idx) => {
                      const isCheckingThis = checkingEvrakNo === row.evrak_numarasi;

                      return (
                        <tr
                          key={row.id || `${row.evrak_numarasi}_${idx}`}
                          className="hover:bg-blue-50/80 transition-colors border-b border-blue-200"
                        >
                          <td className="py-3.5 px-4 text-center text-slate-600 font-mono font-bold text-sm">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-900 font-semibold text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="font-mono">{row.evrak_tarihi}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg font-black text-xs bg-blue-100 text-blue-950 border border-blue-300 shadow-xs">
                              {row.donem || '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {row.evrak_numarasi ? (
                              <button
                                type="button"
                                onClick={() => handleEvrakNoClick(row.evrak_numarasi, row)}
                                disabled={isCheckingThis}
                                title="ARSIVCEKLER depolama alanında evrak kontrolü yap"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-extrabold text-sm text-blue-800 bg-blue-50 hover:bg-blue-600 hover:text-white border-2 border-blue-300 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                              >
                                {isCheckingThis ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Hash className="w-3.5 h-3.5 text-blue-600 group-hover:text-white" />
                                )}
                                <span>{row.evrak_numarasi}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 font-mono text-sm">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-950 text-sm sm:text-base leading-snug">
                            {row.firma_unvani || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-semibold text-sm">
                            {row.banka_adi || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-medium text-sm">
                            {row.isin_adi || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-blue-900 text-base sm:text-lg whitespace-nowrap">
                            {formatCurrency(row.tutari)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 text-sm max-w-[260px] truncate font-medium" title={row.aciklama || ''}>
                            {row.aciklama || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* DEVAMINI GÖSTER / DARALT BUTONLARI */}
              {filteredRecords.length > INITIAL_ROW_LIMIT && (
                <div className="p-3 bg-slate-50 border-t-2 border-blue-400 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-600">
                    Gösterilen: <strong>{displayedRecords.length}</strong> / Toplam:{' '}
                    <strong>{filteredRecords.length}</strong> evrak
                  </span>
                  <div className="flex items-center gap-2">
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + 25)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Devamını Göster (+25)</span>
                      </button>
                    )}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(filteredRecords.length)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-300 transition-all cursor-pointer"
                      >
                        <span>Tümünü Göster ({filteredRecords.length})</span>
                      </button>
                    )}
                    {isExpanded && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(INITIAL_ROW_LIMIT)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-all cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Daralt (20 Evrak)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ARŞİV EVRAK GÖRÜNTÜLEME & UYARI MODALI */}
        <ArchiveDocModal
          isOpen={archiveModal.isOpen}
          onClose={() => setArchiveModal((prev) => ({ ...prev, isOpen: false }))}
          evrakNo={archiveModal.evrakNo}
          isLoading={archiveModal.isLoading}
          result={archiveModal.result}
          recordDetails={archiveModal.recordDetails}
        />
      </div>
    </div>
  );
};
