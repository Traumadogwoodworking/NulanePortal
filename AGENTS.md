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

## DocuDent product boundary

- This worktree is the isolated DocuDent portal. Preserve the `DocuDent` product identity and the `Nulane Systems` portal shell.
- Do not copy or default to branding, tenants, facilities, support contacts, store links, endpoints, Auth0 organizations, or customer data from another Nulane product.
- Keep visible navigation limited to Home, Damage Submissions, Support Tickets, and Settings unless an explicit DocuDent requirement changes it.
- Centralize product configuration in `src/lib/brandingPresets.ts`, `src/lib/branding.ts`, `src/lib/navigation.ts`, and the documented public environment contract.
- Auth0 proves identity. A server-owned DocuDent membership authorizes organization and facility access; do not infer or hardcode an organization in the client.
- Keep inherited reusable modules disabled behind DocuDent product configuration instead of deleting them solely to hide them.
- Do not deploy or modify Inspection-Trac, Definian, or Circle from this worktree.
