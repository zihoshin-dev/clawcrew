# ClawCrew Next-Level AI Agent Blueprint

> Date: 2026-03-26
> Goal: Turn ClawCrew from a promising messenger-native multi-agent prototype into an open-source, personally useful, operationally credible AI agent product.

---

## 1. Problem Definition

### Reframed Goal
ClawCrew should not merely become a "bigger multi-agent framework." It should become a **trustworthy agentic control plane for software work** that is:

- easy for a solo developer to run locally,
- compelling enough to open-source,
- structured enough for Slack/OpenClaw-style team workflows,
- safe enough to let agents act with real tools.

### Core Constraint
The current repository already contains valuable primitives, but most of the "fully autonomous" promise is still expressed as orchestration scaffolding plus text-producing agents rather than durable, action-taking runtime behavior.

### Success Criteria
- A solo user can run it in **CLI-only mode** with one provider and understand what it is doing.
- A team can use it through Slack/Telegram without losing observability or control.
- Agent actions are durable, reviewable, interruptible, resumable, and policy-checked.
- The project has a clear OSS narrative: what it is, who it is for, why it is different, and how to contribute.

### Failure Criteria
- It becomes "24 agents talking in a thread" without deterministic execution and state durability.
- It optimizes for demo theatrics over tool reliability, approval safety, and operator trust.
- It overbuilds enterprise abstractions before solving setup friction, cost visibility, and lightweight mode.

---

## 2. Investigation Findings

### 2.1 Codebase Facts

#### What is real today
- `src/core/engine.ts` implements a real `OrchestrationEngine` with project lifecycle, event bus wiring, messenger ingestion, team sizing, and think/act cycles.
- `src/orchestrator/debate.ts`, `src/orchestrator/consensus.ts`, `src/orchestrator/human-gate.ts`, and `src/orchestrator/pipeline.ts` provide real orchestration primitives: debate rounds, consensus thresholds, human approval waiting, and a 7-phase SDLC pipeline.
- `src/messenger/slack.ts` and `src/messenger/telegram.ts` provide actual adapters for Slack Bolt and grammY.
- `src/persistence/sqlite-store.ts` provides persistent project/task/message/cost storage.
- `src/core/llm-router.ts` and `config/llm-config.json` provide multi-provider routing and fallback.
- `src/sandbox/executor.ts`, `src/sandbox/interceptor.ts`, and `config/policies.json` provide concrete command interception and policy-based blocking.
- `src/core/cost-tracker.ts` provides real token/cost tracking and budget threshold hooks.

#### What is still thin / aspirational
- Role agents like `src/agents/roles/researcher.ts`, `developer.ts`, and `critic.ts` mostly call an LLM and return text/spec-like outputs; they do not yet embody a durable action runtime.
- `src/tools/builtin/web-search.ts` is stubbed and returns `Web search not configured`.
- `src/tools/index.ts` exposes only three builtin tools, which is too small for the README-level promise.
- `src/core/event-bus.ts` is single-process in-memory EventEmitter-based runtime state, which is simple but limits durable multi-worker execution.
- `src/memory/fact-extractor.ts` and `decision-log.ts` are useful, but memory remains lightweight and local rather than durable workflow memory.

### 2.2 Product/User Findings
- `docs/USER-RESEARCH.md` reports weighted PMF of **5.0/10**.
- Biggest repeated gaps:
  - cost visibility,
  - setup complexity,
  - progress opacity,
  - adjustable autonomy,
  - lightweight mode.
- `docs/deep-research-report-2026-03-26.md` correctly identifies ClawCrew's strongest differentiator as the combination of:
  - messenger-native workflows,
  - SDLC pipeline structure,
  - debate/consensus primitives.

### 2.3 External Constraint Findings

#### Slack/Bolt reality
- Slack events should be acknowledged quickly (3s class of constraint) and actual work should move to a queue/background executor.
- Socket Mode is excellent for development/internal deployments; HTTP/webhook mode is better for larger, distributed, or Marketplace-facing deployments.
- Rate limiting matters both on events and on write APIs; message throughput must be throttled and retried with backoff.

#### Open-source agent platform reality
- OpenHands' strongest pattern is not "many roles" but a **typed action loop + sandboxed runtime + event stream + model agnosticism**.
- LangGraph's strongest pattern is **durable execution**: checkpoints, retries, interrupts, resumability, smaller nodes, and explicit state transitions.
- Microsoft's agent orchestration guidance emphasizes using the **least complex architecture that works** and explicitly choosing among sequential, concurrent, group-chat, handoff, and magentic orchestration rather than defaulting to multi-agent everywhere.

---

