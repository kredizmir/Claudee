/**
 * KREDİZMİR — limitEngine.js
 * BDDK 2. El Araç LTV Kuralları + DSR Limit Motoru
 *
 * Resmi kurallar:
 *  - Araç bedeli     0 –  400.000 TL → %70 LTV
 *  - Araç bedeli  400k –  800.000 TL → %50 LTV
 *  - Araç bedeli  800k – 1.200.000 TL → %30 LTV
 *  - Araç bedeli 1.2M – 2.000.000 TL → %20 LTV
 *  - Araç bedeli 2.000.000 TL üzeri  → kredi yok
 *
 *  - Araç yaşı (yıl) * 12 + vade (ay) ≤ 144 ay
 *  - DSR sınırı: %45 (yüksek uygunlukta %50'ye kadar)
 *
 * UMD sarmalayıcı: hem browser hem Node.js.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.KzLimitEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CURRENT_YEAR = new Date().getFullYear();

  /* ============================================================
     LTV TABLOSU
     ============================================================ */
  var LTV_TABLE = [
    { maxPrice: 400000,   ltv: 0.70 },
    { maxPrice: 800000,   ltv: 0.50 },
    { maxPrice: 1200000,  ltv: 0.30 },
    { maxPrice: 2000000,  ltv: 0.20 },
    { maxPrice: Infinity, ltv: 0.00 }  // 2M üzeri → kredi yok
  ];

  /* ============================================================
     LTV HESAPLA
     ============================================================ */
  function getLTV(vehiclePrice) {
    for (var i = 0; i < LTV_TABLE.length; i++) {
      if (vehiclePrice <= LTV_TABLE[i].maxPrice) {
        return LTV_TABLE[i].ltv;
      }
    }
    return 0;
  }

  /* ============================================================
     MAKSİMUM VADE HESAPLA
     Araç yaşı * 12 + vade ≤ 144 ay
     Vade 12–60 ay arası (piyasa standardı)
     ============================================================ */
  function getMaxTerm(vehicleYear) {
    var vehicleAge   = CURRENT_YEAR - parseInt(vehicleYear, 10);
    if (vehicleAge < 0) vehicleAge = 0;
    var maxByAge     = 144 - vehicleAge * 12;
    var clamped      = Math.min(Math.max(maxByAge, 0), 60);
    return clamped;  // ay cinsinden
  }

  /* ============================================================
     AYLIK TAKSİT TAHMİNİ (anüite formülü)
     ============================================================ */
  function calcMonthlyPayment(principal, monthlyRate, term) {
    if (principal <= 0 || term <= 0) return 0;
    if (monthlyRate === 0) return principal / term;
    var r  = monthlyRate;
    var n  = term;
    var pn = Math.pow(1 + r, n);
    return principal * r * pn / (pn - 1);
  }

  /* ============================================================
     ANA LİMİT HESAPLAMA
     ============================================================ */
  function calculate(params) {
    /*
     * params: {
     *   aracFiyat   : number  (TL)
     *   aracYili    : number  (ör. 2019)
     *   pesinat     : number  (TL)
     *   gelir       : number  (aylık net, TL)
     *   odemeYuku   : number  (mevcut aylık kredi+kart ödemesi, TL)
     *   category    : string  ('yuksek'|'orta'|'dusuk'|'onceIyilestirme'|'eksikBilgi')
     * }
     */
    var aracFiyat = parseFloat(params.aracFiyat) || 0;
    var pesinat   = parseFloat(params.pesinat)   || 0;
    var gelir     = parseFloat(params.gelir)     || 0;
    var odemeYuku = parseFloat(params.odemeYuku) || 0;
    var aracYili  = parseInt(params.aracYili, 10) || (CURRENT_YEAR - 3);
    var category  = params.category || 'orta';

    /* LTV */
    var ltv         = getLTV(aracFiyat);
    var maxLTVKredi = aracFiyat * ltv;

    /* Müşteri istediği kredi */
    var istenenKredi = aracFiyat - pesinat;

    /* LTV'ye göre azami kredi */
    var maxKrediLTV = Math.min(istenenKredi, maxLTVKredi);

    /* Azami vade */
    var maxTerm     = getMaxTerm(aracYili);
    var defaultTerm = Math.min(36, maxTerm);

    /* DSR sınırı — yüksek uygunlukta %50 */
    var dsrLimit = (category === 'yuksek') ? 0.50 : 0.45;

    /* DSR'den türetilen azami taksit */
    var maxTaksitByDSR = Math.max(0, gelir * dsrLimit - odemeYuku);

    /* Tahmini aylık faiz (mid-range: %4 — yalnızca tahmin) */
    var ESTIMATION_RATE = 0.04;

    /* Tahmini azami kredi from DSR */
    var maxKrediByDSR = 0;
    if (maxTaksitByDSR > 0 && defaultTerm > 0) {
      /* P = taksit / (r * (1+r)^n / ((1+r)^n - 1)) */
      var r  = ESTIMATION_RATE;
      var n  = defaultTerm;
      var pn = Math.pow(1 + r, n);
      maxKrediByDSR = maxTaksitByDSR * (pn - 1) / (r * pn);
    }

    /* Gerçek azami kredi: LTV ile DSR'nin küçüğü */
    var maxKredi = Math.min(maxKrediLTV, maxKrediByDSR);
    maxKredi     = Math.max(0, maxKredi);

    /* Min kredi: %80'i (tahmini) */
    var minKredi = maxKredi * 0.80;

    /* Tahmini aylık taksit (azami kredi, varsayılan vade) */
    var estimatedPayment = calcMonthlyPayment(maxKredi, ESTIMATION_RATE, defaultTerm);

    /* Önerilen kanal */
    var channel;
    if (category === 'yuksek' || category === 'orta') {
      channel = 'Banka Finansmanı';
    } else if (category === 'dusuk') {
      channel = 'Alternatif Finansman (DJS/Bayi)';
    } else {
      channel = 'İyileştirme Planı Önce';
    }

    /* LTV 0 ise kredi yok */
    var krediYok = (ltv === 0 || maxTerm === 0 || maxKredi <= 0);

    return {
      ltv              : ltv,
      ltvYuzde         : Math.round(ltv * 100),
      maxKredi         : Math.round(maxKredi),
      minKredi         : Math.round(minKredi),
      maxTaksitByDSR   : Math.round(maxTaksitByDSR),
      estimatedPayment : Math.round(estimatedPayment),
      maxTerm          : maxTerm,
      defaultTerm      : defaultTerm,
      dsrLimit         : dsrLimit,
      channel          : channel,
      krediYok         : krediYok,
      istenenKredi     : Math.round(istenenKredi),
      estimationRate   : ESTIMATION_RATE
    };
  }

  /* ============================================================
     HIZLI TAHMİN — eligibility.js'e DSR girişi için
     ============================================================ */
  function quickEstimatePayment(aracFiyat, pesinat, aracYili) {
    var principal = (parseFloat(aracFiyat) || 0) - (parseFloat(pesinat) || 0);
    var maxTerm   = getMaxTerm(aracYili || (CURRENT_YEAR - 3));
    var term      = Math.min(36, maxTerm);
    return calcMonthlyPayment(Math.max(0, principal), 0.04, term);
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  return {
    calculate            : calculate,
    getLTV               : getLTV,
    getMaxTerm           : getMaxTerm,
    quickEstimatePayment : quickEstimatePayment,
    calcMonthlyPayment   : calcMonthlyPayment
  };
}));
