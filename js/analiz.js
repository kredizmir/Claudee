/**
 * KREDİZMİR — analiz.js
 * SPA kontrolcüsü: Consent → Form → Results akışı
 * Eligibility + LimitEngine çağırır, sonuçları render eder,
 * server'a lead POST eder, Findeks PDF'i upload eder.
 */

(function () {
  'use strict';

  /* ============================================================
     UTIL
     ============================================================ */
  var API_BASE = window.KZ_API_BASE || 'http://localhost:3000';

  function fmtTL(v) {
    if (!v && v !== 0) return '—';
    return '₺\u202F' + Math.round(v).toLocaleString('tr-TR');
  }
  function fmtPct(v) {
    return '%' + (v * 100).toFixed(1).replace('.', ',');
  }
  function el(id) { return document.getElementById(id); }

  /* ============================================================
     ADIM YÖNETİMİ
     ============================================================ */
  var steps = {
    consent : el('kzStep-consent'),
    form    : el('kzStep-form'),
    results : el('kzStep-results')
  };

  function showStep(name) {
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = (k !== name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ============================================================
     CONSENT
     ============================================================ */
  var consentCheck  = el('kzConsentCheck');
  var consentBtn    = el('kzConsentBtn');

  if (consentBtn) {
    consentBtn.addEventListener('click', function () {
      if (!consentCheck || !consentCheck.checked) {
        consentCheck.closest('.kz-consent-row').classList.add('kz-shake');
        setTimeout(function () {
          consentCheck.closest('.kz-consent-row').classList.remove('kz-shake');
        }, 500);
        return;
      }
      showStep('form');
    });
  }

  /* ============================================================
     FORM GÖNDERİMİ
     ============================================================ */
  var form = el('kzAnalizForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    runAnalysis();
  });

  function getFormData() {
    return {
      yasal      : form.yasal.value,
      gecikme    : form.gecikme.value,
      limit      : parseFloat(form.limit.value)      || 0,
      borc       : parseFloat(form.borc.value)       || 0,
      odemeYuku  : parseFloat(form.odemeYuku.value)  || 0,
      gelir      : parseFloat(form.gelir.value)      || 0,
      aracFiyat  : parseFloat(form.aracFiyat.value)  || 0,
      aracYili   : parseInt(form.aracYili.value, 10) || new Date().getFullYear() - 3,
      pesinat    : parseFloat(form.pesinat.value)    || 0
    };
  }

  function runAnalysis() {
    var data = getFormData();

    /* 1. Hızlı taksit tahmini (DSR için) */
    var estPayment = KzLimitEngine.quickEstimatePayment(
      data.aracFiyat, data.pesinat, data.aracYili
    );

    /* 2. Uygunluk analizi */
    var analysis = KzEligibility.analyze(data, estPayment);

    /* 3. Limit motoru */
    var limitResult = KzLimitEngine.calculate({
      aracFiyat  : data.aracFiyat,
      aracYili   : data.aracYili,
      pesinat    : data.pesinat,
      gelir      : data.gelir,
      odemeYuku  : data.odemeYuku,
      category   : analysis.category
    });

    /* 4. Sonuçları göster */
    renderResults(data, analysis, limitResult);
    showStep('results');

    /* 5. Findeks PDF upload (asenkron, UI'yi bloklamaz) */
    uploadFindeks();

    /* 6. Lead kaydet (asenkron) */
    postLead(data, analysis, limitResult);
  }

  /* ============================================================
     SONUÇ RENDER
     ============================================================ */
  function renderResults(data, analysis, limit) {
    /* Badge */
    var badge = el('kzResBadge');
    if (badge) {
      badge.textContent = analysis.categoryInfo
        ? analysis.categoryInfo.label
        : analysis.category;
      badge.className = 'kz-eligibility-badge kz-eligibility-badge--' + analysis.category;
    }

    /* Gauge SVG */
    renderGauge(analysis);

    /* Gerekçeler */
    var reasonsList = el('kzResReasons');
    if (reasonsList) {
      reasonsList.innerHTML = '';
      (analysis.reasons || []).forEach(function (r) {
        var li = document.createElement('li');
        li.className = 'kz-reason-item';
        li.textContent = r;
        reasonsList.appendChild(li);
      });
    }

    /* Finansman aralığı */
    renderLimit(limit);

    /* İyileştirme planı */
    renderImprovement(analysis.improvement);

    /* Geri dön butonu + PDF butonu */
    setupResultButtons(data, analysis, limit);
  }

  /* ---- Gauge (SVG dairesel progress ring) ---- */
  function renderGauge(analysis) {
    var wrap = el('kzGaugeWrap');
    if (!wrap) return;

    var score = analysis.score || 0;
    /* Kategori rengi */
    var colorMap = {
      'yuksek'          : '#22c55e',
      'orta'            : '#f59e0b',
      'dusuk'           : '#f97316',
      'onceIyilestirme' : '#ef4444',
      'eksikBilgi'      : '#9ca3af'
    };
    var color = colorMap[analysis.category] || '#9ca3af';

    var R   = 52;
    var cx  = 60; var cy = 60;
    var circ = 2 * Math.PI * R;
    var offset = circ * (1 - score / 100);

    var label = analysis.categoryInfo
      ? analysis.categoryInfo.label.split(' ')
      : [analysis.category];

    /* SVG label — 1 veya 2 satır */
    var textLines = '';
    if (label.length >= 2) {
      textLines =
        '<text x="60" y="55" text-anchor="middle" fill="' + color + '" font-size="9.5" font-family="Inter,sans-serif" font-weight="700">' + label[0] + '</text>' +
        '<text x="60" y="68" text-anchor="middle" fill="' + color + '" font-size="9.5" font-family="Inter,sans-serif" font-weight="700">' + label.slice(1).join(' ') + '</text>';
    } else {
      textLines = '<text x="60" y="63" text-anchor="middle" fill="' + color + '" font-size="9.5" font-family="Inter,sans-serif" font-weight="700">' + label[0] + '</text>';
    }

    wrap.innerHTML =
      '<svg viewBox="0 0 120 120" width="160" height="160" role="img" aria-label="Uygunluk göstergesi">' +
        /* Bg ring */
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="11"/>' +
        /* Progress ring */
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none"' +
          ' stroke="' + color + '" stroke-width="11"' +
          ' stroke-dasharray="' + circ.toFixed(2) + '"' +
          ' stroke-dashoffset="' + offset.toFixed(2) + '"' +
          ' stroke-linecap="round"' +
          ' transform="rotate(-90 ' + cx + ' ' + cy + ')"' +
          ' style="transition:stroke-dashoffset 1s ease"/>' +
        /* Center text */
        textLines +
      '</svg>';
  }

  /* ---- Limit kartı ---- */
  function renderLimit(limit) {
    var wrap = el('kzResLimit');
    if (!wrap) return;

    if (limit.krediYok) {
      wrap.innerHTML =
        '<div class="kz-limit-none">' +
        '<span class="kz-limit-none__icon">⛔</span>' +
        '<p>Araç fiyatı veya profil, mevcut BDDK kuralları çerçevesinde finansmana uygun değil.</p>' +
        '</div>';
      return;
    }

    wrap.innerHTML =
      '<div class="kz-limit-row">' +
        '<span class="kz-limit-label">Tahmini Kredi Aralığı</span>' +
        '<span class="kz-limit-value">' + fmtTL(limit.minKredi) + ' – ' + fmtTL(limit.maxKredi) + '</span>' +
      '</div>' +
      '<div class="kz-limit-row">' +
        '<span class="kz-limit-label">Tahmini Aylık Taksit</span>' +
        '<span class="kz-limit-value kz-limit-value--accent">' + fmtTL(limit.estimatedPayment) + '</span>' +
      '</div>' +
      '<div class="kz-limit-row">' +
        '<span class="kz-limit-label">BDDK LTV</span>' +
        '<span class="kz-limit-value">' + fmtPct(limit.ltv) + '</span>' +
      '</div>' +
      '<div class="kz-limit-row">' +
        '<span class="kz-limit-label">Azami Vade</span>' +
        '<span class="kz-limit-value">' + limit.maxTerm + ' Ay</span>' +
      '</div>' +
      '<div class="kz-limit-row kz-limit-row--highlight">' +
        '<span class="kz-limit-label">Önerilen Kanal</span>' +
        '<span class="kz-limit-value">' + limit.channel + '</span>' +
      '</div>';
  }

  /* ---- İyileştirme planı ---- */
  function renderImprovement(imp) {
    var wrap = el('kzResImprovement');
    if (!wrap || !imp) return;

    wrap.innerHTML =
      '<div class="kz-imp-step">' +
        '<div class="kz-imp-badge kz-imp-badge--7">7 Gün</div>' +
        '<p>' + (imp.gun7 || '') + '</p>' +
      '</div>' +
      '<div class="kz-imp-step">' +
        '<div class="kz-imp-badge kz-imp-badge--30">30 Gün</div>' +
        '<p>' + (imp.gun30 || '') + '</p>' +
      '</div>' +
      '<div class="kz-imp-step">' +
        '<div class="kz-imp-badge kz-imp-badge--90">90 Gün</div>' +
        '<p>' + (imp.gun90 || '') + '</p>' +
      '</div>';
  }

  /* ---- Butonlar ---- */
  function setupResultButtons(data, analysis, limit) {
    /* Yeniden analiz */
    var backBtn = el('kzBtnBack');
    if (backBtn) {
      backBtn.onclick = function () { showStep('form'); };
    }

    /* PDF indir */
    var pdfBtn = el('kzBtnPDF');
    if (pdfBtn) {
      pdfBtn.onclick = function () {
        if (typeof KzReport !== 'undefined') {
          KzReport.generate({
            form     : data,
            analysis : analysis,
            limit    : limit,
            date     : new Date().toLocaleDateString('tr-TR')
          });
        } else {
          alert('PDF modülü yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.');
        }
      };
    }
  }

  /* ============================================================
     FİNDEKS PDF UPLOAD
     ============================================================ */
  function uploadFindeks() {
    var fileInput = el('kzFindeksPDF');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

    var formData = new FormData();
    formData.append('findeks', fileInput.files[0]);

    fetch(API_BASE + '/upload', { method: 'POST', body: formData })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        console.log('Findeks yüklendi:', res);
        var status = el('kzFindeksStatus');
        if (status) {
          status.textContent = 'Findeks PDF başarıyla yüklendi.';
          status.className   = 'kz-upload-status kz-upload-status--ok';
        }
      })
      .catch(function (err) {
        console.warn('Findeks upload hatası (server çalışmıyor olabilir):', err);
      });
  }

  /* ============================================================
     LEAD KAYDET
     ============================================================ */
  function postLead(data, analysis, limit) {
    var payload = {
      category      : analysis.category,
      vehiclePrice  : data.aracFiyat,
      income        : data.gelir,
      dsr           : analysis.dsr || 0,
      recommendation: limit.channel,
      maxKredi      : limit.maxKredi
    };

    fetch(API_BASE + '/analyze', {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(payload)
    })
    .then(function (r) { return r.json(); })
    .then(function (res) { console.log('Lead kaydedildi, id:', res.id); })
    .catch(function (err) { console.warn('Lead POST hatası (server çalışmıyor olabilir):', err); });
  }

})();