## 3. Product Direction

## Product Thesis

**ClawCrew should become an agentic work control plane, not just a multi-agent chat simulator.**

In practice, that means:
- a user submits a goal,
- ClawCrew turns it into an auditable execution graph,
- real tools run inside policy boundaries,
- humans can approve/interrupt/escalate at defined gates,
- the entire run is replayable, resumable, and cost-visible.

### Disruptive Framing

**ClawCrew should feel like pocket-steerable background workers, not chatty personas in a channel.**

That means the messenger surface is primarily for:
- task ingestion,
- approval requests,
- blast-radius previews,
- run summaries,
- budget extension decisions,
- failure alerts,
not for endless agent roleplay.

### Target Users
1. **Solo developer / founder**
   - wants CLI-first, one-provider, low-friction agent execution.
2. **OSS maintainer**
   - wants GitHub/webhook-triggered automation, review loops, and auditability.
3. **Small engineering team**
   - wants Slack-native control, approvals, and visibility into what agents are doing.

### JTBD
- "Turn vague engineering work into safe, inspectable agent execution."
- "Let me delegate work without losing control, context, or budget."
- "Give me a trustworthy AI teammate, not a noisy multi-agent theater show."

### Core Value Proposition
**Messenger-native agent operations with explicit execution state, policy gates, and resumable work.**

### Sharp Product Framing
- **Tagline:** *ClawCrew: steerable async workers from your pocket.*
- **Alternative framing:** *The CI/CD pipeline for agentic work.*

---

## 4. What to Keep vs Replace

### Keep and elevate
- Messenger-native ingress (`src/messenger/*`)
- Debate / consensus / human-gate concepts (`src/orchestrator/*`)
- Cost tracking (`src/core/cost-tracker.ts`)
- Security/policy ideas (`src/sandbox/*`, `config/policies.json`)
- SQLite-first local persistence (`src/persistence/sqlite-store.ts`)
- Role/persona storytelling (`src/agents/persona.ts`) as UX flavor, not the core execution model

### Replace or demote
- Replace role-centric thin agents as the primary abstraction.
- Demote "14+ roles" from product center to optional orchestration strategies.
- Replace pure event-loop execution with **stateful run graph + queued action execution**.
- Replace README-level "fully autonomous" framing with **configurable autonomy**.

---

## 5. Recommended Architecture

## 5.1 North Star Architecture

```text
Ingress Layer
  CLI / Slack / Telegram / future webhooks / OpenClaw hooks
      ↓
Intent + Run Creation Layer
  parse goal → choose preset → create Run + RunState + policy scope
      ↓
Planner Layer
  build execution graph / task ledger / approval points
      ↓
Execution Runtime
  node runner + tool calls + retries + checkpoints + interrupts
      ↓
Policy / Approval Layer
  allow | warn | require approval | deny
      ↓
Tool Runtime
  shell / file / git / web / external APIs / MCP / future OpenClaw tools
      ↓
Persistence + Observability
  SQLite (local) → Postgres/Redis optional later
  event log, run graph, costs, approvals, artifacts, traces
```

## 5.2 Core Concepts

### A. Run
A `Run` is the top-level durable execution object.

Suggested fields:
- `run_id`
- `source` (`cli`, `slack`, `telegram`, `webhook`)
- `goal`
- `mode` (`solo`, `review`, `full`, `custom`)
- `status` (`queued`, `running`, `waiting_approval`, `completed`, `failed`, `cancelled`)
- `budget`
- `autonomy_level`
- `channel_binding`

### B. Run Graph / Task Ledger
The real heart of the system should be a task graph or ledger, not raw agent chatter.

Each node stores:
- objective,
- inputs,
- expected output,
- executor strategy,
- tool permissions,
- retry policy,
- checkpoint,
- evidence/artifacts,
- downstream edges.

This is the bridge between ClawCrew's current pipeline primitives and a durable runtime inspired by LangGraph and OpenHands.

### C. Execution Strategy (not Role Count)
Instead of always spawning a static "team," pick one orchestration pattern per node or per run:
- **Sequential** for predictable pipelines
- **Concurrent** for parallel independent analysis
- **Group-chat / debate** for high-uncertainty decisions
- **Handoff** for specialist routing
- **Magentic / manager-led** for open-ended execution planning

This makes the system sharper and cheaper.

### D. Policy Decision Point per Action
Every action proposal must pass through a structured decision layer:
- `allow`
- `warn`
- `require_approval`
- `deny`

This should be evaluated per action, not just at shell execution time.

### E. Budget-Bounded Autonomy
Autonomy should not be binary. It should be bounded by:
- money,
- tool classes,
- filesystem scope,
- write permissions,
- time,
- approval policy.

