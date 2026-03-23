/**
 * KREDİZMİR — Şablon Üretici
 * js/sablon.js
 *
 * Tüm client-side mantık: form yönetimi, canlı önizleme,
 * PNG indirme.
 */

(function () {
  'use strict';

  /* ── Durum ──────────────────────────────────────── */
  var _imageDataUrl = '';
  var _previewReady = false;

  /* ── DOM Referansları ───────────────────────────── */
  var fMarka      = document.getElementById('sb-marka');
  var fModel      = document.getElementById('sb-model');
  var fYil        = document.getElementById('sb-yil');
  var fKm         = document.getElementById('sb-km');
  var fYakit      = document.getElementById('sb-yakit');
  var fVites      = document.getElementById('sb-vites');
  var fPesinat    = document.getElementById('sb-pesinat');
  var fPesin      = document.getElementById('sb-pesin');
  var fGorsel     = document.getElementById('sb-gorsel');

  var cvKm        = document.getElementById('cv-km');
  var cvYakit     = document.getElementById('cv-yakit');
  var cvVites     = document.getElementById('cv-vites');
  var cvModel     = document.getElementById('cv-model');
  var cvPesinat   = document.getElementById('cv-pesinat');
  var cvPesin     = document.getElementById('cv-pesin');
  var cvImg       = document.getElementById('cv-img');
  var cvPH        = document.getElementById('cv-placeholder');
  var canvasEl    = document.getElementById('kz-sablon-canvas');

  var generateBtn = document.getElementById('sb-generate-btn');
  var downloadBtn = document.getElementById('sb-download-btn');
  var resetBtn    = document.getElementById('sb-reset-btn');
  var previewOuter = document.getElementById('sb-preview-outer');
  var previewWrap  = document.getElementById('sb-preview-wrap');

  /* ── Sayı formatlayıcı ──────────────────────────── */
  function formatMoney(val) {
    var n = parseInt(String(val).replace(/[^\d]/g, ''), 10);
    if (isNaN(n)) return '';
    return n.toLocaleString('tr-TR');
  }

  /* ── Canvas içeriğini forma göre güncelle ───────── */
  function syncToCanvas() {
    var marka   = (fMarka.value || '').toUpperCase().trim();
    var model   = (fModel.value || '').toUpperCase().trim();
    var yil     = (fYil.value   || '').trim();
    var km      = (fKm.value    || '').trim();
    var yakit   = fYakit.value  || 'Dizel';
    var vites   = fVites.value  || 'Manuel';
    var pesinat = fPesinat.value ? formatMoney(fPesinat.value) : '';
    var pesin   = fPesin.value  ? formatMoney(fPesin.value)   : '';

    var label = [marka, model].filter(Boolean).join(' ');

    cvKm.textContent      = km    ? km + ' KM'      : '000.000 KM';
    cvYakit.textContent   = yakit;
    cvVites.textContent   = vites;
    cvModel.textContent   = label && yil ? label + ' ' + yil : (label || 'ARAÇ MODELİ YIL');
    cvPesinat.textContent = pesinat ? pesinat + ' PEŞİNAT' : '000.000 PEŞİNAT';
    cvPesin.textContent   = pesin   ? pesin   + ' PEŞİN'   : '000.000 PEŞİN';
  }

  /* ── Peşin → Peşinat otomatik %30 ──────────────── */
  function autoCalcPesinat() {
    var pesin = parseInt(String(fPesin.value).replace(/[^\d]/g, ''), 10);
    if (!isNaN(pesin) && pesin > 0) {
      fPesinat.value = Math.round(pesin * 0.30);
    }
    syncToCanvas();
  }

  /* ── Görsel yükleme ─────────────────────────────── */
  function applyImage(src) {
    if (!src) return;
    cvImg.onload = function () {
      cvImg.style.display = 'block';
      cvPH.style.display  = 'none';
    };
    cvImg.onerror = function () {
      if (src.indexOf('/image-proxy') === -1 && src.indexOf('data:') === -1) {
        applyImage('/image-proxy?url=' + encodeURIComponent(src));
      }
    };
    cvImg.src = src;
    _imageDataUrl = src;
  }

  /* ── Görsel dosya seçici ────────────────────────── */
  function handleImageFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) { applyImage(e.target.result); };
    reader.readAsDataURL(file);
  }

  /* ── Önizleme ölçeği ────────────────────────────── */
  function applyScale() {
    var wrapW = previewWrap.clientWidth - 24;
    var scale = Math.min(wrapW / 1080, 1);
    previewOuter.style.transform       = 'scale(' + scale + ')';
    previewOuter.style.transformOrigin = 'top left';
    previewWrap.style.height           = Math.round(1080 * scale + 24) + 'px';
  }

  /* ── PNG render ─────────────────────────────────── */
  function renderToPNG() {
    return html2canvas(canvasEl, {
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#1565C0',
      width: 1080,
      height: 1080,
      scrollX: 0,
      scrollY: 0
    });
  }

  /* ── Dosya adı üret ─────────────────────────────── */
  function makeFilename() {
    var s = ([fMarka.value, fModel.value, fYil.value].filter(Boolean).join('_'))
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_ğüşöçıĞÜŞÖÇİ]/g, '')
      .slice(0, 60);
    return (s || 'sablon') + '_kredizmir.png';
  }

  /* ── Önizleme oluştur ───────────────────────────── */
  function generatePreview() {
    syncToCanvas();
    _previewReady = true;
    downloadBtn.disabled = false;
  }

  /* ── PNG indir ───────────────────────────────────── */
  function downloadPNG() {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Oluşturuluyor...';

    renderToPNG().then(function (canvas) {
      canvas.toBlob(function (blob) {
        saveAs(blob, makeFilename());
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'PNG İndir (1080×1080)';
      }, 'image/png');
    }).catch(function (err) {
      console.error('html2canvas hata:', err);
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'PNG İndir (1080×1080)';
      alert('PNG oluşturulurken hata: ' + err.message);
    });
  }

  /* ── Formu sıfırla ───────────────────────────────── */
  function resetForm() {
    fMarka.value  = '';
    fModel.value  = '';
    fYil.selectedIndex   = 0;
    fKm.value     = '';
    fYakit.selectedIndex = 0;
    fVites.selectedIndex = 0;
    fPesinat.value = '';
    fPesin.value   = '';
    fGorsel.value  = '';
    _imageDataUrl  = '';
    cvImg.src      = '';
    cvImg.style.display = 'none';
    cvPH.style.display  = 'flex';
    _previewReady  = false;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'PNG İndir (1080×1080)';
    syncToCanvas();
  }

  /* ── Event dinleyicileri ────────────────────────── */
  function bindEvents() {
    /* Canlı önizleme */
    [fMarka, fModel, fKm, fPesinat].forEach(function (el) {
      el.addEventListener('input', syncToCanvas);
    });
    fYil.addEventListener('change', syncToCanvas);
    fYakit.addEventListener('change', syncToCanvas);
    fVites.addEventListener('change', syncToCanvas);

    /* Peşin değişince peşinatı otomatik hesapla */
    fPesin.addEventListener('input', autoCalcPesinat);

    /* Km hızlı seçim butonları */
    document.querySelectorAll('.sb-km-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        fKm.value = btn.dataset.km;
        syncToCanvas();
      });
    });

    /* Görsel */
    fGorsel.addEventListener('change', function () {
      handleImageFile(fGorsel.files[0]);
    });

    /* Eylem butonları */
    generateBtn.addEventListener('click', generatePreview);
    downloadBtn.addEventListener('click', function () {
      if (!downloadBtn.disabled) downloadPNG();
    });
    resetBtn.addEventListener('click', resetForm);

    window.addEventListener('resize', applyScale);
  }

  /* ── İlk yükleme ─────────────────────────────────── */
  function init() {
    bindEvents();
    syncToCanvas();
    applyScale();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
