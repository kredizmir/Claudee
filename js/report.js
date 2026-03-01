/**
 * KREDİZMİR — report.js
 * Browser-side PDF rapor üretimi (jsPDF CDN)
 *
 * Bağımlılık: window.jspdf (CDN'den yüklenir, analiz.html içinde)
 * Fonksiyon: KzReport.generate(payload) → PDF indirir
 */

var KzReport = (function () {
  'use strict';

  /* ---- Para formatlayıcı ---- */
  function fmtTL(val) {
    if (!val && val !== 0) return '—';
    return '₺ ' + Number(Math.round(val)).toLocaleString('tr-TR');
  }

  function fmtPct(val) {
    if (!val && val !== 0) return '—';
    return '%' + (val * 100).toFixed(1).replace('.', ',');
  }

  /* ---- Kategori rengi (hex) ---- */
  var CAT_COLORS = {
    'yuksek'          : [34, 197, 94],
    'orta'            : [245, 158, 11],
    'dusuk'           : [249, 115, 22],
    'onceIyilestirme' : [239, 68, 68],
    'eksikBilgi'      : [156, 163, 175]
  };

  /* ----  ----
     payload: {
       form     : { ... form verileri },
       analysis : { category, categoryInfo, reasons, improvement },
       limit    : { maxKredi, minKredi, defaultTerm, channel, ltv, krediYok },
       date     : string
     }
  ---- */
  function generate(payload) {
    if (typeof window === 'undefined' || !window.jspdf) {
      console.error('jsPDF yüklü değil.');
      return;
    }

    var jsPDF   = window.jspdf.jsPDF;
    var doc     = new jsPDF({ unit: 'mm', format: 'a4' });
    var W       = doc.internal.pageSize.getWidth();
    var margin  = 16;
    var col     = margin;
    var y       = 0;

    var catKey   = payload.analysis.category;
    var catLabel = payload.analysis.categoryInfo
      ? payload.analysis.categoryInfo.label
      : catKey;
    var catRGB   = CAT_COLORS[catKey] || [156, 163, 175];

    /* ============================================================
       HEADER — koyu lacivert şerit
       ============================================================ */
    doc.setFillColor(10, 26, 47);
    doc.rect(0, 0, W, 28, 'F');

    /* Logo metni */
    doc.setTextColor(0, 194, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('KREDİZMİR', margin, 13);

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Finansman Uygunluk Analiz Raporu', margin, 20);

    /* Tarih — sağ üst */
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text(payload.date || new Date().toLocaleDateString('tr-TR'), W - margin, 13, { align: 'right' });

    y = 34;

    /* ============================================================
       UYGUNLUK KATEGORİSİ — renkli banner
       ============================================================ */
    doc.setFillColor(catRGB[0], catRGB[1], catRGB[2]);
    doc.roundedRect(margin, y, W - margin * 2, 16, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Uygunluk Kategorisi: ' + catLabel, W / 2, y + 10, { align: 'center' });

    y += 22;

    /* ============================================================
       GEREKÇELER
       ============================================================ */
    doc.setTextColor(30, 58, 90);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Temel Gerekçeler', margin, y);
    y += 5;

    doc.setDrawColor(0, 194, 255);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 80);
    var reasons = payload.analysis.reasons || [];
    reasons.forEach(function (r, i) {
      var lines = doc.splitTextToSize((i + 1) + '. ' + r, W - margin * 2 - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 5 + 2;
    });

    y += 4;

    /* ============================================================
       FİNANSMAN ARALIĞI
       ============================================================ */
    doc.setTextColor(30, 58, 90);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Finansman Bilgileri', margin, y);
    y += 5;
    doc.setDrawColor(0, 194, 255);
    doc.line(margin, y, W - margin, y);
    y += 6;

    var lim = payload.limit || {};
    var rows = [
      ['BDDK LTV Oranı',      lim.krediYok ? 'Kredi Kullanılamaz' : fmtPct(lim.ltv)],
      ['Tahmini Azami Kredi', lim.krediYok ? '—' : fmtTL(lim.maxKredi)],
      ['Tahmini Asgari Kredi',lim.krediYok ? '—' : fmtTL(lim.minKredi)],
      ['Tahmini Aylık Taksit',lim.krediYok ? '—' : fmtTL(lim.estimatedPayment)],
      ['Azami Vade',          lim.maxTerm  ? lim.maxTerm + ' Ay'  : '—'],
      ['Önerilen Kanal',      lim.channel  || '—']
    ];

    doc.setFontSize(9);
    rows.forEach(function (row) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(70, 70, 100);
      doc.text(row[0] + ':', margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(10, 26, 47);
      doc.text(row[1], margin + 65, y);
      y += 6;
    });

    y += 4;

    /* ============================================================
       İYİLEŞTİRME PLANI
       ============================================================ */
    doc.setTextColor(30, 58, 90);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('İyileştirme Planı', margin, y);
    y += 5;
    doc.setDrawColor(0, 194, 255);
    doc.line(margin, y, W - margin, y);
    y += 6;

    var imp = payload.analysis.improvement || {};
    var impRows = [
      ['7 Gün',  imp.gun7  || ''],
      ['30 Gün', imp.gun30 || ''],
      ['90 Gün', imp.gun90 || '']
    ];

    impRows.forEach(function (row) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 194, 255);
      doc.text(row[0] + ':', margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 80);
      var lines = doc.splitTextToSize(row[1], W - margin * 2 - 22);
      doc.text(lines, margin + 22, y);
      y += lines.length * 5 + 3;
    });

    y += 4;

    /* ============================================================
       GİRİŞ BİLGİLERİ
       ============================================================ */
    doc.setTextColor(30, 58, 90);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Analiz Girdileri', margin, y);
    y += 5;
    doc.setDrawColor(0, 194, 255);
    doc.line(margin, y, W - margin, y);
    y += 6;

    var f = payload.form || {};
    var inputRows = [
      ['Araç Fiyatı',          fmtTL(f.aracFiyat)],
      ['Peşinat',              fmtTL(f.pesinat)],
      ['Araç Yılı',            f.aracYili || '—'],
      ['Net Aylık Gelir',      fmtTL(f.gelir)],
      ['Mevcut Ödeme Yükü',    fmtTL(f.odemeYuku)],
      ['Kart/KMH Limit',       fmtTL(f.limit)],
      ['Kart/KMH Borç',        fmtTL(f.borc)],
      ['Son 12 Ay Gecikme',    f.gecikme || '—'],
      ['Yasal Durum',          f.yasal   || '—']
    ];

    doc.setFontSize(8.5);
    inputRows.forEach(function (row) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(70, 70, 100);
      doc.text(row[0] + ':', margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(10, 26, 47);
      doc.text(String(row[1]), margin + 60, y);
      y += 5.5;
    });

    /* ============================================================
       FOOTER — yasal uyarı
       ============================================================ */
    var pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(10, 26, 47);
    doc.rect(0, pageH - 18, W, 18, 'F');

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    var disclaimer = 'Bu çalışma bilgilendirme amaçlıdır; hiçbir banka adına kredi taahhüdü içermez. ' +
      'Findeks/KKB skoru hesaplanmamıştır. KREDİZMİR © ' + new Date().getFullYear();
    var dLines = doc.splitTextToSize(disclaimer, W - margin * 2);
    doc.text(dLines, W / 2, pageH - 11, { align: 'center' });

    /* ============================================================
       KAYDET
       ============================================================ */
    var fileName = 'KREDİZMİR_Analiz_' +
      new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(fileName);
  }

  return { generate: generate };

})();
