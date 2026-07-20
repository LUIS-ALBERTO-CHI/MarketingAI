"use client";

import { useState } from "react";
import { Images, RefreshCw, Download } from "lucide-react";

// Extrae los prompts de imagen marcados con [[IMG]] del texto del asistente y
// devuelve el resto del contenido por separado (para renderizar como Markdown).
export function extractImagePrompts(text: string): {
  body: string;
  prompts: string[];
} {
  const prompts: string[] = [];
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(?:[-*]\s*)?\[\[IMG\]\]\s*(.+?)\s*$/i);
    if (m && m[1]) {
      prompts.push(m[1].replace(/^["'`]+|["'`]+$/g, "").trim());
    } else {
      kept.push(line);
    }
  }
  return { body: kept.join("\n"), prompts };
}

// Genera la imagen (gratis, sin API key) vía Pollinations con el modelo FLUX.
function pollinationsUrl(prompt: string, seed: number) {
  const q = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${q}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
}

export function GeneratedImages({ prompts }: { prompts: string[] }) {
  const [seeds, setSeeds] = useState<number[]>(() =>
    prompts.map((_, i) => 1000 + i)
  );
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  if (prompts.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Images className="h-3.5 w-3.5" /> Imágenes generadas
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {prompts.map((p, i) => {
          const url = pollinationsUrl(p, seeds[i] ?? 1000 + i);
          return (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border bg-surface-2"
            >
              <div className="relative aspect-square">
                {!loaded[i] && (
                  <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted">
                    <span className="animate-pulse">Generando imagen…</span>
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={p}
                  onLoad={() => setLoaded((s) => ({ ...s, [i]: true }))}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <p className="line-clamp-1 text-[11px] text-muted" title={p}>
                  {p}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      setLoaded((s) => ({ ...s, [i]: false }));
                      setSeeds((s) => {
                        const n = [...s];
                        n[i] = Math.floor(Math.random() * 1_000_000) + 1;
                        return n;
                      });
                    }}
                    title="Regenerar"
                    aria-label="Regenerar imagen"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-surface hover:text-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir / descargar"
                    aria-label="Abrir o descargar imagen"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-surface hover:text-primary"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Generadas gratis con Pollinations (FLUX). Para máxima calidad, usa los
        mismos prompts en tu generador preferido.
      </p>
    </div>
  );
}
