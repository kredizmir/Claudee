/* =========================================================
   KREDİZMİR — Galeri Veri Dosyası
   Her kayıt bir ortak galeriyi temsil eder.
   Yeni galeri eklemek için listeye obje ekleyin.
   ========================================================= */

const KZ_GALERILER = [
  {
    id: 1,
    ad: "FSS Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://fssotomotivv.sahibinden.com"
  },
  {
    id: 2,
    ad: "Temeller Auto",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://temellerauto.sahibinden.com"
  },
  {
    id: 3,
    ad: "Armağan Motors",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://armaganmotors.sahibinden.com"
  },
  {
    id: 4,
    ad: "İlboğa Motors",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://ilbogamotors.sahibinden.com"
  },
  {
    id: 5,
    ad: "VT Motors İzmir",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://vtmotorsizmir.sahibinden.com"
  },
  {
    id: 6,
    ad: "OPCAR Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://opcar.sahibinden.com"
  },
  {
    id: 7,
    ad: "Sefa Oto İzmir",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://sefaotoizmir.sahibinden.com"
  },
  {
    id: 8,
    ad: "Okyanus Oto İzmir",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://okyanusotoizmir.sahibinden.com"
  },
  {
    id: 9,
    ad: "İZPARK Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://umitauto35.sahibinden.com"
  },
  {
    id: 10,
    ad: "Galerix Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://galerix.sahibinden.com"
  },
  {
    id: 11,
    ad: "Danış Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://danisotomotivizmir.sahibinden.com"
  },
  {
    id: 12,
    ad: "Konuk Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://konukotomotivizmir.sahibinden.com"
  },
  {
    id: 13,
    ad: "Özerçetin Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://ercetinotomotiv1.sahibinden.com"
  },
  {
    id: 14,
    ad: "Dağlı Motors",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://daglimotors.sahibinden.com"
  },
  {
    id: 15,
    ad: "Beyefendi Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://beyefendiauto.sahibinden.com"
  },
  {
    id: 16,
    ad: "Fatih Auto",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://fatihauto.sahibinden.com"
  },
  {
    id: 17,
    ad: "YNY Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://ynyotomotiv.sahibinden.com"
  },
  {
    id: 18,
    ad: "AZM Otomotiv",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://azmotomotiv.sahibinden.com"
  },
  {
    id: 19,
    ad: "Özkoyuncu Oto İzmir",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://ozkoyuncuotoizmir.sahibinden.com"
  },
  {
    id: 20,
    ad: "Bayraktar Otomotiv İzmir",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://bayraktarotomotivizmir.sahibinden.com"
  },
  {
    id: 21,
    ad: "Kurşun Otomotiv İzmir",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://kursunotomotivizmir.sahibinden.com"
  },
  {
    id: 22,
    ad: "Ceylan Otomotiv 35",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://ceylanotomotiv35.sahibinden.com"
  },
  {
    id: 23,
    ad: "OtoNuSeç",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://otonusec.sahibinden.com"
  },
  {
    id: 24,
    ad: "Oto Bulut",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://otobulut.sahibinden.com"
  },
  {
    id: 25,
    ad: "Platin Oto",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://platinoto.sahibinden.com"
  },
  {
    id: 26,
    ad: "Karakaya Auto İzmir",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://karakayaautoizmir.sahibinden.com"
  },
  {
    id: 27,
    ad: "Bilge Oto",
    sehir: "İzmir",
    ilce: "",
    aciklama: "KREDİZMİR finansman desteğiyle hizmet veren güvenilir 2. el galeri.",
    etiket: ["2. El", "Sahibinden"],
    link: "https://bilgeoto.sahibinden.com"
  }
];
