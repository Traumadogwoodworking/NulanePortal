# Nulane Work Control operating model

## Sources of truth

| Concern | Authority | Interface |
|---|---|---|
| Work state and history | PostgreSQL | Dashboard, Telegram, `nulane-work` |
| Requirements and verification | Repository Markdown | Codex and operator review |
| Source and deployment history | Git and CI/CD | GitLab workflows |
| Secrets | macOS Keychain or ignored runtime files | Supervised adapters |
| Process state and health | Process Compose | `nulane-dev` |

`task_events` is append-only. Current task rows make reads fast; the event log
preserves what changed, when it changed, and which adapter recorded it.

## Continuous movement without an endless model loop

The dispatcher is always available to process durable outbox messages and stale
work checks. A Codex run remains bounded: it receives a task, records progress,
finishes, blocks, or requests approval, then exits. The next run begins only
from a durable state transition or explicit operator action.

## Telegram privacy

The bot accepts `/start <pairing-code>` exactly once. After an owner is paired,
all commands and free-text interview answers from other Telegram users are
rejected. The bot token and pairing code are loaded from macOS Keychain when
the supervised Telegram runner starts.

## Safe activation

Core dashboard runner:

```sh
nulane-dev start nulane-work-control
```

Telegram runner, after a fresh bot token and pairing code are stored in
Keychain:

```sh
nulane-dev start nulane-work-telegram
```

The two runners are separate so the dashboard and durable database remain
available even when Telegram is intentionally disabled.
