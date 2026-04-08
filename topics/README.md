# Topics Authoring Guide

## Structure
- Each topic lives in `topics/<number>-<slug>/`
- Each slide lives in `<number>-<slug>.md`
- Slides are presented in numeric order

## Minimal slide example
```md
---
title: Intro
summary: Why this topic matters
ascii_seed: "zero-one"
---

## Situation
Frame the problem quickly.

## Detail
Add bullets, code blocks, or Mermaid diagrams.
```

## Allowed content
- Paragraphs
- Lists
- Code fences
- Mermaid diagrams inside ` ```mermaid ` fences
- Inline HTML only when it helps presentation rendering

## Validation reminders
- No `#` heading in the body
- Do not author legacy inline ASCII wrappers in slide bodies
- Set `ascii_seed` to `null`, `"zero-one"`, `"spaceship"`, `"fire"`, `"pulse"`, `"waves"`, `"scanline"`, `"equalizer"`, `"signal"`, `"radar"`, `"skyline"`, `"terminal"`, `"conveyor"`, or `"constellation"`
- Prefer `null` when a slide does not clearly benefit from one of the built-in scenarios
- `summary` is optional
