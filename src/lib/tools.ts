// Catálogo de herramientas de marketing con IA.
// Simplificado: UNA sola herramienta principal ("Generador de Posts") que
// SIEMPRE devuelve la misma tabla lista para publicar: Post · Copy · Inspo · Hashtags.

export type FieldType = "text" | "textarea" | "select";

export interface ToolField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  rows?: number;
}

export interface Tool {
  id: string;
  name: string;
  tagline: string;
  /** Nombre de icono de lucide-react */
  icon: string;
  /** Sistema (rol/experto) que orienta a Claude */
  system: string;
  fields: ToolField[];
  /** Construye el mensaje del usuario a partir de los inputs del formulario */
  buildPrompt: (v: Record<string, string>) => string;
  /** Si true, ofrece analizar una cuenta con búsqueda web */
  webAware?: boolean;
}

// Campo opcional para analizar una cuenta de redes con búsqueda web.
export const ACCOUNT_FIELD: ToolField = {
  name: "cuenta",
  label: "Cuenta a analizar (opcional)",
  type: "text",
  placeholder: "URL o @usuario — la IA analiza su estilo de contenido",
};

const REDES = ["Instagram", "LinkedIn", "TikTok", "X (Twitter)", "Facebook", "YouTube"];

const TONOS = [
  "Profesional",
  "Cercano y amigable",
  "Divertido y desenfadado",
  "Inspirador",
  "Urgente / persuasivo",
  "Elegante / premium",
];

// ---------------------------------------------------------------------------
// FORMATO ESTÁNDAR DE RESPUESTA (compartido por la herramienta y el chat libre).
// Siempre una tabla Markdown con 4 columnas: Post | Copy | Inspo | Hashtags.
// ---------------------------------------------------------------------------
export const TABLE_FORMAT = `Devuelve EXCLUSIVAMENTE una tabla en Markdown (GFM) con EXACTAMENTE estas 4 columnas, en este orden:

Post | Copy | Inspo | Hashtags

Una fila por idea de publicación. Reglas de formato ESTRICTAS (o la tabla se rompe):
- Usa la etiqueta <br> para TODOS los saltos de línea dentro de las celdas (nunca saltos de línea reales ni viñetas con guion). NUNCA uses el carácter | dentro de una celda.
- **Post**: un título corto en MAYÚSCULAS y, debajo (con <br>), 2-4 líneas con el ángulo o gancho. Si falta una acción del usuario, anótala como "AGREGAR PROMO %" o similar.
- **Copy**: el texto COMPLETO listo para publicar (gancho + cuerpo + beneficios con ✅ + una llamada a la acción clara). Cuando haya datos, incluye dirección con 📍 y contacto con 📲. Saltos con <br>. Español de México, con gancho y emojis usados con criterio.
- **Inspo**: un enlace de BÚSQUEDA de Pinterest para inspiración visual, en formato [ver inspiración](https://www.pinterest.com/search/pins/?q=TERMINOS) con TERMINOS en inglés separados por %20. No inventes enlaces a pines concretos; usa siempre la búsqueda.
- **Hashtags**: de 6 a 12 hashtags relevantes para la plataforma y el tema, separados por espacios (ej. #Enfermería #Convocatoria). Sin comas ni el carácter |.

No escribas nada antes ni después de la tabla y no la envuelvas en un bloque de código.`;

export const TABLE_SYSTEM =
  "Eres estratega de contenido y copywriter sénior. A partir de lo que pida el usuario, produces publicaciones listas para trabajar en una tabla de 4 columnas: Post (título/gancho), Copy (texto completo listo para publicar), Inspo (referencia visual de Pinterest) y Hashtags. Escribes en español de México, con copy persuasivo, estructura clara (gancho, beneficios, CTA) y emojis usados con criterio. Devuelves siempre una tabla Markdown válida siguiendo el formato indicado.";

