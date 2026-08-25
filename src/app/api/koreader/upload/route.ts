import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let targetUrl = formData.get('targetUrl') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
    }

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'KOReader veya E-Okuyucu IP/URL adresi gereklidir (örn: http://192.168.1.50:8080).' },
        { status: 400 }
      );
    }

    targetUrl = targetUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `http://${targetUrl}`;
    }

    const fileName = file.name || 'kitap.epub';
    const fileBuffer = await file.arrayBuffer();

    const uploadFormData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/epub+zip' });
    uploadFormData.append('file', blob, fileName);

    let endpointsToTry = [targetUrl];
    if (!targetUrl.endsWith('/upload') && !targetUrl.endsWith('/')) {
      endpointsToTry = [`${targetUrl}/upload`, `${targetUrl}/`, targetUrl];
    }

    let lastError = '';
    let success = false;

    for (const endpoint of endpointsToTry) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: uploadFormData,
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          success = true;
          break;
        } else {
          lastError = `Cihaz ${res.status} yanıtı verdi (${res.statusText})`;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : 'Cihaza bağlanılamadı';
      }
    }

    if (!success) {
      return NextResponse.json(
        { error: `KOReader aktarımı başarısız oldu: ${lastError}. Cihazın açık ve Wi-Fi aktarımının aktif olduğunu doğrulayın.` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${fileName} başarıyla KOReader cihazınıza gönderildi.`,
    });
  } catch (error: unknown) {
    console.error('KOReader upload error:', error);
    const msg = error instanceof Error ? error.message : 'Aktarım sırasında hata oluştu.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
