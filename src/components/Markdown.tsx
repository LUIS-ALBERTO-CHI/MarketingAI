"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

// Renderiza la salida de Claude como Markdown enriquecido (títulos, listas,
// tablas GFM, negritas, código). Estilos afinados a la paleta del proyecto.
// Memoizado: los mensajes ya completados no se re-parsean durante el streaming.
export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div
      className="prose prose-sm max-w-none
        prose-headings:font-heading prose-headings:text-foreground
        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
        prose-p:text-foreground/90 prose-li:text-foreground/90
        prose-strong:text-foreground prose-strong:font-semibold
        prose-a:text-primary hover:prose-a:text-accent
        prose-code:rounded prose-code:bg-primary/10 prose-code:px-1
        prose-code:py-0.5 prose-code:text-primary prose-code:before:content-none
        prose-code:after:content-none
        prose-blockquote:border-l-primary prose-blockquote:text-foreground/70
        prose-hr:border-border"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Los enlaces (p. ej. inspiración de Pinterest) abren en pestaña nueva.
          a: ({ ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          ),
          // Tablas anchas: scroll horizontal sin romper el layout de la página.
          table: ({ ...props }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-border">
              <table
                className="m-0 w-full border-collapse text-left text-[13px]"
                {...props}
              />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              className="border-b border-border bg-primary/5 px-3 py-2 font-heading font-semibold text-foreground"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td
              className="border-b border-border/60 px-3 py-2 align-top text-foreground/85"
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
