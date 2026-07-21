"use client";

import { useState, useRef, useMemo, useEffect, type DragEvent } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Send,
  Copy,
  Loader2,
  Sun,
  Moon,
  Paperclip,
  Mic,
  RotateCcw,
  X,
  ChevronDown,
  Menu,
  FolderPlus,
  Pencil,
  Trash2,
  Check,
  FileText,
  FileSpreadsheet,
  UploadCloud,
  Download,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  House,
  GearSix,
  Question,
  ClockCounterClockwise,
  UsersThree,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { TOOLS, getTool, FREE_TOOL, systemFor, ACCOUNT_FIELD } from "@/lib/tools";
import { ToolIcon } from "@/components/Icon";
import { LogoMark } from "@/components/Logo";
import { Markdown } from "@/components/Markdown";
import {
  extractImagePrompts,
  GeneratedImages,
} from "@/components/GeneratedImages";
import { extractPostSpec, PostImage } from "@/components/PostImage";
import { Select, ModelSelect } from "@/components/ui/Select";
import { MODELS, DEFAULT_MODEL, getModel } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { ToolField } from "@/lib/tools";
import {
  type Account,
  loadAccounts,
  saveAccounts,
  loadActiveAccountId,
  saveActiveAccountId,
  accountHasLinks,
  accountHasContext,
  accountBrandBlock,
  accountWebBlock,
} from "@/lib/accounts";
import { firebaseReady } from "@/lib/firebase";
import {
  type CloudUser,
  onUserChange,
  signInWithGoogle,
  signOutUser,
  pullCloud,
  subscribeCloud,
  pushConversations,
  pushAccounts,
} from "@/lib/cloud";

// Iconos de navegación/sección (Phosphor), redondeados y minimalistas.
// Por defecto son de línea; se rellenan ("fill") solo cuando están activos,
// como en la barra de Facebook. Conservan los nombres previos.
type NavIconProps = { className?: string; weight?: "regular" | "fill" | "bold" };
const HomeIcon = (p: NavIconProps) => <House weight={p.weight ?? "regular"} className={p.className} aria-hidden="true" />;
const Settings = (p: NavIconProps) => <GearSix weight={p.weight ?? "regular"} className={p.className} aria-hidden="true" />;
const HelpCircle = (p: NavIconProps) => <Question weight={p.weight ?? "regular"} className={p.className} aria-hidden="true" />;
const History = (p: NavIconProps) => <ClockCounterClockwise weight={p.weight ?? "regular"} className={p.className} aria-hidden="true" />;
const Users = (p: NavIconProps) => <UsersThree weight={p.weight ?? "regular"} className={p.className} aria-hidden="true" />;
const Sparkles = (p: NavIconProps) => <Sparkle weight={p.weight ?? "regular"} className={p.className} aria-hidden="true" />;

// Mensaje del asistente: Markdown + imágenes generadas a partir de los prompts
// marcados con [[IMG]] (p. ej. en la herramienta de Diseño).
function AssistantMessage({ content }: { content: string }) {
  const { body: b1, prompts } = extractImagePrompts(content);
  const { body, spec } = extractPostSpec(b1);
  return (
    <>
      <Markdown>{body}</Markdown>
      {spec ? (
        <PostImage spec={spec} />
      ) : (
        <GeneratedImages prompts={prompts} />
      )}
    </>
  );
}

// Copia texto al portapapeles con feedback.
async function copyText(text: string, label = "Copiado") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("No se pudo copiar.");
  }
}

