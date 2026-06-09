<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Repo workflow rules

- Inspect the current surface before changing it. Identify where the rendered result, style source, and control flow actually live.
- Prefer the smallest additive patch that fixes the observed issue. Preserve working output unless there is a clear reason to change it.
- Do not introduce wrappers, helpers, providers, hooks, or abstractions unless they remove a real repeated problem.
- Keep logic local and visually traceable. If styling is scattered, consolidate it only where the consolidation is obvious and safe.
- Treat simplification as the default refactor direction. Remove indirection before adding structure.
- When a table, row, line, or component looks wrong, inspect the full render tree and the neighboring elements before editing styles.
- Avoid rewrite-first behavior. If a narrow patch can solve it, use the narrow patch.
- Explain the actual root cause and what was verified. Mark anything unproven as unproven.

## Inspection-Trac quick branding

- Do not scatter customer branding strings or logos across unrelated portal code.
- Use the current central branding seams first: `src/lib/brandingPresets.ts`, `src/lib/branding.ts`, and `src/lib/navigation.ts`.
- Keep the quick Inspection-Trac path small and reversible; do not build the full tenant registry, schema, build-target matrix, or white-label automation here.
- Later white-label work should replace the quick preset with a config-driven tenant/build-target system.
- Do not rewrite stable portal behavior just to change visible customer branding.
