# Reference Brief: README de documentación técnica como estándar de la casa

Slug: readmes-documentacion | Nivel: standard | Fecha: 2026-10-02 | Estado: ESCALADO
Versiones: typescript=5.9.3, esbuild=0.28.2, zod=3.25.76
Verificador: research-verifier 2026-10-02 ESCALATE

## 1. Pregunta y decisiones abiertas

Cómo escribir (y revisar) el README de un repositorio de software, para que sirva como estándar de la casa: qué secciones lleva y en qué orden, qué queda en el README y qué se enlaza a `docs/`, cómo se hace accesible, qué badges valen la pena y cómo se publica el README en un paquete npm.

Cinco bloques de decisión gris:
- B1. Estructura y orden de secciones (Standard Readme vs Make a README vs GitHub Docs): qué es obligatorio y qué opcional.
- B2. Qué contenido vive en el README y qué se mueve a `docs/` o wiki, aplicando Diátaxis.
- B3. Banner ASCII dentro de un bloque de código con un encabezado `#` real debajo: por qué, y su coste de accesibilidad.
- B4. Badges/shields: cuáles informan, cuáles son ruido, accesibilidad y mantenimiento.
- B5. README en un paquete npm: cómo se publica, qué espera npmjs mostrar e impacto en el tamaño del paquete.

Contexto del repo: hoy es `private: true` y la publicación en npm está contemplada para la sesión s14 (decisión D-13); se trata como contexto, no como decisión tomada.

## 2. Estado actual

- El título real es un encabezado H1 markdown (`# atfx-leadkit`) colocado justo debajo del bloque de arte ASCII [repo:README.md:16]
- El banner ASCII vive dentro de un bloque de código cercado que ocupa las líneas 1-14 [repo:README.md:2]
- La descripción corta sigue al título y dice qué hace y a qué paquetes reemplaza [repo:README.md:18]
- Hay una tabla de contenidos manual ("Índice") con enlaces ancla a cada sección [repo:README.md:35]
- La jerarquía de encabezados anida H1→H2→H3 sin saltos (`### Separación de capas` bajo `## Arquitectura`) [repo:README.md:100]
- Los enlaces a las especificaciones usan rutas relativas dentro del repo [repo:README.md:29]
- La sección "Build y scripts" documenta los scripts npm dentro de un bloque de código [repo:README.md:217]
- La licencia declarada es UNLICENSED, sin sección License en el README [repo:package.json:13]
- El paquete es `private: true`, lo que hoy impide `npm publish` [repo:package.json:14]
Contextos: render web de GitHub, clon local (editor + enlaces relativos), página de npmjs.com (futuro, s14 por D-13), lector de pantalla / tecnología de asistencia

## 3. Fuentes primarias

