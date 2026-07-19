# MarketingAI 🎯

Suite de herramientas de **marketing con IA** construida con **Next.js 15** y la **API de Claude (Anthropic)**. Genera posts, copys, ideas, emails, anuncios, calendarios de contenido y más — con respuesta en streaming (tiempo real).

Diseño: estilo **SaaS minimalista y limpio** (layout de 3 columnas, superficies blancas sobre fondo gris claro, tipografía Inter, acentos de color por herramienta) con **modo claro/oscuro**. Resultado en Markdown enriquecido (tablas, títulos, listas).

## Herramientas incluidas

- **Generador de Posts** — publicaciones nativas por red social
- **Copywriting Publicitario** — textos persuasivos (AIDA/PAS)
- **Ideas & Campañas** — brainstorming de contenido y campañas
- **Email Marketing** — asuntos, secuencias y newsletters
- **SEO & Hashtags** — keywords, hashtags y meta-descripciones
- **Anuncios Pagados** — Google Ads, Meta Ads, TikTok Ads
- **Calendario de Contenido** — plan editorial por días
- **Mejorar / Reescribir** — pule y adapta cualquier texto

## Requisitos

- Node.js 18.18+ (recomendado 20+)
- Credenciales de la API de Claude (ver abajo)

## Credenciales

La app resuelve las credenciales en el servidor (nunca en el navegador) en este orden:

1. `ANTHROPIC_API_KEY` (o `ANTHROPIC_AUTH_TOKEN`) en `.env.local`, si está definida.
2. **Sesión OAuth del CLI `ant`** (`ant auth login`) — no requiere API key de la Consola.

### Opción recomendada si no tienes acceso a la Consola: sesión OAuth (`ant`)

Ideal cuando tu cuenta es de una organización y no puedes crear una API key.
Requiere que tu cuenta tenga el scope `user:inference`.

1. Instala el CLI de Anthropic (con Go): 
   ```bash
   go install github.com/anthropics/anthropic-cli/cmd/ant@latest
   ```
2. Inicia sesión en el navegador:
   ```powershell
   & "$env:USERPROFILE\go\bin\ant.exe" auth login
   ```
3. Arranca la app. El servidor obtiene el token con
   `ant auth print-credentials --access-token` y lo envía como
   `Authorization: Bearer` (con la cabecera beta `oauth-2025-04-20`),
   refrescándolo automáticamente.

> El token de sesión caduca cada pocas horas y se refresca solo; el *refresh token*
> caduca cada cierto tiempo — si algún día falla la autenticación, vuelve a ejecutar
> `ant auth login`. Si `ant` no está en el PATH, la app lo busca en `~/go/bin/ant.exe`
> (o define `ANT_PATH` con la ruta completa).

### Alternativa: API key clásica

Copia `.env.example` a `.env.local` y pega tu clave de
https://console.anthropic.com/settings/keys :

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

### Despliegue en Vercel (o cualquier hosting)

**Importante:** el inicio de sesión con `ant` (OAuth) funciona **solo en tu equipo local**.
En la nube no existe ese comando ni tu sesión, así que **debes** configurar una API key:

1. En Vercel: **Project → Settings → Environment Variables**.
2. Añade `ANTHROPIC_API_KEY` con tu clave de la API.
3. Vuelve a desplegar (**Redeploy**).

Sin esa variable, la app mostrará *"Could not resolve authentication method"* porque el
servidor no tiene con qué autenticarse. (Requiere una API key real; la sesión de `ant`
no sirve en producción porque es local y de corta duración.)

## Puesta en marcha

```bash
cd D:\MarketingAI
npm install
npm run dev
```

Abre http://localhost:3000

## Producción

```bash
npm run build
npm start
```

## Arquitectura

```
src/
  app/
    layout.tsx            # fuentes + metadatos
    page.tsx              # UI principal (cliente): sidebar + formulario + resultado
    globals.css          # estilos + fondo con degradados (glassmorphism)
    api/generate/route.ts# ruta servidor: llama a Claude con streaming
  components/Icon.tsx     # iconos SVG (lucide-react)
  lib/tools.ts           # catálogo de herramientas y sus prompts
```

Cambiar el modelo: define `MARKETING_AI_MODEL` en `.env.local` (por defecto `claude-opus-4-8`).
