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
ascii_prompt: Futuristic terminal skyline
---
<div align="center" data-slide-ascii>
<pre>...</pre>
</div>

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
- Inline HTML only when it helps presentation rendering, such as the ASCII wrapper

## Validation reminders
- No `#` heading in the body
- Exactly one ASCII block per slide
- ASCII block must come before the first `##`
- Every slide needs at least one `##` section
