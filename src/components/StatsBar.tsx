import React from 'react';
import { DocumentRecord, DocumentFilterState } from '../types';
import {
  FileText,
  Inbox,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface StatsBarProps {
  documents: DocumentRecord[];
  activeFilters: DocumentFilterState;
  onQuickFilter: (key: 'direction' | 'status' | 'priority', value: string) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  documents,
  activeFilters,
  onQuickFilter,
}) => {
  const total = documents.length;
  const gelenCount = documents.filter((d) => d.direction === 'Gelen').length;
  const gidenCount = documents.filter((d) => d.direction === 'Giden').length;
  const pendingCount = documents.filter(
    (d) => d.status === 'İşlemde' || d.status === 'Cevap Bekleniyor'
  ).length;
  const urgentCount = documents.filter((d) => d.priority === 'Acil').length;
  const approvedCount = documents.filter((d) => d.status === 'Onaylandı').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 mb-5">
      {/* Toplam Evrak Card */}
      <button
        type="button"
        id="stat-card-total"
        onClick={() => {
          onQuickFilter('direction', 'all');
          onQuickFilter('status', 'all');
          onQuickFilter('priority', 'all');
        }}
        className="group relative p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all duration-300 text-left"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Toplam Evrak
          </span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {total}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">Kayıtlı ve arşivli evraklar</div>
      </button>

      {/* Gelen Evrak Card */}
      <button
        type="button"
        id="stat-card-gelen"
        onClick={() => onQuickFilter('direction', activeFilters.direction === 'Gelen' ? 'all' : 'Gelen')}
        className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-300 text-left ${
          activeFilters.direction === 'Gelen'
            ? 'border-blue-500/80 bg-blue-950/40 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
            : 'border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Gelen Evrak
          </span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Inbox className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-blue-400 tracking-tight">
          {gelenCount}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">Kurum ve idarelerden gelen</div>
      </button>

      {/* Giden Evrak Card */}
      <button
        type="button"
        id="stat-card-giden"
        onClick={() => onQuickFilter('direction', activeFilters.direction === 'Giden' ? 'all' : 'Giden')}
        className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-300 text-left ${
          activeFilters.direction === 'Giden'
            ? 'border-emerald-500/80 bg-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
            : 'border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Giden Evrak
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Send className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
          {gidenCount}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">Gönderilen resmi yazışmalar</div>
      </button>

      {/* İşlemdeki / Bekleyen Card */}
      <button
        type="button"
        id="stat-card-pending"
        onClick={() => onQuickFilter('status', activeFilters.status === 'İşlemde' ? 'all' : 'İşlemde')}
        className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-300 text-left ${
          activeFilters.status === 'İşlemde'
            ? 'border-purple-500/80 bg-purple-950/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
            : 'border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Bekleyen / İşlemde
          </span>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-purple-400 tracking-tight">
          {pendingCount}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">Cevap veya onay bekleyen</div>
      </button>

      {/* Acil Evraklar Card */}
      <button
        type="button"
        id="stat-card-urgent"
        onClick={() => onQuickFilter('priority', activeFilters.priority === 'Acil' ? 'all' : 'Acil')}
        className={`group relative col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-xl border transition-all duration-300 text-left ${
          activeFilters.priority === 'Acil'
            ? 'border-red-500/80 bg-red-950/40 shadow-[0_0_25px_rgba(239,68,68,0.35)]'
            : 'border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Acil Öncelik
          </span>
          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-red-400 tracking-tight">
          {urgentCount}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">İvedi işlem gerektirenler</div>
      </button>
    </div>
  );
};
