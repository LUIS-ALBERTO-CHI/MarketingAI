import Anthropic from "@anthropic-ai/sdk";
import { resolveAnthropicClient } from "@/lib/credentials";
import { getModel, DEFAULT_MODEL } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImgPart = { mediaType: string; data: string };
type DocPart = { name: string; text: string };
type Msg = {
  role: "user" | "assistant";
  content: string;
  images?: ImgPart[];
  docs?: DocPart[];
};

// Antepone el texto de los archivos adjuntos (PDF/Word/Excel) al mensaje del
// usuario. Funciona con TODOS los modelos porque es texto plano.
function injectDocs(m: Msg): Msg {
  if (m.role !== "user" || !m.docs?.length) return m;
  const blocks = m.docs
    .filter((d) => d && d.text && d.text.trim())
    .map((d) => `--- Archivo: ${d.name} ---\n${d.text.trim()}`)
    .join("\n\n");
  if (!blocks) return m;
  const userText =
    m.content.trim() ||
    "Analiza el/los archivo(s) adjunto(s) y responde en consecuencia.";
  const content =
    `Contenido de archivos adjuntos (extraído por el sistema):\n\n${blocks}\n\n` +
    `--- Fin de archivos ---\n\n${userText}`;
  return { ...m, content };
}

export async function POST(req: Request) {
  let body: {
    system?: string;
    messages?: Msg[];
    web?: boolean;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const { system, messages, web } = body;
  const model = getModel(body.model || DEFAULT_MODEL);

  const clean = (messages ?? [])
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        (m.content.trim().length > 0 ||
          (m.role === "user" &&
            ((Array.isArray(m.images) && m.images.length > 0) ||
              (Array.isArray(m.docs) && m.docs.length > 0))))
    )
    .map(injectDocs);

  if (clean.length === 0) {
    return Response.json({ error: "No hay mensajes que enviar." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (model.provider === "anthropic") {
          await streamAnthropic(controller, encoder, {
            system,
            messages: clean,
            web: !!web && model.web,
            model: model.id,
          });
        } else {
          // OpenRouter y Google/Gemini: ambos con formato OpenAI.
          await streamOpenAICompatible(controller, encoder, {
            system,
            messages: clean,
            model: model.id,
            provider: model.provider,
          });
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n\n[Error] ${err instanceof Error ? err.message : "Error inesperado."}`
          )
        );
      } finally {
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

// ---------- Claude (Anthropic) ----------
async function streamAnthropic(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  opts: { system?: string; messages: Msg[]; web: boolean; model: string }
) {
  const { system, messages, web, model } = opts;

  // Herramientas web (server-side) solo cuando se pide analizar una cuenta/enlaces.
  const tools = web
    ? [
        { type: "web_search_20260209", name: "web_search", max_uses: 5 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8 },
      ]
    : undefined;

  // Los mensajes de usuario con imágenes se convierten a bloques de visión.
  const apiMessages = messages.map((m) => {
    if (m.role === "user" && m.images?.length) {
      const blocks: unknown[] = m.images.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      }));
      if (m.content.trim()) blocks.push({ type: "text", text: m.content });
      return { role: "user", content: blocks };
    }
    return { role: m.role, content: m.content };
  });

  try {
    const client = await resolveAnthropicClient();
    const claudeStream = client.messages.stream({
      model,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      ...(tools ? { tools: tools as never } : {}),
      messages: apiMessages as never,
    });

    for await (const event of claudeStream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        controller.enqueue(encoder.encode(event.delta.text));
      }
    }
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
  }
}

// ---------- Proveedores compatibles con OpenAI (OpenRouter y Google/Gemini) ----------
// Ambos exponen /chat/completions con el mismo formato SSE, así que comparten código.
type OACompatConfig = {
  url: string;
  apiKey: string | undefined;
  extraHeaders?: Record<string, string>;
  providerLabel: string;
  missingKeyMessage: string;
};

function oaConfig(provider: string): OACompatConfig {
  if (provider === "google") {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GEMINI_API_KEY,
      providerLabel: "Gemini (Google)",
      missingKeyMessage:
        "\n\n**[Falta configurar Gemini]** Para usar modelos Gemini necesitas una clave de Google.\n\n" +
        "1. Crea una en **aistudio.google.com/apikey**.\n" +
        "2. Añade `GEMINI_API_KEY=tu_clave` en tu archivo `.env.local` (y en Vercel).\n" +
        "3. Reinicia el servidor.\n\n" +
        "Mientras tanto, puedes usar **Claude Opus 4.8** o los modelos gratis.",
    };
  }
  // Por defecto: OpenRouter
  return {
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    extraHeaders: {
      "HTTP-Referer": "https://marketingai.app",
      "X-Title": "MarketingAI",
    },
    providerLabel: "OpenRouter",
    missingKeyMessage:
      "\n\n**[Falta configurar el modelo]** Para usar este modelo necesitas una clave de OpenRouter (gratis).\n\n" +
      "1. Crea una en **openrouter.ai/keys**.\n" +
      "2. Añade `OPENROUTER_API_KEY=tu_clave` en tu archivo `.env.local`.\n" +
      "3. Reinicia el servidor.\n\n" +
      "Mientras tanto, puedes seguir usando **Claude Opus 4.8**.",
  };
}

async function streamOpenAICompatible(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  opts: { system?: string; messages: Msg[]; model: string; provider: string }
) {
  const { system, messages, model, provider } = opts;
  const cfg = oaConfig(provider);
  const key = cfg.apiKey;

  if (!key) {
    controller.enqueue(encoder.encode(cfg.missingKeyMessage));
    return;
  }

  // Formato de mensajes de OpenAI (system + user/assistant; imágenes vía image_url).
  const oaMessages: unknown[] = [];
  if (system) oaMessages.push({ role: "system", content: system });
  for (const m of messages) {
    if (m.role === "user" && m.images?.length) {
      const parts: unknown[] = [];
      if (m.content.trim()) parts.push({ type: "text", text: m.content });
      for (const img of m.images) {
        parts.push({
          type: "image_url",
          image_url: { url: `data:${img.mediaType};base64,${img.data}` },
        });
      }
      oaMessages.push({ role: "user", content: parts });
    } else {
      oaMessages.push({ role: m.role, content: m.content });
    }
  }

  let res: Response;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(cfg.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model,
        messages: oaMessages,
        stream: true,
        max_tokens: 4096,
      }),
    });
  } catch (err) {
    controller.enqueue(
      encoder.encode(
        `\n\n[Error de red] ${
          err instanceof Error
            ? err.message
            : `No se pudo contactar con ${cfg.providerLabel}.`
        }`
      )
    );
    return;
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    controller.enqueue(
      encoder.encode(
        `\n\n**[Error del modelo ${res.status}]** ${
          detail.slice(0, 400) || "No se pudo generar la respuesta."
        }`
      )
    );
    return;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith("data:")) continue; // ignora comentarios/keepalive
      const data = s.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch {
        // fragmento incompleto o línea no-JSON: se ignora
      }
    }
  }
}
