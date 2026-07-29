# SHAP Release Candidate

Release key: `SHAP-RC-2026-07-29`
Environment: production cutover candidate
Status: `draft`
Approval: not approved

| Component | Candidate identity | Deployment identity | Verification |
|---|---|---|---|
| Mobile source | `de021bc010712a93cefb000282598e4e25d956ef`, dirty, source `1.0.16+17` | UNKNOWN | Local tests only |
| Android artifact | `1.0.10+18`, SHA-256 `31a12da569b072f58f1920131233415bd3b3f0aaaf092ca5fe625e03b8722e93` | UNKNOWN | Signed locally; provenance/install UNKNOWN |
| iOS artifact | `1.0.9+18`, SHA-256 `c605acc92a85d6cdb771e152e8a8ad964e828eeb78371b61f1b891045ef2decd` | UNKNOWN | Signed locally; provenance/install UNKNOWN |
| API | production base `015dc6aa17b36e826b3cdef97ffd2c8e761595ad` plus uncommitted runtime changes | mutable PM2 working tree | Health ready; immutable release UNKNOWN |
| Portal | public `gh-pages` `9d92b0e` | GitHub Pages | Source/rollback provenance UNKNOWN |
| Database migrations | 46 tracked through `052_organization_suborg_filtering.sql` | production DB | Applied |
| Report generator | production working-tree report service | PM2 working tree | Current SHAP PDFs exist; release identity UNKNOWN |
| VICS adapter/config | none found | none | BLOCKED |

## Required before approval

- Exact clean mobile commit and matching signed artifact.
- GitLab pipeline/artifact record.
- Exact rollback artifact.
- Installed build proof on every SHAP device.
- Authenticated normal and large field tests.
- Immutable API/runtime identity and rollback.
- Portal source/rollback provenance.
- Approved Stellantis VICS contract, safe destination, credentials, adapter/config, delivery evidence, acknowledgement, and duplicate proof.
- Physical MDM persistence evidence.
