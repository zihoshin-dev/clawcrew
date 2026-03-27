# Contributing to ClawCrew

## Local setup

```bash
npm install
cp .env.example .env
npm run typecheck
npm run build
npm test
```

## Development priorities

ClawCrew is currently optimized for:

1. durable runtime truth
2. review-first safety
3. CLI-first usability
4. low-friction OSS contribution

Please prefer changes that strengthen those pillars over adding more personas, more orchestration complexity, or more UI surface.

## Before opening a PR

Run:

```bash
npm run typecheck
npm run build
npm test
```

## Scope guardrails

- Do not add distributed infrastructure unless single-node durability is already insufficient.
- Do not add role explosion as a substitute for runtime quality.
- Do not ship unsafe default autonomy.
- Do not add documentation claims that outrun tests or implementation.

## Testing expectations

- add or update targeted Vitest coverage for runtime, persistence, adapters, or tools
- preserve restart/approval/budget behavior where relevant
- prefer persisted-state tests over purely in-memory happy paths

## Native SQLite fallback

`better-sqlite3` can fail on some local environments when the native module was built against the wrong Node version. ClawCrew now includes a file-backed fallback path for development and tests, but contributors should still prefer a working native install when possible for real SQLite behavior.
