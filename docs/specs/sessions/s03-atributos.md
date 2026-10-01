# s3 — Atributos de montaje, URL de Zoom y fechas/zonas

Estado: LISTA (D-04 y D-25 aprobadas). Depende de: s1 (usa los tipos de s2 si ya existen; si no, los crea en
`src/contract/types.ts` con la misma forma).

## Objetivo

Un único punto de entrada para todo lo que escribe el editor de la landing. Lo que sale de aquí
ya es confiable.

## Archivos

- `src/core/url.ts`
- `src/core/time.ts`
- `src/core/attrs.ts`
- `src/core/attrs.test.ts` (cubre los tres módulos)

## API

```ts
export function safeZoomLink(raw: string): string | null;
// https: + host zoom.us o *.zoom.us; URL absoluta; devuelve url.toString() o null.

export function safeClosedUrl(
  raw: string,
  pageUrl: string,
  allowedHosts?: ReadonlyArray<string>,
): string | null;
// Solo https. Acepta mismo host de la página o host incluido en allowedHosts.

export function parseIsoWithZone(raw: string): number | null;
// Valida por regex estricta y luego parsea. Solo ISO 8601 con offset explícito (Z o ±HH:MM).

export function parseMountAttrs(
  dataset: Readonly<Record<string, string | undefined>>,
  context: { readonly pageUrl: string; readonly closedUrlAllowlist: ReadonlyArray<string> },
  warn?: (message: string) => void,
): MountAttrs;
```

Reglas de `parseMountAttrs` (tabla RF-05 de `01-requisitos.md`):
- `form` desde `data-atfx-leadkit`; valor desconocido → lanzar error tipado `UnknownFormError`
  (el montaje lo ignora en silencio).
- `lang`: primer subtag en minúsculas; fuera de es/en/pt → `es`.
- `webinarDate`: regex `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$`, si no → null.
- `webinarTz`: zona IANA válida para `Intl.DateTimeFormat`; si no, null.
- `bdmOwner`: `^005[A-Za-z0-9]{12}([A-Za-z0-9]{3})?$`, si no → null.
- `opensAt`/`closesAt`: `parseIsoWithZone`; si el atributo existe y no parsea →
  `scheduleInvalid: true` y `warn`.
- `closedUrl`: validar con `safeClosedUrl`; si no pasa, null.
- `country`: `^[A-Z]{2}$`, si no → null.
- Ningún `warn` incluye el valor completo de un atributo de más de 60 caracteres.

## Tests primero

- `safeZoomLink`: `https://atfx.zoom.us/webinar/register/WN_x` ok; `https://zoom.us/j/1` ok;
  `javascript:alert(1)`, `JaVaScRiPt:...`, `data:text/html,...`, `http://zoom.us/...`,
  `https://zoom.us.evil.com/`, `https://evilzoom.us/`, `//zoom.us/x`, `/relative`, `""` → null.
- `safeClosedUrl`: mismo host `https` ok; host en allowlist ok; `http`, `javascript:`,
  host externo no permitido o relativa → null.
- `parseIsoWithZone`: `2026-10-06T18:00:00-05:00` ok; `...Z` ok; `2026-10-06 18:00` null;
  `2026-10-06T18:00:00` (sin zona) null; `2026-13-01T00:00:00Z` null.
- `parseMountAttrs`: cada fila de la tabla RF-05, incluido `pt-BR`, `EN`, `fr`,
  `data-webinar-tz` válido/inválido y `data-closed-url`.

Cubre: CA-04 (parte pura), CA-05, CA-06, CA-20 (parte pura). Cobertura 100 % de estos módulos.

## Decisiones de Karen (2026-10-01, brief `s03-atributos`)

- Los atributos son los de RF-05: `data-atfx-leadkit="<form>"` más `data-*` simples (`data-lang`,
  `data-zoom-link`...). No hay prefijo por campo.
- `data-country` con `XX` o `T1` (Cloudflare sin país o Tor) → `null`.
- `data-lang` acepta guion bajo como guion medio: `pt_BR` → `pt`.
- `data-webinar-date` con forma correcta pero valores imposibles (mes 13, hora 99) → `null`: no
  se envía `Webinar_date_time__c` ni esa parte del `Comment`.
- `safeZoomLink` y `safeClosedUrl` rechazan puerto explícito y credenciales (`user:pass@`).
- `data-webinar-tz` solo acepta nombres IANA; una zona con offset (`+01:00`) → `null`, para que
  Node y Safari iOS 15 se comporten igual.
- D-14 aprobada en su capa cliente: `data-opens-at` / `data-closes-at` ISO 8601 con offset
  obligatorio y regex estricta antes de `Date.parse`.
