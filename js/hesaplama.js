/**
 * KREDİZMİR — hesaplama.js
 * Taksit hesaplama aracı.
 * Formül: P * r * (1+r)^n / ((1+r)^n - 1)
 *   P = kredi tutarı (araç fiyatı - peşinat)
 *   r = aylık faiz oranı (% / 100)
 *   n = vade (ay)
 */

(function () {
  'use strict';

  /* ---- Elements ---- */
  var form       = document.getElementById('kzCalcForm');
  var modeSelector = document.getElementById('kzModeSelector');
  var djsNote    = document.getElementById('kzDjsNote');
  var resultEmpty = document.getElementById('kzResultEmpty');
  var resultCard  = document.getElementById('kzResultCard');

  var inpFiyat   = document.getElementById('kzAracFiyat');
  var inpPesinat = document.getElementById('kzPesinat');
  var selVade    = document.getElementById('kzVade');
  var inpOran    = document.getElementById('kzAylikOran');

  var outMonthly = document.getElementById('kzMonthlyAmt');
  var outFiyat   = document.getElementById('kzResFiyat');
  var outPesinat = document.getElementById('kzResPesinat');
  var outKredi   = document.getElementById('kzResKredi');
  var outVade    = document.getElementById('kzResVade');
  var outOran    = document.getElementById('kzResOran');
  var outToplam  = document.getElementById('kzResToplam');

  if (!form) return;

  var currentMode = 'vergi';

  /* ---- Number formatter ---- */
  var formatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  function fmt(val) {
    return '₺\u202F' + formatter.format(val);
  }

  /* ---- Mode selector ---- */
  if (modeSelector) {
    modeSelector.querySelectorAll('.kz-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentMode = btn.dataset.mode;

        modeSelector.querySelectorAll('.kz-mode-btn').forEach(function (b) {
          b.classList.toggle('kz-mode-btn--active', b === btn);
        });

        // Show DJS note only in DJS mode
        if (djsNote) {
          djsNote.classList.toggle('kz-djs-rate-note--visible', currentMode === 'djs');
        }
      });
    });
  }

  /* ---- Calculate ---- */
  function calcMonthly(principal, monthlyRate, term) {
    if (principal <= 0) return 0;
    if (monthlyRate === 0) return principal / term;
    var r  = monthlyRate;
    var n  = term;
    var pn = Math.pow(1 + r, n);
    return principal * r * pn / (pn - 1);
  }

  /* ---- Validate inputs ---- */
  function validate(fiyat, pesinat, vade, oran) {
    if (!fiyat || fiyat <= 0) {
      alert('Lütfen geçerli bir araç fiyatı girin.');
      inpFiyat.focus();
      return false;
    }
    if (pesinat < 0) {
      alert('Peşinat negatif olamaz.');
      inpPesinat.focus();
      return false;
    }
    if (pesinat >= fiyat) {
      alert('Peşinat, araç fiyatından büyük olamaz.');
      inpPesinat.focus();
      return false;
    }
    if (!vade || vade <= 0) {
      alert('Lütfen geçerli bir vade seçin.');
      return false;
    }
    if (oran < 0 || oran > 100) {
      alert('Aylık oran 0 ile 100 arasında olmalıdır.');
      inpOran.focus();
      return false;
    }
    return true;
  }

  /* ---- Form submit ---- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var fiyat   = parseFloat(inpFiyat.value)   || 0;
    var pesinat = parseFloat(inpPesinat.value)  || 0;
    var vade    = parseInt(selVade.value, 10)   || 36;
    var oran    = parseFloat(inpOran.value)     || 0;

    if (!validate(fiyat, pesinat, vade, oran)) return;

    var principal   = fiyat - pesinat;
    var monthlyRate = oran / 100;
    var monthly     = calcMonthly(principal, monthlyRate, vade);
    var toplam      = monthly * vade + pesinat;

    // Populate result
    outMonthly.textContent = formatter.format(Math.round(monthly));
    outFiyat.textContent   = fmt(fiyat);
    outPesinat.textContent = fmt(pesinat);
    outKredi.textContent   = fmt(principal);
    outVade.textContent    = vade + ' Ay';
    outOran.textContent    = '%' + oran.toFixed(2).replace('.', ',');
    outToplam.textContent  = fmt(Math.round(toplam));

    // Show result
    resultEmpty.hidden = true;
    resultCard.hidden  = false;

    // Scroll result into view on mobile
    if (window.innerWidth < 900) {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  /* ---- Reset result when inputs change ---- */
  [inpFiyat, inpPesinat, selVade, inpOran].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      resultEmpty.hidden = false;
      resultCard.hidden  = true;
    });
  });

})();
