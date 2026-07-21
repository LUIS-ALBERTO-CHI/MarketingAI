// Catálogo de modelos de IA seleccionables.
// - "anthropic": Claude (máxima calidad; único que analiza enlaces con web_fetch).
// - "openrouter": modelos gratuitos vía OpenRouter (API compatible con OpenAI).
//   Requieren OPENROUTER_API_KEY en .env.local (gratis en openrouter.ai/keys).
//
// FALLBACK AUTOMÁTICO: cada modelo de OpenRouter define una `chain` (lista de
// IDs reales en orden de preferencia). Se envía a OpenRouter como el parámetro
// `models`; si el primero está agotado / caído / con límite alcanzado, salta al
// siguiente automáticamente (server-side, sin cortar el streaming).
//
// Los IDs ":free" de OpenRouter cambian con el tiempo. Si algún día toda una
// cadena deja de responder, actualiza aquí los IDs (verifícalos en
// https://openrouter.ai/models?q=free).

export type Provider = "anthropic" | "openrouter";

export interface AIModel {
  /** ID estable que se envía al backend (identifica la opción en la app) */
  id: string;
  label: string;
  provider: Provider;
  free: boolean;
  /** Admite imágenes (visión) */
  vision: boolean;
  /** Admite herramientas web server-side (analizar enlaces) — solo Claude */
  web: boolean;
  hint?: string;
  /**
   * Solo OpenRouter: cadena de modelos reales en orden de preferencia.
   * Se envía como `models` para tener fallback automático cuando uno se agota.
   */
  chain?: string[];
}

export const MODELS: AIModel[] = [
  {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    provider: "anthropic",
    free: false,
    vision: true,
    web: true,
    hint: "Máxima calidad · analiza enlaces e imágenes",
  },
  {
    id: "free-power",
    label: "Gratis · Máxima potencia",
    provider: "openrouter",
    free: true,
    vision: false,
    web: false,
    hint: "Gratis · modelos grandes (razonamiento) con relevo automático",
    chain: [
      "nvidia/nemotron-3-ultra-550b-a55b:free", // 550B · 1M contexto
      "nvidia/nemotron-3-super-120b-a12b:free", // 120B · 1M contexto
      "openai/gpt-oss-20b:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
      "poolside/laguna-xs-2.1:free",
    ],
  },
  {
    id: "free-vision",
    label: "Gratis · Visión (imágenes)",
    provider: "openrouter",
    free: true,
    vision: true,
    web: false,
    hint: "Gratis · admite imágenes · con relevo automático",
    chain: [
      "google/gemma-4-26b-a4b-it:free",
      "nvidia/nemotron-nano-12b-v2-vl:free",
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    ],
  },
];

export const DEFAULT_MODEL = MODELS[0].id;

export function getModel(id: string | null | undefined): AIModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

/** Cadena de IDs reales de OpenRouter para un modelo (fallback automático). */
export function openRouterChain(m: AIModel): string[] {
  return m.chain && m.chain.length > 0 ? m.chain : [m.id];
}
