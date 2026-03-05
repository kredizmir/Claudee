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

  window.kzAcGaleri = function (id) {
    var g = (window.KZ_GALERILER || []).find(function (x) { return x.id === id; });
    if (!g || !g.link || g.link === '#') return;
    window.open(g.link, '_blank', 'noopener,noreferrer');
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
