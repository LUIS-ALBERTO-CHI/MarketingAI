import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

// Cabecera requerida cuando se autentica con un token OAuth (Bearer)
// obtenido de `ant auth login`.
const OAUTH_BETA_HEADER = "oauth-2025-04-20";

// Rutas candidatas al binario `ant` (perfil de sesión de Anthropic).
function antCandidates(): string[] {
  const bin = process.platform === "win32" ? "ant.exe" : "ant";
  const list = ["ant", path.join(os.homedir(), "go", "bin", bin)];
  if (process.env.ANT_PATH) list.unshift(process.env.ANT_PATH);
  return list;
}

// Caché en memoria del token OAuth (se refresca solo antes de expirar).
let tokenCache: { token: string; at: number } | null = null;
const TOKEN_TTL_MS = 4 * 60 * 1000; // relee cada 4 min como máximo

async function getOAuthToken(): Promise<string | null> {
  if (tokenCache && Date.now() - tokenCache.at < TOKEN_TTL_MS) {
    return tokenCache.token;
  }
  for (const bin of antCandidates()) {
    try {
      const { stdout } = await execFileAsync(
        bin,
        ["auth", "print-credentials", "--access-token"],
        { timeout: 15000 }
      );
      const token = stdout.trim();
      if (token) {
        tokenCache = { token, at: Date.now() };
        return token;
      }
    } catch {
      // probar el siguiente candidato
    }
  }
  return null;
}

/**
 * Construye un cliente de Anthropic resolviendo credenciales en este orden:
 *   1. ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN del entorno (cliente por defecto)
 *   2. Token OAuth del perfil de `ant auth login` (Authorization: Bearer)
 * La credencial vive solo en el servidor; nunca llega al navegador.
 */
export async function resolveAnthropicClient(): Promise<Anthropic> {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    return new Anthropic();
  }
  const token = await getOAuthToken();
  if (token) {
    return new Anthropic({
      authToken: token,
      defaultHeaders: { "anthropic-beta": OAUTH_BETA_HEADER },
    });
  }
  // Sin credenciales: devolvemos el cliente por defecto; fallará con un
  // mensaje de autenticación claro que la ruta ya maneja.
  return new Anthropic();
}