Example:

> "Fix this bug. You have $0.50, 15 model calls, read-only mode until approval, and may only touch `src/auth/**`."

When the run exceeds any bound, it suspends and asks for explicit continuation.

### F. Interrupt / Resume as First-Class Primitive
Human-in-the-loop cannot just be "send approval message and wait." It should suspend the run at a known node boundary with resumable state.

### G. Action-Batching and Blast-Radius Preview
Before execution, the runtime should be able to present a compact execution batch such as:
- commands it plans to run,
- files it expects to touch,
- expected side effects,
- required permissions,
- rollback hint.

This turns approval from vague trust into concrete operator judgment.

---

## 6. Product Surface Design

## 6.1 Modes

### 1. Solo Mode
- CLI-only
- single provider
- minimal team / minimal orchestration
- designed for "I want to use this today"

### 2. Review Mode
- one execution agent + critic/reviewer + approval gates
- best default for serious work

### 3. Full Crew Mode
- richer orchestration for complex tasks
- explicit budget and approval policies required

This directly addresses the PMF gap around lightweight mode and adjustable autonomy.

## 6.2 User Experience

### CLI
Primary first-run UX should be:

```bash
npx clawcrew init
npx clawcrew run "fix auth bug" --mode review
npx clawcrew watch
```

### Slack / Messenger UX
- inbound message creates a run
- ClawCrew immediately acknowledges receipt
- replies with run link / run id / initial status
- detailed execution happens in threaded updates with summarization, not spam
- approval payloads show the proposed action batch and blast radius, not only plain text

### Visibility UX
Users must always see:
- current node / current executor
- waiting reason
- next approval point
- cost so far
- changed files / proposed actions
- remaining autonomy envelope (budget, permissions, allowed tools, remaining write scope)

---

## 7. OpenClaw / Channel Integration Design

Because undocumented OpenClaw internals should not be assumed, design integration as a clean adapter boundary.

### Channel Adapter Interface
- `receive(event)`
- `ack(event)`
- `postRunCreated(run)`
- `postStatusUpdate(run, summary)`
- `postApprovalRequest(run, action)`
- `postFinalResult(run)`

### OpenClaw Positioning
Treat OpenClaw as:
- a routing/control surface,
- a hook/event ingress system,
- optionally a notification and channel policy layer,
not as the hidden source of runtime truth.

That keeps ClawCrew independently useful and open-source-friendly.

---

## 8. Critical Review

### Biggest problems in the current direction
1. **Too much identity, not enough runtime.**
   Persona/role design is strong, but execution semantics are still thin.
2. **Claim/reality gap.**
   README sells autonomous development ecosystem; actual tool/action loop is still early.
3. **Single-process orchestration bottleneck.**
   EventEmitter is elegant for a prototype but weak for durable multi-run operations.
4. **Visibility is underpowered relative to autonomy ambition.**
   Users need run traces, action proposals, and cost visibility before they trust it.
5. **Product focus risk.**
   If ClawCrew tries to be Slack bot + framework + SDK + cloud platform + enterprise suite immediately, it will blur.

### Ruthless Cuts
- Do not make debate/consensus the default path for ordinary work.
- Do not center the UX on roleplay-style multi-agent chat.
- Do not keep adding human-like titles as if more personas equal more capability.
- Do not treat messenger chatter as proof of progress; progress is state transition + artifact production.

### What not to overbuild
- Do not add 20 more agent roles.
- Do not build a giant web app before fixing core run durability and visibility.
- Do not jump to distributed infra before a clean local durable runtime exists.
- Do not build Marketplace/enterprise features before `solo` and `review` modes feel excellent.

---

## 9. Option Comparison

### Option A — Slack-native Multi-Agent Bot
**Pros**: fastest to explain, leverages existing adapters.
**Cons**: too easy to become a noisy chatbot with brittle action semantics.

### Option B — OpenClaw-first orchestration layer
**Pros**: ecosystem leverage.
**Cons**: too dependent on assumptions outside this repo; weak for OSS autonomy if integration dominates identity.

### Option C — Agentic Work Control Plane (Recommended)
**Pros**:
- grounded in current assets,
- usable locally,
- adaptable to Slack/OpenClaw,
- strongest long-term architecture,
- makes autonomy, policy, approval, replay, and observability the real product.

**Cons**:
- requires reframing product story,
- some existing role-centric code becomes secondary.

---

## 10. Implementation Blueprint

## 10.1 Phase 1 — Make It Personally Useful

### Objective
Turn ClawCrew into a trustworthy local CLI agent runner.

