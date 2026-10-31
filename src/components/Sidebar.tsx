import React from 'react';
import { CompanyKey, DocumentRecord } from '../types';
import { COMPANY_LIST } from '../data/companies';
import { CompanyLogo } from './CompanyLogo';
import {
  Building2,
  HardHat,
  Landmark,
  Hammer,
  ShieldCheck,
  FileText,
  ChevronRight,
  TrendingUp,
  Folder,
  FolderOpen,
  CheckSquare,
  Square,
} from 'lucide-react';

interface SidebarProps {
  selectedCompany: CompanyKey;
  onSelectCompany: (company: CompanyKey) => void;
  documents: DocumentRecord[];
  supabaseDocCounts?: Record<string, number>;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  selectedCompaniesForReport?: Set<CompanyKey>;
  onToggleCompanyReportSelection?: (companyKey: CompanyKey) => void;
  onToggleAllReportCompanies?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedCompany,
  onSelectCompany,
  documents,
  supabaseDocCounts,
  isMobileOpen,
  onCloseMobile,
  selectedCompaniesForReport,
  onToggleCompanyReportSelection,
  onToggleAllReportCompanies,
}) => {
  // Count documents per company (prefer Supabase real counts if available, otherwise local)
  const getCompanyDocCount = (id: CompanyKey) => {
    if (supabaseDocCounts && typeof supabaseDocCounts[id] === 'number') {
      return supabaseDocCounts[id];
    }
    return documents.filter((d) => d.company === id).length;
  };

  const getCompanyUrgentCount = (id: CompanyKey) => {
    // Veri tabanında kayıt yoksa veya 0 ise asla Acil rozeti gösterme
    if (supabaseDocCounts && typeof supabaseDocCounts[id] === 'number' && supabaseDocCounts[id] === 0) {
      return 0;
    }
    return documents.filter((d) => d.company === id && d.priority === 'Acil').length;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'building':
        return <Building2 className="w-5 h-5 transition-transform group-hover:scale-110" />;
      case 'hard-hat':
        return <HardHat className="w-5 h-5 transition-transform group-hover:scale-110" />;
      case 'landmark':
        return <Landmark className="w-5 h-5 transition-transform group-hover:scale-110" />;
      case 'hammer':
        return <Hammer className="w-5 h-5 transition-transform group-hover:scale-110" />;
      case 'shield':
        return <ShieldCheck className="w-5 h-5 transition-transform group-hover:scale-110" />;
      default:
        return <Building2 className="w-5 h-5" />;
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <CompanyLogo className="w-10 h-10" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
              Kurumsal Portföy
            </div>
            <h2 className="text-sm font-bold text-slate-100 tracking-tight">
              Şirket & Ortaklıklar
            </h2>
          </div>
        </div>
      </div>

      {/* Main Button Stack - Ambient Glow Buttons */}
      <div className="p-3 sm:p-4 space-y-2.5 flex-1 overflow-y-auto custom-scrollbar">
        {/* Title & Report Selection Indicator */}
        <div className="pb-1 px-1 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Şantiye & Ortaklık Listesi</span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
              title="Bütün Firmalar PDF raporuna dahil edilecek seçili şirket sayısı"
            >
              {selectedCompaniesForReport ? selectedCompaniesForReport.size : COMPANY_LIST.length}/5 Seçili
            </span>
          </div>
          {onToggleAllReportCompanies && (
            <button
              type="button"
              onClick={onToggleAllReportCompanies}
              title={
                (selectedCompaniesForReport?.size ?? COMPANY_LIST.length) === COMPANY_LIST.length
                  ? 'Tüm seçimleri kaldır'
                  : 'Tüm şirketleri rapora seç'
              }
              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline tracking-normal transition-colors cursor-pointer"
            >
              {(selectedCompaniesForReport?.size ?? COMPANY_LIST.length) === COMPANY_LIST.length
                ? 'Temizle'
                : 'Tümünü Seç'}
            </button>
          )}
        </div>

        {/* 5 Requested Buttons: Alt Alta, Başlarında Tik Kutucuğu ve Ambiyanslı */}
        {COMPANY_LIST.map((comp) => {
          const isSelected = selectedCompany === comp.id;
          const isReportChecked = selectedCompaniesForReport
            ? selectedCompaniesForReport.has(comp.id)
            : true;
          const count = getCompanyDocCount(comp.id);
          const urgentCount = getCompanyUrgentCount(comp.id);

          // Custom ambient color classes based on company
          let activeStyles = '';
          let inactiveStyles = '';
          let iconBg = '';
          let glowGlow = '';
          let badgeBorder = '';
          let accentColor = '';

          switch (comp.id) {
            case 'bayburt_ozka':
              activeStyles =
                'bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-900/60 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/60 text-amber-200';
              inactiveStyles =
                'bg-gradient-to-r from-amber-950/30 via-slate-900/70 to-slate-900/60 hover:from-amber-950/60 hover:to-amber-900/40 border-amber-500/40 hover:border-amber-400 text-slate-200 hover:text-amber-200 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]';
              iconBg = isSelected
                ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-400/70 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-amber-950/70 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500/30 group-hover:text-amber-200';
              glowGlow = 'rgba(245, 158, 11, 0.45)';
              badgeBorder = 'border-amber-500/40 text-amber-300 bg-amber-950/50';
              accentColor = 'text-amber-400';
              break;
            case 'selahattin_kaldirim':
              activeStyles =
                'bg-gradient-to-r from-blue-950/90 via-slate-900/95 to-blue-900/60 border-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.4)] ring-1 ring-blue-400/60 text-blue-200';
              inactiveStyles =
                'bg-gradient-to-r from-blue-950/30 via-slate-900/70 to-slate-900/60 hover:from-blue-950/60 hover:to-blue-900/40 border-blue-500/40 hover:border-blue-400 text-slate-200 hover:text-blue-200 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]';
              iconBg = isSelected
                ? 'bg-blue-500/30 text-blue-300 ring-1 ring-blue-400/70 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'bg-blue-950/70 text-blue-400 border border-blue-500/30 group-hover:bg-blue-500/30 group-hover:text-blue-200';
              glowGlow = 'rgba(59, 130, 246, 0.45)';
              badgeBorder = 'border-blue-500/40 text-blue-300 bg-blue-950/50';
              accentColor = 'text-blue-400';
              break;
            case 'arnavutkoy_seka_ozka':
              activeStyles =
                'bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-emerald-900/60 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400/60 text-emerald-200';
              inactiveStyles =
                'bg-gradient-to-r from-emerald-950/30 via-slate-900/70 to-slate-900/60 hover:from-emerald-950/60 hover:to-emerald-900/40 border-emerald-500/40 hover:border-emerald-400 text-slate-200 hover:text-emerald-200 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]';
              iconBg = isSelected
                ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400/70 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/30 group-hover:text-emerald-200';
              glowGlow = 'rgba(16, 185, 129, 0.45)';
              badgeBorder = 'border-emerald-500/40 text-emerald-300 bg-emerald-950/50';
              accentColor = 'text-emerald-400';
              break;
            case 'mamak_seka_ozka':
              activeStyles =
                'bg-gradient-to-r from-purple-950/90 via-slate-900/95 to-purple-900/60 border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.4)] ring-1 ring-purple-400/60 text-purple-200';
              inactiveStyles =
                'bg-gradient-to-r from-purple-950/30 via-slate-900/70 to-slate-900/60 hover:from-purple-950/60 hover:to-purple-900/40 border-purple-500/40 hover:border-purple-400 text-slate-200 hover:text-purple-200 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]';
              iconBg = isSelected
                ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-400/70 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                : 'bg-purple-950/70 text-purple-400 border border-purple-500/30 group-hover:bg-purple-500/30 group-hover:text-purple-200';
              glowGlow = 'rgba(168, 85, 247, 0.45)';
              badgeBorder = 'border-purple-500/40 text-purple-300 bg-purple-950/50';
              accentColor = 'text-purple-400';
              break;
            case 'senbay_ozka':
              activeStyles =
                'bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-rose-900/60 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.4)] ring-1 ring-rose-400/60 text-rose-200';
              inactiveStyles =
                'bg-gradient-to-r from-rose-950/30 via-slate-900/70 to-slate-900/60 hover:from-rose-950/60 hover:to-rose-900/40 border-rose-500/40 hover:border-rose-400 text-slate-200 hover:text-rose-200 hover:shadow-[0_0_25px_rgba(244,63,94,0.3)]';
              iconBg = isSelected
                ? 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-400/70 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                : 'bg-rose-950/70 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500/30 group-hover:text-rose-200';
              glowGlow = 'rgba(244, 63, 94, 0.45)';
              badgeBorder = 'border-rose-500/40 text-rose-300 bg-rose-950/50';
              accentColor = 'text-rose-400';
              break;
          }

          return (
            <div
              key={comp.id}
              className="relative w-full"
            >
              <button
                id={`btn-company-${comp.id}`}
                type="button"
                onClick={() => {
                  onSelectCompany(comp.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group w-full relative text-left p-3 rounded-xl transition-all duration-300 border cursor-folder ${
                  isSelected ? activeStyles : inactiveStyles
                }`}
                style={{
                  boxShadow: isSelected ? `0 0 25px ${glowGlow}, inset 0 1px 0 rgba(255,255,255,0.1)` : undefined,
                }}
              >
                {/* Subtle ambient light pulse on hover */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${comp.accentGlow} 0%, transparent 70%)`,
                  }}
                />

                <div className="relative flex items-start gap-2.5">
                  {/* ŞANTİYE BAŞINDAKİ TİK KUTUCUĞU (Bütün Firmalar PDF Raporuna Dahil Et / Çıkar) */}
                  <div
                    role="checkbox"
                    aria-checked={isReportChecked}
                    tabIndex={0}
                    title={
                      isReportChecked
                        ? `${comp.name} Bütün Firmalar PDF raporuna dahil edilecek. Tıklayarak rapordan çıkarabilirsiniz.`
                        : `${comp.name} rapordan çıkarıldı. Tıklayarak Bütün Firmalar PDF raporuna ekleyebilirsiniz.`
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleCompanyReportSelection) {
                        onToggleCompanyReportSelection(comp.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        if (onToggleCompanyReportSelection) {
                          onToggleCompanyReportSelection(comp.id);
                        }
                      }
                    }}
                    className={`mt-1 p-1 rounded-lg transition-all duration-200 shrink-0 flex items-center justify-center border cursor-pointer ${
                      isReportChecked
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400/60 hover:bg-emerald-500/40'
                        : 'bg-slate-900/90 border-slate-700/80 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {isReportChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 stroke-[2.4]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                    )}
                  </div>

                  {/* İkon */}
                  <div className={`p-2 rounded-xl transition-all duration-200 shrink-0 ${iconBg}`}>
                    {getIcon(comp.iconType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeBorder}`}>
                        {comp.badge}
                      </span>
                      {urgentCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                          {urgentCount} Acil
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-white leading-snug tracking-tight truncate">
                      {comp.name}
                    </h3>

                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {comp.description}
                    </p>
                  </div>
                </div>

                {/* Bottom stats row inside button with folder indicator */}
                <div className="relative mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-400 group-hover:hidden transition-colors" />
                    <FolderOpen className="w-3.5 h-3.5 text-amber-300 hidden group-hover:inline transition-colors" />
                    <span>Kayıtlı Evrak</span>
                  </span>
                  <span className="font-semibold text-slate-200 group-hover:text-white flex items-center gap-1">
                    <span className={accentColor}>{count} Adet</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-0.5 text-amber-400' : 'text-slate-500 group-hover:translate-x-0.5'}`} />
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-medium">Supabase Bağlı</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">gboathw...</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        id="desktop-sidebar"
        className="hidden lg:flex flex-col w-80 shrink-0 border-r border-slate-800/90 bg-slate-950/60 backdrop-blur-xl z-20"
      >
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          id="mobile-sidebar-backdrop"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 lg:hidden"
          onClick={onCloseMobile}
        >
          <div
            id="mobile-sidebar-container"
            className="w-5/6 max-w-sm h-full bg-slate-950 border-r border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
