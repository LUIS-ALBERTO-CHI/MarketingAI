// Catálogo de modelos de IA seleccionables.
// - "anthropic": Claude (máxima calidad; único que analiza enlaces con web_fetch).
// - "openrouter": modelos gratuitos vía OpenRouter (API compatible con OpenAI).
//   Requieren OPENROUTER_API_KEY en .env.local (gratis en openrouter.ai/keys).
//   Los IDs ":free" dependen de la disponibilidad de OpenRouter; puedes editarlos aquí.

export type Provider = "anthropic" | "openrouter";

export interface AIModel {
  /** ID que se envía al backend y a la API del proveedor */
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
    id: "google/gemini-2.0-flash-exp:free",
    label: "Gemini 2.0 Flash",
    provider: "openrouter",
    free: true,
    vision: true,
    web: false,
    hint: "Gratis · admite imágenes",
  },
  {
    id: "meta-llama/llama-3.2-11b-vision-instruct:free",
    label: "Llama 3.2 Vision",
    provider: "openrouter",
    free: true,
    vision: true,
    web: false,
    hint: "Gratis · admite imágenes",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    provider: "openrouter",
    free: true,
    vision: false,
    web: false,
    hint: "Gratis · solo texto",
  },
  {
    id: "deepseek/deepseek-r1:free",
    label: "DeepSeek R1",
    provider: "openrouter",
    free: true,
    vision: false,
    web: false,
    hint: "Gratis · razonamiento (solo texto)",
  },
];

export const DEFAULT_MODEL = MODELS[0].id;

export function getModel(id: string | null | undefined): AIModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}
