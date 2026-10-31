import { CompanyInfo, CompanyKey } from '../types';

export const COMPANIES: Record<CompanyKey, CompanyInfo> = {
  bayburt_ozka: {
    id: 'bayburt_ozka',
    name: 'BAYBURT ÖZ-KA İNŞAAT',
    shortName: 'BAYBURT ÖZ-KA',
    badge: 'MERKEZ ŞİRKET',
    color: 'amber',
    accentGlow: 'rgba(245, 158, 11, 0.45)',
    iconType: 'building',
    description: 'Bayburt Öz-Ka İnşaat San. ve Tic. A.Ş. Merkez ve Taahhüt Projeleri',
  },
  selahattin_kaldirim: {
    id: 'selahattin_kaldirim',
    name: 'SELAHATTİN KALDIRIM İNŞAAT',
    shortName: 'SELAHATTİN KALDIRIM',
    badge: 'İNŞAAT TAAHHÜT',
    color: 'blue',
    accentGlow: 'rgba(59, 130, 246, 0.45)',
    iconType: 'hard-hat',
    description: 'Selahattin Kaldırım İnşaat Altyapı ve Üstyapı Şantiye Yönetimi',
  },
  arnavutkoy_seka_ozka: {
    id: 'arnavutkoy_seka_ozka',
    name: 'ARNAVUTKÖY (SEKA-ÖZKA)',
    shortName: 'ARNAVUTKÖY (SEKA-ÖZKA)',
    badge: 'ORTAK GİRİŞİM',
    color: 'emerald',
    accentGlow: 'rgba(16, 185, 129, 0.45)',
    iconType: 'landmark',
    description: 'Arnavutköy Konut ve Altyapı Projesi SEKA-ÖZKA İş Ortaklığı',
  },
  mamak_seka_ozka: {
    id: 'mamak_seka_ozka',
    name: 'MAMAK (SEKA-ÖZKA)',
    shortName: 'MAMAK (SEKA-ÖZKA)',
    badge: 'ORTAK GİRİŞİM',
    color: 'purple',
    accentGlow: 'rgba(168, 85, 247, 0.45)',
    iconType: 'hammer',
    description: 'Ankara Mamak Kentsel Dönüşüm & Tünel Projesi SEKA-ÖZKA İş Ortaklığı',
  },
  senbay_ozka: {
    id: 'senbay_ozka',
    name: 'ŞENBAY-ÖZKA ORTAKLIĞI',
    shortName: 'ŞENBAY-ÖZKA',
    badge: 'İŞ ORTAKLIĞI',
    color: 'rose',
    accentGlow: 'rgba(244, 63, 94, 0.45)',
    iconType: 'shield',
    description: 'Şenbay Madencilik - Öz-Ka İnşaat Otoyol ve Metro Altyapı Ortaklığı',
  },
};

export const COMPANY_LIST: CompanyInfo[] = [
  COMPANIES.bayburt_ozka,
  COMPANIES.selahattin_kaldirim,
  COMPANIES.arnavutkoy_seka_ozka,
  COMPANIES.mamak_seka_ozka,
  COMPANIES.senbay_ozka,
];
