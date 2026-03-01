/**
 * KREDİZMİR — galeriler.js
 * Renders KZ_GALERILER data into cards and handles live search filtering.
 * Depends on: data/data-galeriler.js (KZ_GALERILER array)
 */

(function () {
  'use strict';

  var grid    = document.getElementById('kzGalleryGrid');
  var search  = document.getElementById('kzSearch');
  var stats   = document.getElementById('kzStats');

  if (!grid || typeof KZ_GALERILER === 'undefined') return;

  /* ---- Helpers ---- */
  function formatCity(sehir, ilce) {
    return ilce ? sehir + ' / ' + ilce : sehir;
  }

  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
  }

  /* ---- Build a single card ---- */
  function buildCard(galeri) {
    var a = document.createElement('a');
    a.href   = galeri.link || '#';
    a.target = '_blank';
    a.rel    = 'noopener noreferrer';
    a.className = 'kz-gallery-card';
    a.setAttribute('role', 'listitem');
    a.setAttribute('aria-label', galeri.isim + ' – ' + galeri.sehir);

    a.innerHTML =
      '<div class="kz-gallery-card__head">' +
        '<span class="kz-gallery-card__city">' + galeri.sehir + '</span>' +
        '<div class="kz-gallery-card__name">' + galeri.isim + '</div>' +
        (galeri.ilce
          ? '<div class="kz-gallery-card__district">' + formatCity(galeri.sehir, galeri.ilce) + '</div>'
          : '') +
      '</div>' +
      '<div class="kz-gallery-card__body">' +
        '<p class="kz-gallery-card__desc">' + galeri.aciklama + '</p>' +
      '</div>' +
      '<div class="kz-gallery-card__footer">' +
        '<span class="kz-gallery-card__cta">Galerige Git <span aria-hidden="true">→</span></span>' +
      '</div>';

    return a;
  }

  /* ---- No-results placeholder ---- */
  function buildNoResults(query) {
    var div = document.createElement('div');
    div.className = 'kz-no-results';
    div.setAttribute('role', 'listitem');
    div.innerHTML =
      '<div class="kz-no-results__icon" aria-hidden="true">🔍</div>' +
      '<p class="kz-no-results__text">' +
        '"<strong>' + query + '</strong>" için sonuç bulunamadı.' +
      '</p>';
    return div;
  }

  /* ---- Render list (filtered) ---- */
  function render(query) {
    var q = normalize((query || '').trim());

    var filtered = q
      ? KZ_GALERILER.filter(function (g) {
          return (
            normalize(g.isim).indexOf(q) !== -1 ||
            normalize(g.sehir).indexOf(q) !== -1 ||
            (g.ilce && normalize(g.ilce).indexOf(q) !== -1)
          );
        })
      : KZ_GALERILER;

    // Update stats
    if (stats) {
      if (q) {
        stats.innerHTML =
          '<span>' + filtered.length + '</span> / ' +
          KZ_GALERILER.length + ' galeri gösteriliyor';
      } else {
        stats.innerHTML =
          'Toplam <span>' + KZ_GALERILER.length + '</span> anlaşmalı galeri';
      }
    }

    // Clear grid
    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.appendChild(buildNoResults(query));
    } else {
      filtered.forEach(function (g) {
        grid.appendChild(buildCard(g));
      });
    }
  }

  /* ---- Search input (debounced) ---- */
  if (search) {
    var debounceTimer;
    search.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        render(search.value);
      }, 200);
    });
  }

  /* ---- Initial render ---- */
  render('');

})();
