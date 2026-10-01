# s0 — Bootstrap del repo (Karen)

Estado: BLOQUEADA hasta aprobar D-02, D-03 y D-18.
Quién: Karen. Ningún agente ejecuta esta sesión: son acciones de git, GitHub y dependencias.

## Pasos

```bash
cd /Users/karenrebecaog/Desktop/SoftwareDevProjects/atfx-leadkit
git init -b main
npm init -y
npm pkg set name="atfx-leadkit" private=true type="module" version="0.0.0"

# Runtime (D-02)
npm install zod@^3.25

# Desarrollo (D-03)
npm install -D typescript@^5.9 esbuild@^0.25 vitest @vitest/coverage-v8 jsdom @playwright/test
npx playwright install chromium webkit

printf "node_modules/\ndist/\ncoverage/\nplaywright-report/\ntest-results/\n.env\n.env.*\n*.pem\n*.key\n*.p12\n.npmrc\n.DS_Store\n" > .gitignore

git add -A && git commit -m "chore: bootstrap atfx-leadkit con specs y research"
gh repo create <org-o-usuario>/atfx-leadkit --public --source . --push   # visibilidad según D-18
```

Después, en GitHub (D-18):
- Ruleset sobre `main`: PR obligatorio, status checks requeridos (se agregan en s14), sin force
  push ni borrado.
- Protección de tags `v*`.
- Dependabot alerts y security updates activados.

## Hecho cuando

- `git log` muestra el commit inicial y `package-lock.json` está commiteado.
- `npx tsc -v` y `npx vitest --version` responden.
- Marcar s0 como HECHA en `00-programa.md`.
