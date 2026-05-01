# Bancroft1.org — Legacy SPA (ARCHIVED)

**Status: ARCHIVED as of 2026-05-01.** Production was cut over to the Astro
site at `../bancroft-newsletter-astro/`, which now serves `bancroft1.org`.

This folder is kept as a complete snapshot of the original plain-HTML/JS SPA
(everything through May 4 2026) and pushed to `bancroft-primero/bancroft-newsletter`
on GitHub. **Do not deploy from here** unless rolling back.

## Tech stack (historical)
- Plain HTML/CSS/JS (no framework)
- JSON data files in `nl-f2049c43/data/weeks/`
- Vercel project: `bancroft-newsletter`, root = `nl-f2049c43/`. Latest deployment
  (still reachable, no longer aliased): `bancroft-newsletter-24nrjsxzz-mws-projects-080b130f.vercel.app`

## Rollback procedure
If the new astro site breaks:
```
cd sites/bancroft1.org
npx vercel alias set bancroft-newsletter-24nrjsxzz-mws-projects-080b130f.vercel.app bancroft1.org
```

## See also
- `../bancroft-newsletter-astro/CLAUDE.md` — current production
- `../OPERATIONS.md` — newsletter posting flow (now astro-only)
