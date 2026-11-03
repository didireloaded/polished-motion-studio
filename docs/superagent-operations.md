# Superagent for Mutal

The supplied `dsh-superagent` prototype is a separate service for GitHub work. It does not run inside the Mutal PWA or Lovable Cloud. Its Executors read this repository's `AGENTS.md` when they work on a ticket.

## Initial policy

- Source: `didireloaded/polished-motion-studio` on GitHub only.
- Requesters: start with `didireloaded` only. Expand the allowlist deliberately.
- Proactive work: `observe` mode. Do not create inferred tickets automatically.
- Delivery: a task branch and reviewable pull request. No automatic merge, force push, or direct write to `main`.
- Use a dedicated GitHub account for the service, with its own `gh` configuration and repository write access. Keep its credentials outside this repository.
- Keep the service in a separate DSH profile. The prototype's default profile name is `superagent`, with a panel on `127.0.0.1:3082`.

## Caveman pairing

Caveman's local CLI is available on this machine. Use it for agent-side compression or metering only after verifying its `dsh` wrapping path against a running service. Start with byte-safe pass-through mode. Any gateway API key, provider key, or dashboard configuration belongs in the service environment, never in this repository or a `VITE_` variable. Do not turn on optimization or claim cost savings without measured evidence.

## Setup and acceptance

The prototype lives at `/Users/visionhaus/Documents/Codex/dsh-superagent-prototype-main`. Its `pnpm check` passed locally: typecheck, 1,197 tests, and build. It is not installed as a running service.

Before starting it, install the missing `dsh`, `gh`, and `tmux` executables; create and authorize the dedicated GitHub account; and configure the DSH model provider. Follow the prototype's `SETUP.md` and `docs/006-deployment.md` for the profile and account wrappers. Do not replace an existing profile during setup.

Verify the service with `scripts/dsh-superagent status`, then mention the agent account from an allowed GitHub account on a test issue. Confirm that one ticket appears, that work uses a task branch, and that any pull request waits for human review. Verify Caveman separately from real agent traffic before calling the pairing active.
