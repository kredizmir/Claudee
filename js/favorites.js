// NEW: Weekly Favorite Cars section
// NEW: Favorite car click -> "İlanı Bize İlet" popup with views social proof

(function () {
  'use strict';

  /* ---- Data ---- */
  var KZ_FAVORITES = [
    {
      title: 'Kia Rio',
      imageUrl: 'https://i.ibb.co/MkKt8JTF/aeeee81d-339d-46e7-a296-d09ccabc330e.jpg',
      listingUrl: null,
      listingNo: 'Kia Rio',
      views: 11240,
      km: '176.000 KM',
      fuel: 'Dizel',
      transmission: 'Manuel',
    },
    {
      title: 'VW Tiguan',
      imageUrl: 'https://i.ibb.co/v6bsr120/31678028-ce2d-4cd3-8ed1-9b5f45e68c51.jpg',
      listingUrl: null,
      listingNo: 'VW Tiguan',
      views: 14870,
      km: '235.000 KM',
      fuel: 'Benzin',
      transmission: 'Manuel',
    },
    {
      title: 'Peugeot 301',
      imageUrl: 'https://i.ibb.co/gZz8sV7B/af840fcc-74bd-430d-956e-b90bf7de6e18.jpg',
      listingUrl: null,
      listingNo: 'Peugeot 301',
      views: 9530,
      km: '201.000 KM',
      fuel: 'Dizel',
      transmission: 'Manuel',
    },
    {
      title: 'Hyundai Kona',
      imageUrl: 'https://i.ibb.co/TBc5Kxrc/05cb8afa-343d-4608-a0f2-a7ebf9328723.jpg',
      listingUrl: null,
      listingNo: 'Hyundai Kona',
      views: 18450,
      km: '180.000 KM',
      fuel: 'Dizel',
      transmission: 'Otomatik',
    },
    {
      title: 'Fiat Linea',
      imageUrl: 'https://i.ibb.co/0VvXCLsR/a8dcf86f-3ff6-4336-aed0-c38571f378dc.jpg',
      listingUrl: null,
      listingNo: 'Fiat Linea',
      views: 8190,
      km: '235.000 KM',
      fuel: 'Dizel',
      transmission: 'Manuel',
    },
  ];

  /* ---- Live view counter: her 3-7 saniyede +1 ile +4 arası artır ---- */
  function kzTickViews() {
    KZ_FAVORITES.forEach(function (car) {
      var bump = Math.floor(Math.random() * 9) + 2;
      car.views = Math.min(car.views + bump, 20000);
    });
    // popup açıksa sayacı güncelle
    if (favViewsCount && _currentCar) {
      favViewsCount.textContent = _currentCar.views.toLocaleString('tr-TR');
    }
    var next = 3000 + Math.floor(Math.random() * 4000);
    setTimeout(kzTickViews, next);
  }
  setTimeout(kzTickViews, 4000);

  /* ---- Render cards ---- */
  var grid = document.getElementById('kz-fav-grid');
  if (grid) {
    KZ_FAVORITES.forEach(function (car, idx) {
      var card = document.createElement('div');
      card.className = 'kz-fav-card' + (car.firsat ? ' kz-fav-card--firsat' : '');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', car.title + ' — ilanı bize ilet');

      var imgTag = car.imageUrl
        ? '<img src="' + car.imageUrl + '" alt="' + car.title + '" loading="lazy" onerror="this.style.display=\'none\'" />'
        : '';

      var pills = '';
      if (car.km)           pills += '<span class="kz-fav-pill">📍 ' + car.km + '</span>';
      if (car.fuel)         pills += '<span class="kz-fav-pill">⛽ ' + car.fuel + '</span>';
      if (car.transmission) pills += '<span class="kz-fav-pill">⚙️ ' + car.transmission + '</span>';

      card.innerHTML =
        (car.firsat ? '<div class="kz-fav-card__firsat-badge">Fırsat Aracı</div>' : '') +
        '<div class="kz-fav-card__thumb">' +
          imgTag +
          (car.imageUrl ? '' : '🚗') +
          '<div class="kz-fav-card__num">0' + (idx + 1) + '</div>' +
          '<div class="kz-fav-card__overlay-title">' + car.title + '</div>' +
        '</div>' +
        '<div class="kz-fav-card__body">' +
          (pills ? '<div class="kz-fav-card__meta">' + pills + '</div>' : '') +
          '<div class="kz-fav-card__cta-btn">İlanı Bize İlet &rarr;</div>' +
        '</div>';

      card.addEventListener('click', function () { kzOpenFavPopup(car); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kzOpenFavPopup(car); }
      });
      grid.appendChild(card);
    });
  }

  /* ---- Ticker ---- */
  var tickerTrack = document.getElementById('kz-ticker-track');
  if (tickerTrack && KZ_FAVORITES.length) {
    var tickerItems = KZ_FAVORITES.concat(KZ_FAVORITES);
    tickerTrack.innerHTML = tickerItems.map(function (car) {
      return '<div class="kz-ticker-item">' +
        (car.imageUrl
          ? '<img src="' + car.imageUrl + '" alt="' + car.title + '" loading="lazy" onerror="this.style.display=\'none\'">'
          : '<div style="height:80px;background:#132A4A;display:flex;align-items:center;justify-content:center;font-size:1.6rem;">🚗</div>'
        ) +
        '<div class="kz-ticker-item__info">' +
          '<div class="kz-ticker-item__title">' + car.title + '</div>' +
          (car.km ? '<div class="kz-ticker-item__km">📍 ' + car.km + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ---- Popup logic ---- */
  var _currentCar = null;
  var favModal     = document.getElementById('kz-fav-modal');
  var favClose     = document.getElementById('kz-fav-modal-close');
  var favViewsCount= document.getElementById('kz-fav-views-count');
  var favIlan      = document.getElementById('kz-fav-ilan');
  var favTel       = document.getElementById('kz-fav-tel');
  var favHakan     = document.getElementById('kz-fav-hakan');
  var favOguz      = document.getElementById('kz-fav-oguz');
  var favSee       = document.getElementById('kz-fav-see');
  var favIlanErr   = document.getElementById('kz-fav-ilan-err');
  var favTelErr    = document.getElementById('kz-fav-tel-err');

  function kzOpenFavPopup(car) {
    _currentCar = car;
    if (favViewsCount) favViewsCount.textContent = car.views.toLocaleString('tr-TR');
    if (favIlan) favIlan.value = car.listingUrl || car.listingNo || '';
    if (favTel)  favTel.value  = '';
    if (favIlanErr) favIlanErr.textContent = '';
    if (favTelErr)  favTelErr.textContent  = '';

    if (favSee) {
      if (car.listingUrl) {
        favSee.href = car.listingUrl;
        favSee.style.display = '';
      } else {
        favSee.style.display = 'none';
      }
    }

    if (favModal) {
      favModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (favTel) favTel.focus();
    }
  }

  function kzCloseFavPopup() {
    if (favModal) favModal.classList.remove('open');
    document.body.style.overflow = '';
    _currentCar = null;
  }

  function kzSendFav(phone) {
    if (!_currentCar) return;
    var ilanVal = favIlan ? favIlan.value.trim() : '';
    var telVal  = favTel  ? favTel.value.trim()  : '';
    var valid   = true;

    if (!ilanVal) {
      if (favIlanErr) favIlanErr.textContent = 'Lütfen ilan bilgisi girin.';
      valid = false;
    } else {
      if (favIlanErr) favIlanErr.textContent = '';
    }
    if (!telVal) {
      if (favTelErr) favTelErr.textContent = 'Lütfen telefon numaranızı girin.';
      valid = false;
    } else {
      if (favTelErr) favTelErr.textContent = '';
    }
    if (!valid) return;

    var msg = 'Merhaba KREDİZMİR, favori araç: ' + _currentCar.title +
              ' | ilan: ' + ilanVal +
              ' | Telefonum: ' + telVal;
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
  }

  /* ---- Event listeners ---- */
  if (favClose)  favClose.addEventListener('click', kzCloseFavPopup);
  if (favModal)  favModal.addEventListener('click', function (e) { if (e.target === favModal) kzCloseFavPopup(); });
  if (favHakan)  favHakan.addEventListener('click', function () { kzSendFav('905363972232'); });
  if (favOguz)   favOguz.addEventListener('click',  function () { kzSendFav('905307258789'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && favModal && favModal.classList.contains('open')) kzCloseFavPopup();
  });
})();
