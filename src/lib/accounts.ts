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

/**
 * Bloque que se añade al prompt de sistema cuando hay una cuenta activa.
 * Va en el "system" (no se muestra en el chat) e instruye a la IA a leer los
 * enlaces con las herramientas web y basar el contenido en el estilo de la cuenta.
 */
export function accountSystemSuffix(a: Account): string {
  const links = a.links.map((l) => `- ${l}`).join("\n");
  return (
    `\n\n## Cuenta/proyecto activo: ${a.name}\n` +
    `Trabajas para esta cuenta. Adapta TODO lo que generes a su voz de marca, línea editorial, temas y formato habitual.\n` +
    (a.notes?.trim() ? `Notas de la cuenta: ${a.notes.trim()}\n` : "") +
    `Enlaces de sus redes/web:\n${links}\n` +
    `Antes de generar, analiza el contenido público real de estos enlaces: usa la herramienta web_fetch para leer cada URL y web_search para completar el contexto (publicaciones recientes, tono, estilo, temas recurrentes y formato). ` +
    `Basa lo que produzcas en esa línea editorial y en esa voz. ` +
    `Si algún enlace no es accesible (muro de login o bloqueo anti-bot), indícalo brevemente y continúa con lo que sí puedas obtener más buenas prácticas del sector. No inventes datos de la cuenta que no hayas podido verificar.`
  );
}