- Standard Readme fija el orden Título → Descripción corta (<120, sin iniciar con `>`) → Badges → ToC → Install → Usage → Contributing → License (última), con Install/Usage obligatorias salvo repos de documentación [doc:https://github.com/RichardLitt/standard-readme/blob/master/spec.md@2026-10-02]
- Standard Readme exige que License sea la última sección e identifique la licencia por la lista SPDX [doc:https://github.com/RichardLitt/standard-readme/blob/master/spec.md@2026-10-02]
- Make a README sugiere Name, Description, Badges, Visuals, Installation, Usage, Support, Roadmap, Contributing, Authors, License y Project status, y pide elegir las que apliquen [doc:https://www.makeareadme.com/@2026-10-02]
- Make a README admite que un README puede ser demasiado largo, pero que "demasiado largo es mejor que demasiado corto" [doc:https://www.makeareadme.com/@2026-10-02]
- GitHub genera automáticamente una tabla de contenidos a partir de los encabezados del README [doc:https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes@2026-10-02]
- GitHub trunca el contenido del README que pase de 500 KiB al renderizarlo en la web [doc:https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes@2026-10-02]
- GitHub recomienda enlaces relativos porque funcionan para quien clona el repositorio [doc:https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes@2026-10-02]
- El perfil de comunidad de GitHub cuenta README, CODE_OF_CONDUCT, LICENSE, CONTRIBUTING, política de seguridad y plantillas de issue/PR como archivos de salud del repo [doc:https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories@2026-10-02]
- Diátaxis divide la documentación en tutorial (aprender), how-to (tarea), referencia (información) y explicación (comprensión) [doc:https://diataxis.fr/@2026-10-02]
- La técnica WCAG H86 trata el arte ASCII como contenido no textual (SC 1.1.1) y pide una explicación de texto y, opcionalmente, un enlace para saltarlo [doc:https://www.w3.org/TR/WCAG20-TECHS/H86.html@2.0]
- W3C WAI indica `alt=""` para imágenes decorativas y alt descriptivo para las informativas; omitir el atributo alt hace que algunos lectores de pantalla lean el nombre del archivo [doc:https://www.w3.org/WAI/tutorials/images/decorative/@2026-10-02]
- MDN pide no saltar niveles de encabezado y usar un solo H1, porque los lectores de pantalla navegan saltando entre encabezados [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements@2026-10-02]
- npm incluye siempre README y LICENSE en el paquete publicado, sin importar el campo `files` ni `.npmignore` [doc:https://docs.npmjs.com/cli/v10/configuring-npm/package-json@v10]
- npm renderiza el README.md del directorio raíz en la página del paquete como GitHub Flavored Markdown y solo lo actualiza al publicar una versión nueva [doc:https://docs.npmjs.com/about-package-readme-files/@2026-10-02]
- shields.io ofrece badges estáticos y dinámicos; los dinámicos consultan APIs externas al renderizarse [doc:https://shields.io/@2026-10-02]
- La guía de accesibilidad de badges de usethis pide un alt estático que nombre el propósito del badge, con el dato dinámico dentro de la imagen servida [doc:https://usethis.r-lib.org/articles/badge-accessibility.html@2026-10-02]

## 4. Implementaciones de referencia

- vitejs/vite: logo en `<picture>` con alt, fila de badges cada uno con alt, `# Vite` como H1 markdown real, tagline con `>` y lista de features; mantenido por el equipo Vite, escala de decenas de miles de estrellas [ref:https://github.com/vitejs/vite/blob/10033218d239c927cdc375970b5741cce408e81b/README.md@10033218d239c927cdc375970b5741cce408e81b]
- pallets/flask: logo con `alt=""` (decorativo) seguido de `# Flask` (H1 real) y secciones A Simple Example, Donate y Contributing; mantenido por la organización Pallets [ref:https://github.com/pallets/flask/blob/d73fa1cdcbd8b1465c151db8924ba58b1dd14e35/README.md@d73fa1cdcbd8b1465c151db8924ba58b1dd14e35]
- sindresorhus/execa: logo con alt descriptivo y badge de cobertura con alt "Coverage Status" seguido de un tagline; mantenedor de referencia en el ecosistema npm [ref:https://github.com/sindresorhus/execa/blob/8017b279e19347efaf2587711c2d57dbd4330740/readme.md@8017b279e19347efaf2587711c2d57dbd4330740]
- prettier/prettier: titula con `<h2 align="center">` en vez de un H1 markdown, lo que lo vuelve anti-ejemplo del encabezado semántico pese a ser un proyecto de primera línea [ref:https://github.com/prettier/prettier/blob/e5b6b2e1b86db61e81b87935ab54259144b642ea/README.md@e5b6b2e1b86db61e81b87935ab54259144b642ea]

## 5. Opciones

### B1 — Estructura y orden de secciones

| Opción | Pros | Contras | Complejidad | Recomendación |
|---|---|---|---|---|
| A Standard Readme estricto | contrato verificable, License última, títulos fijos | rígido, orden cerrado | baja | base del orden |
| B Make a README (sugerido) | flexible, añade Visuals/Support/Status | menos prescriptivo | baja | complementa con opcionales |
| C Orden propio ad hoc | libertad total | nada revisable como estándar | baja | no |

Recomendación B1: orden de Standard Readme como base, con secciones opcionales de Make a README cuando apliquen.

### B2 — README vs docs/

| Opción | Pros | Contras | Complejidad | Recomendación |
|---|---|---|---|---|
| A Todo en el README | una sola puerta | largo, se trunca, mezcla tipos | baja | no |
| B README breve + docs/ | README como índice; referencia/explicación fuera | exige mantener dos sitios | media | sí |
| C Wiki | editable sin PR | no se versiona con el código | media | solo para notas vivas |

Recomendación B2: el README es portada + quickstart (tutorial mínimo) + how-to de install/usage; referencia y explicación extensas van a `docs/` enlazadas.

### B3 — Banner ASCII + encabezado

| Opción | Pros | Contras | Complejidad | Recomendación |
|---|---|---|---|---|
| A ASCII en bloque de código + H1 real debajo | título indexable y enlazable; arte visible | el arte sigue siendo no-texto para AT | baja | sí (actual) |
| B Imagen con alt + H1 real | alt controla la lectura; H1 indexable | asset externo que mantener | baja | sí |
| C Solo ASCII como título | estético | sin H1 real: ToC/ancla/SEO perdidos | baja | no |

Recomendación B3: A o B; nunca C. Mantener el banner en bloque de código con un `#` H1 real inmediatamente debajo.

### B4 — Badges

| Opción | Pros | Contras | Complejidad | Recomendación |
|---|---|---|---|---|
| A Pocos badges informativos con alt | señal real (build, versión, cobertura, licencia) | hay que mantenerlos | baja | sí |
| B Muchos badges | vistoso | ruido, dependencias frágiles | baja | no |
| C Ninguno | cero mantenimiento | se pierde estado del proyecto | baja | aceptable si es privado |

Recomendación B4: pocos badges informativos, cada uno con alt estático; evitar badges decorativos o de vanidad.

### B5 — README en un paquete npm

| Opción | Pros | Contras | Complejidad | Recomendación |
|---|---|---|---|---|
| A Confiar en inclusión por defecto | README/LICENSE entran siempre | el tarball puede llevar de más | baja | parcial |
| B Declarar `files` + README en root | tarball acotado, README visible en npmjs | un campo más que cuidar | baja | sí (en s14) |

Recomendación B5: al publicar (s14), README.md en el root, `description` en package.json y campo `files` para acotar el tarball; recordar que README/LICENSE/package.json entran igual.

## 6. Evidencia en contra

- Make a README empuja a inflar el README ("demasiado largo es mejor que demasiado corto"); se resuelve moviendo referencia y explicación a `docs/` según B2 [doc:https://www.makeareadme.com/@2026-10-02]
- Los badges dinámicos de shields consultan APIs externas y pueden romperse o tardar en cada render; por eso se limitan a pocos y se prefieren los que el proyecto controla [doc:https://shields.io/@2026-10-02]
- Una crítica a Diátaxis es que partir el contenido en cuatro grupos puede sentirse arbitraria y simplificar de más ("overly opinionated and arbitrary", las divisiones "aren't absolute in practice"); hasta su propio autor aclara que no pretende imponer cuatro cajas rígidas; se acepta: Diátaxis ordena `docs/`, no obliga a fragmentar el README [doc:https://idratherbewriting.com/blog/what-is-diataxis-documentation-framework@2026-10-02]
- Standard Readme es rígido en orden y en títulos exactos; se acepta como base y se relaja con las secciones opcionales de Make a README [doc:https://github.com/RichardLitt/standard-readme/blob/master/spec.md@2026-10-02]

## 7. Ejemplares y anti-ejemplos

- Banner visual + H1 real bien hecho: Flask pone `alt=""` en el logo decorativo y `# Flask` justo debajo, de modo que el nombre accesible y el ToC salen del encabezado, no de la imagen [ref:https://github.com/pallets/flask/blob/d73fa1cdcbd8b1465c151db8924ba58b1dd14e35/README.md@d73fa1cdcbd8b1465c151db8924ba58b1dd14e35]
- Vite pone `# Vite` como H1 real tras el logo y da alt a cada badge de la fila de apertura [ref:https://github.com/vitejs/vite/blob/10033218d239c927cdc375970b5741cce408e81b/README.md@10033218d239c927cdc375970b5741cce408e81b]
- Anti-ejemplo: prettier titula con `<h2 align="center">` sin H1 markdown, lo que debilita el ToC y los enlaces ancla automáticos de GitHub [ref:https://github.com/prettier/prettier/blob/e5b6b2e1b86db61e81b87935ab54259144b642ea/README.md@e5b6b2e1b86db61e81b87935ab54259144b642ea]
- El README del repo ya cumple el patrón banner-en-bloque-de-código seguido de `# atfx-leadkit` como H1 real [repo:README.md:16]
- Lo que le falta: no hay explicación de texto ni enlace para saltar el arte ASCII que pide H86; el H1 adyacente mitiga pero no sustituye ese alternativo [repo:README.md:2]
- Lo que le falta: no hay sección License (hoy UNLICENSED/privado); Standard Readme la exige última cuando el repo se publique [repo:package.json:13]

Plantilla recomendada (orden), base Standard Readme con opcionales de Make a README [doc:https://github.com/RichardLitt/standard-readme/blob/master/spec.md@2026-10-02]:

```
[Banner ASCII o logo]   (bloque de código, o imagen con alt)
# Título                 (H1 markdown real = nombre del repo/paquete)
Descripción corta        (<120 chars, no inicia con >)
[Badges]                 (pocos, informativos, con alt)
## Índice                (si el README pasa de ~100 líneas)
## Install
## Usage
## (secciones del dominio: Arquitectura, Contrato, Seguridad...)
## Contributing
## License               (última)
```

## 8. Trampas

- Omitir el atributo alt en imágenes o badges hace que algunos lectores de pantalla lean el nombre del archivo en vez del propósito [doc:https://www.w3.org/WAI/tutorials/images/decorative/@2026-10-02]
- Saltar un nivel de encabezado (H1→H3) confunde a quien navega por encabezados con un lector de pantalla [doc:https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements@2026-10-02]
- Los enlaces absolutos al repo se rompen al clonar; GitHub resuelve los relativos según la rama [doc:https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes@2026-10-02]
- En npmjs.com el README no se actualiza hasta publicar una versión nueva, así que un fix solo de docs no se refleja en la página del paquete [doc:https://docs.npmjs.com/about-package-readme-files/@2026-10-02]
- README y LICENSE entran al tarball aunque `files` no los liste; confiar en `files` para excluirlos no funciona [doc:https://docs.npmjs.com/cli/v10/configuring-npm/package-json@v10]
- Un badge dinámico depende de un servicio externo al renderizarse, así que puede fallar o tardar y dejar el encabezado del README sin su dato en el render web [doc:https://shields.io/@2026-10-02]
- GitHub trunca el README por encima de 500 KiB, así que un README gigante pierde su final en la web [doc:https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes@2026-10-02]

## 9. Incertidumbre

- ASSUMPTION: que un lector de pantalla concreto (VoiceOver o NVDA) lea el arte ASCII dentro de un bloque de código cercado de GitHub carácter por carácter no se verificó en vivo en esta sesión. prueba: abrir el README renderizado en GitHub con VoiceOver y escuchar el bloque de las líneas 1-14.
- ASSUMPTION: el impacto exacto del banner ASCII en la indexación/SEO de la página del repo no se midió. prueba: buscar el repositorio en un buscador y comparar qué título y descripción indexa con y sin el H1 real.
- [NEEDS CLARIFICATION: al publicar en npm (s14), ¿se quiere un README recortado para npmjs.com o el mismo del repo?]
- [NEEDS CLARIFICATION: ¿se adopta una sección License en el README antes de s14, dado que hoy el paquete es privado y UNLICENSED?]

## 10. Checklist de estándar

- [ ] El título es un encabezado H1 markdown (`#`), no solo arte ASCII ni `<h2>`/imagen
- [ ] Si hay banner ASCII, va en un bloque de código y lo sigue de inmediato un H1 real
- [ ] Imágenes decorativas con `alt=""`; imágenes y badges informativos con alt descriptivo estático
- [ ] Encabezados sin saltos de nivel y un solo H1 en todo el README
- [ ] Descripción corta (<120 chars) tras el título, sin iniciar con `>`
- [ ] Orden: título, descripción, badges, ToC (si pasa de ~100 líneas), install, usage, dominio, contributing, license (última)
- [ ] Install y Usage presentes (salvo repositorio de solo documentación)
- [ ] Enlaces internos relativos, no absolutos al repo
- [ ] Referencia y explicación extensas enlazadas a `docs/`, no incrustadas en el README
- [ ] Badges limitados a los informativos (build, versión, cobertura, licencia), sin badges de vanidad
- [ ] README por debajo de 500 KiB para no truncarse en GitHub
- [ ] Al publicar en npm: README.md en el root, `description` en package.json y `files` que acote el tarball
- [ ] Sección License presente en cuanto el repositorio deje de ser privado

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | Standard Readme spec | RichardLitt | master, s/fecha | 2026-10-02 | high |
| 2 | Make a README | makeareadme.com | 2026-10-02 | 2026-10-02 | high |
| 3 | About READMEs | GitHub Docs | 2026-10-02 | 2026-10-02 | high |
| 4 | About community profiles | GitHub Docs | 2026-10-02 | 2026-10-02 | high |
| 5 | Diátaxis | diataxis.fr | 2026-10-02 | 2026-10-02 | high |
| 6 | H86 ASCII art text alternatives | W3C WCAG 2.0 Techniques | 2.0 | 2026-10-02 | high |
| 7 | Decorative images | W3C WAI Tutorials | 2026-10-02 | 2026-10-02 | high |
| 8 | Heading Elements | MDN | 2026-10-02 | 2026-10-02 | high |
| 9 | package.json / files | npm Docs | v10 | 2026-10-02 | high |
| 10 | About package README files | npm Docs | 2026-10-02 | 2026-10-02 | high |
| 11 | shields.io | Shields | 2026-10-02 | 2026-10-02 | medium |
| 12 | Exploring badge accessibility | usethis (r-lib) | 2026-10-02 | 2026-10-02 | medium |
| 13 | What is Diátaxis | idratherbewriting (Tom Johnson) | 2026-10-02 | 2026-10-02 | medium |
| 14 | vitejs/vite README | Vite team | commit 1003321 | 2026-10-02 | high |
| 15 | pallets/flask README | Pallets | commit d73fa1c | 2026-10-02 | high |
| 16 | sindresorhus/execa README | sindresorhus | commit 8017b27 | 2026-10-02 | high |
| 17 | prettier/prettier README | Prettier | commit e5b6b2e | 2026-10-02 | high |
