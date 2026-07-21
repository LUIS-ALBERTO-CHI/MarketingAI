import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { pdf as pdfToImages } from "pdf-to-img";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Límite de caracteres extraídos por archivo (protege el presupuesto de tokens).
const MAX_CHARS = 60_000;
// Límite de tamaño por archivo (bytes).
const MAX_BYTES = 12 * 1024 * 1024;
// Por debajo de esto consideramos que el PDF "no tiene texto" (es de diseño /
// escaneado) y lo convertimos a imágenes para que lo lea un modelo con visión.
const MIN_PDF_TEXT = 80;
// Máximo de páginas a rasterizar (protege memoria y tokens).
const MAX_PDF_PAGES = 6;

type ImgPart = { mediaType: string; data: string };

type ExtractResult = {
  name: string;
  // "text": se extrajo texto · "image": PDF de diseño convertido a imágenes.
  kind: "text" | "image";
  chars: number;
  truncated: boolean;
  text: string;
  images?: ImgPart[];
  pages?: number;
  error?: string;
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

// Rasteriza las primeras páginas de un PDF a PNG (base64). Se usa cuando el
// PDF no tiene texto seleccionable (trípticos, folletos, escaneos).
async function renderPdfPages(buf: Buffer): Promise<ImgPart[]> {
  const images: ImgPart[] = [];
  try {
    const doc = await pdfToImages(new Uint8Array(buf), { scale: 2 });
    let n = 0;
    for await (const page of doc) {
      if (n >= MAX_PDF_PAGES) break;
      images.push({ mediaType: "image/png", data: page.toString("base64") });
      n++;
    }
  } catch {
    return [];
  }
  return images;
}

async function extractOne(file: File): Promise<ExtractResult> {
  const name = file.name || "archivo";
  const ext = extOf(name);
  const type = (file.type || "").toLowerCase();
  const base: ExtractResult = {
    name,
    kind: "text",
    chars: 0,
    truncated: false,
    text: "",
  };

  if (file.size > MAX_BYTES) {
    return { ...base, error: `Archivo muy grande (máx. 12 MB).` };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (ext === "pdf" || type.includes("pdf")) {
      const doc = await getDocumentProxy(new Uint8Array(buf));
      const res = await extractText(doc, { mergePages: true });
      text = (Array.isArray(res.text) ? res.text.join("\n") : res.text) || "";

      // PDF de diseño / escaneado (sin texto seleccionable): lo convertimos a
      // imágenes de página para que un modelo con visión pueda leerlo.
      if (text.trim().length < MIN_PDF_TEXT) {
        const images = await renderPdfPages(buf);
        if (images.length) {
          return {
            ...base,
            kind: "image",
            images,
            pages: images.length,
          };
        }
        return {
          ...base,
          error:
            "No se pudo leer el PDF (ni texto ni imágenes de página). Prueba a exportarlo de nuevo.",
        };
      }
    } else if (
      ext === "docx" ||
      type.includes("officedocument.wordprocessingml")
    ) {
      const res = await mammoth.extractRawText({ buffer: buf });
      text = res.value;
    } else if (
      ext === "xlsx" ||
      ext === "xls" ||
      ext === "csv" ||
      type.includes("spreadsheet") ||
      type.includes("excel")
    ) {
      const wb = XLSX.read(buf, { type: "buffer" });
      const parts: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
        if (csv.trim()) parts.push(`# Hoja: ${sheetName}\n${csv}`);
      }
      text = parts.join("\n\n");
    } else if (
      ext === "txt" ||
      ext === "md" ||
      ext === "json" ||
      type.startsWith("text/")
    ) {
      text = buf.toString("utf-8");
    } else if (ext === "doc") {
      return {
        ...base,
        error:
          "El formato .doc (Word antiguo) no es compatible. Guárdalo como .docx o PDF.",
      };
    } else {
      return {
        ...base,
        error: `Formato no soportado (.${ext || "?"}).`,
      };
    }
  } catch (err) {
    return {
      ...base,
      error: `No se pudo leer el archivo: ${
        err instanceof Error ? err.message : "error desconocido"
      }`,
    };
  }

  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) {
    return {
      ...base,
      error: "No se encontró texto en el archivo.",
    };
  }

  const truncated = text.length > MAX_CHARS;
  return {
    ...base,
    text: truncated ? text.slice(0, MAX_CHARS) : text,
    chars: text.length,
    truncated,
  };
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { error: "Se esperaba multipart/form-data con archivos." },
      { status: 400 }
    );
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return Response.json({ error: "No se adjuntaron archivos." }, { status: 400 });
  }

  const results = await Promise.all(files.slice(0, 6).map(extractOne));
  return Response.json({ files: results });
}
