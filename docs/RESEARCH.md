# ClawCrew Research Report

## Multi-Agent Messenger Integration — Competitive Landscape

### Top Frameworks (by GitHub Stars)
| Framework | Stars | Messenger | Communication |
|-----------|-------|-----------|---------------|
| MetaGPT | 66K | None | SOP pipeline |
| AutoGen/AG2 | 56K | Slack+Discord+TG | GroupChat + Actor |
| CrewAI | 47K | Slack/Teams | Context + delegation |
| ChatDev | 32K | None | 2-agent chat chain |
| Google A2A | 23K | HTTP/gRPC | Agent Card P2P |
| OpenAI Swarm | 21K | None | Handoff chain |

### Key Insight: "Messenger-native multi-agent" is a blue ocean
MetaGPT, ChatDev, Swarm = internal simulation only. No real Slack/Discord agent conversations.

### ClawCrew Unique Position
```
MetaGPT = internal sim (no messenger)
AutoGen = conversation framework (no SDLC)
CrewAI = sequential execution (no debate)
ClawCrew = messenger-native + SDLC + debate/consensus = ONLY combination
```

## Slack Multi-Identity Patterns
| Pattern | Slack | Discord | Best For |
|---------|-------|---------|----------|
| chat:write.customize | Yes | No | MVP, single bot |
| Webhook | No | Yes (Tzurot) | Full persona separation |
| Separate bots | Yes (LangSmith) | Yes | Production, enterprise |

## Industry Standards
- **MCP** (Anthropic): Agent-to-tool connection
- **A2A** (Google): Agent-to-agent interoperability, 50+ partners

## Architecture Decision: CONDITIONAL GO — Hybrid (Option C)
- Default: Self-managed Slack adapter (chat:write.customize)
- Optional: OpenClaw adapter (separate bots per agent)
- Fallback: Auto-switch to self-managed if OpenClaw fails

## Red/Blue Team Verdict: 5 Must-Fix Before GO
1. Budget cap in CostTracker
2. Agent cycle termination (maxCycles)
3. Oscillation detection in debate
4. Message sender authentication
5. Wire decisionTimeoutMs

## CPO Panel TOP 5 Actions
1. P0: Adaptive team sizing (simple=solo, complex=full debate)
2. P0: Human-in-the-loop gates (after PLAN/DESIGN, before DEPLOY)
3. P0: 5-min demo video + HN/ProductHunt launch
4. P1: Cost dashboard + per-project budget caps
5. P1: Korean market adapters (KakaoWork) + local LLM support

## Key References
- [AG2 Communication Agents](https://docs.ag2.ai/latest/docs/blog/2025/02/05/Communication-Agents/)
- [ChatDev ACL 2024](https://aclanthology.org/2024.acl-long.810/)
- [MetaGPT ICLR 2024](https://openreview.net/forum?id=VtmBAGCN7o)
- [Google A2A Protocol](https://github.com/a2aproject/A2A)
- [SlackAgents EMNLP 2025](https://aclanthology.org/2025.emnlp-demos.76.pdf)
- [MDAgents NeurIPS 2024](https://arxiv.org/abs/2404.15155)
- [OpenClaw Multi-Agent (Peter Cha)](https://www.peters.place/ko/post/openclaw-multi-agent)
- [clawhip](https://github.com/Yeachan-Heo/clawhip)
- [zeroclaw](https://github.com/Yeachan-Heo/zeroclaw)
- [Dust.tt Slack AI Agents](https://dust.tt/blog/slack-ai-agents)
- [Slack chat:write.customize](https://api.slack.com/scopes/chat:write.customize)
