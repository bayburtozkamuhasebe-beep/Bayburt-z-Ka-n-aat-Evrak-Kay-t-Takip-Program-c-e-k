// Supabase ARSIVCEKLER Depolama Havuzu Servisi
// Proje: mgtunrfpzbyfnmeloeeq
// Kova: ARSIVCEKLER

export const ARCHIVE_PROJECT_ID = 'mgtunrfpzbyfnmeloeeq';
export const ARCHIVE_BUCKET_NAME = 'ARSIVCEKLER';
export const ARCHIVE_DASHBOARD_URL = `https://supabase.com/dashboard/project/${ARCHIVE_PROJECT_ID}/storage/files/buckets/${ARCHIVE_BUCKET_NAME}`;
export const ARCHIVE_PUBLIC_BASE_URL = `https://${ARCHIVE_PROJECT_ID}.supabase.co/storage/v1/object/public/${ARCHIVE_BUCKET_NAME}`;

export interface ArchiveCheckResult {
  exists: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'pdf' | 'image' | 'other';
  error?: string;
}

/**
 * Belirtilen evrak numarasını Supabase ARSIVCEKLER depolama kovasında arar.
 * .pdf, .jpg, .jpeg, .png ve uzantısız formatları test eder.
 */
export async function checkArchiveDocument(rawEvrakNo: string): Promise<ArchiveCheckResult> {
  if (!rawEvrakNo) {
    return { exists: false, error: 'Evrak numarası belirtilmedi.' };
  }

  const cleanedNo = String(rawEvrakNo).trim();
  if (!cleanedNo) {
    return { exists: false, error: 'Evrak numarası boş.' };
  }

  // Olası dosya adı formatları
  const candidateExtensions = [
    { ext: '.pdf', type: 'pdf' as const },
    { ext: '.jpg', type: 'image' as const },
    { ext: '.jpeg', type: 'image' as const },
    { ext: '.png', type: 'image' as const },
    { ext: '', type: 'other' as const },
  ];

  for (const candidate of candidateExtensions) {
    const fileName = `${cleanedNo}${candidate.ext}`;
    const fileUrl = `${ARCHIVE_PUBLIC_BASE_URL}/${encodeURIComponent(fileName)}`;

    try {
      // Supabase public storage endpoint'ine istek at
      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          // Kısa range veya head benzeri hızlı kontrol
          Range: 'bytes=0-100',
        },
      });

      // Status 200 veya 206 (Partial Content) başarılı kabul edilir
      if (response.ok || response.status === 206) {
        const contentType = response.headers.get('content-type') || '';
        
        // Supabase bazen 400 yerine 200 dönüp body'de NoSuchKey JSON verebilir, kontrol edelim:
        if (contentType.includes('application/json')) {
          const text = await response.text();
          if (text.includes('NoSuchKey') || text.includes('not_found') || text.includes('Object not found')) {
            continue; // Bu format yok, sonraki uzantıyı dene
          }
        }

        let detectedType: 'pdf' | 'image' | 'other' = candidate.type;
        if (contentType.includes('pdf')) detectedType = 'pdf';
        else if (contentType.includes('image')) detectedType = 'image';

        return {
          exists: true,
          fileUrl,
          fileName,
          fileType: detectedType,
        };
      }
    } catch (err) {
      console.warn(`Arşiv kontrol hatası (${fileName}):`, err);
    }
  }

  return {
    exists: false,
    error: `"${cleanedNo}" numaralı evraka ait dosya ARSIVCEKLER deposunda bulunamadı.`,
  };
}
