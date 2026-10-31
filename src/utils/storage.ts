import { DocumentRecord, DocumentFilterState, CompanyKey } from '../types';
import { INITIAL_DOCUMENTS } from '../data/initialDocuments';
import { COMPANIES } from '../data/companies';

const STORAGE_KEY = 'bayburt_ozka_evrak_takip_v4_clean';

export const loadDocuments = (): DocumentRecord[] => {
  try {
    // Eski test ve sahte verileri temizle
    localStorage.removeItem('bayburt_ozka_evrak_takip_v2');
    localStorage.removeItem('bayburt_ozka_evrak_takip_v1');
    localStorage.removeItem('bayburt_ozka_evrak_takip');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('LocalStorage load failed:', err);
    return [];
  }
};

export const saveDocuments = (documents: DocumentRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch (err) {
    console.error('LocalStorage save failed:', err);
  }
};

export const generateDocNumber = (company: CompanyKey, existingCount = 0): string => {
  const year = new Date().getFullYear();
  const sequence = String(existingCount + 1).padStart(4, '0');
  switch (company) {
    case 'bayburt_ozka':
      return `BYB-${year}/${sequence}`;
    case 'selahattin_kaldirim':
      return `SK-${year}/${sequence}`;
    case 'arnavutkoy_seka_ozka':
      return `SEKA-ÖZK-ARN/${sequence}`;
    case 'mamak_seka_ozka':
      return `MMK-SEKA/${sequence}`;
    case 'senbay_ozka':
      return `ŞEN-ÖZK-${year}/${sequence}`;
    default:
      return `EVR-${year}/${sequence}`;
  }
};

export const filterDocuments = (
  docs: DocumentRecord[],
  filters: DocumentFilterState
): DocumentRecord[] => {
  return docs.filter((doc) => {
    // Company match
    if (filters.company !== 'all' && doc.company !== filters.company) {
      return false;
    }

    // Direction match
    if (filters.direction !== 'all' && doc.direction !== filters.direction) {
      return false;
    }

    // Type match
    if (filters.docType && filters.docType !== 'all' && doc.docType !== filters.docType) {
      return false;
    }

    // Status match
    if (filters.status && filters.status !== 'all' && doc.status !== filters.status) {
      return false;
    }

    // Priority match
    if (filters.priority && filters.priority !== 'all' && doc.priority !== filters.priority) {
      return false;
    }

    // Date range
    if (filters.startDate && doc.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && doc.date > filters.endDate) {
      return false;
    }

    // Search query across docNumber, subject, senderRecipient, description, tags, registeredBy
    if (filters.searchTerm.trim()) {
      const q = filters.searchTerm.toLowerCase().trim();
      const matchDocNo = doc.docNumber.toLowerCase().includes(q);
      const matchSubject = doc.subject.toLowerCase().includes(q);
      const matchSender = doc.senderRecipient.toLowerCase().includes(q);
      const matchDesc = (doc.description || '').toLowerCase().includes(q);
      const matchRef = (doc.referenceNo || '').toLowerCase().includes(q);
      const matchCompany = (COMPANIES[doc.company]?.name || '').toLowerCase().includes(q);
      if (!matchDocNo && !matchSubject && !matchSender && !matchDesc && !matchRef && !matchCompany) {
        return false;
      }
    }

    return true;
  });
};

export const exportToExcelCSV = (documents: DocumentRecord[]): void => {
  const headers = [
    'Evrak No',
    'Şirket / Ortaklık',
    'Tarih',
    'Yön',
    'Evrak Türü',
    'Muhatap / Gönderen',
    'Konu',
    'Durum',
    'Öncelik',
    'Ek Dosya',
    'Kayıt Yapan',
  ];

  const escapeCSV = (val: string | undefined | null) => {
    if (!val) return '""';
    const clean = String(val).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = documents.map((d) => [
    escapeCSV(d.docNumber),
    escapeCSV(COMPANIES[d.company]?.name || d.company),
    escapeCSV(d.date),
    escapeCSV(d.direction),
    escapeCSV(d.docType),
    escapeCSV(d.senderRecipient),
    escapeCSV(d.subject),
    escapeCSV(d.status),
    escapeCSV(d.priority),
    escapeCSV(d.attachedFileName || 'Yok'),
    escapeCSV(d.registeredBy),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bayburt_Ozka_Evrak_Listesi_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
