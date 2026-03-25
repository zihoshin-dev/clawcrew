# ClawCrew User Research Report

## PMF Scores by Persona

| Persona | PMF | Key Gap |
|---------|-----|---------|
| Startup CTO (5-person) | 7/10 | Cost prediction, single provider mode |
| Enterprise Lead (50-person, finance) | 3/10 | On-prem LLM, enterprise DLP, audit logs |
| Solo Developer (freelancer) | 6/10 | Lightweight mode, CLI-only, cost limits |
| OSS Maintainer (100+ stars) | 5/10 | GitHub Actions, webhook triggers, YAML agents |
| PM/Planner (non-dev) | 4/10 | Dashboard, message cleanup, natural language control |

**Weighted Average PMF: 5.0/10**

## Common Patterns (5 personas)

1. **Cost visibility absent** (5/5) — everyone worries about API costs
2. **Setup complexity** (4/5) — 3 API keys + messenger tokens = too heavy for "Quick Start"
3. **Feedback loop opacity** (4/5) — users can't see what agents are doing
4. **Human-in-the-loop control** (3/5) — need adjustable autonomy, not full autonomy
5. **Lightweight mode needed** (3/5) — 24 agents is overkill for "fix this bug"

## Top 5 UX Improvements

1. Cost dashboard + budget limits (Critical, all personas)
2. Zero-config quick start: `npx clawcrew init` (High, 4/5 personas)
3. Progress visibility: web dashboard + thread separation (High, 4/5)
4. Pipeline presets: solo/review/full (Medium-High, 3/5)
5. Human-in-the-loop gates: configurable approval points (Medium-High, 3/5)

## Next Phase Priority (Impact x Feasibility)

| Phase | Timeline | Focus | Target PMF |
|-------|----------|-------|-----------|
| Phase 1 (0-4w) | "Make it easy to start" | CLI-only, single provider, presets | +2 points |
| Phase 2 (4-10w) | "Build trust" | Cost dashboard, web UI, HITL | +2 points |
| Phase 3 (10-20w) | "Expand market" | GitHub Actions, on-prem LLM, enterprise | +1 point |
