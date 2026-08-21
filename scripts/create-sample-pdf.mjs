import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs';
import path from 'node:path';

async function createSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load standard system font with Turkish Unicode support
  const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
  const fontBoldPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';

  const fontBytes = fs.readFileSync(fontPath);
  const fontBoldBytes = fs.readFileSync(fontBoldPath);

  const customFont = await pdfDoc.embedFont(fontBytes);
  const customFontBold = await pdfDoc.embedFont(fontBoldBytes);

  pdfDoc.setTitle('Dünyalar Savaşı (Örnek Bozuk OCR PDF)');
  pdfDoc.setAuthor('H. G. Wells');
  pdfDoc.setProducer('EPUB OCR Fixer Test Generator');

  const pagesData = [
    {
      pageNum: 1,
      header: 'DÜNYALAR SAVAŞI - H. G. WELLS',
      heading: 'BÖLÜM 1: GELENLER',
      paragraphs: [
        'On dokuzuncu yüzyılın son yıllarında hiç kimseden yarm ne olacağı beklenmiyordu.',
        'Ve muhtemelen her ebeveynin farkına vardığı bir şeyi de anladım - her doğum, ne olursa olsun, bir Kut sal Doğum\'dur - Aile içi küçük bir Kutsal Doğum.',
        'Bu durum çok tuhaftır- ama yine de kamı aç olan öğmeciler yürümeye devam etti.',
        'Tarihi yapı- lamaz denilen surların arkasında garip bir clünya vardı.',
        'Onu bulamamıştım- sadece merak etmiştim.',
        'Gecenin bir yarısı gökyüzünde parıldayan yeşil alev küreleri hızla yaklaştı.',
      ],
      footer: '- 1 -',
    },
    {
      pageNum: 2,
      header: 'DÜNYALAR SAVAŞI - H. G. WELLS',
      heading: null,
      paragraphs: [
        'Sürekli geliş- tirme yaptıklarını söyleyen mühendisler, bumu kanayan askeri tedavi ettiler.',
        'Karamlık gecede imsanlar sokaklara döküldü. Araba geliyor- bitip gidecek sandılar.',
        'Tarnarn oldu ve zarnan akıp gitti. Yeni öğ- renci de onların yanına katıldı.',
        'Ona benzeyen- o kadındı ve fısıltıyla tehlikenin büyüklüğünden söz ediyordu.',
        'Kasabanın meydanında toplanan kalabalık, çukura doğru yaklaşmaktan çekiniyordu.',
      ],
      footer: '- 2 -',
    },
    {
      pageNum: 3,
      header: 'DÜNYALAR SAVAŞI - H. G. WELLS',
      heading: 'BÖLÜM 2: SİLİNDİR AÇILIYOR',
      paragraphs: [
        'Silindirin kapağı yavaşça dönmeye baş- ladı.',
        'Bunu anla- madım çünkü içinden yükselen ses çok derindi.',
        'Net hatırlayabiliyorum- sonunda kapak tamamen açıldı.',
        'İçeriden çıkan metalik kollar güneşte parıldarken herkes dehşetle geri çekildi.',
      ],
      footer: '- 3 -',
    },
  ];

  for (const pData of pagesData) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size: 595 x 842 pt
    const { width, height } = page.getSize();

    // 1. Running Header (top margin: y = 800)
    page.drawText(pData.header, {
      x: 60,
      y: height - 45,
      size: 9,
      font: customFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Header divider line
    page.drawLine({
      start: { x: 60, y: height - 52 },
      end: { x: width - 60, y: height - 52 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });

    let currentY = height - 90;

    // 2. Heading (if present)
    if (pData.heading) {
      page.drawText(pData.heading, {
        x: 60,
        y: currentY,
        size: 18,
        font: customFontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 40;
    }

    // 3. Paragraphs
    for (const para of pData.paragraphs) {
      page.drawText(para, {
        x: 60,
        y: currentY,
        size: 11.5,
        font: customFont,
        color: rgb(0.15, 0.15, 0.15),
        maxWidth: width - 120,
        lineHeight: 18,
      });

      // Calculate approximate paragraph vertical span
      const lines = Math.ceil((para.length * 7) / (width - 120)) || 1;
      currentY -= lines * 18 + 14;
    }

    // 4. Running Footer (bottom margin: y = 40)
    const footerText = pData.footer;
    const footerWidth = customFont.widthOfTextAtSize(footerText, 10);
    page.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: 40,
      size: 10,
      font: customFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const pdfBytes = await pdfDoc.save();

  const publicOutPath = path.resolve('public/ornek-bozuk-turkce.pdf');
  const rootOutPath = path.resolve('ornek-bozuk-turkce.pdf');

  fs.writeFileSync(publicOutPath, pdfBytes);
  fs.writeFileSync(rootOutPath, pdfBytes);

  console.log(`Sample PDF created successfully!`);
  console.log(`Output 1: ${publicOutPath} (${pdfBytes.length} bytes)`);
  console.log(`Output 2: ${rootOutPath} (${pdfBytes.length} bytes)`);
}

createSamplePdf().catch((err) => {
  console.error('Error creating sample PDF:', err);
  process.exit(1);
});
