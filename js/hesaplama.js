/* =========================================================
   KREDİZMİR — hesaplama.js
   Taksit Hesaplama + Findeks/KKB Ön Değerlendirme UI
   ========================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------
     BÖLÜM 1: TAKSİT HESAPLAMA
     ------------------------------------------------------- */

  var currentMode = 'vergili'; // vergili | normal | djs

  function initTaksit() {
    // Mod butonları
    document.querySelectorAll('.kz-radio-btn[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.kz-radio-btn[data-mode]').forEach(function (b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
        currentMode = this.dataset.mode;
        onModeChange(currentMode);
      });
    });

    var hesaplaBtn = document.getElementById('kz-hesapla-btn');
    if (hesaplaBtn) {
      hesaplaBtn.addEventListener('click', hesapla);
    }
  }

  function onModeChange(mode) {
    var oranInput = document.getElementById('kz-oran');
    var djsNote   = document.getElementById('kz-djs-note');
    if (!oranInput) return;

    if (mode === 'djs') {
      oranInput.disabled = true;
      oranInput.value = '';
      oranInput.placeholder = 'DJS banda göre değişir';
      if (djsNote) djsNote.style.display = 'block';
    } else {
      oranInput.disabled = false;
      oranInput.placeholder = 'Örn: 3.99';
      if (djsNote) djsNote.style.display = 'none';
    }
  }

  function hesapla() {
    var fiyat    = parseFloat((document.getElementById('kz-fiyat')    || {}).value || 0);
    var pesinat  = parseFloat((document.getElementById('kz-pesinat')  || {}).value || 0);
    var vade     = parseInt((document.getElementById('kz-vade')       || {}).value || 0);
    var oranYil  = parseFloat((document.getElementById('kz-oran')     || {}).value || 0);

    var resultBox = document.getElementById('kz-taksit-result');
    if (!resultBox) return;

    // Validasyon
    if (!fiyat || fiyat <= 0) { alert('Lütfen araç fiyatını girin.'); return; }
    if (vade <= 0)             { alert('Lütfen vade süresini girin.'); return; }

    var anapara = fiyat - pesinat;
    if (anapara <= 0) { alert('Peşinat, araç fiyatından büyük olamaz.'); return; }

    var aylikTaksit, toplamOdeme, toplamFaiz;

    if (currentMode === 'djs') {
      // DJS: ortalama oran ile (min+max)/2 = (3.99+6.50)/2 = 5.245
      var djsOrtalamaAylik = 5.245 / 100;
      aylikTaksit  = taksitFormul(anapara, djsOrtalamaAylik, vade);
      toplamOdeme  = aylikTaksit * vade + pesinat;
      toplamFaiz   = toplamOdeme - fiyat;
    } else if (oranYil && oranYil > 0) {
      var aylikOran = oranYil / 100;
      aylikTaksit  = taksitFormul(anapara, aylikOran, vade);
      toplamOdeme  = aylikTaksit * vade + pesinat;
      toplamFaiz   = toplamOdeme - fiyat;
    } else {
      // Oran girilmemişse sadece eşit taksit
      aylikTaksit  = anapara / vade;
      toplamOdeme  = fiyat;
      toplamFaiz   = 0;
    }

    document.getElementById('kz-r-taksit').textContent  = fmt(aylikTaksit);
    document.getElementById('kz-r-toplam').textContent  = fmt(toplamOdeme);
    document.getElementById('kz-r-faiz').textContent    = fmt(Math.max(0, toplamFaiz));

    var djsNoteResult = document.getElementById('kz-djs-note-result');
    if (djsNoteResult) {
      djsNoteResult.style.display = (currentMode === 'djs') ? 'block' : 'none';
    }

    resultBox.classList.add('visible');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function taksitFormul(anapara, aylikOran, vade) {
    // Standart taksit formülü: A = P * r / (1 - (1+r)^-n)
    if (aylikOran <= 0) return anapara / vade;
    return anapara * aylikOran / (1 - Math.pow(1 + aylikOran, -vade));
  }

  function fmt(n) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY', maximumFractionDigits: 0
    }).format(n);
  }

  /* -------------------------------------------------------
     BÖLÜM 2: FİNDEKS ÖN DEĞERLENDİRME — 5 Adımlı Form
     ------------------------------------------------------- */

  var ADIMLAR = [
    {
      id: 'takip',
      title: 'Kanuni Takip / İcra / Varlık Yönetimi',
      hint: 'Bugüne kadar adınıza kanuni takip, icra veya varlık yönetimi kaydı açıldı mı?',
      tip: 'single',
      key: 'takipDurum',
      options: [
        { value: 'none',   label: 'Hiç olmadı' },
        { value: 'old',    label: 'Oldu, 3+ yıl önce kapandı' },
        { value: 'mid',    label: 'Oldu, 1-3 yıl önce kapandı' },
        { value: 'recent', label: 'Oldu, son 12 ayda kapandı' },
        { value: 'open',   label: 'Hâlâ açık / devam ediyor' },
      ],
    },
    {
      id: 'takip-cok',
      title: 'Birden Fazla Takip Dosyası',
      hint: 'Birden fazla dosya/icra/varlık yönetimi kaydı var mı (veya vardı mı)?',
      tip: 'single',
      key: 'takipCok',
      showIf: function (ans) { return ans.takipDurum && ans.takipDurum !== 'none'; },
      options: [
        { value: 'false', label: 'Hayır, tek dosya' },
        { value: 'true',  label: 'Evet, birden fazla' },
      ],
    },
    {
      id: 'gecikme',
      title: 'Son 12 Ay Gecikme Durumu',
      hint: 'Kart, kredi veya herhangi bir borç ödemesinde son 12 ayda gecikme yaşandı mı?',
      tip: 'single',
      key: 'gecikmeDurum',
      options: [
        { value: 'none',      label: 'Hiç gecikme olmadı' },
        { value: 'low',       label: '1-2 kez, 1-30 gün arası gecikme' },
        { value: 'mid',       label: '3+ kez, 1-30 gün arası gecikme' },
        { value: 'high',      label: '1 kez, 30 günü aşan gecikme' },
        { value: 'very_high', label: '2+ kez, 30 günü aşan gecikme' },
      ],
    },
    {
      id: 'gecikme-yakin',
      title: 'Gecikmenin Zamanlama',
      hint: 'Bu gecikmeler son 3-6 ay içinde mi yaşandı?',
      tip: 'single',
      key: 'gecikmeYakin',
      showIf: function (ans) { return ans.gecikmeDurum && ans.gecikmeDurum !== 'none'; },
      options: [
        { value: 'false', label: 'Hayır, daha eski' },
        { value: 'true',  label: 'Evet, yakın tarihli' },
      ],
    },
    {
      id: 'limit',
      title: 'Toplam Kart + KMH Limiti',
      hint: 'Tüm bankalar dahil toplam kredi kartı + kredili mevduat hesabı limitiniz ne kadar? (TL)',
      tip: 'number',
      key: 'limit',
      placeholder: 'Örn: 150000',
    },
    {
      id: 'borc',
      title: 'Toplam Mevcut Borç',
      hint: 'Kart + KMH\'de güncel toplam borcunuz ne kadar? (TL)',
      tip: 'number',
      key: 'borc',
      placeholder: 'Örn: 45000',
    },
    {
      id: 'odeme',
      title: 'Aylık Toplam Ödeme Yükü',
      hint: 'Kredi taksidi + kart asgari ödeme + diğer düzenli borç ödemelerinin toplamı (TL/ay)?',
      tip: 'number',
      key: 'aylikOdeme',
      placeholder: 'Örn: 8000',
    },
    {
      id: 'gelir',
      title: 'Net Aylık Gelir (İsteğe Bağlı)',
      hint: 'Net aylık gelirinizi girmek daha doğru sonuç verir. Boş bırakabilirsiniz.',
      tip: 'number',
      key: 'gelir',
      placeholder: 'Örn: 35000 (boş bırakabilirsiniz)',
      optional: true,
    },
  ];

  var currentStep = 0;
  var answers = {};
  var visibleSteps = [];

  function buildVisibleSteps() {
    visibleSteps = ADIMLAR.filter(function (s) {
      if (typeof s.showIf === 'function') return s.showIf(answers);
      return true;
    });
  }

  function initFindeks() {
    var startBtn = document.getElementById('kz-findeks-start');
    if (!startBtn) return;

    startBtn.addEventListener('click', function () {
      document.getElementById('kz-findeks-intro').style.display = 'none';
      document.getElementById('kz-findeks-form').style.display  = 'block';
      answers = {};
      currentStep = 0;
      buildVisibleSteps();
      renderStep();
    });
  }

  function renderStep() {
    var form = document.getElementById('kz-findeks-form');
    if (!form) return;

    if (currentStep >= visibleSteps.length) {
      showFindeksResult();
      return;
    }

    var step = visibleSteps[currentStep];
    var total = visibleSteps.length;

    // Progress dots
    var dots = '';
    for (var i = 0; i < total; i++) {
      var cls = i < currentStep ? 'done' : (i === currentStep ? 'active' : '');
      dots += '<div class="kz-step-dot ' + cls + '"></div>';
    }

    var contentHTML;
    if (step.tip === 'single') {
      contentHTML = step.options.map(function (opt) {
        var sel = (answers[step.key] === opt.value) ? ' active' : '';
        return '<button type="button" class="kz-radio-btn kz-findeks-opt' + sel + '" data-key="' + step.key + '" data-val="' + opt.value + '">' + opt.label + '</button>';
      }).join('\n');
    } else {
      contentHTML = '<input class="kz-input" type="number" min="0" id="kz-findeks-num" placeholder="' + (step.placeholder || '') + '" value="' + (answers[step.key] || '') + '">';
    }

    var prevBtn = currentStep > 0 ? '<button type="button" class="kz-btn kz-btn--outline" id="kz-findeks-prev">← Geri</button>' : '';
    var nextLabel = (currentStep === total - 1) ? 'Değerlendirmeyi Gör →' : 'Devam →';
    var nextStyle = (currentStep === total - 1) ? 'kz-btn--gold' : 'kz-btn--primary';

    form.innerHTML = [
      '<div class="kz-steps">' + dots + '</div>',
      '<div class="kz-question-box">',
      '  <p style="font-size:0.75rem;color:var(--kz-muted);margin-bottom:4px;">Soru ' + (currentStep + 1) + ' / ' + total + '</p>',
      '  <div class="kz-question-title">' + step.title + '</div>',
      '  <div class="kz-question-hint">' + step.hint + '</div>',
      '  <div class="kz-radio-group" style="flex-direction:column;">' + contentHTML + '</div>',
      '  <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;">',
      '    ' + prevBtn,
      '    <button type="button" class="kz-btn ' + nextStyle + '" id="kz-findeks-next">' + nextLabel + '</button>',
      '  </div>',
      '</div>',
    ].join('\n');

    // Optionlar tıklanınca
    form.querySelectorAll('.kz-findeks-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.querySelectorAll('.kz-findeks-opt').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        answers[this.dataset.key] = this.dataset.val;
      });
    });

    // Geri
    var prevBtnEl = document.getElementById('kz-findeks-prev');
    if (prevBtnEl) {
      prevBtnEl.addEventListener('click', function () {
        currentStep--;
        buildVisibleSteps();
        renderStep();
      });
    }

    // İleri
    var nextBtnEl = document.getElementById('kz-findeks-next');
    if (nextBtnEl) {
      nextBtnEl.addEventListener('click', function () {
        var step = visibleSteps[currentStep];
        if (step.tip === 'number') {
          var val = document.getElementById('kz-findeks-num') ? document.getElementById('kz-findeks-num').value : '';
          if (!step.optional && (!val || isNaN(Number(val)))) {
            alert('Lütfen bir değer girin.');
            return;
          }
          answers[step.key] = val || null;
        } else {
          if (!answers[step.key]) {
            alert('Lütfen bir seçenek seçin.');
            return;
          }
        }
        // Boolean dönüşümü
        if (answers[step.key] === 'true')  answers[step.key] = true;
        if (answers[step.key] === 'false') answers[step.key] = false;

        currentStep++;
        buildVisibleSteps();
        renderStep();
      });
    }
  }

  function showFindeksResult() {
    var form   = document.getElementById('kz-findeks-form');
    var result = document.getElementById('kz-findeks-result');
    if (!form || !result || !window.KZFindeks) return;

    form.style.display = 'none';
    result.style.display = 'block';
    result.classList.add('visible');

    var r    = window.KZFindeks.hesapla(answers);
    var etiket = window.KZFindeks.sonucEtiket[r.sonuc] || window.KZFindeks.sonucEtiket['cikmaz'];
    var aracFiyat = (document.getElementById('kz-fiyat') || {}).value || 0;

    var faktHTML = r.faktorler.map(function (f) {
      var pct = Math.round(f.skor / f.max * 100);
      var icon = pct >= 80 ? '🔴' : (pct >= 50 ? '🟡' : '🟢');
      return '<li><span class="kz-factor-icon">' + icon + '</span><span><strong style="color:var(--kz-white);">' + f.label + '</strong><br><span style="font-size:0.75rem;">' + f.skor + ' / ' + f.max + ' etki puanı</span></span></li>';
    }).join('');

    var planData = window.KZFindeks.iyilestirme;
    var planHTML = [
      '<div class="kz-plan-card"><div class="kz-plan-card__period">7 Gün</div><ul>' +
        planData['7gun'].map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>',
      '<div class="kz-plan-card"><div class="kz-plan-card__period">30 Gün</div><ul>' +
        planData['30gun'].map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>',
      '<div class="kz-plan-card"><div class="kz-plan-card__period">90 Gün</div><ul>' +
        planData['90gun'].map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div>',
    ].join('');

    var uyarilar = [];
    if (r.ineDosya)        uyarilar.push('<span style="color:var(--kz-warning);">⚠ Toplam limit düşük — ince dosya riski mevcut.</span>');
    if (r.gelirBilgisiYok) uyarilar.push('<span style="color:var(--kz-muted);">ℹ Gelir bilgisi girilmediği için ödeme yükü varsayımsal hesaplandı.</span>');
    if (r.acikTakip)       uyarilar.push('<span style="color:var(--kz-danger);">🔴 Açık takip/icra tespit edildi — kredi onayı mümkün değil.</span>');

    result.innerHTML = [
      '<div class="kz-findeks-verdict ' + etiket.cls + '">' + etiket.label + '</div>',
      '<div class="kz-findeks-score">' + r.puan + '</div>',
      '<div class="kz-findeks-band">Tahmini Band: ' + r.band[0] + ' – ' + r.band[1] + '</div>',
      '<p style="font-size:0.88rem;color:var(--kz-muted);margin-bottom:20px;">' + etiket.desc + '</p>',
      uyarilar.length ? '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">' + uyarilar.join('') + '</div>' : '',
      '<div class="kz-plan-title">En Çok Etkileyen 3 Faktör</div>',
      '<ul class="kz-factors-list">' + faktHTML + '</ul>',
      '<div class="kz-plan-title" style="margin-top:20px;">Hızlı İyileştirme Planı</div>',
      '<div class="kz-plan-grid">' + planHTML + '</div>',
      '<div style="margin-top:20px;padding:14px;background:rgba(10,26,47,0.5);border:1px solid var(--kz-border);border-radius:10px;">',
      '  <div class="kz-plan-title" style="margin-bottom:8px;">Limit / Peşinat Senaryosu</div>',
      '  <p style="font-size:0.875rem;color:var(--kz-muted);">' + window.KZFindeks.limitSenaryosu(r.puan, aracFiyat) + '</p>',
      '</div>',
      '<div class="kz-disclaimer">Bu bir ön değerlendirmedir. Bankanın nihai kararı müşteri profili, araç durumu ve güncel kredi politikalarına göre farklılık gösterebilir. KREDİZMİR kesin onay/limit taahhüdü vermez.</div>',
      '<div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">',
      '  <button type="button" class="kz-btn kz-btn--outline" id="kz-findeks-yenile">Yeniden Değerlendir</button>',
      '  <a href="galeriler.html" class="kz-btn kz-btn--primary">Galerilerimizi Gör →</a>',
      '</div>',
    ].join('\n');

    var yenileBtn = document.getElementById('kz-findeks-yenile');
    if (yenileBtn) {
      yenileBtn.addEventListener('click', function () {
        result.style.display = 'none';
        result.classList.remove('visible');
        result.innerHTML = '';
        document.getElementById('kz-findeks-intro').style.display = 'block';
        answers = {};
        currentStep = 0;
      });
    }

    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* -------------------------------------------------------
     Init
     ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTaksit();
    initFindeks();
    // İlk mod
    var firstMode = document.querySelector('.kz-radio-btn[data-mode].active');
    if (firstMode) onModeChange(firstMode.dataset.mode);
  });

})();
