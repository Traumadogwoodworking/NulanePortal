# Feature initialization standard

Every feature starts as a durable task and a repository-backed interview. The
goal is not paperwork; it is to prevent implementation from racing ahead of the
real requirement.

## Required command

```sh
npm run work -- feature-init \
  --project CIR \
  --title "Short outcome-oriented title" \
  --repo /absolute/path/to/repository \
  --scope "Explicit allowed code and runtime boundary" \
  --priority P1
```

This allocates an immutable task ID, starts the standard interview, and creates:

- `FEATURE.md` — outcome, current behavior, desired behavior, and scope
- `INTERVIEW.md` — the authoritative question-and-answer record
- `ACCEPTANCE.md` — observable pass/fail conditions
- `PLAN.md` — bounded implementation steps and affected systems
- `PROGRESS.md` — dated checkpoints, blockers, and next action
- `VERIFICATION.md` — tests, runtime evidence, risks, and rollback source

## Interview rule

Ask one consequential question at a time. Prefer a recommended starting answer
that the operator can accept or correct. Do not bundle a dozen decisions into
one message.

The standard interview covers:

1. Intended outcome
2. Current behavior
3. Exact desired behavior
4. Users, roles, devices, and runtime context
5. Allowed and forbidden scope
6. Data contracts and integrations
7. Failure, retry, and recovery behavior
8. Acceptance criteria
9. Verification evidence
10. Rollout and rollback
11. Definition of done

## Work and completion gates

A task may enter `working` only when remaining questions cannot materially
change the planned implementation. A task may enter `complete` only when:

- acceptance criteria have evidence;
- tests and live checks are recorded in `VERIFICATION.md`;
- the last stable build, commit, image, or release is named;
- rollback instructions are usable by an operator;
- known risks and remaining follow-ups are explicit.
