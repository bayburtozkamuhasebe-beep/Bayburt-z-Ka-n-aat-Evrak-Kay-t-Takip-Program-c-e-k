import { createClient } from '@supabase/supabase-js';

// Supabase Proje Detayları
export const SUPABASE_PROJECT_ID = 'gboathwmaanqxuwsryud';
export const SUPABASE_URL = 'https://gboathwmaanqxuwsryud.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib2F0aHdtYWFucXh1d3NyeXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjQ1NzMsImV4cCI6MjEwMzI0MDU3M30.kfzk-ftX6VOjJCqHO20YOtfNzipa5AQz4fJ5xvcRpUc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Her şirket butonu için tanımlı tablo isimleri ve Supabase Dashboard URL'leri
export interface SupabaseTableConfig {
  tableName: string;
  fallbackTableNames?: string[]; // Yazım farklılığı toleransı için (örn: bayburtozkaaevrakkayit vs bayburtozkaevrakkayit)
  companyTitle: string;
  shortName: string;
  dashboardUrl: string;
  description: string;
  themeColor: 'amber' | 'blue' | 'emerald' | 'purple' | 'rose';
}

export const SUPABASE_COMPANY_TABLES: Record<string, SupabaseTableConfig> = {
  bayburt_ozka: {
    tableName: 'bayburtozkaevrakkayit',
    fallbackTableNames: ['bayburtozkaevrakkayit', 'bayburtozkaaevrakkayit'],
    companyTitle: 'BAYBURT ÖZ-KA İNŞAAT',
    shortName: 'BAYBURT ÖZ-KA',
    dashboardUrl:
      'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18650?schema=public/bayburtozkaevrakkayit',
    description: 'Bayburt Öz-Ka İnşaat San. ve Tic. A.Ş. Muhasebe ve Evrak Kayıtları',
    themeColor: 'amber',
  },
  selahattin_kaldirim: {
    tableName: 'sekaevrakkayit',
    fallbackTableNames: ['sekaevrakkayit', 'sekaaevrakkayit'],
    companyTitle: 'SELAHATTİN KALDIRIM İNŞAAT',
    shortName: 'SELAHATTİN KALDIRIM',
    dashboardUrl:
      'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18650?schema=public/sekaevrakkayit',
    description: 'Selahattin Kaldırım İnşaat Muhasebe ve Şantiye Evrak Kayıtları',
    themeColor: 'blue',
  },
  arnavutkoy_seka_ozka: {
    tableName: 'arnavutkoyevrakkayit',
    fallbackTableNames: ['arnavutkoyevrakkayit'],
    companyTitle: 'ARNAVUTKÖY (SEKA-ÖZKA)',
    shortName: 'ARNAVUTKÖY',
    dashboardUrl:
      'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18650?schema=public/arnavutkoyevrakkayit',
    description: 'Arnavutköy Konut ve Altyapı Projesi SEKA-ÖZKA İş Ortaklığı',
    themeColor: 'emerald',
  },
  mamak_seka_ozka: {
    tableName: 'mamakevrakkayit',
    fallbackTableNames: ['mamakevrakkayit'],
    companyTitle: 'MAMAK (SEKA-ÖZKA)',
    shortName: 'MAMAK',
    dashboardUrl:
      'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18650?schema=public/mamakevrakkayit',
    description: 'Ankara Mamak Kentsel Dönüşüm & Tünel Projesi SEKA-ÖZKA Ortaklığı',
    themeColor: 'purple',
  },
  senbay_ozka: {
    tableName: 'senbayevrakkayit',
    fallbackTableNames: ['senbayevrakkayit'],
    companyTitle: 'ŞENBAY-ÖZKA ORTAKLIĞI',
    shortName: 'ŞENBAY-ÖZKA',
    dashboardUrl:
      'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18650?schema=public/senbayevrakkayit',
    description: 'Şenbay Madencilik - Öz-Ka İnşaat Otoyol ve Metro Altyapı Ortaklığı',
    themeColor: 'rose',
  },
};

// Supabase Tablo Satır Tipi (İstenen tüm sütunlar)
export interface SupabaseEvrakRow {
  id?: string;
  evrak_tarihi: string; // EVRAK TARİHİ
  donem: string; // DÖNEM
  evrak_numarasi: string; // EVRAK NUMARASI
  firma_unvani: string; // FİRMA ÜNVANI
  vergi_numarasi?: string | null; // VERGİ NUMARASI
  banka_adi?: string | null; // BANKAADI
  isin_adi: string; // İŞİN ADI
  tutari: number | string; // TUTARI
  aciklama?: string | null;
  olusturulma_tarihi?: string;
  guncellenme_tarihi?: string;
}

