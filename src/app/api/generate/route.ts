import Anthropic from "@anthropic-ai/sdk";
import { resolveAnthropicClient } from "@/lib/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.MARKETING_AI_MODEL || "claude-opus-4-8";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  let body: { system?: string; messages?: Msg[]; web?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const { system, messages, web } = body;

  // Herramienta de búsqueda web (server-side) solo cuando se pide analizar una cuenta.
  const tools = web
    ? [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }]
    : undefined;
  const clean = (messages ?? []).filter(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0
  );

  if (clean.length === 0) {
    return Response.json({ error: "No hay mensajes que enviar." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = await resolveAnthropicClient();
        const claudeStream = client.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          ...(system ? { system } : {}),
          ...(tools ? { tools: tools as never } : {}),
          messages: clean,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err: unknown) {
        const isAuth =
          err instanceof Anthropic.AuthenticationError ||
          (err instanceof Error &&
            /authentication|api[_-]?key|authtoken|x-api-key/i.test(err.message));

        let msg = "\n\n[Error] Error al contactar con la API de Claude.";
        if (isAuth) {
          msg =
            "\n\n**[Error de autenticación]** No hay credenciales de Claude configuradas.\n\n" +
            "- **En local:** ejecuta `ant auth login`, o pon `ANTHROPIC_API_KEY` en `.env.local`.\n" +
            "- **En Vercel u otro hosting:** añade la variable de entorno `ANTHROPIC_API_KEY` " +
            "en *Settings → Environment Variables* del proyecto y vuelve a desplegar. " +
            "(El inicio de sesión con `ant` solo funciona en tu equipo local, no en la nube.)";
        } else if (err instanceof Anthropic.APIError) {
          msg = `\n\n[Error de la API ${err.status ?? ""}] ${err.message}`;
        } else if (err instanceof Error) {
          msg = `\n\n[Error] ${err.message}`;
        }
        controller.enqueue(encoder.encode(msg));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
