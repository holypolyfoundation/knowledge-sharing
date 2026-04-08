# Generate Slide ASCII Seed

Use this skill when a slide needs its `ascii_seed` frontmatter set to one of the built-in animation scenarios or intentionally cleared.

## Inputs
- `{slide path}`: Path to the target slide Markdown file
- `{scenario}`: One of `zero-one`, `fire`, `radar`, `starfield`, `circuit-pulse`, `equalizer`, `packet-flow`, `tide`, `hourglass`, `forge`, `swarm`, `glitch-banner`, `terminal`, `game-of-life`, or `null`

## Goal
Generate or replace the slide's `ascii_seed` frontmatter value while preserving every other part of the Markdown file.

## Requirements
- Read the selected slide directly to derive context from its `title`, `summary`, and current body
- Write exactly one `ascii_seed` frontmatter field
- Allow `ascii_seed: null` when the requested slide should intentionally render without an animated ASCII block
- Remove any legacy inline ASCII wrapper if it still exists in the file
- Preserve section content, Mermaid blocks, spacing rhythm, and unrelated frontmatter
- Do not generate custom logic or expressions; only write the supported scenario key or `null`

## Workflow
1. Read `{slide path}`
2. Validate `{scenario}` against `zero-one`, `fire`, `radar`, `starfield`, `circuit-pulse`, `equalizer`, `packet-flow`, `tide`, `hourglass`, `forge`, `swarm`, `glitch-banner`, `terminal`, `game-of-life`, and `null`
3. Generate one `ascii_seed` value or `null`
4. Replace the existing `ascii_seed` field if present, otherwise add it to frontmatter
5. Remove any legacy inline ASCII block from the Markdown body
6. Preserve the rest of the document

## CLI fallback
If you need a deterministic local fallback, run:

```bash
pnpm ascii --slide "<slide path>" --scenario "<zero-one|fire|radar|starfield|circuit-pulse|equalizer|packet-flow|tide|hourglass|forge|swarm|glitch-banner|terminal|game-of-life|null>"
```

That command updates the slide's `ascii_seed` frontmatter in place.
