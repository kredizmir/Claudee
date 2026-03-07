/**
 * KREDİZMİR — Şablon Üretici
 * js/sablon.js
 *
 * Tüm client-side mantık: form yönetimi, canlı önizleme,
 * sahibinden.com fetch, PNG indirme, araç kuyruğu, toplu ZIP üretimi.
 */

(function () {
  'use strict';

  /* ── Durum ──────────────────────────────────────── */
  var _imageDataUrl = '';    // yüklü/getirilen görsel data URL veya proxy URL
  var _previewReady = false; // PNG indir butonunu etkinleştirme bayrağı
  var _queue = [];           // araç kuyruğu [{model,yil,km,yakit,vites,pesinat,pesin,imageUrl}]

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
  var fetchQueueBtn = document.getElementById('sb-fetch-queue-btn');
  var fetchStatus = document.getElementById('sb-fetch-status');
  var generateBtn = document.getElementById('sb-generate-btn');
  var downloadBtn = document.getElementById('sb-download-btn');
  var resetBtn    = document.getElementById('sb-reset-btn');
  var previewOuter = document.getElementById('sb-preview-outer');
  var previewWrap  = document.getElementById('sb-preview-wrap');

  /* Kuyruk elemanları */
  var queueAddBtn      = document.getElementById('sb-queue-add-btn');
  var queueClearBtn    = document.getElementById('sb-queue-clear-btn');
  var queueGenerateBtn = document.getElementById('sb-queue-generate-btn');
  var queueCountEl     = document.getElementById('sb-queue-count');
  var queueEmpty       = document.getElementById('sb-queue-empty');
  var queueTableWrap   = document.getElementById('sb-queue-table-wrap');
  var queueTbody       = document.getElementById('sb-queue-tbody');
  var zipProgress      = document.getElementById('sb-zip-progress');
  var zipProgressText  = document.getElementById('sb-zip-progress-text');
  var zipProgressFill  = document.getElementById('sb-zip-progress-fill');

  /* Çoklu URL elemanları */
  var multiUrls        = document.getElementById('sb-multi-urls');
  var multiPesinat     = document.getElementById('sb-multi-pesinat');
  var multiFetchBtn    = document.getElementById('sb-multi-fetch-btn');
  var multiStatus      = document.getElementById('sb-multi-status');
  var multiProgress    = document.getElementById('sb-multi-progress');
  var multiProgressText = document.getElementById('sb-multi-progress-text');
  var multiProgressFill = document.getElementById('sb-multi-progress-fill');

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

  /* ── Sahibinden.com veri çekme (tek URL) ────────── */
  function fetchSahibindenUrl(url) {
    return fetch('/sahibinden-fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    }).then(function (r) { return r.json(); });
  }

  function fetchSahibinden() {
    var url = fUrl.value.trim();
    if (!url) { showStatus('warn', 'Lütfen bir URL girin.'); return; }
    if (!url.startsWith('https://www.sahibinden.com/')) {
      showStatus('error', 'Geçerli bir sahibinden.com URL\'si girin.');
      return;
    }

    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Getiriliyor...';
    showStatus('', '');

    fetchSahibindenUrl(url)
      .then(function (data) {
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Önizlemeye Getir →';

        if (!data.ok) {
          showStatus('error', data.error || 'Veri getirilemedi. Manuel giriş yapınız.');
          return;
        }

        fillForm(data);
        syncToCanvas();
        if (data.imageUrl) applyImage('/image-proxy?url=' + encodeURIComponent(data.imageUrl));
        showStatus('ok', 'Veriler getirildi. Düzenleyip PNG indirebilirsiniz.');

        /* Manuel giriş sekmesine geç */
        switchTab('manuel');
      })
      .catch(function (err) {
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Önizlemeye Getir →';
        showStatus('error', 'Sunucuya bağlanılamadı: ' + err.message);
      });
  }

  /* URL'den çek → kuyruğa ekle */
  function fetchToQueue() {
    var url = fUrl.value.trim();
    if (!url) { showStatus('warn', 'Lütfen bir URL girin.'); return; }
    if (!url.startsWith('https://www.sahibinden.com/')) {
      showStatus('error', 'Geçerli bir sahibinden.com URL\'si girin.');
      return;
    }

    fetchQueueBtn.disabled = true;
    fetchQueueBtn.textContent = 'Getiriliyor...';

    fetchSahibindenUrl(url)
      .then(function (data) {
        fetchQueueBtn.disabled = false;
        fetchQueueBtn.textContent = 'Kuyruğa Ekle →';

        if (!data.ok) {
          showStatus('error', data.error || 'Veri getirilemedi.');
          return;
        }

        var v = {
          model: data.model || '',
          yil: data.yil || '',
          km: data.km || '',
          yakit: data.yakit || 'Dizel',
          vites: data.vites || 'Manuel',
          pesinat: '',
          pesin: data.fiyat ? data.fiyat.replace(/[^\d]/g, '') : '',
          imageUrl: data.imageUrl || ''
        };
        addToQueue(v);
        showStatus('ok', '"' + v.model + '" kuyruğa eklendi (' + _queue.length + ' araç).');
      })
      .catch(function (err) {
        fetchQueueBtn.disabled = false;
        fetchQueueBtn.textContent = 'Kuyruğa Ekle →';
        showStatus('error', 'Hata: ' + err.message);
      });
  }

  /* ── Çoklu URL çekme ────────────────────────────── */
  function fetchMultipleUrls() {
    var raw = multiUrls.value.trim();
    if (!raw) {
      setMultiStatus('warn', 'Lütfen en az bir URL girin.');
      return;
    }

    var urls = raw.split(/\r?\n/)
      .map(function (u) { return u.trim(); })
      .filter(function (u) { return u.startsWith('https://www.sahibinden.com/'); });

    if (urls.length === 0) {
      setMultiStatus('error', 'Geçerli sahibinden.com URL\'si bulunamadı.');
      return;
    }

    var globalPesinat = multiPesinat.value ? multiPesinat.value.replace(/[^\d]/g, '') : '';
    var total = urls.length;
    var idx = 0;
    var successCount = 0;

    multiFetchBtn.disabled = true;
    multiProgress.classList.add('active');
    setMultiStatus('', '');

    function processNext() {
      if (idx >= total) {
        multiFetchBtn.disabled = false;
        multiProgress.classList.remove('active');
        setMultiStatus('ok', total + ' URL işlendi, ' + successCount + ' araç kuyruğa eklendi.');
        return;
      }

      multiProgressText.textContent = (idx + 1) + ' / ' + total + ' çekiliyor...';
      multiProgressFill.style.width = Math.round((idx / total) * 100) + '%';

      fetchSahibindenUrl(urls[idx])
        .then(function (data) {
          if (data.ok) {
            var v = {
              model: data.model || '',
              yil: data.yil || '',
              km: data.km || '',
              yakit: data.yakit || 'Dizel',
              vites: data.vites || 'Manuel',
              pesinat: globalPesinat,
              pesin: data.fiyat ? data.fiyat.replace(/[^\d]/g, '') : '',
              imageUrl: data.imageUrl || ''
            };
            addToQueue(v);
            successCount++;
          }
        })
        .catch(function () { /* sessizce geç */ })
        .then(function () {
          idx++;
          setTimeout(processNext, 600); // sahibinden rate-limit için
        });
    }

    processNext();
  }

  function setMultiStatus(type, msg) {
    multiStatus.className = 'sb-multi-status';
    multiStatus.textContent = msg;
    if (type) multiStatus.classList.add(type);
    multiStatus.style.display = msg ? 'block' : 'none';
  }

  /* ── Kuyruk yönetimi ────────────────────────────── */
  function addToQueue(vehicle) {
    vehicle._id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    _queue.push(vehicle);
    renderQueue();
  }

  function removeFromQueue(id) {
    _queue = _queue.filter(function (v) { return v._id !== id; });
    renderQueue();
  }

  function clearQueue() {
    _queue = [];
    renderQueue();
  }

  function renderQueue() {
    var count = _queue.length;
    queueCountEl.textContent = count + ' araç';
    queueGenerateBtn.disabled = count === 0;

    if (count === 0) {
      queueEmpty.style.display = 'block';
      queueTableWrap.style.display = 'none';
    } else {
      queueEmpty.style.display = 'none';
      queueTableWrap.style.display = 'block';

      queueTbody.innerHTML = '';
      _queue.forEach(function (v, i) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + (i + 1) + '</td>' +
          '<td class="sb-queue-model">' + escHtml((v.model || '') + (v.yil ? ' ' + v.yil : '')) + '</td>' +
          '<td>' + escHtml(v.km || '-') + '</td>' +
          '<td>' + escHtml((v.yakit || '') + ' / ' + (v.vites || '')) + '</td>' +
          '<td>' + (v.pesinat ? formatMoney(v.pesinat) : '-') + '</td>' +
          '<td>' + (v.pesin   ? formatMoney(v.pesin)   : '-') + '</td>' +
          '<td><button class="sb-queue-del-btn" data-id="' + escHtml(v._id) + '">✕</button></td>';
        queueTbody.appendChild(tr);
      });

      /* Sil butonları */
      queueTbody.querySelectorAll('.sb-queue-del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          removeFromQueue(btn.dataset.id);
        });
      });
    }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Manuel kuyruğa ekle ────────────────────────── */
  function addManualToQueue() {
    var model = (fModel.value || '').trim();
    if (!model) { alert('Lütfen en azından araç modelini girin.'); return; }

    var v = {
      model: model,
      yil: (fYil.value || '').trim(),
      km: (fKm.value || '').trim(),
      yakit: fYakit.value || 'Dizel',
      vites: fVites.value || 'Manuel',
      pesinat: fPesinat.value ? fPesinat.value.replace(/[^\d]/g, '') : '',
      pesin: fPesin.value ? fPesin.value.replace(/[^\d]/g, '') : '',
      imageUrl: _imageDataUrl || ''
    };

    addToQueue(v);
    alert('"' + model + '" kuyruğa eklendi. (' + _queue.length + ' araç)');
  }

  /* ── Formu doldur ───────────────────────────────── */
  function fillForm(data) {
    fModel.value = data.model || '';
    fYil.value   = data.yil   || '';
    fKm.value    = data.km    || '';
    setSelectValue(fYakit, data.yakit);
    setSelectValue(fVites, data.vites);
    if (data.fiyat) fPesin.value = data.fiyat.replace(/[^\d]/g, '');
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

  function switchTab(tabName) {
    tabBtns.forEach(function (b) { b.classList.remove('active'); });
    tabPanels.forEach(function (p) { p.classList.remove('active'); });
    var btn = document.querySelector('[data-tab="' + tabName + '"]');
    var panel = document.getElementById('sb-panel-' + tabName);
    if (btn) btn.classList.add('active');
    if (panel) panel.classList.add('active');
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
      if (!url) {
        cvImg.style.display = 'none';
        cvPH.style.display  = 'flex';
        resolve();
        return;
      }

      /* data URL → direkt kullan */
      if (url.indexOf('data:') === 0) {
        cvImg.onload  = function () { cvImg.style.display = 'block'; cvPH.style.display = 'none'; resolve(); };
        cvImg.onerror = function () { cvImg.style.display = 'none';  cvPH.style.display = 'flex'; resolve(); };
        cvImg.src = url;
        return;
      }

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

  /* ── Kuyruktan toplu ZIP üretimi ─────────────────── */
  function downloadQueueAsZip() {
    if (_queue.length === 0) {
      alert('Kuyruk boş. Önce araç ekleyin.');
      return;
    }

    if (typeof JSZip === 'undefined') {
      alert('JSZip yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
      return;
    }

    queueGenerateBtn.disabled = true;
    zipProgress.classList.add('active');
    var zip = new JSZip();
    var total = _queue.length;
    var idx = 0;

    function processNext() {
      if (idx >= total) {
        zipProgressText.textContent = total + ' / ' + total + ' tamamlandı. ZIP hazırlanıyor...';
        zip.generateAsync({ type: 'blob' }).then(function (blob) {
          saveAs(blob, 'kredizmir_sablonlar.zip');
          zipProgress.classList.remove('active');
          queueGenerateBtn.disabled = false;
          zipProgressText.textContent = '0 / 0 oluşturuldu...';
          zipProgressFill.style.width = '0%';
        });
        return;
      }

      var v = _queue[idx];
      zipProgressText.textContent = (idx + 1) + ' / ' + total + ' oluşturuluyor: ' + (v.model || '');
      zipProgressFill.style.width = Math.round((idx / total) * 100) + '%';

      applyVehicleToCanvas(v);

      waitForImage(v.imageUrl || '')
        .then(function () {
          return new Promise(function (res) { setTimeout(res, 120); });
        })
        .then(function () {
          return renderToPNG();
        })
        .then(function (canvas) {
          return new Promise(function (res) {
            canvas.toBlob(function (blob) {
              zip.file(makeFilename(v), blob);
              res();
            }, 'image/png');
          });
        })
        .then(function () {
          idx++;
          setTimeout(processNext, 60);
        })
        .catch(function (err) {
          console.error('Batch hata (' + (v.model || '') + '):', err);
          idx++;
          setTimeout(processNext, 60);
        });
    }

    processNext();
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
    fetchQueueBtn.addEventListener('click', fetchToQueue);

    /* Çoklu URL */
    multiFetchBtn.addEventListener('click', fetchMultipleUrls);

    /* Eylem butonları */
    generateBtn.addEventListener('click', generatePreview);
    downloadBtn.addEventListener('click', function () {
      if (!downloadBtn.disabled) downloadPNG();
    });
    resetBtn.addEventListener('click', resetForm);

    /* Kuyruk */
    queueAddBtn.addEventListener('click', addManualToQueue);
    queueClearBtn.addEventListener('click', function () {
      if (_queue.length === 0 || confirm('Kuyruktaki tüm araçlar silinecek. Emin misiniz?')) {
        clearQueue();
      }
    });
    queueGenerateBtn.addEventListener('click', downloadQueueAsZip);

    /* Ekran boyutu değişiminde ölçeği yenile */
    window.addEventListener('resize', applyScale);
  }

  /* ── İlk yükleme ─────────────────────────────────── */
  function init() {
    initTabs();
    bindEvents();
    syncToCanvas();
    applyScale();
    renderQueue();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
