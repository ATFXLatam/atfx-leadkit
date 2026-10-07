# Publicar atfx-leadkit

Cada versión vive en `https://atfx-leadkit-cdn.vercel.app/releases/X.Y.Z/` y no cambia nunca.
Los bytes se guardan en GitHub Releases inmutables; Vercel solo los sirve (D-13).

## Setup único (Karen)

1. Org `ATFXLatam` -> Settings -> immutable releases: activado.
2. Repo -> Rulesets: tags `v*` solo los crea Karen; nadie los borra ni los mueve.
3. Vercel (cuenta personal): token con alcance al proyecto `atfx-leadkit-cdn` y expiración.
4. Repo -> Environments -> `production`:
   - required reviewer: Karen, sin "prevent self-review" (si no, sus propios tags no se aprueban);
   - deployment branches and tags: solo `v*` y `main`;
   - secret `VERCEL_TOKEN`; variables `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`
     (están en `.vercel/project.json` tras `vercel link`).
5. En el proyecto de Vercel: sin repo de Git conectado.

## Publicar una versión

1. PR que sube `version` en `package.json` y agrega la entrada al `CHANGELOG.md`; merge.
2. Desde `main`: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. El job `build` publica el release; el job `deploy` espera la aprobación del environment.
4. Los snippets quedan en las notas del release.

## Reglas

- Nunca usar Instant Rollback de Vercel: dejaría de servir los releases posteriores. Para
  re-desplegar, correr el workflow `release` a mano (`workflow_dispatch`).
- Un release mal hecho no se corrige: se publica otro. Solo Karen borra releases.
- Verificar procedencia de un archivo:
  `gh attestation verify <archivo> --repo ATFXLatam/atfx-leadkit --signer-workflow ATFXLatam/atfx-leadkit/.github/workflows/release.yml`
