# Knowledge Sharing Repo Guide

## Purpose
This repository turns Markdown topics into a navigable presentation site for GitHub Pages. Treat `AGENTS.md` as the authoritative project contract. `CLAUDE.md` is a short compatibility shim that points back here.

## Topic And Slide Naming
- Topic directories must use `topics/<number>-<slug>/`
- Slide files must use `<number>-<slug>.md`
- Use lowercase hyphen slugs only
- Topic and slide ordering is numeric, not lexicographic

## Slide Contract
Each slide must contain:
1. YAML frontmatter
2. Optional body content

Frontmatter:
```yaml
---
title: Intro
summary: What this slide covers
ascii_seed: "zero-one"
---
```

`summary` is optional.

`ascii_seed` may also be `null` when a slide should intentionally render without an animated ASCII block.
Available non-null values today:
- `"zero-one"`
- `"spaceship"`
- `"fire"`
- `"pulse"`
- `"waves"`
- `"scanline"`
- `"equalizer"`
- `"signal"`
- `"radar"`
- `"skyline"`
- `"terminal"`
- `"conveyor"`
- `"constellation"`

Body rules:
- Do not use `#` headings in the slide body
- Do not author inline ASCII wrappers in the Markdown body
- When `ascii_seed` is non-null, the renderer injects the animated ASCII block before the first `##` section
- Mermaid code fences are allowed

## Commands
- `pnpm validate` checks topic names, slide names, frontmatter, and legacy ASCII removal
- `pnpm dev` regenerates the manifest and starts the local renderer
- `pnpm build` regenerates the manifest and produces the static GitHub Pages build in `dist/`
- `pnpm preview` serves the built site locally
- `pnpm test` runs automated tests
- `pnpm ascii --slide "<absolute-or-relative-md-path>" --scenario "<zero-one|spaceship|fire|pulse|waves|scanline|equalizer|signal|radar|skyline|terminal|conveyor|constellation|null>"` writes or refreshes `ascii_seed` in frontmatter

## ASCII Guidance
- The repo skill lives at `.ai/skills/generate-slide-ascii/SKILL.md`
- Keep one visual style across the deck
- All animations are exactly 3 lines tall and stretch to the full slide width
- Prefer `null` unless one of the hardcoded scenarios is a clearly good fit
- Preserve the rest of the Markdown file when updating `ascii_seed`

## Rendering Model
- Topics are compiled at build time into `src/generated/presentation-manifest.ts`
- The presentation UI is a static Vite app with hash routing
- GitHub Pages deployment uses `.github/workflows/deploy-pages.yml`
- Mermaid diagrams are rendered client-side after slide mount

## Working Rules
- Favor simple TypeScript and small modules over framework-heavy abstractions
- Keep the repo Markdown-first; build tooling must never mutate slide content during validation or build
- Use `AGENTS.md` as the primary spec when adding new automation, skills, or authoring tools