export const TOOLS: Tool[] = [
  {
    id: "posts",
    name: "Generador de Posts",
    tagline: "Describe lo que quieres y recibe posts listos: copy, inspo y hashtags",
    icon: "Table",
    system: TABLE_SYSTEM,
    fields: [
      {
        name: "tema",
        label: "¿Qué quieres?",
        type: "textarea",
        rows: 3,
        placeholder:
          "Ej: convocatoria de inscripciones para enfermería con 20% de descuento; o pega tu texto / arrastra un PDF o imagen",
        required: true,
      },
      { name: "red", label: "Red social (opcional)", type: "select", options: REDES },
      {
        name: "negocio",
        label: "Negocio / marca (opcional)",
        type: "text",
        placeholder: "Ej: IMEI — escuela de enfermería",
      },
      {
        name: "datos",
        label: "Datos a incluir (opcional)",
        type: "textarea",
        rows: 2,
        placeholder: "Dirección, WhatsApp/enlace, promoción, fechas, público objetivo…",
      },
    ],
    buildPrompt: (v) =>
      `Genera de 3 a 5 ideas de publicación sobre: "${v.tema}".\n` +
      (v.red ? `Red social: ${v.red}.\n` : "") +
      (v.negocio ? `Negocio/marca: ${v.negocio}.\n` : "") +
      (v.datos ? `Datos a incluir cuando aplique: ${v.datos}\n` : "") +
      `\n${TABLE_FORMAT}`,
  },
  {
    id: "copywriting",
    name: "Copywriting Publicitario",
    tagline: "Textos persuasivos que convierten",
    icon: "PenLine",
    system:
      "Eres un copywriter de respuesta directa de nivel senior. Dominas frameworks como AIDA, PAS y las 4U. Escribes copy claro, orientado a beneficios y a la conversión, sin relleno.",
    fields: [
      { name: "producto", label: "Producto / servicio", type: "text", placeholder: "Ej: curso online de repostería", required: true },
      { name: "audiencia", label: "Público objetivo", type: "text", placeholder: "Ej: mujeres 25-40 que quieren emprender" },
      { name: "formato", label: "Formato de copy", type: "select", options: ["Anuncio corto", "Página de ventas", "Titulares (headlines)", "Bullets de beneficios", "Email de venta"] },
      { name: "tono", label: "Tono", type: "select", options: TONOS },
      { name: "extra", label: "Puntos de dolor / propuesta de valor", type: "textarea", rows: 3, placeholder: "¿Qué problema resuelve? ¿Qué lo hace único?" },
    ],
    buildPrompt: (v) =>
      `Escribe copy publicitario para: "${v.producto}".\n` +
      `Formato solicitado: ${v.formato || "anuncio corto"}.\n` +
      (v.audiencia ? `Público objetivo: ${v.audiencia}.\n` : "") +
      `Tono: ${v.tono || "persuasivo"}.\n` +
      (v.extra ? `Contexto: ${v.extra}\n` : "") +
      `Aplica un framework de copywriting adecuado y ofrece 2-3 variantes. Explica brevemente el enfoque de cada una.`,
  },
  {
    id: "ideas",
    name: "Ideas & Campañas",
    tagline: "Lluvia de ideas de contenido y campañas",
    icon: "Lightbulb",
    system:
      "Eres un director creativo de marketing. Generas ideas originales, accionables y alineadas con objetivos de negocio, considerando tendencias actuales y formatos que funcionan en cada canal.",
    fields: [
      { name: "sector", label: "Sector / industria", type: "text", placeholder: "Ej: gimnasio boutique", required: true },
      { name: "meta", label: "Meta de negocio", type: "select", options: ["Aumentar seguidores", "Generar leads", "Aumentar ventas", "Mejorar marca", "Lanzar producto"] },
      { name: "cantidad", label: "Cuántas ideas", type: "select", options: ["5", "10", "15"] },
      { name: "extra", label: "Contexto adicional", type: "textarea", rows: 3, placeholder: "Presupuesto, canales, campañas anteriores..." },
    ],
    buildPrompt: (v) =>
      `Genera ${v.cantidad || "10"} ideas de contenido y/o campañas de marketing para el sector "${v.sector}".\n` +
      `Meta principal: ${v.meta || "aumentar ventas"}.\n` +
      (v.extra ? `Contexto: ${v.extra}\n` : "") +
      `Para cada idea indica: título, formato/canal recomendado, breve descripción y por qué funcionaría. Organízalas en una lista numerada.`,
  },
  {
    id: "calendar",
    name: "Calendario de Contenido",
    tagline: "Plan editorial organizado por días",
    icon: "CalendarDays",
    system:
      "Eres planificador de contenidos. Diseñas calendarios editoriales equilibrados (educar, entretener, inspirar, vender) con formatos concretos por día y canal.",
    fields: [
      { name: "sector", label: "Sector / marca", type: "text", placeholder: "Ej: cafetería de especialidad", required: true },
      { name: "periodo", label: "Periodo", type: "select", options: ["1 semana", "2 semanas", "1 mes"] },
      { name: "canal", label: "Canal principal", type: "select", options: REDES },
      { name: "extra", label: "Objetivos / campañas", type: "textarea", rows: 2 },
    ],
    buildPrompt: (v) =>
      `Diseña un calendario de contenido de ${v.periodo || "1 semana"} para "${v.sector}" en ${v.canal || "Instagram"}.\n` +
      (v.extra ? `Objetivos/campañas: ${v.extra}.\n` : "") +
      `Preséntalo como una tabla con columnas: Día | Formato | Tema/Idea | Objetivo | Copy sugerido (breve). Equilibra contenido de valor y de venta.`,
  },
  {
    id: "rewrite",
    name: "Mejorar / Reescribir",
    tagline: "Pule y adapta cualquier texto",
    icon: "Wand2",
    system:
      "Eres editor y copywriter. Mejoras textos manteniendo la intención original: los haces más claros, persuasivos y adaptados al tono pedido, corrigiendo estilo y gramática.",
    fields: [
      { name: "texto", label: "Texto a mejorar", type: "textarea", rows: 6, placeholder: "Pega aquí tu texto...", required: true },
      { name: "objetivo", label: "Qué mejorar", type: "select", options: ["Hacerlo más persuasivo", "Hacerlo más claro/conciso", "Adaptar el tono", "Corregir y pulir estilo", "Acortar", "Alargar / desarrollar"] },
      { name: "tono", label: "Tono objetivo", type: "select", options: TONOS },
    ],
    buildPrompt: (v) =>
      `Mejora el siguiente texto. Objetivo: ${v.objetivo || "hacerlo más persuasivo"}. Tono deseado: ${v.tono || "profesional"}.\n\n` +
      `--- TEXTO ORIGINAL ---\n${v.texto}\n--- FIN ---\n\n` +
      `Devuelve la versión mejorada y, al final, una breve nota (2-3 puntos) explicando los cambios clave.`,
  },
  {
    id: "video-script",
    name: "Guiones de Video",
    tagline: "Guiones para Reels, TikTok, Shorts y YouTube",
    icon: "Clapperboard",
    system:
      "Eres guionista experto en contenido audiovisual para marketing. Escribes guiones con un gancho irresistible en los primeros 3 segundos, estructura por escenas, texto en pantalla, voz en off/diálogo y una llamada a la acción final. Adaptas el ritmo y la duración al formato de cada plataforma.",
    fields: [
      { name: "plataforma", label: "Plataforma / formato", type: "select", options: ["Reel (Instagram)", "TikTok", "YouTube Shorts", "YouTube (vídeo largo)", "Anuncio en vídeo"], required: true },
      { name: "tema", label: "Tema o producto", type: "text", placeholder: "Ej: cómo usar nuestra app en 30 segundos", required: true },
      { name: "duracion", label: "Duración aproximada", type: "select", options: ["15 s", "30 s", "60 s", "1-3 min", "5-10 min"] },
      { name: "tono", label: "Tono", type: "select", options: TONOS },
      { name: "extra", label: "Público, CTA y detalles", type: "textarea", rows: 3, placeholder: "A quién va dirigido, qué acción buscas, recursos disponibles..." },
    ],
    buildPrompt: (v) =>
      `Escribe un guion de vídeo para ${v.plataforma} sobre: "${v.tema}".\n` +
      `Duración objetivo: ${v.duracion || "30 s"}.\n` +
      `Tono: ${v.tono || "cercano y amigable"}.\n` +
      (v.extra ? `Contexto: ${v.extra}\n` : "") +
      `Estructura la respuesta por escenas en una tabla o lista con: tiempo aproximado, imagen/acción, texto en pantalla y voz en off/diálogo. ` +
      `Empieza con un gancho potente en los primeros 3 segundos y cierra con una llamada a la acción clara. ` +
      `Añade al final 2-3 sugerencias de título/caption y notas breves de producción.`,
  },
];

