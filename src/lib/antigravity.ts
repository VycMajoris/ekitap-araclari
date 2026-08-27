import { TURKISH_OCR_SYSTEM_PROMPT } from './openrouter';
import { AntigravityAuthData } from './types';

export const ANTIGRAVITY_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";

export const ANTIGRAVITY_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET ||
  "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";
export const ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog"
];

export interface AntigravityModelInfo {
  id: string;
  name: string;
  description?: string;
}

export const ANTIGRAVITY_MODELS: AntigravityModelInfo[] = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash Thinking (En Yeni & Hızlı)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Yüksek Kota)' },
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro (Gelişmiş Mantık)' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
  { id: 'antigravity-claude-opus-4-6-thinking', name: 'Claude Opus 4.6 Thinking (En Yüksek Kalite)' },
  { id: 'antigravity-claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];

export const GEMINI_API_MODELS: AntigravityModelInfo[] = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (En Yeni, En Yüksek Zeka & Hız - Önerilen)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Hızlı & Kararlı)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Büyük Belgeler İçin)' },
];

export async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { verifier, challenge };
}

export function getAntigravityAuthUrl(
  redirectUri: string,
  challenge: string,
  verifier: string,
  customClientId?: string
): string {
  void verifier;
  const clientId = customClientId || ANTIGRAVITY_CLIENT_ID;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: ANTIGRAVITY_SCOPES.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface CallAntigravityCorrectionParams {
  auth: AntigravityAuthData;
  model: string;
  content: string;
  temperature?: number;
  signal?: AbortSignal;
  customPrompt?: string;
  onTokenRefreshed?: (newAuth: AntigravityAuthData) => void;
}

export async function callAntigravityCorrection({
  auth,
  model,
  content,
  temperature = 0.1,
  signal,
  customPrompt,
  onTokenRefreshed,
}: CallAntigravityCorrectionParams): Promise<string> {
  const systemMessage = customPrompt || TURKISH_OCR_SYSTEM_PROMPT;
  let currentAuth = { ...auth };

  if (currentAuth.expiresAt && Date.now() >= currentAuth.expiresAt - 60000 && currentAuth.refreshToken) {
    try {
      const refreshRes = await fetch('/api/antigravity/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentAuth.refreshToken }),
        signal,
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.access_token) {
          currentAuth.accessToken = refreshData.access_token;
          currentAuth.expiresAt = Date.now() + (refreshData.expires_in || 3600) * 1000;
          if (refreshData.refresh_token) {
            currentAuth.refreshToken = refreshData.refresh_token;
          }
          onTokenRefreshed?.(currentAuth);
        }
      }
    } catch (err) {
      console.warn('Antigravity token refresh warning:', err);
    }
  }

  const maxRetries = 5;
  let delay = 2000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('İşlem kullanıcı tarafından durduruldu.', 'AbortError');
    }

    try {
      const response = await fetch('/api/antigravity/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentAuth.accessToken}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: content },
          ],
          temperature,
          project_id: currentAuth.projectId,
        }),
        signal,
      });

      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error('Antigravity istek limiti (Rate Limit) aşıldı.');
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.8, 20000);
        continue;
      }

      if (!response.ok) {
        let errMessage = '';
        try {
          const errorData = await response.json();
          errMessage = errorData?.error || errorData?.message || JSON.stringify(errorData);
        } catch {
          errMessage = await response.text().catch(() => '');
        }
        
        if (response.status === 401 && currentAuth.refreshToken) {
          // Force immediate token refresh on 401
          try {
            const refreshRes = await fetch('/api/antigravity/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: currentAuth.refreshToken }),
              signal,
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.access_token) {
                currentAuth.accessToken = refreshData.access_token;
                currentAuth.expiresAt = Date.now() + (refreshData.expires_in || 3600) * 1000;
                onTokenRefreshed?.(currentAuth);
                continue;
              }
            }
          } catch {}
        }

        if (attempt === maxRetries) {
          throw new Error(errMessage || `Antigravity API hatası (${response.status})`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.8, 15000);
        continue;
      }

      const data = await response.json();
      let result = data.choices?.[0]?.message?.content || data.content || data.text || '';

      result = result.trim();
      if (result.startsWith('```html')) {
        result = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      } else if (result.startsWith('```xml')) {
        result = result.replace(/^```xml\s*/i, '').replace(/```\s*$/i, '');
      } else if (result.startsWith('```')) {
        result = result.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      }

      return result.trim();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.8, 20000);
    }
  }

  throw new Error('Antigravity istek başarısız oldu.');
}

export interface CallGeminiApiCorrectionParams {
  apiKey: string;
  model: string;
  content: string;
  temperature?: number;
  signal?: AbortSignal;
  customPrompt?: string;
}

export async function callGeminiApiCorrection({
  apiKey,
  model,
  content,
  temperature = 0.1,
  signal,
  customPrompt,
}: CallGeminiApiCorrectionParams): Promise<string> {
  const systemMessage = customPrompt || TURKISH_OCR_SYSTEM_PROMPT;
  let activeModel = model;

  const maxRetries = 5;
  let delay = 2000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('İşlem kullanıcı tarafından durduruldu.', 'AbortError');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey.trim()}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemMessage }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: content }],
            },
          ],
          generationConfig: {
            temperature,
          },
        }),
        signal,
      });

      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error(
            'Google AI Studio ücretsiz istek limitiniz (429 - Kota Doldu) aşıldı. Fatura çıkmaz; kotanız dakikalık/günlük süre dolunca otomatik olarak tekrar açılacaktır.'
          );
        }
        // When Google hits 429 on free tier RPM limit, wait 15 seconds to let the 1-minute rate-limit bucket reset
        const quotaCooldown = attempt === 0 ? 8000 : 16000;
        await new Promise((resolve) => setTimeout(resolve, quotaCooldown));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const rawErr = errorData?.error?.message || `Gemini API hatası (Kod: ${response.status} ${response.statusText})`;
        
        // Handle High Demand (503 / overload) with automatic fallback to gemini-3.6-flash or gemini-2.0-flash
        const isHighDemand =
          response.status === 503 ||
          rawErr.toLowerCase().includes('high demand') ||
          rawErr.toLowerCase().includes('overloaded') ||
          rawErr.toLowerCase().includes('resource has been exhausted');

        if (isHighDemand && attempt < maxRetries) {
          if (activeModel === 'gemini-3.7-flash') {
            activeModel = 'gemini-3.6-flash';
          } else if (activeModel === 'gemini-3.6-flash') {
            activeModel = 'gemini-2.0-flash';
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 8000);
          continue;
        }

        throw new Error(rawErr);
      }

      const data = await response.json();
      let result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      result = result.trim();
      if (result.startsWith('```html')) {
        result = result.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      } else if (result.startsWith('```xml')) {
        result = result.replace(/^```xml\s*/i, '').replace(/```\s*$/i, '');
      } else if (result.startsWith('```')) {
        result = result.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      }

      return result.trim();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 10000);
    }
  }

  throw new Error('Gemini API isteği başarısız oldu.');
}
