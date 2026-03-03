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
  });
})();