// Kolon isimlerini toleranslı şekilde normalize etme
export function normalizeEvrakRow(r: any): SupabaseEvrakRow {
  return {
    id: r.id ? String(r.id) : undefined,
    evrak_tarihi: r.evrak_tarihi || r.evraktarihi || r.tarih || '',
    donem: r.donem || '',
    evrak_numarasi: r.evrak_numarasi || r.evraknumarasi || r.evrak_no || r.evrakno || '',
    firma_unvani: r.firma_unvani || r.firmaunvani || r.unvan || '',
    vergi_numarasi: r.vergi_numarasi || r.verginumarasi || r.vkn || null,
    banka_adi: r.banka_adi || r.bankaadi || r.banka || null,
    isin_adi: r.isin_adi || r.isinadi || r.is_adi || '',
    tutari: r.tutari !== undefined && r.tutari !== null ? r.tutari : (r.tutar !== undefined ? r.tutar : 0),
    aciklama: r.aciklama || null,
    olusturulma_tarihi: r.olusturulma_tarihi || r.created_at,
    guncellenme_tarihi: r.guncellenme_tarihi || r.updated_at,
  };
}

// Belirtilen tablodan veri çekme servisi (toleranslı)
export async function fetchCompanyEvraklar(companyKey: string): Promise<{
  data: SupabaseEvrakRow[];
  error: string | null;
  activeTableName: string;
}> {
  const config = SUPABASE_COMPANY_TABLES[companyKey];
  if (!config) {
    return { data: [], error: 'Geçersiz şirket seçimi.', activeTableName: '' };
  }

  const tablesToTry = config.fallbackTableNames || [config.tableName];

  let lastError: any = null;
  for (const tName of tablesToTry) {
    try {
      let { data, error } = await supabase
        .from(tName)
        .select('*')
        .order('evrak_tarihi', { ascending: false });

      // evrak_tarihi kolonu yoksa ordersız dene
      if (error) {
        const retry = await supabase.from(tName).select('*');
        if (!retry.error && retry.data) {
          data = retry.data;
          error = null;
        }
      }

      if (!error && data) {
        const mapped = data.map(normalizeEvrakRow);
        mapped.sort((a, b) => (b.evrak_tarihi || '').localeCompare(a.evrak_tarihi || ''));
        return {
          data: mapped,
          error: null,
          activeTableName: tName,
        };
      }
      lastError = error;
    } catch (err) {
      lastError = err;
    }
  }

  return {
    data: [],
    error: lastError ? (lastError.message || String(lastError)) : 'Tabloya erişilemedi.',
    activeTableName: config.tableName,
  };
}

export interface CompanyDataResult {
  companyKey: string;
  config: SupabaseTableConfig;
  records: SupabaseEvrakRow[];
  error: string | null;
  activeTableName: string;
}

// Tüm şirketlerin evrak verilerini paralel çekme
export async function fetchAllCompaniesEvraklar(): Promise<CompanyDataResult[]> {
  const keys = Object.keys(SUPABASE_COMPANY_TABLES);
  const results = await Promise.all(
    keys.map(async (key) => {
      const res = await fetchCompanyEvraklar(key);
      return {
        companyKey: key,
        config: SUPABASE_COMPANY_TABLES[key],
        records: res.data,
        error: res.error,
        activeTableName: res.activeTableName,
      };
    })
  );
  return results;
}

// Belirli bir evrak numarasının tabloda kayıtlı olup olmadığını kontrol etme servisi
export async function checkDuplicateEvrakNo(
  companyKey: string,
  evrakNumarasi: string
): Promise<{ exists: boolean; existingRecord?: SupabaseEvrakRow }> {
  const config = SUPABASE_COMPANY_TABLES[companyKey];
  if (!config || !evrakNumarasi) return { exists: false };

  const trimmed = evrakNumarasi.trim();
  const tablesToTry = config.fallbackTableNames || [config.tableName];

  for (const tName of tablesToTry) {
    try {
      // 1. evrak_numarasi ile ara
      let { data, error } = await supabase
        .from(tName)
        .select('*')
        .ilike('evrak_numarasi', trimmed)
        .limit(1);

      // 2. evraknumarasi ile ara
      if (error || !data || data.length === 0) {
        const altRes = await supabase
          .from(tName)
          .select('*')
          .ilike('evraknumarasi', trimmed)
          .limit(1);
        if (!altRes.error && altRes.data && altRes.data.length > 0) {
          data = altRes.data;
          error = null;
        }
      }

      if (!error && data && data.length > 0) {
        return { exists: true, existingRecord: normalizeEvrakRow(data[0]) };
      }
    } catch {
      // devam et
    }
  }

  return { exists: false };
}

