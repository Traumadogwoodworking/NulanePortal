# Implementation Plan - DocuDent Portal UX Refinement

This plan outlines the steps to refine the DocuDent portal report UX and upgrade the DocuDent module into a real operational workspace.

## 1. Damage Reports Detail Sidebar Refinement
- **Current State**: The right-side detail area shows too much meta framing and not enough direct vehicle identity.
- **Goal**: Emphasize VIN as the primary identity. Clearly structure multiple vehicles/photos/damage items.
- **Changes**:
    - Move VIN to a more prominent position (under or as part of the main title).
    - Group vital information more clearly (Inspector, Origin, Created).
    - Structure damage entries and captures with better spacing and visual separation.
    - Ensure photos are for viewing (triggering the fullscreen modal) and not editable.
    - Ensure "Edit" is a standalone action button.

## 2. RSA Reports Hierarchy Implementation
- **Current State**: RSA detail sidebar needs a better drilldown structure.
- **Goal**: Hierarchy of Day -> Track -> Spot -> Car -> VIN(s).
- **Changes**:
    - Update the sidebar to present the hierarchy clearly.
    - If a report group is selected (currently selecting a single report), first show the Track at the top level of the breakdown.
    - Under the Track, show the Spot.
    - Under the Spot, show the Car(s).
    - For each Car, show the VIN(s).
    - Use clean, expandable rows for this structure if multiple items exist at any level.

## 3. Sidebar Visual Quality Enhancement
- **Goal**: Improve typography, spacing, and visual hierarchy for operational scanability.
- **Changes**:
    - Refine font sizes and weights.
    - Add clear section dividers.
    - Use subtle background colors for grouped sections.
    - Ensure labels (Track, Spot, Car, VIN) are strong and consistent.

## 4. DocuDent Module Upgrade
- **Current State**: The `DocuDentPage` is a legacy placeholder/stub.
- **Goal**: Turn it into a credible workspace app shell.
- **Changes**:
    - Replace the "Legacy DocuDent" content with a modern operational dashboard.
    - Include quick links/entry points for common DocuDent tasks (Browse Damage, View RSA, Recent Inspections).
    - Provide operational context (active location, organization status).
    - Use the existing portal design system and components.

## 5. Verification
- **Build**: Ensure the project builds without errors (`npm run build`).
- **Runtime**: Verify the UI changes by inspecting the components and their integration in the app.
- **Logic**: Verify the hierarchy values map correctly to the real data payloads.

## Task Breakdown

### Phase 1: Damage Sidebar Refinement
- [ ] Modify `ReportsManager.tsx` to elevate VIN identity for Damage reports.
- [ ] Improve spacing and grouping in Damage detail section.
- [ ] Ensure photos/edit actions remain distinct.

### Phase 2: RSA Sidebar Hierarchy
- [ ] Modify `ReportsManager.tsx` to implement Track -> Spot -> Car -> VIN hierarchy.
- [ ] Create a cleaner UI for the RSA drilldown.

### Phase 3: DocuDent Module Upgrade
- [ ] Rewrite `src/app/docudent/page.tsx` as a modern DocuDent workspace.
- [ ] Add relevant navigation and operational summaries.

### Phase 4: Final Polish and Testing
- [ ] Review typography and spacing across all new areas.
- [ ] Verify build and fix any linting/compilation issues.
