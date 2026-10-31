import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  SupabaseEvrakRow,
  SupabaseTableConfig,
  SUPABASE_COMPANY_TABLES,
  insertCompanyEvrak,
  bulkInsertCompanyEvraklar,
  updateCompanyEvrak,
  deleteCompanyEvrak,
  checkDuplicateEvrakNo,
  moveCompanyEvraklarToTarget,
  fetchAllCompaniesEvraklar,
  CompanyDataResult,
} from '../utils/supabaseClient';
import { checkArchiveDocument, ArchiveCheckResult } from '../utils/archiveStorage';
import { OZKA_LOGO_DATA_URL } from '../utils/logoAssets';
import { ArchiveDocModal } from './ArchiveDocModal';
import { ArchiveListView } from './ArchiveListView';
import {
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Building2,
  CreditCard,
  Briefcase,
  Hash,
  AlertCircle,
  FileSpreadsheet,
  X,
  CheckCircle2,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  ExternalLink,
  Archive,
  Ban,
  Loader2,
} from 'lucide-react';

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
import { CompanyKey } from '../types';

interface SupabaseTableViewProps {
  companyKey: string;
  records: SupabaseEvrakRow[];
  isLoading: boolean;
  error: string | null;
  activeTableName: string;
  onRefresh: () => void;
  onRecordAdded: () => void;
  onRecordDeleted: () => void;
  onOpenArchiveView?: (type: 'cekarsiv' | 'cekiptal') => void;
  selectedCompaniesForReport?: Set<CompanyKey>;
}