// Yeni Evrak Ekleme Servisi (Çift format destekli)
export async function insertCompanyEvrak(
  companyKey: string,
  newRecord: Omit<SupabaseEvrakRow, 'id' | 'olusturulma_tarihi' | 'guncellenme_tarihi'>
): Promise<{ success: boolean; error: string | null; data?: SupabaseEvrakRow }> {
  const config = SUPABASE_COMPANY_TABLES[companyKey];
  if (!config) {
    return { success: false, error: 'Geçersiz şirket seçimi.' };
  }

  const tablesToTry = config.fallbackTableNames || [config.tableName];
  let lastError: any = null;

  for (const tName of tablesToTry) {
    try {
      // Format 1: Standart snake_case
      const snakePayload = {
        evrak_tarihi: newRecord.evrak_tarihi,
        donem: newRecord.donem,
        evrak_numarasi: newRecord.evrak_numarasi,
        firma_unvani: newRecord.firma_unvani,
        vergi_numarasi: newRecord.vergi_numarasi || null,
        banka_adi: newRecord.banka_adi || null,
        isin_adi: newRecord.isin_adi,
        tutari: newRecord.tutari,
        aciklama: newRecord.aciklama || null,
      };

      let { data, error } = await supabase
        .from(tName)
        .insert([snakePayload])
        .select()
        .single();

      // Kolon uyuşmazlığı varsa Format 2: bitişik küçük harfli kolonlar
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        const flatPayload = {
          evraktarihi: newRecord.evrak_tarihi,
          donem: newRecord.donem,
          evraknumarasi: newRecord.evrak_numarasi,
          firmaunvani: newRecord.firma_unvani,
          verginumarasi: newRecord.vergi_numarasi || null,
          bankaadi: newRecord.banka_adi || null,
          isinadi: newRecord.isin_adi,
          tutari: newRecord.tutari,
          aciklama: newRecord.aciklama || null,
        };

        const flatRes = await supabase
          .from(tName)
          .insert([flatPayload])
          .select()
          .single();

        if (!flatRes.error && flatRes.data) {
          return { success: true, error: null, data: normalizeEvrakRow(flatRes.data) };
        }
        error = flatRes.error;
      }

      if (!error && data) {
        return { success: true, error: null, data: normalizeEvrakRow(data) };
      }
      lastError = error;
    } catch (err) {
      lastError = err;
    }
  }

  return {
    success: false,
    error: lastError ? (lastError.message || String(lastError)) : 'Kayıt eklenemedi.',
  };
}

