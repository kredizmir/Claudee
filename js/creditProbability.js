/**
 * KREDİZMİR — creditProbability.js
 * 2. El Taşıt Kredisi Çıkma İhtimali Motoru
 *
 * 5 gerçek Findeks PDF verisine göre kalibre edilmiştir:
 *   Mustafa 1665 → ~82%  |  Mehmet 1427 → ~56%
 *   Limitten 1416 → ~50% |  KKB1 1254  → ~41%
 *   Haydar 1076  → ~10%
 *
 * UYARI: Bilgilendirme amaçlıdır. Nihai kredi kararı bankaya aittir.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.KzProbability = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ============================================================
     BDDK LTV TABLOSU — hard block kuralı
     ============================================================ */
  function getLTV(aracFiyat) {
    if (aracFiyat >= 2000000) return 0;
    if (aracFiyat >= 1200000) return 0.20;
    if (aracFiyat >= 800000)  return 0.30;
    if (aracFiyat >= 400000)  return 0.50;
    return 0.70;
  }

  /* ============================================================
     YARDIMCI: F4 TARİHİNDEN KAÇ YIL GEÇTİ
     "DD/MM/YYYY" formatı
     ============================================================ */
  function yilFarki(f4Str) {
    if (!f4Str) return null;
    var parts = f4Str.split('/');
    if (parts.length !== 3) return null;
    var d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    var now = new Date();
    return (now - d) / (1000 * 60 * 60 * 24 * 365.25);
  }

  /* ============================================================
     ANA HESAPLAMA FONKSİYONU
     params:
       findeksScore    {number}  — PDF'den okunan KKB skoru (1-1900)
       borcLimitOrani  {number}  — % (örn. 64)
       gecikmedeHesap  {number}  — E1 (aktif gecikmedeki hesap sayısı)
       mevcutGecikme   {number}  — E3 (mevcut en uzun gecikme, gün)
       takibeSayisi    {number}  — F2 (aktif takip sayısı)
       sonTakipTarihi  {string|null} — F4 "DD/MM/YYYY"
       aracFiyat       {number}  — TL
       pesinat         {number}  — TL
       netGelir        {number}  — aylık TL
       tahminiTaksit   {number}  — aylık TL
     ============================================================ */
  function calcLoanProbability(params) {
    var score          = params.findeksScore    || 0;
    var borcOrani      = params.borcLimitOrani  || 0;
    var e1             = params.gecikmedeHesap  || 0;
    var e3             = params.mevcutGecikme   || 0;
    var f2             = params.takibeSayisi    || 0;
    var f4             = params.sonTakipTarihi  || null;
    var aracFiyat      = params.aracFiyat       || 0;
    var pesinat        = params.pesinat         || 0;
    var netGelir       = params.netGelir        || 0;
    var tahminiTaksit  = params.tahminiTaksit   || 0;

    var factors       = [];
    var hardBlock     = false;
    var hardBlockReason = null;

    /* -- BDDK hard block -- */
    var ltv = getLTV(aracFiyat);
    if (ltv === 0 && aracFiyat >= 2000000) {
      hardBlock = true;
      hardBlockReason = 'BDDK kuralı: 2M TL üzeri araçlarda bireysel taşıt kredisi verilemiyor.';
    }

    if (!hardBlock && aracFiyat > 0 && pesinat >= 0) {
      var krediTalebi = aracFiyat - pesinat;
      var maxKredi    = aracFiyat * ltv;
      if (krediTalebi > maxKredi) {
        hardBlock = true;
        hardBlockReason = 'Peşinat yetersiz: BDDK LTV kuralına göre en az %'
          + Math.round((1 - ltv) * 100) + ' peşinat gerekiyor.';
      }
    }

    if (hardBlock) {
      return {
        probability     : 0,
        band            : 'Uygun Değil',
        color           : '#6b7280',
        factors         : [hardBlockReason],
        hardBlock       : true,
        hardBlockReason : hardBlockReason,
        recommendation  : 'Farklı araç veya daha yüksek peşinat değerlendirin.'
      };
    }

    /* -- Baz ihtimal (Findeks skoru) -- */
    var bazIhtimal;
    if      (score >= 1600) { bazIhtimal = 82; factors.push('Çok güçlü Findeks profili (' + score + ')'); }
    else if (score >= 1400) { bazIhtimal = 68; factors.push('İyi Findeks skoru (' + score + ')'); }
    else if (score >= 1100) { bazIhtimal = 50; factors.push('Orta Findeks skoru (' + score + ')'); }
    else if (score >= 700)  { bazIhtimal = 28; factors.push('Riskli Findeks skoru (' + score + ')'); }
    else                    { bazIhtimal = 8;  factors.push('Çok riskli Findeks skoru (' + score + ')'); }

    /* -- F4 recency çarpanı (eski takip ne kadar eski?) -- */
    var f4Carpan = 1.0;
    if (f2 > 0) {
      f4Carpan = 0.05;
      factors.push('Aktif yasal takip kaydı bulunuyor (kritik risk)');
    } else if (f4) {
      var yil = yilFarki(f4);
      if      (yil === null)  { f4Carpan = 1.0; }
      else if (yil > 4)       { f4Carpan = 0.90; factors.push('Kapatılmış kanuni takip (' + Math.floor(yil) + ' yıl önce)'); }
      else if (yil > 2)       { f4Carpan = 0.82; factors.push('Kapatılmış kanuni takip (' + Math.floor(yil) + ' yıl önce)'); }
      else if (yil > 1)       { f4Carpan = 0.65; factors.push('Yakın tarihli kapanmış takip (risk unsuru)'); }
      else                    { f4Carpan = 0.40; factors.push('Son 1 yıl içinde takip kaydı (yüksek risk)'); }
    }

    /* -- Aktif gecikme çarpanı -- */
    var gecikmeCarpan = 1.0;
    if (e1 > 0 && e3 > 90) {
      gecikmeCarpan = 0.15;
      factors.push('Aktif 90+ gün gecikme (çok ciddi)');
    } else if (e1 > 0 && e3 >= 30) {
      gecikmeCarpan = 0.40;
      factors.push('Aktif 30-90 gün gecikme');
    } else if (e1 > 0) {
      gecikmeCarpan = 0.70;
      factors.push('Aktif kısa süreli gecikme (' + e3 + ' gün)');
    } else if (e3 > 0 && e3 <= 7) {
      gecikmeCarpan = 0.92;
    }

    /* -- Borç/limit yük çarpanı -- */
    var borcCarpan = 1.0;
    if      (borcOrani > 85) { borcCarpan = 0.55; factors.push('Yüksek borç/limit oranı (%' + borcOrani + ')'); }
    else if (borcOrani > 65) { borcCarpan = 0.75; factors.push('Orta-yüksek borç/limit oranı (%' + borcOrani + ')'); }
    else if (borcOrani > 40) { borcCarpan = 0.92; }

    /* -- DSR çarpanı -- */
    var dsrCarpan = 1.0;
    if (netGelir > 0 && tahminiTaksit > 0) {
      var dsr = (tahminiTaksit / netGelir) * 100;
      if      (dsr > 55) { dsrCarpan = 0.30; factors.push('Gelire göre taksit yükü çok yüksek (%' + dsr.toFixed(0) + ')'); }
      else if (dsr > 45) { dsrCarpan = 0.55; factors.push('Gelire göre taksit yükü yüksek (%' + dsr.toFixed(0) + ')'); }
      else if (dsr > 30) { dsrCarpan = 0.82; }
    }

    /* -- Nihai ihtimal -- */
    var ihtimal = Math.round(bazIhtimal * f4Carpan * gecikmeCarpan * borcCarpan * dsrCarpan);
    ihtimal = Math.max(1, Math.min(95, ihtimal));

    /* -- Band -- */
    var band, color;
    if      (ihtimal >= 75) { band = 'Yüksek İhtimal';     color = '#22c55e'; }
    else if (ihtimal >= 50) { band = 'Orta İhtimal';        color = '#f59e0b'; }
    else if (ihtimal >= 25) { band = 'Düşük İhtimal';       color = '#f97316'; }
    else                    { band = 'Çok Düşük İhtimal';   color = '#ef4444'; }

    /* -- Öneri -- */
    var recommendation;
    if      (ihtimal >= 75) recommendation = 'Banka başvurusu yapılabilir.';
    else if (ihtimal >= 50) recommendation = 'Bazı bankalarda değerlendirmeye girer; güçlü dosya hazırlayın.';
    else if (ihtimal >= 25) recommendation = 'Önce mevcut borç yükünü azaltın, gecikmeleri kapatın.';
    else                    recommendation = 'Kredi notunu iyileştirmeden başvuru sonuçlanmayabilir.';

    return {
      probability     : ihtimal,
      band            : band,
      color           : color,
      factors         : factors.slice(0, 4),
      hardBlock       : false,
      hardBlockReason : null,
      recommendation  : recommendation
    };
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  return {
    calcLoanProbability : calcLoanProbability
  };
}));
