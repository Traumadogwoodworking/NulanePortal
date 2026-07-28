# Nulane Work Control

Local-first operational control plane for Nulane work. It keeps the operator,
Codex, repositories, Telegram, and supervised services on the same durable
timeline without OpenClaw or an unbounded model loop.

## What is included

- PostgreSQL task state with an append-only event history
- A Next.js dashboard at `http://127.0.0.1:4310/admin/control`
- A repository-backed, one-question-at-a-time feature interview
- `nulane-work`, the CLI Codex uses to report progress and blockers
- A private Telegram Bot API adapter built with grammY
- A durable notification dispatcher for approvals and stale-work prompts
- Docker Compose services owned by the central `nulane-dev` supervisor

See [the operating model](docs/OPERATING_MODEL.md) and
[the feature-init standard](docs/FEATURE_INIT_STANDARD.md).

## Daily operation

The recurring runtime is registered centrally. Do not launch a duplicate
long-running stack directly.

```sh
nulane-dev status
nulane-dev start nulane-work-control
nulane-dev logs nulane-work-control
```

For one-off task and progress commands, use the installed wrapper:

```sh
nulane-work list
nulane-work status OPS-002
```

## Telegram activation

Never reuse a token pasted into chat or source control. Revoke it with
BotFather, generate a new token, and store it in macOS Keychain under:

- service `com.nulane.work.telegram`, account `bot-token`
- service `com.nulane.work.telegram`, account `pairing-code`

The `scripts/run-telegram` adapter reads both values into a mode-600 temporary
environment file and deletes that file when the supervised process exits.

Then start the disabled-by-default adapter:

```sh
nulane-dev start nulane-work-telegram
```

Send `/start <pairing-code>` to the bot from the one Telegram account that
should own it. Pairing is closed after the first owner is stored.

## Development checks

```sh
npm install
npm run type-check
npm run lint
npm run build
```

Database migrations are currently idempotent SQL in `db/schema.sql`.
`npm run db:init` applies them and `npm run db:seed` creates the initial
projects and private Telegram setup task.
