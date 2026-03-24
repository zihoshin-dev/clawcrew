# ClawCrew

> Where AI agents debate, decide, and deploy.

**Messenger-based fully autonomous AI multi-agent software development ecosystem. OpenClaw-native.**

Throw an agenda into Slack or Telegram. Watch AI agents autonomously research, debate, plan, code, test, review, and deploy — then continuously improve.

## How It Works

```
You: "Build a REST API for user management with auth"
     ↓ (Slack/Telegram)
  [PM Agent]        → breaks into user stories
  [Researcher]      → investigates best practices
  [Architect]       → designs system architecture
  [Developer x3]    → implements in parallel (Claude/GPT/Gemini)
  [Critic]          → challenges every decision
  [QA Agent]        → writes and runs tests
  [Security Agent]  → audits for vulnerabilities
  [DevOps Agent]    → deploys to production
  [Retrospective]   → suggests improvements for next sprint
     ↓
  Working software + improvement backlog
```

## Features

- **14 Specialized Agent Roles** — Researcher, Architect, Developer, Critic, PM, QA, Security, Designer, Analyst, Mediator, DevOps, Scrum Master, Judge, Retrospective
- **Multi-Messenger** — Slack (Bolt SDK) and Telegram (grammY) adapters, pluggable for Discord/Teams
- **Multi-Model Routing** — Claude, GPT, Gemini with cost-aware complexity-based routing
- **Debate Protocol** — Structured propose/argue/counter/vote with confidence scoring and deadlock-breaking judge
- **7-Phase SDLC Pipeline** — Research → Plan → Design → Code → Test → Review → Deploy with gate conditions
- **Persistent Memory** — Fact extraction, decision logging, project context that survives restarts
- **Security Sandbox** — Policy engine + command interceptor blocks destructive operations
- **Continuous Improvement** — Retrospective agent analyzes completed work and feeds improvements into next sprint

## Quick Start

```bash
# Clone
git clone https://github.com/your-org/aigora.git
cd aigora

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys and messenger tokens

# Start
npm run dev

# Submit an agenda
npx tsx src/cli.ts submit "Build a todo app with React and Express"
```

## Architecture

```
src/
├── core/           # Engine, EventBus, Registry, Config, LLM Router
│   └── providers/  # Anthropic, OpenAI, Gemini adapters
├── agents/         # BaseAgent, Persona system
│   └── roles/      # 14 specialized agent implementations
├── messenger/      # Slack, Telegram adapters
├── orchestrator/   # Pipeline, Debate, Consensus, TaskBoard, Sprints
├── memory/         # MemoryStore, FactExtractor, DecisionLog
└── sandbox/        # PolicyEngine, CommandInterceptor, SandboxExecutor
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Type safety for complex agent interactions |
| Event System | EventEmitter3 | Lightweight pub/sub, no external broker needed |
| Database | SQLite/JSON | Zero-config, embedded, portable |
| Messenger SDK | Bolt + grammY | Official SDKs, Socket Mode support |
| LLM Routing | Complexity-based | Cost optimization: haiku for simple, opus for critical |

## Agent Roles

| Role | Personality | Decision Style |
|------|------------|----------------|
| PM | Balanced, pragmatic | Data-driven consensus |
| Researcher | Curious, thorough | Evidence-based |
| Architect | Principled, forward-thinking | Pattern-based |
| Developer | Creative, practical | Iterative |
| Critic | Rigorous, assertive | Devil's advocate |
| QA | Methodical, skeptical | Risk-based |
| Security | Paranoid, thorough | Threat-model driven |
| Designer | Empathetic, creative | User-centered |
| Analyst | Analytical, objective | Metric-driven |
| Mediator | Diplomatic, patient | Consensus-building |
| DevOps | Efficiency-focused | Automation-first |
| Scrum Master | Facilitative, protective | Process-oriented |
| Judge | Impartial, logical | Weighted evidence |
| Retrospective | Reflective, improvement-focused | Pattern recognition |

## Debate Protocol

```
Round 1: PROPOSE  — Each agent states position + confidence (0-1)
Round 2: ARGUE    — Agents defend with evidence
Round 3: COUNTER  — Challenge other positions
Round 4: VOTE     — Final positions with updated confidence
         ↓
Consensus? (>70% agree, confidence >0.6) → Decision made
Deadlock?  (3+ rounds, no convergence)   → Judge intervenes
```

## Configuration

```yaml
# config/default.yaml
messenger:
  type: slack  # or telegram
  slack:
    socketMode: true

llm:
  defaultProvider: anthropic
  routing:
    low: claude-haiku-4-5
    medium: claude-sonnet-4-5
    high: claude-opus-4
    critical: multi-model-consensus

sandbox:
  enabled: true
  timeout: 30000
  maxMemory: 512mb
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT

## Acknowledgments

Built on research from:
- [ChatDev](https://github.com/OpenBMB/ChatDev) — Communicative Agents for Software Development
- [MDAgents](https://arxiv.org/abs/2311.10537) — Adaptive Collaboration of LLMs
- [PersonaHub](https://arxiv.org/abs/2406.04093) — 1B Personas for Scalable Studies
- [oh-my-claudecode](https://github.com/anthropics/claude-code) — Multi-model orchestration
- [Supermemory](https://github.com/supermemoryai/supermemory) — AI Memory Engine
