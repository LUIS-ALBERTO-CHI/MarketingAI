export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy del fondo generado (Pollinations/FLUX) servido desde el mismo origen,
// para que al exportar el post a PNG (html-to-image) no haya problemas de CORS.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prompt = (searchParams.get("prompt") || "abstract branded background").slice(0, 400);
  const seed = searchParams.get("seed") || "1";
  const w = searchParams.get("w") || "864";
  const h = searchParams.get("h") || "1080";
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&nologo=true&model=flux&seed=${seed}`;
  try {
    const r = await fetch(url);
    if (!r.ok || !r.body) return new Response("error", { status: 502 });
    return new Response(r.body, {
      headers: {
        "Content-Type": r.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("error", { status: 502 });
  }
}
