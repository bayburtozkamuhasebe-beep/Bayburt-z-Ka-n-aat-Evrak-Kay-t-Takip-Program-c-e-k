import React from 'react';
import { DocumentFilterState, DocumentType, DocumentStatus, PriorityLevel } from '../types';
import {
  Search,
  Filter,
  X,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';

interface FilterBarProps {
  filters: DocumentFilterState;
  onChangeFilter: <K extends keyof DocumentFilterState>(key: K, value: DocumentFilterState[K]) => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
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

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilter,
  onResetFilters,
  totalFilteredCount,
}) => {
  const hasActiveFilters =
    filters.searchTerm !== '' ||
    filters.direction !== 'all' ||
    filters.docType !== 'all' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 mb-4 shadow-lg">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="input-search-docs"
            value={filters.searchTerm}
            onChange={(e) => onChangeFilter('searchTerm', e.target.value)}
            placeholder="Evrak No, Konu, Gönderen / Muhatap, Referans veya Açıklama ara..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-950/70 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() => onChangeFilter('searchTerm', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Filters & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direction Pill Selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => onChangeFilter('direction', 'all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filters.direction === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tümü
            </button>
            <button
              type="button"
              onClick={() => onChangeFilter('direction', 'Gelen')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filters.direction === 'Gelen'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-blue-400'
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              Gelen
            </button>
            <button
              type="button"
              onClick={() => onChangeFilter('direction', 'Giden')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filters.direction === 'Giden'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              Giden
            </button>
          </div>

          {/* Doc Type Dropdown */}
          <div className="relative">
            <select
              id="select-doc-type"
              value={filters.docType}
              onChange={(e) => onChangeFilter('docType', e.target.value)}
              className="appearance-none bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 pr-8 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="all">Tüm Evrak Türleri</option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              id="select-status"
              value={filters.status}
              onChange={(e) => onChangeFilter('status', e.target.value)}
              className="appearance-none bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 pr-8 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="all">Tüm Durumlar</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <select
              id="select-priority"
              value={filters.priority}
              onChange={(e) => onChangeFilter('priority', e.target.value)}
              className="appearance-none bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 rounded-xl px-3 py-2 pr-8 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="all">Tüm Öncelikler</option>
              <option value="Acil">Acil</option>
              <option value="Yüksek">Yüksek</option>
              <option value="Normal">Normal</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              id="btn-reset-filters"
              onClick={onResetFilters}
              title="Filtreleri Sıfırla"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Temizle</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter summary result count */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Gösterilen:</span>
          <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {totalFilteredCount} Evrak Bulundu
          </span>
        </div>
        {hasActiveFilters && (
          <span className="text-[11px] text-amber-300/80 font-medium">
            (Filtreler Aktif)
          </span>
        )}
      </div>
    </div>
  );
};