// Herramientas que pueden analizar una cuenta con búsqueda web (solo Claude).
const WEB_AWARE = new Set(["posts", "copywriting", "ideas", "calendar", "video-script"]);
for (const t of TOOLS) if (WEB_AWARE.has(t.id)) t.webAware = true;

// Herramienta de chat libre para la barra de entrada del inicio.
// También devuelve la tabla estándar cuando se piden posts/ideas de contenido.
export const FREE_TOOL: Tool = {
  id: "free",
  name: "Chat libre",
  tagline: "Pídele lo que necesites",
  icon: "Sparkles",
  system:
    "Eres un asistente experto en marketing digital y copywriter sénior. " +
    "Cuando el usuario pida publicaciones, posts, ideas de contenido o copy para redes " +
    "(o simplemente te dé un tema/negocio para promocionar), responde SIEMPRE con la tabla " +
    "estándar de 4 columnas (Post | Copy | Inspo | Hashtags) siguiendo estas reglas:\n\n" +
    TABLE_FORMAT +
    "\n\nSolo cuando el usuario pida claramente OTRA cosa (un ajuste puntual a algo ya entregado, " +
    "una explicación, una estrategia, análisis, etc.) responde en Markdown normal, sin la tabla.",
  fields: [
    { name: "prompt", label: "Tu petición", type: "textarea", required: true, rows: 3 },
  ],
  buildPrompt: (v) => v.prompt,
};

