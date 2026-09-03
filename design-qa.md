# Design QA: DocuDent shared-workspace people hub

**Source visual truth path**

`/Users/home/.codex/visualizations/2026/09/03/01a06770-ab3b-7b03-a7b1-ff47c0a8b193/docudent-existing-damage-reports.png`

**Implementation screenshot path**

`/Users/home/.codex/visualizations/2026/09/03/01a06770-ab3b-7b03-a7b1-ff47c0a8b193/docudent-people-hub-final-577.png`

**Comparison evidence**

`/Users/home/.codex/visualizations/2026/09/03/01a06770-ab3b-7b03-a7b1-ff47c0a8b193/docudent-before-after-final.png`

**Viewport and normalization**

- CSS viewport: 1280 x 577 at device scale factor 1.
- Source: 1280 x 577 pixels.
- Implementation: 1280 x 577 pixels.
- Normalization: none required; both captures use the same route, shell, theme, viewport, density, authenticated development fixture, and collapsed state.
- Responsive evidence: 768 x 900 capture at `docudent-people-hub-768.png`; document width equals viewport width (768px), with no horizontal overflow.

**State**

- Existing `/reports/damage/` screen with a populated report list.
- Shared-workspace people surface collapsed to its default preview.
- The current user is identified with a `You` badge; all email values are masked.

**Primary interactions tested**

- `View all 7` expands the roster and changes to `Show less`.
- `Show less` returns the roster to the compact state.
- The expanded state exposes all seven fixture people without exposing raw email values.
- The `Private workspace` affordance remains visible.

**Console and browser errors**

- Final browser error check: no page errors.
- Development console contains expected local authentication/setup history from before the mock API was connected; the final connected run completed the page and data requests successfully.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the feature uses the portal's existing family, optical weights, sizes, and line-height hierarchy; names and masked emails remain readable without truncation in the final 1280px state.
- Spacing and layout rhythm: the people surface sits between the existing page introduction and report workspace, preserves the original grid proportions, and adds one compact horizontal band rather than a competing card or route.
- Colors and visual tokens: the feature uses the existing DocuDent navy and light-blue tokens, border treatment, shadows, and control radii.
- Image and asset fidelity: the existing Nulane logo and product assets are unchanged; the people icon comes from the portal's existing icon library rather than a custom drawing.
- Copy and content: the surface says `People using DocuDent`, avoids member/team/admin language, explains the shared context at narrower widths, and masks every email value.

**Focused region comparison**

The people surface and adjacent report header are readable in the full-resolution side-by-side comparison. No additional crop was needed: the comparison shows the insertion point, component density, preserved report controls, product logo, and shell navigation at legible scale.

**Comparison history**

1. Earlier finding (P2): the first people-card treatment consumed too much vertical space and pushed the report workspace materially below the fold.
   - Fix: replaced it with a compact in-flow people strip inside the existing report container.
2. Earlier finding (P2): three desktop preview entries caused the third name and email to truncate at common laptop width.
   - Fix: reduced the 1280px collapsed preview to two complete people; four entries remain available at wider desktop widths and the full roster remains available through `View all`.
3. Post-fix evidence: `docudent-before-after-final.png` at 1280 x 577 and `docudent-people-hub-768.png` at 768 x 900 show preserved hierarchy, readable content, and no horizontal overflow.

**Follow-up polish**

- P3: production data may produce unusually long display names; the current truncation behavior is acceptable, but a future tooltip could expose the full display name without changing layout.

**Implementation checklist**

- [x] Preserve the existing DocuDent shell and report workflow.
- [x] Place the social-proof surface on the Damage Submissions page.
- [x] Keep customer workspaces dark when the shared-workspace response is disabled.
- [x] Render masked email values only.
- [x] Verify collapsed, expanded, and responsive states in a browser.

final result: passed
