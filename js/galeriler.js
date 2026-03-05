/* =========================================================
   KREDİZMİR — galeriler.js
   Galeri kartlarını render eder ve arama filtresi uygular.
   ========================================================= */

(function () {
  'use strict';

  var grid, searchInput, countEl;

  function renderKartlar(liste) {
    if (!grid) return;
    if (!liste || liste.length === 0) {
      grid.innerHTML = '<div class="kz-empty">Arama kriterinize uygun galeri bulunamadı.</div>';
      if (countEl) countEl.textContent = '0 galeri';
      return;
    }

    if (countEl) countEl.textContent = liste.length + ' galeri';

    grid.innerHTML = liste.map(function (g) {
      var etiketHTML = (g.etiket || []).map(function (e) {
        return '<span style="display:inline-block;background:rgba(0,194,255,0.1);border:1px solid rgba(0,194,255,0.2);border-radius:100px;padding:2px 10px;font-size:0.72rem;color:#00C2FF;margin-right:4px;">' + escHtml(e) + '</span>';
      }).join('');

      var guvenceliBadgeHTML = '';
      if (g.kredizmir) {
        var altEtiketHTML = (g.rozetler || []).map(function (r) {
          return '<span class="kz-guvenceli-etiket">' + escHtml(r) + '</span>';
        }).join('');
        guvenceliBadgeHTML = '<div class="kz-guvenceli-block">' +
          '<span class="kz-guvenceli-badge">★ KREDİZMİR Güvenceli</span>' +
          (altEtiketHTML ? '<div class="kz-guvenceli-alt">' + altEtiketHTML + '</div>' : '') +
          '</div>';
      }

      return [
        '<div class="kz-card" style="cursor:pointer;" onclick="kzAcGaleri(' + g.id + ')">',
        '  <div class="kz-card__badge">' + escHtml(g.sehir) + (g.ilce ? ' / ' + escHtml(g.ilce) : '') + '</div>',
        '  <div class="kz-card__title">' + escHtml(g.ad) + '</div>',
        guvenceliBadgeHTML,
        '  <div class="kz-card__desc">' + escHtml(g.aciklama || '') + '</div>',
        '  <div style="margin-bottom:16px;">' + etiketHTML + '</div>',
        '  <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:#00C2FF;font-weight:600;">',
        '    Galeriye Git <span style="font-size:1rem;">→</span>',
        '  </div>',
        '</div>',
      ].join('\n');
    }).join('\n');
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function filtrele(q) {
    if (!window.KZ_GALERILER) return [];
    q = (q || '').trim().toLowerCase();
    if (!q) return window.KZ_GALERILER;
    return window.KZ_GALERILER.filter(function (g) {
      return (
        g.ad.toLowerCase().includes(q) ||
        (g.sehir || '').toLowerCase().includes(q) ||
        (g.ilce || '').toLowerCase().includes(q) ||
        (g.aciklama || '').toLowerCase().includes(q) ||
        (g.etiket || []).some(function (e) { return e.toLowerCase().includes(q); })
      );
    });
  }

  var kzCountdownTimer = null;

  // Modal oluştur (bir kez)
  function modalOlustur() {
    if (document.getElementById('kz-redirect-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'kz-redirect-overlay';
    overlay.innerHTML = [
      '<div id="kz-redirect-modal">',
      '  <button class="kz-modal-kapat-btn" id="kz-modal-kapat-btn" aria-label="Kapat">✕</button>',
      '  <h2 class="kz-modal-baslik">Aracı satın almadan önce finans teklifinizi öğrenin.</h2>',
      '  <p class="kz-modal-alt-baslik">KREDİZMİR olarak o araç için</p>',
      '  <ul class="kz-modal-liste">',
      '    <li><span class="kz-modal-check">✔</span> size özel faiz oranı</li>',
      '    <li><span class="kz-modal-check">✔</span> uygun peşinat planı</li>',
      '    <li><span class="kz-modal-check">✔</span> aylık ödeme seçenekleri</li>',
      '  </ul>',
      '  <p class="kz-modal-extra">Araç motor yürüyen ve eksper durumu hakkında detaylı bilgi hazırlayalım.</p>',
      '  <p class="kz-modal-geri-sayim">Galeriye <span id="kz-sayim-sayi">10</span> saniye sonra yönlendirileceksiniz…</p>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);
    document.getElementById('kz-modal-kapat-btn').addEventListener('click', kzModalKapat);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) kzModalKapat();
    });
  }

  window.kzModalKapat = function () {
    if (kzCountdownTimer) { clearInterval(kzCountdownTimer); kzCountdownTimer = null; }
    var overlay = document.getElementById('kz-redirect-overlay');
    if (overlay) overlay.classList.remove('aktif');
  };

  window.kzAcGaleri = function (id) {
    var g = (window.KZ_GALERILER || []).find(function (x) { return x.id === id; });
    if (!g || !g.link || g.link === '#') return;
    modalOlustur();
    var overlay = document.getElementById('kz-redirect-overlay');
    overlay.classList.add('aktif');

    if (kzCountdownTimer) { clearInterval(kzCountdownTimer); kzCountdownTimer = null; }
    var kalan = 10;
    var sayiEl = document.getElementById('kz-sayim-sayi');
    if (sayiEl) sayiEl.textContent = kalan;

    kzCountdownTimer = setInterval(function () {
      kalan--;
      if (sayiEl) sayiEl.textContent = kalan;
      if (kalan <= 0) {
        clearInterval(kzCountdownTimer);
        kzCountdownTimer = null;
        kzModalKapat();
        window.open(g.link, '_blank', 'noopener,noreferrer');
      }
    }, 1000);
  };

  function init() {
    grid = document.getElementById('kz-galeri-grid');
    searchInput = document.getElementById('kz-galeri-search');
    countEl = document.getElementById('kz-galeri-count');

    if (!grid) return;

    if (!window.KZ_GALERILER || window.KZ_GALERILER.length === 0) {
      grid.innerHTML = '<div class="kz-empty">Yakında eklenecek galeriler burada listelenecek.</div>';
      return;
    }

    renderKartlar(window.KZ_GALERILER);

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        renderKartlar(filtrele(this.value));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
