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

  document.addEventListener('DOMContentLoaded', initTabs);
})();