### Deliverables
- `solo` and `review` modes
- single-provider setup path
- working run ledger in SQLite
- resumable approval/wait states
- basic action/event trace output
- action-batch preview before write actions
- budget-bounded autonomy controls
- repaired SQLite/native dependency workflow

### Design Moves
- Introduce `Run`, `RunNode`, `RunEvent`, `ApprovalRequest`, `Artifact` models
- Convert current think/act cycle into explicit node execution
- Add queue abstraction, even if local/in-process initially
- Make policy evaluation occur before tool execution

## 10.2 Phase 2 — Make It Trustworthy in Teams

### Objective
Add messenger-native control without sacrificing runtime discipline.

### Deliverables
- Slack threaded status model
- 3-second ack + queued execution split
- approval/resume loop through channel adapters
- per-run cost summaries and budget alerts
- action summaries instead of raw chatter spam

## 10.3 Phase 3 — Make It Ecosystem-Native

### Objective
Allow ClawCrew to serve as a portable orchestrator across channels and external tool ecosystems.

### Deliverables
- MCP-compatible tool adapter layer
- OpenClaw event/channel adapter
- webhook/GitHub trigger support
- richer worker/runtime isolation choices

---

## 11. Test, Reliability, and Ops Design

### Test Strategy
- **Unit**: policy engine, routing, run-state transitions, approval state machine, cost aggregation
- **Integration**: Slack adapter, Telegram adapter, tool runtime, persistence, retries
- **E2E**: CLI run → approval → resume → completion; Slack event → queued run → threaded updates
- **Failure tests**: provider outage, Slack retry, tool timeout, interrupted approval, process restart mid-run

### Reliability Requirements
- idempotent event ingestion
- retry with backoff on external calls
- explicit timeout taxonomy
- process restart recovery from checkpoints
- output throttling / message summarization

### Ops / Observability
- run timeline
- tool/action logs
- per-node cost and latency
- approval audit log
- failure categorization: provider, tool, policy, transport, persistence, human timeout

---

## 12. OSS Readiness Gaps

Current strengths:
- MIT license (`package.json`)
- strong modular TypeScript structure
- extensive tests
- credible README vision

Immediate gaps:
- missing OSS hygiene files such as CONTRIBUTING / CODE_OF_CONDUCT / CHANGELOG
- no GitHub workflow automation detected in this audit
- missing CI pipeline proof in this audit
- current native SQLite dependency mismatch in local environment causes persistence test failures

Recommended framing for OSS launch:

**ClawCrew = messenger-native agentic work control plane for software teams**

Not:
- "AGI dev team in Slack"
- "yet another multi-agent framework"

---

## 13. Final Recommendation

### Recommended Position
Build ClawCrew as a **durable, policy-aware, messenger-native agent execution control plane** with three principles:

1. **Runs over roles** — execution state is the product.
2. **Trust over theatrics** — visibility, approval, budget, replay, and policy are first-class.
3. **Least-complex orchestration that works** — use debate and multi-agent collaboration selectively, not everywhere.

### Short Tagline
**ClawCrew: run AI work like ops, not like chat.**

---

## 14. Immediate Next Actions

1. Define the durable runtime data model: `Run`, `RunNode`, `RunEvent`, `ApprovalRequest`, `Artifact`.
2. Introduce a `solo/review/full` execution preset system and make `review` the default.
3. Refactor one real workflow from role-chatter into an explicit node-based run with checkpoint/resume.
4. Split Slack ingestion into fast ack + async execution + threaded status summaries.
5. Fix local persistence reliability (`better-sqlite3` rebuild / install story) and add CI to prove the runtime works.

---

## Appendix: Evidence Pointers

- Engine: `src/core/engine.ts`
- Event bus: `src/core/event-bus.ts`
- Router: `src/core/llm-router.ts`
- Costs: `src/core/cost-tracker.ts`, `src/dashboard/cost-reporter.ts`
- Debate/consensus: `src/orchestrator/debate.ts`, `src/orchestrator/consensus.ts`
- HITL: `src/orchestrator/human-gate.ts`
- Team shaping: `src/orchestrator/team-sizer.ts`, `config/phase-teams.json`
- Agents/personas: `src/agents/base.ts`, `src/agents/persona.ts`, `src/agents/roles/*`
- Tools: `src/tools/index.ts`, `src/tools/builtin/*`
- Persistence: `src/persistence/sqlite-store.ts`
- Sandbox/security: `src/sandbox/*`, `config/policies.json`
- User research: `docs/USER-RESEARCH.md`
- Prior strategic analysis: `docs/deep-research-report-2026-03-26.md`
