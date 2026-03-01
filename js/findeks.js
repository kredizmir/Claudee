/* =========================================================
   KREDİZMİR — findeks.js
   Heuristik Findeks/KKB Tahmin Motoru
   5 sorudan Risk Skoru → Tahmini Puan üretir.
   ========================================================= */

(function (global) {
  'use strict';

  /* -------------------------------------------------------
     Ağırlıklar & Hesaplama
     ------------------------------------------------------- */

  /**
   * Kanuni takip / icra / varlık yönetimi skoru (0-35)
   * @param {'none'|'old'|'mid'|'recent'|'open'} durum
   * @param {boolean} birden fazla dosya var mı
   */
  function takipSkoru(durum, cok) {
    const base = { none: 0, old: 8, mid: 14, recent: 22, open: 35 };
    const s = (base[durum] ?? 35) + (cok ? 5 : 0);
    return Math.min(s, 35);
  }

  /**
   * Son 12 ay gecikme skoru (0-25)
   * @param {'none'|'low'|'mid'|'high'|'very_high'} durum
   * @param {boolean} yakın tarihli mi
   */
  function gecikmeSkoru(durum, yakin) {
    const base = { none: 0, low: 6, mid: 10, high: 18, very_high: 25 };
    const s = (base[durum] ?? 0) + (yakin ? 3 : 0);
    return Math.min(s, 25);
  }

  /**
   * Utilization (borç/limit) skoru (0-20)
   * @param {number} borc
   * @param {number} limit
   */
  function utilizationSkoru(borc, limit) {
    if (!limit || limit <= 0) return 20; // limit yoksa ince dosya → en kötü
    const u = borc / limit;
    if (u < 0.10) return 0;
    if (u < 0.30) return 3;
    if (u < 0.50) return 7;
    if (u < 0.70) return 12;
    if (u < 0.90) return 16;
    return 20;
  }

  /**
   * Aylık ödeme yükü skoru (0-15)
   * @param {number} aylikOdeme
   * @param {number|null} gelir
   */
  function odemeSkoru(aylikOdeme, gelir) {
    if (gelir && gelir > 0) {
      const dsr = aylikOdeme / gelir;
      if (dsr < 0.20) return 0;
      if (dsr < 0.30) return 4;
      if (dsr < 0.40) return 8;
      if (dsr < 0.50) return 12;
      return 15;
    }
    // Gelir yok → varsayımsal
    if (aylikOdeme < 10000) return 3;
    if (aylikOdeme < 20000) return 7;
    return 12;
  }

  /**
   * Limit yapısı mikro skor (0-5)
   * @param {number} limit
   */
  function limitMikroSkoru(limit) {
    if (limit <= 20000)  return 4;
    if (limit <= 100000) return 2;
    if (limit <= 400000) return 0;
    return 1;
  }

  /**
   * Risk Skoru → Findeks Puan & Band
   * @param {number} risk (0-100)
   */
  function risktenPuan(risk) {
    const puan = Math.round(Math.max(1, Math.min(1900, 1900 - risk * 10.5)));
    return { puan, band: [Math.max(1, puan - 70), Math.min(1900, puan + 70)] };
  }

  /**
   * Puan → Sonuç sınıfı
   * @param {number} puan
   * @param {boolean} acikTakip
   * @param {boolean} cokYakinGecikme30
   */
  function siniflandir(puan, acikTakip, cokYakinGecikme30) {
    if (acikTakip) return 'cikmaz';
    if (puan >= 1600) return cokYakinGecikme30 ? 'zor' : 'cikar';
    if (puan >= 1400) return cokYakinGecikme30 ? 'zor' : 'cikar_zor';
    if (puan >= 1200) return 'zor';
    return 'cikmaz';
  }

  /**
   * Ana hesaplama fonksiyonu
   * @param {Object} v — cevaplar
   * @returns {Object} sonuç objesi
   */
  function hesapla(v) {
    const ts  = takipSkoru(v.takipDurum, v.takipCok || false);
    const gs  = gecikmeSkoru(v.gecikmeDurum, v.gecikmeYakin || false);
    const us  = utilizationSkoru(Number(v.borc) || 0, Number(v.limit) || 0);
    const os  = odemeSkoru(Number(v.aylikOdeme) || 0, v.gelir ? Number(v.gelir) : null);
    const lms = limitMikroSkoru(Number(v.limit) || 0);

    const risk = ts + gs + us + os + lms;
    const { puan, band } = risktenPuan(risk);
    const acikTakip = (v.takipDurum === 'open');
    const yakinGecikme30 = (v.gecikmeDurum === 'high' || v.gecikmeDurum === 'very_high') && v.gecikmeYakin;
    const sonuc = siniflandir(puan, acikTakip, yakinGecikme30);
    const utilRatio = (Number(v.limit) > 0) ? (Number(v.borc) / Number(v.limit) * 100).toFixed(1) : null;

    // En kritik 3 faktör
    const faktorler = [
      { label: 'Kanuni Takip / İcra', skor: ts, max: 35 },
      { label: 'Son 12 Ay Gecikme', skor: gs, max: 25 },
      { label: 'Kart/Kredi Kullanım Oranı (Utilization)', skor: us, max: 20 },
      { label: 'Aylık Ödeme Yükü', skor: os, max: 15 },
      { label: 'Limit Yapısı', skor: lms, max: 5 }
    ].sort((a, b) => b.skor - a.skor).slice(0, 3);

    return {
      puan, band, sonuc, risk,
      skorDetay: { ts, gs, us, os, lms },
      faktorler,
      utilRatio,
      acikTakip,
      ineDosya: (Number(v.limit) || 0) < 50000,
      gelirBilgisiYok: !v.gelir,
    };
  }

  /* -------------------------------------------------------
     İyileştirme Planı
     ------------------------------------------------------- */

  const IYILESTIRME = {
    '7gun': [
      'Kart borcunu toplam limitin %30\'unun altına çek.',
      'Varsa gecikmiş ödemeleri kapat, otomatik ödeme talimatı aç.',
      'Yeni kredi başvurusu yapma — sorgular puanı olumsuz etkiler.',
    ],
    '30gun': [
      'Kartları 2 bankada konsolide et, gereksiz limitleri kapat.',
      'KMH (kredili mevduat) kullanımını minimumlara indir.',
      'Maaş/düzenli gelir banka hareketi güçlendir.',
    ],
    '90gun': [
      'Borç/limit oranını %10–%20 bandına oturt.',
      'Taksit yükünü düşür — gerekirse borç yapılandırması yap.',
      'Negatif kayıt varsa kapanış + bekleme süresini planla.',
    ],
  };

  /* -------------------------------------------------------
     Limit / Peşinat Senaryosu
     ------------------------------------------------------- */

  function limitSenaryosu(puan, aracFiyat) {
    aracFiyat = Number(aracFiyat) || 0;
    if (puan >= 1600) {
      return aracFiyat > 0
        ? `Araç bedelinin %80–100\'üne kadar (${fmt(aracFiyat * 0.8)} – ${fmt(aracFiyat)}) kredi çıkabilir. Peşinatsız senaryo mümkün.`
        : 'Güçlü profil: peşinatsız veya çok düşük peşinat senaryosu değerlendirilebilir.';
    }
    if (puan >= 1400) {
      return aracFiyat > 0
        ? `Araç bedelinin %60–80\'ine kadar (${fmt(aracFiyat * 0.6)} – ${fmt(aracFiyat * 0.8)}) kredi beklenir. Peşinat tavsiyesi: %20–40.`
        : '%20–40 peşinat ile daha güçlü dosya oluşturulabilir.';
    }
    if (puan >= 1200) {
      return aracFiyat > 0
        ? `Araç bedelinin %40–60\'ına kadar (${fmt(aracFiyat * 0.4)} – ${fmt(aracFiyat * 0.6)}) kredi zor ama mümkün. Yüksek peşinat gerekebilir.`
        : 'Yüksek peşinat (%40+) ile dosya değerlendirilebilir.';
    }
    return 'Mevcut profilinizle onay alınması çok güç. Önce dosya iyileştirme gereklidir.';
  }

  function fmt(n) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
  }

  /* -------------------------------------------------------
     Sonuç Etiketi Metni
     ------------------------------------------------------- */

  const SONUC_ETIKET = {
    cikar:      { label: 'ÇIKAR', cls: 'kz-findeks-verdict--cikar', desc: 'Dosya genel itibarıyla temiz; kredi çıkması beklenir.' },
    cikar_zor:  { label: 'ÇIKAR / ZOR', cls: 'kz-findeks-verdict--zor', desc: 'Bankaya ve gelir durumuna bağlı; değerlendirme gerektirir.' },
    zor:        { label: 'ZOR', cls: 'kz-findeks-verdict--zor', desc: 'Dosya iyileştirmesi şart; onay için güçlendirme önerilen.' },
    cikmaz:     { label: 'ÇIKMAZ', cls: 'kz-findeks-verdict--cikmaz', desc: 'Önce temizlik / iyileştirme yapılması gerekiyor.' },
  };

  /* -------------------------------------------------------
     Global API
     ------------------------------------------------------- */

  global.KZFindeks = {
    hesapla,
    iyilestirme: IYILESTIRME,
    limitSenaryosu,
    sonucEtiket: SONUC_ETIKET,
    fmt,
  };

})(window);
