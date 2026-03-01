# KREDİZMİR Web Platformu

Araç finansman danışmanlığı için statik site + Node.js backend.

## Proje Yapısı

```
├── index.html          Ana sayfa (hero + 3 sekme)
├── galeriler.html      Anlaşmalı galeriler + arama
├── hesaplama.html      Taksit hesaplama
├── analiz.html         Finansman Uygunluk Analizi (SPA)
├── css/style.css       Tüm stiller (kz- prefix, mobile-first)
├── js/
│   ├── eligibility.js  Uygunluk motoru (UMD)
│   ├── limitEngine.js  BDDK LTV + DSR (UMD)
│   ├── report.js       PDF rapor (jsPDF)
│   ├── analiz.js       SPA kontrolcüsü
│   ├── galeriler.js    Galeri render + arama
│   ├── hesaplama.js    Taksit hesaplama
│   └── main.js         Hamburger + sekme
├── data/
│   ├── data-galeriler.js  Galeri verisi
│   └── leads.json         Lead DB (otomatik)
├── server.js           Express backend
└── public/logo.png     ← Kendi logonuzu koyun
```

## Kurulum

```bash
npm install
node server.js          # http://localhost:3000
```

Sadece frontend kullanmak için server.js gerekmez.
analiz.html backend olmadan da çalışır (lead kaydı ve PDF upload hariç).

## API Endpoints

| Method | Endpoint  | Açıklama                        |
|--------|-----------|---------------------------------|
| POST   | /analyze  | Lead kaydeder                   |
| POST   | /upload   | Findeks PDF kaydeder            |
| GET    | /leads    | Tüm lead listesi (JSON)         |

## Uygunluk Motoru (eligibility.js)

Skor 0-100 — kullanıcıya gösterilmez, yalnızca kategori gösterilir.

- Ödeme performansı %30
- Borç/Limit oranı %25
- DSR %20
- Yasal geçmiş %15
- Peşinat oranı %10

Kategoriler: Yüksek (80+) / Orta (60+) / Düşük (40+) / Önce İyileştirme

## BDDK LTV Tablosu (limitEngine.js)

| Fiyat       | LTV |
|-------------|-----|
| 0 – 400k    | %70 |
| 400k – 800k | %50 |
| 800k – 1.2M | %30 |
| 1.2M – 2M   | %20 |
| 2M+         | Yok |

Araç yaşı x 12 + Vade süresi <= 144 ay kuralı uygulanır.

## Ücretsiz Yayınlama

**Sadece frontend** — Netlify veya GitHub Pages (sürükle-bırak)

**Frontend + Backend** — render.com ücretsiz tier:
- Build command: npm install
- Start command: node server.js

UYARI: /leads endpoint gerçek üretimde kimlik doğrulama ile korunmalıdır.
