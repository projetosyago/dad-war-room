# CI

GitHub Actions workflow added in Wave 10 audit remediation.

Runs on every push to main/develop and on every PR to main:
1. `tsc --noEmit` — type check
2. `npm run lint` — ESLint
3. `npm test` — Vitest
4. `npm run build` — Vite production build
5. i18n parity — confirm all 11 locale JSON files have the same key count (1074)

Any failure blocks the merge.

To activate: push the repo to GitHub. The workflow runs automatically.
