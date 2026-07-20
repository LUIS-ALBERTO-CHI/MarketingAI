// Catálogo de herramientas de marketing con IA.
// Cada herramienta define su formulario y cómo construir el prompt para Claude.

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

const TONOS = [
  "Profesional",
  "Cercano y amigable",
  "Divertido y desenfadado",
  "Inspirador",
  "Urgente / persuasivo",
  "Elegante / premium",
];

const REDES = ["Instagram", "LinkedIn", "TikTok", "X (Twitter)", "Facebook", "YouTube"];

export const TOOLS: Tool[] = [
  {
    id: "posts",
    name: "Generador de Posts",
    tagline: "Publicaciones para redes sociales listas para publicar",
    icon: "Megaphone",
    system:
      "Eres un community manager experto y estratega de redes sociales. Escribes posts nativos para cada plataforma, con ganchos potentes en la primera línea, estructura clara y una llamada a la acción. Usas emojis con criterio (no en exceso) e incluyes hashtags relevantes al final.",
    fields: [
      { name: "red", label: "Red social", type: "select", options: REDES, required: true },
      { name: "tema", label: "Tema o producto", type: "text", placeholder: "Ej: lanzamiento de nuestra app de finanzas", required: true },
      { name: "objetivo", label: "Objetivo", type: "select", options: ["Dar a conocer", "Generar interacción", "Vender", "Educar", "Fidelizar"] },
      { name: "tono", label: "Tono", type: "select", options: TONOS },
      { name: "extra", label: "Detalles adicionales", type: "textarea", placeholder: "Público objetivo, promociones, datos clave...", rows: 3 },
    ],
    buildPrompt: (v) =>
      `Crea 3 variantes de post para ${v.red} sobre: "${v.tema}".\n` +
      `Objetivo principal: ${v.objetivo || "generar interacción"}.\n` +
      `Tono: ${v.tono || "cercano y amigable"}.\n` +
      (v.extra ? `Contexto adicional: ${v.extra}\n` : "") +
      `Para cada variante incluye: gancho, cuerpo, llamada a la acción y una línea de hashtags. Numera las variantes.`,
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
    id: "email",
    name: "Email Marketing",
    tagline: "Secuencias y newsletters que se abren y se leen",
    icon: "Mail",
    system:
      "Eres especialista en email marketing. Escribes asuntos con alta tasa de apertura, preheaders efectivos y cuerpos de email estructurados con una única llamada a la acción clara.",
    fields: [
      { name: "tipo", label: "Tipo de email", type: "select", options: ["Newsletter", "Email de bienvenida", "Email de venta / oferta", "Carrito abandonado", "Reactivación", "Anuncio / lanzamiento"], required: true },
      { name: "producto", label: "Producto / tema", type: "text", placeholder: "Ej: oferta de Black Friday", required: true },
      { name: "audiencia", label: "Audiencia", type: "text", placeholder: "Ej: clientes que compraron hace +3 meses" },
      { name: "tono", label: "Tono", type: "select", options: TONOS },
      { name: "extra", label: "Detalles (oferta, fechas, enlaces)", type: "textarea", rows: 3 },
    ],
    buildPrompt: (v) =>
      `Escribe un email de tipo "${v.tipo}" sobre: "${v.producto}".\n` +
      (v.audiencia ? `Audiencia: ${v.audiencia}.\n` : "") +
      `Tono: ${v.tono || "cercano"}.\n` +
      (v.extra ? `Detalles: ${v.extra}\n` : "") +
      `Entrega: 3 opciones de asunto (con estimación de por qué funcionan), 1 preheader, y el cuerpo completo del email con una única llamada a la acción.`,
  },
  {
    id: "seo",
    name: "SEO & Hashtags",
    tagline: "Palabras clave, hashtags y meta-descripciones",
    icon: "Hash",
    system:
      "Eres experto en SEO y descubrimiento de contenido. Propones palabras clave con intención de búsqueda, hashtags relevantes por plataforma y meta-descripciones optimizadas.",
    fields: [
      { name: "tema", label: "Tema / producto", type: "text", placeholder: "Ej: zapatillas de running sostenibles", required: true },
      { name: "canal", label: "Canal", type: "select", options: ["Google (SEO web)", "Instagram", "TikTok", "YouTube", "LinkedIn"] },
      { name: "extra", label: "Contexto adicional", type: "textarea", rows: 2, placeholder: "Ubicación, público, competencia..." },
    ],
    buildPrompt: (v) =>
      `Para el tema "${v.tema}" y el canal "${v.canal || "Google (SEO web)"}", entrega:\n` +
      `1) 10-15 palabras clave / términos con su intención de búsqueda,\n` +
      `2) un set de hashtags recomendados agrupados por alcance (amplios, nicho, marca) si el canal es social,\n` +
      `3) una meta-descripción o bio optimizada (máx. 155 caracteres).\n` +
      (v.extra ? `Contexto: ${v.extra}` : ""),
  },
  {
    id: "ads",
    name: "Anuncios Pagados",
    tagline: "Google Ads y Meta Ads listos para lanzar",
    icon: "Target",
    system:
      "Eres especialista en publicidad de pago (Google Ads y Meta Ads). Escribes anuncios que cumplen límites de caracteres, con ganchos, beneficios y CTAs claros, y sugieres segmentación.",
    fields: [
      { name: "plataforma", label: "Plataforma", type: "select", options: ["Google Ads (búsqueda)", "Meta Ads (Facebook/Instagram)", "TikTok Ads"], required: true },
      { name: "producto", label: "Producto / oferta", type: "text", placeholder: "Ej: software de facturación para autónomos", required: true },
      { name: "audiencia", label: "Público objetivo", type: "text", placeholder: "Ej: autónomos y pymes en España" },
      { name: "extra", label: "Oferta / ángulo", type: "textarea", rows: 2, placeholder: "Descuento, prueba gratis, propuesta única..." },
    ],
    buildPrompt: (v) =>
      `Crea una campaña de anuncios para ${v.plataforma} promocionando: "${v.producto}".\n` +
      (v.audiencia ? `Público: ${v.audiencia}.\n` : "") +
      (v.extra ? `Ángulo/oferta: ${v.extra}.\n` : "") +
      `Entrega, respetando los límites de caracteres de la plataforma: varios titulares, descripciones, textos principales y CTAs. Añade una sugerencia breve de segmentación.`,
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
  {
    id: "competitor",
    name: "Análisis de Competencia",
    tagline: "Compara, detecta huecos y encuentra oportunidades",
    icon: "TrendingUp",
    system:
      "Eres analista de marketing estratégico. Analizas competidores con rigor: posicionamiento, propuesta de valor, contenido, fortalezas y debilidades, y detectas oportunidades accionables. Trabajas con la información que te dé el usuario y tu conocimiento general; cuando hagas una suposición, indícalo claramente y no inventes datos concretos (cifras, precios exactos) que no puedas conocer.",
    fields: [
      { name: "marca", label: "Tu marca / producto", type: "text", placeholder: "Ej: nuestra cafetería de especialidad", required: true },
      { name: "competidores", label: "Competidores a analizar", type: "textarea", rows: 3, placeholder: "Lista de competidores (uno por línea o separados por comas)", required: true },
      { name: "sector", label: "Sector / mercado", type: "text", placeholder: "Ej: cafeterías en Madrid centro" },
      { name: "foco", label: "Foco del análisis", type: "select", options: ["General (360°)", "Posicionamiento y marca", "Contenido y redes sociales", "Propuesta de valor", "Estrategia de precios", "Público objetivo"] },
      { name: "extra", label: "Contexto adicional", type: "textarea", rows: 3, placeholder: "Lo que sepas de cada competidor, tus objetivos, tu diferenciación..." },
    ],
    buildPrompt: (v) =>
      `Realiza un análisis de competencia para "${v.marca}".\n` +
      `Competidores a analizar:\n${v.competidores}\n` +
      (v.sector ? `Sector/mercado: ${v.sector}.\n` : "") +
      `Foco principal: ${v.foco || "General (360°)"}.\n` +
      (v.extra ? `Contexto: ${v.extra}\n` : "") +
      `Entrega:\n` +
      `1) Una tabla comparativa (competidor | propuesta de valor | fortalezas | debilidades | tono/contenido).\n` +
      `2) Un breve análisis DAFO/SWOT centrado en tu marca frente a esa competencia.\n` +
      `3) Huecos de mercado y oportunidades sin cubrir.\n` +
      `4) 3-5 recomendaciones accionables y priorizadas para diferenciarte.\n` +
      `Marca claramente cualquier suposición; no inventes cifras o precios exactos.`,
  },
  {
    id: "design",
    name: "Diseño & Dirección de Arte",
    tagline: "Conceptos y prompts para diseños que no parecen hechos por IA",
    icon: "Palette",
    system:
      "Eres director de arte y diseñador gráfico sénior de una agencia premium. Traduces una marca en una dirección visual concreta y accionable: paleta (con códigos HEX), tipografías reales, composición, jerarquía y estética. Generas prompts de imagen en inglés, específicos, con sujeto, estilo, encuadre, iluminación y color. Tu obsesión es que el resultado se vea profesional y HUMANO, nunca con el aspecto genérico de 'IA': evitas tipografías cliché (Inter, Roboto, Arial, fuentes de sistema), degradados morados sobre blanco/negro, composiciones simétricas y predecibles, brillos de plástico y el look de banco de imágenes. Buscas carácter, intención, imperfección deliberada y coherencia de marca. " +
      "IMPORTANTE: la aplicación genera imágenes automáticamente a partir de los prompts que marques con [[IMG]]. Cada prompt de imagen debe ir en su PROPIA línea, empezando EXACTAMENTE con `[[IMG]] ` seguido del prompt en inglés y nada más en esa línea. Sin viñetas, sin comillas, sin numeración y sin bloque de código en esas líneas. Los prompts describen una imagen fotográfica o ilustrada SIN texto ni logotipos embebidos (los generadores fallan con texto).",
    fields: [
      {
        name: "pieza",
        label: "Tipo de diseño",
        type: "select",
        options: [
          "Post para redes",
          "Historia / Story",
          "Flyer / Cartel",
          "Portada / Banner",
          "Miniatura de video",
          "Concepto de logo",
          "Diapositiva / Presentación",
          "Empaque / Packaging",
        ],
        required: true,
      },
      {
        name: "marca",
        label: "Marca / tema",
        type: "text",
        placeholder: "Ej: cafetería de especialidad 'Aurora'",
        required: true,
      },
      {
        name: "estetica",
        label: "Estética",
        type: "select",
        options: [
          "Minimalista premium",
          "Elegante / lujo",
          "Moderno y fresco",
          "Editorial",
          "Retro / vintage",
          "Orgánico / natural",
          "Corporativo",
          "Divertido y colorido",
        ],
      },
      {
        name: "colores",
        label: "Colores de marca (opcional)",
        type: "text",
        placeholder: "HEX o descripción; o deja que la IA proponga",
      },
      {
        name: "generador",
        label: "¿Para qué generador de imágenes?",
        type: "select",
        options: [
          "Midjourney",
          "DALL·E / ChatGPT",
          "Ideogram (bueno con texto)",
          "Genérico / cualquiera",
        ],
      },
      {
        name: "extra",
        label: "Mensaje, elementos y público",
        type: "textarea",
        rows: 3,
        placeholder:
          "Qué debe comunicar, texto que va en la pieza, público objetivo, elementos obligatorios…",
      },
    ],
    buildPrompt: (v) =>
      `Crea la dirección de arte para: "${v.marca}".\n` +
      `Pieza: ${v.pieza}. Estética: ${v.estetica || "minimalista premium"}.\n` +
      (v.colores ? `Colores de marca: ${v.colores}.\n` : "Propón una paleta adecuada.\n") +
      (v.extra ? `Contexto: ${v.extra}\n` : "") +
      `\nEntrega en este orden, en formato claro y escaneable:\n` +
      `1) **Concepto** (2-3 líneas): la idea visual y qué sensación transmite.\n` +
      `2) **Sistema visual**: paleta con códigos HEX (indicando para qué usar cada color), 1-2 tipografías reales con su rol (título / cuerpo), estilo de imagen o ilustración, tratamiento (formas, texturas, sombras, espaciado) y una descripción del layout y la jerarquía para un(a) ${v.pieza}.\n` +
      `3) **Para que NO parezca IA**: 4-5 recomendaciones concretas para esta pieza —qué evitar y cómo lograr un acabado humano, profesional y con carácter de marca. Si vas a poner texto en la pieza (título, precio), hazlo tú después en un editor; no lo metas en el prompt.\n` +
      `\nAl FINAL de todo, sin ningún encabezado, escribe exactamente 2 líneas sueltas que empiecen con \`[[IMG]] \` seguidas de un prompt en inglés (sujeto, estilo, encuadre, iluminación, color; SIN texto ni logotipos embebidos). La app las convierte en imágenes reales, así que no las numeres ni las pongas en viñetas ni en bloque de código.\n` +
      `Marca cualquier suposición. No uses tipografías cliché ni degradados morados genéricos.`,
  },
  {
    id: "content-table",
    name: "Ideas de Posts (Tema · Copy · Inspo)",
    tagline: "Pasa un tema y recibe una tabla lista: gancho, copy e inspiración",
    icon: "Table",
    system:
      "Eres estratega de contenido y copywriter sénior. A partir de un tema o idea, produces una tabla lista para trabajar con 3 columnas: Tema (título/gancho), Copy (texto completo listo para publicar) e Inspo (referencia visual). Escribes en español de México, con copy persuasivo, estructura clara (gancho, beneficios, CTA) y emojis usados con criterio. Devuelves siempre una tabla Markdown válida.",
    fields: [
      {
        name: "tema",
        label: "Tema o idea",
        type: "textarea",
        rows: 3,
        placeholder:
          "Ej: convocatoria de inscripciones para la carrera de enfermería con promo de descuento",
        required: true,
      },
      {
        name: "cantidad",
        label: "Cuántas ideas",
        type: "select",
        options: ["3", "5", "8"],
      },
      { name: "red", label: "Red social", type: "select", options: REDES },
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
        placeholder:
          "Dirección, WhatsApp/enlace, promoción, fechas, público objetivo…",
      },
    ],
    buildPrompt: (v) =>
      `Genera ${v.cantidad || "5"} ideas de publicación sobre: "${v.tema}".\n` +
      (v.red ? `Red social: ${v.red}.\n` : "") +
      (v.negocio ? `Negocio/marca: ${v.negocio}.\n` : "") +
      (v.datos ? `Datos a incluir cuando aplique: ${v.datos}\n` : "") +
      `\nDevuelve EXCLUSIVAMENTE una tabla en Markdown (GFM) con EXACTAMENTE estas 3 columnas: Tema | Copy | Inspo. Una fila por idea. Reglas de formato estrictas:\n` +
      `- Usa la etiqueta <br> para TODOS los saltos de línea dentro de las celdas (nunca saltos reales ni viñetas con guion, que rompen la tabla). NUNCA uses el carácter | dentro de una celda.\n` +
      `- **Tema**: un título corto en MAYÚSCULAS y, debajo (con <br>), 2-4 líneas con el ángulo o gancho; si aplica una acción pendiente, anótala como "AGREGAR PROMO %".\n` +
      `- **Copy**: el texto COMPLETO listo para publicar, con gancho, cuerpo, beneficios (usa ✅), una llamada a la acción clara y —cuando haya datos— dirección con 📍 y contacto con 📲. Saltos con <br>. En español de México.\n` +
      `- **Inspo**: un enlace de BÚSQUEDA de Pinterest para inspiración visual, en formato [ver inspiración](https://www.pinterest.com/search/pins/?q=TERMINOS) con TERMINOS en inglés separados por %20. No inventes enlaces a pines concretos; usa la búsqueda.\n` +
      `No escribas nada antes ni después de la tabla y no la envuelvas en bloque de código.`,
  },
  {
    id: "post-image",
    name: "Post con imagen",
    tagline: "Genera una publicación diseñada (texto perfecto) lista para descargar",
    icon: "PostImage",
    system:
      "Eres director de arte. A partir de un tema, defines el CONTENIDO ESTRUCTURADO de una publicación para redes que la app renderiza como imagen (el texto se dibuja en HTML, así que sale nítido). Eliges una paleta coherente y profesional, y un fondo (foto/ilustración) que combine con la marca, sin texto embebido. El texto visible va en español de México, breve y con gancho.",
    fields: [
      {
        name: "tema",
        label: "Tema o idea del post",
        type: "textarea",
        rows: 2,
        placeholder: "Ej: promo de vacunación y desparasitación para mascotas",
        required: true,
      },
      {
        name: "negocio",
        label: "Marca / negocio",
        type: "text",
        placeholder: "Ej: Veterinaria Godínez",
      },
      {
        name: "contacto",
        label: "Contacto a mostrar (opcional)",
        type: "text",
        placeholder: "Ej: 📲 999 105 3995 · 📍 Centro, Mérida",
      },
      {
        name: "estetica",
        label: "Estética",
        type: "select",
        options: [
          "Moderno oscuro",
          "Minimalista premium",
          "Elegante / lujo",
          "Fresco y colorido",
          "Corporativo",
        ],
      },
      {
        name: "colores",
        label: "Colores de marca (opcional)",
        type: "text",
        placeholder: "HEX o descripción; o deja que la IA proponga",
      },
    ],
    buildPrompt: (v) =>
      `Diseña una publicación sobre: "${v.tema}".\n` +
      (v.negocio ? `Marca: ${v.negocio}.\n` : "") +
      (v.contacto ? `Contacto a mostrar: ${v.contacto}.\n` : "") +
      `Estética: ${v.estetica || "moderno oscuro"}.` +
      (v.colores ? ` Colores: ${v.colores}.` : " Propón una paleta coherente.") +
      `\n\nEscribe 1 línea de introducción y, al FINAL, un ÚNICO bloque \`\`\`json con exactamente esta forma (sin comentarios):\n` +
      `{\n` +
      `  "brand": "nombre de la marca en mayúsculas o vacío",\n` +
      `  "headline": "titular corto y potente (máx ~6 palabras)",\n` +
      `  "subhead": "1 línea de apoyo (opcional)",\n` +
      `  "bullets": ["beneficio 1", "beneficio 2", "beneficio 3"],\n` +
      `  "cta": "llamada a la acción corta (ej. Agenda hoy)",\n` +
      `  "contact": "línea de contacto con emojis o vacío",\n` +
      `  "palette": { "bg": "#RRGGBB oscuro", "accent": "#RRGGBB vivo", "text": "#RRGGBB claro" },\n` +
      `  "bgPrompt": "prompt en inglés para el fondo (foto o textura acorde al tema, SIN texto ni logos)",\n` +
      `  "ratio": "4:5"\n` +
      `}\n` +
      `Reglas: texto visible en español de México, breve; paleta con buen contraste (bg oscuro, text claro, accent vivo); 3-4 bullets como máximo; el bgPrompt en inglés y sin texto. Devuelve solo la introducción y el bloque json.`,
  },
];

// Herramientas que pueden analizar una cuenta con búsqueda web.
const WEB_AWARE = new Set([
  "posts",
  "copywriting",
  "ideas",
  "email",
  "ads",
  "calendar",
  "video-script",
  "design",
  "content-table",
]);
for (const t of TOOLS) if (WEB_AWARE.has(t.id)) t.webAware = true;

// Herramienta de chat libre para la barra de entrada del inicio.
export const FREE_TOOL: Tool = {
  id: "free",
  name: "Chat libre",
  tagline: "Pídele lo que necesites",
  icon: "Sparkles",
  system:
    "Eres un asistente experto en marketing digital: estrategia, contenido, copywriting, redes sociales, SEO, email y publicidad. Respondes de forma clara, práctica y accionable, con formato Markdown cuando ayude a la legibilidad.",
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
