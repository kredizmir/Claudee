/**
 * KREDİZMİR — Şablon Üretici
 * js/sablon.js
 *
 * Tüm client-side mantık: form yönetimi, canlı önizleme,
 * sahibinden.com fetch, PNG indirme, toplu ZIP üretimi.
 */

(function () {
  'use strict';

  /* ── Durum ──────────────────────────────────────── */
  var _imageDataUrl = '';    // yüklü/getirilen görsel data URL veya proxy URL
  var _previewReady = false; // PNG indir butonunu etkinleştirme bayrağı

  /* ── DOM Referansları ───────────────────────────── */
  var fModel      = document.getElementById('sb-model');
  var fYil        = document.getElementById('sb-yil');
  var fKm         = document.getElementById('sb-km');
  var fYakit      = document.getElementById('sb-yakit');
  var fVites      = document.getElementById('sb-vites');
  var fPesinat    = document.getElementById('sb-pesinat');
  var fPesin      = document.getElementById('sb-pesin');
  var fGorsel     = document.getElementById('sb-gorsel');
  var fUrl        = document.getElementById('sb-url');

  var cvKm        = document.getElementById('cv-km');
  var cvYakit     = document.getElementById('cv-yakit');
  var cvVites     = document.getElementById('cv-vites');
  var cvModel     = document.getElementById('cv-model');
  var cvPesinat   = document.getElementById('cv-pesinat');
  var cvPesin     = document.getElementById('cv-pesin');
  var cvImg       = document.getElementById('cv-img');
  var cvPH        = document.getElementById('cv-placeholder');
  var canvasEl    = document.getElementById('kz-sablon-canvas');

  var tabBtns     = document.querySelectorAll('.sb-tab-btn');
  var tabPanels   = document.querySelectorAll('.sb-tab-panel');
  var fetchBtn    = document.getElementById('sb-fetch-btn');
  var fetchStatus = document.getElementById('sb-fetch-status');
  var accordBtn   = document.getElementById('sb-accordion-btn');
  var accordBody  = document.getElementById('sb-accordion-body');
  var generateBtn = document.getElementById('sb-generate-btn');
  var downloadBtn = document.getElementById('sb-download-btn');
  var resetBtn    = document.getElementById('sb-reset-btn');
  var batchBtn    = document.getElementById('sb-batch-btn');
  var csvFileInput = document.getElementById('sb-csv-file');
  var csvTextarea  = document.getElementById('sb-csv-text');
  var progressWrap = document.getElementById('sb-progress');
  var progressText = document.getElementById('sb-progress-text');
  var progressFill = document.getElementById('sb-progress-fill');
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
    var model   = (fModel.value || '').toUpperCase().trim();
    var yil     = (fYil.value  || '').trim();
    var km      = (fKm.value   || '').trim();
    var yakit   = fYakit.value || 'Dizel';
    var vites   = fVites.value || 'Manuel';
    var pesinat = fPesinat.value ? formatMoney(fPesinat.value) : '';
    var pesin   = fPesin.value  ? formatMoney(fPesin.value)   : '';

    cvKm.textContent    = km    ? km + ' KM'       : '000.000 KM';
    cvYakit.textContent = yakit || 'Dizel';
    cvVites.textContent = vites || 'Manuel';
    cvModel.textContent = model && yil ? model + ' ' + yil : (model || 'ARAÇ MODELİ YIL');
    cvPesinat.textContent = pesinat ? pesinat + ' PEŞİNAT'  : '000.000 PEŞİNAT';
    cvPesin.textContent   = pesin   ? pesin   + ' PEŞİN'    : '000.000 PEŞİN';
  }

  /* ── Görsel yükleme (data URL veya proxy URL) ───── */
  function applyImage(src) {
    if (!src) return;
    cvImg.onload = function () {
      cvImg.style.display = 'block';
      cvPH.style.display  = 'none';
    };
    cvImg.onerror = function () {
      /* Proxy üzerinden tekrar dene */
      if (src.indexOf('/image-proxy') === -1 && src.indexOf('data:') === -1) {
        var proxied = '/image-proxy?url=' + encodeURIComponent(src);
        applyImage(proxied);
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

  /* ── Önizleme ölçeğini viewport'a göre hesapla ─── */
  function applyScale() {
    var wrapW = previewWrap.clientWidth - 24;
    var scale = Math.min(wrapW / 1080, 1);
    previewOuter.style.transform      = 'scale(' + scale + ')';
    previewOuter.style.transformOrigin = 'top left';
    previewWrap.style.height           = Math.round(1080 * scale + 24) + 'px';
  }

  /* ── Sekme (Tab) yönetimi ───────────────────────── */
  function initTabs() {
    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.dataset.tab;
        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        tabPanels.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = document.getElementById('sb-panel-' + target);
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ── Accordion (Toplu İşlem) ────────────────────── */
  function initAccordion() {
    accordBtn.addEventListener('click', function () {
      accordBody.classList.toggle('open');
      accordBtn.textContent = accordBody.classList.contains('open')
        ? '▲  Toplu İşlem (CSV / Liste)'
        : '▼  Toplu İşlem (CSV / Liste)';
    });
  }

  /* ── Sahibinden.com veri çekme ──────────────────── */
  function fetchSahibinden() {
    var url = fUrl.value.trim();
    if (!url) {
      showStatus('warn', 'Lütfen bir URL girin.');
      return;
    }
    if (!url.startsWith('https://www.sahibinden.com/')) {
      showStatus('error', 'Geçerli bir sahibinden.com URL\'si girin.');
      return;
    }

    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Getiriliyor...';
    showStatus('', '');

    fetch('/sahibinden-fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Veriyi Getir →';

        if (!data.ok) {
          showStatus('error', data.error || 'Veri getirilemedi. Manuel giriş yapınız.');
          return;
        }

        /* Formları doldur */
        fModel.value = data.model || '';
        fYil.value   = data.yil   || '';
        fKm.value    = data.km    || '';
        setSelectValue(fYakit, data.yakit);
        setSelectValue(fVites, data.vites);
        if (data.fiyat) fPesin.value = data.fiyat.replace(/[^\d]/g, '');

        syncToCanvas();

        /* Görsel */
        if (data.imageUrl) applyImage('/image-proxy?url=' + encodeURIComponent(data.imageUrl));

        showStatus('ok', 'Veriler başarıyla getirildi. Alanları düzenleyebilirsiniz.');

        /* Manuel giriş sekmesine geç */
        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        tabPanels.forEach(function (p) { p.classList.remove('active'); });
        tabBtns[0].classList.add('active');
        document.getElementById('sb-panel-manuel').classList.add('active');
      })
      .catch(function (err) {
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Veriyi Getir →';
        showStatus('error', 'Sunucuya bağlanılamadı: ' + err.message);
      });
  }

  function showStatus(type, msg) {
    fetchStatus.className = 'sb-fetch-status';
    fetchStatus.textContent = msg;
    if (type) fetchStatus.classList.add(type);
  }

  function setSelectValue(sel, val) {
    if (!val) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value.toLowerCase() === val.toLowerCase()) {
        sel.selectedIndex = i;
        return;
      }
    }
  }

  /* ── CSV Parser ─────────────────────────────────── */
  function parseCSV(text) {
    /* BOM temizle */
    text = text.replace(/^\uFEFF/, '');
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 1) return [];

    var headers = splitCSVLine(lines[0]);
    var hasHeader = isNaN(parseInt(headers[1], 10)) ||
      headers[0].toLowerCase().indexOf('model') !== -1;

    var dataLines = hasHeader ? lines.slice(1) : lines;
    var cols = hasHeader ? headers : ['model','yil','km','yakit','vites','pesinat','pesin','imageUrl'];

    return dataLines.map(function (line) {
      var vals = splitCSVLine(line);
      var obj = {};
      cols.forEach(function (c, i) { obj[c.trim().toLowerCase()] = (vals[i] || '').trim(); });
      return obj;
    }).filter(function (o) { return o.model; });
  }

  function splitCSVLine(line) {
    var result = [];
    var cur = '';
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { result.push(cur); cur = ''; continue; }
      cur += c;
    }
    result.push(cur);
    return result;
  }

  /* ── Araç nesnesini canvas'a yaz ────────────────── */
  function applyVehicleToCanvas(v) {
    fModel.value   = v.model   || '';
    fYil.value     = v.yil     || '';
    fKm.value      = v.km      || '';
    setSelectValue(fYakit, v.yakit || 'Dizel');
    setSelectValue(fVites, v.vites || 'Manuel');
    fPesinat.value = v.pesinat ? String(v.pesinat).replace(/[^\d]/g, '') : '';
    fPesin.value   = v.pesin   ? String(v.pesin).replace(/[^\d]/g, '')  : '';
    syncToCanvas();
  }

  /* ── Görsel yüklenip yüklenmediğini bekle ───────── */
  function waitForImage(url) {
    return new Promise(function (resolve) {
      if (!url) { resolve(); return; }
      var proxyUrl = '/image-proxy?url=' + encodeURIComponent(url);
      cvImg.onload  = function () { cvImg.style.display = 'block'; cvPH.style.display = 'none'; resolve(); };
      cvImg.onerror = function () { cvImg.style.display = 'none'; cvPH.style.display = 'flex'; resolve(); };
      cvImg.src = proxyUrl;
    });
  }

  /* ── Tek PNG oluştur ve döndür ──────────────────── */
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
  function makeFilename(v) {
    var s = ((v.model || fModel.value) + '_' + (v.yil || fYil.value || ''))
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_ğüşöçıĞÜŞÖÇİ]/g, '')
      .slice(0, 60);
    return s + '_kredizmir.png';
  }

  /* ── Tek şablon oluştur (önizleme) ─────────────── */
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
        saveAs(blob, makeFilename({}));
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

  /* ── Toplu ZIP üretimi ───────────────────────────── */
  function downloadBatch() {
    var csvText = csvTextarea.value.trim();
    var vehicles = csvText ? parseCSV(csvText) : [];

    if (vehicles.length === 0) {
      alert('Lütfen CSV yükleyin veya araç listesi yapıştırın.');
      return;
    }

    if (typeof JSZip === 'undefined') {
      alert('JSZip yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
      return;
    }

    batchBtn.disabled = true;
    progressWrap.classList.add('active');
    var zip = new JSZip();
    var total = vehicles.length;
    var idx = 0;

    function processNext() {
      if (idx >= total) {
        progressText.textContent = total + ' / ' + total + ' tamamlandı. ZIP hazırlanıyor...';
        zip.generateAsync({ type: 'blob' }).then(function (blob) {
          saveAs(blob, 'kredizmir_sablonlar.zip');
          progressWrap.classList.remove('active');
          batchBtn.disabled = false;
          progressText.textContent = '0 / 0 oluşturuldu...';
          progressFill.style.width = '0%';
        });
        return;
      }

      var v = vehicles[idx];
      progressText.textContent = (idx + 1) + ' / ' + total + ' oluşturuluyor: ' + (v.model || '');
      progressFill.style.width = Math.round(((idx) / total) * 100) + '%';

      applyVehicleToCanvas(v);

      var imagePromise = v.imageurl
        ? waitForImage(v.imageurl)
        : Promise.resolve();

      imagePromise.then(function () {
        return new Promise(function (res) { setTimeout(res, 80); });
      }).then(function () {
        return renderToPNG();
      }).then(function (canvas) {
        return new Promise(function (res) {
          canvas.toBlob(function (blob) {
            zip.file(makeFilename(v), blob);
            res();
          }, 'image/png');
        });
      }).then(function () {
        idx++;
        setTimeout(processNext, 50);
      }).catch(function (err) {
        console.error('Batch hata (' + v.model + '):', err);
        idx++;
        setTimeout(processNext, 50);
      });
    }

    processNext();
  }

  /* ── CSV dosyası yüklenince textarea'ya yaz ─────── */
  function handleCSVFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      csvTextarea.value = e.target.result;
    };
    reader.readAsText(file, 'UTF-8');
  }

  /* ── Formu sıfırla ───────────────────────────────── */
  function resetForm() {
    fModel.value   = '';
    fYil.value     = '';
    fKm.value      = '';
    fYakit.selectedIndex = 0;
    fVites.selectedIndex = 0;
    fPesinat.value = '';
    fPesin.value   = '';
    fGorsel.value  = '';
    fUrl.value     = '';
    _imageDataUrl  = '';
    cvImg.src      = '';
    cvImg.style.display = 'none';
    cvPH.style.display  = 'flex';
    _previewReady  = false;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'PNG İndir (1080×1080)';
    syncToCanvas();
    showStatus('', '');
  }

  /* ── Tüm event dinleyicilerini bağla ────────────── */
  function bindEvents() {
    /* Form canlı önizleme */
    [fModel, fYil, fKm, fPesinat, fPesin].forEach(function (el) {
      el.addEventListener('input', syncToCanvas);
    });
    fYakit.addEventListener('change', syncToCanvas);
    fVites.addEventListener('change', syncToCanvas);

    /* Görsel dosya seçici */
    fGorsel.addEventListener('change', function () {
      handleImageFile(fGorsel.files[0]);
    });

    /* Sahibinden fetch */
    fetchBtn.addEventListener('click', fetchSahibinden);

    /* Accordion */
    initAccordion();

    /* Eylem butonları */
    generateBtn.addEventListener('click', generatePreview);
    downloadBtn.addEventListener('click', function () {
      if (!downloadBtn.disabled) downloadPNG();
    });
    resetBtn.addEventListener('click', resetForm);

    /* Batch */
    batchBtn.addEventListener('click', downloadBatch);
    csvFileInput.addEventListener('change', function () {
      handleCSVFile(csvFileInput.files[0]);
    });

    /* Ekran boyutu değişiminde ölçeği yenile */
    window.addEventListener('resize', applyScale);
  }

  /* ── İlk yükleme ─────────────────────────────────── */
  function init() {
    initTabs();
    bindEvents();
    syncToCanvas();
    applyScale();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
