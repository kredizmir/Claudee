/**
 * KREDİZMİR — eligibility.js
 * Finansman Uygunluk Analiz Motoru
 *
 * UYARI: Bu motor kredi puanı üretmez, Findeks skoru hesaplamaz.
 * Yalnızca giriş verilerine göre iç ağırlıklı bir uygunluk kategorisi
 * ve bilgilendirme amaçlı bir analiz üretir.
 *
 * UMD sarmalayıcı: hem browser (window.KzEligibility) hem Node.js
 * (require('./js/eligibility')) olarak çalışır.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.KzEligibility = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ============================================================
     SABİTLER
     ============================================================ */
  var WEIGHTS = {
    odemePerformansi : 30,
    borcLimitOrani   : 25,
    dsr              : 20,
    yasalGecmis      : 15,
    pesinatOrani     : 10
  };

  var CATEGORIES = {
    'yuksek'          : { label: 'Yüksek Uygunluk',   min: 80, color: '#22c55e' },
    'orta'            : { label: 'Orta Uygunluk',     min: 60, color: '#f59e0b' },
    'dusuk'           : { label: 'Düşük Uygunluk',    min: 40, color: '#f97316' },
    'onceIyilestirme' : { label: 'Önce İyileştirme',  min: 0,  color: '#ef4444' },
    'eksikBilgi'      : { label: 'Eksik Bilgi',        min: -1, color: '#9ca3af' }
  };

  /* ============================================================
     HARD RULES — override sonuç döner ya da null
     ============================================================ */
  function applyHardRules(data) {
    if (!data.gelir || parseFloat(data.gelir) <= 0) {
      return {
        override  : true,
        category  : 'eksikBilgi',
        reason    : 'Gelir bilgisi girilmedi veya sıfır. Analiz yapılamıyor.'
      };
    }

    if (data.yasal === 'acik') {
      return {
        override  : true,
        category  : 'onceIyilestirme',
        reason    : 'Açık yasal takip (icra/haciz) mevcut. Finansman süreci engellidir.'
      };
    }

    // 30+ gün gecikme + yüksek borç oranı → hard floor
    var borcOrani = data.limit > 0 ? data.borc / data.limit : 1;
    if (data.gecikme === '30plus' && borcOrani > 0.70) {
      return {
        override  : true,
        category  : 'dusuk',
        reason    : '30+ günlük gecikme ve yüksek borç-limit oranı birleşimi risk eşiğini aşıyor.',
        softFloor : 45  // skoru 45'te tut (max)
      };
    }

    return null;
  }

  /* ============================================================
     SOFT SCORE HESAPLAMA (0–100)
     ============================================================ */
  function calcScore(data, estimatedMonthlyPayment) {
    var score = 0;
    var breakdown = {};

    /* 1. Ödeme performansı (%30) */
    var odeme = 0;
    if (data.gecikme === 'yok')    odeme = 30;
    else if (data.gecikme === '1-2') odeme = 20;
    else if (data.gecikme === '30plus') odeme = 5;
    score += odeme;
    breakdown.odemePerformansi = odeme;

    /* 2. Borç/Limit oranı (%25) */
    var borcLimitPt = 0;
    var limit = parseFloat(data.limit) || 0;
    var borc  = parseFloat(data.borc)  || 0;
    var borcOrani = limit > 0 ? borc / limit : 0;
    if (borcOrani < 0.30)      borcLimitPt = 25;
    else if (borcOrani < 0.50) borcLimitPt = 18;
    else if (borcOrani < 0.70) borcLimitPt = 10;
    else                       borcLimitPt = 3;
    score += borcLimitPt;
    breakdown.borcLimitOrani = borcLimitPt;
    breakdown.borcOraniBrut  = borcOrani;

    /* 3. DSR — Borç Servis Oranı (%20) */
    var dsrPt = 0;
    var gelir       = parseFloat(data.gelir)       || 1;
    var odemeYuku   = parseFloat(data.odemeYuku)   || 0;
    var dsr = (odemeYuku + estimatedMonthlyPayment) / gelir;
    if (dsr < 0.25)      dsrPt = 20;
    else if (dsr < 0.35) dsrPt = 15;
    else if (dsr < 0.45) dsrPt = 8;
    else                 dsrPt = 2;
    score += dsrPt;
    breakdown.dsr    = dsr;
    breakdown.dsrPt  = dsrPt;

    /* 4. Yasal geçmiş (%15) */
    var yasalPt = 0;
    if      (data.yasal === 'yok')                 yasalPt = 15;
    else if (data.yasal === 'kapandı-1yilplus')    yasalPt = 10;
    else if (data.yasal === 'kapandı-1yiliçinde')  yasalPt = 5;
    // acik → 0 (zaten hard rule ile yakalanır)
    score += yasalPt;
    breakdown.yasalGecmis = yasalPt;

    /* 5. Peşinat oranı (%10) */
    var pesinatPt = 0;
    var aracFiyat = parseFloat(data.aracFiyat) || 1;
    var pesinat   = parseFloat(data.pesinat)   || 0;
    var dpRatio   = pesinat / aracFiyat;
    if      (dpRatio > 0.40) pesinatPt = 10;
    else if (dpRatio > 0.25) pesinatPt = 7;
    else if (dpRatio > 0.15) pesinatPt = 4;
    else                     pesinatPt = 1;
    score += pesinatPt;
    breakdown.pesinatOrani = pesinatPt;
    breakdown.dpRatioBrut  = dpRatio;

    return { score: score, breakdown: breakdown, dsr: dsr };
  }

  /* ============================================================
     SKOR → KATEGORİ
     ============================================================ */
  function scoreToCategory(score) {
    if (score >= 80) return 'yuksek';
    if (score >= 60) return 'orta';
    if (score >= 40) return 'dusuk';
    return 'onceIyilestirme';
  }

  /* ============================================================
     GEREKÇE ÜRETİCİ — en kritik 3 faktör
     ============================================================ */
  function generateReasons(data, breakdown, category) {
    var reasons = [];

    /* Negatif faktörler */
    if (data.yasal === 'kapandı-1yiliçinde') {
      reasons.push('Yasal takip kaydınız 1 yıldan kısa süre önce kapanmıştır; 12 ay dolana kadar beklemek finansman şansını artırabilir.');
    }
    if (data.gecikme === '30plus') {
      reasons.push('Son 12 ayda 30 günü aşan gecikme kaydı, ödeme güvenilirliğinizi olumsuz etkiliyor.');
    } else if (data.gecikme === '1-2') {
      reasons.push('1–2 kısa ödeme gecikmesi tespit edildi; temiz sicil için bu alışkanlığı sıfırlamak önemlidir.');
    }
    if (breakdown.borcOraniBrut > 0.70) {
      reasons.push('Kart/KMH borç-limit oranınız %' + Math.round(breakdown.borcOraniBrut * 100) + ' ile kritik eşiğin üzerinde. İdeal hedef: %30\'un altı.');
    } else if (breakdown.borcOraniBrut > 0.50) {
      reasons.push('Kart/KMH borç-limit oranınız %' + Math.round(breakdown.borcOraniBrut * 100) + ' seviyesinde. %50 altına indirmek puanınızı yükseltir.');
    }
    if (breakdown.dsr > 0.45) {
      reasons.push('Borç servis oranınız (DSR) %' + Math.round(breakdown.dsr * 100) + ' ile BDDK sınırı olan %45\'i aşıyor; mevcut kredi yükünüzü azaltmanız önerilir.');
    } else if (breakdown.dsr > 0.35) {
      reasons.push('Borç servis oranınız (DSR) %' + Math.round(breakdown.dsr * 100) + ' ile orta aralıkta; mevcut yükü düşürmek ek esneklik sağlar.');
    }
    if (breakdown.dpRatioBrut < 0.15) {
      reasons.push('Peşinat oranınız %' + Math.round(breakdown.dpRatioBrut * 100) + ' ile düşük. Daha yüksek peşinat hem LTV limitini hem faiz oranını iyileştirir.');
    }

    /* Pozitif faktörler (yüksek uygunluk için) */
    if (category === 'yuksek' || category === 'orta') {
      if (data.gecikme === 'yok' && reasons.length < 3) {
        reasons.push('Ödeme geçmişiniz temiz; bu en güçlü finansman avantajınızdır.');
      }
      if (breakdown.dpRatioBrut > 0.40 && reasons.length < 3) {
        reasons.push('Yüksek peşinat oranınız (%' + Math.round(breakdown.dpRatioBrut * 100) + ') finansman limitinizi ve faiz oranınızı olumlu etkiliyor.');
      }
      if (breakdown.dsr < 0.30 && reasons.length < 3) {
        reasons.push('Borç servis oranınız (%' + Math.round(breakdown.dsr * 100) + ') sağlıklı aralıkta; ek kredi kapasitesi mevcut.');
      }
    }

    /* En az 1 gerekçe garantisi */
    if (reasons.length === 0) {
      reasons.push('Profiliniz genel olarak kabul edilebilir aralıkta, ancak iyileştirme yapılabilecek alanlar var.');
    }

    return reasons.slice(0, 3);
  }

  /* ============================================================
     İYİLEŞTİRME PLANI
     ============================================================ */
  function generateImprovementPlan(category, data, breakdown) {
    var plans = {
      yuksek: {
        gun7  : 'Hedeflediğiniz aracı ve galeriyi belirleyin; KREDİZMİR anlaşmalı galerileri ziyaret edin.',
        gun30 : 'En az 3 bankanın kredi teklifini karşılaştırın, en düşük faizi tespit edin.',
        gun90 : 'Dosyanızı bankaya sunun; ön onay aşamasında danışmanınızla ilerleyin.'
      },
      orta: {
        gun7  : 'Kart borçlarını minimum ödemeden fazlasıyla ödeyin; hedef %50 altı borç-limit oranı.',
        gun30 : 'Peşinat birikimini artırın; 5–10 puan yüksek peşinat faiz oranınızı düşürür.',
        gun90 : 'Banka + alternatif finansman seçeneklerini karşılaştırın; DJS kanalını değerlendirin.'
      },
      dusuk: {
        gun7  : 'En yüksek borçlu kart/KMH hesabınıza öncelik verin; bakiyeyi hızla düşürün.',
        gun30 : 'Kullanmadığınız kart limitlerini kapatın; toplam limit düşürülmesi oranı iyileştirir.',
        gun90 : 'Yüksek peşinat (%40+) ile alternatif finansman veya bayi finansmanı seçeneğini araştırın.'
      },
      onceIyilestirme: {
        gun7  : 'Açık icra/haciz dosyalarınızı araştırın; miktarı netleştirin ve ödeme planı talep edin.',
        gun30 : 'En küçük borcu kapatarak sicil iyileştirme sürecini başlatın; her kapanan kayıt avantaj sağlar.',
        gun90 : 'Bir finansman danışmanı veya avukat ile çalışın; 6–12 ay içinde profili temizleme planı yapın.'
      },
      eksikBilgi: {
        gun7  : 'Net aylık gelirinizi belgeleyen evrakları (bordro, vergi levhası, banka ekstreleri) hazırlayın.',
        gun30 : 'Eksik bilgileri tamamlayarak analizi yenileyin.',
        gun90 : 'Belge düzeni tamamlandığında KREDİZMİR danışmanı ile görüşün.'
      }
    };

    return plans[category] || plans['onceIyilestirme'];
  }

  /* ============================================================
     ANA ANALİZ FONKSİYONU
     ============================================================ */
  function analyze(data, estimatedMonthlyPayment) {
    estimatedMonthlyPayment = estimatedMonthlyPayment || 0;

    /* 1. Hard rules */
    var hardResult = applyHardRules(data);
    var category, score, breakdown, dsr;

    if (hardResult && hardResult.override) {
      category  = hardResult.category;
      score     = hardResult.softFloor || 0;
      breakdown = {};
      dsr       = 0;

      var catInfo = CATEGORIES[category];
      return {
        category    : category,
        categoryInfo: catInfo,
        score       : score,
        reasons     : [hardResult.reason],
        improvement : generateImprovementPlan(category, data, {}),
        dsr         : dsr,
        breakdown   : breakdown
      };
    }

    /* 2. Soft score */
    var result  = calcScore(data, estimatedMonthlyPayment);
    score       = result.score;
    breakdown   = result.breakdown;
    dsr         = result.dsr;

    /* 3. Category */
    category = scoreToCategory(score);

    /* 4. Reasons */
    var reasons = generateReasons(data, breakdown, category);

    /* 5. Improvement plan */
    var improvement = generateImprovementPlan(category, data, breakdown);

    return {
      category    : category,
      categoryInfo: CATEGORIES[category],
      score       : score,
      reasons     : reasons,
      improvement : improvement,
      dsr         : dsr,
      breakdown   : breakdown
    };
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  return {
    analyze       : analyze,
    CATEGORIES    : CATEGORIES,
    scoreToCategory: scoreToCategory
  };
}));
