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
2. Exactly one centered ASCII block
3. One or more `##` sections

Required frontmatter:
```yaml
---
title: Intro
summary: What this slide covers
ascii_prompt: Futuristic prediction-market bot in terminal style
---
```

Body rules:
- Do not use `#` headings in the slide body
- The ASCII block must come before the first `##` section
- Use the exact wrapper below so validation and rendering stay aligned
- Mermaid code fences are allowed inside sections

```html
<div align="center" data-slide-ascii>
<pre>...</pre>
</div>
```

## Commands
- `pnpm validate` checks topic names, slide names, frontmatter, ASCII placement, and section structure
- `pnpm dev` regenerates the manifest and starts the local renderer
- `pnpm build` regenerates the manifest and produces the static GitHub Pages build in `dist/`
- `pnpm preview` serves the built site locally
- `pnpm test` runs automated tests
- `pnpm ascii --topic "<topic>" --file "<absolute-or-relative-md-path>"` regenerates the slide ASCII block in place

## ASCII Guidance
- The repo skill lives at `.ai/skills/generate-slide-ascii/SKILL.md`
- Keep one visual style across the deck
- Target `150x150` characters when generating new posters with the skill or CLI
- Preserve the rest of the Markdown file when updating ASCII

## Rendering Model
- Topics are compiled at build time into `src/generated/presentation-manifest.ts`
- The presentation UI is a static Vite app with hash routing
- GitHub Pages deployment uses `.github/workflows/deploy-pages.yml`
- Mermaid diagrams are rendered client-side after slide mount

## Working Rules
- Favor simple TypeScript and small modules over framework-heavy abstractions
- Keep the repo Markdown-first; build tooling must never mutate slide content during validation or build
- Use `AGENTS.md` as the primary spec when adding new automation, skills, or authoring tools
