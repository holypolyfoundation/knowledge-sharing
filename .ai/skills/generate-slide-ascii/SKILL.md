# Generate Slide ASCII

Use this skill when a slide needs its centered ASCII poster created or refreshed.

## Inputs
- `{topic}`: Human-readable topic name or slug
- `{md_file_path}`: Path to the target slide Markdown file

## Goal
Generate or replace the slide's centered ASCII block in-place while preserving every other part of the Markdown file.

## Requirements
- Use the exact wrapper:

```html
<div align="center" data-slide-ascii>
<pre>...</pre>
</div>
```

- Keep the style consistent across all slides in the repo
- Target `150x150` characters
- Center the poster visually in Markdown preview
- Make the ASCII image clearly related to the slide topic and title
- Keep output ASCII-only unless the file already uses other characters

## Workflow
1. Read the target slide frontmatter and body
2. Use `title`, `summary`, and `ascii_prompt` as the creative brief
3. Generate one poster only
4. Replace the existing ASCII block if present, otherwise insert it immediately before the first `##` section
5. Preserve section content, Mermaid blocks, spacing rhythm, and frontmatter

## CLI fallback
If you need a deterministic local fallback, run:

```bash
pnpm ascii --topic "<topic>" --file "<md_file_path>"
```

That command rewrites the slide's ASCII block in the repo's standard wrapper.
