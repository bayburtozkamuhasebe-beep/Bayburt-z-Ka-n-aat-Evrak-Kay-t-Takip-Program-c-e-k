import React, { useState, useEffect } from 'react';
import { CompanyKey } from '../types';
import { COMPANIES } from '../data/companies';
import { CompanyLogo } from './CompanyLogo';
import {
  Menu,
  Plus,
  Download,
  Printer,
  Calendar,
  Clock,
  Search,
  Filter,
  FileSpreadsheet,
  FolderInput,
} from 'lucide-react';

interface HeaderProps {
  selectedCompany: CompanyKey;
  onOpenNewDocModal: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onToggleMobileSidebar: () => void;
  totalDocsCount: number;
  onOpenGeneralReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCompany,
  onOpenNewDocModal,
  onExportCSV,
  onPrint,
  onToggleMobileSidebar,
  totalDocsCount,
  onOpenGeneralReport,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  const handleOpenKaydedilecekEvraklar = () => {
    // Sayfa incelemesinde (inspect element) bağlantı adresi DOM veya etiketlerde doğrudan görünmez
    // Hedef: https://evrakkaytaktarmaportalozka.bayburtozka.com.tr/
    const enc = 'aHR0cHM6Ly9ldnJha2theXRha3Rhcm1hcG9ydGFsb3prYS5iYXlidXJ0b3prYS5jb20udHIv';
    const targetUrl = atob(enc);
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.assign(targetUrl);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDateStr(
        now.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'short',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCompanyName = COMPANIES[selectedCompany]?.name || 'BAYBURT ÖZ-KA İNŞAAT';

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shadow-lg"
    >
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu button */}
          <button
            type="button"
            id="btn-mobile-toggle"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            aria-label="Menüyü Aç"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo - Adsız.png */}
          <CompanyLogo className="w-10 h-10 sm:w-11 sm:h-11" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-400/90">
                KURUMSAL EVRAK KAYIT SİSTEMİ
              </span>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-600" />
              <span className="hidden sm:inline-block text-[11px] text-slate-400">
                {totalDocsCount} Kayıtlı Evrak
              </span>
            </div>
            <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white drop-shadow-sm flex items-center gap-2">
              <span>BAYBURT ÖZ-KA İNŞAAT</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400 hidden md:inline">
                | Evrak Kayıt Takip Programı
              </span>
            </h1>
          </div>
        </div>

        {/* Right Controls: Ambient Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 justify-between md:justify-end">
          {/* Live Date / Time Badge */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{dateStr}</span>
            <span className="text-slate-600">|</span>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-blue-300">{timeStr}</span>
          </div>

          {/* GENEL RAPOR BUTONU (Tarih Yanında) */}
          <button
            type="button"
            id="btn-general-report"
            onClick={onOpenGeneralReport}
            title="Tüm Şirketlerin Evrak Tablolarını Alt Alta Genel Raporda Aç"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all duration-200 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-100" />
            <span>GENEL RAPOR</span>
          </button>

          {/* KAYDEDİLECEK EVRAKLAR BUTONU (Genel Raporun Yanında - Sayfa incelemesinde link gizlidir) */}
          <button
            type="button"
            id="btn-kaydedilecek-evraklar"
            onClick={handleOpenKaydedilecekEvraklar}
            title="Kaydedilecek Evraklar Portalı"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all duration-200 cursor-pointer active:scale-95"
          >
            <FolderInput className="w-4 h-4 text-emerald-100" />
            <span>KAYDEDİLECEK EVRAKLAR</span>
          </button>

          {/* Export to CSV Button */}
          <button
            type="button"
            id="btn-export-csv"
            onClick={onExportCSV}
            title="Tüm Filtrelenmiş Evrakları Excel / CSV Olarak İndir"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 shadow-sm transition-all duration-200"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Excel / CSV İndir</span>
            <span className="sm:hidden">İndir</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            id="btn-print-list"
            onClick={onPrint}
            title="Evrak Listesini Yazdır"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 shadow-sm transition-all duration-200"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Yazdır</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb / Active Focus Bar */}
      <div className="bg-slate-900/40 border-t border-slate-800/50 px-4 sm:px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-slate-400 shrink-0">Aktif Görünüm:</span>
          <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
            {activeCompanyName}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          Bayburt Öz-Ka İnşaat Evrak Kayıt & Takip Portalı
        </div>
      </div>
    </header>
  );
};
