/* =========================================================
   KREDİZMİR — sticky-bar.js
   NEW: Sticky bottom "İlanı Gönder" bar
   Her sayfada include edilebilir; #kz-sticky-bar yoksa sessizce çıkar.
   ========================================================= */

(function () {
  'use strict';

  function initStickyBar() {
    var bar      = document.getElementById('kz-sticky-bar');
    if (!bar) return;

    var ilanInput = document.getElementById('kz-sb-ilan');
    var telInput  = document.getElementById('kz-sb-tel');
    var ilanErr   = document.getElementById('kz-sb-ilan-err');
    var telErr    = document.getElementById('kz-sb-tel-err');
    var btnHakan  = document.getElementById('kz-sb-hakan');
    var btnOguz   = document.getElementById('kz-sb-oguz');

    // Body padding-bottom = bar yüksekliği (içerik arkasında kalmasın)
    function syncPadding() {
      document.body.style.paddingBottom = bar.offsetHeight + 'px';
    }
    syncPadding();
    window.addEventListener('resize', syncPadding);

    function validate() {
      var ok = true;
      if (!ilanInput.value.trim()) {
        ilanErr.textContent = 'İlan linki veya no giriniz.';
        ok = false;
      } else {
        ilanErr.textContent = '';
      }
      if (!telInput.value.trim()) {
        telErr.textContent = 'Telefon giriniz.';
        ok = false;
      } else {
        telErr.textContent = '';
      }
      return ok;
    }

    function buildWaUrl(phone) {
      var ilan = ilanInput.value.trim();
      var tel  = telInput.value.trim();
      var msg  = 'Merhaba KREDİZMİR, ilan: ' + ilan + ' Telefonum: ' + tel;
      return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
    }

    btnHakan.addEventListener('click', function () {
      if (!validate()) return;
      window.open(buildWaUrl('905363972232'), '_blank', 'noopener,noreferrer');
    });

    btnOguz.addEventListener('click', function () {
      if (!validate()) return;
      window.open(buildWaUrl('905307258789'), '_blank', 'noopener,noreferrer');
    });

    ilanInput.addEventListener('input', function () { ilanErr.textContent = ''; });
    telInput.addEventListener('input',  function () { telErr.textContent  = ''; });
  }

  document.addEventListener('DOMContentLoaded', initStickyBar);
})();
