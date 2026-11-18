// Card recognition with Claude vision, called straight from the browser with the
// user's own API key (stored only in this browser's localStorage).
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const DetectedCard = z.object({
  name: z.string().describe('Card name exactly as printed, in the language printed on the card'),
  english_name: z.string().describe('English name of the Pokémon / trainer card; same as name if already English'),
  number: z.string().describe('Collector number before the slash, e.g. "025" from "025/165", or a promo code like "SVP 085". Empty if unreadable'),
  printed_total: z.string().describe('Number after the slash, e.g. "165". Empty if none'),
  set_name: z.string().describe('Set name if recognisable from the set symbol or text, else empty'),
  language: z.enum(['en', 'ja', 'es', 'fr', 'de', 'it', 'pt', 'ko', 'zh', 'other']),
  edition: z.enum(['unlimited', 'first_edition', 'reverse_holo', 'holo', 'unknown']),
  box: z.object({
    x: z.number().describe('left edge, 0-1 of image width'),
    y: z.number().describe('top edge, 0-1 of image height'),
    w: z.number(), h: z.number(),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
});
const Detection = z.object({ cards: z.array(DetectedCard) });
export type DetectedCard = z.infer<typeof DetectedCard>;

const PROMPT = `Identify every Pokémon TCG card visible in this photo. It may be one card or a binder page with several.
For each card, read the name, the collector number and total from the bottom of the card, the language, and the edition marks.
Give each card's bounding box as fractions of the image size. Skip cards that are mostly hidden or face down.
If a field is unreadable, leave it empty rather than guessing.`;

export class AiKeyError extends Error { name = 'AiKeyError'; }

export type AiSpeed = 'fast' | 'accurate';

export async function detectCards(apiKey: string, jpegBase64: string, speed: AiSpeed = 'fast'): Promise<DetectedCard[]> {
  const client = new Anthropic({
    apiKey,
    // The key belongs to the person using the app and never leaves their browser except to api.anthropic.com.
    dangerouslyAllowBrowser: true,
  });
  try {
    const res = await client.beta.messages.parse({
      // Fast: Haiku 5.5 (quicker and far cheaper). Accurate: Opus 5.5 with server-side refusal fallback.
      ...(speed === 'fast'
        ? { model: 'claude-haiku-5-5' }
        : { model: 'claude-opus-5-5', betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
      max_tokens: 16000,
      output_config: { effort: 'low', format: betaZodOutputFormat(Detection) },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    });
    if (res.stop_reason === 'refusal') throw new Error('La IA no pudo analizar esta imagen.');
    return res.parsed_output?.cards ?? [];
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiKeyError('La API key de Anthropic no es válida.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Demasiadas peticiones a la IA. Espera un momento.');
    if (e instanceof Anthropic.APIConnectionError) throw new Error('No se pudo conectar con la IA.');
    if (e instanceof Anthropic.APIError) throw new Error(`Error de la IA (${e.status}).`);
    throw e;
  }
}

/** Downscale a canvas to keep the upload small; returns base64 JPEG without the data: prefix. */
export function canvasToJpeg(src: HTMLCanvasElement, maxSide = 1568): string {
  const s = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85).split(',')[1];
}
