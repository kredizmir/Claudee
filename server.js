/**
 * KREDİZMİR — server.js
 * Minimal Express backend
 *
 * Endpoints:
 *   POST /analyze   → lead kaydeder, sonuç döner
 *   POST /upload    → Findeks PDF dosyası kaydeder
 *   GET  /leads     → tüm lead'leri JSON olarak döner
 *
 * Başlatmak için:
 *   npm install
 *   node server.js
 */

'use strict';

var express  = require('express');
var cors     = require('cors');
var multer   = require('multer');
var path     = require('path');
var fs       = require('fs');
var axios    = require('axios');
var cheerio  = require('cheerio');

var app  = express();
var PORT = process.env.PORT || 3000;

/* ============================================================
   MIDDLEWARE
   ============================================================ */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));  // static dosyalar

/* ============================================================
   YOLLAR
   ============================================================ */
var LEADS_FILE   = path.join(__dirname, 'data', 'leads.json');
var UPLOADS_DIR  = path.join(__dirname, 'uploads', 'findeks');

/* Dizin yoksa oluştur */
[path.join(__dirname, 'data'), UPLOADS_DIR].forEach(function (dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ============================================================
   MULTER — Findeks PDF
   ============================================================ */
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    var ts   = Date.now();
    var ext  = path.extname(file.originalname) || '.pdf';
    var safe = file.originalname
      .replace(/[^a-z0-9._-]/gi, '_')
      .slice(0, 60);
    cb(null, ts + '_' + safe);
  }
});

var upload = multer({
  storage : storage,
  limits  : { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Yalnızca PDF dosyaları kabul edilmektedir.'));
    }
  }
});

/* ============================================================
   YARDIMCI: LEADS OKU / YAZ
   ============================================================ */
function readLeads() {
  try {
    var raw = fs.readFileSync(LEADS_FILE, 'utf8');
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
}

function writeLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   POST /analyze
   Body: { category, vehiclePrice, income, dsr, recommendation, maxKredi }
   Yanıt: { id, createdAt, ...payload }
   ============================================================ */
app.post('/analyze', function (req, res) {
  try {
    var body = req.body || {};
    var lead = {
      id              : generateId(),
      createdAt       : new Date().toISOString(),
      category        : body.category        || '',
      vehiclePrice    : body.vehiclePrice    || 0,
      income          : body.income          || 0,
      dsr             : body.dsr             || 0,
      recommendation  : body.recommendation  || '',
      maxKredi        : body.maxKredi        || 0,
      findeksFilePath : body.findeksFilePath || null
    };

    var leads = readLeads();
    leads.push(lead);
    writeLeads(leads);

    res.status(201).json({ success: true, id: lead.id, createdAt: lead.createdAt });
  } catch (err) {
    console.error('POST /analyze hata:', err.message);
    res.status(500).json({ error: 'Lead kaydedilemedi.' });
  }
});

/* ============================================================
   POST /upload
   multipart/form-data; field: findeks (PDF)
   ============================================================ */
app.post('/upload', upload.single('findeks'), function (req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Dosya bulunamadı.' });
  }
  res.status(200).json({
    success  : true,
    filename : req.file.filename,
    size     : req.file.size,
    path     : req.file.path
  });
});