// Descarga una tabla como CSV (UTF-8 con BOM para Excel).
function downloadCsv(t: ParsedTable, name = "posts.csv") {
  try {
    const blob = new Blob([tableToCsv(t)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  } catch {
    toast.error("No se pudo descargar el CSV.");
  }
}

// Renderiza una tabla de posts como tarjetas legibles (copy, hashtags, inspo).
function PostCards({ table }: { table: ParsedTable }) {
  const copyIdx = table.headers.findIndex((h) => /copy/i.test(h));
  const titleIdx = table.headers.findIndex((h) =>
    /(post|tema|t[íi]tulo|d[íi]a)/i.test(h)
  );
  const inspoIdx = table.headers.findIndex((h) => /insp/i.test(h));
  const tagIdx = table.headers.findIndex((h) => /(hashtag|etiqueta)/i.test(h));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {table.rows.map((r, i) => {
        const titleFull = titleIdx >= 0 ? cellToText(r[titleIdx] ?? "") : `Post ${i + 1}`;
        const [titleHead, ...titleRest] = titleFull.split("\n");
        const copy = copyIdx >= 0 ? cellToText(r[copyIdx] ?? "") : "";
        const tags =
          tagIdx >= 0
            ? (r[tagIdx] ?? "").split(/\s+/).filter((x) => x.startsWith("#"))
            : [];
        const inspo =
          inspoIdx >= 0
            ? (r[inspoIdx] ?? "").match(/\((https?:[^)]+)\)/)?.[1]
            : undefined;
        return (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3.5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-heading text-sm font-bold leading-snug text-foreground">
                {titleHead}
              </h4>
              <button
                onClick={() => copyText(copy || titleFull, `Copiado: post ${i + 1}`)}
                title="Copiar el copy de este post"
                className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground/80 transition hover:text-primary"
              >
                <Copy className="h-3 w-3" /> Copiar
              </button>
            </div>
            {titleRest.length > 0 && (
              <p className="whitespace-pre-line text-xs text-muted">
                {titleRest.join("\n")}
              </p>
            )}
            {copy && (
              <p className="whitespace-pre-line border-t border-border/60 pt-2 text-sm text-foreground/90">
                {copy}
              </p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tg, k) => (
                  <span
                    key={k}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                  >
                    {tg}
                  </span>
                ))}
              </div>
            )}
            {inspo && (
              <a
                href={inspo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:text-accent"
              >
                🔗 Ver inspiración
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Ejemplos de un clic para el estado inicial (onboarding).
const EXAMPLE_PROMPTS = [
  "Posts para una cafetería de especialidad en Mérida",
  "Calendario de marzo para una veterinaria",
  "Promo de inscripciones para carrera de enfermería",
  "3 posts para una tienda de motos todoterreno",
];

const CHIPS = [
  "bg-amber-500/10 text-amber-500",
  "bg-blue-500/10 text-blue-500",
  "bg-emerald-500/10 text-emerald-500",
  "bg-pink-500/10 text-pink-500",
  "bg-violet-500/10 text-violet-500",
  "bg-orange-500/10 text-orange-500",
  "bg-cyan-500/10 text-cyan-500",
  "bg-rose-500/10 text-rose-500",
  "bg-indigo-500/10 text-indigo-500",
  "bg-teal-500/10 text-teal-500",
];
const chipFor = (id: string) => {
  const i = TOOLS.findIndex((t) => t.id === id);
  return CHIPS[(i < 0 ? 0 : i) % CHIPS.length];
};

type ImagePart = { mediaType: string; data: string };
type DocPart = { name: string; text: string; chars?: number; truncated?: boolean };
type Msg = {
  role: "user" | "assistant";
  content: string;
  images?: ImagePart[];
  docs?: DocPart[];
};

const ACCEPTED_IMG = ["image/jpeg", "image/png", "image/gif", "image/webp"];
// Extensiones de documentos que se analizan por texto (todos los modelos).
const ACCEPTED_DOC_EXT = ["pdf", "docx", "xlsx", "xls", "csv", "txt", "md"];
const FILE_ACCEPT_ATTR =
  "image/png,image/jpeg,image/gif,image/webp,.pdf,.docx,.xlsx,.xls,.csv,.txt,.md";

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

// Iniciales para el avatar (de nombre o correo).
function initialsOf(s: string | null): string {
  if (!s) return "U";
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "U").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
  );
}

// Fusiona listas por id (la nube gana en conflictos) para el merge local↔nube.
function mergeById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of local) map.set(x.id, x);
  for (const x of cloud) map.set(x.id, x);
  return Array.from(map.values());
}

// ---------- Relevo automático de modelo cuando el elegido falla ----------
const FALLBACK_PREF = [
  "gemini-flash-latest",
  "claude-opus-4-8",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "openai/gpt-oss-20b:free",
  "gemini-pro-latest",
];

function isErrorText(s: string): boolean {
  const t = s.trimStart();
  return (
    t.startsWith("**[Error") || t.startsWith("[Error") || t.startsWith("**[Falta")
  );
}

function pickFallbackModel(tried: string[], needVision: boolean): string | null {
  for (const id of FALLBACK_PREF) {
    if (tried.includes(id)) continue;
    const m = MODELS.find((x) => x.id === id);
    if (!m) continue;
    if (needVision && !m.vision) continue;
    return id;
  }
  return null;
}

// ---------- Tablas Markdown: parseo para copiar/exportar posts ----------
type ParsedTable = { headers: string[]; rows: string[][] };

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function parseMarkdownTables(md: string): ParsedTable[] {
  const lines = md.split("\n");
  const tables: ParsedTable[] = [];
  let i = 0;
  while (i < lines.length) {
    const header = lines[i];
    const sep = lines[i + 1];
    const isHeader = header && header.includes("|") && header.trim().length > 0;
    const isSep = sep && /^[\s:|-]+$/.test(sep) && sep.includes("-") && sep.includes("|");
    if (isHeader && isSep) {
      const headers = splitRow(header);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().length > 0) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      if (rows.length) tables.push({ headers, rows });
    } else {
      i++;
    }
  }
  return tables;
}

// Limpia una celda para copiar como texto plano (para portapapeles).
function cellToText(cell: string): string {
  return cell
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .trim();
}

function tableToCsv(t: ParsedTable): string {
  const esc = (s: string) =>
    '"' + s.replace(/<br\s*\/?>/gi, "\n").replace(/"/g, '""') + '"';
  const lines = [t.headers.map(esc).join(",")];
  for (const r of t.rows) lines.push(r.map(esc).join(","));
  return "﻿" + lines.join("\r\n"); // BOM para que Excel respete UTF-8
}

function fileToImagePart(file: File): Promise<ImagePart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // data:image/png;base64,....
      const comma = result.indexOf(",");
      const mediaType = result.slice(5, result.indexOf(";"));
      resolve({ mediaType, data: result.slice(comma + 1) });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Conversation {
  id: string;
  toolId: string;
  toolName: string;
  title: string;
  syntheticFirst: boolean;
  messages: Msg[];
}

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function Skeleton() {
  const lines = ["w-1/3", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"];
  return (
    <div className="space-y-3" aria-hidden="true">
      {lines.map((w, i) => (
        <div
          key={i}
          className={`h-3.5 ${w} animate-shimmer rounded bg-gradient-to-r from-muted/10 via-muted/25 to-muted/10 bg-[length:200%_100%]`}
          style={{ animationDelay: `${i * 110}ms` }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [syntheticFirst, setSyntheticFirst] = useState(false);
  const [followup, setFollowup] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [histQuery, setHistQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false); // drawer navegación (móvil)
  const [histOpen, setHistOpen] = useState(false); // drawer historial (móvil)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [attachments, setAttachments] = useState<ImagePart[]>([]);
  const [docs, setDocs] = useState<DocPart[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cardView, setCardView] = useState(true); // tarjetas vs tabla
  const [user, setUser] = useState<CloudUser | null>(null);
  const userRef = useRef<CloudUser | null>(null);
  const lastConvJson = useRef("");
  const lastAccJson = useRef("");
  const lastTurnRef = useRef<null | {
    system: string;
    baseMsgs: Msg[];
    toolId: string;
    toolName: string;
    convId: string;
    synthetic: boolean;
    web: boolean;
  }>(null);
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL);
  const [isMac, setIsMac] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedModel = useMemo(() => getModel(modelId), [modelId]);

  const tool = useMemo(
    () => (selectedId ? getTool(selectedId) ?? null : null),
    [selectedId]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get("theme");
    const saved = localStorage.getItem("theme");
    const isDark = themeParam ? themeParam === "dark" : saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    try {
      const raw = localStorage.getItem("conversations");
      if (raw) setConversations(JSON.parse(raw));
    } catch {}

    setAccounts(loadAccounts());
    setActiveAccountId(loadActiveAccountId());
    try {
      const savedModel = localStorage.getItem("modelId");
      if (savedModel) setModelId(savedModel);
    } catch {}

    const t = params.get("tool");
    if (t && getTool(t)) setSelectedId(t);
  }, []);

  // Sesión en la nube (Firebase). Al iniciar sesión, fusiona local + nube y sube.
  useEffect(() => {
    const unsub = onUserChange(async (u) => {
      userRef.current = u;
      setUser(u);
      if (!u) return;
      try {
        const cloud = await pullCloud(u.uid);
        setConversations((prev) => {
          const merged = mergeById(prev, cloud.conversations as Conversation[])
            .sort((a, b) => (a.id < b.id ? 1 : -1))
            .slice(0, 20);
          lastConvJson.current = JSON.stringify(merged);
          try {
            localStorage.setItem("conversations", JSON.stringify(merged));
          } catch {}
          pushConversations(u.uid, merged);
          return merged;
        });
        setAccounts((prev) => {
          const merged = mergeById(prev, cloud.accounts as Account[]);
          lastAccJson.current = JSON.stringify(merged);
          saveAccounts(merged);
          pushAccounts(u.uid, merged);
          return merged;
        });
        toast.success(`Sesión iniciada: ${u.name || u.email}`);
      } catch {
        toast.error("No se pudo sincronizar con la nube.");
      }
    });
    return unsub;
  }, []);

  // Sincronización en tiempo real entre dispositivos.
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeCloud(user.uid, (data) => {
      const cj = JSON.stringify(data.conversations);
      if (cj !== lastConvJson.current) {
        lastConvJson.current = cj;
        setConversations(data.conversations as Conversation[]);
        try {
          localStorage.setItem(
            "conversations",
            JSON.stringify((data.conversations as Conversation[]).slice(0, 20))
          );
        } catch {}
      }
      const aj = JSON.stringify(data.accounts);
      if (aj !== lastAccJson.current) {
        lastAccJson.current = aj;
        setAccounts(data.accounts as Account[]);
        saveAccounts(data.accounts as Account[]);
      }
    });
    return unsub;
  }, [user]);

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId]
  );

  // Atajo de teclado (⌘K / Ctrl+K / Alt+K) para abrir el buscador de comandos.
  useEffect(() => {
    const mac = /Mac|iPhone|iPad|iPod/.test(
      navigator.platform || navigator.userAgent
    );
    setIsMac(mac);

    function onKey(e: KeyboardEvent) {
      if (
        (e.key === "k" || e.key === "K") &&
        (e.metaKey || e.ctrlKey || e.altKey)
      ) {
        e.preventDefault();
        setPaletteQuery("");
        setPaletteIndex(0);
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleTheme(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const filteredTools = TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.tagline.toLowerCase().includes(query.toLowerCase())
  );

  const filteredConvs = conversations.filter((c) => {
    const q = histQuery.toLowerCase().trim();
    if (!q) return true;
    const last =
      [...c.messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
    return (
      c.title.toLowerCase().includes(q) ||
      c.toolName.toLowerCase().includes(q) ||
      last.toLowerCase().includes(q)
    );
  });

  function resetConversation() {
    setMessages([]);
    setSyntheticFirst(false);
    setFollowup("");
    setCurrentConvId(null);
  }

  function persist(list: Conversation[]) {
    const trimmed = list.slice(0, 20);
    try {
      localStorage.setItem("conversations", JSON.stringify(trimmed));
    } catch {}
    const u = userRef.current;
    if (u) {
      lastConvJson.current = JSON.stringify(trimmed);
      pushConversations(u.uid, trimmed);
    }
  }
  function syncAccounts(list: Account[]) {
    saveAccounts(list);
    const u = userRef.current;
    if (u) {
      lastAccJson.current = JSON.stringify(list);
      pushAccounts(u.uid, list);
    }
  }
  function upsertConversation(conv: Conversation) {
    setConversations((prev) => {
      const next = [conv, ...prev.filter((c) => c.id !== conv.id)].slice(0, 20);
      persist(next);
      return next;
    });
  }
  function deleteConversation(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persist(next);
      return next;
    });
    if (currentConvId === id) resetConversation();
  }
  function clearHistory() {
    setConversations([]);
    persist([]);
  }

  // ---------- Adjuntos: imágenes (visión) y documentos (PDF/Word/Excel) ----------
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const imgParts: ImagePart[] = [];
    const docFiles: File[] = []; // Word/Excel/CSV/TXT → servidor
    const pdfFiles: File[] = []; // PDF → navegador (pdf.js)

    for (const f of Array.from(files)) {
      const ext = extOf(f.name);
      if (ACCEPTED_IMG.includes(f.type)) {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`Imagen muy grande (máx. 5 MB): ${f.name}`);
          continue;
        }
        try {
          imgParts.push(await fileToImagePart(f));
        } catch {
          toast.error(`No se pudo leer: ${f.name}`);
        }
      } else if (ext === "pdf" || f.type === "application/pdf") {
        if (f.size > 25 * 1024 * 1024) {
          toast.error(`PDF muy grande (máx. 25 MB): ${f.name}`);
          continue;
        }
        pdfFiles.push(f);
      } else if (ACCEPTED_DOC_EXT.includes(ext)) {
        if (f.size > 12 * 1024 * 1024) {
          toast.error(`Archivo muy grande (máx. 12 MB): ${f.name}`);
          continue;
        }
        docFiles.push(f);
      } else {
        toast.error(
          `Formato no soportado: ${f.name} (usa imagen, PDF, Word, Excel, CSV o TXT)`
        );
      }
    }

    if (imgParts.length) {
      setAttachments((prev) => [...prev, ...imgParts].slice(0, 6));
    }
    if (pdfFiles.length) await handlePdfs(pdfFiles);
    if (docFiles.length) await extractDocs(docFiles);
  }

  // PDF en el navegador: si tiene texto seleccionable, se extrae; si es de
  // diseño/escaneado (sin texto), se rasterizan sus páginas a imagen para que
  // las lea un modelo con visión. Todo local — sin depender del servidor.
  async function pdfToParts(
    file: File
  ): Promise<{ docs: DocPart[]; images: ImagePart[] }> {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const data = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;

    // 1) Intentar texto seleccionable.
    let text = "";
    const scanPages = Math.min(doc.numPages, 40);
    for (let p = 1; p <= scanPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      text +=
        tc.items
          .map((it) => ("str" in it ? (it as { str: string }).str : ""))
          .join(" ") + "\n";
    }
    text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    if (text.length >= 80) {
      const truncated = text.length > 60_000;
      return {
        docs: [
          {
            name: file.name,
            text: truncated ? text.slice(0, 60_000) : text,
            chars: text.length,
            truncated,
          },
        ],
        images: [],
      };
    }

    // 2) Sin texto → rasterizar páginas (máx. 6) a JPEG.
    const images: ImagePart[] = [];
    const renderPages = Math.min(doc.numPages, 6);
    for (let p = 1; p <= renderPages; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      images.push({ mediaType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) });
    }
    return { docs: [], images };
  }

  async function handlePdfs(files: File[]) {
    setExtracting(true);
    try {
      const newDocs: DocPart[] = [];
      const newImgs: ImagePart[] = [];
      let anyImage = false;
      for (const f of files) {
        try {
          const { docs: d, images: im } = await pdfToParts(f);
          newDocs.push(...d);
          newImgs.push(...im);
          if (im.length) anyImage = true;
          if (d[0]?.truncated) {
            toast.info(`${f.name}: PDF largo, se analizará el inicio.`);
          }
        } catch {
          toast.error(`No se pudo leer el PDF: ${f.name}`);
        }
      }
      if (newImgs.length) {
        setAttachments((prev) => [...prev, ...newImgs].slice(0, 6));
      }
      if (newDocs.length) {
        setDocs((prev) => [...prev, ...newDocs].slice(0, 6));
      }
      if (newDocs.length || newImgs.length) {
        toast.success(
          anyImage
            ? "PDF sin texto: lo convertí a imágenes para analizarlo."
            : "PDF listo para analizar."
        );
        if (anyImage && !selectedModel.vision) {
          toast.info(
            "Este PDF es de diseño (imágenes). Cambia a un modelo con visión (Claude, Gemini, GPT o Gemma) para que lo lea."
          );
        }
      }
    } finally {
      setExtracting(false);
    }
  }

  // Sube los documentos al servidor, que extrae el texto para analizarlo.
  async function extractDocs(files: File[]) {
    setExtracting(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudieron leer los archivos.");
        return;
      }
      const okDocs: DocPart[] = [];
      for (const r of data.files ?? []) {
        if (r.error) {
          toast.error(`${r.name}: ${r.error}`);
          continue;
        }
        if (r.text) {
          okDocs.push({
            name: r.name,
            text: r.text,
            chars: r.chars,
            truncated: r.truncated,
          });
          if (r.truncated) {
            toast.info(`${r.name}: archivo largo, se analizará el inicio.`);
          }
        }
      }
      if (okDocs.length) {
        setDocs((prev) => [...prev, ...okDocs].slice(0, 6));
        toast.success(
          okDocs.length === 1
            ? `Archivo listo: ${okDocs[0].name}`
            : `${okDocs.length} archivos listos para analizar.`
        );
      }
    } catch {
      toast.error("Error al subir los archivos.");
    } finally {
      setExtracting(false);
    }
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, j) => j !== i));
  }
  function removeDoc(i: number) {
    setDocs((prev) => prev.filter((_, j) => j !== i));
  }

  // ---------- Arrastrar y soltar archivos ----------
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      if (!dragging) setDragging(true);
    }
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    // Solo ocultamos cuando el puntero sale de la ventana.
    if (e.relatedTarget === null) setDragging(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer?.files?.length) {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    }
    setDragging(false);
  }

  function chooseModel(id: string) {
    setModelId(id);
    try {
      localStorage.setItem("modelId", id);
    } catch {}
  }

  // ---------- Buscador de comandos (⌘K / Alt+K) ----------
  function openPalette() {
    setPaletteQuery("");
    setPaletteIndex(0);
    setPaletteOpen(true);
  }
  const paletteResults = TOOLS.filter((t) => {
    const q = paletteQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q)
    );
  });
  function runPaletteItem(id: string) {
    openTool(id);
    setPaletteOpen(false);
  }
  function onPaletteKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPaletteIndex((i) => Math.min(i + 1, paletteResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPaletteIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = paletteResults[paletteIndex];
      if (t) runPaletteItem(t.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPaletteOpen(false);
    }
  }

  // ---------- Sesión en la nube ----------
  async function doSignIn() {
    try {
      await signInWithGoogle();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.error("[login] error:", err);
      const code = err?.code || "";
      let msg = "No se pudo iniciar sesión con Google.";
      if (code === "auth/operation-not-allowed")
        msg = "Activa el proveedor Google en Firebase → Authentication → Sign-in method.";
      else if (code === "auth/unauthorized-domain")
        msg = "Dominio no autorizado. Agrégalo en Firebase → Authentication → Settings → Authorized domains.";
      else if (code === "auth/popup-blocked")
        msg = "El navegador bloqueó la ventana emergente. Permite pop-ups y reintenta.";
      else if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      )
        msg = "Cerraste la ventana de Google antes de terminar.";
      else if (code) msg = `No se pudo iniciar sesión (${code}).`;
      toast.error(msg);
    }
  }
  async function doSignOut() {
    await signOutUser();
    userRef.current = null;
    setUser(null);
    toast.message("Sesión cerrada (los datos locales se conservan).");
  }

  // ---------- Cuentas / Proyectos ----------
  function chooseActiveAccount(id: string | null) {
    setActiveAccountId(id);
    saveActiveAccountId(id);
  }
  function saveEditingAccount() {
    if (!editingAccount) return;
    const name = editingAccount.name.trim();
    if (!name) return;
    const links = editingAccount.links.map((l) => l.trim()).filter(Boolean);
    const acc: Account = {
      id: editingAccount.id,
      name,
      links,
      notes: editingAccount.notes?.trim() || undefined,
      contact: editingAccount.contact?.trim() || undefined,
      colors: editingAccount.colors?.trim() || undefined,
      tone: editingAccount.tone?.trim() || undefined,
    };
    setAccounts((prev) => {
      const next = prev.some((a) => a.id === acc.id)
        ? prev.map((a) => (a.id === acc.id ? acc : a))
        : [acc, ...prev];
      syncAccounts(next);
      return next;
    });
    chooseActiveAccount(acc.id);
    setEditingAccount(null);
  }
  function removeAccount(id: string) {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      syncAccounts(next);
      return next;
    });
    if (activeAccountId === id) chooseActiveAccount(null);
    if (editingAccount?.id === id) setEditingAccount(null);
  }
  function openConversation(conv: Conversation) {
    setSelectedId(conv.toolId);
    setInputs({});
    setMessages(conv.messages);
    setSyntheticFirst(conv.syntheticFirst);
    setFollowup("");
    setCurrentConvId(conv.id);
    setHistOpen(false);
  }

  function openTool(id: string) {
    setSelectedId(id);
    setInputs({});
    resetConversation();
    setNavOpen(false);
  }
  function goHome() {
    setSelectedId(null);
    setInputs({});
    resetConversation();
    setNavOpen(false);
  }
  function updateField(name: string, value: string) {
    setInputs((prev) => ({ ...prev, [name]: value }));
  }

  const activeTool = tool ?? FREE_TOOL;
  const isFree = activeTool.id === FREE_TOOL.id;
  const missingRequired = activeTool.fields
    .filter((f) => f.required)
    .some((f) => !(inputs[f.name] && inputs[f.name].trim()));
  const hasAssistant = messages.some((m) => m.role === "assistant" && m.content);
  const showComposer = isFree || hasAssistant;

  async function runTurn(
    system: string,
    baseMsgs: Msg[],
    toolId: string,
    toolName: string,
    convId: string,
    synthetic: boolean,
    web = false,
    opts?: { modelId?: string; tried?: string[] }
  ) {
    const useModel = opts?.modelId ?? modelId;
    const tried = opts?.tried ?? [];
    const needVision = baseMsgs.some(
      (m) => m.role === "user" && !!m.images && m.images.length > 0
    );
    // Guardamos la llamada inicial para poder "Regenerar" con el mismo contexto.
    if (!opts) {
      lastTurnRef.current = {
        system,
        baseMsgs,
        toolId,
        toolName,
        convId,
        synthetic,
        web,
      };
    }
    setLoading(true);
    setMessages([...baseMsgs, { role: "assistant", content: "" }]);
    let acc = "";
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, messages: baseMsgs, web, model: useModel }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setMessages([
          ...baseMsgs,
          { role: "assistant", content: `**[Error]** ${d.error || "No se pudo generar."}` },
        ]);
        toast.error("No se pudo generar la respuesta.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      // Agrupamos las actualizaciones a ~1 por frame para evitar el jank de
      // re-renderizar y re-parsear el Markdown en cada token.
      let rafId = 0;
      const flush = () => {
        rafId = 0;
        setMessages([...baseMsgs, { role: "assistant", content: acc }]);
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        if (!rafId) rafId = requestAnimationFrame(flush);
      }
      if (rafId) cancelAnimationFrame(rafId);
      setMessages([...baseMsgs, { role: "assistant", content: acc }]);
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });

      // Relevo automático: si el modelo devolvió un error, probamos con otro.
      if (isErrorText(acc)) {
        const next = pickFallbackModel([...tried, useModel], needVision);
        if (next) {
          const failed = getModel(useModel).label;
          const alt = getModel(next);
          toast.message(
            `"${failed}" no está disponible ahora. Probando con "${alt.label}"…`
          );
          return await runTurn(system, baseMsgs, toolId, toolName, convId, synthetic, web && alt.web, {
            modelId: next,
            tried: [...tried, useModel],
          });
        }
      }

      if (acc && !isErrorText(acc)) {
        const finalMsgs: Msg[] = [...baseMsgs, { role: "assistant", content: acc }];
        const firstUser = baseMsgs.find((m) => m.role === "user");
        const title =
          synthetic || !firstUser?.content.trim()
            ? toolName
            : firstUser.content.slice(0, 48);
        upsertConversation({
          id: convId,
          toolId,
          toolName,
          title,
          syntheticFirst: synthetic,
          // No persistimos las imágenes (base64) para no agotar el localStorage.
          messages: finalMsgs.map((m) => ({ role: m.role, content: m.content })),
        });
      }
    } catch (err) {
      setMessages([
        ...baseMsgs,
        {
          role: "assistant",
          content: `**[Error de red]** ${err instanceof Error ? err.message : "Reintenta."}`,
        },
      ]);
      toast.error("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function generate() {
    if (!selectedId || loading || extracting || missingRequired) return;
    const t = getTool(selectedId);
    if (!t) return;
    const convId = newId();
    setCurrentConvId(convId);
    setSyntheticFirst(true);

    let content = t.buildPrompt(inputs);
    const acct = inputs.cuenta?.trim();
    let web = !!(t.webAware && acct);
    if (web) {
      content +=
        `\n\nCUENTA A ANALIZAR: ${acct}\n` +
        `Busca información pública real de esta cuenta/marca (perfil, publicaciones recientes, temas y estilo) y adapta el contenido para que encaje con su tipo de contenido, tono y formato habituales. ` +
        `Si no encuentras datos fiables, dilo con claridad y continúa aplicando buenas prácticas del sector.`;
    }

    let system = systemFor(t);
    if (accountHasContext(activeAccount)) system += accountBrandBlock(activeAccount);
    web = web && selectedModel.web; // las herramientas web solo existen en Claude
    if (accountHasLinks(activeAccount) && selectedModel.web) {
      system += accountWebBlock(activeAccount);
      web = true;
    }

    // Adjuntos del formulario: imágenes (visión) y documentos (texto/PDF).
    const visionOk = selectedModel.vision;
    if (attachments.length && !visionOk) {
      toast.info(
        "Este modelo no admite imágenes; se envían solo los datos. Cambia a un modelo con visión para analizarlas."
      );
    }
    const imgs = visionOk ? attachments : [];
    const docsToSend = docs;
    const userMsg: Msg = {
      role: "user",
      content,
      ...(imgs.length ? { images: imgs } : {}),
      ...(docsToSend.length ? { docs: docsToSend } : {}),
    };
    if (visionOk) setAttachments([]);
    setDocs([]);

    runTurn(system, [userMsg], t.id, t.name, convId, true, web);
  }

  function regenerate() {
    const lt = lastTurnRef.current;
    if (!lt || loading || extracting) return;
    runTurn(lt.system, lt.baseMsgs, lt.toolId, lt.toolName, lt.convId, lt.synthetic, lt.web);
  }

  function sendFollowup(textOverride?: string) {
    if (loading || extracting) return;
    const text = (textOverride ?? followup).trim();
    const visionOk = selectedModel.vision;
    if (attachments.length && !visionOk) {
      toast.info(
        "Este modelo no admite imágenes; se envía solo el texto. Cambia a un modelo con visión para analizarlas."
      );
    }
    const imgs = visionOk ? attachments : [];
    const docsToSend = docs;
    if (!text && imgs.length === 0 && docsToSend.length === 0) return;
    const t = getTool(selectedId ?? FREE_TOOL.id) ?? FREE_TOOL;
    const convId = currentConvId ?? newId();
    if (!currentConvId) setCurrentConvId(convId);
    const userMsg: Msg = {
      role: "user",
      content:
        text ||
        (docsToSend.length
          ? "Analiza el/los archivo(s) adjunto(s)."
          : "Aquí tienes una imagen de referencia. Analízala y básate en su estilo."),
      ...(imgs.length ? { images: imgs } : {}),
      ...(docsToSend.length ? { docs: docsToSend } : {}),
    };
    const base: Msg[] = [...messages.filter((m) => m.content), userMsg];
    if (!textOverride) setFollowup("");
    if (visionOk) setAttachments([]);
    setDocs([]);
    let system = systemFor(t);
    if (accountHasContext(activeAccount)) system += accountBrandBlock(activeAccount);
    const web = accountHasLinks(activeAccount) && selectedModel.web;
    if (web) system += accountWebBlock(activeAccount);
    runTurn(system, base, t.id, t.name, convId, syntheticFirst, web);
  }

  function submitHomePrompt(textOverride?: string) {
    if (loading || extracting) return;
    const p = (textOverride ?? inputs.prompt)?.trim();
    const visionOk = selectedModel.vision;
    if (attachments.length && !visionOk) {
      toast.info(
        "Este modelo no admite imágenes; se envía solo el texto. Cambia a un modelo con visión para analizarlas."
      );
    }
    const imgs = visionOk ? attachments : [];
    const docsToSend = docs;
    if (!p && imgs.length === 0 && docsToSend.length === 0) return;
    const convId = newId();
    setSelectedId(FREE_TOOL.id);
    setCurrentConvId(convId);
    setSyntheticFirst(false);
    let system = systemFor(FREE_TOOL);
    if (accountHasContext(activeAccount)) system += accountBrandBlock(activeAccount);
    const web = accountHasLinks(activeAccount) && selectedModel.web;
    if (web) system += accountWebBlock(activeAccount);
    const userMsg: Msg = {
      role: "user",
      content:
        p ||
        (docsToSend.length
          ? "Analiza el/los archivo(s) adjunto(s)."
          : "Aquí tienes una imagen de referencia. Analízala y básate en su estilo."),
      ...(imgs.length ? { images: imgs } : {}),
      ...(docsToSend.length ? { docs: docsToSend } : {}),
    };
    if (visionOk) setAttachments([]);
    setDocs([]);
    updateField("prompt", "");
    runTurn(
      system,
      [userMsg],
      FREE_TOOL.id,
      FREE_TOOL.name,
      convId,
      false,
      web
    );
  }

  async function copyLast() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last?.content) return;
    await navigator.clipboard.writeText(last.content);
    toast.success("Copiado al portapapeles");
  }

  const visibleMessages = messages.filter(
    (_, i) => !(syntheticFirst && i === 0)
  );

  function renderField(f: ToolField) {
    return (
      <div key={f.name} className="flex flex-col gap-1.5">
        <label htmlFor={f.name} className="text-sm font-medium text-foreground">
          {f.label}
          {f.required && <span className="ml-1 text-primary">*</span>}
        </label>
        {f.type === "textarea" ? (
          <Textarea
            id={f.name}
            rows={f.rows ?? 3}
            placeholder={f.placeholder}
            value={inputs[f.name] ?? ""}
            onChange={(e) => updateField(f.name, e.target.value)}
          />
        ) : f.type === "select" ? (
          <Select
            id={f.name}
            value={inputs[f.name] ?? ""}
            onValueChange={(v) => updateField(f.name, v)}
            options={f.options ?? []}
          />
        ) : (
          <Input
            id={f.name}
            placeholder={f.placeholder}
            value={inputs[f.name] ?? ""}
            onChange={(e) => updateField(f.name, e.target.value)}
          />
        )}
      </div>
    );
  }

  const optionalFields = [
    ...activeTool.fields.filter((f) => !f.required),
    ...(activeTool.webAware ? [ACCOUNT_FIELD] : []),
  ];

  // ---------- Contenido reutilizable (escritorio + cajón móvil) ----------
  const sidebarBody = (
    <>
      <button
        onClick={goHome}
        className="mb-4 flex cursor-pointer items-center gap-2.5"
      >
        <LogoMark className="h-8 w-8" />
        <span className="font-heading text-[15px] font-bold text-foreground">
          MarketingAI
        </span>
      </button>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          data-search-tool="true"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar herramientas"
          className="bg-surface-2 py-2 pl-9 pr-3"
        />
      </div>

      <ScrollArea className="-mx-1 min-h-0 flex-1 px-1">
        <Button
          variant={selectedId === null ? "subtle" : "ghost"}
          onClick={goHome}
          className={`mb-1 h-9 w-full justify-start gap-3 px-3 font-medium ${
            selectedId === null ? "text-foreground" : ""
          }`}
        >
          <HomeIcon
            className="h-5 w-5"
            weight={selectedId === null ? "fill" : "regular"}
          />{" "}
          Inicio
        </Button>

        <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Herramientas
        </p>
        <div className="space-y-0.5">
          {filteredTools.map((t) => {
            const active = t.id === selectedId;
            return (
              <Button
                key={t.id}
                variant={active ? "subtle" : "ghost"}
                onClick={() => openTool(t.id)}
                aria-current={active ? "page" : undefined}
                className={`h-9 w-full justify-start gap-3 px-3 font-medium ${
                  active ? "text-foreground" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chipFor(
                    t.id
                  )}`}
                >
                  <ToolIcon
                    name={t.icon}
                    className="h-4 w-4"
                    weight={active ? "fill" : "regular"}
                  />
                </span>
                <span className="truncate">{t.name}</span>
              </Button>
            );
          })}
          {filteredTools.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">Sin resultados</p>
          )}
        </div>
      </ScrollArea>

      <Separator className="my-3" />

      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Ajustes
      </p>
      <div className="mb-2 px-1">
        <label className="mb-1 block px-2 text-xs font-medium text-muted">
          Modelo de IA
        </label>
        <ModelSelect
          value={modelId}
          onValueChange={chooseModel}
          options={MODELS.map((m) => ({
            value: m.id,
            label: m.label,
            hint: m.hint,
            free: m.free,
            vision: m.vision,
          }))}
        />
      </div>
      <Button variant="ghost" className="h-9 w-full justify-start gap-3 px-3 font-medium">
        <Settings className="h-5 w-5" /> Configuración
      </Button>
      <Button variant="ghost" className="h-9 w-full justify-start gap-3 px-3 font-medium">
        <HelpCircle className="h-5 w-5" /> Ayuda
      </Button>

      <div className="mt-3 flex items-center gap-1 rounded-xl bg-surface-2 p-1">
        <Button
          variant={!dark ? "outline" : "ghost"}
          size="sm"
          onClick={() => toggleTheme(false)}
          className={`flex-1 ${!dark ? "shadow-soft" : ""}`}
        >
          <Sun className="h-4 w-4" /> Claro
        </Button>
        <Button
          variant={dark ? "outline" : "ghost"}
          size="sm"
          onClick={() => toggleTheme(true)}
          className={`flex-1 ${dark ? "shadow-soft" : ""}`}
        >
          <Moon className="h-4 w-4" /> Oscuro
        </Button>
      </div>

      <div className="mt-3 px-1">
        {firebaseReady && user ? (
          <div className="flex items-center gap-2.5">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-primary to-violet-500 text-xs">
                {initialsOf(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.name || "Usuario"}
              </p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <button
              onClick={doSignOut}
              title="Cerrar sesión"
              className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-rose-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : firebaseReady ? (
          <button
            onClick={doSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-surface-2"
          >
            <LogIn className="h-4 w-4" /> Iniciar sesión con Google
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-primary to-violet-500">
                LC
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                Invitado
              </p>
              <p className="truncate text-xs text-muted">
                Sin sincronizar (local)
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const historyBody = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-foreground">
          Historial{" "}
          <span className="font-normal text-muted">({conversations.length})</span>
        </h2>
        {conversations.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="h-auto px-2 py-1 text-muted hover:text-foreground"
          >
            Limpiar
          </Button>
        )}
      </div>
      {conversations.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 px-4 text-center text-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
            <Sparkles className="h-5 w-5 opacity-60" />
          </div>
          <p className="text-xs">Tus conversaciones se guardarán aquí.</p>
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={histQuery}
              onChange={(e) => setHistQuery(e.target.value)}
              placeholder="Buscar en el historial"
              className="bg-surface-2 py-1.5 pl-8 text-xs"
            />
          </div>
          <ScrollArea className="-mx-1 min-h-0 flex-1 px-1">
            <div className="space-y-2">
              {filteredConvs.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted">
                  Sin resultados
                </p>
              )}
              {filteredConvs.map((c) => {
                const last = [...c.messages]
                  .reverse()
                  .find((m) => m.role === "assistant");
                const snippet = (last?.content || "")
                  .replace(/[#*`>|]/g, "")
                  .trim()
                  .slice(0, 70);
                const active = c.id === currentConvId;
                return (
                  <div key={c.id} className="group relative">
                    <Button
                      variant="outline"
                      onClick={() => openConversation(c)}
                      className={`h-auto w-full flex-col items-start gap-1 rounded-xl bg-surface-2 p-3 pr-8 text-left hover:-translate-y-0.5 ${
                        active ? "ring-2 ring-ring/40" : ""
                      }`}
                    >
                      <span className="flex w-full items-center gap-2">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                            c.toolId === FREE_TOOL.id
                              ? "bg-primary/10 text-primary"
                              : chipFor(c.toolId)
                          }`}
                        >
                          <ToolIcon
                            name={getTool(c.toolId)?.icon ?? "Sparkles"}
                            className="h-3 w-3"
                          />
                        </span>
                        <span className="truncate text-xs font-semibold text-foreground">
                          {c.title}
                        </span>
                      </span>
                      <span className="line-clamp-2 whitespace-normal text-xs font-normal text-muted">
                        {snippet}
                      </span>
                    </Button>
                    <button
                      onClick={() => deleteConversation(c.id)}
                      title="Eliminar"
                      aria-label="Eliminar conversación"
                      className="absolute right-1.5 top-1.5 hidden h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-surface hover:text-rose-500 group-hover:flex"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}
    </>
  );

  const accountsBody = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-foreground">
          Cuentas / Proyectos
        </h2>
        {!editingAccount && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setEditingAccount({ id: newId(), name: "", links: [], notes: "" })
            }
            className="h-auto gap-1 px-2 py-1 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <FolderPlus className="h-4 w-4" /> Nueva
          </Button>
        )}
      </div>

      {editingAccount ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Nombre</label>
            <Input
              value={editingAccount.name}
              onChange={(e) =>
                setEditingAccount({ ...editingAccount, name: e.target.value })
              }
              placeholder="Ej: Cafetería Aurora"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Enlaces (uno por línea)
            </label>
            <Textarea
              rows={4}
              value={editingAccount.links.join("\n")}
              onChange={(e) =>
                setEditingAccount({
                  ...editingAccount,
                  links: e.target.value.split("\n"),
                })
              }
              placeholder={"https://instagram.com/tu_cuenta\nhttps://tuweb.com"}
            />
            <p className="text-xs text-muted">
              Perfiles de redes o web. La IA intentará leerlos para basar el
              contenido en su estilo. Nota: algunas redes bloquean la lectura
              automática; una web propia da mejores resultados.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Contacto (opcional)
            </label>
            <Input
              value={editingAccount.contact ?? ""}
              onChange={(e) =>
                setEditingAccount({ ...editingAccount, contact: e.target.value })
              }
              placeholder="📲 999 123 4567 · 📍 Centro, Mérida"
            />
            <p className="text-xs text-muted">
              Se incluye en los posts cuando aplique.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Tono (opcional)
              </label>
              <Input
                value={editingAccount.tone ?? ""}
                onChange={(e) =>
                  setEditingAccount({ ...editingAccount, tone: e.target.value })
                }
                placeholder="Cercano, premium…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Colores (opcional)
              </label>
              <Input
                value={editingAccount.colors ?? ""}
                onChange={(e) =>
                  setEditingAccount({ ...editingAccount, colors: e.target.value })
                }
                placeholder="#0A66C2, azul y blanco"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Notas y frases fijas (opcional)
            </label>
            <Textarea
              rows={2}
              value={editingAccount.notes ?? ""}
              onChange={(e) =>
                setEditingAccount({ ...editingAccount, notes: e.target.value })
              }
              placeholder="Frases fijas de marca (se repiten en venta), público, temas a evitar…"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={saveEditingAccount}
              disabled={!editingAccount.name.trim()}
              className="flex-1"
            >
              <Check className="h-4 w-4" /> Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingAccount(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 px-4 text-center text-muted">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
            <Users className="h-5 w-5 opacity-60" />
          </div>
          <p className="text-xs">
            Crea una cuenta y pega los enlaces de sus redes. La IA los usará como
            contexto en cada herramienta.
          </p>
        </div>
      ) : (
        <ScrollArea className="-mx-1 min-h-0 flex-1 px-1">
          <div className="space-y-2">
            <Button
              variant={activeAccountId === null ? "subtle" : "ghost"}
              onClick={() => chooseActiveAccount(null)}
              className="h-9 w-full justify-start gap-2 px-3 font-medium"
            >
              {activeAccountId === null ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <span className="h-4 w-4" />
              )}
              Sin cuenta
            </Button>
            {accounts.map((a) => {
              const active = a.id === activeAccountId;
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 ${
                    active
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-surface-2"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => chooseActiveAccount(a.id)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                    >
                      {active ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Users className="h-4 w-4 shrink-0 text-muted" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {a.name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {a.links.length} enlace{a.links.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => setEditingAccount(a)}
                        aria-label="Editar cuenta"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-surface hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeAccount(a.id)}
                        aria-label="Eliminar cuenta"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-surface hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </>
  );

  const docIcon = (name: string) =>
    ["xlsx", "xls", "csv"].includes(extOf(name)) ? (
      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
    ) : (
      <FileText className="h-4 w-4 text-primary" />
    );

  const attachmentStrip =
    attachments.length > 0 || docs.length > 0 || extracting ? (
      <div className="flex flex-wrap gap-2 px-1 pt-1">
        {attachments.map((img, i) => (
          <div key={`img-${i}`} className="relative">
            <img
              src={`data:${img.mediaType};base64,${img.data}`}
              alt="Adjunto"
              className="h-14 w-14 rounded-lg border border-border object-cover"
            />
            <button
              onClick={() => removeAttachment(i)}
              aria-label="Quitar imagen"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-muted shadow-soft transition hover:text-rose-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {docs.map((d, i) => (
          <div
            key={`doc-${i}`}
            className="relative flex max-w-[200px] items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-2"
          >
            {docIcon(d.name)}
            <span className="truncate text-xs text-foreground" title={d.name}>
              {d.name}
            </span>
            <button
              onClick={() => removeDoc(i)}
              aria-label="Quitar archivo"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-muted shadow-soft transition hover:text-rose-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {extracting && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Leyendo archivo…
          </div>
        )}
      </div>
    ) : null;

  return (
    <div
      className="relative flex h-screen gap-3 bg-background p-2 sm:p-3"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Overlay al arrastrar archivos */}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-primary/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-surface/95 px-10 py-8 shadow-soft">
            <UploadCloud className="h-10 w-10 text-primary" />
            <p className="text-base font-semibold text-foreground">
              Suelta para analizar
            </p>
            <p className="text-xs text-muted">
              Imágenes · PDF · Word · Excel · CSV · TXT
            </p>
          </div>
        </div>
      )}
      {/* Input de archivos oculto, reutilizado por los cuadros de escritura */}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {/* ===================== SIDEBAR (escritorio) ===================== */}
      <Card className="hidden w-64 shrink-0 flex-col p-4 lg:flex">
        {sidebarBody}
      </Card>

      {/* Cajón de navegación (móvil) */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" title="Navegación">
          {sidebarBody}
        </SheetContent>
      </Sheet>

      {/* ===================== CENTRO ===================== */}
      <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setNavOpen(true)}
              aria-label="Abrir menú"
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              {selectedId ? (
                <>
                  <Button
                    variant="link"
                    onClick={goHome}
                    className="h-auto shrink-0 p-0 font-normal text-muted hover:text-foreground"
                  >
                    Inicio
                  </Button>
                  <span className="text-muted">/</span>
                  <span className="truncate font-semibold text-foreground">
                    {activeTool.name}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-foreground">Inicio</span>
              )}
            </div>
          </div>
          <div className="flex min-w-0 shrink items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openPalette}
              aria-label="Buscar"
              className="shrink-0 gap-1.5 text-muted"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Buscar</span>
              <kbd className="hidden rounded border border-border bg-surface px-1 text-[10px] font-medium lg:inline">
                {isMac ? "⌘K" : "Alt K"}
              </kbd>
            </Button>
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted lg:inline-flex">
              {selectedModel.label}
              {selectedModel.free && (
                <span className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-semibold uppercase text-emerald-600">
                  Gratis
                </span>
              )}
            </span>
            <Button
              variant={activeAccount ? "subtle" : "outline"}
              size="sm"
              onClick={() => setAccountsOpen(true)}
              aria-label="Cuentas y proyectos"
              className={`min-w-0 max-w-[45vw] gap-1.5 ${
                activeAccount ? "text-foreground" : "text-muted"
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {activeAccount ? activeAccount.name : "Cuentas"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setHistOpen(true)}
              aria-label="Abrir historial"
              className="shrink-0 xl:hidden"
            >
              <History className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1" viewportRef={bodyRef}>
          <div className="px-4 py-6 sm:px-6">
            {selectedId === null ? (
              /* ---------- INICIO ---------- */
              <div className="mx-auto max-w-2xl">
                <div className="mb-8 mt-2 text-center sm:mt-4">
                  <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                    Bienvenido a MarketingAI
                  </h1>
                  <p className="mx-auto mt-3 max-w-md text-muted">
                    Elige una herramienta para empezar, o describe abajo lo que
                    necesitas y la IA hace el resto.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {TOOLS.map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      onClick={() => openTool(t.id)}
                      className="group h-auto w-full min-w-0 justify-start gap-3 rounded-2xl p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chipFor(
                          t.id
                        )}`}
                      >
                        <ToolIcon name={t.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {t.name}
                        </span>
                        <span className="block truncate text-xs font-normal text-muted">
                          {t.tagline}
                        </span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-muted transition group-hover:text-primary" />
                    </Button>
                  ))}
                </div>

                <Card className="mt-6 p-2 focus-within:ring-2 focus-within:ring-ring/40">
                  <Textarea
                    rows={1}
                    value={inputs.prompt ?? ""}
                    onChange={(e) => updateField("prompt", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitHomePrompt();
                      }
                    }}
                    placeholder="Describe lo que quieres crear…"
                    className="max-h-40 resize-none border-0 bg-transparent focus:ring-0"
                  />
                  {attachmentStrip}
                  <div className="flex items-center justify-between px-1 pb-1">
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Adjuntar imagen, PDF, Word, Excel, CSV o TXT"
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-surface-2 hover:text-foreground"
                      >
                        <Paperclip className="h-3.5 w-3.5" /> Adjuntar
                      </button>
                      <span className="hidden items-center gap-1.5 px-2 py-1 sm:flex">
                        <Mic className="h-3.5 w-3.5" /> Voz
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">
                        {(inputs.prompt ?? "").length} / 3000
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-sm"
                            onClick={() => submitHomePrompt()}
                            disabled={
                              (!inputs.prompt?.trim() &&
                                attachments.length === 0 &&
                                docs.length === 0) ||
                              loading ||
                              extracting
                            }
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Enviar</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </Card>

                {/* Ejemplos rápidos: rellenan y generan al instante */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => submitHomePrompt(ex)}
                      disabled={loading || extracting}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ---------- HERRAMIENTA ---------- */
              <div className="mx-auto max-w-3xl">
                <header className="mb-5 flex items-start gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isFree ? "bg-primary/10 text-primary" : chipFor(activeTool.id)
                    }`}
                  >
                    <ToolIcon name={activeTool.icon} className="h-5 w-5" weight="fill" />
                  </span>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-foreground">
                      {activeTool.name}
                    </h2>
                    <p className="text-sm text-muted">{activeTool.tagline}</p>
                  </div>
                </header>

                {/* Formulario (no para chat libre) */}
                {!isFree && (
                  <Card className="space-y-4 p-4 sm:p-5">
                    {activeTool.fields.filter((f) => f.required).map(renderField)}

                    {optionalFields.length > 0 && (
                      <Collapsible key={activeTool.id}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="group -ml-1 gap-1.5 px-1 text-muted hover:bg-transparent hover:text-foreground"
                          >
                            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                            Más opciones (opcional)
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-3">
                          {optionalFields.map(renderField)}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Adjuntar archivos/imágenes al formulario de la herramienta */}
                    <div className="rounded-xl border border-dashed border-border p-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Adjuntar imagen, PDF, Word, Excel, CSV o TXT"
                        className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
                      >
                        <Paperclip className="h-4 w-4" /> Adjuntar archivo o imagen
                        <span className="text-xs opacity-70">
                          (PDF · Word · Excel · imagen)
                        </span>
                      </button>
                      {attachmentStrip}
                    </div>

                    <Button
                      size="lg"
                      onClick={generate}
                      disabled={loading || extracting || missingRequired}
                      aria-busy={loading}
                      className="w-full"
                    >
                      {loading && messages.length === 0 ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Generando…
                        </>
                      ) : hasAssistant ? (
                        <>
                          <RotateCcw className="h-4 w-4" /> Generar de nuevo
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" /> Generar
                        </>
                      )}
                    </Button>
                  </Card>
                )}

                {/* Conversación / resultado */}
                <Card className={`${isFree ? "" : "mt-4"} p-4 sm:p-5`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted">
                      {isFree ? "Conversación" : "Resultado"}
                    </h3>
                    {hasAssistant && !loading && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetConversation}
                          className="text-muted hover:text-foreground"
                        >
                          <Plus className="h-4 w-4" /> Nueva
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyLast}
                          className="text-primary hover:bg-primary/10 hover:text-primary"
                        >
                          <Copy className="h-4 w-4" /> Copiar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div aria-live="polite" aria-busy={loading}>
                    {visibleMessages.length > 0 ? (
                      <div className="space-y-4">
                        {visibleMessages.map((m, i) => {
                          if (m.role === "user") {
                            return (
                              <div
                                key={i}
                                className="ml-auto flex max-w-[85%] flex-col items-end gap-1.5"
                              >
                                {m.images && m.images.length > 0 && (
                                  <div className="flex flex-wrap justify-end gap-1.5">
                                    {m.images.map((img, k) => (
                                      <img
                                        key={k}
                                        src={`data:${img.mediaType};base64,${img.data}`}
                                        alt="Imagen de referencia"
                                        className="max-h-44 max-w-full rounded-xl border border-border object-cover"
                                      />
                                    ))}
                                  </div>
                                )}
                                {m.docs && m.docs.length > 0 && (
                                  <div className="flex flex-wrap justify-end gap-1.5">
                                    {m.docs.map((d, k) => (
                                      <div
                                        key={k}
                                        className="flex max-w-[220px] items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5"
                                      >
                                        {docIcon(d.name)}
                                        <span
                                          className="truncate text-xs text-foreground"
                                          title={d.name}
                                        >
                                          {d.name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {m.content && (
                                  <div className="rounded-2xl rounded-br-sm bg-primary/10 px-3.5 py-2 text-sm text-foreground">
                                    {m.content}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          // Mensaje en curso: texto plano (fluido, sin re-parsear
                          // Markdown en cada frame). Al terminar, se formatea.
                          const streaming =
                            loading && i === visibleMessages.length - 1;
                          return (
                            <div key={i}>
                              {streaming ? (
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                                  {extractPostSpec(extractImagePrompts(m.content).body).body}
                                  <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
                                </div>
                              ) : (
                                (() => {
                                  const tables = parseMarkdownTables(m.content);
                                  const postsTable = tables.find((t) =>
                                    t.headers.some((h) => /copy/i.test(h))
                                  );
                                  const isLast = i === visibleMessages.length - 1;
                                  const btn =
                                    "flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground/80 transition hover:bg-surface-2 hover:text-foreground";
                                  return (
                                    <>
                                      {postsTable && cardView ? (
                                        <PostCards table={postsTable} />
                                      ) : (
                                        <AssistantMessage content={m.content} />
                                      )}
                                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                                        {postsTable && (
                                          <div className="mr-1 inline-flex rounded-lg border border-border p-0.5">
                                            <button
                                              onClick={() => setCardView(true)}
                                              className={`rounded-md px-2 py-0.5 text-xs transition ${cardView ? "bg-primary/10 font-semibold text-primary" : "text-muted hover:text-foreground"}`}
                                            >
                                              Tarjetas
                                            </button>
                                            <button
                                              onClick={() => setCardView(false)}
                                              className={`rounded-md px-2 py-0.5 text-xs transition ${!cardView ? "bg-primary/10 font-semibold text-primary" : "text-muted hover:text-foreground"}`}
                                            >
                                              Tabla
                                            </button>
                                          </div>
                                        )}
                                        <button
                                          onClick={() => copyText(m.content, "Respuesta copiada")}
                                          className={btn}
                                        >
                                          <Copy className="h-3 w-3" /> Copiar todo
                                        </button>
                                        {postsTable && (
                                          <button onClick={() => downloadCsv(postsTable)} className={btn}>
                                            <Download className="h-3.5 w-3.5" /> CSV
                                          </button>
                                        )}
                                        {isLast && (
                                          <button onClick={regenerate} className={btn}>
                                            <RotateCcw className="h-3.5 w-3.5" /> Regenerar
                                          </button>
                                        )}
                                        {isLast && postsTable && (
                                          <>
                                            <span className="ml-auto text-xs text-muted">Ajustar:</span>
                                            <button
                                              onClick={() =>
                                                sendFollowup("Hazlos más cortos y directos, mismo formato de tabla.")
                                              }
                                              className={btn}
                                            >
                                              Más corto
                                            </button>
                                            <button
                                              onClick={() =>
                                                sendFollowup("Hazlos más aspiracionales y de estilo de vida, mismo formato de tabla.")
                                              }
                                              className={btn}
                                            >
                                              Más aspiracional
                                            </button>
                                            <button
                                              onClick={() =>
                                                sendFollowup("Dame otras 3 ideas distintas sobre el mismo tema, mismo formato de tabla.")
                                              }
                                              className={btn}
                                            >
                                              Otras 3
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : loading ? (
                      <Skeleton />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted">
                        <Sparkles className="h-8 w-8 opacity-50" />
                        <p className="text-sm">
                          {isFree
                            ? "Escribe tu primer mensaje abajo para empezar."
                            : "Completa los campos y pulsa Generar."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cuadro de seguimiento */}
                  {showComposer && (
                    <div className="mt-4 border-t border-border pt-4">
                      {attachmentStrip}
                      <div className="mt-1 flex items-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          aria-label="Adjuntar archivo (imagen, PDF, Word, Excel)"
                          title="Adjuntar imagen, PDF, Word, Excel, CSV o TXT"
                          className="shrink-0 text-muted hover:text-foreground"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Textarea
                          rows={1}
                          value={followup}
                          onChange={(e) => setFollowup(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendFollowup();
                            }
                          }}
                          placeholder={
                            isFree && messages.length === 0
                              ? "Escribe tu mensaje…"
                              : "Responde, adjunta un ejemplo o pide un ajuste…"
                          }
                          className="max-h-32 resize-none"
                        />
                        <Button
                          size="icon"
                          onClick={() => sendFollowup()}
                          disabled={
                            (!followup.trim() &&
                              attachments.length === 0 &&
                              docs.length === 0) ||
                            loading ||
                            extracting
                          }
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* ===================== PANEL DERECHO (escritorio) ===================== */}
      <Card className="hidden w-72 shrink-0 flex-col p-4 xl:flex">
        {historyBody}
      </Card>

      {/* Cajón de historial (móvil/tablet) */}
      <Sheet open={histOpen} onOpenChange={setHistOpen}>
        <SheetContent side="right" title="Historial">
          {historyBody}
        </SheetContent>
      </Sheet>

      {/* Cajón de cuentas / proyectos */}
      <Sheet
        open={accountsOpen}
        onOpenChange={(o) => {
          setAccountsOpen(o);
          if (!o) setEditingAccount(null);
        }}
      >
        <SheetContent side="right" title="Cuentas y proyectos">
          {accountsBody}
        </SheetContent>
      </Sheet>

      {/* ===================== BUSCADOR DE COMANDOS (⌘K / Alt+K) ===================== */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm data-[state=open]:animate-in"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-border">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setPaletteIndex(0);
                }}
                onKeyDown={onPaletteKey}
                placeholder="Buscar herramienta…"
                className="w-full bg-transparent py-4 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted"
              />
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-1.5">
              {paletteResults.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  Sin resultados para “{paletteQuery}”
                </p>
              ) : (
                paletteResults.map((t, i) => {
                  const sel = i === paletteIndex;
                  return (
                    <button
                      key={t.id}
                      onMouseMove={() => setPaletteIndex(i)}
                      onClick={() => runPaletteItem(t.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        sel ? "bg-surface-2" : ""
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chipFor(
                          t.id
                        )}`}
                      >
                        <ToolIcon
                          name={t.icon}
                          className="h-4 w-4"
                          weight={sel ? "fill" : "regular"}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {t.name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {t.tagline}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                  Enter
                </kbd>{" "}
                abrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                  ↑↓
                </kbd>{" "}
                elegir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                  esc
                </kbd>{" "}
                cerrar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
