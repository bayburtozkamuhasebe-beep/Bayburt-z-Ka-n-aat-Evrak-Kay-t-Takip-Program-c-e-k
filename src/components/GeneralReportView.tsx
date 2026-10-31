import React, { useState, useMemo } from 'react';
import { CompanyDataResult, moveCompanyEvraklarToTarget } from '../utils/supabaseClient';
import { CompanyKey } from '../types';
import { COMPANIES } from '../data/companies';
import { checkArchiveDocument, ArchiveCheckResult } from '../utils/archiveStorage';
import { ArchiveDocModal } from './ArchiveDocModal';
import { ArchiveListView } from './ArchiveListView';
import { CompanyLogo } from './CompanyLogo';
import { OZKA_LOGO_DATA_URL } from '../utils/logoAssets';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  ExternalLink,
  ArrowLeft,
  Search,
  Calendar,
  Building2,
  HardHat,
  Hash,
  CreditCard,
  Briefcase,
  Layers,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  PieChart,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Archive,
  Ban,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const AYLAR = [
  'OCAK',
  'ŞUBAT',
  'MART',
  'NİSAN',
  'MAYIS',
  'HAZİRAN',
  'TEMMUZ',
  'AĞUSTOS',
  'EYLÜL',
  'EKİM',
  'KASIM',
  'ARALIK',
];