// Persona experta que se antepone al rol de CADA herramienta.
// Hace que las respuestas suenen a agencia de marketing, no a "IA genérica".
export const MARKETING_PERSONA = `Eres un estratega y copywriter de marketing sénior, con más de 15 años de experiencia real en branding, growth, redes sociales, SEO, publicidad de pago, email y contenido. Piensas y respondes como un profesional de primer nivel, NO como un asistente genérico.

Principios que SIEMPRE sigues:
- Ve al grano. Nada de preámbulos ("¡Claro!", "Por supuesto", "Aquí tienes") ni cierres de relleno. Aporta valor desde la primera línea.
- Nunca hables de ti como IA ni añadas descargos innecesarios ("como modelo de lenguaje…"). Escribe con la seguridad de un experto.
- Sé concreto y accionable: recomienda con criterio en vez de enumerar opciones sin más. Si hay varias vías, di cuál elegirías tú y por qué.
- Aplica marcos probados cuando aporten (AIDA, PAS, 4U, gancho–retención–CTA, una sola idea por pieza…), sin nombrarlos salvo que ayude a entender.
- Piensa siempre en: público objetivo, plataforma/canal, objetivo de negocio (alcance / interacción / conversión) y voz de marca. Adapta el registro a cada uno.
- Escribe en **español de México**: usa "tú" (y "ustedes" en plural). NUNCA uses voseo ("vos", "elegí", "poné", "querés") ni expresiones de España ("vale", "guay", "molar", "chaval", "tío", "coger", "ordenador"; di "celular", no "móvil"). Usa vocabulario y modismos naturales para el público mexicano, frescos y actuales, sin clichés ni traducciones forzadas. (Si una cuenta necesita otro país o español neutro, se te indicará más abajo).
- Si el usuario comparte imágenes de referencia o capturas (posts de ejemplo, competencia, moodboard), analízalas con atención: describe su estilo visual, tono, estructura y formato, y propón contenido inspirado en esa línea sin copiarla literalmente.
- Prioriza persuasión y claridad sobre extensión. Menos y mejor: cada palabra debe ganarse su sitio.
- No inventes datos: nada de cifras, precios, estadísticas o "estudios" que no puedas conocer. Si asumes algo, márcalo explícitamente.
- Formatea en Markdown limpio y escaneable (títulos, negritas para lo clave, listas cuando ayuden). Nada de muros de texto.
- Cuando aporte, cierra con UNA sola pregunta o siguiente paso útil para afinar el resultado.

Tu meta no es "responder": es que cada entrega parezca hecha por una buena agencia de marketing que sabe exactamente lo que hace.`;

// Combina la persona global con el rol específico de la herramienta.
export function systemFor(t: Tool): string {
  return `${MARKETING_PERSONA}\n\n## Tu tarea concreta ahora\n${t.system}`;
}

export function getTool(id: string): Tool | undefined {
  if (id === FREE_TOOL.id) return FREE_TOOL;
  return TOOLS.find((t) => t.id === id);
}