// Toplu Evrak Ekleme Servisi (Excel Toplu Kayıt için)
export async function bulkInsertCompanyEvraklar(
  companyKey: string,
  newRecords: Omit<SupabaseEvrakRow, 'id' | 'olusturulma_tarihi' | 'guncellenme_tarihi'>[]
): Promise<{ success: boolean; error: string | null; count: number }> {
  const config = SUPABASE_COMPANY_TABLES[companyKey];
  if (!config) {
    return { success: false, error: 'Geçersiz şirket seçimi.', count: 0 };
  }
  if (!newRecords || newRecords.length === 0) {
    return { success: false, error: 'Kaydedilecek evrak bulunamadı.', count: 0 };
  }

  const tablesToTry = config.fallbackTableNames || [config.tableName];
  let lastError: any = null;

  for (const tName of tablesToTry) {
    try {
      // 1. Standart snake_case formatı ile dene
      const snakePayload = newRecords.map((r) => ({
        evrak_tarihi: r.evrak_tarihi,
        donem: r.donem,
        evrak_numarasi: r.evrak_numarasi,
        firma_unvani: r.firma_unvani,
        vergi_numarasi: r.vergi_numarasi || null,
        banka_adi: r.banka_adi || null,
        isin_adi: r.isin_adi,
        tutari: r.tutari,
        aciklama: r.aciklama || null,
      }));

      const chunkSize = 50;
      let insertedCount = 0;
      let useFlatFormat = false;

      for (let i = 0; i < snakePayload.length; i += chunkSize) {
        const chunk = snakePayload.slice(i, i + chunkSize);
        const { error } = await supabase.from(tName).insert(chunk);

        if (error) {
          if (error.message?.includes('column') || error.code === '42703') {
            useFlatFormat = true;
            break;
          } else {
            throw error;
          }
        } else {
          insertedCount += chunk.length;
        }
      }

      // 2. Kolon adı uyuşmazlığında bitişik küçük harfli kolonlar (evraktarihi, evraknumarasi vs.) ile dene
      if (useFlatFormat) {
        const flatPayload = newRecords.map((r) => ({
          evraktarihi: r.evrak_tarihi,
          donem: r.donem,
          evraknumarasi: r.evrak_numarasi,
          firmaunvani: r.firma_unvani,
          verginumarasi: r.vergi_numarasi || null,
          bankaadi: r.banka_adi || null,
          isinadi: r.isin_adi,
          tutari: r.tutari,
          aciklama: r.aciklama || null,
        }));

        insertedCount = 0;
        for (let i = 0; i < flatPayload.length; i += chunkSize) {
          const chunk = flatPayload.slice(i, i + chunkSize);
          const { error } = await supabase.from(tName).insert(chunk);
          if (error) throw error;
          insertedCount += chunk.length;
        }
      }

      return { success: true, error: null, count: insertedCount };
    } catch (err: any) {
      lastError = err;
    }
  }

  return {
    success: false,
    error: lastError ? (lastError.message || String(lastError)) : 'Toplu kayıt ekleme başarısız oldu.',
    count: 0,
  };
}

// Evrak Silme Servisi
export async function deleteCompanyEvrak(
  companyKey: string,
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const config = SUPABASE_COMPANY_TABLES[companyKey];
  if (!config) return { success: false, error: 'Geçersiz şirket.' };

  const tablesToTry = config.fallbackTableNames || [config.tableName];
  for (const tName of tablesToTry) {
    const { error } = await supabase.from(tName).delete().eq('id', id);
    if (!error) return { success: true, error: null };
  }

  return { success: false, error: 'Silme işlemi başarısız oldu.' };
}

// Evrak Güncelleme Servisi (Çift format snake_case ve bitişik sütun desteği)
export async function updateCompanyEvrak(
  companyKey: string,
  id: string,
  updatedFields: Partial<Omit<SupabaseEvrakRow, 'id' | 'olusturulma_tarihi' | 'guncellenme_tarihi'>>
): Promise<{ success: boolean; error: string | null; data?: SupabaseEvrakRow }> {
  const config = SUPABASE_COMPANY_TABLES[companyKey];
  if (!config) return { success: false, error: 'Geçersiz şirket.' };

  const tablesToTry = config.fallbackTableNames || [config.tableName];
  let lastError: any = null;

  for (const tName of tablesToTry) {
    try {
      // 1. Format: standart snake_case
      const snakePayload: Record<string, any> = {};
      if (updatedFields.evrak_tarihi !== undefined) snakePayload.evrak_tarihi = updatedFields.evrak_tarihi;
      if (updatedFields.donem !== undefined) snakePayload.donem = updatedFields.donem;
      if (updatedFields.evrak_numarasi !== undefined) snakePayload.evrak_numarasi = updatedFields.evrak_numarasi;
      if (updatedFields.firma_unvani !== undefined) snakePayload.firma_unvani = updatedFields.firma_unvani;
      if (updatedFields.vergi_numarasi !== undefined) snakePayload.vergi_numarasi = updatedFields.vergi_numarasi || null;
      if (updatedFields.banka_adi !== undefined) snakePayload.banka_adi = updatedFields.banka_adi || null;
      if (updatedFields.isin_adi !== undefined) snakePayload.isin_adi = updatedFields.isin_adi;
      if (updatedFields.tutari !== undefined) snakePayload.tutari = updatedFields.tutari;
      if (updatedFields.aciklama !== undefined) snakePayload.aciklama = updatedFields.aciklama || null;

      let { data, error } = await supabase
        .from(tName)
        .update(snakePayload)
        .eq('id', id)
        .select()
        .single();

      // 2. Format: bitişik küçük harfli kolonlar
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        const flatPayload: Record<string, any> = {};
        if (updatedFields.evrak_tarihi !== undefined) flatPayload.evraktarihi = updatedFields.evrak_tarihi;
        if (updatedFields.donem !== undefined) flatPayload.donem = updatedFields.donem;
        if (updatedFields.evrak_numarasi !== undefined) flatPayload.evraknumarasi = updatedFields.evrak_numarasi;
        if (updatedFields.firma_unvani !== undefined) flatPayload.firmaunvani = updatedFields.firma_unvani;
        if (updatedFields.vergi_numarasi !== undefined) flatPayload.verginumarasi = updatedFields.vergi_numarasi || null;
        if (updatedFields.banka_adi !== undefined) flatPayload.bankaadi = updatedFields.banka_adi || null;
        if (updatedFields.isin_adi !== undefined) flatPayload.isinadi = updatedFields.isin_adi;
        if (updatedFields.tutari !== undefined) flatPayload.tutari = updatedFields.tutari;
        if (updatedFields.aciklama !== undefined) flatPayload.aciklama = updatedFields.aciklama || null;

        const flatRes = await supabase
          .from(tName)
          .update(flatPayload)
          .eq('id', id)
          .select()
          .single();

        if (!flatRes.error && flatRes.data) {
          return { success: true, error: null, data: normalizeEvrakRow(flatRes.data) };
        }
        error = flatRes.error;
      }

      if (!error && data) {
        return { success: true, error: null, data: normalizeEvrakRow(data) };
      }
      lastError = error;
    } catch (err) {
      lastError = err;
    }
  }

  return {
    success: false,
    error: lastError ? (lastError.message || String(lastError)) : 'Güncelleme işlemi başarısız oldu.',
  };
}

