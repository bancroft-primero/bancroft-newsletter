# Bancroft1.org — School Site + G1 Weekly Newsletter

Static site at https://bancroft1.org. Production version of the G1 weekly parent newsletter.
Plain HTML/CSS/JS + JSON data, hosted on Vercel.

## Current state
Active. ~weekly deploys for newsletter updates. Tier 1.

## Tech stack
- Plain HTML/CSS/JS (no framework)
- JSON data files in `nl-f2049c43/data/weeks/`
- Vercel hosting (project: `bancroft-newsletter`, root = `nl-f2049c43/`, aliased to `bancroft1.org`)

## Critical gotchas
- **Newsletter post flow lives in `../OPERATIONS.md`** — read it before posting.
- **Vercel project root is `nl-f2049c43/`**, not the folder root. Deploy from `sites/bancroft1.org/`.
- **FERPA**: ROARS section contains student first names + last initials. Don't expose anywhere indexable.

## See also
- `../bancroft-newsletter-astro/CLAUDE.md` — Astro mirror, auto-posted alongside this one (default "post the newsletter" = both)
- `../OPERATIONS.md` — full posting flow for both sites
- Feedback memories: `feedback_newsletter_images.md`, `feedback_newsletter_text_heavy.md`, `feedback_eureka_activity_filter.md`
