"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Send,
  Copy,
  Loader2,
  Sun,
  Moon,
  Settings,
  HelpCircle,
  Home as HomeIcon,
  Paperclip,
  Mic,
  Sparkles,
  RotateCcw,
  X,
  ChevronDown,
  Menu,
  History,
} from "lucide-react";
import { TOOLS, getTool, FREE_TOOL, systemFor, ACCOUNT_FIELD } from "@/lib/tools";
import { ToolIcon } from "@/components/Icon";
import { LogoMark } from "@/components/Logo";
import { Markdown } from "@/components/Markdown";
import { Select } from "@/components/ui/Select";
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

type Msg = { role: "user" | "assistant"; content: string };

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
  const bodyRef = useRef<HTMLDivElement>(null);

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

    const t = params.get("tool");
    if (t && getTool(t)) setSelectedId(t);
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
    try {
      localStorage.setItem("conversations", JSON.stringify(list.slice(0, 20)));
    } catch {}
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
    web = false
  ) {
    setLoading(true);
    setMessages([...baseMsgs, { role: "assistant", content: "" }]);
    let acc = "";
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, messages: baseMsgs, web }),
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
      if (acc && !acc.startsWith("**[Error")) {
        const finalMsgs: Msg[] = [...baseMsgs, { role: "assistant", content: acc }];
        const firstUser = baseMsgs.find((m) => m.role === "user");
        const title =
          synthetic || !firstUser ? toolName : firstUser.content.slice(0, 48);
        upsertConversation({
          id: convId,
          toolId,
          toolName,
          title,
          syntheticFirst: synthetic,
          messages: finalMsgs,
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
    if (!selectedId || loading || missingRequired) return;
    const t = getTool(selectedId);
    if (!t) return;
    const convId = newId();
    setCurrentConvId(convId);
    setSyntheticFirst(true);

    let content = t.buildPrompt(inputs);
    const acct = inputs.cuenta?.trim();
    const web = !!(t.webAware && acct);
    if (web) {
      content +=
        `\n\nCUENTA A ANALIZAR: ${acct}\n` +
        `Busca información pública real de esta cuenta/marca (perfil, publicaciones recientes, temas y estilo) y adapta el contenido para que encaje con su tipo de contenido, tono y formato habituales. ` +
        `Si no encuentras datos fiables, dilo con claridad y continúa aplicando buenas prácticas del sector.`;
    }

    runTurn(systemFor(t), [{ role: "user", content }], t.id, t.name, convId, true, web);
  }

  function sendFollowup() {
    const text = followup.trim();
    if (!text || loading) return;
    const t = getTool(selectedId ?? FREE_TOOL.id) ?? FREE_TOOL;
    const convId = currentConvId ?? newId();
    if (!currentConvId) setCurrentConvId(convId);
    const base: Msg[] = [
      ...messages.filter((m) => m.content),
      { role: "user", content: text },
    ];
    setFollowup("");
    runTurn(systemFor(t), base, t.id, t.name, convId, syntheticFirst);
  }

  function submitHomePrompt() {
    const p = inputs.prompt?.trim();
    if (!p || loading) return;
    const convId = newId();
    setSelectedId(FREE_TOOL.id);
    setCurrentConvId(convId);
    setSyntheticFirst(false);
    runTurn(
      systemFor(FREE_TOOL),
      [{ role: "user", content: p }],
      FREE_TOOL.id,
      FREE_TOOL.name,
      convId,
      false
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar herramienta"
          className="bg-surface-2 py-2 pl-9 pr-9"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
          ⌘K
        </kbd>
      </div>

      <ScrollArea className="-mx-1 min-h-0 flex-1 px-1">
        <Button
          variant={selectedId === null ? "subtle" : "ghost"}
          onClick={goHome}
          className={`mb-1 h-9 w-full justify-start gap-3 px-3 font-medium ${
            selectedId === null ? "text-foreground" : ""
          }`}
        >
          <HomeIcon className="h-5 w-5" /> Inicio
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
                  <ToolIcon name={t.icon} className="h-4 w-4" />
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

      <div className="mt-3 flex items-center gap-2.5 px-1">
        <Avatar>
          <AvatarFallback className="bg-gradient-to-br from-primary to-violet-500">
            LC
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            Luis Casanova
          </p>
          <p className="truncate text-xs text-muted">luis.casanova@fwa.eu</p>
        </div>
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

  return (
    <div className="flex h-screen gap-3 bg-background p-2 sm:p-3">
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
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted sm:inline-flex">
              Claude Opus 4.8
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setHistOpen(true)}
              aria-label="Abrir historial"
              className="xl:hidden"
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
                      className="group h-auto w-full justify-start gap-3 rounded-2xl p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
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
                  <div className="flex items-center justify-between px-1 pb-1">
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <span className="flex items-center gap-1.5 px-2 py-1">
                        <Paperclip className="h-3.5 w-3.5" /> Adjuntar
                      </span>
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
                            onClick={submitHomePrompt}
                            disabled={!inputs.prompt?.trim() || loading}
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
                    <ToolIcon name={activeTool.icon} className="h-5 w-5" />
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

                    <Button
                      size="lg"
                      onClick={generate}
                      disabled={loading || missingRequired}
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
                        {visibleMessages.map((m, i) =>
                          m.role === "user" ? (
                            <div
                              key={i}
                              className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary/10 px-3.5 py-2 text-sm text-foreground"
                            >
                              {m.content}
                            </div>
                          ) : (
                            <div key={i}>
                              <Markdown>{m.content}</Markdown>
                              {loading && i === visibleMessages.length - 1 && (
                                <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
                              )}
                            </div>
                          )
                        )}
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
                    <div className="mt-4 flex items-end gap-2 border-t border-border pt-4">
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
                            : "Responde o pide un ajuste…"
                        }
                        className="max-h-32 resize-none"
                      />
                      <Button
                        size="icon"
                        onClick={sendFollowup}
                        disabled={!followup.trim() || loading}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
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
    </div>
  );
}
