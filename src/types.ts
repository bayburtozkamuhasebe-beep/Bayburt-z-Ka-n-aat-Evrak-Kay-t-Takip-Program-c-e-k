export type CompanyKey =
  | 'bayburt_ozka'
  | 'selahattin_kaldirim'
  | 'arnavutkoy_seka_ozka'
  | 'mamak_seka_ozka'
  | 'senbay_ozka';

export interface CompanyInfo {
  id: CompanyKey;
  name: string;
  shortName: string;
  badge: string;
  taxNumber?: string;
  color: string;
  accentGlow: string;
  iconType: 'building' | 'hard-hat' | 'hammer' | 'landmark' | 'shield';
  description: string;
}

export type DocumentType =
  | 'Gelen Evrak'
  | 'Giden Evrak'
  | 'Hakediş Raporu'
  | 'Fatura & İrsaliye'
  | 'Sözleşme'
  | 'Teminat Mektubu'
  | 'Resmi Yazı / Dilekçe'
  | 'Şantiye Tutanağı'
  | 'Proje & Ruhsat';

export type DocumentStatus =
  | 'İşlemde'
  | 'Onaylandı'
  | 'Cevap Bekleniyor'
  | 'Arşivlendi'
  | 'Teslim Edildi';

export type PriorityLevel = 'Normal' | 'Yüksek' | 'Acil';

export interface DocumentRecord {
  id: string;
  docNumber: string; // e.g. "BYB-2026/0412"
  company: CompanyKey;
  docType: DocumentType;
  direction: 'Gelen' | 'Giden';
  date: string; // YYYY-MM-DD
  senderRecipient: string; // Karayolları 10. Bölge, DSİ, Belediye, etc.
  subject: string;
  description?: string;
  status: DocumentStatus;
  priority: PriorityLevel;
  attachedFileName?: string;
  attachedFileSize?: string;
  referenceNo?: string;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilterState {
  searchTerm: string;
  company: CompanyKey | 'all';
  direction: 'all' | 'Gelen' | 'Giden';
  docType: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
}
