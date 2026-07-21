// Cuentas / Proyectos: agrupan los enlaces de redes (y web) de una marca para
// que la IA los analice y use como contexto en TODAS las herramientas.
// Se guardan en localStorage (igual que el historial), sin backend.

export interface Account {
  id: string;
  name: string;
  /** URLs de perfiles de redes o web de la cuenta */
  links: string[];
  /** Notas opcionales (tono, público, temas a evitar…) */
  notes?: string;
  /** Contacto a mostrar en los posts (WhatsApp, dirección, etc.) */
  contact?: string;
  /** Colores de marca (HEX o descripción) */
  colors?: string;
  /** Tono de voz preferido */
  tone?: string;
}

const KEY = "accounts";
const ACTIVE_KEY = "activeAccountId";

export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAccounts(list: Account[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function loadActiveAccountId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveAccountId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

/** True (con narrowing) si la cuenta existe y tiene al menos un enlace. */
export function accountHasLinks(a: Account | null | undefined): a is Account {
  return !!a && a.links.length > 0;
}

/** True si la cuenta tiene algún dato de marca aprovechable (aunque no tenga enlaces). */
export function accountHasContext(a: Account | null | undefined): a is Account {
  return (
    !!a &&
    !!(
      a.name ||
      a.contact?.trim() ||
      a.colors?.trim() ||
      a.tone?.trim() ||
      a.notes?.trim() ||
      a.links.length
    )
  );
}

/**
 * Contexto de marca que se añade al system SIEMPRE que hay una cuenta activa
 * (no requiere enlaces ni búsqueda web). Hace que la IA use el nombre, contacto,
 * colores y tono de la marca en todo lo que genere.
 */
export function accountBrandBlock(a: Account): string {
  let s = `\n\n## Cuenta/marca activa: ${a.name}\n` +
    `Trabajas para esta marca. Adapta TODO lo que generes a su identidad.\n`;
  if (a.tone?.trim()) s += `Tono de voz: ${a.tone.trim()}.\n`;
  if (a.colors?.trim()) s += `Colores de marca: ${a.colors.trim()}.\n`;
  if (a.contact?.trim())
    s += `Contacto para incluir en los posts de venta (úsalo tal cual, con sus emojis 📲/📍): ${a.contact.trim()}.\n`;
  if (a.notes?.trim())
    s +=
      `Notas y FRASES FIJAS de la marca (repite de forma natural las frases fijas en CADA pieza de venta): ${a.notes.trim()}.\n`;
  s += `No inventes datos de la marca que no te haya dado.`;
  return s;
}

/**
 * Bloque que se añade al prompt de sistema cuando hay una cuenta activa.
 * Va en el "system" (no se muestra en el chat) e instruye a la IA a leer los
 * enlaces con las herramientas web y basar el contenido en el estilo de la cuenta.
 */
/**
 * Instrucciones de análisis web de los enlaces de la cuenta. Solo se añade
 * cuando hay enlaces Y el modelo soporta herramientas web (Claude).
 */
export function accountWebBlock(a: Account): string {
  const links = a.links.map((l) => `- ${l}`).join("\n");
  return (
    `\n\nEnlaces de sus redes/web:\n${links}\n` +
    `Antes de generar, analiza el contenido público real de estos enlaces: usa la herramienta web_fetch para leer cada URL y web_search para completar el contexto (publicaciones recientes, tono, estilo, temas recurrentes y formato). ` +
    `Basa lo que produzcas en esa línea editorial y en esa voz. ` +
    `Si algún enlace no es accesible (muro de login o bloqueo anti-bot), indícalo brevemente y continúa con lo que sí puedas obtener más buenas prácticas del sector. No inventes datos de la cuenta que no hayas podido verificar.`
  );
}
