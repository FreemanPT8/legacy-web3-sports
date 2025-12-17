import { NextRequest, NextResponse } from 'next/server';

type TranslateBody = {
  text?: string;
  sourceLang?: string;
  targetLangs?: string[];
};

type LibreTranslateResponse = {
  translatedText?: string;
  error?: string;
};

const API_URL = process.env.LIBRETRANSLATE_API_URL;
const API_KEY = process.env.LIBRETRANSLATE_API_KEY;

export async function POST(request: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Missing LIBRETRANSLATE_API_URL. Please configure the translation service endpoint.',
      },
      { status: 200 },
    );
  }

  try {
    const body = (await request.json()) as TranslateBody;
    const text = body.text?.trim();
    const sourceLang = body.sourceLang?.trim().toLowerCase();
    const targets = Array.isArray(body.targetLangs)
      ? body.targetLangs
          .map((lang) => lang.trim().toLowerCase())
          .filter((lang) => lang.length > 0)
      : [];

    if (!text || !sourceLang || targets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Provide text, sourceLang and at least one target language to translate.',
        },
        { status: 400 },
      );
    }

    const translations: Record<string, string> = {};

    for (const targetLang of targets) {
      if (targetLang === sourceLang) {
        translations[targetLang] = text;
        continue;
      }

      const payload = {
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
        api_key: API_KEY || undefined,
      };

      const response = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response
          .text()
          .catch(() => 'Translation service error');
        return NextResponse.json(
          {
            success: false,
            error: `Translation request failed (${response.status}): ${message}`,
          },
          { status: 502 },
        );
      }

      const data = (await response.json()) as LibreTranslateResponse;

      if (!data?.translatedText) {
        return NextResponse.json(
          {
            success: false,
            error:
              data?.error ||
              `Translation service did not return translated text for ${targetLang}`,
          },
          { status: 502 },
        );
      }

      translations[targetLang] = data.translatedText;
    }

    return NextResponse.json({ success: true, translations });
  } catch (error) {
    console.error('Error in POST /api/translate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to translate content.' },
      { status: 500 },
    );
  }
}
