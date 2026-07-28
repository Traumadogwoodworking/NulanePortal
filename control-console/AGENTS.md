# Nulane Work Control agent rules

This repository is the local operational source of truth for work interviews,
task state, progress events, verification evidence, and operator notifications.

## Non-negotiable boundaries

- Do not install, invoke, adapt, or depend on OpenClaw.
- PostgreSQL is authoritative for mutable work state. Telegram, the dashboard,
  and the CLI are adapters; none may keep a separate task state.
- Git repositories are authoritative for feature requirements, plans, progress
  notes, verification, and rollback instructions.
- Keep Telegram access private to the single paired owner account.
- Never commit bot tokens, pairing codes, database passwords, payment card
  details, or other secrets. Read Telegram secrets from macOS Keychain.
- A long-lived dispatcher may wake on durable events. Do not run a model in an
  unbounded self-prompting loop.

## Feature-init gate

Before implementation begins for a new feature:

1. Run `nulane-work feature-init` with the project, title, repository, scope,
   and priority.
2. Complete the interview one question at a time. Record exact current
   behavior, desired behavior, scope, data contracts, failure behavior,
   acceptance criteria, verification, rollout, rollback, and definition of
   done.
3. Update the generated files under `docs/features/<TASK_ID>/`.
4. Do not move the task to `working` until unanswered requirements would no
   longer materially change the implementation.

During work, report bounded checkpoints with `nulane-work progress`. Record a
blocker immediately instead of silently waiting. Before completion, write
verification evidence and the rollback source, then use `nulane-work complete`
with concrete evidence.

## Runtime operations

- Run `nulane-dev status` before starting anything.
- Read `nulane-dev logs <runner>` before restarting a runner.
- Use the registered Process Compose runners. Do not start recurring services
  with unmanaged `npm`, Docker Compose, or background shell processes.
- Restart only the affected runner.
