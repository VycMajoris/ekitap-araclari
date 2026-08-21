import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

async function createSampleEpub() {
  const zip = new JSZip();

  // 1. mimetype (STORE)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. OEBPS/content.opf
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Örnek Bozuk Türkçe Kitap (OCR Hatalı)</dc:title>
    <dc:creator>Test Yazar</dc:creator>
    <dc:language>tr</dc:language>
    <dc:identifier id="BookID">urn:uuid:12345-test-epub</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
  </spine>
</package>`
  );

  // 4. OEBPS/toc.ncx
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345-test-epub"/>
  </head>
  <docTitle><text>Örnek Bozuk Türkçe Kitap</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>Bölüm 1: Yolculuk</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-2" playOrder="2">
      <navLabel><text>Bölüm 2: Öğrenciler</text></navLabel>
      <content src="chapter2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`
  );

  // 5. Chapter 1 with realistic OCR errors
  zip.file(
    'OEBPS/chapter1.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Bölüm 1: Yolculuk Başlıyor</title>
</head>
<body>
  <h1>Bölüm 1: Yolculuk Başlıyor</h1>
  <p>Yarm sabah erkenden yola çıkacağız. Tren saat sekizde kalkacak ve claha hızlı gitmemiz gerekecek.</p>
  <p>Ahmet&apos;in kamı çok açtı, bu yüzden bir an önce bir şeyler yemek istedi. Yolculuk boyunca hiçbir şey yememişti.</p>
  <p>Kasabanın girişinde durduk. Burası eski çağlardan kal- ma bir kaleydi ve tarihi yapı- lamaz denilen surlarla çevriliydi.</p>
  <p>Somaki gün hava claha da güzelleşti. Güneş dağların ardından doğarken herkes hazırdı.</p>
</body>
</html>`
  );

  // 6. Chapter 2 with realistic OCR errors
  zip.file(
    'OEBPS/chapter2.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Bölüm 2: Üniversite Yılları</title>
</head>
<body>
  <h1>Bölüm 2: Üniversite Yılları</h1>
  <p>Üniversiteye yeni başlayan her öğmeci gibi o da büyük bir heyecan içindeydi.</p>
  <p>Kütüphanede saatlerce çalışır, clil ve edebiyat kitaplarını incelerdi. Bir çok konuda araştırma yapıyordu.</p>
  <p>Hocası ona soma dönüp baktı ve &ldquo;Yarm yapacağımız sınav çok önemli,&rdquo; cliyle uyardı.</p>
  <p>Her hangi bir aksilik çıkmaması için erkenden uyumaya karar verdi.</p>
</body>
</html>`
  );

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const outputDir = path.resolve('public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'ornek-bozuk-turkce.epub');
  fs.writeFileSync(outputPath, buffer);
  console.log('Sample EPUB created at:', outputPath);
}

createSampleEpub();
