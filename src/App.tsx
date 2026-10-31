import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentRecord,
  CompanyKey,
  DocumentStatus,
} from './types';
import { COMPANIES, COMPANY_LIST } from './data/companies';
import {
  loadDocuments,
  saveDocuments,
} from './utils/storage';
import {
  SupabaseEvrakRow,
  fetchCompanyEvraklar,
  SUPABASE_COMPANY_TABLES,
} from './utils/supabaseClient';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocumentModal } from './components/DocumentModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { SupabaseTableView } from './components/SupabaseTableView';
import { GeneralReportView } from './components/GeneralReportView';
import { ArchiveListView } from './components/ArchiveListView';
import { fetchAllCompaniesEvraklar, CompanyDataResult } from './utils/supabaseClient';
import { X } from 'lucide-react';

export default function App() {
  // Main local archive state
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => loadDocuments());
  const [selectedCompany, setSelectedCompany] = useState<CompanyKey>('bayburt_ozka');

  // Supabase states
  const [supabaseRecords, setSupabaseRecords] = useState<SupabaseEvrakRow[]>([]);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [activeTableName, setActiveTableName] = useState<string>('');
  const [supabaseDocCounts, setSupabaseDocCounts] = useState<Record<string, number>>({});

  // Genel Rapor states
  const [isGeneralReportOpen, setIsGeneralReportOpen] = useState<boolean>(false);
  const [allCompaniesData, setAllCompaniesData] = useState<CompanyDataResult[]>([]);
  const [isAllCompaniesLoading, setIsAllCompaniesLoading] = useState<boolean>(false);

  // Ödenenler (cekarsiv) & İptal Edilenler (cekiptal) Yeni Sayfası
  const [activeArchiveView, setActiveArchiveView] = useState<'cekarsiv' | 'cekiptal' | null>(null);

  // Şantiye Ortaklık Listesi Tik Kutucukları - Bütün Firmalar PDF Raporu Seçimi
  const [selectedCompaniesForReport, setSelectedCompaniesForReport] = useState<Set<CompanyKey>>(
    () => new Set(COMPANY_LIST.map((c) => c.id))
  );

  const handleToggleCompanyReportSelection = useCallback((companyKey: CompanyKey) => {
    setSelectedCompaniesForReport((prev) => {
      const next = new Set(prev);
      if (next.has(companyKey)) {
        next.delete(companyKey);
      } else {
        next.add(companyKey);
      }
      return next;
    });
  }, []);

  const handleToggleAllReportCompanies = useCallback(() => {
    setSelectedCompaniesForReport((prev) => {
      if (prev.size === COMPANY_LIST.length) {
        return new Set();
      } else {
        return new Set(COMPANY_LIST.map((c) => c.id));
      }
    });
  }, []);

  // Modals & Drawers state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  const showToast = useCallback(
    (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
      setToastMessage({ text, type });
      setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    },
    []
  );

  // Fetch Supabase records for selected company
  const loadSupabaseData = useCallback(async (companyKey: CompanyKey) => {
    setIsSupabaseLoading(true);
    setSupabaseError(null);
    try {
      const res = await fetchCompanyEvraklar(companyKey);
      setSupabaseRecords(res.data);
      setSupabaseError(res.error);
      setActiveTableName(res.activeTableName);
      setSupabaseDocCounts((prev) => ({
        ...prev,
        [companyKey]: res.data.length,
      }));
    } catch (err: any) {
      setSupabaseError(err?.message || 'Supabase verisi çekilirken hata oluştu.');
      setSupabaseRecords([]);
    } finally {
      setIsSupabaseLoading(false);
    }
  }, []);

  // Preload counts for all 5 companies from Supabase
  useEffect(() => {
    const preloadCounts = async () => {
      const keys = Object.keys(SUPABASE_COMPANY_TABLES) as CompanyKey[];
      for (const k of keys) {
        try {
          const res = await fetchCompanyEvraklar(k);
          if (res.data) {
            setSupabaseDocCounts((prev) => ({
              ...prev,
              [k]: res.data.length,
            }));
          }
        } catch {
          // ignore
        }
      }
    };
    preloadCounts();
  }, []);

  // Whenever selected company changes, load its Supabase table
  useEffect(() => {
    loadSupabaseData(selectedCompany);
  }, [selectedCompany, loadSupabaseData]);

  // Persist local archive
  useEffect(() => {
    saveDocuments(documents);
  }, [documents]);

  // Fetch all companies data for Genel Rapor
  const loadAllCompaniesData = useCallback(async () => {
    setIsAllCompaniesLoading(true);
    try {
      const results = await fetchAllCompaniesEvraklar();
      setAllCompaniesData(results);
    } catch (err: any) {
      showToast('Genel rapor verileri alınırken bir hata oluştu.', 'warning');
    } finally {
      setIsAllCompaniesLoading(false);
    }
  }, [showToast]);

  const handleOpenGeneralReport = () => {
    setIsGeneralReportOpen(true);
    loadAllCompaniesData();
  };

  // Handle company selection
  const handleSelectCompany = (company: CompanyKey) => {
    setSelectedCompany(company);
  };

  // Handlers for Add/Edit/Delete/Status in local archive
  const handleSaveDocument = (doc: DocumentRecord) => {
    setDocuments((prev) => {
      const existsIndex = prev.findIndex((d) => d.id === doc.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = doc;
        showToast(`"${doc.docNumber}" numaralı evrak güncellendi.`, 'success');
        return updated;
      } else {
        showToast(`"${doc.docNumber}" numaralı yeni evrak sisteme kaydedildi.`, 'success');
        return [doc, ...prev];
      }
    });
  };

  const handleDeleteDocument = (id: string) => {
    const target = documents.find((d) => d.id === id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (viewingDoc?.id === id) setViewingDoc(null);
    showToast(
      target
        ? `"${target.docNumber}" kaydı silindi.`
        : 'Evrak kaydı silindi.',
      'info'
    );
  };

  const handleStatusChange = (id: string, newStatus: DocumentStatus) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const updated = {
            ...d,
            status: newStatus,
            updatedAt: new Date().toLocaleString('tr-TR'),
          };
          if (viewingDoc?.id === id) {
            setViewingDoc(updated);
          }
          return updated;
        }
        return d;
      })
    );
    showToast(`Evrak durumu "${newStatus}" olarak güncellendi.`, 'success');
  };

  const handleExportCSV = () => {
    if (supabaseRecords.length === 0) {
      showToast('Dışa aktarılacak evrak bulunmamaktadır.', 'warning');
      return;
    }
    const headers = [
      'EVRAK TARİHİ',
      'DÖNEM',
      'EVRAK NUMARASI',
      'FİRMA ÜNVANI',
      'VERGİ NUMARASI',
      'BANKA ADI',
      'İŞİN ADI',
      'TUTARI',
    ];
    const rows = supabaseRecords.map((r) => [
      r.evraktarihi || '',
      r.donem || '',
      r.evraknumarasi || '',
      r.firmaunvani || '',
      r.verginumarasi || '',
      r.bankaadi || '',
      r.isinadi || '',
      r.tutari !== null && r.tutari !== undefined ? String(r.tutari) : '0',
    ]);
    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedCompany}_evrak_listesi_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${supabaseRecords.length} evrak içeren Excel/CSV indirildi.`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const currentCompanyInfo = COMPANIES[selectedCompany];

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 flex flex-col relative font-sans selection:bg-amber-500 selection:text-black">
      {/* Eye-catching animated background with construction blueprint canvas */}
      <AnimatedBackground />

      {/* Top Application Header */}
      <Header
        selectedCompany={selectedCompany}
        onOpenNewDocModal={() => {
          setEditingDoc(null);
          setIsModalOpen(true);
        }}
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        totalDocsCount={
          supabaseDocCounts[selectedCompany] ??
          documents.filter((d) => d.company === selectedCompany).length
        }
        onOpenGeneralReport={handleOpenGeneralReport}
      />

      {/* Main App Layout: Sidebar + Content Area */}
      <div className="flex-1 flex max-w-[1700px] w-full mx-auto relative z-10">
        {/* Left Stacked Ambient Company Buttons */}
        <Sidebar
          selectedCompany={selectedCompany}
          onSelectCompany={handleSelectCompany}
          documents={documents}
          supabaseDocCounts={supabaseDocCounts}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          selectedCompaniesForReport={selectedCompaniesForReport}
          onToggleCompanyReportSelection={handleToggleCompanyReportSelection}
          onToggleAllReportCompanies={handleToggleAllReportCompanies}
        />

        {/* Right Dynamic Content View */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 flex flex-col overflow-x-hidden">
          {/* Active Company Supabase Table View */}
          <SupabaseTableView
            companyKey={selectedCompany}
            records={supabaseRecords}
            isLoading={isSupabaseLoading}
            error={supabaseError}
            activeTableName={activeTableName}
            onRefresh={() => loadSupabaseData(selectedCompany)}
            onRecordAdded={() => loadSupabaseData(selectedCompany)}
            onRecordDeleted={() => loadSupabaseData(selectedCompany)}
            onOpenArchiveView={(type) => setActiveArchiveView(type)}
            selectedCompaniesForReport={selectedCompaniesForReport}
          />
        </main>
      </div>

      {/* ÖDENENLER (cekarsiv) VEYA İPTAL EDİLENLER (cekiptal) YENİ SAYFASI */}
      {activeArchiveView && (
        <ArchiveListView
          type={activeArchiveView}
          onClose={() => setActiveArchiveView(null)}
        />
      )}

      {/* GENEL RAPOR - TÜM ŞİRKETLERİN EVRAK TABLOLARINI ALT ALTA GÖSTEREN SAYFA */}
      {isGeneralReportOpen && (
        <GeneralReportView
          companiesData={allCompaniesData}
          isLoading={isAllCompaniesLoading}
          onRefresh={loadAllCompaniesData}
          onClose={() => setIsGeneralReportOpen(false)}
        />
      )}

      {/* Modal for Creating / Editing Documents (Local Archive) */}
      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDoc(null);
        }}
        onSave={handleSaveDocument}
        editDocument={editingDoc}
        defaultCompany={selectedCompany}
        totalCount={documents.length}
      />

      {/* Modal for Detailed Document Inspection */}
      <DocumentDetailModal
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
        onEdit={(doc) => {
          setEditingDoc(doc);
          setIsModalOpen(true);
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/95 border border-amber-500/40 text-slate-100 shadow-[0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