// Seçili Evrakları "cekarsiv" veya "cekiptal" Tablosuna Taşıma Fonksiyonu
export async function moveCompanyEvraklarToTarget(
  sourceCompanyKey: string,
  targetTableName: 'cekarsiv' | 'cekiptal',
  recordsToMove: SupabaseEvrakRow[]
): Promise<{ success: boolean; movedCount: number; error: string | null }> {
  if (!recordsToMove || recordsToMove.length === 0) {
    return { success: false, movedCount: 0, error: 'Taşınacak kayıt seçilmedi.' };
  }

  const sourceConfig = SUPABASE_COMPANY_TABLES[sourceCompanyKey];
  const sourceTable = sourceConfig ? sourceConfig.tableName : sourceCompanyKey;

  // Hedef tablolar listesi (cekiptal için celiptal toleransı da dahil)
  const targetTablesToTry =
    targetTableName === 'cekiptal'
      ? ['cekiptal', 'celiptal']
      : ['cekarsiv'];

  // Hedefe eklenecek kayıtları standart snake_case olarak hazırla
  const snakeRows = recordsToMove.map((rec) => {
    let numericAmount = 0;
    if (typeof rec.tutari === 'number') {
      numericAmount = rec.tutari;
    } else if (rec.tutari) {
      const parsed = parseFloat(String(rec.tutari).replace(/[^0-9.-]/g, ''));
      numericAmount = isNaN(parsed) ? 0 : parsed;
    }

    return {
      evrak_tarihi: rec.evrak_tarihi || new Date().toISOString().slice(0, 10),
      donem: rec.donem || '',
      evrak_numarasi: rec.evrak_numarasi || '',
      firma_unvani: rec.firma_unvani || '',
      vergi_numarasi: rec.vergi_numarasi || null,
      banka_adi: rec.banka_adi || null,
      isin_adi: rec.isin_adi || '',
      tutari: numericAmount,
      aciklama: rec.aciklama || null,
    };
  });

  // Bitişik sütunlu veritabanı şeması için alternatif format
  const flatRows = recordsToMove.map((rec) => {
    let numericAmount = 0;
    if (typeof rec.tutari === 'number') {
      numericAmount = rec.tutari;
    } else if (rec.tutari) {
      const parsed = parseFloat(String(rec.tutari).replace(/[^0-9.-]/g, ''));
      numericAmount = isNaN(parsed) ? 0 : parsed;
    }

    return {
      evraktarihi: rec.evrak_tarihi || new Date().toISOString().slice(0, 10),
      donem: rec.donem || '',
      evraknumarasi: rec.evrak_numarasi || '',
      firmaunvani: rec.firma_unvani || '',
      verginumarasi: rec.vergi_numarasi || null,
      bankaadi: rec.banka_adi || null,
      isinadi: rec.isin_adi || '',
      tutari: numericAmount,
      aciklama: rec.aciklama || null,
    };
  });

  let insertSuccess = false;
  let lastInsertError: any = null;

  // 1. Hedef tabloya ekleme denemesi
  for (const tName of targetTablesToTry) {
    try {
      // Önce standart snake_case formatı
      const res1 = await supabase.from(tName).insert(snakeRows);
      if (!res1.error) {
        insertSuccess = true;
        break;
      }
      lastInsertError = res1.error;

      // Sonra bitişik kolon formatı (evraktarihi, firmaunvani vb.)
      const res2 = await supabase.from(tName).insert(flatRows);
      if (!res2.error) {
        insertSuccess = true;
        break;
      }
      lastInsertError = res2.error;
    } catch (err: any) {
      lastInsertError = err;
    }
  }

  // Toplu ekleme bir sebepten engellenirse (örn: bir satır hata verirse) tek tek eklemeyi dene
  if (!insertSuccess) {
    let singleSuccessCount = 0;
    for (let i = 0; i < snakeRows.length; i++) {
      for (const tName of targetTablesToTry) {
        let ok = false;
        try {
          const s1 = await supabase.from(tName).insert([snakeRows[i]]);
          if (!s1.error) ok = true;
          else {
            const s2 = await supabase.from(tName).insert([flatRows[i]]);
            if (!s2.error) ok = true;
          }
        } catch {
          // devam
        }
        if (ok) {
          singleSuccessCount++;
          break;
        }
      }
    }
    if (singleSuccessCount > 0) {
      insertSuccess = true;
    }
  }

  if (!insertSuccess) {
    const errMsg =
      lastInsertError?.message ||
      lastInsertError?.details ||
      (typeof lastInsertError === 'string' ? lastInsertError : 'Hedef tabloya veri eklenemedi.');
    return {
      success: false,
      movedCount: 0,
      error: `Supabase "${targetTableName}" tablosuna kayıt yazılamadı: ${errMsg}. Tablonun var olduğundan ve RLS yetkilerinin açık olduğundan emin olunuz.`,
    };
  }

  // 2. Kaynak tablodan silme işlemi
  try {
    const tablesToClean = sourceConfig
      ? sourceConfig.fallbackTableNames || [sourceTable]
      : [sourceTable];
    const idsToDelete = recordsToMove.map((r) => r.id).filter(Boolean) as string[];
    const evrakNosToDelete = recordsToMove
      .map((r) => r.evrak_numarasi)
      .filter((n): n is string => Boolean(n && n.trim()));

    for (const tName of tablesToClean) {
      if (idsToDelete.length > 0) {
        await supabase.from(tName).delete().in('id', idsToDelete);
      }
      if (evrakNosToDelete.length > 0) {
        await supabase.from(tName).delete().in('evrak_numarasi', evrakNosToDelete);
        await supabase.from(tName).delete().in('evraknumarasi', evrakNosToDelete);
      }
    }
  } catch (deleteErr: any) {
    console.error('Kaynak tablodan silme uyarısı:', deleteErr);
  }

  return {
    success: true,
    movedCount: recordsToMove.length,
    error: null,
  };
}