/* Multer hata handler */
app.use(function (err, req, res, next) {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

/* ============================================================
   GET /leads
   Tüm lead'leri JSON olarak döner.
   Gerçek üretimde bu endpoint kimlik doğrulama gerektirir!
   ============================================================ */
app.get('/leads', function (req, res) {
  try {
    var leads = readLeads();
    res.json({ total: leads.length, leads: leads });
  } catch (err) {
    res.status(500).json({ error: 'Lead listesi okunamadı.' });
  }
});

/* ============================================================
   POST /sahibinden-fetch
   Body: { url: "https://www.sahibinden.com/ilan/..." }
   Yanıt: { ok, model, yil, km, yakit, vites, fiyat, imageUrl }
   ============================================================ */
var SAHIBINDEN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
  'Referer': 'https://www.sahibinden.com/'
};

app.post('/sahibinden-fetch', function (req, res) {
  var url = (req.body && req.body.url) ? req.body.url.trim() : '';

  if (!url || !url.startsWith('https://www.sahibinden.com/')) {
    return res.status(400).json({ ok: false, error: 'Geçerli bir sahibinden.com URL\'si girin.' });
  }

  axios.get(url, { headers: SAHIBINDEN_HEADERS, timeout: 10000 })
    .then(function (response) {
      var $ = cheerio.load(response.data);

      /* --- Model: og:title öncelikli --- */
      var model = $('meta[property="og:title"]').attr('content') || '';
      if (!model) model = $('h1.classifiedDetailTitle').text().trim();
      model = model.replace(/\s*-\s*sahibinden\.com.*$/i, '').trim();

      /* --- Yıl (Yıl satırından) --- */
      var yil = '';
      $('dl.classifiedInfoList dt, .classified-info-list dt').each(function () {
        if ($(this).text().trim() === 'Yıl') {
          yil = $(this).next('dd').text().trim();
        }
      });

      /* --- KM --- */
      var km = '';
      $('dl.classifiedInfoList dt, .classified-info-list dt').each(function () {
        if ($(this).text().trim() === 'Kilometre') {
          km = $(this).next('dd').text().trim().replace(/\s+km/i, '');
        }
      });

      /* --- Yakıt Tipi --- */
      var yakit = '';
      $('dl.classifiedInfoList dt, .classified-info-list dt').each(function () {
        if ($(this).text().trim() === 'Yakıt Tipi') {
          yakit = $(this).next('dd').text().trim();
        }
      });

      /* --- Vites Tipi --- */
      var vites = '';
      $('dl.classifiedInfoList dt, .classified-info-list dt').each(function () {
        if ($(this).text().trim() === 'Vites Tipi') {
          vites = $(this).next('dd').text().trim();
        }
      });

      /* --- Fiyat --- */
      var fiyat = $('meta[property="product:price:amount"]').attr('content') || '';
      if (!fiyat) {
        fiyat = $('.classifiedPrice h3').first().text().trim().replace(/[^\d.]/g, '');
      }

      /* --- Görsel URL --- */
      var imageUrl = $('meta[property="og:image"]').attr('content') || '';
      if (!imageUrl) {
        imageUrl = $('img.classifiedDetailMainPhoto').first().attr('src') || '';
      }

      res.json({ ok: true, model: model, yil: yil, km: km, yakit: yakit, vites: vites, fiyat: fiyat, imageUrl: imageUrl });
    })
    .catch(function (err) {
      var blocked = err.response && (err.response.status === 403 || err.response.status === 429);
      console.error('sahibinden-fetch hata:', err.message);
      res.json({ ok: false, error: 'Sayfa getirilemedi. Manuel giriş yapınız.', blocked: blocked || false });
    });
});

/* ============================================================
   GET /image-proxy?url=...
   Dış domain resimlerini CORS ile proxy'le (html2canvas için)
   ============================================================ */
app.get('/image-proxy', function (req, res) {
  var imgUrl = req.query.url;
  if (!imgUrl) return res.status(400).send('url parametresi gerekli');

  axios.get(imgUrl, { responseType: 'stream', timeout: 10000, headers: { 'Referer': 'https://www.sahibinden.com/' } })
    .then(function (response) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      response.data.pipe(res);
    })
    .catch(function (err) {
      console.error('image-proxy hata:', err.message);
      res.status(502).send('Resim proxy hatası');
    });
});

/* ============================================================
   SUNUCUYU BAŞLAT
   ============================================================ */
app.listen(PORT, function () {
  console.log('\n  ✦  KREDİZMİR Server çalışıyor');
  console.log('  ✦  http://localhost:' + PORT);
  console.log('  ✦  Leads: ' + LEADS_FILE);
  console.log('  ✦  Uploads: ' + UPLOADS_DIR + '\n');
});

module.exports = app; // test için
