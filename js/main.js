/* =========================================================
   KREDİZMİR — main.js
   Sekme (tab) geçiş mantığı — index.html için
   ========================================================= */

(function () {
  'use strict';

  function initTabs() {
    const tabs = document.querySelectorAll('.kz-tab[data-tab]');
    const panels = document.querySelectorAll('.kz-tab-panel[data-panel]');

    if (!tabs.length || !panels.length) return;

    function activateTab(id) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === id));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === id));
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        activateTab(this.dataset.tab);
      });
    });

    // İlk sekmeyi aç
    if (tabs[0]) activateTab(tabs[0].dataset.tab);
  }

  // NEW: One-click offer form — WhatsApp yönlendirme
  function initOfferForm() {
    var ilanInput = document.getElementById('kz-offer-ilan');
    var telInput  = document.getElementById('kz-offer-tel');
    var ilanErr   = document.getElementById('kz-offer-ilan-err');
    var telErr    = document.getElementById('kz-offer-tel-err');
    var btnHakan  = document.getElementById('kz-offer-hakan');
    var btnOguz   = document.getElementById('kz-offer-oguz');

    if (!ilanInput || !btnHakan || !btnOguz) return;

    function validate() {
      var ok = true;
      var ilan = ilanInput.value.trim();
      var tel  = telInput.value.trim();

      if (!ilan) {
        ilanErr.textContent = 'Lütfen ilan linki veya ilan numarası girin.';
        ok = false;
      } else {
        ilanErr.textContent = '';
      }

      if (!tel) {
        telErr.textContent = 'Lütfen telefon numaranızı girin.';
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
      window.open(buildWaUrl('905363972232'), '_blank', 'noopener');
    });

    btnOguz.addEventListener('click', function () {
      if (!validate()) return;
      window.open(buildWaUrl('905307258789'), '_blank', 'noopener');
    });

    // Hata mesajını sil kullanıcı yazmaya başlayınca
    ilanInput.addEventListener('input', function () { ilanErr.textContent = ''; });
    telInput.addEventListener('input',  function () { telErr.textContent  = ''; });
  }

  function initGalleryModal() {
    var btn     = document.getElementById('kz-gallery-btn');
    var modal   = document.getElementById('kz-gallery-modal');
    var closeX  = document.getElementById('kz-modal-close');
    var dismiss = document.getElementById('kz-modal-dismiss');

    if (!btn || !modal) return;

    function openModal(e) {
      e.preventDefault();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', openModal);
    closeX.addEventListener('click', closeModal);
    dismiss.addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initGalleryModal();
    initOfferForm();
  });
})();
