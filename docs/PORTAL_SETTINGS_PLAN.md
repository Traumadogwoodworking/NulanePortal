# Portal Settings Plan

Scope: planning only for `/settings` and adjacent workspace preferences. No implementation in this pass.

| Setting | Purpose | Source of truth | Endpoint if known | Writable now? | Suggested UI | Risk |
|---|---|---|---|---|---|---|
| profile/session: email, role, organization, sign out | Show current identity and offer session exit | Portal session snapshot | Session bootstrap / auth callback | No | Read-only summary card with sign-out button | Low |
| organization context: current org, default facility, default landing page | Clarify the active tenant and preferred landing context | Session + organization snapshot | Not verified | No | Read-only current-context card | Medium |
| display: table density, debug panels in dev, light theme | Control local presentation preferences | Local portal preferences | Not verified | No | Toggle group with local storage | Low |
| report preferences: default report date range, default facility filter, show map/splat first, gallery density | Tune report browsing defaults | Local preferences and report snapshot | Not verified | No | Compact preference form | Medium |
| email/notifications: default list, test recipient, link to /email | Reduce routing friction | Email list snapshot | `/api/admin/organizations/:organizationId/email-lists` | Partially | Read-only summary plus link to Email | Medium |
| diagnostics: API base URL, readyz/health, session token present status without showing token, last directory refresh | Help support and debugging | Portal config + control-plane status | `/api/...` status routes already in use | Read-only now | Diagnostics panel with refresh buttons | Medium |
| cache: refresh directory snapshot, clear local portal cache | Let users recover from stale UI state | SWR/local cache | Not verified | Partially | Utility actions | Low |
| permissions: read-only role and allowed actions | Make role boundaries explicit | Session role / access helpers | Session bootstrap | No | Badge list and allowed-actions summary | Low |

## Notes

- Branding editing should stay on the branding/facility surfaces, not inside `/settings`.
- If a write endpoint is later verified for any setting group, add it behind role checks and keep the read-only view intact.
- Do not expand Settings into a mutation editor until backend contract proof exists.
