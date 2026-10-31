// Bayburt Öz-Ka İnşaat Resmi Kurumsal Logosu (Vektörel & Veri URI)
export const OZKA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="100%" height="100%">
  <defs>
    <clipPath id="ozka-circle-clip">
      <circle cx="100" cy="140" r="88" />
    </clipPath>
  </defs>

  <!-- Arka Plan Lacivert Daire -->
  <circle cx="100" cy="140" r="88" fill="#221d45" />

  <!-- Sol Kule (Orta Yükseklik) -->
  <polygon points="73,44 85,38 85,130 73,130" fill="#426bc7" />
  <polygon points="85,38 97,32 97,130 85,130" fill="#6f96ec" />

  <!-- Sağ Kule (Daha Yüksek) -->
  <polygon points="103,12 115,18 115,130 103,130" fill="#6f96ec" />
  <polygon points="115,18 127,24 127,130 115,130" fill="#426bc7" />

  <!-- Daire İçindeki Geometrik Kemerler -->
  <g clip-path="url(#ozka-circle-clip)">
    <!-- Dış Beyaz Çatı / Kemer -->
    <path d="M 100,92 L 188,154 L 176,168 L 100,114 L 24,168 L 12,154 Z" fill="#ffffff" />

    <!-- Orta Açık Mavi Çatı / Kemer -->
    <path d="M 100,124 L 176,178 L 166,190 L 100,144 L 34,190 L 24,178 Z" fill="#628ee8" />

    <!-- Alt Merkez Kapı / Portal -->
    <path d="M 100,154 L 128,172 L 128,230 L 72,230 L 72,172 Z" fill="#628ee8" />
    <!-- Kapı Boşluğu (Lacivert Zemin Rengi) -->
    <path d="M 100,172 L 114,182 L 114,230 L 86,230 L 86,182 Z" fill="#221d45" />
  </g>
</svg>`;

// Base64 Data URL formatı (Print pencereleri ve PDF raporlarında %100 kesintisiz gösterim için)
export const OZKA_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(OZKA_LOGO_SVG)}`;
