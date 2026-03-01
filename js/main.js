/**
 * KREDİZMİR — main.js
 * Hamburger menu + Tab switching (index.html)
 */

(function () {
  'use strict';

  /* ---- Hamburger ---- */
  var hamburger   = document.getElementById('kzHamburger');
  var mobileNav   = document.getElementById('kzMobileNav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('kz-nav--open');
      hamburger.classList.toggle('kz-hamburger--open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close on nav link click
    mobileNav.querySelectorAll('.kz-nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('kz-nav--open');
        hamburger.classList.remove('kz-hamburger--open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('kz-nav--open');
        hamburger.classList.remove('kz-hamburger--open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Tabs (index.html hero) ---- */
  var tabsBar = document.querySelector('.kz-tabs__bar');
  if (!tabsBar) return;

  var tabBtns   = tabsBar.querySelectorAll('.kz-tabs__btn');
  var tabPanels = document.querySelectorAll('.kz-tab-panel');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.tab;

      // Buttons
      tabBtns.forEach(function (b) {
        b.classList.toggle('kz-tabs__btn--active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });

      // Panels
      tabPanels.forEach(function (panel) {
        var isActive = panel.id === 'tab-' + target;
        panel.classList.toggle('kz-tab-panel--active', isActive);
      });
    });
  });

})();
