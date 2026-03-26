# ClawCrew

> Steerable async workers from your pocket.

ClawCrew is a **durable, review-first AI agent runtime** for software work. It runs locally first, persists execution state, pauses at approval boundaries, and can be steered from CLI, Slack, or Telegram.

## What it is now

- **Durable runs and steps** persisted through a runtime store
- **Review-first execution** with approval checkpoints and resumable runs
- **CLI-first local workflow** for personal use
- **Slack and Telegram steering** for async task ingestion and approval/resume loops
- **Policy-aware tool execution** with action-batch previews and blast-radius summaries
- **Persisted cost tracking** and status timelines
- **Debate / consensus primitives** preserved as an advanced path instead of the default mode

## What it is not

- Not a “chatty office roleplay” product where lots of personas talking counts as progress
- Not a distributed agent platform yet
- Not a dashboard-first system that hides the real runtime under UI polish

## Quick Start

```bash
npm install
cp .env.example .env

# Start a local review-first run
npx tsx src/cli.ts run "Design and review a small auth module" --mode review

# Inspect persisted runs
npx tsx src/cli.ts status

# Approve a paused run
npx tsx src/cli.ts approve <approval-id>

# Inspect persisted runtime cost
npx tsx src/cli.ts cost
```

You can also run a long-lived worker:

```bash
npm run dev
```

## Runtime model

ClawCrew now centers work around a durable runtime model:

- **Project** — the top-level agenda and historical context
- **Run** — one execution attempt for a project
- **RunStep** — a persisted phase attempt within a run
- **RunEvent** — append-only runtime timeline entries
- **ApprovalRequest** — persisted approval checkpoint that can be resumed later

This keeps progress visible and restart-safe instead of burying execution in transient in-memory loops.

## Execution modes

### `review` (default)
- safest default for meaningful work
- pauses at approval boundaries before risky steps
- best fit for local use and messenger steering

### `solo`
- lighter-weight local execution with bounded autonomy

### `full`
- advanced mode that keeps debate/consensus available for more exploratory work

## Messenger steering

Slack and Telegram are treated as **transport and steering layers**:

- create a run from an incoming message
- receive compact status summaries
- approve or reject a paused run

They are no longer the source of runtime truth; the persisted runtime is.

## Tools

The default registry includes:

- `file_read`
- `directory_list`
- `git_status`
- `code_exec`
- `web_search`

Risky actions are surfaced as **action-batch previews** before approval-sensitive execution continues.

## Development

```bash
npm run typecheck
npm run build
npm test
```

## Architecture

```text
src/
├── core/         # engine, runtime helpers, event bus, config, LLM router
├── agents/       # base agent, personas, role implementations
├── persistence/  # runtime/project store and SQLite + fallback backend
├── messenger/    # Slack, Telegram, KakaoWork adapters
├── orchestrator/ # legacy debate/pipeline/human-gate primitives
├── tools/        # builtin tools and registry
├── sandbox/      # policy engine, command interception, sandbox execution
└── dashboard/    # cost/status formatting
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