export const SupabaseTableView: React.FC<SupabaseTableViewProps> = ({
  companyKey,
  records,
  isLoading,
  error,
  activeTableName,
  onRefresh,
  onRecordAdded,
  onRecordDeleted,
  onOpenArchiveView,
  selectedCompaniesForReport,
}) => {
  const config: SupabaseTableConfig | undefined = SUPABASE_COMPANY_TABLES[companyKey];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDonem, setSelectedDonem] = useState<string>('all');
  const [selectedIsinAdiFilter, setSelectedIsinAdiFilter] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isExportingAllCompaniesPDF, setIsExportingAllCompaniesPDF] = useState(false);

  // Listbox vs Serbest Metin Giriş Modları (Yeni Kayıt & Güncelleme)
  const [isCustomBankAdd, setIsCustomBankAdd] = useState(false);
  const [isCustomProjectAdd, setIsCustomProjectAdd] = useState(false);
  const [isCustomBankEdit, setIsCustomBankEdit] = useState(false);
  const [isCustomProjectEdit, setIsCustomProjectEdit] = useState(false);

  // 1. Banka Adı Listbox Seçenekleri:
  // Evrak listesinde banka adı sütunundan alır, aynı kayıttan mükerrer almaz.
  const existingBankOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    records.forEach((r) => {
      const b = (r.banka_adi || '').trim();
      if (!b) return;
      const upper = b.toLocaleUpperCase('tr-TR');
      if (!seen.has(upper)) {
        seen.add(upper);
        list.push(b);
      }
    });
    return list.sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [records]);

  // 2. İşin Adı (Proje / Şantiye) Listbox Seçenekleri:
  // Hangi şantiye ortaklık listesi açıksa o evrak listesindeki işin adı sütunundan alır, mükerrer veri almaz.
  const existingProjectOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    records.forEach((r) => {
      const p = (r.isin_adi || '').trim();
      if (!p) return;
      const upper = p.toLocaleUpperCase('tr-TR');
      if (!seen.has(upper)) {
        seen.add(upper);
        list.push(p);
      }
    });
    return list.sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [records]);

  // Satır Seçimi (Checkbox) ve Tümünü Seç Durumu
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  // Tablo Satır Sınırı ve "Devamını Göster" Durumu
  const INITIAL_ROW_LIMIT = 15;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_ROW_LIMIT);

  // Evrak Arşiv Kontrolü (ARSIVCEKLER) Modal Durumu
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

  // Ödenenler (cekarsiv) veya İptal Edilenler (cekiptal) Yeni Sayfası Durumu
  const [activeArchiveView, setActiveArchiveView] = useState<'cekarsiv' | 'cekiptal' | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    evrak_tarihi: new Date().toISOString().slice(0, 10),
    donem: AYLAR[new Date().getMonth()],
    evrak_numarasi: '',
    firma_unvani: '', // Manuel giriş için boş bırakıldı
    vergi_numarasi: '',
    banka_adi: '',
    isin_adi: '',
    tutari: '',
    aciklama: '',
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SupabaseEvrakRow | null>(null);
  const [editFormData, setEditFormData] = useState({
    evrak_tarihi: new Date().toISOString().slice(0, 10),
    donem: AYLAR[new Date().getMonth()],
    evrak_numarasi: '',
    firma_unvani: '',
    vergi_numarasi: '',
    banka_adi: '',
    isin_adi: '',
    tutari: '',
    aciklama: '',
  });

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    type: 'danger' | 'primary';
    confirmLabel: string;
    cancelLabel?: string;
    details?: { label: string; value: string }[];
    onConfirm: () => void;
  } | null>(null);

  // Evrak numarası değiştiğinde hem mevcut listede hem tabloda kontrol et
  const handleEvrakNoChange = (newVal: string) => {
    setFormData({ ...formData, evrak_numarasi: newVal });
    setDuplicateWarning(null);

    const trimmed = newVal.trim();
    if (!trimmed) return;

    // 1. Önce hafızadaki records içinde kontrol et (anlık)
    const existsLocally = records.some(
      (r) => (r.evrak_numarasi || '').trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existsLocally) {
      setDuplicateWarning(
        `DİKKAT: "${trimmed}" numaralı evrak bu şirketin tablosunda zaten mevcut!`
      );
    }
  };

  // Inputtan çıkıldığında Supabase veritabanında da kontrol et
  const handleEvrakNoBlur = async () => {
    const trimmed = (formData.evrak_numarasi || '').trim();
    if (!trimmed) return;

    const existsLocally = records.some(
      (r) => (r.evrak_numarasi || '').trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existsLocally) {
      setDuplicateWarning(`DİKKAT: "${trimmed}" numaralı evrak bu şirketin tablosunda zaten mevcut!`);
      return;
    }

    const serverCheck = await checkDuplicateEvrakNo(companyKey, trimmed);
    if (serverCheck.exists) {
      setDuplicateWarning(
        `DİKKAT: "${trimmed}" numaralı evrak Supabase veritabanında zaten kayıtlıdır!`
      );
    }
  };

  // Canlı Tutar TL Önizleme (virgül ve nokta desteği ile)
  const getLiveTutarDisplay = (val: string) => {
    if (!val || val.trim() === '') return null;
    let normalized = val.trim().replace(/\s+/g, '');
    if (normalized.includes(',') && normalized.includes('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }
    const num = parseFloat(normalized);
    if (isNaN(num)) return null;
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Normalize month name for reliable matching
  const normalizeMonth = (m: string | null | undefined): string => {
    if (!m) return '';
    return m
      .trim()
      .toUpperCase()
      .replace(/İ/g, 'I')
      .replace(/ı/g, 'I')
      .replace(/Ş/g, 'S')
      .replace(/ş/g, 'S')
      .replace(/Ğ/g, 'G')
      .replace(/ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/ü/g, 'U')
      .replace(/Ö/g, 'O')
      .replace(/ö/g, 'O')
      .replace(/Ç/g, 'C')
      .replace(/ç/g, 'C');
  };

  // Kaydın hangi aya ait olduğunu bulma (0: OCAK, 1: ŞUBAT, ..., 11: ARALIK, 99: BİLİNMEYEN)
  const getRecordMonthIndex = (record: any): number => {
    if (!record) return 99;

    // 1. Önce donem sütununu kontrol et
    const normDonem = normalizeMonth(record.donem);
    if (normDonem) {
      for (let i = 0; i < AYLAR.length; i++) {
        const normAy = normalizeMonth(AYLAR[i]);
        if (normDonem === normAy || normDonem.includes(normAy)) {
          return i;
        }
      }
    }

    // 2. donem yoksa veya bulunamadıysa evrak_tarihi / tarih alanından ayı tespit et
    const rawDate = record.evrak_tarihi || record.evraktarihi || record.tarih;
    if (rawDate) {
      const dateStr = String(rawDate).trim();
      const parts = dateStr.split(/[-./]/);
      if (parts.length === 3) {
        let m = -1;
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          m = parseInt(parts[1], 10) - 1;
        } else if (parts[2].length === 4 || parts[2].length === 2) {
          // DD.MM.YYYY veya DD/MM/YY
          m = parseInt(parts[1], 10) - 1;
        }
        if (m >= 0 && m < 12) {
          return m;
        }
      }
    }

    return 99; // Belirtilmemiş/bilinmeyen ay en sona
  };

  // Ay önceliğine göre sıralama karşılaştırıcısı (OCAK -> ŞUBAT -> MART -> ... -> ARALIK)
  const compareRecordsByMonth = (a: any, b: any) => {
    const monthA = getRecordMonthIndex(a);
    const monthB = getRecordMonthIndex(b);
    if (monthA !== monthB) {
      return monthA - monthB; // 0, 1, 2, ...
    }
    // Aynı ay içindeyse: Tarihe göre (kronolojik küçükten büyüğe)
    const dateA = a.evrak_tarihi || a.evraktarihi || a.tarih || '';
    const dateB = b.evrak_tarihi || b.evraktarihi || b.tarih || '';
    if (dateA && dateB && dateA !== dateB) {
      return String(dateA).localeCompare(String(dateB));
    }
    // Tarih aynıysa evrak numarasına göre
    const noA = String(a.evrak_numarasi || a.evraknumarasi || a.evrak_no || '');
    const noB = String(b.evrak_numarasi || b.evraknumarasi || b.evrak_no || '');
    return noA.localeCompare(noB, 'tr-TR', { numeric: true });
  };

  // Check if a record matches a given month (by r.donem or date)
  const matchesMonth = (record: SupabaseEvrakRow, monthName: string): boolean => {
    if (!monthName || monthName === 'all') return true;

    const normTarget = normalizeMonth(monthName);
    const normDonem = normalizeMonth(record.donem);

    if (normDonem && (normDonem === normTarget || normDonem.includes(normTarget))) {
      return true;
    }

    // Tarihten ayı bul (YYYY-MM-DD veya DD.MM.YYYY formatları)
    if (record.evrak_tarihi) {
      const parts = record.evrak_tarihi.split(/[-./]/);
      let monthIndex = -1;
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          monthIndex = parseInt(parts[1], 10) - 1;
        } else if (parts[2].length === 4) {
          monthIndex = parseInt(parts[1], 10) - 1;
        }
      }
      if (monthIndex >= 0 && monthIndex < 12) {
        if (normalizeMonth(AYLAR[monthIndex]) === normTarget) {
          return true;
        }
      }
    }

    return false;
  };

  // Filter records & Ay önceliğine göre sırala (Ocak -> Şubat -> Mart -> ...)
  // İŞİN ADI PROJE ŞANTİYE LİSTBOKSU SEÇİLİ DEĞİLSE EVRAK LİSTESİNDEKİ VERİLERİN TAMAMI GÖRÜNSÜN
  const filteredRecords = records
    .filter((r) => {
      if (selectedDonem !== 'all' && !matchesMonth(r, selectedDonem)) return false;
      if (selectedIsinAdiFilter && selectedIsinAdiFilter.trim() !== '') {
        const normFilter = selectedIsinAdiFilter.trim().toLocaleUpperCase('tr-TR');
        const normProject = (r.isin_adi || '').trim().toLocaleUpperCase('tr-TR');
        if (normProject !== normFilter) return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (r.evrak_numarasi || '').toLowerCase().includes(term) ||
        (r.firma_unvani || '').toLowerCase().includes(term) ||
        (r.isin_adi || '').toLowerCase().includes(term) ||
        (r.banka_adi || '').toLowerCase().includes(term) ||
        (r.vergi_numarasi || '').toLowerCase().includes(term) ||
        (r.donem || '').toLowerCase().includes(term)
      );
    })
    .sort(compareRecordsByMonth);

  // Seçili döneme ait kayıtlar, toplam kayıt adedi ve toplam tutar
  // selectedDonem === 'all' seçildiğinde tablodaki TÜM kayıtlar ve genel toplam hesaplanır
  // İşin adı filtresi seçilmişse o işe ait kayıtlar ve tutar hesaplanır
  const activeMonthRecords = useMemo(() => {
    let list = selectedDonem === 'all' 
      ? records 
      : records.filter((r) => matchesMonth(r, selectedDonem));
    if (selectedIsinAdiFilter && selectedIsinAdiFilter.trim() !== '') {
      const norm = selectedIsinAdiFilter.trim().toLocaleUpperCase('tr-TR');
      list = list.filter((r) => (r.isin_adi || '').trim().toLocaleUpperCase('tr-TR') === norm);
    }
    return list;
  }, [records, selectedDonem, selectedIsinAdiFilter]);

  const activeMonthCount = activeMonthRecords.length;
  const activeMonthTotal = activeMonthRecords.reduce((acc, curr) => {
    const val = typeof curr.tutari === 'number' ? curr.tutari : parseFloat(String(curr.tutari || 0));
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  // İşin Adı filtresi için özel hesaplama (seçili iş için toplam kayıt ve tutar)
  const projectFilteredRecords = useMemo(() => {
    if (!selectedIsinAdiFilter || selectedIsinAdiFilter.trim() === '') return [];
    const norm = selectedIsinAdiFilter.trim().toLocaleUpperCase('tr-TR');
    return records.filter((r) => (r.isin_adi || '').trim().toLocaleUpperCase('tr-TR') === norm);
  }, [records, selectedIsinAdiFilter]);

  const projectFilteredTotal = useMemo(() => {
    return projectFilteredRecords.reduce((acc, curr) => {
      const val = typeof curr.tutari === 'number' ? curr.tutari : parseFloat(String(curr.tutari || 0));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [projectFilteredRecords]);

  const formatCurrency = (amount: number | string | undefined) => {
    const val = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
    if (isNaN(val)) return '0,00 ₺';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(val);
  };

  // Tabloda gösterilen kayıtlar:
  // İŞİN ADI LİSTBOKSU BOŞSA EVRAK LİSTESİNDE TÜM VERİLER GÖSTERİLSİN
  const displayedRecords = filteredRecords;
  const hasMoreRecords = false;
  const isTableExpanded = false;

  // Benzersiz satır kimliği yardımcısı
  const getRowKey = (r: SupabaseEvrakRow, idx: number): string => {
    if (r.id) return String(r.id);
    return `${r.evrak_numarasi || 'row'}_${r.evrak_tarihi || ''}_${idx}`;
  };

  // Tekil satır tik kutucuğu değiştirme
  const handleToggleRow = (key: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Tümünü Seç kontrolü (Aktif gösterilen kayıtlar bazında)
  const isAllVisibleSelected =
    displayedRecords.length > 0 &&
    displayedRecords.every((r, idx) => selectedRowKeys.has(getRowKey(r, idx)));

  const isSomeVisibleSelected =
    displayedRecords.some((r, idx) => selectedRowKeys.has(getRowKey(r, idx))) &&
    !isAllVisibleSelected;

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      // Gösterilenlerin seçimini kaldır
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        displayedRecords.forEach((r, idx) => next.delete(getRowKey(r, idx)));
        return next;
      });
    } else {
      // Gösterilenlerin tümünü seç
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        displayedRecords.forEach((r, idx) => next.add(getRowKey(r, idx)));
        return next;
      });
    }
  };

  // Seçili kayıtları nesne listesi olarak al
  const getSelectedRecordsList = (): SupabaseEvrakRow[] => {
    // Hem displayedRecords hem filteredRecords içindeki seçilenleri topla
    const list: SupabaseEvrakRow[] = [];
    const seenIds = new Set<string>();

    displayedRecords.forEach((r, idx) => {
      const k = getRowKey(r, idx);
      if (selectedRowKeys.has(k)) {
        const idKey = r.id ? String(r.id) : `${r.evrak_numarasi}_${idx}`;
        if (!seenIds.has(idKey)) {
          seenIds.add(idKey);
          list.push(r);
        }
      }
    });

    // Filtrelenmiş tüm kayıtlar arasından da ID eşleşmesi olanları dahil et
    filteredRecords.forEach((r, idx) => {
      const k = getRowKey(r, idx);
      if (selectedRowKeys.has(k)) {
        const idKey = r.id ? String(r.id) : `${r.evrak_numarasi}_${idx}`;
        if (!seenIds.has(idKey)) {
          seenIds.add(idKey);
          list.push(r);
        }
      }
    });

    return list;
  };

  // Arşive Gönder veya İptal Et Taşıma Durumu
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [movingTarget, setMovingTarget] = useState<'cekarsiv' | 'cekiptal' | null>(null);

  // Seçili Evrakları "cekarsiv" veya "cekiptal" Tablosuna Taşıma İşlemi
  const handleMoveSelectedRecords = async (target: 'cekarsiv' | 'cekiptal') => {
    const selectedList = getSelectedRecordsList();
    if (selectedList.length === 0) {
      setActionMessage({
        text: 'Lütfen taşımak istediğiniz en az bir evrak kaydı seçiniz.',
        type: 'error',
      });
      return;
    }

    const targetLabel = target === 'cekarsiv' ? 'Çek Arşiv (cekarsiv)' : 'Çek İptal (cekiptal)';

    // Modern Modal Onay Penceresi Aç (iFrame uyumlu, window.confirm engeline takılmaz)
    setConfirmDialog({
      title: target === 'cekarsiv' ? 'Arşive Gönderme Onayı' : 'İptal Etme Onayı',
      message: `Seçilen ${selectedList.length} adet evrak kaydını "${targetLabel}" tablosuna taşımak ve ${config.companyTitle} aktif listesinden kaldırmak istediğinizden emin misiniz?`,
      type: target === 'cekarsiv' ? 'primary' : 'danger',
      confirmLabel: target === 'cekarsiv' ? 'Evet, Arşive Taşı' : 'Evet, İptal Tablosuna Taşı',
      cancelLabel: 'Vazgeç',
      details: [
        { label: 'İşlem', value: target === 'cekarsiv' ? 'Arşive Taşıma' : 'İptal Etme' },
        { label: 'Hedef Tablo', value: target },
        { label: 'Seçili Evrak Sayısı', value: `${selectedList.length} Adet` },
      ],
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsMoving(true);
        setMovingTarget(target);

        try {
          const res = await moveCompanyEvraklarToTarget(companyKey, target, selectedList);

          if (res.success) {
            setActionMessage({
              text: `İşlem Başarılı! ${res.movedCount} adet kayıt "${targetLabel}" tablosuna taşındı.`,
              type: 'success',
            });
            // Seçimleri temizle
            setSelectedRowKeys(new Set());
            // Tabloyu tazele
            onRefresh();
          } else {
            setActionMessage({
              text: `Taşıma işlemi uyarısı: ${res.error || 'Bilinmeyen hata'}`,
              type: 'error',
            });
          }
        } catch (err: any) {
          setActionMessage({
            text: `Hata: ${err.message || 'Taşıma gerçekleştirilemedi.'}`,
            type: 'error',
          });
        } finally {
          setIsMoving(false);
          setMovingTarget(null);
          setTimeout(() => setActionMessage(null), 8000);
        }
      },
    });
  };


  // Evrak Numarasına tıklandığında Supabase Storage (ARSIVCEKLER) kontrolü
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEvrakNo = (formData.evrak_numarasi || '').trim();

    if (!formData.evrak_tarihi || !trimmedEvrakNo || !formData.isin_adi) {
      alert('Lütfen zorunlu alanları (Evrak Tarihi, Evrak Numarası ve İşin Adı) doldurun.');
      return;
    }

    setIsSubmitting(true);

    // Aynı evrak numarası kontrolü (Önce anlık local records, ardından Supabase tablosu)
    const localDuplicate = records.find(
      (r) => (r.evrak_numarasi || '').trim().toLowerCase() === trimmedEvrakNo.toLowerCase()
    );

    let isDuplicate = !!localDuplicate;
    if (!isDuplicate) {
      const serverCheck = await checkDuplicateEvrakNo(companyKey, trimmedEvrakNo);
      if (serverCheck.exists) {
        isDuplicate = true;
      }
    }

    if (isDuplicate) {
      setDuplicateWarning(`DİKKAT: "${trimmedEvrakNo}" numaralı evrak bu şirketin tablosunda zaten mevcut!`);
      const proceed = window.confirm(
        `UYARI: "${trimmedEvrakNo}" evrak numarası bu şirketin tablosunda zaten kayıtlıdır!\n\nYine de aynı numarayla mükerrer kayıt oluşturmak istiyor musunuz?`
      );
      if (!proceed) {
        setIsSubmitting(false);
        return;
      }
    }

    let cleanTutar = String(formData.tutari).trim().replace(/\s+/g, '');
    if (cleanTutar.includes(',') && cleanTutar.includes('.')) {
      cleanTutar = cleanTutar.replace(/\./g, '').replace(',', '.');
    } else if (cleanTutar.includes(',')) {
      cleanTutar = cleanTutar.replace(',', '.');
    }
    const numericTutar = parseFloat(cleanTutar) || 0;

    const res = await insertCompanyEvrak(companyKey, {
      evrak_tarihi: formData.evrak_tarihi,
      donem: formData.donem,
      evrak_numarasi: trimmedEvrakNo,
      firma_unvani: formData.firma_unvani.trim(),
      vergi_numarasi: formData.vergi_numarasi || null,
      banka_adi: formData.banka_adi || null,
      isin_adi: formData.isin_adi,
      tutari: numericTutar,
      aciklama: formData.aciklama || null,
    });

    setIsSubmitting(false);

    if (res.success) {
      setActionMessage({ text: 'Kayıt Supabase tablosuna başarıyla eklendi!', type: 'success' });
      setIsAddModalOpen(false);
      setDuplicateWarning(null);
      // Reset form
      setFormData({
        evrak_tarihi: new Date().toISOString().slice(0, 10),
        donem: AYLAR[new Date().getMonth()],
        evrak_numarasi: '',
        firma_unvani: '',
        vergi_numarasi: '',
        banka_adi: '',
        isin_adi: '',
        tutari: '',
        aciklama: '',
      });
      onRecordAdded();
      setTimeout(() => setActionMessage(null), 4000);
    } else {
      setActionMessage({ text: `Hata: ${res.error}`, type: 'error' });
    }
  };

  // Silme Onay ve İşlemi (Önce onay alır, sonra siler)
  const handleStartDelete = (row: SupabaseEvrakRow) => {
    if (!row.id) return;
    setConfirmDialog({
      title: 'Kayıt Silme Onayı',
      message: `"${row.evrak_numarasi}" numaralı evrak kaydını Supabase tablosundan kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      type: 'danger',
      confirmLabel: 'Evet, Kaydı Sil',
      cancelLabel: 'İptal',
      details: [
        { label: 'Evrak No', value: row.evrak_numarasi || '-' },
        { label: 'Firma Ünvanı', value: row.firma_unvani || '-' },
        { label: 'İşin Adı', value: row.isin_adi || '-' },
        { label: 'Tutar', value: formatCurrency(row.tutari) },
      ],
      onConfirm: async () => {
        const res = await deleteCompanyEvrak(companyKey, row.id!);
        if (res.success) {
          onRecordDeleted();
          setActionMessage({ text: `"${row.evrak_numarasi}" numaralı kayıt başarıyla silindi.`, type: 'success' });
          setTimeout(() => setActionMessage(null), 3500);
        } else {
          setActionMessage({ text: `Silinemedi: ${res.error}`, type: 'error' });
        }
      },
    });
  };

  // Güncelleme Onay ve İşlemi (Önce onay alır, sonra modalı açar)
  const handleStartUpdate = (row: SupabaseEvrakRow) => {
    if (!row.id) return;
    setConfirmDialog({
      title: 'Kayıt Güncelleme Onayı',
      message: `"${row.evrak_numarasi}" numaralı evrak kaydını düzenlemek ve güncellemek istiyor musunuz?`,
      type: 'primary',
      confirmLabel: 'Evet, Düzenle',
      cancelLabel: 'Vazgeç',
      details: [
        { label: 'Evrak No', value: row.evrak_numarasi || '-' },
        { label: 'Firma Ünvanı', value: row.firma_unvani || '-' },
        { label: 'İşin Adı', value: row.isin_adi || '-' },
        { label: 'Mevcut Tutar', value: formatCurrency(row.tutari) },
      ],
      onConfirm: () => {
        setEditingRecord(row);
        const bVal = (row.banka_adi || '').trim();
        const pVal = (row.isin_adi || '').trim();
        const bExists = existingBankOptions.some((b) => b.toLocaleUpperCase('tr-TR') === bVal.toLocaleUpperCase('tr-TR'));
        const pExists = existingProjectOptions.some((p) => p.toLocaleUpperCase('tr-TR') === pVal.toLocaleUpperCase('tr-TR'));
        setIsCustomBankEdit(!bExists && !!bVal);
        setIsCustomProjectEdit(!pExists && !!pVal);
        setEditFormData({
          evrak_tarihi: row.evrak_tarihi || new Date().toISOString().slice(0, 10),
          donem: row.donem || AYLAR[new Date().getMonth()],
          evrak_numarasi: row.evrak_numarasi || '',
          firma_unvani: row.firma_unvani || config?.companyTitle || 'BAYBURT ÖZ-KA İNŞAAT',
          vergi_numarasi: row.vergi_numarasi || '',
          banka_adi: row.banka_adi || '',
          isin_adi: row.isin_adi || '',
          tutari: row.tutari !== undefined && row.tutari !== null ? String(row.tutari) : '',
          aciklama: row.aciklama || '',
        });
        setIsEditModalOpen(true);
      },
    });
  };

  // Güncelleme Formu Gönderildiğinde Son Onay ve Kayıt
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord?.id) return;

    const trimmedEvrakNo = (editFormData.evrak_numarasi || '').trim();
    if (!editFormData.evrak_tarihi || !trimmedEvrakNo || !editFormData.isin_adi) {
      alert('Lütfen zorunlu alanları (Evrak Tarihi, Evrak Numarası ve İşin Adı) doldurun.');
      return;
    }

    setConfirmDialog({
      title: 'Değişiklikleri Kaydetme Onayı',
      message: `"${trimmedEvrakNo}" numaralı evrak için yaptığınız değişiklikler Supabase veritabanına kaydedilecektir. Onaylıyor musunuz?`,
      type: 'primary',
      confirmLabel: 'Onayla ve Kaydet',
      cancelLabel: 'İncelemeye Dön',
      details: [
        { label: 'Evrak No', value: trimmedEvrakNo },
        { label: 'Firma Ünvanı', value: editFormData.firma_unvani },
        { label: 'Tarih / Dönem', value: `${editFormData.evrak_tarihi} - ${editFormData.donem}` },
        { label: 'Güncel Tutar', value: editFormData.tutari ? `${editFormData.tutari} TL` : '0 TL' },
      ],
      onConfirm: async () => {
        setIsSubmitting(true);
        let cleanTutar = String(editFormData.tutari).trim().replace(/\s+/g, '');
        if (cleanTutar.includes(',') && cleanTutar.includes('.')) {
          cleanTutar = cleanTutar.replace(/\./g, '').replace(',', '.');
        } else if (cleanTutar.includes(',')) {
          cleanTutar = cleanTutar.replace(',', '.');
        }
        const numericTutar = parseFloat(cleanTutar) || 0;

        const res = await updateCompanyEvrak(companyKey, editingRecord.id!, {
          evrak_tarihi: editFormData.evrak_tarihi,
          donem: editFormData.donem,
          evrak_numarasi: trimmedEvrakNo,
          firma_unvani: editFormData.firma_unvani || config?.companyTitle || 'BAYBURT ÖZ-KA İNŞAAT',
          vergi_numarasi: editFormData.vergi_numarasi || null,
          banka_adi: editFormData.banka_adi || null,
          isin_adi: editFormData.isin_adi,
          tutari: numericTutar,
          aciklama: editFormData.aciklama || null,
        });

        setIsSubmitting(false);

        if (res.success) {
          setActionMessage({ text: `"${trimmedEvrakNo}" numaralı evrak başarıyla güncellendi!`, type: 'success' });
          setIsEditModalOpen(false);
          setEditingRecord(null);
          onRecordAdded();
          setTimeout(() => setActionMessage(null), 4000);
        } else {
          setActionMessage({ text: `Güncelleme Hatası: ${res.error}`, type: 'error' });
        }
      },
    });
  };

  // Evrak verilerini eksiksiz ve toleranslı şekilde okuma yardımcısı (Tüm alanların dolu gelmesi için)
  const extractEvrakData = (r: any) => {
    const evrakTarihi = r.evrak_tarihi || r.evraktarihi || r.tarih || '';
    const donem = r.donem || '';
    const evrakNo = r.evrak_numarasi || r.evraknumarasi || r.evrak_no || r.evrakno || '';
    const firmaUnvani = r.firma_unvani || r.firmaunvani || r.unvan || '';
    const vergiNo = r.vergi_numarasi || r.verginumarasi || r.vkn || '';
    const bankaAdi = r.banka_adi || r.bankaadi || r.banka || '';
    const isinAdi = r.isin_adi || r.isinadi || r.is_adi || '';
    let tutar = 0;
    if (typeof r.tutari === 'number') {
      tutar = r.tutari;
    } else if (typeof r.tutar === 'number') {
      tutar = r.tutar;
    } else {
      const raw = String(r.tutari || r.tutar || '0').replace(/\s/g, '');
      let clean = raw;
      if (clean.includes(',') && clean.includes('.')) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) clean = clean.replace(/\./g, '').replace(',', '.');
        else clean = clean.replace(/,/g, '');
      } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
      }
      const parsed = parseFloat(clean);
      tutar = isNaN(parsed) ? 0 : parsed;
    }
    const aciklama = r.aciklama || '';
    return { evrakTarihi, donem, evrakNo, firmaUnvani, vergiNo, bankaAdi, isinAdi, tutar, aciklama };
  };

  // Raporlar için aylara göre gruplama ve özet verileri hesaplama yardımcısı
  const buildMonthlyReportData = (recordsList: any[]) => {
    const sorted = [...recordsList].sort(compareRecordsByMonth);
    const grandTotal = sorted.reduce((sum, r) => sum + extractEvrakData(r).tutar, 0);
    const grandCount = sorted.length;

    interface MonthGroupItem {
      monthName: string;
      monthIndex: number;
      records: any[];
      count: number;
      total: number;
      percent: number;
    }

    const groups: MonthGroupItem[] = [];

    AYLAR.forEach((ay, idx) => {
      const mRecords = sorted.filter((r) => getRecordMonthIndex(r) === idx);
      if (mRecords.length > 0) {
        const mTotal = mRecords.reduce((sum, r) => sum + extractEvrakData(r).tutar, 0);
        groups.push({
          monthName: ay,
          monthIndex: idx,
          records: mRecords,
          count: mRecords.length,
          total: mTotal,
          percent: grandTotal > 0 ? (mTotal / grandTotal) * 100 : 0,
        });
      }
    });

    const otherRecords = sorted.filter((r) => getRecordMonthIndex(r) === 99);
    if (otherRecords.length > 0) {
      const oTotal = otherRecords.reduce((sum, r) => sum + extractEvrakData(r).tutar, 0);
      groups.push({
        monthName: 'DİĞER / BELİRTİLMEYEN',
        monthIndex: 99,
        records: otherRecords,
        count: otherRecords.length,
        total: oTotal,
        percent: grandTotal > 0 ? (oTotal / grandTotal) * 100 : 0,
      });
    }

    return { sorted, grandTotal, grandCount, groups };
  };

  // EXCEL (.xlsx) Dışa Aktarma Fonksiyonu - AYLARA GÖRE GRUPLU, ALT TOPLAMLI VE EN ÜSTTE ÖZETLİ
  const handleExportExcel = () => {
    const exportRecords = records.length > 0 ? records : filteredRecords;
    if (exportRecords.length === 0) {
      setActionMessage({ text: 'Excel olarak indirilecek kayıt bulunmamaktadır.', type: 'error' });
      return;
    }

    const companyName = config?.companyTitle || 'BAYBURT ÖZ-KA İNŞAAT';
    const sanitizedTitle = (config?.shortName || companyName).replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_-]/g, '_');
    const dateStr = new Date().toLocaleDateString('tr-TR');

    const isAll = selectedDonem === 'all';
    const { grandTotal, grandCount, groups } = buildMonthlyReportData(exportRecords);

    const worksheetData: any[][] = [];

    if (isAll) {
      // 1. ÜST BAŞLIK BİLGİLERİ
      worksheetData.push([`${companyName} - EVRAK KAYIT LİSTESİ`]);
      worksheetData.push([`Rapor Tarihi: ${dateStr}`, `Filtre / Kapsam: TÜM DÖNEMLER (OCAK - ARALIK)`]);
      worksheetData.push([]);

      // 2. SAYFANIN EN ÜSTÜNDE AYLARA GÖRE TOPLAM TUTARLAR VE GENEL TOPLAM, ADET SAYISI ÖZETİ
      worksheetData.push(['========================================================================================================']);
      worksheetData.push(['AYLARA GÖRE EVRAK SAYILARI VE TOPLAM TUTARLAR ÖZET TABLOSU']);
      worksheetData.push(['========================================================================================================']);
      worksheetData.push(['DÖNEM / AY', 'EVRAK SAYISI (ADET)', 'TOPLAM TUTAR (TL)', 'GENEL TOPLAMDAKİ PAYI (%)']);

      groups.forEach((g) => {
        worksheetData.push([
          g.monthName,
          `${g.count} Adet`,
          g.total,
          `% ${g.percent.toFixed(2)}`,
        ]);
      });

      // Özet Tablosu Genel Toplam Satırı
      worksheetData.push([
        'GENEL TOPLAM',
        `${grandCount} Adet`,
        grandTotal,
        '% 100.00',
      ]);

      worksheetData.push([]);
      worksheetData.push(['========================================================================================================']);
      worksheetData.push(['DÖNEMLERE GÖRE GRUPLANDIRILMIŞ AYRINTILI EVRAK LİSTESİ VE ALT TOPLAMLAR']);
      worksheetData.push(['========================================================================================================']);
      worksheetData.push([]);

      // 3. DÖNEME GÖRE GURUPLANDIRILMIŞ VE ALT TOPLAMI YAPILMIŞ EVRAK LİSTESİ
      let globalIndex = 1;
      groups.forEach((g) => {
        // Ay Grup Başlığı
        worksheetData.push([
          `>>> ${g.monthName} DÖNEMİ (${g.count} ADET EVRAK - TOPLAM: ${g.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL)`,
        ]);
        worksheetData.push([
          'S.NO',
          'EVRAK TARİHİ',
          'DÖNEM',
          'EVRAK NO',
          'FİRMA ÜNVANI',
          'BANKA ADI',
          'İŞİN ADI / PROJE',
          'TUTAR (TL)',
          'AÇIKLAMA',
        ]);

        g.records.forEach((r) => {
          const row = extractEvrakData(r);
          worksheetData.push([
            globalIndex++,
            row.evrakTarihi,
            row.donem || g.monthName,
            row.evrakNo,
            row.firmaUnvani,
            row.bankaAdi,
            row.isinAdi,
            row.tutar,
            row.aciklama,
          ]);
        });

        // ALT TOPLAM SATIRI
        worksheetData.push([
          '',
          '',
          '',
          '',
          '',
          '',
          `ALT TOPLAM (${g.monthName} DÖNEMİ - ${g.count} Adet):`,
          g.total,
          '',
        ]);
        worksheetData.push([]); // Ayırıcı boş satır
      });

      // EN ALTT GENEL TOPLAM
      worksheetData.push([
        '',
        '',
        '',
        '',
        '',
        '',
        `GENEL TOPLAM (TÜM DÖNEMLER - ${grandCount} Adet):`,
        grandTotal,
        '',
      ]);
    } else {
      // Tek bir dönem seçilmişse
      const selectedRecords = filteredRecords.length > 0 ? filteredRecords : exportRecords;
      const monthTotal = selectedRecords.reduce((sum, r) => sum + extractEvrakData(r).tutar, 0);

      worksheetData.push([`${companyName} - EVRAK KAYIT LİSTESİ`]);
      worksheetData.push([
        `Rapor Tarihi: ${dateStr}`,
        `Dönem: ${selectedDonem}`,
        `Kayıt Sayısı: ${selectedRecords.length} Adet`,
        `Toplam Tutar: ${monthTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`,
      ]);
      worksheetData.push([]);
      worksheetData.push([
        'S.NO',
        'EVRAK TARİHİ',
        'DÖNEM',
        'EVRAK NO',
        'FİRMA ÜNVANI',
        'BANKA ADI',
        'İŞİN ADI / PROJE',
        'TUTAR (TL)',
        'AÇIKLAMA',
      ]);

      selectedRecords.forEach((r, idx) => {
        const row = extractEvrakData(r);
        worksheetData.push([
          idx + 1,
          row.evrakTarihi,
          row.donem || selectedDonem,
          row.evrakNo,
          row.firmaUnvani,
          row.bankaAdi,
          row.isinAdi,
          row.tutar,
          row.aciklama,
        ]);
      });

      worksheetData.push([
        '',
        '',
        '',
        '',
        '',
        '',
        `TOPLAM (${selectedDonem} - ${selectedRecords.length} Adet):`,
        monthTotal,
        '',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!cols'] = [
      { wch: 8 },  // S.NO
      { wch: 15 }, // EVRAK TARİHİ
      { wch: 14 }, // DÖNEM
      { wch: 22 }, // EVRAK NO
      { wch: 38 }, // FİRMA ÜNVANI
      { wch: 22 }, // BANKA ADI
      { wch: 32 }, // İŞİN ADI / PROJE
      { wch: 20 }, // TUTAR
      { wch: 30 }, // AÇIKLAMA
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isAll ? 'Dönem Bazlı Evraklar' : selectedDonem);

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizedTitle}_${isAll ? 'Tum_Donemler_Gruplu' : selectedDonem}_Evrak_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setActionMessage({
      text: `${exportRecords.length} adet evrak döneme göre gruplandırılmış, alt toplamlı ve özet tablolu olarak Excel (.xlsx) indirildi.`,
      type: 'success',
    });
  };

  // PDF Rapor & Yazdırma Fonksiyonu - YATAY SAYFA, BANKA ADINA GÖRE GURUPLU, TUTARI KÜÇÜKTEN BÜYÜĞE SIRALI VE GÖZ ALICI
  const handleExportPDF = () => {
    const isAll = selectedDonem === 'all';
    
    // Dönem seçiliyken o ayın çeklerini al
    // İŞİN ADI PROJE ŞANTİYE LİSTBOKSUNDA HANGİ İŞİN ADI SEÇİLİYSE PDF İNDİR E TIKLANINCA O İŞİN ADI PDF RAPORUNDA VERİLSİN
    let targetRecords: SupabaseEvrakRow[] = [];
    if (selectedIsinAdiFilter) {
      // İşin Adı listboksunda bir iş seçilmişse o işin adına ve seçili döneme ait kayıtları al
      const byProject = records.filter(
        (r) => (extractEvrakData(r).isinAdi || '').trim().toLocaleUpperCase('tr-TR') === selectedIsinAdiFilter.trim().toLocaleUpperCase('tr-TR')
      );
      const monthFiltered = !isAll ? byProject.filter((r) => matchesMonth(r, selectedDonem)) : byProject;
      if (searchTerm.trim() && filteredRecords.length > 0) {
        targetRecords = filteredRecords;
      } else {
        targetRecords = monthFiltered;
      }
    } else if (!isAll) {
      const monthAll = records.filter((r) => matchesMonth(r, selectedDonem));
      if (searchTerm.trim() && filteredRecords.length > 0) {
        // Eğer arama yapılmışsa aramayla eşleşen o ayın çekleri
        const matching = filteredRecords.filter((r) => matchesMonth(r, selectedDonem));
        targetRecords = matching.length > 0 ? matching : monthAll;
      } else {
        targetRecords = monthAll;
      }
    } else {
      targetRecords = (searchTerm.trim() && filteredRecords.length > 0) ? filteredRecords : (records.length > 0 ? records : filteredRecords);
    }

    if (targetRecords.length === 0) {
      setActionMessage({
        text: selectedIsinAdiFilter
          ? `"${selectedIsinAdiFilter}" işi için ${!isAll ? selectedDonem + ' döneminde' : 'tabloda'} PDF olarak indirilecek çek kaydı bulunmamaktadır.`
          : `${!isAll ? selectedDonem + ' ayında' : 'Tabloda'} PDF olarak indirilecek çek kaydı bulunmamaktadır.`,
        type: 'error',
      });
      return;
    }

    const companyName = config?.companyTitle || 'BAYBURT ÖZ-KA İNŞAAT';
    const dateStr = new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Evrak verilerini eksiksiz parse et
    const parsedList = targetRecords.map((r) => {
      const data = extractEvrakData(r);
      let bankName = (data.bankaAdi || '').trim();
      if (!bankName) {
        bankName = 'DİĞER / BANKA BELİRTİLMEYEN';
      } else {
        bankName = bankName.toLocaleUpperCase('tr-TR');
      }
      return {
        ...data,
        normalizedBank: bankName,
        raw: r,
      };
    });

    // 2. Genel Toplam ve Adet
    const grandTotal = parsedList.reduce((sum, item) => sum + item.tutar, 0);
    const grandCount = parsedList.length;

    // 3. BANKA ADINA GÖRE GURUPLANDIRMA
    const bankMap = new Map<string, typeof parsedList>();
    parsedList.forEach((item) => {
      if (!bankMap.has(item.normalizedBank)) {
        bankMap.set(item.normalizedBank, []);
      }
      bankMap.get(item.normalizedBank)!.push(item);
    });

    interface BankGroupData {
      bankName: string;
      items: typeof parsedList;
      count: number;
      total: number;
      percent: number;
      avgTutar: number;
    }

    const bankGroups: BankGroupData[] = [];

    bankMap.forEach((items, bankName) => {
      // 4. TUTARI KÜÇÜKTEN BÜYÜĞE SIRALASIN (Ascending: En küçük tutarlı çekten en büyüğe)
      items.sort((a, b) => {
        if (a.tutar !== b.tutar) {
          return a.tutar - b.tutar; // Küçükten büyüğe sıralama
        }
        // Tutar eşitse tarihe göre
        const dateComp = (a.evrakTarihi || '').localeCompare(b.evrakTarihi || '');
        if (dateComp !== 0) return dateComp;
        // Tarih de eşitse evrak numarasına göre
        return (a.evrakNo || '').localeCompare(b.evrakNo || '', 'tr-TR', { numeric: true });
      });

      const bTotal = items.reduce((sum, it) => sum + it.tutar, 0);
      bankGroups.push({
        bankName,
        items,
        count: items.length,
        total: bTotal,
        percent: grandTotal > 0 ? (bTotal / grandTotal) * 100 : 0,
        avgTutar: items.length > 0 ? bTotal / items.length : 0,
      });
    });

    // Bankaları alfabetik sırala ("DİĞER" grubu en sonda kalsın)
    bankGroups.sort((a, b) => {
      const isOtherA = a.bankName.startsWith('DİĞER');
      const isOtherB = b.bankName.startsWith('DİĞER');
      if (isOtherA && !isOtherB) return 1;
      if (!isOtherA && isOtherB) return -1;
      return a.bankName.localeCompare(b.bankName, 'tr-TR');
    });

    // 4.b İŞİN ADI (PROJE / ŞANTİYE) GÖRE GURUPLANDIRMA VE İCMAL
    // PDF RAPOR İNDİRDİĞİNDE İŞİN ADI RAPORUDA BAŞINDA VERSİN HER İŞİN ADINI TOPLAM TUTARINI KARŞISINA YAZSIN
    const isinAdiMap = new Map<string, typeof parsedList>();
    parsedList.forEach((item) => {
      const pRaw = (item.isinAdi || '').trim();
      const pName = pRaw ? pRaw.toLocaleUpperCase('tr-TR') : 'DİĞER / BELİRTİLMEYEN PROJE';
      if (!isinAdiMap.has(pName)) {
        isinAdiMap.set(pName, []);
      }
      isinAdiMap.get(pName)!.push(item);
    });

    interface IsinAdiSummaryData {
      isinAdi: string;
      items: typeof parsedList;
      count: number;
      total: number;
      percent: number;
      avgTutar: number;
    }

    const isinAdiSummaries: IsinAdiSummaryData[] = [];
    isinAdiMap.forEach((items, isinAdi) => {
      const pTotal = items.reduce((sum, it) => sum + it.tutar, 0);
      isinAdiSummaries.push({
        isinAdi,
        items,
        count: items.length,
        total: pTotal,
        percent: grandTotal > 0 ? (pTotal / grandTotal) * 100 : 0,
        avgTutar: items.length > 0 ? pTotal / items.length : 0,
      });
    });

    // İşin toplam tutarına göre azalan sırada (en yüksek tutarlı işten en küçüğe)
    isinAdiSummaries.sort((a, b) => b.total - a.total);

    // Sayfa Başlığı ve Kapsam Tanımı (Seçili İşin Adı varsa başlığa ekle)
    const periodTitle = isAll ? 'TÜM DÖNEMLER' : `${selectedDonem} DÖNEMİ`;
    const selectedProjectTitle = selectedIsinAdiFilter ? ` - ${selectedIsinAdiFilter.trim()}` : '';
    const reportMainTitle = `${companyName}${selectedProjectTitle} - ${periodTitle} ÇEK LİSTESİ VE BANKA DAĞILIM RAPORU`;

    // Tarih Formatlayıcı (YYYY-MM-DD -> DD.MM.YYYY)
    const formatPrintDate = (rawDate: string | null | undefined): string => {
      if (!rawDate) return '-';
      const parts = String(rawDate).trim().split(/[-./]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[2]}.${parts[1]}.${parts[0]}`;
        if (parts[2].length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
      return String(rawDate);
    };

    // Para birimi formatlayıcı
    const fmtTl = (val: number): string => {
      return (
        val.toLocaleString('tr-TR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + ' TL'
      );
    };

    // HTML Rapor Şablonu Oluşturma
    const reportHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>${reportMainTitle}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 7mm 8mm 7mm 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background-color: #f8fafc;
            color: #0f172a;
            padding: 16px;
            font-size: 8pt;
            line-height: 1.35;
          }
          
          /* Üst Kontrol / Yazdır Çubuğu (Baskıda Gizlenir) */
          .no-print {
            position: sticky;
            top: 0;
            z-index: 9999;
            margin-bottom: 16px;
            padding: 12px 18px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border: 1px solid #334155;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            color: #fff;
          }
          .no-print-info {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 9.5pt;
          }
          .no-print-badge {
            background: #2563eb;
            color: #fff;
            padding: 3px 10px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 8.5pt;
            letter-spacing: 0.5px;
          }
          .no-print-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 22px;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            border: 1px solid #60a5fa;
            border-radius: 8px;
            font-weight: 800;
            font-size: 9.5pt;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            transition: all 0.2s;
          }
          .no-print-btn:hover {
            transform: translateY(-1px);
            background: #1d4ed8;
          }
          .no-print-close {
            padding: 8px 14px;
            background: #334155;
            color: #cbd5e1;
            border: 1px solid #475569;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            margin-left: 8px;
          }
          .no-print-close:hover {
            background: #475569;
            color: #fff;
          }

          /* Ana Rapor Çerçevesi */
          .report-container {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 16px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }

          /* Üst Kurumsal Başlık */
          .report-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding-bottom: 12px;
            border-bottom: 3px double #1e3a8a;
            margin-bottom: 14px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .brand-logo-icon {
            width: 48px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            padding: 2px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          }
          .brand-logo-icon img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .brand-title {
            font-size: 15pt;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .brand-subtitle {
            font-size: 8.5pt;
            font-weight: 700;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 2px;
          }
          .brand-detail {
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 2px;
          }
          .header-meta {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 3px;
          }
          .period-pill {
            display: inline-block;
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: #ffffff;
            padding: 4px 14px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 9.5pt;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 6px rgba(30, 58, 138, 0.25);
          }
          .meta-text {
            font-size: 7.5pt;
            color: #475569;
          }
          .meta-bold {
            font-weight: 700;
            color: #0f172a;
          }

          /* 4 Kolonlu Yönetici Özet Kartları */
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 14px;
          }
          .kpi-card {
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 12px;
            position: relative;
            overflow: hidden;
          }
          .kpi-card::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
          }
          .kpi-blue::before { background: #2563eb; }
          .kpi-amber::before { background: #d97706; }
          .kpi-emerald::before { background: #059669; }
          .kpi-purple::before { background: #7c3aed; }
          
          .kpi-label {
            font-size: 7pt;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          .kpi-value {
            font-size: 13pt;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .kpi-sub {
            font-size: 7pt;
            color: #64748b;
            margin-top: 1px;
            font-weight: 500;
          }

          /* İşin Adı / Proje Dağılım İcmal Tablosu */
          .project-summary-section {
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            margin-bottom: 14px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .project-summary-title {
            background: linear-gradient(135deg, #0f274a 0%, #1e3a8a 100%);
            color: #ffffff;
            padding: 6px 12px;
            font-size: 8.5pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .project-summary-table {
            width: 100%;
            border-collapse: collapse;
          }
          .project-summary-table th {
            background: #e2e8f0;
            color: #1e293b;
            font-size: 7.5pt;
            font-weight: 700;
            text-align: left;
            padding: 5px 8px;
            border-bottom: 1.5px solid #cbd5e1;
          }
          .project-summary-table td {
            padding: 5px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 7.5pt;
            vertical-align: middle;
          }
          .project-summary-table tr:nth-child(even) td {
            background-color: #f1f5f9;
          }
          .project-summary-table .summary-total-row td {
            background: #e0f2fe !important;
            font-weight: 800;
            color: #0c4a6e;
            border-top: 2px solid #0284c7;
            font-size: 8pt;
          }

          /* Banka Dağılım İcmal Tablosu */
          .bank-summary-section {
            background: #f8fafc;
            border: 1.5px solid #bfdbfe;
            border-radius: 8px;
            margin-bottom: 14px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .bank-summary-title {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
            color: #ffffff;
            padding: 6px 12px;
            font-size: 8.5pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .bank-summary-table {
            width: 100%;
            border-collapse: collapse;
          }
          .bank-summary-table th {
            background: #e2e8f0;
            color: #1e293b;
            font-size: 7.5pt;
            font-weight: 700;
            text-align: left;
            padding: 5px 8px;
            border-bottom: 1.5px solid #cbd5e1;
          }
          .bank-summary-table td {
            padding: 5px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 7.5pt;
            vertical-align: middle;
          }
          .bank-summary-table tr:nth-child(even) td {
            background-color: #f1f5f9;
          }
          .bank-summary-table .summary-total-row td {
            background: #dbeafe !important;
            font-weight: 800;
            color: #1e3a8a;
            border-top: 2px solid #2563eb;
            font-size: 8pt;
          }

          /* Banka Bazlı Guruplandırılmış Çek Tabloları */
          .bank-group-card {
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 8px;
            margin-bottom: 12px;
            overflow: hidden;
            page-break-inside: avoid;
            box-shadow: 0 1px 4px rgba(0,0,0,0.02);
          }
          .bank-group-header {
            background: linear-gradient(90deg, #0f2b5c 0%, #1e3a8a 50%, #2563eb 100%);
            color: #ffffff;
            padding: 6px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .bank-group-name {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 9pt;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .bank-group-stats {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 7.5pt;
          }
          .bank-badge {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.4);
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 700;
            letter-spacing: 0.3px;
          }

          /* Çek Kayıtları Tablosu */
          table.checks-table {
            width: 100%;
            border-collapse: collapse;
          }
          table.checks-table th {
            background: #f1f5f9;
            color: #334155;
            font-size: 7pt;
            font-weight: 700;
            text-align: left;
            padding: 5px 6px;
            border-bottom: 1.5px solid #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          table.checks-table td {
            padding: 4px 6px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 7.5pt;
            vertical-align: middle;
            color: #1e293b;
          }
          table.checks-table tr:nth-child(even) td {
            background-color: #fafbfc;
          }
          .evrak-no-tag {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-weight: 800;
            color: #1e40af;
            background: #eff6ff;
            padding: 1.5px 6px;
            border-radius: 4px;
            border: 1px solid #bfdbfe;
            display: inline-block;
          }
          .amount-cell {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-weight: 800;
            text-align: right;
            color: #0f172a;
            white-space: nowrap;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: 700; }

          /* Banka Alt Toplam Satırı */
          .bank-subtotal-row td {
            background: #f0f7ff !important;
            color: #1e3a8a;
            font-weight: 800;
            border-top: 1.5px solid #60a5fa;
            border-bottom: 2px solid #2563eb;
            font-size: 8pt;
            padding: 6px 8px;
          }

          /* Sayfa Altı Genel Toplam Bandı */
          .grand-total-banner {
            margin-top: 14px;
            background: linear-gradient(135deg, #0b1f44 0%, #1e3a8a 100%);
            color: #ffffff;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 10px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 12px rgba(11, 31, 68, 0.25);
            page-break-inside: avoid;
          }
          .grand-total-title {
            font-size: 10pt;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .grand-total-sub {
            font-size: 7.5pt;
            color: #93c5fd;
            margin-top: 1px;
          }
          .grand-total-amount {
            font-size: 14pt;
            font-weight: 900;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.15);
            padding: 4px 14px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            letter-spacing: 0.5px;
          }

          /* Yetkili Kaşe & İmza Alanı */
          .signature-section {
            margin-top: 16px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            page-break-inside: avoid;
          }
          .signature-box {
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            padding: 8px 12px;
            background: #ffffff;
            text-align: center;
          }
          .signature-title {
            font-size: 7.5pt;
            font-weight: 700;
            color: #1e3a8a;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 28px;
          }
          .signature-name {
            font-size: 7pt;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
          }

          /* Dipnot */
          .report-footer {
            margin-top: 12px;
            padding-top: 6px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 7pt;
            color: #64748b;
            page-break-inside: avoid;
          }

          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
            .report-container {
              border: none;
              padding: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <!-- Üst Yazdır / PDF İndir Çubuğu (Baskıda Görünmez) -->
        <div class="no-print">
          <div class="no-print-info">
            <span class="no-print-badge">YATAY A4 RAPOR</span>
            <span><strong>${periodTitle}</strong> Çek Listesi ${selectedIsinAdiFilter ? `• <span style="background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 800;">🏗️ İŞİN ADI: ${selectedIsinAdiFilter}</span>` : ''} • Banka Gruplu ve Tutara Göre Küçükten Büyüğe Sıralı</span>
            <span style="color: #94a3b8; font-size: 8pt;">(Hedef: "PDF Olarak Kaydet / Save as PDF", Düzen: "Yatay")</span>
          </div>
          <div>
            <button class="no-print-btn" onclick="window.print()">
              🖨️ PDF Olarak Kaydet / Yazdır
            </button>
            <button class="no-print-close" onclick="window.close()">Kapat</button>
          </div>
        </div>

        <div class="report-container">
          <!-- Üst Kurumsal Başlık -->
          <div class="report-header">
            <div class="brand-box">
              <div class="brand-logo-icon">
                <img src="${OZKA_LOGO_DATA_URL}" alt="${companyName} Logo" />
              </div>
              <div>
                <div class="brand-title">${companyName}</div>
                <div class="brand-subtitle">Resmi Çek Portföyü ve Banka Dağılım Raporu</div>
                ${selectedIsinAdiFilter ? `
                  <div style="margin-top: 5px; display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; border: 1.5px solid #2563eb; color: #1e3a8a; padding: 3px 10px; border-radius: 6px; font-weight: 800; font-size: 9pt;">
                    <span>🏗️ İŞİN ADI (PROJE / ŞANTİYE):</span>
                    <span style="color: #0f172a; text-decoration: underline;">${selectedIsinAdiFilter}</span>
                  </div>
                ` : `
                  <div class="brand-detail">Banka Bazında Gruplandırılmış ve Çek Tutarına Göre Küçükten Büyüğe Sıralanmış Mali İcmal</div>
                `}
              </div>
            </div>
            <div class="header-meta">
              ${selectedIsinAdiFilter ? `
                <div style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: #ffffff; padding: 3px 12px; border-radius: 6px; font-weight: 800; font-size: 8.5pt; margin-bottom: 3px; box-shadow: 0 2px 5px rgba(13,148,136,0.25);">
                  🏗️ ${selectedIsinAdiFilter}
                </div>
              ` : ''}
              <div class="period-pill">${periodTitle} ÇEKLERİ</div>
              <div class="meta-text">Rapor Tarihi: <span class="meta-bold">${dateStr}</span></div>
              <div class="meta-text">Toplam Çek Portföyü: <span class="meta-bold">${grandCount} Adet</span></div>
              <div class="meta-text">Genel Toplam Tutar: <span class="meta-bold" style="color: #1e3a8a;">${fmtTl(grandTotal)}</span></div>
            </div>
          </div>

          <!-- 4 Kolonlu Yönetici Özet Kartları -->
          <div class="kpi-grid">
            <div class="kpi-card kpi-blue">
              <div class="kpi-label">${selectedIsinAdiFilter ? 'Seçili İş / Kapsam' : 'Seçili Dönem / Kapsam'}</div>
              <div class="kpi-value" style="${selectedIsinAdiFilter ? 'font-size: 10.5pt; color: #1e3a8a; word-break: break-word;' : ''}">${selectedIsinAdiFilter ? `🏗️ ${selectedIsinAdiFilter}` : periodTitle}</div>
              <div class="kpi-sub">${selectedIsinAdiFilter ? `Dönem: ${periodTitle}` : 'Mali Dönem Çek İcmali'}</div>
            </div>
            <div class="kpi-card kpi-amber">
              <div class="kpi-label">Toplam Çek Adedi</div>
              <div class="kpi-value">${grandCount} <span style="font-size: 8.5pt; font-weight: normal; color: #475569;">Adet Çek</span></div>
              <div class="kpi-sub">${bankGroups.length} Farklı Banka Portföyü</div>
            </div>
            <div class="kpi-card kpi-emerald">
              <div class="kpi-label">Genel Toplam Tutar</div>
              <div class="kpi-value" style="color: #047857;">${fmtTl(grandTotal)}</div>
              <div class="kpi-sub">Net Vade Tutarı</div>
            </div>
            <div class="kpi-card kpi-purple">
              <div class="kpi-label">Ortalama Çek Tutarı</div>
              <div class="kpi-value">${fmtTl(grandCount > 0 ? grandTotal / grandCount : 0)}</div>
              <div class="kpi-sub">Birim Çek Ortalaması</div>
            </div>
          </div>

          <!-- İŞİN ADI (PROJE / ŞANTİYE) DAĞILIM VE MALİ İCMAL TABLOSU -->
          <!-- PDF RAPOR İNDİRDİĞİNDE İŞİN ADI RAPORUDA BAŞINDA VERSİN HER İŞİN ADINI TOPLAM TUTARINI KARŞISINA YAZSIN -->
          <div class="project-summary-section">
            <div class="project-summary-title">
              <span>🏗️ ${selectedIsinAdiFilter ? `SEÇİLİ İŞİN ADI RAPORU: "${selectedIsinAdiFilter}"` : `İŞİN ADI (PROJE / ŞANTİYE) DAĞILIM VE MALİ İCMALİ (${isinAdiSummaries.length} PROJE)`}</span>
              <span>Dönem Net Tutarı: ${fmtTl(grandTotal)}</span>
            </div>
            <table class="project-summary-table">
              <thead>
                <tr>
                  <th style="width: 35px;" class="center">#</th>
                  <th>İşin Adı / Proje / Şantiye</th>
                  <th style="width: 110px;" class="center">Çek Sayısı</th>
                  <th style="width: 150px;" class="right">İşin Toplam Tutarı</th>
                  <th style="width: 130px;" class="right">Ortalama Tutar</th>
                  <th style="width: 100px;" class="right">Portföy Payı (%)</th>
                </tr>
              </thead>
              <tbody>
                ${isinAdiSummaries.map((is, idx) => `
                  <tr style="${selectedIsinAdiFilter && is.isinAdi.toLocaleUpperCase('tr-TR') === selectedIsinAdiFilter.toLocaleUpperCase('tr-TR') ? 'background: #eff6ff !important; font-weight: 800;' : ''}">
                    <td class="center" style="color: #64748b;">${idx + 1}</td>
                    <td class="bold" style="color: #0f274a;">
                      🏗️ ${is.isinAdi}
                      ${selectedIsinAdiFilter && is.isinAdi.toLocaleUpperCase('tr-TR') === selectedIsinAdiFilter.toLocaleUpperCase('tr-TR') ? ' <span style="background: #2563eb; color: #fff; padding: 1.5px 6px; border-radius: 4px; font-size: 7pt; margin-left: 6px;">SEÇİLİ İŞ</span>' : ''}
                    </td>
                    <td class="center"><span style="font-family: monospace; font-weight: 700;">${is.count} Adet</span></td>
                    <td class="amount-cell" style="color: #1e3a8a; font-weight: 800; font-size: 8.5pt;">${fmtTl(is.total)}</td>
                    <td class="amount-cell" style="color: #475569; font-weight: 600;">${fmtTl(is.avgTutar)}</td>
                    <td class="right" style="font-family: monospace; font-weight: 700; color: #1e40af;">% ${is.percent.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="summary-total-row">
                  <td class="center">Σ</td>
                  <td>${selectedIsinAdiFilter ? `SEÇİLİ İŞ TOPLAMI (${selectedIsinAdiFilter})` : `GENEL PROJE TOPLAMI (${periodTitle})`}</td>
                  <td class="center font-mono">${grandCount} Adet Çek</td>
                  <td class="amount-cell" style="color: #1e3a8a; font-weight: 900;">${fmtTl(grandTotal)}</td>
                  <td class="amount-cell" style="color: #1e3a8a;">${fmtTl(grandCount > 0 ? grandTotal / grandCount : 0)}</td>
                  <td class="right font-mono">% 100.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Banka Dağılım İcmal Tablosu -->
          <div class="bank-summary-section">
            <div class="bank-summary-title">
              <span>📊 BANKA DAĞILIM VE AĞIRLIK İCMALİ (${bankGroups.length} BANKA)</span>
              <span>Dönem Net Tutarı: ${fmtTl(grandTotal)}</span>
            </div>
            <table class="bank-summary-table">
              <thead>
                <tr>
                  <th style="width: 35px;" class="center">#</th>
                  <th>Banka Adı</th>
                  <th style="width: 110px;" class="center">Çek Sayısı</th>
                  <th style="width: 140px;" class="right">Banka Toplam Tutarı</th>
                  <th style="width: 130px;" class="right">Ortalama Tutar</th>
                  <th style="width: 100px;" class="right">Portföy Payı (%)</th>
                </tr>
              </thead>
              <tbody>
                ${bankGroups.map((bg, idx) => `
                  <tr>
                    <td class="center" style="color: #64748b;">${idx + 1}</td>
                    <td class="bold" style="color: #1e3a8a;">🏛️ ${bg.bankName}</td>
                    <td class="center"><span style="font-family: monospace; font-weight: 700;">${bg.count} Adet</span></td>
                    <td class="amount-cell" style="color: #0f172a;">${fmtTl(bg.total)}</td>
                    <td class="amount-cell" style="color: #475569; font-weight: 600;">${fmtTl(bg.avgTutar)}</td>
                    <td class="right" style="font-family: monospace; font-weight: 700; color: #1e40af;">% ${bg.percent.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="summary-total-row">
                  <td class="center">Σ</td>
                  <td>GENEL TOPLAM (${periodTitle})</td>
                  <td class="center font-mono">${grandCount} Adet Çek</td>
                  <td class="amount-cell" style="color: #1e3a8a;">${fmtTl(grandTotal)}</td>
                  <td class="amount-cell" style="color: #1e3a8a;">${fmtTl(grandCount > 0 ? grandTotal / grandCount : 0)}</td>
                  <td class="right font-mono">% 100.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- BANKA ADINA GÖRE GURUPLANDIRILMIŞ VE TUTARI KÜÇÜKTEN BÜYÜĞE SIRALANMIŞ ÇEK LİSTELERİ -->
          <div style="margin-top: 14px; margin-bottom: 8px;">
            <div style="font-size: 8.5pt; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">
              📋 BANKALARA GÖRE AYRINTILI ÇEK DÖKÜMÜ (TUTARLAR KÜÇÜKTEN BÜYÜĞE SIRALI)
            </div>
          </div>

          ${bankGroups.map((bg) => {
            let rowIdx = 1;
            return `
              <div class="bank-group-card">
                <div class="bank-group-header">
                  <div class="bank-group-name">
                    <span>🏛️ ${bg.bankName}</span>
                  </div>
                  <div class="bank-group-stats">
                    <span class="bank-badge">${bg.count} Adet Çek</span>
                    <span class="bank-badge">Banka Toplamı: ${fmtTl(bg.total)}</span>
                    <span class="bank-badge">Pay: %${bg.percent.toFixed(2)}</span>
                  </div>
                </div>
                <table class="checks-table">
                  <thead>
                    <tr>
                      <th style="width: 25px;" class="center">#</th>
                      <th style="width: 100px;">Çek / Evrak No</th>
                      <th style="width: 75px;">Vade Tarihi</th>
                      <th style="width: 55px;" class="center">Dönem</th>
                      <th style="width: 240px;">Firma Ünvanı (Keşideci)</th>
                      <th style="width: 180px;">İşin Adı / Proje</th>
                      <th style="width: 120px;" class="right">Tutar (TL) <span style="font-size: 6.5pt; color: #2563eb;">(▲ Artan)</span></th>
                      <th>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${bg.items.map((item) => `
                      <tr>
                        <td class="center" style="color: #64748b; font-size: 7pt;">${rowIdx++}</td>
                        <td><span class="evrak-no-tag">${item.evrakNo || '-'}</span></td>
                        <td>${formatPrintDate(item.evrakTarihi)}</td>
                        <td class="center bold" style="color: #1e40af;">${item.donem || selectedDonem}</td>
                        <td class="bold" style="color: #0f172a;">${item.firmaUnvani || '-'}</td>
                        <td style="color: #334155;">${item.isinAdi || '-'}</td>
                        <td class="amount-cell">${fmtTl(item.tutar)}</td>
                        <td style="color: #64748b; font-size: 7pt;">${item.aciklama || '-'}</td>
                      </tr>
                    `).join('')}
                    <!-- BANKA ALT TOPLAM SATIRI -->
                    <tr class="bank-subtotal-row">
                      <td colspan="6" class="right">
                        ${bg.bankName} ALT TOPLAMI (${bg.count} ADET ÇEK):
                      </td>
                      <td class="amount-cell" style="color: #1e3a8a; font-size: 8.5pt;">
                        ${fmtTl(bg.total)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}

          <!-- GENEL TOPLAM BANDI -->
          <div class="grand-total-banner">
            <div>
              <div class="grand-total-title">${selectedIsinAdiFilter ? `${selectedIsinAdiFilter} • ` : ''}${periodTitle} GENEL ÇEK TOPLAMI</div>
              <div class="grand-total-sub">${grandCount} Adet Çek ${selectedIsinAdiFilter ? `(Sadece "${selectedIsinAdiFilter}" Projesine Ait)` : ''} • ${bankGroups.length} Farklı Banka Portföyü</div>
            </div>
            <div class="grand-total-amount">
              ${fmtTl(grandTotal)}
            </div>
          </div>

          <!-- YETKİLİ KAŞE & İMZA ALANI -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-title">HAZIRLAYAN</div>
              <div class="signature-name">Muhasebe & Finans Yetkilisi<br>İmza</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">KONTROL EDEN</div>
              <div class="signature-name">Mali İşler Müdürü<br>İmza</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">ONAYLAYAN</div>
              <div class="signature-name">Genel Müdürlük / Şirket Yetkilisi<br>Kaşe & İmza</div>
            </div>
          </div>

          <!-- DİPNOT -->
          <div class="report-footer">
            <span>Kaynak: ${companyName} Resmi Çek Takip Sistemi ${selectedIsinAdiFilter ? `• Seçili İş: ${selectedIsinAdiFilter}` : ''}</span>
            <span>Rapor Kodu: RAP-${new Date().getFullYear()}-${periodTitle.replace(/\s+/g, '_')}${selectedIsinAdiFilter ? `_${encodeURIComponent(selectedIsinAdiFilter.slice(0, 8))}` : ''}</span>
            <span>Sayfa Düzeni: Yatay (A4 Landscape) • Çıktı Alma Zamanı: ${dateStr}</span>
          </div>
        </div>

        <script>
          // Sayfa yüklendiğinde otomatik olarak yazdırma penceresini aç
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    // 5. Yazdırma / PDF İndirme Penceresini Açma
    let printWindow: Window | null = null;
    try {
      printWindow = window.open('', '_blank');
    } catch (e) {
      printWindow = null;
    }

    if (printWindow && printWindow.document) {
      printWindow.document.open();
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setActionMessage({
        text: selectedIsinAdiFilter
          ? `"${selectedIsinAdiFilter}" işine ait ${periodTitle} çekleri banka gruplu ve sıralı olarak Yatay PDF rapor penceresinde açıldı.`
          : `${periodTitle} çekleri banka bazında gruplandırılmış, tutarı küçükten büyüğe sıralanmış olarak Yatay PDF rapor penceresinde açıldı.`,
        type: 'success',
      });
    } else {
      // Popup engellendiğinde gizli iframe ile yazdırma desteği
      let printFrame = document.getElementById('report-pdf-print-frame') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'report-pdf-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.style.zIndex = '-9999';
        document.body.appendChild(printFrame);
      }
      const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(reportHtml);
        frameDoc.close();
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (err) {
            console.error('Yazdırma hatası:', err);
          }
        }, 400);
        setActionMessage({
          text: `${periodTitle} çekleri için Yatay PDF yazdırma penceresi hazırlandı. "PDF Olarak Kaydet" seçeneğini kullanabilirsiniz.`,
          type: 'success',
        });
      }
    }
  };

  // BÜTÜN FİRMALAR PDF RAPORU FONKSİYONU
  // - Firma Firma Ayırır ve Alt Toplamlarını Alır
  // - En Üste Firma Firma Tutarlarını ve Banka Banka İcmallerini Koyar
  // - Sayfa Yatay A4 (Landscape)
  // - Göz Alıcı, Şık Tasarım ve Resmi Öz-Ka Logosu
  // - Toplam Adet ve Toplam Tutarı Vurgular
  // - Banka Adına Göre Guruplandırır
  // - Tutarı Küçükten Büyüğe Sıralar
  const handleExportAllCompaniesPDF = async () => {
    // Seçili şirket kontrolü: Hiçbir şirket seçilmemişse uyarı ver
    if (selectedCompaniesForReport && selectedCompaniesForReport.size === 0) {
      setActionMessage({
        text: 'Lütfen raporda listelenecek en az bir şantiye/ortaklık seçiniz (Sol menüdeki şantiye tik kutucuklarını işaretleyin).',
        type: 'error',
      });
      return;
    }

    setIsExportingAllCompaniesPDF(true);
    try {
      // 1. Tüm şirketlerin verilerini Supabase veritabanından çek
      const allResults = await fetchAllCompaniesEvraklar();
      const isAll = selectedDonem === 'all';
      const periodTitle = isAll ? 'TÜM DÖNEMLER' : `${selectedDonem} DÖNEMİ`;

      // Şantiye & Ortaklık Listesindeki tik kutucuklarına göre sadece seçili olan şirketleri filtrele
      const targetCompanyKeys = selectedCompaniesForReport && selectedCompaniesForReport.size > 0
        ? selectedCompaniesForReport
        : null;

      const filteredCompanyResults = targetCompanyKeys
        ? allResults.filter((compRes) => targetCompanyKeys.has(compRes.companyKey as CompanyKey))
        : allResults;

      interface ConsolidatedCheckItem {
        companyKey: string;
        companyTitle: string;
        shortName: string;
        evrakTarihi: string;
        donem: string;
        evrakNo: string;
        firmaUnvani: string;
        vergiNo: string;
        bankaAdi: string;
        normalizedBank: string;
        isinAdi: string;
        tutar: number;
        aciklama: string;
      }

      const allItems: ConsolidatedCheckItem[] = [];

      filteredCompanyResults.forEach((compRes) => {
        const compConfig = compRes.config || SUPABASE_COMPANY_TABLES[compRes.companyKey];
        const compTitle = compConfig?.companyTitle || compRes.companyKey;
        const shortName = compConfig?.shortName || compTitle;

        const filtered = isAll
          ? compRes.records
          : compRes.records.filter((r) => matchesMonth(r, selectedDonem));

        // Eğer İşin Adı listboksunda bir iş seçilmişse konsolide raporda da bu işe ait kayıtları filtrele
        const finalFiltered = selectedIsinAdiFilter
          ? filtered.filter((r) => (extractEvrakData(r).isinAdi || '').trim().toLocaleUpperCase('tr-TR') === selectedIsinAdiFilter.trim().toLocaleUpperCase('tr-TR'))
          : filtered;

        finalFiltered.forEach((r) => {
          const parsed = extractEvrakData(r);
          let bankName = (parsed.bankaAdi || '').trim();
          if (!bankName) {
            bankName = 'DİĞER / BANKA BELİRTİLMEYEN';
          } else {
            bankName = bankName.toLocaleUpperCase('tr-TR');
          }

          allItems.push({
            companyKey: compRes.companyKey,
            companyTitle: compTitle,
            shortName: shortName,
            evrakTarihi: parsed.evrakTarihi,
            donem: parsed.donem || (isAll ? '-' : selectedDonem),
            evrakNo: parsed.evrakNo,
            firmaUnvani: parsed.firmaUnvani || compTitle,
            vergiNo: parsed.vergiNo,
            bankaAdi: parsed.bankaAdi,
            normalizedBank: bankName,
            isinAdi: parsed.isinAdi,
            tutar: parsed.tutar,
            aciklama: parsed.aciklama,
          });
        });
      });

      if (allItems.length === 0) {
        setActionMessage({
          text: selectedIsinAdiFilter
            ? `"${selectedIsinAdiFilter}" işi için ${periodTitle} seçili ${targetCompanyKeys ? targetCompanyKeys.size : 'tüm'} şirkette çek kaydı bulunamadı.`
            : `${periodTitle} için seçili ${targetCompanyKeys ? targetCompanyKeys.size : 'tüm'} şirkette çek kaydı bulunamadı.`,
          type: 'error',
        });
        setIsExportingAllCompaniesPDF(false);
        return;
      }

      // 2. Genel Toplamlar
      const grandTotal = allItems.reduce((sum, item) => sum + item.tutar, 0);
      const grandCount = allItems.length;

      // 3. EN ÜSTE: FİRMA FİRMA İCMAL VERİLERİ (Sadece Seçili Olan Şirketler)
      const companyMap = new Map<string, ConsolidatedCheckItem[]>();
      allItems.forEach((it) => {
        if (!companyMap.has(it.companyKey)) {
          companyMap.set(it.companyKey, []);
        }
        companyMap.get(it.companyKey)!.push(it);
      });

      interface CompanySummaryItem {
        companyKey: string;
        companyTitle: string;
        shortName: string;
        items: ConsolidatedCheckItem[];
        count: number;
        total: number;
        percent: number;
        avgTutar: number;
      }

      const companySummaries: CompanySummaryItem[] = [];
      const candidateKeys = targetCompanyKeys
        ? (Object.keys(SUPABASE_COMPANY_TABLES) as CompanyKey[]).filter((k) => targetCompanyKeys.has(k))
        : (Object.keys(SUPABASE_COMPANY_TABLES) as CompanyKey[]);

      candidateKeys.forEach((key) => {
        const items = companyMap.get(key) || [];
        if (items.length > 0) {
          const cTotal = items.reduce((s, x) => s + x.tutar, 0);
          companySummaries.push({
            companyKey: key,
            companyTitle: items[0].companyTitle,
            shortName: items[0].shortName,
            items,
            count: items.length,
            total: cTotal,
            percent: grandTotal > 0 ? (cTotal / grandTotal) * 100 : 0,
            avgTutar: items.length > 0 ? cTotal / items.length : 0,
          });
        }
      });

      // 4. EN ÜSTE: BANKA BANKA İCMAL VERİLERİ
      const bankMap = new Map<string, ConsolidatedCheckItem[]>();
      allItems.forEach((it) => {
        if (!bankMap.has(it.normalizedBank)) {
          bankMap.set(it.normalizedBank, []);
        }
        bankMap.get(it.normalizedBank)!.push(it);
      });

      interface BankSummaryItem {
        bankName: string;
        count: number;
        total: number;
        percent: number;
        avgTutar: number;
      }

      const bankSummaries: BankSummaryItem[] = [];
      bankMap.forEach((items, bankName) => {
        const bTotal = items.reduce((s, x) => s + x.tutar, 0);
        bankSummaries.push({
          bankName,
          count: items.length,
          total: bTotal,
          percent: grandTotal > 0 ? (bTotal / grandTotal) * 100 : 0,
          avgTutar: items.length > 0 ? bTotal / items.length : 0,
        });
      });

      // Bankaları alfabetik sırala ("DİĞER" en sona)
      bankSummaries.sort((a, b) => {
        const aOther = a.bankName.startsWith('DİĞER');
        const bOther = b.bankName.startsWith('DİĞER');
        if (aOther && !bOther) return 1;
        if (!aOther && bOther) return -1;
        return a.bankName.localeCompare(b.bankName, 'tr-TR');
      });

      // 5. EN ÜSTE: İŞİN ADI (PROJE / ŞANTİYE) DAĞILIM VE MALİ İCMAL VERİLERİ
      // PDF RAPOR İNDİRDİĞİNDE İŞİN ADI RAPORUDA BAŞINDA VERSİN HER İŞİN ADINI TOPLAM TUTARINI KARŞISINA YAZSIN
      const isinAdiMap = new Map<string, ConsolidatedCheckItem[]>();
      allItems.forEach((it) => {
        const pRaw = (it.isinAdi || '').trim();
        const pName = pRaw ? pRaw.toLocaleUpperCase('tr-TR') : 'DİĞER / BELİRTİLMEYEN PROJE';
        if (!isinAdiMap.has(pName)) {
          isinAdiMap.set(pName, []);
        }
        isinAdiMap.get(pName)!.push(it);
      });

      interface ProjectSummaryItem {
        isinAdi: string;
        count: number;
        total: number;
        percent: number;
        avgTutar: number;
        companies: string[];
      }

      const projectSummaries: ProjectSummaryItem[] = [];
      isinAdiMap.forEach((items, pName) => {
        const pTotal = items.reduce((s, x) => s + x.tutar, 0);
        const compNames = Array.from(new Set(items.map((x) => x.shortName || x.companyTitle)));
        projectSummaries.push({
          isinAdi: pName,
          count: items.length,
          total: pTotal,
          percent: grandTotal > 0 ? (pTotal / grandTotal) * 100 : 0,
          avgTutar: items.length > 0 ? pTotal / items.length : 0,
          companies: compNames,
        });
      });

      // İşin toplam tutarına göre azalan sırada (en yüksek tutarlı işten en küçüğe)
      projectSummaries.sort((a, b) => b.total - a.total);

      const dateStr = new Date().toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const fmtTl = (val: number) => {
        return (
          val.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) + ' ₺'
        );
      };

      const formatPrintDate = (rawDate: string | null | undefined): string => {
        if (!rawDate) return '-';
        const parts = String(rawDate).trim().split(/[-./]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) return `${parts[2]}.${parts[1]}.${parts[0]}`;
          if (parts[2].length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}`;
        }
        return String(rawDate);
      };

      const reportScopeTitle = targetCompanyKeys && targetCompanyKeys.size < Object.keys(SUPABASE_COMPANY_TABLES).length
        ? `SEÇİLİ FİRMALAR (${companySummaries.length} ŞİRKET)`
        : 'BÜTÜN FİRMALAR';
      const selectedProjectTitle = selectedIsinAdiFilter ? ` - ${selectedIsinAdiFilter.trim()}` : '';
      const reportMainTitle = `ÖZ-KA İNŞAAT ŞİRKETLER GRUBU${selectedProjectTitle} - ${periodTitle} ${reportScopeTitle} KONSOLİDE ÇEK RAPORU`;

      // 5. HTML ve CSS Tasarımı (YATAY A4, GÖZ ALICI KURUMSAL MİMARİ)
      const reportHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportMainTitle}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 5mm 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f1f5f9;
            margin: 0;
            padding: 8px 12px;
            color: #0f172a;
            font-size: 8pt;
            line-height: 1.25;
          }
          .no-print-bar {
            background: #0f172a;
            color: #ffffff;
            padding: 10px 18px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          }
          .no-print-info {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 9pt;
          }
          .no-print-badge {
            background: #3b82f6;
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.5px;
          }
          .no-print-btn {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #ffffff;
            border: 1px solid #60a5fa;
            padding: 7px 18px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 9pt;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
          }
          .no-print-btn:hover {
            background: #1e40af;
          }

          .report-sheet {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 14px 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            max-width: 287mm;
            margin: 0 auto;
          }

          /* Üst Antet ve Kurumsal Başlık */
          .report-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5px solid #1e3a8a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .header-logo {
            height: 52px;
            width: auto;
            object-fit: contain;
            border-radius: 6px;
          }
          .header-group-title {
            font-size: 13pt;
            font-weight: 900;
            color: #0f274a;
            letter-spacing: -0.3px;
            text-transform: uppercase;
          }
          .header-group-sub {
            font-size: 7.5pt;
            font-weight: 600;
            color: #475569;
            margin-top: 2px;
          }
          .header-center {
            text-align: center;
          }
          .report-period-badge {
            display: inline-block;
            background: linear-gradient(135deg, #1e3a8a, #0f274a);
            color: #ffffff;
            padding: 5px 16px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 10pt;
            letter-spacing: 0.6px;
            box-shadow: 0 2px 6px rgba(30, 58, 138, 0.25);
          }
          .report-type-badge {
            font-size: 7pt;
            color: #64748b;
            font-weight: 700;
            margin-top: 3px;
            text-transform: uppercase;
          }
          .header-right {
            text-align: right;
            font-size: 7pt;
            color: #475569;
            border-left: 2px solid #e2e8f0;
            padding-left: 12px;
          }

          /* 4 Kolonlu Üst KPI Kartları */
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 12px;
          }
          .kpi-card {
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 7px;
            padding: 8px 12px;
            position: relative;
            overflow: hidden;
          }
          .kpi-card::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
          }
          .kpi-blue::before { background: #2563eb; }
          .kpi-emerald::before { background: #059669; }
          .kpi-indigo::before { background: #6366f1; }
          .kpi-amber::before { background: #d97706; }

          .kpi-label {
            font-size: 6.8pt;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .kpi-val {
            font-size: 12.5pt;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .kpi-sub {
            font-size: 6.8pt;
            color: #64748b;
            margin-top: 1px;
          }

          /* EN ÜSTE FİRMA VE BANKA İCMAL TABLOLARI (YAN YANA 2 KOLON) */
          .summary-tables-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .summary-box {
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 7px;
            overflow: hidden;
          }
          .summary-header {
            background: linear-gradient(135deg, #1e3a8a, #172554);
            color: #ffffff;
            padding: 6px 12px;
            font-size: 8pt;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: space-between;
            letter-spacing: 0.4px;
          }
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.2pt;
          }
          .summary-table th {
            background: #e2e8f0;
            color: #1e293b;
            font-weight: 800;
            padding: 5px 8px;
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
          }
          .summary-table td {
            padding: 4.5px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          .summary-table tr:nth-child(even) td {
            background: #f1f5f9;
          }
          .summary-total-row td {
            background: #e0f2fe !important;
            color: #0c4a6e !important;
            font-weight: 800 !important;
            border-top: 1.5px solid #0284c7 !important;
            border-bottom: 1.5px solid #0284c7 !important;
          }

          /* FİRMA FİRMA BÖLÜMLERİ */
          .company-card {
            border: 1.5px solid #94a3b8;
            border-radius: 8px;
            margin-bottom: 14px;
            overflow: hidden;
            background: #ffffff;
            page-break-inside: avoid;
          }
          .company-card-header {
            background: linear-gradient(135deg, #0f274a, #1e3a8a);
            color: #ffffff;
            padding: 8px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .company-title-text {
            font-size: 9.5pt;
            font-weight: 900;
            letter-spacing: 0.4px;
          }
          .company-stats-pill {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .stat-badge {
            background: rgba(255, 255, 255, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.35);
            padding: 2.5px 9px;
            border-radius: 4px;
            font-size: 7.5pt;
            font-weight: 700;
            color: #ffffff;
          }

          /* BANKA GRUBU */
          .bank-block {
            margin: 8px 10px 10px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
          }
          .bank-block-header {
            background: #f1f5f9;
            border-bottom: 1.5px solid #93c5fd;
            padding: 5px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 7.8pt;
            font-weight: 800;
            color: #1e3a8a;
          }
          .bank-block-stats {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 7.2pt;
            font-weight: 700;
          }

          /* AYRINTILI ÇEK TABLOSU */
          .check-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.1pt;
          }
          .check-table th {
            background: #f8fafc;
            color: #334155;
            font-weight: 800;
            padding: 4px 6px;
            text-align: left;
            border-bottom: 1.5px solid #cbd5e1;
            font-size: 6.8pt;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .check-table td {
            padding: 4px 6px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          .check-table tr:hover td {
            background: #f8fafc;
          }
          .check-table .bank-subtotal-row td {
            background: #f0fdf4 !important;
            color: #166534 !important;
            font-weight: 800 !important;
            border-top: 1px dashed #86efac !important;
            border-bottom: 1px solid #86efac !important;
          }

          /* FİRMA ALT TOPLAM BANDI */
          .company-subtotal-bar {
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-top: 2px solid #1e3a8a;
            padding: 7px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 8.5pt;
            font-weight: 900;
            color: #0f274a;
          }
          .company-subtotal-amount {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 10.5pt;
            font-weight: 900;
            color: #1e3a8a;
            background: #ffffff;
            padding: 3px 10px;
            border-radius: 5px;
            border: 1px solid #bfdbfe;
          }

          /* GENEL TOPLAM BANDI */
          .grand-total-banner {
            background: linear-gradient(135deg, #0a192f, #1e3a8a);
            color: #ffffff;
            border-radius: 8px;
            padding: 10px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 14px;
            margin-bottom: 14px;
            box-shadow: 0 4px 12px rgba(10, 25, 47, 0.3);
            page-break-inside: avoid;
          }
          .grand-total-title {
            font-size: 10pt;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .grand-total-sub {
            font-size: 7.2pt;
            color: #93c5fd;
            margin-top: 2px;
          }
          .grand-total-amount {
            font-size: 14.5pt;
            font-weight: 900;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.16);
            padding: 5px 16px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.35);
          }

          /* Yetkili Kaşe & İmza Alanı */
          .signature-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-top: 14px;
            page-break-inside: avoid;
          }
          .signature-box {
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            padding: 8px 12px;
            background: #ffffff;
            text-align: center;
          }
          .signature-title {
            font-size: 7.5pt;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 28px;
          }
          .signature-name {
            font-size: 7pt;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
          }

          /* Dipnot */
          .report-footer {
            margin-top: 12px;
            padding-top: 6px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 6.8pt;
            color: #64748b;
            page-break-inside: avoid;
          }

          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .font-bold { font-weight: 700; }

          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }
            .no-print-bar {
              display: none !important;
            }
            .report-sheet {
              border: none;
              padding: 0;
              box-shadow: none;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <!-- Ekran Üst Kontrol Çubuğu (Baskıda Gizlenir) -->
        <div class="no-print-bar">
          <div class="no-print-info">
            <span class="no-print-badge">YATAY A4 RAPOR</span>
            <span><strong>${periodTitle}</strong> ${reportScopeTitle} Konsolide Çek Raporu ${selectedIsinAdiFilter ? `• <span style="background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 800;">🏗️ İŞİN ADI: ${selectedIsinAdiFilter}</span>` : ''} (Firma & Banka İcmalleri, Firma Alt Toplamları, Tutara Göre Sıralı)</span>
            <span style="color: #94a3b8; font-size: 8pt;">(Yazıcı: "PDF Olarak Kaydet", Düzen: "Yatay")</span>
          </div>
          <div>
            <button class="no-print-btn" onclick="window.print()">
              🖨️ PDF Olarak Kaydet / Yazdır
            </button>
          </div>
        </div>

        <div class="report-sheet">
          <!-- ÜST ANTET & KURUMSAL BİLGİLER -->
          <div class="report-header">
            <div class="header-left">
              <img src="${OZKA_LOGO_DATA_URL}" alt="Öz-Ka Logo" class="header-logo" />
              <div>
                <div class="header-group-title">ÖZ-KA İNŞAAT ŞİRKETLER GRUBU</div>
                <div class="header-group-sub">Tüm İştirak ve Ortaklıklar Konsolide Muhasebe & Çek Takip Sistemi</div>
                ${selectedIsinAdiFilter ? `
                  <div style="margin-top: 4px; display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; border: 1.5px solid #2563eb; color: #1e3a8a; padding: 2.5px 10px; border-radius: 6px; font-weight: 800; font-size: 8.5pt;">
                    <span>🏗️ İŞİN ADI / PROJE:</span>
                    <span style="color: #0f172a; text-decoration: underline;">${selectedIsinAdiFilter}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="header-center">
              <div class="report-period-badge">📅 ${periodTitle} ${reportScopeTitle} KONSOLİDE ÇEK RAPORU</div>
              ${selectedIsinAdiFilter ? `
                <div style="margin-top: 3px; font-weight: 800; font-size: 8pt; color: #1e40af;">
                  🏗️ ${selectedIsinAdiFilter} Projesine Ait Konsolide Çek Dökümü
                </div>
              ` : `
                <div class="report-type-badge">Yatay A4 İcmal & Ayrıntılı Firma Dökümü</div>
              `}
            </div>
            <div class="header-right">
              <div><strong>Rapor No:</strong> KNS-${new Date().getFullYear()}-${periodTitle.replace(/\s+/g, '_')}${selectedIsinAdiFilter ? `_${encodeURIComponent(selectedIsinAdiFilter.slice(0, 8))}` : ''}</div>
              <div><strong>Tarih:</strong> ${dateStr}</div>
              <div><strong>Kapsam:</strong> ${companySummaries.length} Şirket / ${bankSummaries.length} Banka</div>
              <div><strong>Düzen:</strong> Yatay (Landscape A4)</div>
            </div>
          </div>

          <!-- 4 YÖNETİCİ KPI KARTI -->
          <div class="kpi-grid">
            <div class="kpi-card kpi-blue">
              <div class="kpi-label">KONSOLİDE TOPLAM TUTAR</div>
              <div class="kpi-val" style="color: #1e3a8a;">${fmtTl(grandTotal)}</div>
              <div class="kpi-sub">${selectedIsinAdiFilter ? `"${selectedIsinAdiFilter}" toplam tutarı` : `${periodTitle} bütün firmalar çek toplamı`}</div>
            </div>
            <div class="kpi-card kpi-emerald">
              <div class="kpi-label">TOPLAM ÇEK SAYISI</div>
              <div class="kpi-val" style="color: #047857;">${grandCount} Adet</div>
              <div class="kpi-sub">${selectedIsinAdiFilter ? `"${selectedIsinAdiFilter}" çek adedi` : 'Kayıtlı toplam portföy çek adedi'}</div>
            </div>
            <div class="kpi-card kpi-indigo">
              <div class="kpi-label">ORTALAMA ÇEK TUTARI</div>
              <div class="kpi-val" style="color: #4338ca;">${fmtTl(grandCount > 0 ? grandTotal / grandCount : 0)}</div>
              <div class="kpi-sub">Çek başına düşen genel ortalama</div>
            </div>
            <div class="kpi-card kpi-amber">
              <div class="kpi-label">KAPSAM BİLGİSİ</div>
              <div class="kpi-val" style="color: #b45309; font-size: 11pt;">${companySummaries.length} Şirket • ${bankSummaries.length} Banka</div>
              <div class="kpi-sub">${selectedIsinAdiFilter ? `Seçili İş: ${selectedIsinAdiFilter}` : 'Bütün iştirakler ve çalışan bankalar'}</div>
            </div>
          </div>

          <!-- İŞİN ADI (PROJE / ŞANTİYE) DAĞILIM VE MALİ İCMAL TABLOSU -->
          <!-- PDF RAPOR İNDİRDİĞİNDE İŞİN ADI RAPORUDA BAŞINDA VERSİN HER İŞİN ADINI TOPLAM TUTARINI KARŞISINA YAZSIN -->
          <div class="summary-box" style="margin-bottom: 12px;">
            <div class="summary-header" style="background: linear-gradient(135deg, #0f274a, #1e3a8a);">
              <span>🏗️ ${selectedIsinAdiFilter ? `SEÇİLİ İŞİN ADI RAPORU: "${selectedIsinAdiFilter}"` : `İŞİN ADI (PROJE / ŞANTİYE) DAĞILIM VE MALİ İCMALİ (${projectSummaries.length} PROJE / ŞANTİYE)`}</span>
              <span>Dönem Konsolide Toplamı: ${fmtTl(grandTotal)}</span>
            </div>
            <table class="summary-table">
              <thead>
                <tr>
                  <th style="width: 25px;" class="text-center">#</th>
                  <th>İşin Adı / Proje / Şantiye</th>
                  <th style="width: 190px;">İlgili Şirketler / Şantiyeler</th>
                  <th style="width: 75px;" class="text-center">Çek Adedi</th>
                  <th style="width: 140px;" class="text-right">İşin Toplam Tutarı</th>
                  <th style="width: 100px;" class="text-right">Ortalama</th>
                  <th style="width: 65px;" class="text-right">Pay (%)</th>
                </tr>
              </thead>
              <tbody>
                ${projectSummaries.map((ps, idx) => `
                  <tr style="${selectedIsinAdiFilter && ps.isinAdi.toLocaleUpperCase('tr-TR') === selectedIsinAdiFilter.toLocaleUpperCase('tr-TR') ? 'background: #eff6ff !important; font-weight: 800;' : ''}">
                    <td class="text-center font-mono" style="color: #64748b;">${idx + 1}</td>
                    <td class="font-bold" style="color: #0f274a;">
                      🏗️ ${ps.isinAdi}
                      ${selectedIsinAdiFilter && ps.isinAdi.toLocaleUpperCase('tr-TR') === selectedIsinAdiFilter.toLocaleUpperCase('tr-TR') ? ' <span style="background: #2563eb; color: #fff; padding: 1.5px 6px; border-radius: 4px; font-size: 6.5pt; margin-left: 6px;">SEÇİLİ İŞ</span>' : ''}
                    </td>
                    <td style="color: #475569; font-size: 6.8pt;">${ps.companies.join(', ')}</td>
                    <td class="text-center font-mono font-bold">${ps.count} Adet</td>
                    <td class="text-right font-mono font-bold" style="color: #1e3a8a; font-size: 8pt;">${fmtTl(ps.total)}</td>
                    <td class="text-right font-mono" style="color: #475569;">${fmtTl(ps.avgTutar)}</td>
                    <td class="text-right font-mono font-bold" style="color: #2563eb;">% ${ps.percent.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="summary-total-row">
                  <td class="text-center">Σ</td>
                  <td colspan="2">${selectedIsinAdiFilter ? `SEÇİLİ İŞ KONSOLİDE TOPLAMI (${selectedIsinAdiFilter})` : 'GENEL PROJE / ŞANTİYE TOPLAMI'}</td>
                  <td class="text-center font-mono">${grandCount} Adet</td>
                  <td class="text-right font-mono">${fmtTl(grandTotal)}</td>
                  <td class="text-right font-mono">${fmtTl(grandCount > 0 ? grandTotal / grandCount : 0)}</td>
                  <td class="text-right font-mono">% 100.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- EN ÜSTE FİRMA VE BANKA İCMAL TABLOLARI -->
          <div class="summary-tables-grid">
            <!-- 1. FİRMA BAZINDA DAĞILIM VE TUTAR İCMALİ -->
            <div class="summary-box">
              <div class="summary-header">
                <span>🏢 FİRMA BAZINDA DAĞILIM VE TUTAR İCMALİ</span>
                <span>${companySummaries.length} Şirket</span>
              </div>
              <table class="summary-table">
                <thead>
                  <tr>
                    <th style="width: 25px;" class="text-center">#</th>
                    <th>Firma / Şirket Ünvanı</th>
                    <th style="width: 70px;" class="text-center">Çek Adedi</th>
                    <th style="width: 110px;" class="text-right">Firma Toplamı</th>
                    <th style="width: 95px;" class="text-right">Ortalama</th>
                    <th style="width: 65px;" class="text-right">Pay (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${companySummaries.map((cs, idx) => `
                    <tr>
                      <td class="text-center font-mono" style="color: #64748b;">${idx + 1}</td>
                      <td class="font-bold" style="color: #0f274a;">🏢 ${cs.companyTitle}</td>
                      <td class="text-center font-mono font-bold">${cs.count} Adet</td>
                      <td class="text-right font-mono font-bold" style="color: #1e3a8a;">${fmtTl(cs.total)}</td>
                      <td class="text-right font-mono" style="color: #475569;">${fmtTl(cs.avgTutar)}</td>
                      <td class="text-right font-mono font-bold" style="color: #2563eb;">% ${cs.percent.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  <tr class="summary-total-row">
                    <td class="text-center">Σ</td>
                    <td>KONSOLİDE FİRMA GENEL TOPLAMI</td>
                    <td class="text-center font-mono">${grandCount} Adet</td>
                    <td class="text-right font-mono">${fmtTl(grandTotal)}</td>
                    <td class="text-right font-mono">${fmtTl(grandCount > 0 ? grandTotal / grandCount : 0)}</td>
                    <td class="text-right font-mono">% 100.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 2. BANKA BAZINDA DAĞILIM VE TUTAR İCMALİ -->
            <div class="summary-box">
              <div class="summary-header">
                <span>🏛️ BANKA BAZINDA DAĞILIM VE TUTAR İCMALİ</span>
                <span>${bankSummaries.length} Banka</span>
              </div>
              <table class="summary-table">
                <thead>
                  <tr>
                    <th style="width: 25px;" class="text-center">#</th>
                    <th>Banka Adı</th>
                    <th style="width: 70px;" class="text-center">Çek Adedi</th>
                    <th style="width: 110px;" class="text-right">Banka Toplamı</th>
                    <th style="width: 95px;" class="text-right">Ortalama</th>
                    <th style="width: 65px;" class="text-right">Pay (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${bankSummaries.map((bs, idx) => `
                    <tr>
                      <td class="text-center font-mono" style="color: #64748b;">${idx + 1}</td>
                      <td class="font-bold" style="color: #1e3a8a;">🏛️ ${bs.bankName}</td>
                      <td class="text-center font-mono font-bold">${bs.count} Adet</td>
                      <td class="text-right font-mono font-bold" style="color: #0f172a;">${fmtTl(bs.total)}</td>
                      <td class="text-right font-mono" style="color: #475569;">${fmtTl(bs.avgTutar)}</td>
                      <td class="text-right font-mono font-bold" style="color: #1e40af;">% ${bs.percent.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  <tr class="summary-total-row">
                    <td class="text-center">Σ</td>
                    <td>KONSOLİDE BANKA GENEL TOPLAMI</td>
                    <td class="text-center font-mono">${grandCount} Adet</td>
                    <td class="text-right font-mono">${fmtTl(grandTotal)}</td>
                    <td class="text-right font-mono">${fmtTl(grandCount > 0 ? grandTotal / grandCount : 0)}</td>
                    <td class="text-right font-mono">% 100.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- AYRINTILI BÖLÜM: FİRMA FİRMA AYRILMIŞ, BANKA GURUPLU VE TUTARI KÜÇÜKTEN BÜYÜĞE SIRALI ÇEKLER -->
          <div style="margin-top: 14px; margin-bottom: 8px;">
            <div style="font-size: 8.8pt; font-weight: 900; color: #0f274a; text-transform: uppercase; letter-spacing: 0.5px;">
              📋 FİRMA BAZINDA AYRINTILI ÇEK DÖKÜMÜ VE ALT TOPLAMLAR (BANKA GRUPLU & TUTARI KÜÇÜKTEN BÜYÜĞE SIRALI)
            </div>
          </div>

          ${companySummaries.map((comp) => {
            // Şirket içi çekleri bankalara göre gruplandır
            const cBankMap = new Map<string, ConsolidatedCheckItem[]>();
            comp.items.forEach((item) => {
              if (!cBankMap.has(item.normalizedBank)) {
                cBankMap.set(item.normalizedBank, []);
              }
              cBankMap.get(item.normalizedBank)!.push(item);
            });

            const cBankList: { bankName: string; items: ConsolidatedCheckItem[]; total: number }[] = [];
            cBankMap.forEach((bItems, bName) => {
              // TUTARI KÜÇÜKTEN BÜYÜĞE SIRALASIN (Ascending)
              bItems.sort((a, b) => {
                if (a.tutar !== b.tutar) {
                  return a.tutar - b.tutar;
                }
                const dComp = (a.evrakTarihi || '').localeCompare(b.evrakTarihi || '');
                if (dComp !== 0) return dComp;
                return (a.evrakNo || '').localeCompare(b.evrakNo || '', 'tr-TR', { numeric: true });
              });

              const bTot = bItems.reduce((s, it) => s + it.tutar, 0);
              cBankList.push({
                bankName: bName,
                items: bItems,
                total: bTot,
              });
            });

            // Bankaları alfabetik sırala ("DİĞER" en sona)
            cBankList.sort((a, b) => {
              const aOther = a.bankName.startsWith('DİĞER');
              const bOther = b.bankName.startsWith('DİĞER');
              if (aOther && !bOther) return 1;
              if (!aOther && bOther) return -1;
              return a.bankName.localeCompare(b.bankName, 'tr-TR');
            });

            let companyCheckCounter = 0;

            return `
              <div class="company-card">
                <div class="company-card-header">
                  <div class="company-title-text">
                    <span>🏢 ${comp.companyTitle}</span>
                  </div>
                  <div class="company-stats-pill">
                    <span class="stat-badge">${comp.count} Adet Çek</span>
                    <span class="stat-badge">Firma Toplamı: ${fmtTl(comp.total)}</span>
                    <span class="stat-badge">Portföy Payı: %${comp.percent.toFixed(2)}</span>
                  </div>
                </div>

                ${cBankList.map((bg) => {
                  return `
                    <div class="bank-block">
                      <div class="bank-block-header">
                        <span>🏛️ ${bg.bankName}</span>
                        <div class="bank-block-stats">
                          <span>${bg.items.length} Adet</span>
                          <span>•</span>
                          <span>Banka Toplamı: ${fmtTl(bg.total)}</span>
                        </div>
                      </div>
                      <table class="check-table">
                        <thead>
                          <tr>
                            <th style="width: 25px;" class="text-center">#</th>
                            <th style="width: 70px;">Evrak Tarihi</th>
                            <th style="width: 60px;" class="text-center">Dönem</th>
                            <th style="width: 90px;">Evrak / Çek No</th>
                            <th style="width: 170px;">Firma Ünvanı / Keşideci</th>
                            <th style="width: 85px;">Vergi No</th>
                            <th style="width: 150px;">İşin Adı / Proje</th>
                            <th style="width: 140px;">Açıklama</th>
                            <th style="width: 105px;" class="text-right">Tutar (TL)</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${bg.items.map((it) => {
                            companyCheckCounter++;
                            return `
                              <tr>
                                <td class="text-center font-mono" style="color: #64748b;">${companyCheckCounter}</td>
                                <td class="font-bold font-mono">${formatPrintDate(it.evrakTarihi)}</td>
                                <td class="text-center font-bold" style="color: #2563eb;">${it.donem || '-'}</td>
                                <td class="font-bold font-mono" style="color: #0f172a;">${it.evrakNo || '-'}</td>
                                <td class="font-bold" style="color: #1e3a8a;">${it.firmaUnvani || '-'}</td>
                                <td class="font-mono" style="color: #475569;">${it.vergiNo || '-'}</td>
                                <td>${it.isinAdi || '-'}</td>
                                <td style="color: #64748b; font-size: 6.8pt;">${it.aciklama || '-'}</td>
                                <td class="text-right font-mono font-bold" style="color: #0f172a;">${fmtTl(it.tutar)}</td>
                              </tr>
                            `;
                          }).join('')}
                          <tr class="bank-subtotal-row">
                            <td colspan="7" class="font-bold" style="padding-left: 10px;">
                              🏛️ ${bg.bankName} Ara Toplamı (${bg.items.length} Adet Çek - Küçükten Büyüğe Sıralı)
                            </td>
                            <td class="text-right font-bold">Banka Toplamı:</td>
                            <td class="text-right font-mono font-bold" style="font-size: 7.8pt;">${fmtTl(bg.total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  `;
                }).join('')}

                <!-- FİRMA ALT TOPLAM BANDI -->
                <div class="company-subtotal-bar">
                  <div>
                    <span>🏢 ${comp.companyTitle} GENEL ALT TOPLAMI</span>
                    <span style="font-size: 7.5pt; font-weight: 600; color: #64748b; margin-left: 10px;">
                      (${comp.count} Adet Çek • ${cBankList.length} Banka)
                    </span>
                  </div>
                  <div class="company-subtotal-amount">
                    ${fmtTl(comp.total)}
                  </div>
                </div>
              </div>
            `;
          }).join('')}

          <!-- BÜTÜN FİRMALAR & TÜM BANKALAR KONSOLİDE GENEL TOPLAM BANDI -->
          <div class="grand-total-banner">
            <div>
              <div class="grand-total-title">🌟 ${selectedIsinAdiFilter ? `${selectedIsinAdiFilter} • ` : ''}${periodTitle} ${reportScopeTitle} GENEL KONSOLİDE TOPLAM</div>
              <div class="grand-total-sub">
                ${periodTitle} ${selectedIsinAdiFilter ? `• Seçili İş: "${selectedIsinAdiFilter}"` : ''} • ${companySummaries.length} Şirket • ${bankSummaries.length} Banka • Toplam ${grandCount} Adet Çek
              </div>
            </div>
            <div class="grand-total-amount">
              ${fmtTl(grandTotal)}
            </div>
          </div>

          <!-- YETKİLİ KAŞE & İMZA ALANI -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-title">HAZIRLAYAN</div>
              <div class="signature-name">Muhasebe & Finans Servisi<br>İmza</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">KONTROL EDEN</div>
              <div class="signature-name">Mali İşler Müdürü<br>İmza</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">ONAYLAYAN</div>
              <div class="signature-name">Genel Müdürlük / Yönetim Kurulu<br>Kaşe & İmza</div>
            </div>
          </div>

          <!-- DİPNOT -->
          <div class="report-footer">
            <span>Kaynak: Öz-Ka İnşaat Şirketler Grubu Konsolide Çek Portföy Sistemi ${selectedIsinAdiFilter ? `• Seçili İş: ${selectedIsinAdiFilter}` : ''}</span>
            <span>Rapor Kodu: KNS-${new Date().getFullYear()}-${periodTitle.replace(/\s+/g, '_')}${selectedIsinAdiFilter ? `_${encodeURIComponent(selectedIsinAdiFilter.slice(0, 8))}` : ''}</span>
            <span>Sayfa Düzeni: Yatay (A4 Landscape) • Çıktı Alma Zamanı: ${dateStr}</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
      `;

      // 6. Yazdırma / PDF Penceresini Açma
      let printWindow: Window | null = null;
      try {
        printWindow = window.open('', '_blank');
      } catch (e) {
        printWindow = null;
      }

      if (printWindow && printWindow.document) {
        printWindow.document.open();
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        setActionMessage({
          text: selectedIsinAdiFilter
            ? `"${selectedIsinAdiFilter}" işine ait ${periodTitle} konsolide çek raporu (Firma ve Banka icmalleri, firma alt toplamları, tutara göre sıralı) PDF penceresinde hazırlandı.`
            : `${periodTitle} bütün firmalar çek raporu (Firma ve Banka icmalleri, firma alt toplamları, tutara göre sıralı) PDF penceresinde hazırlandı.`,
          type: 'success',
        });
      } else {
        let printFrame = document.getElementById('report-pdf-print-frame') as HTMLIFrameElement;
        if (!printFrame) {
          printFrame = document.createElement('iframe');
          printFrame.id = 'report-pdf-print-frame';
          printFrame.style.position = 'fixed';
          printFrame.style.right = '0';
          printFrame.style.bottom = '0';
          printFrame.style.width = '0';
          printFrame.style.height = '0';
          printFrame.style.border = '0';
          printFrame.style.zIndex = '-9999';
          document.body.appendChild(printFrame);
        }
        const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
        if (frameDoc) {
          frameDoc.open();
          frameDoc.write(reportHtml);
          frameDoc.close();
          setTimeout(() => {
            try {
              printFrame.contentWindow?.focus();
              printFrame.contentWindow?.print();
            } catch (err) {
              console.error('Yazdırma hatası:', err);
            }
          }, 400);
          setActionMessage({
            text: `${periodTitle} bütün firmalar çek raporu için Yatay PDF yazdırma penceresi hazırlandı. "PDF Olarak Kaydet" seçeneğini kullanabilirsiniz.`,
            type: 'success',
          });
        }
      }
    } catch (err: any) {
      setActionMessage({
        text: `Bütün firmalar PDF raporu oluşturulurken hata: ${err?.message || err}`,
        type: 'error',
      });
    } finally {
      setIsExportingAllCompaniesPDF(false);
    }
  };

  // Toplu Kayıt (Excel Yükleme) Ref ve Durumları
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isBulkConfirmModalOpen, setIsBulkConfirmModalOpen] = useState(false);

  // Toplu Kayıt Buton Tıklaması - Kullanıcı isteği: Önce onay iste sonra aç
  const handleBulkUploadClick = () => {
    setIsBulkConfirmModalOpen(true);
  };

  // Excel Dosyası Yükleme ve Tabloya Toplu Kayıt İşlemi
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Sadece Excel dosyası doğrulaması (.xlsx, .xls)
    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.xlsx') && !fileNameLower.endsWith('.xls')) {
      setActionMessage({
        text: 'Lütfen sadece Excel (.xlsx veya .xls) dosyası yükleyiniz.',
        type: 'error',
      });
      if (e.target) e.target.value = '';
      return;
    }

    setIsBulkUploading(true);
    setActionMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer) {
          throw new Error('Dosya içeriği okunamadı.');
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('Excel çalışma sayfası bulunamadı.');
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

        if (!rawRows || rawRows.length === 0) {
          throw new Error('Yüklenen Excel dosyası boş.');
        }

        // Başlık satırını tespit et
        let headerRowIndex = -1;
        const colMap = {
          tarih: -1,
          donem: -1,
          evrakNo: -1,
          firma: -1,
          vergiNo: -1,
          banka: -1,
          isAdi: -1,
          tutar: -1,
          aciklama: -1,
        };

        for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;
          const rowStr = row.map((c) => String(c).toLowerCase().trim()).join(' ');

          const hasTarih = rowStr.includes('tarih') || rowStr.includes('date');
          const hasEvrak = rowStr.includes('evrak') || rowStr.includes('belge') || rowStr.includes('fatura');
          const hasFirma = rowStr.includes('firma') || rowStr.includes('ünvan') || rowStr.includes('unvan') || rowStr.includes('cari');
          const hasTutar = rowStr.includes('tutar') || rowStr.includes('bedel');

          if ((hasTarih && hasEvrak) || (hasEvrak && hasFirma) || (hasTarih && hasFirma) || (hasTarih && hasTutar)) {
            headerRowIndex = r;
            row.forEach((cell, colIdx) => {
              const h = String(cell).toLowerCase().replace(/[^a-z0-9çğıöşüİĞÜŞÖÇ]/gi, ' ').trim();
              if ((h.includes('tarih') || h.includes('date')) && colMap.tarih === -1) colMap.tarih = colIdx;
              else if ((h.includes('dönem') || h.includes('donem') || h === 'ay') && colMap.donem === -1) colMap.donem = colIdx;
              else if ((h.includes('evrak no') || h.includes('evrak numara') || h.includes('belge no') || h === 'no' || (h.includes('evrak') && !h.includes('tarih'))) && colMap.evrakNo === -1) colMap.evrakNo = colIdx;
              else if ((h.includes('firma') || h.includes('unvan') || h.includes('ünvan') || h.includes('cari') || h.includes('musteri') || h.includes('müşteri')) && colMap.firma === -1) colMap.firma = colIdx;
              else if ((h.includes('vergi') || h.includes('vkn') || h.includes('tckn')) && colMap.vergiNo === -1) colMap.vergiNo = colIdx;
              else if (h.includes('banka') && colMap.banka === -1) colMap.banka = colIdx;
              else if ((h.includes('isin') || h.includes('işin') || h.includes('proje') || h.includes('is adi') || h.includes('iş adı') || h.includes('yapılan iş')) && colMap.isAdi === -1) colMap.isAdi = colIdx;
              else if ((h.includes('tutar') || h.includes('bedel') || h.includes('fiyat') || h === 'tl') && colMap.tutar === -1) colMap.tutar = colIdx;
              else if ((h.includes('aciklama') || h.includes('açıklama') || h.includes('not')) && colMap.aciklama === -1) colMap.aciklama = colIdx;
            });
            break;
          }
        }

        // Eğer belirgin bir başlık satırı yoksa sıra bazlı varsayılan eşleme
        if (headerRowIndex === -1) {
          const firstCell = String(rawRows[0]?.[0] || '').trim();
          const isSeq = !isNaN(Number(firstCell)) && Number(firstCell) < 100;
          const offset = isSeq ? 1 : 0;
          headerRowIndex = -1;
          colMap.tarih = offset;
          colMap.donem = offset + 1;
          colMap.evrakNo = offset + 2;
          colMap.firma = offset + 3;
          colMap.vergiNo = offset + 4;
          colMap.banka = offset + 5;
          colMap.isAdi = offset + 6;
          colMap.tutar = offset + 7;
          colMap.aciklama = offset + 8;
        }

        const validRecords: Omit<SupabaseEvrakRow, 'id' | 'olusturulma_tarihi' | 'guncellenme_tarihi'>[] = [];
        const startRow = headerRowIndex + 1;

        for (let r = startRow; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          const rowStr = row.map((c) => String(c).trim()).join(' ');
          if (!rowStr) continue;

          // Toplam satırlarını filtrele
          const upperRowStr = rowStr.toUpperCase();
          if (
            upperRowStr.includes('GENEL TOPLAM') ||
            upperRowStr.includes('TOPLAM TUTAR') ||
            (upperRowStr.includes('TOPLAM') && row.filter(Boolean).length <= 3)
          ) {
            continue;
          }

          // Tarih çözümleme
          let rawDate = colMap.tarih !== -1 ? row[colMap.tarih] : '';
          let evrakTarihi = new Date().toISOString().slice(0, 10);

          if (typeof rawDate === 'number') {
            const utcDays = Math.floor(rawDate - 25569);
            const utcValue = utcDays * 86400;
            const dateInfo = new Date(utcValue * 1000);
            if (!isNaN(dateInfo.getTime())) {
              const y = dateInfo.getFullYear();
              const m = String(dateInfo.getMonth() + 1).padStart(2, '0');
              const d = String(dateInfo.getDate()).padStart(2, '0');
              evrakTarihi = `${y}-${m}-${d}`;
            }
          } else if (rawDate) {
            const strDate = String(rawDate).trim();
            const dotMatch = strDate.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
            if (dotMatch) {
              const [, d, m, y] = dotMatch;
              evrakTarihi = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            } else {
              const isoMatch = strDate.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
              if (isoMatch) {
                const [, y, m, d] = isoMatch;
                evrakTarihi = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              } else {
                evrakTarihi = strDate;
              }
            }
          }

          let evrakNo = colMap.evrakNo !== -1 ? String(row[colMap.evrakNo] || '').trim() : '';
          let firmaUnvani = colMap.firma !== -1 ? String(row[colMap.firma] || '').trim() : '';
          const vergiNo = colMap.vergiNo !== -1 ? String(row[colMap.vergiNo] || '').trim() : '';
          const bankaAdi = colMap.banka !== -1 ? String(row[colMap.banka] || '').trim() : '';
          const isinAdi = colMap.isAdi !== -1 ? String(row[colMap.isAdi] || '').trim() : '';

          // Tutar çözümleme
          let tutarVal = 0;
          const rawTutar = colMap.tutar !== -1 ? row[colMap.tutar] : 0;
          if (typeof rawTutar === 'number') {
            tutarVal = isNaN(rawTutar) ? 0 : rawTutar;
          } else if (rawTutar) {
            let s = String(rawTutar).replace(/TL|₺/gi, '').trim();
            if (s.includes(',') && s.includes('.')) {
              if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
                s = s.replace(/\./g, '').replace(',', '.');
              } else {
                s = s.replace(/,/g, '');
              }
            } else if (s.includes(',')) {
              s = s.replace(',', '.');
            }
            const parsed = parseFloat(s);
            tutarVal = isNaN(parsed) ? 0 : parsed;
          }

          const aciklama = colMap.aciklama !== -1 ? String(row[colMap.aciklama] || '').trim() : '';

          // Dönem tespiti
          let rawDonem = colMap.donem !== -1 ? String(row[colMap.donem] || '').trim().toUpperCase() : '';
          let donem = AYLAR.find((ay) => ay === rawDonem);
          if (!donem && evrakTarihi) {
            const m = parseInt(evrakTarihi.slice(5, 7), 10);
            if (!isNaN(m) && m >= 1 && m <= 12) {
              donem = AYLAR[m - 1];
            }
          }
          if (!donem) {
            donem = AYLAR[new Date().getMonth()];
          }

          // Boş satır kontrolü
          if (!evrakNo && !firmaUnvani && !isinAdi && tutarVal === 0) {
            continue;
          }

          if (!evrakNo) {
            evrakNo = `EVR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${r + 1}`;
          }

          if (!firmaUnvani) {
            firmaUnvani = config?.companyTitle || 'BAYBURT ÖZ-KA İNŞAAT';
          }

          validRecords.push({
            evrak_tarihi: evrakTarihi,
            donem,
            evrak_numarasi: evrakNo,
            firma_unvani: firmaUnvani,
            vergi_numarasi: vergiNo || null,
            banka_adi: bankaAdi || null,
            isin_adi: isinAdi || 'Muhtelif İmalat / İş',
            tutari: tutarVal,
            aciklama: aciklama || null,
          });
        }

        if (validRecords.length === 0) {
          throw new Error('Excel dosyasında eklenebilecek geçerli evrak kaydı bulunamadı.');
        }

        // Tablo kayıtlarının çekildiği adrese toplu kayıt yap
        const res = await bulkInsertCompanyEvraklar(companyKey, validRecords);

        if (res.success) {
          // İstenen: "kayıt başarılı de"
          setActionMessage({
            text: `Kayıt başarılı! ${res.count} adet evrak sisteme aktarıldı.`,
            type: 'success',
          });
          if (onRecordAdded) {
            onRecordAdded();
          }
        } else {
          setActionMessage({
            text: `Kayıt hatası: ${res.error || 'Bilinmeyen hata oluştu'}`,
            type: 'error',
          });
        }
      } catch (err: any) {
        console.error('Excel Toplu Kayıt Hatası:', err);
        setActionMessage({
          text: `Hata: ${err.message || 'Excel dosyası işlenirken bir sorun oluştu.'}`,
          type: 'error',
        });
      } finally {
        setIsBulkUploading(false);
        if (e.target) {
          e.target.value = '';
        }
      }
    };

    reader.onerror = () => {
      setIsBulkUploading(false);
      setActionMessage({ text: 'Dosya okunurken bir hata oluştu.', type: 'error' });
      if (e.target) e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  };

  if (!config) return null;

  return (
    <div className="space-y-4">
      {/* Action Message Alert */}
      {actionMessage && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 12 AYIN FİLTRELEME BUTONLARI (YAN YANA - BEYAZ BUTONLAR) */}
      <div className="p-3.5 rounded-2xl border-2 border-blue-200 bg-white shadow-md space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Dönem / Ay Filtresi:
            </span>
            {selectedDonem !== 'all' && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                Seçili: {selectedDonem} ({filteredRecords.length} Evrak)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedDonem !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedDonem('all')}
                className="text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold"
              >
                Filtreyi Temizle
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Verileri Yenile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            {/* TOPLU KAYIT YAP BUTONU (Excel Yükleme) */}
            <button
              type="button"
              id="btn-bulk-import-excel"
              onClick={handleBulkUploadClick}
              disabled={isBulkUploading || isLoading}
              title="Excel Dosyasından Toplu Evrak Kaydı Yükle (.xlsx, .xls)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isBulkUploading ? 'animate-spin' : ''}`} />
              <span>{isBulkUploading ? 'Yükleniyor...' : 'Toplu Kayıt Yap'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleExcelFileUpload}
              className="hidden"
            />

            {/* ÖDENENLER BUTONU (cekarsiv tablosunu yeni sayfada listeler) */}
            <button
              type="button"
              id="btn-open-odenenler"
              onClick={() => {
                if (onOpenArchiveView) {
                  onOpenArchiveView('cekarsiv');
                } else {
                  setActiveArchiveView('cekarsiv');
                }
              }}
              title="Ödenenler (cekarsiv) tablosunu yeni sayfada aç ve detaylı arama yap"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white border border-amber-400/50 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-amber-200" />
              <span>Ödenenler</span>
            </button>

            {/* İPTAL EDİLENLER BUTONU (cekiptal tablosunu yeni sayfada listeler) */}
            <button
              type="button"
              id="btn-open-iptal-edilenler"
              onClick={() => {
                if (onOpenArchiveView) {
                  onOpenArchiveView('cekiptal');
                } else {
                  setActiveArchiveView('cekiptal');
                }
              }}
              title="İptal Edilenler (cekiptal) tablosunu yeni sayfada aç ve detaylı arama yap"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border border-rose-400/50 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5 text-rose-200" />
              <span>İptal Edilenler</span>
            </button>

            {/* DÖNEM AYI PDF İNDİR BUTONU */}
            <button
              type="button"
              id="btn-donem-pdf-download"
              onClick={handleExportPDF}
              disabled={records.length === 0 && filteredRecords.length === 0}
              title={
                selectedIsinAdiFilter
                  ? `"${selectedIsinAdiFilter}" İşine Ait ${selectedDonem !== 'all' ? selectedDonem + ' Ayı ' : ''}Çeklerini Banka Gruplu ve Sıralı Yatay PDF Olarak İndir`
                  : selectedDonem !== 'all'
                  ? `${selectedDonem} Ayı Çeklerini Banka Bazlı Gruplandırılmış, Küçükten Büyüğe Sıralı Yatay PDF Olarak İndir / Yazdır`
                  : 'Tüm Çekleri Banka Bazlı Gruplandırılmış Yatay PDF Olarak İndir / Yazdır'
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${
                selectedDonem !== 'all' || selectedIsinAdiFilter
                  ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 border border-rose-300 ring-2 ring-rose-400/40 shadow-rose-500/20'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-rose-400/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-white stroke-[2.3]" />
              <span>
                {selectedIsinAdiFilter
                  ? `${selectedDonem !== 'all' ? selectedDonem + ' ' : ''}Seçili İş PDF İndir`
                  : selectedDonem !== 'all'
                  ? `${selectedDonem} PDF İndir`
                  : 'PDF İndir'}
              </span>
            </button>

            {/* BÜTÜN FİRMALAR DÖNEM PDF İNDİR BUTONU */}
            {(() => {
              const repCount = selectedCompaniesForReport ? selectedCompaniesForReport.size : 5;
              return (
                <button
                  type="button"
                  id="btn-all-companies-pdf-download"
                  onClick={handleExportAllCompaniesPDF}
                  disabled={isExportingAllCompaniesPDF}
                  title={
                    selectedDonem !== 'all'
                      ? `${selectedDonem} Dönemi Seçili (${repCount} Şirket) Firmaların Çeklerini Firma Firma Alt Toplamlı, Banka Gruplu ve Tutara Göre Küçükten Büyüğe Sıralı Yatay PDF Olarak İndir`
                      : `Tüm Dönemler Seçili (${repCount} Şirket) Firmaların Çeklerini Firma ve Banka Gruplu Yatay PDF Olarak İndir`
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${
                    selectedDonem !== 'all'
                      ? 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 hover:from-indigo-600 hover:to-blue-600 border border-indigo-300 ring-2 ring-indigo-400/40 shadow-indigo-500/20'
                      : 'bg-gradient-to-r from-indigo-800 to-blue-800 hover:from-indigo-700 hover:to-blue-700 border border-indigo-400/50'
                  }`}
                >
                  {isExportingAllCompaniesPDF ? (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-200 animate-spin" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-indigo-200" />
                  )}
                  <span>
                    {isExportingAllCompaniesPDF
                      ? 'Hazırlanıyor...'
                      : selectedDonem !== 'all'
                      ? `${selectedDonem} Bütün Firmalar PDF (${repCount})`
                      : `Bütün Firmalar PDF (${repCount})`}
                  </span>
                </button>
              );
            })()}
          </div>
        </div>

        {/* 12 Ay Yan Yana Buton Grubu - BEYAZ BUTONLAR */}
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {/* TÜMÜ Butonu */}
          <button
            type="button"
            onClick={() => setSelectedDonem('all')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all text-center border whitespace-nowrap shrink-0 ${
              selectedDonem === 'all'
                ? 'bg-white text-blue-800 border-2 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)] ring-2 ring-blue-500/25 scale-[1.03] z-10'
                : 'bg-white hover:bg-blue-50 text-slate-900 border-slate-300 hover:border-blue-400 hover:text-blue-800 shadow-sm'
            }`}
          >
            TÜMÜ
          </button>

          {/* 12 Ayın Butonları */}
          {AYLAR.map((ay) => {
            const isSelected = selectedDonem === ay;
            const ayDocCount = records.filter((r) => matchesMonth(r, ay)).length;

            return (
              <button
                key={ay}
                type="button"
                onClick={() => setSelectedDonem(ay)}
                className={`relative px-3 py-2 rounded-xl text-xs font-bold transition-all text-center flex-1 min-w-[72px] flex flex-col items-center justify-center border whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-white text-blue-800 border-2 border-blue-600 font-black shadow-[0_0_15px_rgba(37,99,235,0.3)] ring-2 ring-blue-500/25 scale-[1.03] z-10'
                    : ayDocCount > 0
                    ? 'bg-white hover:bg-blue-50 text-slate-950 border-slate-300 hover:border-blue-400 hover:text-blue-800 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 hover:text-slate-950 shadow-sm'
                }`}
              >
                <span className="font-bold tracking-tight">{ay}</span>
                {ayDocCount > 0 && (
                  <span
                    className={`text-[10px] font-mono leading-none mt-0.5 px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-blue-600 text-white font-black'
                        : 'bg-blue-100 text-blue-900 font-bold border border-blue-300'
                    }`}
                  >
                    {ayDocCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Seçili Aya Ait Toplam Kayıt Adedi ve Toplam Tutar Alanı */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-blue-50/80 border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]" />
            <span className="text-xs text-slate-800 font-semibold">
              {selectedDonem === 'all' ? (
                <span>
                  Tüm Dönemler Özeti
                  {selectedIsinAdiFilter && (
                    <span className="ml-1 text-blue-700 font-bold">({selectedIsinAdiFilter})</span>
                  )}
                </span>
              ) : (
                <span>
                  <strong className="text-blue-800 font-bold tracking-wide">{selectedDonem}</strong> Ayı Evrak Özeti
                  {selectedIsinAdiFilter && (
                    <span className="ml-1 text-blue-700 font-bold">({selectedIsinAdiFilter})</span>
                  )}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 text-xs ml-auto">
            {/* Toplam Kayıt Adedi */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Toplam Kayıt:</span>
              <span className="font-mono font-bold text-blue-900 bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-sm">
                {activeMonthCount} Adet
              </span>
            </div>

            {/* Toplam Tutar */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Toplam Tutar:</span>
              <span className="font-mono font-black text-blue-800 bg-white px-3.5 py-1 rounded-lg border border-blue-300 shadow-sm text-xs sm:text-sm">
                {formatCurrency(activeMonthTotal)}
              </span>
            </div>

            {/* Özet Bandı Hızlı PDF İndir Butonu */}
            <button
              type="button"
              id="btn-summary-fast-pdf"
              onClick={handleExportPDF}
              disabled={records.length === 0 && filteredRecords.length === 0}
              title={
                selectedIsinAdiFilter
                  ? `"${selectedIsinAdiFilter}" İşine Ait ${selectedDonem !== 'all' ? selectedDonem + ' ' : ''}Yatay PDF Raporunu Al`
                  : selectedDonem !== 'all'
                  ? `${selectedDonem} Ayı Yatay Banka Gruplu ve Sıralı PDF Raporunu Al`
                  : 'Yatay Banka Gruplu PDF Raporu Al'
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 ${
                selectedIsinAdiFilter ? 'bg-rose-700 hover:bg-rose-800 ring-2 ring-rose-400/40' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-100" />
              <span>
                {selectedIsinAdiFilter
                  ? `${selectedDonem !== 'all' ? selectedDonem + ' ' : ''}Seçili İş PDF Rapor`
                  : selectedDonem !== 'all'
                  ? `${selectedDonem} PDF Rapor`
                  : 'PDF Rapor'}
              </span>
            </button>

            {/* Özet Bandı Bütün Firmalar Hızlı PDF İndir Butonu */}
            {(() => {
              const repCount = selectedCompaniesForReport ? selectedCompaniesForReport.size : 5;
              return (
                <button
                  type="button"
                  id="btn-summary-all-companies-pdf"
                  onClick={handleExportAllCompaniesPDF}
                  disabled={isExportingAllCompaniesPDF}
                  title={`${selectedDonem !== 'all' ? selectedDonem : 'Tüm'} Dönemi Seçili (${repCount} Şirket) Bütün Firmalar Yatay PDF Raporu`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isExportingAllCompaniesPDF ? (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-200 animate-spin" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-indigo-200" />
                  )}
                  <span>Bütün Firmalar PDF ({repCount})</span>
                </button>
              );
            })()}
          </div>
        </div>

        {/* TÜM DÖNEMLER ÖZETİ ALTINDA İŞİN ADI LİSTBOKSU */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 shrink-0">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>İşin Adı (Proje / Şantiye):</span>
          </div>

          <div className="relative flex-1 min-w-[240px]">
            <select
              id="select-tum-donemler-isin-adi"
              value={selectedIsinAdiFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedIsinAdiFilter(val);
                if (!val) {
                  setSelectedDonem('all');
                }
              }}
              className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer appearance-none transition-all"
            >
              <option value=""></option>
              {existingProjectOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {selectedIsinAdiFilter && (
            <div className="flex items-center gap-2 text-xs shrink-0 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100/90 text-blue-950 font-bold border border-blue-300 shadow-xs">
                <span>🏗️ {selectedIsinAdiFilter}</span>
                <span className="font-mono text-[11px] bg-white text-blue-800 px-2 py-0.5 rounded-md border border-blue-300 font-black">
                  {projectFilteredRecords.length} Adet • {formatCurrency(projectFilteredTotal)}
                </span>
              </span>
              {/* Seçili İş İçin Doğrudan PDF İndir Butonu */}
              <button
                type="button"
                id="btn-isin-adi-direct-pdf-download"
                onClick={handleExportPDF}
                title={`"${selectedIsinAdiFilter}" İşine Ait Yatay PDF Raporu İndir / Yazdır`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all font-bold cursor-pointer shadow-xs hover:scale-105 active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-rose-100" />
                <span>PDF İndir</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedIsinAdiFilter('');
                  setSelectedDonem('all');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all font-semibold cursor-pointer shadow-xs active:scale-95"
                title="İşin Adı Filtresini Temizle"
              >
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span>Temizle</span>
              </button>
            </div>
          )}
        </div>

        {/* Hızlı Arama Satırı */}
        <div className="relative w-full pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 mt-0.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Evrak No, Vergi No, Firma Ünvanı, İş Adı veya Banka Ara..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SUPABASE VERİ TABLOSU - BEYAZ TABLO & MAVİ ÇİZGİLİ SATIRLAR */}
      <div className="overflow-hidden rounded-2xl border-2 border-blue-300 bg-white shadow-xl">
        {/* Tablo Başı: Bilgi ve YENİ EVRAK KAYDI Butonu */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b-2 border-blue-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              {config.companyTitle} EVRAK LİSTESİ
            </h3>
            <span className="text-xs font-bold text-blue-700 font-mono bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-300">
              {filteredRecords.length} Kayıt
            </span>
          </div>

          {/* Tablo Üstü İşlem Butonları: ARŞİVE GÖNDER, İPTAL ET (SEÇİM YAPILDIĞINDA EXCEL SOLUNDA ÇIKAR), EXCEL İNDİR, PDF İNDİR, YENİ EVRAK KAYDI */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* TİK İLE SEÇİM YAPILDIĞINDA EXCEL İNDİR SOLUNDA ÇIKAN BUTONLAR */}
            {selectedRowKeys.size > 0 && (
              <>
                {/* ARŞİVE GÖNDER BUTONU */}
                <button
                  type="button"
                  id="btn-move-to-cekarsiv"
                  onClick={() => handleMoveSelectedRecords('cekarsiv')}
                  disabled={isMoving}
                  title={`Seçilen ${selectedRowKeys.size} evrak kaydını cekarsiv tablosuna taşı`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] border border-amber-400/40 cursor-pointer animate-in fade-in duration-200"
                >
                  {isMoving && movingTarget === 'cekarsiv' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Archive className="w-4 h-4 stroke-[2.3] text-amber-200" />
                  )}
                  <span>Arşive Gönder ({selectedRowKeys.size})</span>
                </button>

                {/* İPTAL ET BUTONU */}
                <button
                  type="button"
                  id="btn-move-to-cekiptal"
                  onClick={() => handleMoveSelectedRecords('cekiptal')}
                  disabled={isMoving}
                  title={`Seçilen ${selectedRowKeys.size} evrak kaydını cekiptal tablosuna taşı`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-600 via-rose-700 to-red-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] border border-rose-400/40 cursor-pointer animate-in fade-in duration-200"
                >
                  {isMoving && movingTarget === 'cekiptal' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Ban className="w-4 h-4 stroke-[2.3] text-rose-200" />
                  )}
                  <span>İptal Et ({selectedRowKeys.size})</span>
                </button>
              </>
            )}

            {/* EXCEL İNDİR BUTONU */}
            <button
              type="button"
              id="btn-table-export-excel"
              onClick={handleExportExcel}
              disabled={records.length === 0 && filteredRecords.length === 0}
              title="Tablodaki Bütün Evrak Kayıtlarını Excel (.xlsx) Olarak İndir"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
              <span>EXCEL İNDİR</span>
            </button>

            {/* PDF İNDİR BUTONU */}
            <button
              type="button"
              id="btn-table-export-pdf"
              onClick={handleExportPDF}
              disabled={records.length === 0 && filteredRecords.length === 0}
              title={
                selectedIsinAdiFilter
                  ? `"${selectedIsinAdiFilter}" İşine Ait ${selectedDonem !== 'all' ? selectedDonem + ' Ayı ' : ''}Çeklerini Banka Gruplu ve Sıralı Yatay PDF Olarak İndir / Yazdır`
                  : selectedDonem !== 'all'
                  ? `${selectedDonem} Ayı Çeklerini Banka Gruplu, Tutara Göre Küçükten Büyüğe Sıralı Yatay PDF Olarak İndir / Yazdır`
                  : 'Tablodaki Bütün Evrak Kayıtlarını Yatay PDF Olarak İndir / Yazdır'
              }
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                selectedIsinAdiFilter ? 'bg-rose-700 hover:bg-rose-800 ring-2 ring-rose-400/50' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <FileText className="w-4 h-4 stroke-[2.2]" />
              <span>
                {selectedIsinAdiFilter
                  ? `${selectedDonem !== 'all' ? selectedDonem + ' ' : ''}Seçili İş PDF İndir`
                  : selectedDonem !== 'all'
                  ? `${selectedDonem} PDF İNDİR`
                  : 'PDF İNDİR'}
              </span>
            </button>

            {/* YENİ EVRAK KAYDI BUTONU */}
            <button
              type="button"
              id="btn-table-new-doc"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>YENİ EVRAK KAYDI</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center bg-white">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-800">
              Supabase "{activeTableName || config.tableName}" Tablosu Yükleniyor...
            </p>
            <p className="text-xs text-slate-500 mt-1">Lütfen bekleyin, veriler çekiliyor.</p>
          </div>
        ) : error ? (
          /* Hata veya Tablo henüz Supabase'de oluşturulmamışsa bilgilendirme */
          <div className="p-12 text-center bg-white border-2 border-rose-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-300 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Supabase Tablosu Bulunamadı veya Boş</h4>
            <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto">
              Supabase projenizde <code className="text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-bold border border-blue-200">{activeTableName || config.tableName}</code> tablosu henüz açılmamış olabilir ya da RLS izinleri gereklidir.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRefresh}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Tekrar Dene
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>YENİ EVRAK KAYDI</span>
              </button>
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          /* İstenen "KAYIT BULUNMAMAKTADIR" mesajı */
          <div className="p-16 text-center bg-white">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">Kayıt Bulunmamaktadır</h4>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              "{config.companyTitle}" için Supabase <span className="font-mono font-semibold text-blue-800">{activeTableName || config.tableName}</span> tablosunda henüz girilmiş bir evrak kaydı mevcut değildir.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                <span>YENİ EVRAK KAYDI</span>
              </button>
            </div>
          </div>
        ) : (
          /* TABLO DOLU İSE BEYAZ TABLO VE MAVİ ÇİZGİLİ SATIRLAR */
          <div>
            {/* Toplu Seçim Bilgi Çubuğu */}
            {selectedRowKeys.size > 0 && (
              <div className="p-3 bg-blue-50 border-b-2 border-blue-400 flex flex-wrap items-center justify-between gap-2.5 text-xs font-bold text-blue-950 px-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-700" />
                  <span>
                    Seçilen: <strong>{selectedRowKeys.size}</strong> / Toplam:{' '}
                    <strong>{filteredRecords.length}</strong> evrak
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  {/* Arşive Gönder Butonu */}
                  <button
                    type="button"
                    onClick={() => handleMoveSelectedRecords('cekarsiv')}
                    disabled={isMoving}
                    title="Seçili kayıtları cekarsiv tablosuna taşı"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isMoving && movingTarget === 'cekarsiv' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                    <span>Arşive Gönder ({selectedRowKeys.size})</span>
                  </button>

                  {/* İptal Et Butonu */}
                  <button
                    type="button"
                    onClick={() => handleMoveSelectedRecords('cekiptal')}
                    disabled={isMoving}
                    title="Seçili kayıtları cekiptal tablosuna taşı"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isMoving && movingTarget === 'cekiptal' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Ban className="w-3.5 h-3.5" />
                    )}
                    <span>İptal Et ({selectedRowKeys.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 transition-colors shadow-xs"
                  >
                    {isAllVisibleSelected ? 'Bu Sayfadaki Seçimleri Kaldır' : 'Bu Sayfayı Tümüyle Seç'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRowKeys(new Set())}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 transition-colors shadow-xs"
                  >
                    Seçimi Sıfırla
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="border-b-2 border-blue-500 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    {/* TİK KUTUCUĞU & TÜMÜNÜ SEÇ */}
                    <th className="py-3.5 px-3 text-center w-12 text-slate-800">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          id="checkbox-select-all"
                          title={isAllVisibleSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                          aria-label="Tümünü Seç"
                          checked={isAllVisibleSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeVisibleSelected;
                          }}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-slate-800">EVRAK TARİHİ</th>
                    <th className="py-3.5 px-3 text-slate-800">DÖNEM</th>
                    <th className="py-3.5 px-4 text-slate-800">EVRAK NUMARASI</th>
                    <th className="py-3.5 px-4 min-w-[200px] text-slate-800">FİRMA ÜNVANI</th>
                    <th className="py-3.5 px-4 text-slate-800">BANKA ADI</th>
                    <th className="py-3.5 px-4 min-w-[220px] text-slate-800">İŞİN ADI</th>
                    <th className="py-3.5 px-4 text-right text-slate-800">TUTARI</th>
                    <th className="py-3.5 px-3 text-center text-slate-800">İŞLEMLER</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-blue-200 text-xs bg-white">
                  {displayedRecords.map((row, idx) => {
                    const rowKey = getRowKey(row, idx);
                    const isSelected = selectedRowKeys.has(rowKey);
                    const currentMonthIdx = getRecordMonthIndex(row);
                    const prevMonthIdx = idx > 0 ? getRecordMonthIndex(displayedRecords[idx - 1]) : -1;
                    const isNewMonth = selectedDonem === 'all' && (idx === 0 || currentMonthIdx !== prevMonthIdx);
                    const monthName = currentMonthIdx < 12 ? AYLAR[currentMonthIdx] : (row.donem || 'DİĞER');
                    const monthRecords = displayedRecords.filter((r) => getRecordMonthIndex(r) === currentMonthIdx);
                    const monthTotal = monthRecords.reduce((acc, curr) => {
                      const val = typeof curr.tutari === 'number' ? curr.tutari : parseFloat(String(curr.tutari || 0));
                      return acc + (isNaN(val) ? 0 : val);
                    }, 0);

                    return (
                      <React.Fragment key={row.id || rowKey}>
                        {isNewMonth && (
                          <tr className="bg-gradient-to-r from-blue-100 via-indigo-50 to-blue-100 border-y-2 border-blue-400">
                            <td colSpan={9} className="py-2.5 px-4 text-xs font-bold text-blue-950">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-700 text-white text-[11px] font-black shadow-sm">
                                    {currentMonthIdx < 12 ? currentMonthIdx + 1 : '?'}
                                  </span>
                                  <span className="text-sm font-black text-blue-900 tracking-wide uppercase">
                                    {monthName} DÖNEMİ
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-blue-900 font-semibold">
                                  <span className="bg-white/90 px-2.5 py-0.5 rounded border border-blue-200 shadow-xs">
                                    Evrak Sayısı: <strong>{monthRecords.length} Adet</strong>
                                  </span>
                                  <span className="bg-white/90 px-2.5 py-0.5 rounded border border-blue-200 shadow-xs">
                                    Dönem Toplamı: <strong className="text-blue-700">{formatCurrency(monthTotal)}</strong>
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          key={rowKey}
                          className={`transition-colors duration-150 group border-b border-blue-200 ${
                            isSelected
                              ? 'bg-blue-100/80 font-medium'
                              : 'bg-white hover:bg-blue-50/70'
                          }`}
                        >
                          {/* TİK KUTUCUĞU */}
                          <td className="py-3.5 px-3 text-center w-12">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRow(rowKey)}
                                aria-label={`Evrak ${row.evrak_numarasi || idx} seç`}
                                className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                          </td>

                          {/* EVRAK TARİHİ */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-800 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>{row.evrak_tarihi}</span>
                            </div>
                          </td>

                          {/* DÖNEM */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              {row.donem}
                            </span>
                          </td>

                          {/* EVRAK NUMARASI (TIKLANINCA ARSIVCEKLER BUCKET'INDA ARANIR VE AÇILIR) */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-blue-900">
                            <button
                              type="button"
                              onClick={() => handleEvrakNoClick(row.evrak_numarasi, row)}
                              title={`Evrak Arşivini Görüntüle (ARSIVCEKLER) - ${row.evrak_numarasi}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 hover:text-blue-950 font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer group/evrak shadow-xs"
                            >
                              <Hash className="w-3.5 h-3.5 text-blue-500 group-hover/evrak:text-blue-700" />
                              <span className="underline decoration-blue-400/80 underline-offset-2">
                                {row.evrak_numarasi}
                              </span>
                              {checkingEvrakNo === row.evrak_numarasi ? (
                                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin ml-0.5" />
                              ) : (
                                <ExternalLink className="w-3 h-3 text-blue-400 opacity-60 group-hover/evrak:opacity-100 ml-0.5" />
                              )}
                            </button>
                          </td>

                          {/* FİRMA ÜNVANI */}
                          <td className="py-3.5 px-4 text-slate-900 font-bold">
                            <div className="truncate max-w-[240px]" title={row.firma_unvani}>
                              {row.firma_unvani}
                            </div>
                          </td>

                          {/* BANKA ADI */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-800 font-medium">
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{row.banka_adi || '-'}</span>
                            </div>
                          </td>

                          {/* İŞİN ADI */}
                          <td className="py-3.5 px-4 text-slate-900 font-medium">
                            <div className="flex items-start gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-2" title={row.isin_adi}>
                                {row.isin_adi}
                              </span>
                            </div>
                          </td>

                          {/* TUTARI */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono font-black text-blue-900 text-sm">
                            {formatCurrency(row.tutari)}
                          </td>

                          {/* İŞLEMLER (GÜNCELLE VE SİL BUTONLARI) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* GÜNCELLE BUTONU */}
                              <button
                                type="button"
                                onClick={() => handleStartUpdate(row)}
                                title="Evrakı Düzenle / Güncelle"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>GÜNCELLE</span>
                              </button>

                              {/* SİL BUTONU */}
                              <button
                                type="button"
                                onClick={() => handleStartDelete(row)}
                                title="Evrakı Sil"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>SİL</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TÜM VERİLER BİLGİ BANDI */}
            <div className="p-3.5 bg-slate-50 border-t-2 border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-700 font-medium">
                {!selectedIsinAdiFilter ? (
                  <span>
                    Toplam <strong className="font-bold text-blue-900">{filteredRecords.length}</strong> evrak listeleniyor{' '}
                    <span className="text-emerald-700 font-bold ml-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      ✓ Tüm Verilerin Tamamı Görünüyor
                    </span>
                  </span>
                ) : (
                  <span>
                    "<strong>{selectedIsinAdiFilter}</strong>" projesine ait toplam{' '}
                    <strong className="font-bold text-blue-900">{filteredRecords.length}</strong> evrak listeleniyor
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {!selectedIsinAdiFilter
                  ? 'İşin Adı listboksu boş olduğunda evrak listesindeki tüm veriler kesintisiz listelenir.'
                  : `Seçili İş: ${selectedIsinAdiFilter}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: YENİ SUPABASE SATIRI EKLE */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    YENİ EVRAK KAYIT
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {config.companyTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-4 sm:p-6 space-y-3.5">
              {/* Tarih ve Dönem */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    EVRAK TARİHİ *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.evrak_tarihi}
                    onChange={(e) => setFormData({ ...formData, evrak_tarihi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    DÖNEM *
                  </label>
                  <select
                    required
                    value={formData.donem}
                    onChange={(e) => setFormData({ ...formData, donem: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {AYLAR.map((ay) => (
                      <option key={ay} value={ay} className="bg-slate-900 text-slate-200">
                        {ay}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Evrak Numarası */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    EVRAK NUMARASI *
                  </label>
                  {duplicateWarning && (
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      Mükerrer Kayıt Uyarısı
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formData.evrak_numarasi}
                  onChange={(e) => handleEvrakNoChange(e.target.value)}
                  onBlur={handleEvrakNoBlur}
                  className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs font-mono focus:outline-none transition-colors ${
                    duplicateWarning
                      ? 'border-amber-500/80 text-amber-300 ring-1 ring-amber-500/40'
                      : 'border-slate-800 text-amber-400 focus:border-amber-500'
                  }`}
                />
                {duplicateWarning && (
                  <div className="mt-1.5 p-2 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-start gap-2 text-xs text-amber-300 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{duplicateWarning}</span>
                  </div>
                )}
              </div>

              {/* Firma Ünvanı ve Vergi No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    FİRMA ÜNVANI *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Firma Ünvanı Giriniz..."
                    value={formData.firma_unvani}
                    onChange={(e) => setFormData({ ...formData, firma_unvani: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    VERGİ NUMARASI
                  </label>
                  <input
                    type="text"
                    value={formData.vergi_numarasi}
                    onChange={(e) => setFormData({ ...formData, vergi_numarasi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Banka Adı ve Tutarı */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      BANKA ADI (LİSTBOKS)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomBankAdd(!isCustomBankAdd)}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      {isCustomBankAdd ? '← Listeden Seç' : '+ Yeni Banka Yaz'}
                    </button>
                  </div>
                  {!isCustomBankAdd && existingBankOptions.length > 0 ? (
                    <select
                      value={formData.banka_adi}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomBankAdd(true);
                          setFormData({ ...formData, banka_adi: '' });
                        } else {
                          setFormData({ ...formData, banka_adi: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">-- Banka Seçiniz ({existingBankOptions.length} Banka Mevcut) --</option>
                      {existingBankOptions.map((bank) => (
                        <option key={bank} value={bank}>
                          🏛️ {bank}
                        </option>
                      ))}
                      <option value="__NEW__">✍️ + Yeni Banka Ekle (Elle Yaz)...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Banka Adı Giriniz (örn: Garanti BBVA)..."
                      value={formData.banka_adi}
                      onChange={(e) => setFormData({ ...formData, banka_adi: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    TUTARI (TL)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.tutari}
                    onChange={(e) => setFormData({ ...formData, tutari: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
                  />
                  {/* Canlı Tutar TL Önizlemesi */}
                  {getLiveTutarDisplay(formData.tutari) && (
                    <div className="mt-1.5 flex items-center justify-between text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-sm animate-in fade-in duration-200">
                      <span className="text-slate-400 font-normal">TL Gösterimi:</span>
                      <span className="font-mono text-emerald-300 font-bold text-sm">
                        {getLiveTutarDisplay(formData.tutari)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* İşin Adı */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    İŞİN ADI / PROJE / ŞANTİYE * (LİSTBOKS)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomProjectAdd(!isCustomProjectAdd)}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    {isCustomProjectAdd ? '← Listeden Seç' : '+ Yeni Proje Yaz'}
                  </button>
                </div>
                {!isCustomProjectAdd && existingProjectOptions.length > 0 ? (
                  <select
                    required
                    value={formData.isin_adi}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomProjectAdd(true);
                        setFormData({ ...formData, isin_adi: '' });
                      } else {
                        setFormData({ ...formData, isin_adi: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- İşin Adı / Proje Seçiniz ({existingProjectOptions.length} Proje Mevcut) --</option>
                    {existingProjectOptions.map((proj) => (
                      <option key={proj} value={proj}>
                        🏗️ {proj}
                      </option>
                    ))}
                    <option value="__NEW__">✍️ + Yeni Proje / İşin Adı Ekle (Elle Yaz)...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="İşin Adı / Proje / Şantiye Yazınız..."
                    value={formData.isin_adi}
                    onChange={(e) => setFormData({ ...formData, isin_adi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>

              {/* Ek Açıklama */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  AÇIKLAMA / NOT
                </label>
                <textarea
                  rows={2}
                  value={formData.aciklama}
                  onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Butonlar */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Kaydediliyor...' : 'KAYDET'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EVRAK GÜNCELLEME */}
      {isEditModalOpen && editingRecord && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white border-2 border-blue-300 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/30 text-white flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    EVRAK KAYDI GÜNCELLE
                  </h3>
                  <p className="text-xs text-blue-100 font-mono">
                    {editingRecord.evrak_numarasi} • {config.companyTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-4 sm:p-6 space-y-3.5 bg-white">
              {/* Tarih ve Dönem */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    EVRAK TARİHİ *
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.evrak_tarihi}
                    onChange={(e) => setEditFormData({ ...editFormData, evrak_tarihi: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    DÖNEM *
                  </label>
                  <select
                    required
                    value={editFormData.donem}
                    onChange={(e) => setEditFormData({ ...editFormData, donem: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                  >
                    {AYLAR.map((ay) => (
                      <option key={ay} value={ay} className="bg-white text-slate-900">
                        {ay}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Evrak Numarası */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  EVRAK NUMARASI *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.evrak_numarasi}
                  onChange={(e) => setEditFormData({ ...editFormData, evrak_numarasi: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Firma Ünvanı ve Vergi No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    FİRMA ÜNVANI *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.firma_unvani}
                    onChange={(e) => setEditFormData({ ...editFormData, firma_unvani: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    VERGİ NUMARASI
                  </label>
                  <input
                    type="text"
                    value={editFormData.vergi_numarasi}
                    onChange={(e) => setEditFormData({ ...editFormData, vergi_numarasi: e.target.value })}
                    placeholder="10 Haneli Vergi No"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Banka Adı ve Tutar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      BANKA ADI (LİSTBOKS)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomBankEdit(!isCustomBankEdit)}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      {isCustomBankEdit ? '← Listeden Seç' : '+ Yeni Banka Yaz'}
                    </button>
                  </div>
                  {!isCustomBankEdit && existingBankOptions.length > 0 ? (
                    <select
                      value={editFormData.banka_adi}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomBankEdit(true);
                          setEditFormData({ ...editFormData, banka_adi: '' });
                        } else {
                          setEditFormData({ ...editFormData, banka_adi: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                    >
                      <option value="">-- Banka Seçiniz ({existingBankOptions.length} Banka Mevcut) --</option>
                      {existingBankOptions.map((bank) => (
                        <option key={bank} value={bank}>
                          🏛️ {bank}
                        </option>
                      ))}
                      <option value="__NEW__">✍️ + Yeni Banka Ekle (Elle Yaz)...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editFormData.banka_adi}
                      onChange={(e) => setEditFormData({ ...editFormData, banka_adi: e.target.value })}
                      placeholder="Örn: Garanti BBVA, Vakıfbank..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    TUTAR (TL) *
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={editFormData.tutari}
                    onChange={(e) => setEditFormData({ ...editFormData, tutari: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                  {getLiveTutarDisplay(editFormData.tutari) && (
                    <div className="mt-1.5 flex items-center justify-between text-xs font-semibold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                      <span className="text-slate-600 font-normal">TL Gösterimi:</span>
                      <span className="font-mono text-blue-900 font-bold text-sm">
                        {getLiveTutarDisplay(editFormData.tutari)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* İşin Adı */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    İŞİN ADI / PROJE / ŞANTİYE * (LİSTBOKS)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomProjectEdit(!isCustomProjectEdit)}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                  >
                    {isCustomProjectEdit ? '← Listeden Seç' : '+ Yeni Proje Yaz'}
                  </button>
                </div>
                {!isCustomProjectEdit && existingProjectOptions.length > 0 ? (
                  <select
                    required
                    value={editFormData.isin_adi}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomProjectEdit(true);
                        setEditFormData({ ...editFormData, isin_adi: '' });
                      } else {
                        setEditFormData({ ...editFormData, isin_adi: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                  >
                    <option value="">-- İşin Adı / Proje Seçiniz ({existingProjectOptions.length} Proje Mevcut) --</option>
                    {existingProjectOptions.map((proj) => (
                      <option key={proj} value={proj}>
                        🏗️ {proj}
                      </option>
                    ))}
                    <option value="__NEW__">✍️ + Yeni Proje / İşin Adı Ekle (Elle Yaz)...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="İşin Adı / Proje / Şantiye Yazınız..."
                    value={editFormData.isin_adi}
                    onChange={(e) => setEditFormData({ ...editFormData, isin_adi: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                )}
              </div>

              {/* Ek Açıklama */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  AÇIKLAMA / NOT
                </label>
                <textarea
                  rows={2}
                  value={editFormData.aciklama}
                  onChange={(e) => setEditFormData({ ...editFormData, aciklama: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 resize-none shadow-sm"
                />
              </div>

              {/* Butonlar */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Güncelleniyor...' : 'GÜNCELLEMEYİ ONAYLA'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GENEL ONAY PENCERESİ (SİLME VE GÜNCELLEME ÖNCESİ ONAY) */}
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
                  : 'bg-gradient-to-r from-blue-600 to-blue-700'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {confirmDialog.type === 'danger' ? (
                  <Trash2 className="w-5 h-5 text-white" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-white" />
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

              {/* Bilgi Kartı */}
              {confirmDialog.details && confirmDialog.details.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                  {confirmDialog.details.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">{item.label}:</span>
                      <span className="font-semibold text-slate-900 text-right truncate max-w-[220px]">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Butonları */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {confirmDialog.cancelLabel || 'İptal'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cb = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    cb();
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                    confirmDialog.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{confirmDialog.confirmLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TOPLU KAYIT YAPMA ONAYI (Kullanıcı İsteği: Önce Onay İste Sonra Aç) */}
      {isBulkConfirmModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsBulkConfirmModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-b border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                  <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                    Toplu Kayıt Yapma Onayı
                  </h3>
                  <p className="text-xs text-emerald-800 font-semibold">
                    {config.companyTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkConfirmModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5 text-slate-700">
              <p className="text-xs sm:text-sm leading-relaxed font-medium">
                <strong className="text-slate-950 font-bold">{config.companyTitle}</strong> veri tablosuna Excel dosyasından toplu evrak kaydı yüklemek üzeresiniz.
              </p>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sadece Excel Dosyası Yüklenir</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-normal pl-5.5">
                  Onay verdikten sonra bilgisayarınızdan <strong>.xlsx</strong> veya <strong>.xls</strong> formatındaki Excel dosyasını seçebileceğiniz pencere açılacaktır.
                </p>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Dosya seçimi penceresini açmak ve toplu evrak yükleme işlemine devam etmek istiyor musunuz?
              </p>
            </div>

            {/* Modal Footer / Butonlar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBulkConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
              >
                Vazgeç / İptal
              </button>
              <button
                type="button"
                id="btn-confirm-and-open-excel"
                onClick={() => {
                  setIsBulkConfirmModalOpen(false);
                  setTimeout(() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }, 50);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
                <span>Evet, Excel Dosyası Seç</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARŞİV EVRAK KONTROL & ÖNİZLEME MODALI (ARSIVCEKLER) */}
      <ArchiveDocModal
        isOpen={archiveModal.isOpen}
        onClose={() => setArchiveModal((prev) => ({ ...prev, isOpen: false }))}
        evrakNo={archiveModal.evrakNo}
        result={archiveModal.result}
        isLoading={archiveModal.isLoading}
        recordDetails={archiveModal.recordDetails}
      />

      {/* ÖDENENLER (cekarsiv) VEYA İPTAL EDİLENLER (cekiptal) SAYFASI */}
      {activeArchiveView && (
        <ArchiveListView
          type={activeArchiveView}
          onClose={() => setActiveArchiveView(null)}
        />
      )}
    </div>
  );
};
