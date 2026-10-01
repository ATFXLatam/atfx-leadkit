# s01 — handoff

## Archivos
- creado: `tsconfig.json`
- creado: `esbuild.config.mjs`
- creado: `vitest.config.ts`
- creado: `src/entries/lead.ts`
- creado: `src/entries/interest.ts`
- creado: `src/smoke.test.ts`
- modificado: `package.json` (solo `scripts`)

## RED

```
$ npm test
npm error Missing script: "test"
npm error
npm error To see a list of scripts, run:
npm error   npm run
```

El test `src/smoke.test.ts` ya existía. Sin `vitest.config.ts` el entorno por defecto es `node` y `document` no existe; no se pudo dejar esa corrida porque `npx vitest` fuera del repo recorrió el home y el proceso murió por memoria. El rojo de arriba es el de `npm test` dentro de `/Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit`.

## GREEN

```
$ npm run typecheck && npm test
> tsc --noEmit

> vitest run
 ✓ src/smoke.test.ts (1 test) 1ms
 Test Files  1 passed (1)
      Tests  1 passed (1)

$ npm run build
dist/assets/lead-JJB2RH2B.js
dist/assets/lead-PQUGEMEL.css
dist/assets/interest-UXAEMHKY.js
dist/assets/interest-3EUDJS27.css
dist/manifest.json
mapas: 0
```

`manifest.json` lista `lead` e `interest`, cada uno con `js` y `css`. Las rutas son relativas a `dist/` (`assets/<nombre>-<hash>.<ext>`).

`node esbuild.config.mjs --dev` sirve `dist` en `127.0.0.1:8765`: `/manifest.json` responde 200 y `/package.json` responde 404. `esbuild` 0.28 devuelve `hosts`, no `host`.

## Cobertura

```
File      | % Stmts | % Branch | % Funcs | % Lines
All files |       0 |        0 |       0 |       0
```

Vitest 5 agrega el `include` de tests (`src/**/*.test.ts`) al `exclude` de cobertura y no se puede quitar. Esta sesión también excluye `src/entries/**`. No queda ningún archivo medible, el reporte sale vacío y el umbral del 80 % no corta el proceso: con el mapa vacío el porcentaje es desconocido. El umbral queda configurado y empieza a aplicar cuando un test importe código de producto (s04).

## Criterios cubiertos
- `npm run typecheck && npm test && npm run build` termina en 0.
- `dist/assets/` contiene `lead-<hash>.js` e `interest-<hash>.js`, y no hay `.map` en el build de release.
- `dist/manifest.json` lista `lead` e `interest`.
- jsdom: test `jsdom provides document`.

## Desviaciones y preguntas
- `tsconfig.json` incluye solo `src/**/*.ts`. Sin `include`, `tsc` también revisa `vitest.config.ts`, que arrastra tipos Node de Vite, y eso falla porque `@types/node` no está en las dependencias aprobadas.
- No hay archivo CSS en la lista de la sesión. Cada entry importa `./lead.css` o `./interest.css`. Si el archivo no existe, el plugin `placeholder-css` emite `.atfx-leadkit{--atfx-placeholder:0}` para que el manifest tenga `css`. Si más adelante el archivo existe en disco, el plugin no lo reemplaza.
- El build borra `dist/` antes de emitir. Si no, el hash nuevo deja el archivo viejo en `dist/assets/`.
- `__LEADKIT_VERSION__` se define desde `package.json`. Los entry de esta sesión no lo leen, así que el token no aparece en el JS emitido.
- `coverage.include` es `src/**/*.ts` y `src/*.ts`. El primer patrón no cubre un archivo suelto en `src/`.
