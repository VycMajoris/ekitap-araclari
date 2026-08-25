import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kindleEmail = formData.get('kindleEmail') as string | null;
    const provider = (formData.get('provider') as string) || 'smtp';

    if (!file) {
      return NextResponse.json({ error: 'EPUB dosyası bulunamadı.' }, { status: 400 });
    }

    if (!kindleEmail || !kindleEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Geçerli bir Kindle e-posta adresi belirtilmelidir (örn: adiniz@kindle.com).' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || 'kitap.epub';

    if (provider === 'resend') {
      const resendApiKey = formData.get('resendApiKey') as string | null;
      const fromEmail = (formData.get('fromEmail') as string | null) || 'onboarding@resend.dev';

      if (!resendApiKey) {
        return NextResponse.json(
          { error: 'Resend API anahtarı gereklidir.' },
          { status: 400 }
        );
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey.trim()}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [kindleEmail.trim()],
          subject: fileName.replace(/\.epub$/i, ''),
          text: 'eKitap Araçları ile dönüştürülen ve düzenlenen EPUB kitabı ektedir.',
          attachments: [
            {
              filename: fileName,
              content: fileBuffer.toString('base64'),
            },
          ],
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json().catch(() => ({}));
        throw new Error(errorData?.message || `Resend e-posta gönderimi başarısız oldu (${resendResponse.status})`);
      }

      return NextResponse.json({
        success: true,
        message: `${fileName} başarıyla ${kindleEmail} adresine iletildi.`,
      });
    }

    const host = formData.get('host') as string | null;
    const portStr = formData.get('port') as string | null;
    const user = formData.get('user') as string | null;
    const pass = formData.get('pass') as string | null;
    const secure = formData.get('secure') === 'true' || portStr === '465';

    if (!host || !user || !pass) {
      return NextResponse.json(
        { error: 'SMTP sunucusu, kullanıcı adı (e-posta) ve şifre bilgileri gereklidir.' },
        { status: 400 }
      );
    }

    const port = portStr ? parseInt(portStr, 10) : secure ? 465 : 587;

    const transporter = nodemailer.createTransport({
      host: host.trim(),
      port,
      secure,
      auth: {
        user: user.trim(),
        pass: pass.trim(),
      },
    });

    await transporter.sendMail({
      from: `"${user.split('@')[0]}" <${user.trim()}>`,
      to: kindleEmail.trim(),
      subject: fileName.replace(/\.epub$/i, ''),
      text: 'eKitap Araçları ile dönüştürülen ve düzenlenen EPUB kitabı ektedir.',
      attachments: [
        {
          filename: fileName,
          content: fileBuffer,
          contentType: 'application/epub+zip',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `${fileName} başarıyla ${kindleEmail} adresine gönderildi.`,
    });
  } catch (error: unknown) {
    console.error('Send to Kindle error:', error);
    const msg = error instanceof Error ? error.message : 'E-posta gönderilirken bilinmeyen bir hata oluştu.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