// "cekarsiv" veya "cekiptal" tablosundaki evrakları getirme fonksiyonu
export async function fetchArchiveOrCancelRecords(
  tableName: 'cekarsiv' | 'cekiptal'
): Promise<{ data: SupabaseEvrakRow[]; error: string | null; activeTableName: string }> {
  const tablesToTry =
    tableName === 'cekiptal'
      ? ['cekiptal', 'celiptal']
      : ['cekarsiv'];

  let lastError: any = null;
  for (const tName of tablesToTry) {
    try {
      let { data, error } = await supabase
        .from(tName)
        .select('*')
        .order('evrak_tarihi', { ascending: false });

      if (error) {
        // Kolon adı farklılığı varsa ya da order hatası olursa sırasız çek
        const retry = await supabase.from(tName).select('*');
        if (!retry.error && retry.data) {
          data = retry.data;
          error = null;
        }
      }

      if (!error && data) {
        const mapped = data.map(normalizeEvrakRow);
        mapped.sort((a, b) => (b.evrak_tarihi || '').localeCompare(a.evrak_tarihi || ''));
        return {
          data: mapped,
          error: null,
          activeTableName: tName,
        };
      }
      lastError = error;
    } catch (err: any) {
      lastError = err;
    }
  }

  return {
    data: [],
    error: lastError ? (lastError.message || String(lastError)) : `"${tableName}" tablosuna erişilemedi.`,
    activeTableName: tableName,
  };
}


