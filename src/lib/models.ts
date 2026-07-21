// Catálogo de modelos de IA seleccionables.
// - "anthropic": Claude (máxima calidad; único que analiza enlaces con web_fetch).
// - "openrouter": otros modelos vía OpenRouter (API compatible con OpenAI).
//   Requieren OPENROUTER_API_KEY en .env.local (crea una en openrouter.ai/keys).
//
// De pago vs. gratis:
//   · free: true  → modelos ":free" de OpenRouter, sin coste.
//   · free: false → consumen créditos/saldo de OpenRouter (GPT, Gemini, DeepSeek).
//
// Los IDs de OpenRouter cambian con el tiempo. Si alguno deja de responder,
// actualízalo aquí (verifícalo en https://openrouter.ai/models).

export type Provider = "anthropic" | "openrouter";

export interface AIModel {
  /** ID que se envía al proveedor (y que identifica la opción en la app) */
  id: string;
  label: string;
  provider: Provider;
  free: boolean;
  /** Admite imágenes (visión) */
  vision: boolean;
  /** Admite herramientas web server-side (analizar enlaces) — solo Claude */
  web: boolean;
  hint?: string;
}

export const MODELS: AIModel[] = [
  // ---------- Máxima calidad ----------
  {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    provider: "anthropic",
    free: false,
    vision: true,
    web: true,
    hint: "Máxima calidad · analiza enlaces e imágenes",
  },

  // ---------- Modelos top individuales (de pago · vía OpenRouter) ----------
  {
    id: "openai/gpt-5.2",
    label: "ChatGPT (GPT-5.2)",
    provider: "openrouter",
    free: false,
    vision: true,
    web: false,
    hint: "De pago · OpenAI · admite imágenes",
  },
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "openrouter",
    free: false,
    vision: true,
    web: false,
    hint: "De pago · Google · rápido · admite imágenes",
  },
  {
    id: "deepseek/deepseek-v3.2",
    label: "DeepSeek V3.2",
    provider: "openrouter",
    free: false,
    vision: false,
    web: false,
    hint: "De pago · DeepSeek · solo texto",
  },

  // ---------- Potencia GRATIS (vía OpenRouter) ----------
  {
    id: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    provider: "openrouter",
    free: true,
    vision: false,
    web: false,
    hint: "Gratis · OpenAI abierto · solo texto",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Gemma 4 (visión)",
    provider: "openrouter",
    free: true,
    vision: true,
    web: false,
    hint: "Gratis · Google · admite imágenes",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron Ultra 550B",
    provider: "openrouter",
    free: true,
    vision: false,
    web: false,
    hint: "Gratis · 550B · 1M contexto · solo texto",
  },
];

export const DEFAULT_MODEL = MODELS[0].id;

export function getModel(id: string | null | undefined): AIModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
