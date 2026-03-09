/**
 * KREDİZMİR — findeks.js
 * Tahmini Findeks / KKB Puan Hesaplama Motoru
 *
 * UYARI: Resmi Findeks puanı üretmez. Kullanıcının beyan ettiği
 * bilgilere göre tahmini ön değerlendirme yapar.
 *
 * Puan aralığı: 1 – 1900
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.KzFindeks = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ============================================================
     PUAN BANTLARI
     ============================================================ */
  var BANDS = [
    { max: 699,  label: 'Çok Riskli', color: '#ef4444' },
    { max: 1099, label: 'Riskli',     color: '#f97316' },
    { max: 1399, label: 'Orta',       color: '#f59e0b' },
    { max: 1599, label: 'İyi',        color: '#84cc16' },
    { max: 1900, label: 'Çok İyi',    color: '#22c55e' }
  ];

  function getBand(score) {
    for (var i = 0; i < BANDS.length; i++) {
      if (score <= BANDS[i].max) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  /* ============================================================
     ANA HESAPLAMA FONKSİYONU
     ============================================================ */
  function calculateCreditScore(params) {
    var takipDurumu    = params.takipDurumu;
    var gecikmeSikligi = params.gecikmeSikligi;
    var gecikmeGunu    = params.gecikmeGunu;
    var toplamLimit    = params.toplamLimit;
    var toplamBorc     = params.toplamBorc;
    var netGelir       = params.netGelir;
    var aylikOdeme     = params.aylikOdeme;

    /* -- Doğrulama -- */
    if (!takipDurumu)    throw new Error('Takip durumu zorunludur.');
    if (!gecikmeSikligi) throw new Error('Gecikme sıklığı zorunludur.');
    if (gecikmeGunu === undefined || gecikmeGunu === null || gecikmeGunu === '')
      throw new Error('Gecikme günü zorunludur.');
    if (typeof toplamLimit !== 'number' || toplamLimit <= 0)
      throw new Error("Toplam limit 0'dan büyük olmalıdır.");
    if (typeof toplamBorc !== 'number' || toplamBorc < 0)
      throw new Error('Toplam borç geçerli bir sayı olmalıdır.');
    if (typeof netGelir !== 'number' || netGelir <= 0)
      throw new Error("Net gelir 0'dan büyük olmalıdır.");
    if (typeof aylikOdeme !== 'number' || aylikOdeme < 0)
      throw new Error('Aylık ödeme geçerli bir sayı olmalıdır.');
    if (gecikmeSikligi === 'Hiç olmadı' && gecikmeGunu !== '0')
      throw new Error("Hiç gecikme yoksa gecikme günü '0' olmalıdır.");
    if (gecikmeSikligi !== 'Hiç olmadı' && gecikmeGunu === '0')
      throw new Error('Gecikme varsa gecikme günü 0 olamaz.');

    var BASE_SCORE = 1000;

    /* -- Takip puanı -- */
    var takipPuani = { 'Yok': 220, 'Var ama kapandı': -120, 'Var ve devam ediyor': -520 }[takipDurumu];
    if (takipPuani === undefined) throw new Error('Geçersiz takip durumu.');

    /* -- Gecikme sıklığı -- */
    var gecikmeSiklikPuani = { 'Hiç olmadı': 280, '1 kez': 170, '2 kez': 80, '3 ve üzeri': -20 }[gecikmeSikligi];
    if (gecikmeSiklikPuani === undefined) throw new Error('Geçersiz gecikme sıklığı.');

    /* -- Gecikme günü -- */
    var gecikmeGunPuani = { '0': 0, '1-30 gün': -30, '31-60 gün': -90, '61-90 gün': -170, '90+ gün': -280 }[gecikmeGunu];
    if (gecikmeGunPuani === undefined) throw new Error('Geçersiz gecikme günü.');

    var gecikmePuani = gecikmeSiklikPuani + gecikmeGunPuani;

    /* -- Borç / Limit oranı -- */
    var borcLimitOrani = (toplamBorc / toplamLimit) * 100;
    var borcLimitPuani;
    if      (borcLimitOrani <= 10) borcLimitPuani = 220;
    else if (borcLimitOrani <= 20) borcLimitPuani = 190;
    else if (borcLimitOrani <= 40) borcLimitPuani = 140;
    else if (borcLimitOrani <= 60) borcLimitPuani = 80;
    else if (borcLimitOrani <= 80) borcLimitPuani = 20;
    else if (borcLimitOrani <= 95) borcLimitPuani = -60;
    else                           borcLimitPuani = -130;

    /* -- Ödeme / Gelir oranı -- */
    var odemeGelirOrani = (aylikOdeme / netGelir) * 100;
    var gelirOdemePuani;
    if      (odemeGelirOrani <= 10) gelirOdemePuani = 180;
    else if (odemeGelirOrani <= 20) gelirOdemePuani = 150;
    else if (odemeGelirOrani <= 30) gelirOdemePuani = 110;
    else if (odemeGelirOrani <= 40) gelirOdemePuani = 60;
    else if (odemeGelirOrani <= 50) gelirOdemePuani = 0;
    else if (odemeGelirOrani <= 65) gelirOdemePuani = -80;
    else                            gelirOdemePuani = -170;

    /* -- Kombine düzeltme -- */
    var kombineDuzeltme = 0;

    if (takipDurumu === 'Yok' && gecikmeSikligi === 'Hiç olmadı' && borcLimitOrani < 40)
      kombineDuzeltme += 90;
    if (takipDurumu === 'Yok' && gecikmeSikligi === '1 kez' && gecikmeGunu === '1-30 gün' && borcLimitOrani < 50)
      kombineDuzeltme += 20;
    if (takipDurumu === 'Var ama kapandı' && gecikmeSikligi === 'Hiç olmadı' && borcLimitOrani < 30)
      kombineDuzeltme += 25;

    if (takipDurumu === 'Var ve devam ediyor') kombineDuzeltme -= 120;
    if (gecikmeGunu === '31-60 gün') kombineDuzeltme -= 90;
    else if (gecikmeGunu === '61-90 gün') kombineDuzeltme -= 130;
    else if (gecikmeGunu === '90+ gün')   kombineDuzeltme -= 180;

    if (borcLimitOrani > 95 && odemeGelirOrani > 50)
      kombineDuzeltme -= 110;
    if (takipDurumu === 'Var ama kapandı' && gecikmeSikligi === '3 ve üzeri')
      kombineDuzeltme -= 70;
    if (gecikmeSikligi === 'Hiç olmadı' && borcLimitOrani > 85)
      kombineDuzeltme -= 40;

    /* -- Nihai puan -- */
    var tahminiPuan = Math.max(1, Math.min(1900,
      Math.round(BASE_SCORE + takipPuani + gecikmePuani + borcLimitPuani + gelirOdemePuani + kombineDuzeltme)
    ));

    var band       = getBand(tahminiPuan);
    var puanBandi  = band.label;

    /* -- Genel profil -- */
    var genelProfil;
    if      (tahminiPuan >= 1600) genelProfil = 'Çok Güçlü';
    else if (tahminiPuan >= 1450) genelProfil = 'Güçlü';
    else if (tahminiPuan >= 1200) genelProfil = 'Orta';
    else if (tahminiPuan >= 900)  genelProfil = 'Zayıf';
    else                          genelProfil = 'Çok Zayıf';

    /* -- Risk özeti -- */
    var riskOzeti = [];
    if (takipDurumu === 'Yok')
      riskOzeti.push('Aktif takip veya icra kaydı bulunmuyor.');
    else if (takipDurumu === 'Var ama kapandı')
      riskOzeti.push('Geçmişte kapanmış takip kaydı puanı baskılıyor.');
    else
      riskOzeti.push('Aktif takip kaydı puanı ciddi biçimde düşürüyor.');

    if (gecikmeSikligi === 'Hiç olmadı')
      riskOzeti.push('Son 12 ay ödeme performansı temiz.');
    else if (gecikmeGunu === '1-30 gün')
      riskOzeti.push('Kısa süreli gecikme puana sınırlı negatif etki etti.');
    else if (gecikmeGunu === '31-60 gün')
      riskOzeti.push('30 günü aşan gecikme risk seviyesini artırıyor.');
    else
      riskOzeti.push('Uzun gecikme süresi puanı ciddi şekilde baskılıyor.');

    if (borcLimitOrani <= 40)
      riskOzeti.push('Borç/limit oranı sağlıklı seviyede (%' + borcLimitOrani.toFixed(0) + ').');
    else if (borcLimitOrani <= 80)
      riskOzeti.push('Borç/limit oranı (%' + borcLimitOrani.toFixed(0) + ') orta seviyede; indirilebilir.');
    else
      riskOzeti.push('Borç/limit oranı (%' + borcLimitOrani.toFixed(0) + ') yüksek, puanı aşağı çekiyor.');

    if (odemeGelirOrani <= 30)
      riskOzeti.push('Gelire göre aylık ödeme yükü makul (%' + odemeGelirOrani.toFixed(0) + ').');
    else if (odemeGelirOrani <= 50)
      riskOzeti.push('Gelire göre aylık ödeme yükü sınırda (%' + odemeGelirOrani.toFixed(0) + ').');
    else
      riskOzeti.push('Aylık ödeme/gelir oranı (%' + odemeGelirOrani.toFixed(0) + ') yüksek.');

    return {
      tahminiPuan    : tahminiPuan,
      puanBandi      : puanBandi,
      bandColor      : band.color,
      genelProfil    : genelProfil,
      borcLimitOrani : parseFloat(borcLimitOrani.toFixed(1)),
      odemeGelirOrani: parseFloat(odemeGelirOrani.toFixed(1)),
      riskOzeti      : riskOzeti,
      hesaplamaDetayi: {
        baslangicPuani : BASE_SCORE,
        takipPuani     : takipPuani,
        gecikmePuani   : gecikmePuani,
        borcLimitPuani : borcLimitPuani,
        gelirOdemePuani: gelirOdemePuani,
        kombineDuzeltme: kombineDuzeltme,
        nihaiPuan      : tahminiPuan
      }
    };
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  return {
    calculateCreditScore : calculateCreditScore,
    getBand              : getBand,
    BANDS                : BANDS
  };
}));
