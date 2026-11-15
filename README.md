# ROI Game Hub

ID7 ekran oranı (1920 × 720) için web önizlemesi ve ID7/ID8 için OAP araç uygulaması.

## Web önizleme

`web-preview/index.html` dosyasını aç veya depo kökünde yerel sunucuyu çalıştır:

```sh
python3 -m http.server 8000
```

Ardından `http://localhost:8000/web-preview/` adresine git. Ana ekranda ← / → ile oyun seç,
Enter ile başlat. Tarayıcı gamepad’i ve dokunmatik giriş de desteklenir. Dokunmatikte bir kartı
seçmek için dokun, başlatmak için yeniden dokun. En iyi skorlar tarayıcıda saklanır. Tam ekran
için sağ üstteki düğmeyi kullan.

## Oyunlar

- **Şerit Yarışı** — sağ/sol şerit, yukarı turbo, bas duraklat.
- **Hedef Avcısı** — döndürerek nişan al, kumanda düğmesine basarak hedefi vur.
- **Tetris** — sağ/sol kaydır, yukarı çevir, aşağı hızla indir.
- **Pong / Breakout** — raketi hareket ettir, basarak topu başlat.
- **Yılan** — dört yönle yön seç, basarak duraklat.

`web-preview/` tarayıcı prototipidir. Araç uygulaması `mgu/` kaynaklarından paketlenir. Mac'e BMW
SDK'sı indirmek gerekmez; MGU Store kurulum sırasında SDK'yı araçtaki stok BMW uygulamasından
tamamlar. Bitbucket ve araç kurulum adımları için [yayın rehberine](docs/03-bitbucket-yayinlama.md) bak.

## MGU paketi üretme

Node.js 18+, Python 3.8+ ve Git gerekir. Hazır USB paketi ile Bitbucket kataloğunu üret:

```sh
npm run mgu:package
```

USB arşivi `dist/ROI-Game-Hub-MGU-0.1.0-USB.zip`, Bitbucket'a yüklenecek katalog ve bileşenler ise
`publish/mgu-repo/roi-game-hub/` altında oluşur. Üretim SDK'sızdır; araca kurulum yapmaz.

## Proje notları

- [Platform araştırması](docs/01-arastirma.md)
- [Ürün tanımı ve yol haritası](docs/02-yol-haritasi.md)
- [Bitbucket ve araç kurulumu](docs/03-bitbucket-yayinlama.md)
