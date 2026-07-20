"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, RefreshCw, Loader2 } from "lucide-react";

export interface PostSpec {
  brand?: string;
  headline: string;
  subhead?: string;
  bullets?: string[];
  cta?: string;
  contact?: string;
  palette?: { bg?: string; accent?: string; text?: string };
  bgPrompt?: string;
  ratio?: "1:1" | "4:5";
}

// Extrae el bloque ```json { ...PostSpec } ``` del texto del asistente.
export function extractPostSpec(text: string): {
  body: string;
  spec: PostSpec | null;
} {
  const re = /```json\s*([\s\S]*?)```/i;
  const m = text.match(re);
  if (!m) return { body: text, spec: null };
  let spec: PostSpec | null = null;
  try {
    const parsed = JSON.parse(m[1].trim());
    if (parsed && typeof parsed.headline === "string") spec = parsed;
  } catch {
    /* JSON incompleto (streaming) */
  }
  return { body: spec ? text.replace(re, "").trim() : text, spec };
}

const W = 360; // ancho de diseño (se exporta a 3x = 1080 px)

export function PostImage({ spec }: { spec: PostSpec }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seed, setSeed] = useState(7);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const bg = spec.palette?.bg || "#141019";
  const accent = spec.palette?.accent || "#ff2d78";
  const text = spec.palette?.text || "#ffffff";
  const height = spec.ratio === "1:1" ? W : Math.round(W * 1.25);

  const bgUrl = spec.bgPrompt
    ? `/api/post-bg?prompt=${encodeURIComponent(spec.bgPrompt)}&seed=${seed}&w=864&h=1080`
    : null;

  async function download() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.download = "post.png";
      a.href = dataUrl;
      a.click();
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold text-muted">Post generado</p>
      <div className="flex flex-col items-start gap-3 sm:flex-row">
        {/* Lienzo exportable */}
        <div
          ref={ref}
          style={{
            width: W,
            height,
            background: bg,
            color: text,
            position: "relative",
            overflow: "hidden",
            borderRadius: 18,
            flexShrink: 0,
            fontFamily:
              "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
          }}
        >
          {bgUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bgUrl}
                alt=""
                crossOrigin="anonymous"
                onLoad={() => setBgLoaded(true)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: bgLoaded ? 1 : 0,
                  transition: "opacity .4s",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, ${hexA(bg, 0.35)} 0%, ${hexA(bg, 0.55)} 45%, ${hexA(bg, 0.96)} 100%)`,
                }}
              />
            </>
          )}
          {/* Acento diagonal */}
          <div
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 130,
              height: 130,
              borderRadius: "50%",
              background: accent,
              opacity: 0.9,
              filter: "blur(2px)",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 24,
            }}
          >
            {spec.brand && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: accent,
                }}
              >
                {spec.brand}
              </div>
            )}

            <div>
              <div
                style={{
                  fontSize: 30,
                  lineHeight: 1.05,
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  marginBottom: spec.subhead ? 8 : 12,
                }}
              >
                {spec.headline}
              </div>
              {spec.subhead && (
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.35,
                    opacity: 0.85,
                    marginBottom: 12,
                  }}
                >
                  {spec.subhead}
                </div>
              )}

              {spec.bullets && spec.bullets.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {spec.bullets.slice(0, 5).map((b, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, lineHeight: 1.3 }}>
                      <span
                        style={{
                          marginTop: 5,
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: accent,
                          flexShrink: 0,
                        }}
                      />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              )}

              {spec.cta && (
                <div
                  style={{
                    display: "inline-block",
                    background: accent,
                    color: pickText(accent),
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "8px 16px",
                    borderRadius: 999,
                  }}
                >
                  {spec.cta}
                </div>
              )}

              {spec.contact && (
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 12 }}>
                  {spec.contact}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-row gap-2 sm:flex-col">
          <button
            onClick={download}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Descargar PNG
          </button>
          {bgUrl && (
            <button
              onClick={() => {
                setBgLoaded(false);
                setSeed((s) => s + 1);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-muted transition hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Cambiar fondo
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Texto nítido (HTML) + fondo generado gratis. Descárgalo o ajústalo en tu
        editor.
      </p>
    </div>
  );
}

// #rrggbb con alfa → rgba()
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n =
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

// Elige texto negro/blanco según el brillo del color de acento.
function pickText(hex: string): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#111111" : "#ffffff";
}
