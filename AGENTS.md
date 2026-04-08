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
ascii_height: 3
---
```

`summary` is optional.

`ascii_seed` may also be `null` when a slide should intentionally render without an animated ASCII block.
Available non-null values today:
- `"zero-one"`
- `"fire"`
- `"radar"`
- `"starfield"`
- `"circuit-pulse"`
- `"equalizer"`
- `"packet-flow"`
- `"tide"`
- `"hourglass"`
- `"forge"`
- `"swarm"`
- `"glitch-banner"`
- `"terminal"`
- `"game-of-life"`

`ascii_height` is optional and defaults to `3`.
Use a positive integer when you want more or fewer animation rows.
When `ascii_seed` is `null`, `ascii_height` is allowed but has no effect.

Body rules:
- Do not use `#` headings in the slide body
- Do not author inline ASCII wrappers in the Markdown body
- When `ascii_seed` is non-null, the renderer injects the animated ASCII block before the first `##` section
- Mermaid code fences are allowed
- Topic-local images are allowed via normal Markdown using `![alt](./assets/file.png)`
- Prefer `./assets/<file>` for files stored inside the current topic directory

## Commands
- `pnpm validate` checks topic names, slide names, frontmatter, and legacy ASCII removal
- `pnpm dev` regenerates the manifest and starts the local renderer
- `pnpm build` regenerates the manifest and produces the static GitHub Pages build in `dist/`
- `pnpm preview` serves the built site locally
- `pnpm test` runs automated tests
- `pnpm ascii --slide "<absolute-or-relative-md-path>" --scenario "<zero-one|fire|radar|starfield|circuit-pulse|equalizer|packet-flow|tide|hourglass|forge|swarm|glitch-banner|terminal|game-of-life|null>"` writes or refreshes `ascii_seed` in frontmatter

## ASCII Guidance
- The repo skill lives at `.ai/skills/generate-slide-ascii/SKILL.md`
- Keep one visual style across the deck
- Animations default to 3 lines tall and stretch to the full slide width
- Increase `ascii_height` to add rows; the renderer shrinks font size proportionally to keep the block height near the default size
- Prefer `null` unless one of the hardcoded scenarios is a clearly good fit
- Preserve the rest of the Markdown file when updating `ascii_seed`

## Rendering Model
- Topics are compiled at dev/build time into an in-memory Vite module exposed as `virtual:presentation-manifest`
- The presentation UI is a static Vite app with hash routing
- GitHub Pages deployment uses `.github/workflows/deploy-pages.yml`
- Mermaid diagrams are rendered client-side after slide mount
- Topic assets under `topics/<number>-<slug>/assets/` are published at `topics/<number>-<slug>/assets/...`

## Working Rules
- Favor simple TypeScript and small modules over framework-heavy abstractions
- Keep the repo Markdown-first; build tooling must never mutate slide content during validation or build
- Use `AGENTS.md` as the primary spec when adding new automation, skills, or authoring tools