interface GeneralReportViewProps {
  companiesData: CompanyDataResult[];
  isLoading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

export const GeneralReportView: React.FC<GeneralReportViewProps> = ({
  companiesData,
  isLoading,
  onRefresh,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Tik kutucukları ile satır seçimi ve tümünü seç yönetimi
  const [selectedReportRowKeys, setSelectedReportRowKeys] = useState<Set<string>>(new Set());

  // Şirket tablolarının "Devamını Göster" sınırları
  const DEFAULT_COMPANY_ROW_LIMIT = 10;
  const [companyTableLimits, setCompanyTableLimits] = useState<Record<string, number>>({});

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

  const getCompanyLimit = (compKey: string): number => {
    return companyTableLimits[compKey] || DEFAULT_COMPANY_ROW_LIMIT;
  };

  const setCompanyLimit = (compKey: string, newLimit: number) => {
    setCompanyTableLimits((prev) => ({
      ...prev,
      [compKey]: newLimit,
    }));
  };

  // Evrak no tıklandığında ARSIVCEKLER kontrolü
  const handleEvrakNoClick = async (evrakNo: string, record?: any) => {
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
            tarih: record.evrak_tarihi || record.evraktarihi,
            donem: record.donem,
            firmaUnvani: record.firma_unvani || record.firmaadi,
            isinAdi: record.isin_adi || record.isadi,
            bankaAdi: record.banka_adi || record.banka,
            tutar: formatCurrency(record.tutari || record.tutar),
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

  // Taşıma Durumu (Arşive Gönder / İptal Et)
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [movingTarget, setMovingTarget] = useState<'cekarsiv' | 'cekiptal' | null>(null);
  const [activeArchiveView, setActiveArchiveView] = useState<'cekarsiv' | 'cekiptal' | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    type: 'danger' | 'primary';
    confirmLabel: string;
    details?: { label: string; value: string }[];
    onConfirm: () => void;
  } | null>(null);
  const [moveMessage, setMoveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Genel raporda seçilen kayıtları şirket bazında topla ve cekarsiv / cekiptal tablosuna taşı
  const handleMoveSelectedReportRecords = async (target: 'cekarsiv' | 'cekiptal') => {
    if (selectedReportRowKeys.size === 0) {
      setMoveMessage({
        text: 'Lütfen taşımak istediğiniz en az bir evrak kaydı seçiniz.',
        type: 'error',
      });
      return;
    }

    // Seçilen kayıtları şirket bazında grupla
    const recordsByCompany: Record<string, any[]> = {};

    companiesData.forEach((comp) => {
      const selectedForComp = comp.records.filter((r, idx) => {
        const key = `${comp.companyKey}_${r.id || r.evrak_numarasi || idx}`;
        return selectedReportRowKeys.has(key);
      });

      if (selectedForComp.length > 0) {
        recordsByCompany[comp.companyKey] = selectedForComp;
      }
    });

    const totalSelected = Object.values(recordsByCompany).reduce((acc, curr) => acc + curr.length, 0);
    if (totalSelected === 0) {
      setMoveMessage({
        text: 'Seçilen evraklar bulunamadı.',
        type: 'error',
      });
      return;
    }

    const targetLabel = target === 'cekarsiv' ? 'Çek Arşiv (cekarsiv)' : 'Çek İptal (cekiptal)';

    setConfirmDialog({
      title: target === 'cekarsiv' ? 'Toplu Arşive Gönderme Onayı' : 'Toplu İptal Etme Onayı',
      message: `Genel Raporda seçilen toplam ${totalSelected} adet evrak kaydını "${targetLabel}" tablosuna taşımak ve ilgili şirketlerin aktif tablolarından silmek istediğinizden emin misiniz?`,
      type: target === 'cekarsiv' ? 'primary' : 'danger',
      confirmLabel: target === 'cekarsiv' ? 'Evet, Arşive Taşı' : 'Evet, İptal Tablosuna Taşı',
      details: [
        { label: 'İşlem', value: target === 'cekarsiv' ? 'Arşive Taşıma' : 'İptal Etme' },
        { label: 'Hedef Tablo', value: target },
        { label: 'Toplam Evrak', value: `${totalSelected} Adet` },
        { label: 'Etkilenen Şirket Sayısı', value: `${Object.keys(recordsByCompany).length} Şirket` },
      ],
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsMoving(true);
        setMovingTarget(target);

        try {
          let totalMoved = 0;
          const errors: string[] = [];

          for (const [cKey, recs] of Object.entries(recordsByCompany)) {
            const res = await moveCompanyEvraklarToTarget(cKey, target, recs);
            if (res.success) {
              totalMoved += res.movedCount;
            } else {
              errors.push(`${cKey}: ${res.error || 'Bilinmeyen hata'}`);
            }
          }

          if (totalMoved > 0) {
            setMoveMessage({
              text: `İşlem Başarılı! Toplam ${totalMoved} adet kayıt "${targetLabel}" tablosuna taşındı.`,
              type: 'success',
            });
            setSelectedReportRowKeys(new Set());
            onRefresh();
          }

          if (errors.length > 0) {
            setMoveMessage({
              text: `Bazı tablolarda aktarım uyarısı: ${errors.join(', ')}`,
              type: 'error',
            });
          }
        } catch (err: any) {
          setMoveMessage({
            text: `Hata: ${err.message || 'Taşıma gerçekleştirilemedi.'}`,
            type: 'error',
          });
        } finally {
          setIsMoving(false);
          setMovingTarget(null);
          setTimeout(() => setMoveMessage(null), 8000);
        }
      },
    });
  };


  // Para formatlayıcı
  const formatCurrency = (val: number | string | null | undefined): string => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
    if (isNaN(num)) return '0,00 ₺';
    return `${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
  };

  // Ay indexini bulma
  const getRecordMonthIndex = (r: any): number => {
    const dStr = (r.donem || '').toUpperCase().trim();
    for (let i = 0; i < AYLAR.length; i++) {
      if (dStr.includes(AYLAR[i])) return i;
    }
    const tStr = r.evrak_tarihi || r.evraktarihi || '';
    if (tStr) {
      if (tStr.includes('.')) {
        const parts = tStr.split('.');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (!isNaN(m) && m >= 1 && m <= 12) return m - 1;
        }
      } else if (tStr.includes('-')) {
        const parts = tStr.split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (!isNaN(m) && m >= 1 && m <= 12) return m - 1;
        }
      }
    }
    return 99;
  };

  // 4 Konsolide Şirket (Şenbay-Özka Ortaklığı hariç)
  const activeCompanies = useMemo(() => {
    return (companiesData || []).filter((comp) => comp && comp.companyKey !== 'senbay_ozka');
  }, [companiesData]);

  // Filtrelenmiş şirket verileri (Şenbay-Özka Ortaklığı rapordan çıkarılmıştır)
  const filteredCompanyData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return activeCompanies.map((comp) => {
      let recs = Array.isArray(comp.records) ? [...comp.records] : [];

      // Arama filtresi
      if (term) {
        recs = recs.filter((r) => {
          return (
            (r.evrak_numarasi || '').toLowerCase().includes(term) ||
            (r.firma_unvani || '').toLowerCase().includes(term) ||
            (r.isin_adi || '').toLowerCase().includes(term) ||
            (r.banka_adi || '').toLowerCase().includes(term) ||
            (r.donem || '').toLowerCase().includes(term) ||
            (r.aciklama || '').toLowerCase().includes(term)
          );
        });
      }

      // Dönem filtresi
      if (selectedMonth !== 'all') {
        const targetIdx = AYLAR.indexOf(selectedMonth);
        recs = recs.filter((r) => getRecordMonthIndex(r) === targetIdx);
      }

      // Ay önceliğine göre sıralama (Ocak -> Aralık)
      recs.sort((a, b) => {
        const mA = getRecordMonthIndex(a);
        const mB = getRecordMonthIndex(b);
        if (mA !== mB) return mA - mB;
        return (b.evrak_tarihi || '').localeCompare(a.evrak_tarihi || '');
      });

      const totalAmount = recs.reduce((sum, r) => {
        const v = typeof r.tutari === 'number' ? r.tutari : parseFloat(String(r.tutari || 0));
        return sum + (isNaN(v) ? 0 : v);
      }, 0);

      return {
        ...comp,
        filteredRecords: recs,
        totalAmount,
      };
    });
  }, [activeCompanies, searchTerm, selectedMonth]);

  // Ay Ay Konsolide Dağılım İstatistikleri (Tüm 12 ay için hesaplanır)
  const monthlyStats = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const months = AYLAR.map((monthName, monthIdx) => {
      let monthDocs = 0;
      let monthAmount = 0;
      const companyMap: Record<string, { count: number; amount: number }> = {};

      activeCompanies.forEach((comp) => {
        let recs = Array.isArray(comp.records) ? comp.records : [];
        if (term) {
          recs = recs.filter((r) => {
            return (
              (r.evrak_numarasi || '').toLowerCase().includes(term) ||
              (r.firma_unvani || '').toLowerCase().includes(term) ||
              (r.isin_adi || '').toLowerCase().includes(term) ||
              (r.banka_adi || '').toLowerCase().includes(term) ||
              (r.donem || '').toLowerCase().includes(term) ||
              (r.aciklama || '').toLowerCase().includes(term)
            );
          });
        }

        const mRecs = recs.filter((r) => getRecordMonthIndex(r) === monthIdx);
        const sum = mRecs.reduce((acc, r) => {
          const v = typeof r.tutari === 'number' ? r.tutari : parseFloat(String(r.tutari || 0));
          return acc + (isNaN(v) ? 0 : v);
        }, 0);

        companyMap[comp.companyKey] = {
          count: mRecs.length,
          amount: sum,
        };

        monthDocs += mRecs.length;
        monthAmount += sum;
      });

      return {
        monthName,
        monthIndex: monthIdx,
        companies: companyMap,
        totalDocs: monthDocs,
        totalAmount: monthAmount,
        percentage: 0,
      };
    });

    const totalGrandAmount = months.reduce((acc, m) => acc + m.totalAmount, 0);
    const totalGrandDocs = months.reduce((acc, m) => acc + m.totalDocs, 0);

    months.forEach((m) => {
      m.percentage = totalGrandAmount > 0 ? (m.totalAmount / totalGrandAmount) * 100 : 0;
    });

    // Her şirketin 12 aylık kümülatif toplamı
    const companyTotals: Record<string, { count: number; amount: number }> = {};
    activeCompanies.forEach((comp) => {
      let cCount = 0;
      let cAmount = 0;
      months.forEach((m) => {
        const cStat = m.companies[comp.companyKey];
        if (cStat) {
          cCount += cStat.count;
          cAmount += cStat.amount;
        }
      });
      companyTotals[comp.companyKey] = { count: cCount, amount: cAmount };
    });

    return {
      months,
      totalGrandAmount,
      totalGrandDocs,
      companyTotals,
      companyGrandTotals: companyTotals,
    };
  }, [activeCompanies, searchTerm]);

  // Konsolide Genel İstatistikler
  const grandStats = useMemo(() => {
    let totalDocs = 0;
    let totalAmount = 0;
    filteredCompanyData.forEach((c) => {
      totalDocs += c.filteredRecords.length;
      totalAmount += c.totalAmount;
    });
    return { totalDocs, totalAmount };
  }, [filteredCompanyData]);

  // Yeni Sekmede Açma & PDF / Baskı Raporu Oluşturma (Tek Sayfada Kesintisiz Akış)
  const handleOpenReportWindow = (autoPrint: boolean = false) => {
    const newWin = window.open('', '_blank');
    if (!newWin) {
      alert('Tarayıcınız yeni pencere açılmasını engelledi. Lütfen açılır pencerelere (popup) izin veriniz.');
      return;
    }

    const dateStr = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });

    const activeFilterText = selectedMonth === 'all' ? 'Tüm Dönemler' : `${selectedMonth} Dönemi`;

    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>BAYBURT ÖZ-KA İNŞAAT - KONSOLİDE GENEL EVRAK RAPORU (TEK SAYFA)</title>
  <style>
    @page { 
      size: A4 landscape; 
      margin: 8mm; 
    }
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      font-size: 10px;
      line-height: 1.35;
    }
    .no-print { 
      display: flex; 
      gap: 10px; 
      margin-bottom: 16px; 
      background: #ffffff;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .btn {
      padding: 7px 14px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-weight: 700;
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-pdf { background: #dc2626; color: white; }
    .btn-pdf:hover { background: #b91c1c; }
    .btn-print { background: #2563eb; color: white; }
    .btn-print:hover { background: #1d4ed8; }
    .btn-close { background: #475569; color: white; }
    .btn-close:hover { background: #334155; }
    
    @media print {
      .no-print { display: none !important; }
      body { background: white; padding: 0; }
      .company-section { margin-bottom: 14px !important; break-inside: auto; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }

    .header-box {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 5px solid #3b82f6;
    }
    .title { font-size: 15px; font-weight: 800; letter-spacing: 0.5px; }
    .subtitle { font-size: 10.5px; color: #94a3b8; margin-top: 3px; }

    /* Üst İcmal Özeti (Kompakt Tek Blok) */
    .summary-bar {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .summary-item {
      display: flex;
      flex-direction: column;
    }
    .summary-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .summary-val {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }

    .company-section {
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .company-header {
      background: #f1f5f9;
      border-bottom: 2px solid #2563eb;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .company-title { font-size: 12px; font-weight: 800; color: #0f172a; }
    .company-meta { font-size: 10px; font-weight: 700; color: #1e40af; }
    
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    th {
      background: #e2e8f0;
      color: #1e293b;
      text-align: left;
      padding: 6px 8px;
      font-weight: 700;
      border-bottom: 1px solid #cbd5e1;
      font-size: 9px;
    }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:nth-child(even) td { background: #fafbfc; }
    .amount { text-align: right; font-weight: 700; color: #0f172a; font-family: monospace; }
    .center { text-align: center; }

    .month-header-row td {
      background: #eff6ff !important;
      font-weight: 800;
      color: #1e40af;
      padding: 5px 8px;
      border-top: 1px solid #bfdbfe;
      border-bottom: 1px solid #bfdbfe;
      font-size: 9.5px;
    }
    .total-row td {
      background: #f8fafc !important;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #94a3b8;
      padding: 8px;
    }

    .grand-total-box {
      margin-top: 16px;
      padding: 12px 18px;
      background: #0f172a;
      color: white;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn btn-pdf" onclick="window.print()">📄 PDF OLARAK KAYDET / YAZDIR</button>
    <button class="btn btn-close" onclick="window.close()">✖ PENCEREYİ KAPAT</button>
    <span style="font-size: 11px; color: #64748b; margin-left: auto; align-self: center;">
      (Tüm ${filteredCompanyData.length} Şirket Tablosu Tek Sayfada / Kesintisiz Akış Formatındadır)
    </span>
  </div>

  <div class="header-box">
    <div style="display: flex; align-items: center; gap: 14px;">
      <div style="width: 48px; height: 56px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: white; border-radius: 8px; padding: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
        <img src="${OZKA_LOGO_DATA_URL}" alt="Bayburt Öz-Ka Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
      <div>
        <div class="title">BAYBURT ÖZ-KA İNŞAAT - KONSOLİDE GENEL EVRAK RAPORU</div>
        <div class="subtitle">${filteredCompanyData.length} Şirketin Tüm Evrak Kayıtları Tek Sayfa / Konsolide Akış Görünümü</div>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold; font-size: 11px;">Tarih: ${dateStr}</div>
      <div style="font-size: 10px; color: #94a3b8;">Filtre: ${activeFilterText}</div>
    </div>
  </div>

  <div class="summary-bar">
    <div class="summary-item">
      <span class="summary-label">Dahil Şirket Sayısı</span>
      <span class="summary-val">${filteredCompanyData.length} Şirket Tablosu</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Toplam Evrak Adedi</span>
      <span class="summary-val" style="color: #2563eb;">${grandStats.totalDocs} Adet Evrak</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Seçili Dönem</span>
      <span class="summary-val">${activeFilterText}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Konsolide Büyük Toplam Tutar</span>
      <span class="summary-val" style="color: #16a34a;">${grandStats.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
    </div>
  </div>

  <!-- AY AY KONSOLİDE DAĞILIM İCMALİ TABLOSU -->
  <div class="company-section" style="margin-bottom: 20px;">
    <div class="company-header" style="background: #e0f2fe; border-bottom: 2px solid #0284c7;">
      <div>
        <div class="company-title" style="color: #0369a1;">📅 AY AY KONSOLİDE DAĞILIM İCMALİ (12 AY DÖKÜMÜ)</div>
        <div style="font-size: 9px; color: #0284c7;">Tüm 4 Şirketin Aylara Göre Evrak Sayısı ve Tutar Dağılım Matrisi</div>
      </div>
      <div class="company-meta" style="color: #0369a1;">
        Kümülatif Toplam: <strong>${monthlyStats.totalGrandAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</strong>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 85px;">Dönem / Ay</th>
          ${activeCompanies.map(c => `
            <th class="amount">${(c.config?.shortName || COMPANIES[c.companyKey as CompanyKey]?.shortName || c.companyKey).toUpperCase()} (TL)</th>
          `).join('')}
          <th style="width: 75px;" class="center">Toplam Evrak</th>
          <th style="width: 110px;" class="amount">Aylık Toplam (TL)</th>
          <th style="width: 55px;" class="center">Pay (%)</th>
        </tr>
      </thead>
      <tbody>
        ${monthlyStats.months.map((m) => {
          return `
            <tr>
              <td style="font-weight: 700; color: #1e293b;">${m.monthName}</td>
              ${activeCompanies.map(c => {
                const stat = m.companies[c.companyKey];
                const amt = stat ? stat.amount : 0;
                return `<td class="amount" style="${amt === 0 ? 'color: #94a3b8;' : ''}">${amt > 0 ? amt.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺' : '-'}</td>`;
              }).join('')}
              <td class="center" style="font-weight: 600;">${m.totalDocs > 0 ? m.totalDocs + ' Adet' : '-'}</td>
              <td class="amount" style="color: #1e3a8a; font-weight: 800;">${m.totalAmount > 0 ? m.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺' : '-'}</td>
              <td class="center" style="font-weight: 700; color: #475569;">${m.percentage > 0 ? '%' + m.percentage.toFixed(1) : '-'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td style="font-weight: 800;">KONSOLİDE TOPLAM:</td>
          ${activeCompanies.map(c => {
            const tot = monthlyStats?.companyTotals?.[c.companyKey]?.amount ?? 0;
            return `<td class="amount" style="font-weight: 800; color: #0f172a;">${tot.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</td>`;
          }).join('')}
          <td class="center" style="font-weight: 800;">${monthlyStats?.totalGrandDocs ?? 0} Adet</td>
          <td class="amount" style="font-size: 10.5px; color: #16a34a; font-weight: 800;">${(monthlyStats?.totalGrandAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</td>
          <td class="center" style="font-weight: 800; color: #16a34a;">%100.0</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${filteredCompanyData.map((comp, compIdx) => {
    const compInfo = COMPANIES[comp.companyKey as CompanyKey];
    const compTitle = compInfo?.name || comp.config?.companyTitle || comp.companyKey;
    const records = comp.filteredRecords;

    return `
    <div class="company-section" id="table-${comp.companyKey}">
      <div class="company-header">
        <div>
          <div class="company-title">${compIdx + 1}. ${compTitle}</div>
          <div style="font-size: 9px; color: #64748b;">${compInfo?.description || ''}</div>
        </div>
        <div class="company-meta">
          Evrak Sayısı: <strong>${records.length} Adet</strong> | Şirket Toplamı: <strong>${comp.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</strong>
        </div>
      </div>

      ${records.length === 0 ? `
        <div style="padding: 12px; text-align: center; color: #94a3b8; font-size: 9.5px;">Bu şirkete ait evrak kaydı bulunamadı.</div>
      ` : `
        <table>
          <thead>
            <tr>
              <th style="width: 30px;" class="center">#</th>
              <th style="width: 70px;">Tarih</th>
              <th style="width: 60px;">Dönem</th>
              <th style="width: 100px;">Evrak No</th>
              <th>Firma Ünvanı</th>
              <th style="width: 95px;">Banka Adı</th>
              <th>İşin Adı / Proje</th>
              <th style="width: 100px;" class="amount">Tutar (TL)</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r, rIdx) => {
              const currentMonth = getRecordMonthIndex(r);
              const prevMonth = rIdx > 0 ? getRecordMonthIndex(records[rIdx - 1]) : -1;
              const isNewMonth = selectedMonth === 'all' && (rIdx === 0 || currentMonth !== prevMonth);
              const monthName = currentMonth < 12 ? AYLAR[currentMonth] : (r.donem || 'DİĞER');

              let monthBannerHtml = '';
              if (isNewMonth) {
                const monthRecs = records.filter(item => getRecordMonthIndex(item) === currentMonth);
                const monthSum = monthRecs.reduce((acc, curr) => {
                  const val = typeof curr.tutari === 'number' ? curr.tutari : parseFloat(String(curr.tutari || 0));
                  return acc + (isNaN(val) ? 0 : val);
                }, 0);
                monthBannerHtml = `
                  <tr class="month-header-row">
                    <td colspan="9">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>&bull; ${monthName} DÖNEMİ (${monthRecs.length} ADET EVRAK)</span>
                        <span>Dönem Toplamı: <strong>${monthSum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</strong></span>
                      </div>
                    </td>
                  </tr>
                `;
              }

              const tutarNum = typeof r.tutari === 'number' ? r.tutari : parseFloat(String(r.tutari || 0));
              const tutarStr = isNaN(tutarNum) ? '0,00' : tutarNum.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

              return `
                ${monthBannerHtml}
                <tr>
                  <td class="center" style="color: #64748b;">${rIdx + 1}</td>
                  <td>${r.evrak_tarihi || '-'}</td>
                  <td>${r.donem || '-'}</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1e3a8a;">${r.evrak_numarasi || '-'}</td>
                  <td style="font-weight: 600;">${r.firma_unvani || '-'}</td>
                  <td>${r.banka_adi || '-'}</td>
                  <td>${r.isin_adi || '-'}</td>
                  <td class="amount">${tutarStr} ₺</td>
                  <td style="color: #64748b; font-size: 8.5px;">${r.aciklama || '-'}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="7" style="text-align: right; font-weight: 800;">
                ${compTitle} - TOPLAM (${records.length} ADET EVRAK):
              </td>
              <td class="amount" style="font-size: 11px; color: #1e3a8a;">
                ${comp.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `}
    </div>
    `;
  }).join('')}

  <div class="grand-total-box">
    <div>
      <div style="font-size: 12px; font-weight: bold;">KONSOLİDE GENEL BÜYÜK TOPLAM</div>
      <div style="font-size: 10px; color: #94a3b8;">${filteredCompanyData.length} Şirketin Tüm Evraklarının Birleşik Toplamı (${grandStats.totalDocs} Adet Evrak)</div>
    </div>
    <div style="font-size: 18px; font-weight: 800; color: #4ade80; font-family: monospace;">
      ${grandStats.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
    </div>
  </div>

  ${autoPrint ? `
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
  ` : ''}
</body>
</html>`;

    newWin.document.open();
    newWin.document.write(htmlContent);
    newWin.document.close();
  };

  // Tüm Şirketleri TEK SAYFADA (.xlsx) Konsolide Olarak İndirme
  const handleExportAllToExcel = () => {
    const wb = XLSX.utils.book_new();

    // ==========================================
    // 1. TEK SAYFA KONSOLİDE RAPOR ÇALIŞMA SAYFASI
    // Bütün şirketlerin tabloları alt alta TEK BİR sayfada!
    // ==========================================
    const singleSheetData: any[][] = [];

    // Ana Başlık ve Filtre Bilgileri
    singleSheetData.push(['BAYBURT ÖZ-KA İNŞAAT - KONSOLİDE GENEL EVRAK RAPORU (TÜM ŞİRKETLER TEK SAYFA DÖKÜMÜ)']);
    singleSheetData.push([
      `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Dönem Filtresi: ${
        selectedMonth === 'all' ? 'Tüm Dönemler' : selectedMonth + ' Dönemi'
      } | Toplam Evrak: ${grandStats.totalDocs} Adet | Konsolide Büyük Toplam: ${grandStats.totalAmount.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} TL`
    ]);
    singleSheetData.push([]); // Boş satır

    // ÜST İCMAL DAĞILIM TABLOSU
    singleSheetData.push(['GENEL ŞİRKET DAĞILIM İCMALİ']);
    singleSheetData.push(['S.NO', 'ŞİRKET ÜNVANI', 'TABLO ADI', 'EVRAK ADEDİ', 'TOPLAM TUTAR (TL)', 'PAY (%)']);

    filteredCompanyData.forEach((c, idx) => {
      const compInfo = COMPANIES[c.companyKey as CompanyKey];
      const name = compInfo?.name || c.config?.companyTitle || c.companyKey;
      const count = c.filteredRecords.length;
      const total = c.totalAmount;
      const pct = grandStats.totalAmount > 0 ? (total / grandStats.totalAmount) * 100 : 0;
      singleSheetData.push([
        idx + 1,
        name,
        c.activeTableName || c.config?.tableName || c.companyKey,
        count,
        total,
        `${pct.toFixed(1)}%`,
      ]);
    });

    singleSheetData.push([
      '',
      'KONSOLİDE GENEL İCMAL TOPLAMI:',
      '',
      grandStats.totalDocs,
      grandStats.totalAmount,
      '100.0%',
    ]);
    singleSheetData.push([]);
    singleSheetData.push([]);

    // AY AY KONSOLİDE DAĞILIM İCMALİ (12 AY DÖKÜMÜ)
    singleSheetData.push(['AY AY KONSOLİDE DAĞILIM İCMALİ (12 AY DÖKÜMÜ)']);
    const monthlyExcelHeaders = [
      'S.NO',
      'DÖNEM / AY',
      ...activeCompanies.map((c) => (c.config?.shortName || COMPANIES[c.companyKey as CompanyKey]?.shortName || c.companyKey).toUpperCase() + ' (TL)'),
      'TOPLAM EVRAK ADEDİ',
      'AYLIK TOPLAM TUTAR (TL)',
      'PAY (%)',
    ];
    singleSheetData.push(monthlyExcelHeaders);

    monthlyStats.months.forEach((m, mIdx) => {
      singleSheetData.push([
        mIdx + 1,
        m.monthName,
        ...activeCompanies.map((c) => {
          const stat = m.companies[c.companyKey];
          return stat ? stat.amount : 0;
        }),
        m.totalDocs,
        m.totalAmount,
        `${m.percentage.toFixed(1)}%`,
      ]);
    });

    singleSheetData.push([
      '',
      'KONSOLİDE AYLIK GENEL TOPLAM:',
      ...activeCompanies.map((c) => monthlyStats?.companyTotals?.[c.companyKey]?.amount ?? 0),
      monthlyStats?.totalGrandDocs ?? 0,
      monthlyStats?.totalGrandAmount ?? 0,
      '100.0%',
    ]);
    singleSheetData.push([]);
    singleSheetData.push([]);

    // TÜM ŞİRKETLERİN DETAYLI EVRAK LİSTELERİ (ALT ALTA AYNI SAYFADA)
    singleSheetData.push(['DETAYLI EVRAK LİSTELERİ (KONSOLİDE ŞİRKETLER ALT ALTA)']);
    singleSheetData.push([]);

    filteredCompanyData.forEach((c, compIdx) => {
      const compInfo = COMPANIES[c.companyKey as CompanyKey];
      const compTitle = compInfo?.name || c.config?.companyTitle || c.companyKey;

      // Şirket Başlık Şeridi
      singleSheetData.push([
        `▶ ${compIdx + 1}. ${compTitle.toUpperCase()} (${c.filteredRecords.length} Adet Evrak | Toplam: ${c.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL)`
      ]);

      // Tablo Sütun Başlıkları (Vergi Numarası YOK!)
      singleSheetData.push([
        'S.NO',
        'EVRAK TARİHİ',
        'DÖNEM',
        'EVRAK NUMARASI',
        'FİRMA ÜNVANI',
        'BANKA ADI',
        'İŞİN ADI / PROJE',
        'TUTAR (TL)',
        'AÇIKLAMA',
      ]);

      if (c.filteredRecords.length === 0) {
        singleSheetData.push(['-', '-', '-', '-', 'Bu şirkete ait evrak kaydı bulunamadı.', '-', '-', 0, '-']);
      } else {
        c.filteredRecords.forEach((r, rIdx) => {
          const tutarNum = typeof r.tutari === 'number' ? r.tutari : parseFloat(String(r.tutari || 0));
          singleSheetData.push([
            rIdx + 1,
            r.evrak_tarihi || '',
            r.donem || '',
            r.evrak_numarasi || '',
            r.firma_unvani || '',
            r.banka_adi || '',
            r.isin_adi || '',
            isNaN(tutarNum) ? 0 : tutarNum,
            r.aciklama || '',
          ]);
        });
      }

      // Şirket Alt Toplamı
      singleSheetData.push([
        '',
        '',
        '',
        '',
        '',
        '',
        `${compTitle} TOPLAMI (${c.filteredRecords.length} Adet):`,
        c.totalAmount,
        '',
      ]);
      singleSheetData.push([]); // Boşluk
      singleSheetData.push([]); // Boşluk
    });

    // En Altta Konsolide Büyük Toplam
    singleSheetData.push([
      '',
      '',
      '',
      '',
      '',
      '',
      `★ KONSOLİDE GENEL BÜYÜK TOPLAM (${grandStats.totalDocs} Adet Evrak):`,
      grandStats.totalAmount,
      '',
    ]);

    const wsSingle = XLSX.utils.aoa_to_sheet(singleSheetData);
    wsSingle['!cols'] = [
      { wch: 8 },  // S.NO
      { wch: 15 }, // EVRAK TARİHİ
      { wch: 14 }, // DÖNEM
      { wch: 24 }, // EVRAK NUMARASI
      { wch: 40 }, // FİRMA ÜNVANI
      { wch: 22 }, // BANKA ADI
      { wch: 36 }, // İŞİN ADI / PROJE
      { wch: 20 }, // TUTAR
      { wch: 32 }, // AÇIKLAMA
    ];

    // Birincil çalışma sayfası olarak Tek Sayfayı ekle
    XLSX.utils.book_append_sheet(wb, wsSingle, 'Konsolide Rapor (Tek Sayfa)');

    // 2. Ayrıca ayrı sekmelerde isteyenler için her şirketin ayrı sayfası
    filteredCompanyData.forEach((c) => {
      const compInfo = COMPANIES[c.companyKey as CompanyKey];
      const sheetName = (compInfo?.shortName || c.config?.shortName || c.companyKey).slice(0, 31);

      const sheetData: any[][] = [
        [`${compInfo?.name || c.config?.companyTitle} - EVRAK LİSTESİ`],
        [`Dönem Filtresi: ${selectedMonth === 'all' ? 'Tüm Dönemler' : selectedMonth}`],
        [],
        [
          'S.NO',
          'EVRAK TARİHİ',
          'DÖNEM',
          'EVRAK NO',
          'FİRMA ÜNVANI',
          'BANKA ADI',
          'İŞİN ADI / PROJE',
          'TUTAR (TL)',
          'AÇIKLAMA',
        ],
      ];

      c.filteredRecords.forEach((r, idx) => {
        const tutarNum = typeof r.tutari === 'number' ? r.tutari : parseFloat(String(r.tutari || 0));
        sheetData.push([
          idx + 1,
          r.evrak_tarihi || '',
          r.donem || '',
          r.evrak_numarasi || '',
          r.firma_unvani || '',
          r.banka_adi || '',
          r.isin_adi || '',
          isNaN(tutarNum) ? 0 : tutarNum,
          r.aciklama || '',
        ]);
      });

      sheetData.push([]);
      sheetData.push([
        '',
        '',
        '',
        '',
        '',
        '',
        `TOPLAM (${c.filteredRecords.length} Adet):`,
        c.totalAmount,
        '',
      ]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 14 },
        { wch: 20 },
        { wch: 36 },
        { wch: 20 },
        { wch: 30 },
        { wch: 18 },
        { wch: 25 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const fileName = `Bayburt_Ozka_Konsolide_Tek_Sayfa_Genel_Rapor_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060a14] text-slate-100 flex flex-col overflow-hidden">
      {/* ÜST BAŞLIK & İŞLEM KONTROL BARI */}
      <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-blue-500/30 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Geri Dön</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>KONSOLİDE GENEL EVRAK RAPORU</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold hidden sm:inline-block">
                  5 Şirket Tablosu
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Bütün şirketlerin evrak kayıt tablolarının alt alta konsolide dökümü
              </p>
            </div>
          </div>
        </div>

        {/* Buton Kontrolleri */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Yenile */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Verileri Yenile"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* PDF Raporu İndir (Tek Sayfa / Yazdır) */}
          <button
            type="button"
            onClick={() => handleOpenReportWindow(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border border-rose-400/40 shadow-md transition-all cursor-pointer"
            title="Tüm tabloları tek sayfada / kesintisiz akışla PDF olarak kaydet veya yazdır"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Raporu (Tek Sayfa)</span>
          </button>

          {/* TİK İLE SEÇİM YAPILDIĞINDA EXCEL İNDİR SOLUNDA ÇIKAN BUTONLAR */}
          {selectedReportRowKeys.size > 0 && (
            <>
              {/* ARŞİVE GÖNDER BUTONU */}
              <button
                type="button"
                id="btn-report-move-to-cekarsiv"
                onClick={() => handleMoveSelectedReportRecords('cekarsiv')}
                disabled={isMoving}
                title={`Seçilen ${selectedReportRowKeys.size} evrak kaydını cekarsiv tablosuna taşı`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border border-amber-400/40 shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed animate-in fade-in"
              >
                {isMoving && movingTarget === 'cekarsiv' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Archive className="w-3.5 h-3.5 text-amber-200" />
                )}
                <span>Arşive Gönder ({selectedReportRowKeys.size})</span>
              </button>

              {/* İPTAL ET BUTONU */}
              <button
                type="button"
                id="btn-report-move-to-cekiptal"
                onClick={() => handleMoveSelectedReportRecords('cekiptal')}
                disabled={isMoving}
                title={`Seçilen ${selectedReportRowKeys.size} evrak kaydını cekiptal tablosuna taşı`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 via-rose-700 to-red-700 hover:from-red-500 hover:to-rose-600 border border-rose-400/40 shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed animate-in fade-in"
              >
                {isMoving && movingTarget === 'cekiptal' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Ban className="w-3.5 h-3.5 text-rose-200" />
                )}
                <span>İptal Et ({selectedReportRowKeys.size})</span>
              </button>
            </>
          )}

          {/* Excel İndir (Tek Sayfa) */}
          <button
            type="button"
            onClick={handleExportAllToExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 border border-emerald-400/40 shadow-md transition-all cursor-pointer"
            title="Tüm şirket tablolarını tek bir Excel çalışma sayfasında alt alta indir"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx) Tek Sayfa</span>
          </button>

          {/* Yeni Sekmede Aç */}
          <button
            type="button"
            onClick={() => handleOpenReportWindow(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/40 shadow-md transition-all cursor-pointer"
            title="Konsolide raporu yeni pencerede tam ekran aç"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Yeni Sekmede Aç</span>
            <span className="sm:hidden">Yeni Sekme</span>
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
        </div>
      </header>

      {/* ANA İÇERİK: KAYDIRILABİLİR ALAN */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
        {/* İşlem Sonucu Bildirim Mesajı */}
        {moveMessage && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
              moveMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{moveMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMoveMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* KONSOLİDE ÜST İCMAL KARTLARI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/90 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Toplam Şirket
              </span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{filteredCompanyData.length} Şirket</div>
            <div className="mt-1 text-[11px] text-slate-400">Aktif Supabase Tabloları</div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/90 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Toplam Evrak Adedi
              </span>
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-blue-400">
              {grandStats.totalDocs} Adet
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Tüm Şirketlerde Kayıtlı</div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/90 shadow-lg sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Konsolide Büyük Toplam Tutar
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
              {formatCurrency(grandStats.totalAmount)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {filteredCompanyData.length} şirketin tüm evraklarının kümülatif tutarı
            </div>
          </div>
        </div>

        {/* HIZLI GEÇİŞ ÇİZELGESİ & ŞİRKET BAZLI DAĞILIM */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
          <div className="text-xs font-extrabold uppercase text-slate-400 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Şirket Tablolarına Hızlı Erişim & Dağılım</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredCompanyData.map((c) => {
              const info = COMPANIES[c.companyKey as CompanyKey];
              const pct = grandStats.totalAmount > 0 ? (c.totalAmount / grandStats.totalAmount) * 100 : 0;
              return (
                <a
                  key={c.companyKey}
                  href={`#company-table-${c.companyKey}`}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/60 transition-all hover:bg-slate-900 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                      {info?.shortName || c.config?.shortName || c.companyKey}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-bold border border-blue-800/40">
                      {c.filteredRecords.length}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-black text-emerald-400">
                    {formatCurrency(c.totalAmount)}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">%{pct.toFixed(0)}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* AY AY KONSOLİDE DAĞILIM BÖLÜMÜ (AY AY DÖKÜM VE MATRİS) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                  <span>Ay Ay Konsolide Dağılım Çizelgesi</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60 font-mono font-bold">
                    12 Ay Dökümü
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Aylara göre evrak adetleri ve 4 şirketin konsolide ciro ve tutar dağılım matrisi
                </p>
              </div>
            </div>

            {/* Sağ Taraftaki Aktif Ay, Sıfırlama ve Ödenenler / İptal Edilenler Butonları */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {selectedMonth !== 'all' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950 border border-blue-700/60 text-xs text-blue-300 font-bold shadow-sm">
                  <span>Seçili Ay: <span className="text-white underline">{selectedMonth}</span></span>
                  <button
                    type="button"
                    onClick={() => setSelectedMonth('all')}
                    className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-800 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                  >
                    Filtreyi Temizle
                  </button>
                </div>
              ) : null}

              {/* Ödenenler Butonu */}
              <button
                type="button"
                onClick={() => setActiveArchiveView('cekarsiv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border border-amber-400/50 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Ödenenler (cekarsiv) tablosunu yeni sayfada aç"
              >
                <Archive className="w-3.5 h-3.5 text-amber-200" />
                <span>Ödenenler</span>
              </button>

              {/* İptal Edilenler Butonu */}
              <button
                type="button"
                onClick={() => setActiveArchiveView('cekiptal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border border-rose-400/50 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="İptal Edilenler (cekiptal) tablosunu yeni sayfada aç"
              >
                <Ban className="w-3.5 h-3.5 text-rose-200" />
                <span>İptal Edilenler</span>
              </button>
            </div>
          </div>

          {/* 12 AY HIZLI KARTLARI (KONSOLİDE AYLIK ŞERİT) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {monthlyStats.months.map((m) => {
              const isSelected = selectedMonth === m.monthName;
              const hasData = m.totalDocs > 0;
              return (
                <button
                  key={m.monthName}
                  type="button"
                  onClick={() => setSelectedMonth(isSelected ? 'all' : m.monthName)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-blue-950/80 border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-900/20'
                      : hasData
                      ? 'bg-slate-950/70 border-slate-800 hover:border-blue-500/60 hover:bg-slate-900'
                      : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-500'
                  }`}
                  title={`${m.monthName} ayının evraklarını filtrelemek için tıklayın`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[11px] font-black tracking-wider ${isSelected ? 'text-blue-300' : hasData ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-500'}`}>
                      {m.monthName}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : hasData
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-900 text-slate-600'
                    }`}>
                      {m.totalDocs}
                    </span>
                  </div>

                  <div className={`text-xs font-mono font-black ${isSelected ? 'text-emerald-300' : hasData ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {hasData ? formatCurrency(m.totalAmount) : '-'}
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isSelected ? 'bg-blue-400' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, m.percentage)}%` }}
                      />
                    </div>
                    <span className={`text-[9.5px] font-bold font-mono ${isSelected ? 'text-blue-300' : 'text-slate-500'}`}>
                      %{m.percentage.toFixed(0)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* DETAYLI AYLIK MATRİS TABLOSU (ŞİRKET x AY) */}
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 shadow-inner">
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-300">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Konsolide Şirket & Ay Dağılım Matrisi</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Genel Toplam: <strong className="text-emerald-400">{formatCurrency(monthlyStats.totalGrandAmount)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-3 py-2.5">Dönem / Ay</th>
                    {activeCompanies.map((c) => {
                      const compInfo = COMPANIES[c.companyKey as CompanyKey];
                      return (
                        <th key={c.companyKey} className="px-3 py-2.5 text-right whitespace-nowrap">
                          {compInfo?.shortName || c.config?.shortName || c.companyKey}
                        </th>
                      );
                    })}
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Toplam Evrak</th>
                    <th className="px-3 py-2.5 text-right whitespace-nowrap">Aylık Toplam (TL)</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Pay (%)</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Filtre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[12px]">
                  {monthlyStats.months.map((m) => {
                    const isSelected = selectedMonth === m.monthName;
                    const hasData = m.totalDocs > 0;
                    return (
                      <tr
                        key={m.monthName}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-blue-950/40 text-white font-semibold'
                            : hasData
                            ? 'hover:bg-slate-900/60 text-slate-300'
                            : 'hover:bg-slate-900/30 text-slate-500'
                        }`}
                      >
                        <td className="px-3 py-2 font-bold whitespace-nowrap flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400 ring-2 ring-blue-400/40' : hasData ? 'bg-blue-500/70' : 'bg-slate-700'}`} />
                          <span className={isSelected ? 'text-blue-300 font-extrabold' : 'text-slate-200'}>
                            {m.monthName}
                          </span>
                        </td>
                        {activeCompanies.map((c) => {
                          const stat = m.companies[c.companyKey];
                          const amt = stat ? stat.amount : 0;
                          return (
                            <td key={c.companyKey} className="px-3 py-2 text-right font-mono whitespace-nowrap">
                              {amt > 0 ? (
                                <span className="text-slate-200 font-semibold">{formatCurrency(amt)}</span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {m.totalDocs > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 font-mono font-bold text-[11px] border border-blue-800/40">
                              {m.totalDocs}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap">
                          {m.totalAmount > 0 ? (
                            <span className="text-emerald-400 font-black">{formatCurrency(m.totalAmount)}</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {m.percentage > 0 ? (
                            <span className="text-[11px] font-bold font-mono text-slate-400">
                              %{m.percentage.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedMonth(isSelected ? 'all' : m.monthName)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {isSelected ? 'Seçildi ✓' : 'Filtrele'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-slate-700 font-bold text-white text-[12px]">
                    <td className="px-3 py-3 uppercase tracking-wider font-extrabold text-blue-300">
                      Konsolide Toplam:
                    </td>
                    {activeCompanies.map((c) => {
                      const tot = monthlyStats?.companyTotals?.[c.companyKey]?.amount ?? 0;
                      return (
                        <td key={c.companyKey} className="px-3 py-3 text-right font-mono text-slate-200 font-black whitespace-nowrap">
                          {formatCurrency(tot)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center font-mono text-blue-300 font-black whitespace-nowrap">
                      {monthlyStats?.totalGrandDocs ?? 0} Adet
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400 font-black text-sm whitespace-nowrap">
                      {formatCurrency(monthlyStats?.totalGrandAmount ?? 0)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-emerald-400 font-black whitespace-nowrap">
                      %100.0
                    </td>
                    <td className="px-3 py-3 text-center">
                      {selectedMonth !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedMonth('all')}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                        >
                          Sıfırla
                        </button>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* ARAMA VE AY FİLTRESİ */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
          {/* Arama */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tüm tablolarda ara (Evrak No, Firma Ünvanı, Banka, İş Adı, Açıklama)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dönem Filtresi */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-blue-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-44 font-semibold"
            >
              <option value="all">Tüm Dönemler</option>
              {AYLAR.map((ay) => (
                <option key={ay} value={ay}>
                  {ay} Dönemi
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TEK SAYFA BİLGİLENDİRME BANDI */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-800/40 text-xs shadow-md">
          <div className="flex items-center gap-2 text-blue-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>TEK SAYFA KONSOLİDE RAPOR: Konsolide {filteredCompanyData.length} şirketin evrak kayıtları alt alta birleşik düzende sunulmaktadır.</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-medium">
            <span>İndirilen PDF ve Excel raporları da tek sayfada eksiksiz toplanır.</span>
          </div>
        </div>

        {/* KONSOLİDE ŞİRKET TABLOLARININ ALT ALTA GÖSTERİMİ */}
        <div className="space-y-8">
          {filteredCompanyData.map((comp, compIdx) => {
            const compInfo = COMPANIES[comp.companyKey as CompanyKey];
            const compTitle = compInfo?.name || comp.config?.companyTitle || comp.companyKey;
            const records = comp.filteredRecords;
            const currentLimit = getCompanyLimit(comp.companyKey);
            const displayedCompanyRecords = records.slice(0, currentLimit);
            const hasMoreRecords = currentLimit < records.length;
            const isTableExpanded = currentLimit > DEFAULT_COMPANY_ROW_LIMIT;

            // Bu şirkete ait gösterilen satırların anahtarları
            const visibleRowKeys = displayedCompanyRecords.map(
              (r, idx) => `${comp.companyKey}_${r.id || r.evrak_numarasi || idx}`
            );
            const isAllVisibleSelected =
              visibleRowKeys.length > 0 &&
              visibleRowKeys.every((k) => selectedReportRowKeys.has(k));
            const isSomeVisibleSelected =
              visibleRowKeys.some((k) => selectedReportRowKeys.has(k)) &&
              !isAllVisibleSelected;

            const handleToggleCompanySelectAll = () => {
              setSelectedReportRowKeys((prev) => {
                const next = new Set(prev);
                if (isAllVisibleSelected) {
                  visibleRowKeys.forEach((k) => next.delete(k));
                } else {
                  visibleRowKeys.forEach((k) => next.add(k));
                }
                return next;
              });
            };

            const handleToggleReportRow = (key: string) => {
              setSelectedReportRowKeys((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              });
            };

            return (
              <section
                key={comp.companyKey}
                id={`company-table-${comp.companyKey}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden scroll-mt-20"
              >
                {/* Şirket Başlık Bandı */}
                <div className="px-5 py-4 bg-slate-950 border-b-2 border-blue-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-black text-sm shrink-0">
                      {compIdx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-white tracking-tight">
                          {compTitle}
                        </h2>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {compInfo?.badge || 'İNŞAAT'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        Tablo: {comp.activeTableName || comp.config?.tableName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      Evrak Sayısı: <strong className="text-white">{records.length} Adet</strong>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                      {formatCurrency(comp.totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Tablo Gövdesi (Vergi Numarası Kolonu Gizli!) */}
                {records.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Bu şirkete ait eşleşen evrak kaydı bulunmamaktadır.
                  </div>
                ) : (
                  <div>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="border-b-2 border-blue-500 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                            {/* TİK KUTUCUĞU & TÜMÜNÜ SEÇ */}
                            <th className="py-3 px-3 text-center w-12 text-slate-800">
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  title={isAllVisibleSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                  aria-label={`${compTitle} tablosunda tümünü seç`}
                                  checked={isAllVisibleSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = isSomeVisibleSelected;
                                  }}
                                  onChange={handleToggleCompanySelectAll}
                                  className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </div>
                            </th>
                            <th className="py-3 px-3 text-center w-12 text-slate-800">#</th>
                            <th className="py-3 px-3 text-slate-800">EVRAK TARİHİ</th>
                            <th className="py-3 px-3 text-slate-800">DÖNEM</th>
                            <th className="py-3 px-3 text-slate-800">EVRAK NUMARASI</th>
                            <th className="py-3 px-3 min-w-[180px] text-slate-800">FİRMA ÜNVANI</th>
                            {/* VERGİ NUMARASI ALANI KESİNLİKLE GİZLİDİR */}
                            <th className="py-3 px-3 text-slate-800">BANKA ADI</th>
                            <th className="py-3 px-3 min-w-[200px] text-slate-800">İŞİN ADI</th>
                            <th className="py-3 px-3 text-right text-slate-800">TUTARI</th>
                            <th className="py-3 px-3 text-slate-800">AÇIKLAMA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-blue-200 text-xs bg-white">
                          {displayedCompanyRecords.map((row, idx) => {
                            const rowKey = `${comp.companyKey}_${row.id || row.evrak_numarasi || idx}`;
                            const isSelected = selectedReportRowKeys.has(rowKey);
                            const currentMonthIdx = getRecordMonthIndex(row);
                            const prevMonthIdx = idx > 0 ? getRecordMonthIndex(displayedCompanyRecords[idx - 1]) : -1;
                            const isNewMonth = selectedMonth === 'all' && (idx === 0 || currentMonthIdx !== prevMonthIdx);
                            const monthName = currentMonthIdx < 12 ? AYLAR[currentMonthIdx] : (row.donem || 'DİĞER');
                            const monthRecords = displayedCompanyRecords.filter((r) => getRecordMonthIndex(r) === currentMonthIdx);
                            const monthTotal = monthRecords.reduce((acc, curr) => {
                              const val = typeof curr.tutari === 'number' ? curr.tutari : parseFloat(String(curr.tutari || 0));
                              return acc + (isNaN(val) ? 0 : val);
                            }, 0);

                            return (
                              <React.Fragment key={row.id || rowKey}>
                                {isNewMonth && (
                                  <tr className="bg-gradient-to-r from-blue-100 via-indigo-50 to-blue-100 border-y-2 border-blue-400">
                                    <td colSpan={10} className="py-2.5 px-4 text-xs font-bold text-blue-950">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-700 text-white text-[10px] font-black">
                                            {currentMonthIdx < 12 ? currentMonthIdx + 1 : '?'}
                                          </span>
                                          <span className="text-xs font-black text-blue-900 tracking-wide uppercase">
                                            {monthName} DÖNEMİ
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-blue-900 font-semibold">
                                          <span className="bg-white/90 px-2.5 py-0.5 rounded border border-blue-200">
                                            Evrak: <strong>{monthRecords.length} Adet</strong>
                                          </span>
                                          <span className="bg-white/90 px-2.5 py-0.5 rounded border border-blue-200">
                                            Dönem Toplamı: <strong className="text-blue-700">{formatCurrency(monthTotal)}</strong>
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                <tr
                                  className={`transition-colors border-b border-blue-200 ${
                                    isSelected
                                      ? 'bg-blue-100/80 font-medium'
                                      : 'bg-white hover:bg-blue-50/70'
                                  }`}
                                >
                                  {/* TİK KUTUCUĞU */}
                                  <td className="py-3 px-3 text-center w-12">
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleReportRow(rowKey)}
                                        aria-label={`Evrak ${row.evrak_numarasi || idx} seç`}
                                        className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-medium">
                                    {row.evrak_tarihi || '-'}
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                      {row.donem || '-'}
                                    </span>
                                  </td>

                                  {/* EVRAK NUMARASI - ARSIVCEKLER BUCKET KONTROLÜ */}
                                  <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-blue-900">
                                    <button
                                      type="button"
                                      onClick={() => handleEvrakNoClick(row.evrak_numarasi, row)}
                                      title={`Evrak Arşivini Görüntüle (ARSIVCEKLER) - ${row.evrak_numarasi}`}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 hover:text-blue-950 font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer group/evrak shadow-xs"
                                    >
                                      <Hash className="w-3 h-3 text-blue-500 group-hover/evrak:text-blue-700" />
                                      <span className="underline decoration-blue-400/80 underline-offset-2">
                                        {row.evrak_numarasi || '-'}
                                      </span>
                                      {checkingEvrakNo === row.evrak_numarasi ? (
                                        <RefreshCw className="w-3 h-3 text-blue-600 animate-spin ml-0.5" />
                                      ) : (
                                        <ExternalLink className="w-3 h-3 text-blue-400 opacity-60 group-hover/evrak:opacity-100 ml-0.5" />
                                      )}
                                    </button>
                                  </td>

                                  <td className="py-3 px-3 text-slate-900 font-bold">
                                    <div className="truncate max-w-[220px]" title={row.firma_unvani}>
                                      {row.firma_unvani || '-'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-medium">
                                    {row.banka_adi || '-'}
                                  </td>
                                  <td className="py-3 px-3 text-slate-900 font-medium">
                                    <div className="line-clamp-2 max-w-[260px]" title={row.isin_adi}>
                                      {row.isin_adi || '-'}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-black text-slate-900">
                                    {formatCurrency(row.tutari)}
                                  </td>
                                  <td className="py-3 px-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={row.aciklama || ''}>
                                    {row.aciklama || '-'}
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 border-t-2 border-blue-600 font-bold text-xs text-slate-900">
                            <td colSpan={8} className="py-3.5 px-4 text-right uppercase tracking-wider text-blue-950 font-black">
                              {compTitle} TOPLAMI ({records.length} Adet Evrak):
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-sm font-black text-blue-700 whitespace-nowrap">
                              {formatCurrency(comp.totalAmount)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* DEVAMI GÖSTER (Tablo aşağı doğru uzamasın, tıklandığında uzasın) */}
                    {records.length > DEFAULT_COMPANY_ROW_LIMIT && (
                      <div className="p-3 bg-slate-100 border-t-2 border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="text-xs text-slate-700 font-medium">
                          Gösterilen: <strong className="font-bold text-blue-900">{displayedCompanyRecords.length}</strong> / Toplam:{' '}
                          <strong className="font-bold text-blue-900">{records.length}</strong> evrak
                          {currentLimit < records.length && (
                            <span className="text-slate-500 ml-1">
                              (Kalan: {records.length - currentLimit} evrak)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasMoreRecords && (
                            <button
                              type="button"
                              onClick={() => setCompanyLimit(comp.companyKey, Math.min(currentLimit + 15, records.length))}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>DEVAMI GÖSTER (+15)</span>
                            </button>
                          )}
                          {hasMoreRecords && (
                            <button
                              type="button"
                              onClick={() => setCompanyLimit(comp.companyKey, records.length)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-300 transition-all cursor-pointer"
                            >
                              <span>Tümünü Göster ({records.length})</span>
                            </button>
                          )}
                          {isTableExpanded && (
                            <button
                              type="button"
                              onClick={() => setCompanyLimit(comp.companyKey, DEFAULT_COMPANY_ROW_LIMIT)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-all cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Daralt (10 Evrak)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
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

        {/* MODAL: GENEL RAPOR TAŞIMA ONAY PENCERESİ */}
        {confirmDialog && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setConfirmDialog(null)}
          >
            <div
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-slate-300 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={`p-4 sm:p-5 text-white flex items-center gap-3 ${
                  confirmDialog.type === 'danger'
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700'
                    : 'bg-gradient-to-r from-amber-600 to-yellow-600'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  {confirmDialog.type === 'danger' ? (
                    <Ban className="w-5 h-5 text-white" />
                  ) : (
                    <Archive className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-white/80">Lütfen işlemi onaylayınız</p>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3.5 bg-white text-slate-800">
                <p className="text-sm font-medium leading-relaxed">
                  {confirmDialog.message}
                </p>

                {confirmDialog.details && confirmDialog.details.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                    {confirmDialog.details.map((item, dIdx) => (
                      <div key={dIdx} className="flex justify-between items-center text-slate-700">
                        <span className="font-semibold text-slate-500">{item.label}:</span>
                        <span className="font-mono font-bold text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  disabled={isMoving}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${
                    confirmDialog.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isMoving ? 'İşleniyor...' : confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ÖDENENLER (cekarsiv) VEYA İPTAL EDİLENLER (cekiptal) SAYFASI */}
        {activeArchiveView && (
          <ArchiveListView
            type={activeArchiveView}
            onClose={() => setActiveArchiveView(null)}
          />
        )}
      </div>
    </div>
  );
};
