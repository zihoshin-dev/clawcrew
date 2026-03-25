# ClawCrew Next-Phase Action Plan

> 4인 패널 합의 문서 | 2026-03-24 작성
> 대상: 63 소스파일, 190 테스트, 24 에이전트 롤

---

## 현재 코드베이스 구조 요약

```
src/
  agents/         base.ts, factory.ts, persona.ts, roles/ (24개)
  core/           engine.ts, cost-tracker.ts, llm-router.ts, event-bus.ts, types.ts, config.ts, registry.ts, logger.ts
                  providers/ (anthropic.ts, openai.ts, gemini.ts, base.ts)
  orchestrator/   pipeline.ts, phase-manager.ts, debate.ts, consensus.ts, discussion.ts,
                  improvement.ts, sprint-planner.ts, task-board.ts
  messenger/      adapter.ts, factory.ts, slack.ts, telegram.ts
  sandbox/        executor.ts, interceptor.ts, policy-engine.ts
  memory/         store.ts, decision-log.ts, fact-extractor.ts, project-context.ts
  knowledge/      index.ts, leadership-wisdom.ts, org-culture.ts, work-patterns.ts
config/           policies.json, llm-config.json, phase-teams.json, agent-capabilities.json
tests/            15 파일, 190 테스트 (전부 PASS)
```

---

# Sprint 1 (Week 1-2): P0 Must Fix

## 1.1 동적 팀 구성 (Adaptive Team Sizing)

**현재 문제**: `engine.ts:176-188`의 `spawnAgentsForProject()`가 하드코딩된 `phaseTeams` 맵으로 항상 동일한 팀 구성. 단순 버그 수정에도 full debate 팀이 소환됨.

### 구현 상세

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/core/types.ts` | `TaskComplexity` 타입 추가 (재사용) | `'trivial' \| 'simple' \| 'moderate' \| 'complex'` -- LLM 라우터의 것과 구분 |
| `src/orchestrator/team-sizer.ts` | **신규** | `TeamSizer` 클래스 |
| `src/core/engine.ts` | `spawnAgentsForProject()` 리팩토링 | `TeamSizer.recommend()` 호출로 교체 |
| `config/phase-teams.json` | 확장 | complexity별 팀 구성 추가 |

```typescript
// src/orchestrator/team-sizer.ts (핵심 시그니처)
export interface TeamRecommendation {
  roles: AgentRole[];
  reasoning: string;
}

export class TeamSizer {
  constructor(private readonly phaseTeams: PhaseTeamConfig) {}

  recommend(agenda: string, phase: Phase): TeamRecommendation {
    const complexity = this.classifyComplexity(agenda);
    // trivial/simple: 단독 에이전트 (DEVELOPER or RESEARCHER)
    // moderate: required 롤만
    // complex: required + optional 전부
    ...
  }

  private classifyComplexity(agenda: string): ProjectComplexity {
    // 키워드 기반 + 길이 휴리스틱 (v1)
    // 추후 LLM 분류기로 교체 가능
  }
}
```

**예상 소요**: 4h 구현 + 2h 테스트
**테스트 전략**: 8개 유닛 테스트
- `trivial 태스크 -> 단독 에이전트 반환`
- `complex 태스크 -> full team 반환`
- `phase별 기본 팀이 정상 동작`
- `classifyComplexity() 키워드 매칭 4케이스`

**의존성**: 없음 (독립 모듈)
**리스크**: 분류 정확도. v1은 키워드 기반이므로 오분류 시 팀 과소/과대 편성 가능. fallback으로 moderate 기본값 사용.

---

## 1.2 Human-in-the-Loop 게이트 3개

**현재 문제**: `pipeline.ts`의 게이트는 artifact 존재 여부만 체크. 사람 승인 없이 PLAN->DESIGN->DEPLOY 전이 가능.

### 구현 상세

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/orchestrator/pipeline.ts` | `GateCondition` 확장 | `requiresHumanApproval: boolean` 필드 추가 |
| `src/orchestrator/human-gate.ts` | **신규** | `HumanGateManager` 클래스 |
| `src/core/event-bus.ts` | 이벤트 추가 | `HumanApprovalRequested`, `HumanApprovalReceived` |
| `src/messenger/adapter.ts` | 메서드 추가 | `requestApproval(channel, context): Promise<boolean>` |
| `src/messenger/slack.ts` | 구현 | Slack interactive message (approve/reject 버튼) |
| `src/messenger/telegram.ts` | 구현 | Telegram inline keyboard (approve/reject) |

```typescript
// src/orchestrator/human-gate.ts
export interface ApprovalRequest {
  projectId: string;
  phase: Phase;           // PLAN, DESIGN, DEPLOY 중 하나
  summary: string;        // 사람에게 보여줄 요약
  artifacts: Artifact[];  // 관련 산출물
  requestedAt: Date;
  timeoutMs: number;      // 기본 30분
}

export interface ApprovalResult {
  approved: boolean;
  approvedBy?: string;
  comment?: string;
  respondedAt: Date;
}

export class HumanGateManager {
  constructor(
    private readonly eventBus: EventBus<AigoraEvents>,
    private readonly messenger: MessengerAdapter,
  ) {}

  async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
    // 1. 메신저로 승인 요청 전송
    // 2. eventBus.waitFor('HumanApprovalReceived', pred, timeout)
    // 3. 타임아웃 시 자동 거부 (안전 기본값)
  }
}
```

**게이트 삽입 위치 (pipeline.ts)**:
- PLAN phase `exitGate`에 `requiresHumanApproval: true` 추가
- DESIGN phase `exitGate`에 `requiresHumanApproval: true` 추가
- DEPLOY phase `entryGate`에 `requiresHumanApproval: true` 추가

**예상 소요**: 6h 구현 + 3h 테스트
**테스트 전략**: 12개 테스트
- `HumanGateManager` 단위: 승인/거부/타임아웃 3케이스
- Pipeline 통합: PLAN exit gate에서 승인 대기, DESIGN exit gate에서 거부 시 진행 차단, DEPLOY entry gate
- 메신저 mock: Slack/Telegram 포맷 검증 2케이스
- 이벤트 흐름: `HumanApprovalRequested` -> `HumanApprovalReceived` 라운드트립 2케이스

**의존성**: 1.1 (TeamSizer) 없음, 독립 구현 가능. 단, pipeline.ts 수정이 겹치므로 1.1과 동시 진행 시 merge 주의.
**리스크**: 메신저 사용자가 응답 안 하면 무한 블로킹. 타임아웃 30분 기본값 + 자동 거부로 방어.

---

## 1.3 예산 상한선 (Budget Cap)

**현재 문제**: `cost-tracker.ts`가 비용을 추적만 할 뿐 상한 체크 없음. 프로젝트가 무한 LLM 호출 가능.

### 구현 상세

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/core/types.ts` | `AigoraConfig` 확장 | `budgetLimit?: { perProject?: number; global?: number }` |
| `src/core/cost-tracker.ts` | 확장 | `setBudget()`, `checkBudget()`, `isOverBudget()` 추가 |
| `src/core/event-bus.ts` | 이벤트 추가 | `BudgetWarning`, `BudgetExceeded` |
| `src/core/engine.ts` | 통합 | LLM 호출 전 예산 체크, 80% 도달 시 경고 |

```typescript
// cost-tracker.ts 확장
export interface BudgetConfig {
  perProject?: number;  // USD
  global?: number;      // USD
  warningThreshold?: number; // 0.0-1.0, 기본 0.8
}

export class CostTracker {
  private budgetConfig?: BudgetConfig;
  private readonly byProject: Map<string, UsageStats> = new Map(); // 추가

  setBudget(config: BudgetConfig): void { ... }

  checkBudget(projectId?: string): {
    withinBudget: boolean;
    usage: number;
    limit: number;
    percentage: number;
  } { ... }

  // track() 메서드에 projectId 파라미터 추가
  track(agentId: string, response: LlmResponse, projectId?: string): void {
    // 기존 로직 + projectId별 추적
    // 80% 도달 시 BudgetWarning 이벤트
    // 100% 초과 시 BudgetExceeded 이벤트 + throw
  }
}
```

**예상 소요**: 3h 구현 + 2h 테스트
**테스트 전략**: 10개 테스트
- `setBudget()` 설정 검증
- `checkBudget()` 프로젝트별/글로벌 2케이스
- 80% 경고 이벤트 발생 확인
- 100% 초과 시 throw 확인
- `track()`에 projectId 추가해도 기존 190개 테스트 깨지지 않는지 확인 (호환성)
- 예산 미설정 시 무제한 동작 확인

**의존성**: 없음
**리스크**: `track()` 시그니처 변경이 기존 호출부에 영향. projectId를 optional로 유지하면 하위호환 보장.

---

## 1.4 에이전트 사이클 종료 조건

**현재 문제**: `engine.ts:158-173`의 `runAgentCycle()`에 종료 조건 없음. 에이전트가 무한 think/act 반복 가능. `debate.ts:68`에 `DEADLOCK_STALE_ROUNDS=3`이 있지만 이는 debate 전용.

### 구현 상세

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/orchestrator/cycle-guard.ts` | **신규** | `CycleGuard` 클래스 |
| `src/core/engine.ts` | 통합 | `runAgentCycle()`에 가드 적용 |
| `src/core/types.ts` | 확장 | `AigoraConfig.maxCyclesPerPhase?: number` |

```typescript
// src/orchestrator/cycle-guard.ts
export interface CycleGuardConfig {
  maxCycles: number;              // 기본 20
  oscillationWindow: number;      // 최근 N개 출력 비교, 기본 5
  oscillationThreshold: number;   // 유사도 0.0-1.0, 기본 0.9
}

export class CycleGuard {
  private cycleCount = 0;
  private readonly recentOutputs: string[] = [];

  constructor(private readonly config: CycleGuardConfig) {}

  recordCycle(output: string): void {
    this.cycleCount++;
    this.recentOutputs.push(output);
    if (this.recentOutputs.length > this.config.oscillationWindow) {
      this.recentOutputs.shift();
    }
  }

  shouldStop(): { stop: boolean; reason: string } {
    if (this.cycleCount >= this.config.maxCycles) {
      return { stop: true, reason: `maxCycles(${this.config.maxCycles}) 도달` };
    }
    if (this.detectOscillation()) {
      return { stop: true, reason: 'oscillation detected' };
    }
    return { stop: false, reason: '' };
  }

  private detectOscillation(): boolean {
    // 최근 N개 출력의 Jaccard 유사도 비교
    // 모든 쌍이 threshold 이상이면 oscillation으로 판정
  }
}
```

**예상 소요**: 3h 구현 + 2h 테스트
**테스트 전략**: 8개 테스트
- `maxCycles` 도달 시 stop
- oscillation 감지: 동일 출력 반복
- oscillation 미감지: 출력이 다른 경우
- `recordCycle()` 윈도우 슬라이딩
- `reset()` 후 재사용

**의존성**: 없음
**리스크**: oscillation 감지 정확도. Jaccard 유사도는 단순하지만 LLM 출력의 미세 변화를 놓칠 수 있음. v1으로 충분하고 추후 임베딩 기반으로 교체 가능.

---

## 1.5 메시지 발신자 인증 (Bot ID Verification)

**현재 문제**: `slack.ts:62-86`, `telegram.ts:42-67`의 메시지 핸들러가 발신자 검증 없음. 아무 사용자의 메시지도 처리됨.

### 구현 상세

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/messenger/auth.ts` | **신규** | `MessageAuthenticator` 클래스 |
| `src/messenger/adapter.ts` | 확장 | `IncomingMessage`에 `botId?: string`, `isVerified: boolean` 추가 |
| `src/messenger/slack.ts` | 통합 | `bot_id` 체크, 자기 메시지 무시, 허용 사용자 필터 |
| `src/messenger/telegram.ts` | 통합 | `from.is_bot` 체크, 허용 사용자 필터 |
| `src/core/types.ts` | 확장 | `MessengerConfig.allowedUserIds?: string[]` |

```typescript
// src/messenger/auth.ts
export interface AuthConfig {
  allowedUserIds?: string[];  // 비어있으면 전체 허용
  rejectBots?: boolean;       // 기본 true (자기 자신 메시지 루프 방지)
  botId?: string;             // 자기 자신의 bot ID
}

export class MessageAuthenticator {
  constructor(private readonly config: AuthConfig) {}

  authenticate(msg: IncomingMessage): {
    authenticated: boolean;
    reason?: string;
  } {
    // 1. botId와 userId 동일 -> 자기 메시지 무시
    // 2. rejectBots && msg.isBot -> 거부
    // 3. allowedUserIds 비어있지 않으면 화이트리스트 체크
  }
}
```

**Slack 통합** (`slack.ts`):
```typescript
// constructor에서
this.app.message(async ({ message }) => {
  const raw = message as { bot_id?: string; user?: string; ... };
  if (raw.bot_id !== undefined) return; // 봇 메시지 무시
  // ... 기존 로직
  incoming.isVerified = this.authenticator.authenticate(incoming).authenticated;
  if (!incoming.isVerified) return;
});
```

**Telegram 통합** (`telegram.ts`):
```typescript
this.bot.on('message:text', (ctx) => {
  const from = ctx.message?.from;
  if (from?.is_bot) return; // 봇 메시지 무시
  // ... 기존 로직
});
```

**예상 소요**: 3h 구현 + 2h 테스트
**테스트 전략**: 8개 테스트
- 봇 자기 메시지 필터링
- 허용 사용자 통과/차단
- 빈 allowedUserIds -> 전체 허용
- Slack `bot_id` 체크
- Telegram `is_bot` 체크

**의존성**: 없음
**리스크**: 허용 사용자 관리의 운영 부담. 초기에는 설정 파일 기반, 추후 동적 관리 지원.

---

## Sprint 1 일정 요약

```
Week 1:
  Day 1-2: 1.1 TeamSizer + 1.3 BudgetCap (병렬)
  Day 3-4: 1.2 HumanGate (가장 큰 항목)
  Day 5:   1.4 CycleGuard + 1.5 Auth (병렬)

Week 2:
  Day 1-2: 통합 테스트 + 엣지케이스
  Day 3:   기존 190개 테스트 회귀 확인
  Day 4-5: 버그 수정 + 문서화
```

**Sprint 1 완료 시 예상 테스트 수**: 190 (기존) + 46 (신규) = **236개**

---

# Sprint 2 (Week 3-4): P0 GTM + P1 초기

## 2.1 README 리팩토링 (2일)

| 작업 | 상세 |
|------|------|
| 경쟁사 비교 테이블 | CrewAI, AutoGen, MetaGPT, LangGraph 대비 차별점 |
| 아키텍처 다이어그램 | Mermaid 기반 시스템 흐름도 |
| 퀵스타트 가이드 | 5분 내 설치->실행 가능한 예제 |
| 배지 | CI 상태, 테스트 커버리지, 라이선스 |

## 2.2 5분 데모 영상 (3일)

| 단계 | 내용 | 시간 |
|------|------|------|
| 인트로 | 문제 정의 + ClawCrew 소개 | 30초 |
| 설치 | `npm install -g clawcrew` -> 설정 | 1분 |
| 데모 | Slack에서 agenda 제출 -> 에이전트 토론 -> 코드 생성 | 2분 |
| 아키텍처 | 7-phase pipeline, 24 agents, multi-LLM | 1분 |
| CTA | GitHub star, 기여 방법 | 30초 |

## 2.3 Slack chat:write.customize (2일)

| 파일 | 변경 |
|------|------|
| `src/messenger/slack.ts` | `sendMessage()`에 `username`, `icon_emoji` 파라미터 추가 |
| `src/messenger/adapter.ts` | `sendMessage()` 시그니처에 optional `identity` 파라미터 |

```typescript
// slack.ts sendMessage 변경
async sendMessage(
  channel: string,
  text: string,
  threadId?: string,
  identity?: { username: string; iconEmoji: string },
): Promise<string> {
  const result = await this.app.client.chat.postMessage({
    channel, text,
    ...(threadId ? { thread_ts: threadId } : {}),
    ...(identity ? { username: identity.username, icon_emoji: identity.iconEmoji } : {}),
  });
  return String(result.ts ?? '');
}
```

**Slack 앱 권한 요구사항**: OAuth scope에 `chat:write.customize` 추가 필요.

## 2.4 Tool Use 프레임워크 초기 설계 (3일)

| 파일 | 설명 |
|------|------|
| `src/tools/registry.ts` | **신규** - 도구 등록/검색 레지스트리 |
| `src/tools/types.ts` | **신규** - `Tool`, `ToolInput`, `ToolOutput` 인터페이스 |
| `src/tools/builtin/web-search.ts` | **신규** - 웹 검색 도구 |
| `src/tools/builtin/code-exec.ts` | **신규** - 코드 실행 도구 (SandboxExecutor 래핑) |
| `src/tools/builtin/file-io.ts` | **신규** - 파일 읽기/쓰기 도구 |

```typescript
// src/tools/types.ts
export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  execute(input: unknown): Promise<ToolOutput>;
  requiredPermissions?: string[];
}

export interface ToolOutput {
  success: boolean;
  result: unknown;
  error?: string;
}
```

**Sprint 2 완료 시 예상 테스트 수**: 236 + 20 (tool framework) = **256개**

---

# Sprint 3 (Week 5-8): P1 완료

## 3.1 프로젝트 상태 SQLite 영속화 (1주)

| 파일 | 설명 |
|------|------|
| `src/persistence/sqlite-store.ts` | **신규** - better-sqlite3 기반 영속 레이어 |
| `src/persistence/migrations/001-initial.sql` | **신규** - projects, tasks, messages, artifacts 테이블 |
| `src/persistence/types.ts` | **신규** - 영속화 인터페이스 |
| `src/core/engine.ts` | 통합 - `ProjectStore` 주입 |
| `src/memory/store.ts` | 리팩토링 - JSON -> SQLite 전환 |

주요 테이블:
```sql
CREATE TABLE projects (id TEXT PK, agenda TEXT, channel TEXT, phase TEXT, status TEXT, created_at, updated_at);
CREATE TABLE tasks (id TEXT PK, project_id TEXT FK, title TEXT, status TEXT, assigned_to TEXT, phase TEXT);
CREATE TABLE messages (id TEXT PK, project_id TEXT FK, agent_id TEXT, content TEXT, phase TEXT, timestamp);
CREATE TABLE artifacts (id TEXT PK, project_id TEXT FK, phase TEXT, type TEXT, content JSON, created_by TEXT);
CREATE TABLE cost_tracking (id INTEGER PK, project_id TEXT, agent_id TEXT, model TEXT, tokens INT, cost REAL);
```

## 3.2 LLM 응답 캐싱 (1주)

| 파일 | 설명 |
|------|------|
| `src/core/llm-cache.ts` | **신규** - `LlmCache` (SHA256 해시 키, TTL 기반 만료) |
| `src/core/llm-router.ts` | 통합 - `route()` 메서드에 캐시 조회 추가 |

캐시 키: `SHA256(systemPrompt + prompt + model + temperature)`. 동일 요청은 LLM 호출 없이 캐시 반환. TTL 기본 1시간.

## 3.3 비용 대시보드 (메신저 리포팅) (1주)

| 파일 | 설명 |
|------|------|
| `src/dashboard/cost-reporter.ts` | **신규** - 비용 집계 + 메신저 리포트 |
| `src/dashboard/formatters.ts` | **신규** - Slack Block Kit / Telegram HTML 포매터 |
| `src/cli.ts` | 확장 - `clawcrew cost` 서브커맨드 |

기능: 프로젝트별/에이전트별/모델별 비용 분석, 일간/주간 리포트 자동 전송.

## 3.4 Tool Use 프레임워크 완성 (1주)

Sprint 2의 초기 설계를 확장:
- 에이전트 자율 도구 선택 (`BaseAgent.selectTools()`)
- LLM function calling 연동
- 도구 실행 결과를 대화 히스토리에 자동 주입

**Sprint 3 완료 시 예상 테스트 수**: 256 + 40 (SQLite + 캐시 + 대시보드 + 도구) = **296개**

---

# Sprint 4 (Week 9-12): P1 한국시장 + P2 시작

## 4.1 카카오워크/잔디 어댑터 (2주)

| 파일 | 설명 |
|------|------|
| `src/messenger/kakaowork.ts` | **신규** - 카카오워크 REST API 어댑터 |
| `src/messenger/jandi.ts` | **신규** - 잔디 Webhook + API 어댑터 |
| `src/messenger/factory.ts` | 확장 - `'kakaowork' \| 'jandi'` 타입 추가 |
| `src/core/types.ts` | 확장 - `MessengerConfig.type`에 신규 플랫폼 추가 |

## 4.2 HyperCLOVA X / Ollama 프로바이더 (1주)

| 파일 | 설명 |
|------|------|
| `src/core/providers/hyperclova.ts` | **신규** - HyperCLOVA X API 래퍼 |
| `src/core/providers/ollama.ts` | **신규** - Ollama REST API 래퍼 |
| `src/core/llm-router.ts` | 확장 - provider switch에 추가 |
| `config/llm-config.json` | 확장 - 신규 모델 pricing 추가 |

## 4.3 DLP 개인정보 마스킹 레이어 (1주)

| 파일 | 설명 |
|------|------|
| `src/security/dlp.ts` | **신규** - `DlpFilter` (정규식 기반 PII 감지/마스킹) |
| `src/security/patterns.ts` | **신규** - 한국 PII 패턴 (주민번호, 전화번호, 이메일, 카드번호) |
| `src/core/llm-router.ts` | 통합 - LLM 호출 전 DLP 필터 적용 |
| `src/messenger/adapter.ts` | 통합 - 수신/발신 메시지 DLP 필터 |

## 4.4 P2 시작: Redis 이벤트 버스 (1주, 설계+PoC)

| 파일 | 설명 |
|------|------|
| `src/core/event-bus-redis.ts` | **신규** - Redis Pub/Sub 기반 이벤트 버스 |
| `src/core/event-bus.ts` | 리팩토링 - 인터페이스 추출, 로컬/Redis 전략 패턴 |

**Sprint 4 완료 시 예상 테스트 수**: 296 + 50 (어댑터 + 프로바이더 + DLP + Redis) = **346개**

---

# 비판가의 반론

## Sprint 1: "이게 왜 실패할 수 있는지"

1. **TeamSizer의 키워드 분류가 너무 단순하다.** "fix button color"를 trivial로 분류하겠지만, 실제로는 디자인 시스템 전체를 건드리는 작업일 수 있다. v1이 오분류할 확률 30% 이상. 실용적 대안: LLM 1회 호출로 complexity를 판단하는 것이 오히려 저렴하다 (haiku 1회 = $0.001 미만).

2. **HumanGate의 30분 타임아웃이 현실성 없다.** 새벽에 돌아가는 자율 에이전트가 DEPLOY 게이트에서 30분 대기 후 자동 거부하면, 다음 날 아침까지 진행 불가. 타임아웃 정책을 시간대별로 다르게 설정하거나, 비업무시간에는 HITL 게이트를 비활성화하는 옵션이 필요하다.

3. **BudgetCap의 track() 시그니처 변경이 위험하다.** projectId를 optional로 유지한다고 했지만, engine.ts의 호출부에서 projectId를 전달하려면 agent가 자신의 projectId를 알아야 한다. 현재 BaseAgent에는 projectId 개념이 없다. 이 전파 작업이 예상보다 넓을 수 있다.

4. **5개 항목 2주는 빡빡하다.** 특히 HumanGate는 Slack/Telegram 양쪽 interactive UI 구현이 필요하고, 실제 메신저 테스트까지 고려하면 6h+3h 추정이 낙관적이다.

## Sprint 2:

5. **README 리팩토링과 데모 영상을 동시에 하면 둘 다 대충된다.** 데모 영상은 제품이 안정적으로 동작해야 찍을 수 있는데, Sprint 1의 변경사항이 안정화되기 전에 찍으면 재촬영이 필요하다.

6. **Tool Use 프레임워크 "초기 설계"만 하고 Sprint 3에서 "완성"하는 것은 설계 변경 리스크가 크다.** 실제 LLM function calling을 붙여보면 인터페이스가 바뀔 가능성이 높다.

## Sprint 3:

7. **SQLite 영속화는 메모리 내 데이터 구조를 전면 리팩토링해야 한다.** 현재 `Map<string, Project>`, `Map<string, MemoryEntry>` 등 인메모리 구조가 20군데 이상 퍼져있다. "1주"는 비현실적이다.

## Sprint 4:

8. **카카오워크 API는 기업 계정이 있어야 테스트 가능하다.** 개인 개발 환경에서는 샌드박스가 제한적. 잔디도 마찬가지. mock 테스트만으로는 실제 연동 문제를 잡을 수 없다.

---

# TPM의 리스크 매트릭스

| # | 리스크 | 확률 | 영향 | 점수 | 대응 |
|---|--------|------|------|------|------|
| R1 | Sprint 1 일정 초과 (HumanGate 복잡성) | 높음 (70%) | 높음 | **49** | Week 2의 버퍼 3일을 HumanGate에 우선 배정. Telegram interactive keyboard는 v1에서 제외하고 텍스트 명령("/approve", "/reject")으로 대체 가능. |
| R2 | BudgetCap projectId 전파가 예상 외 범위 | 중간 (50%) | 중간 | **25** | projectId를 engine 레벨에서만 주입하고, agent 내부에는 전파하지 않는 방식으로 범위 제한. engine.ts의 `runAgentCycle()` 안에서 track 호출 시 projectId를 직접 전달. |
| R3 | SQLite 마이그레이션 중 기존 테스트 깨짐 | 중간 (40%) | 높음 | **28** | Repository 패턴 도입: 인터페이스 `ProjectStore` 뒤에 InMemory/SQLite 구현 교체. 기존 테스트는 InMemory 유지. |
| R4 | 카카오워크/잔디 API 접근 불가 | 높음 (60%) | 낮음 | **18** | API 스펙 기반 mock 어댑터 우선 구현. 실제 연동은 파트너 계정 확보 후. Sprint 4를 P2 항목으로 스왑 가능. |
| R5 | 데모 영상 재촬영 | 중간 (50%) | 낮음 | **10** | 데모를 Sprint 2 후반에 배치. Sprint 1 안정화 확인 후 촬영. |

**총평**: R1이 최우선 관리 대상. HumanGate의 범위를 Sprint 1에서는 텍스트 기반 간이 구현으로 제한하고, interactive UI는 Sprint 2로 연기하는 것을 권장.

---

# 아키텍트의 기술 의존성 DAG

```
                    ┌─────────────────────────────────────┐
                    │        Sprint 1 (병렬 가능)          │
                    │                                     │
                    │  [1.1 TeamSizer]    [1.3 BudgetCap] │
                    │       │                   │         │
                    │       │                   │         │
                    │  [1.5 Auth] ←독립    [1.4 CycleGuard]│
                    │                                     │
                    │       [1.2 HumanGate]               │
                    │         │ (pipeline.ts 변경 필요)     │
                    └─────────┼───────────────────────────┘
                              │
                    ┌─────────▼───────────────────────────┐
                    │        Sprint 2                      │
                    │                                     │
                    │  [2.1 README]     [2.2 데모]         │
                    │       │               │             │
                    │  [2.3 Slack customize]               │
                    │       │                             │
                    │  [2.4 Tool Framework 초기]           │
                    └─────────┼───────────────────────────┘
                              │
                    ┌─────────▼───────────────────────────┐
                    │        Sprint 3                      │
                    │                                     │
                    │  [3.1 SQLite] ──→ [3.3 대시보드]     │
                    │       │                             │
                    │  [3.2 LLM 캐시] (독립)               │
                    │       │                             │
                    │  [3.4 Tool Framework 완성]           │
                    │       │ (2.4에 의존)                 │
                    └─────────┼───────────────────────────┘
                              │
                    ┌─────────▼───────────────────────────┐
                    │        Sprint 4                      │
                    │                                     │
                    │  [4.1 카카오/잔디] (messenger/ 의존)  │
                    │       │                             │
                    │  [4.2 HyperCLOVA/Ollama] (독립)     │
                    │       │                             │
                    │  [4.3 DLP] ──→ llm-router + messenger│
                    │       │                             │
                    │  [4.4 Redis EventBus] (event-bus 의존)│
                    └─────────────────────────────────────┘
```

### 핵심 의존성 규칙

1. **1.2 HumanGate -> pipeline.ts 변경**: 1.1 TeamSizer와 동시 수정 시 merge conflict 발생. **1.1을 먼저 머지하고 1.2 진행**.
2. **3.1 SQLite -> 3.3 대시보드**: 대시보드는 SQLite에서 집계 쿼리를 돌려야 함. SQLite 없이는 인메모리 CostTracker 데이터만 사용 가능.
3. **3.4 Tool Framework -> 2.4**: Sprint 2의 타입/인터페이스 위에 구축. 중간에 인터페이스 변경하면 Sprint 3에서 재작업.
4. **4.3 DLP -> llm-router + messenger**: 두 레이어 모두에 필터를 삽입해야 함. 이 변경이 Sprint 1-3의 안정성을 해치지 않도록 미들웨어 패턴 사용.

### 구현 순서 추천 (Sprint 1 내)

```
Day 1: [1.1 TeamSizer] + [1.3 BudgetCap] (병렬, 파일 겹침 없음)
Day 2: [1.1 머지] → [1.5 Auth] (messenger/ 수정)
Day 3: [1.2 HumanGate] 시작 (pipeline.ts + event-bus.ts + messenger/)
Day 4: [1.2 완성] + [1.4 CycleGuard] (engine.ts 수정, HumanGate와 겹치지 않음)
Day 5: 통합 + 회귀 테스트
```

---

# 전략가의 마일스톤 체크

## Sprint 1 끝 (Week 2) -- "안전한 자율 에이전트"

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 테스트 수 | >= 230 | `vitest run` 결과 |
| 회귀 실패 | 0 | 기존 190개 전부 PASS |
| HumanGate 동작 | PLAN 후 승인 요청 발송 확인 | 수동 E2E: Slack에서 agenda 제출 -> PLAN 완료 후 approve 버튼 노출 |
| BudgetCap 동작 | 예산 초과 시 LLM 호출 차단 확인 | 유닛 테스트 + 수동: $0.01 한도로 설정 후 호출 시도 |
| 보안 기본 | bot_id 메시지 무시 확인 | Slack에서 봇 자체 메시지에 무반응 확인 |

## Sprint 2 끝 (Week 4) -- "보여줄 수 있는 제품"

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| README 품질 | GitHub에서 3초 내 "이게 뭔지" 파악 가능 | 5명에게 README만 보여주고 제품 설명 요청 |
| 데모 영상 | 5분 이내, 1080p, 음성 포함 | YouTube 업로드 가능 상태 |
| Slack 에이전트 아바타 | 에이전트별 이름+이모지 표시 | 스크린샷 증거 |
| Tool 인터페이스 | 3개 이상 빌트인 도구 등록 | `ToolRegistry.list().length >= 3` |

## Sprint 3 끝 (Week 8) -- "프로덕션 가까운 제품"

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 영속성 | 프로세스 재시작 후 프로젝트 상태 복원 | E2E: 프로젝트 생성 -> 프로세스 kill -> 재시작 -> 프로젝트 조회 |
| 캐시 히트율 | 동일 프롬프트 2회 호출 시 100% 히트 | 유닛 테스트 |
| 비용 가시성 | Slack에서 `/cost` 명령으로 비용 조회 | 수동 E2E |
| 테스트 수 | >= 290 | `vitest run` |

## Sprint 4 끝 (Week 12) -- "한국 시장 진입 준비"

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 한국 메신저 | 카카오워크 OR 잔디 1개 이상 mock 연동 | 어댑터 테스트 PASS |
| 로컬 LLM | Ollama로 전체 파이프라인 1회 통과 | E2E: Ollama llama3 모델로 agenda 제출 -> PLAN 완료 |
| PII 보호 | 주민번호/전화번호 마스킹 | DLP 테스트: 입력에 PII 포함 -> 출력에 마스킹 확인 |
| 테스트 수 | >= 340 | `vitest run` |

---

# 부록: 파일 변경 영향도 매트릭스

| 파일 | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | 누적 변경 횟수 |
|------|----------|----------|----------|----------|--------------|
| `src/core/types.ts` | 1.1, 1.3, 1.4, 1.5 | - | - | 4.1 | **5** (높은 충돌 리스크) |
| `src/core/engine.ts` | 1.1, 1.3, 1.4 | - | 3.1 | - | **4** |
| `src/core/event-bus.ts` | 1.2, 1.3 | - | - | 4.4 | **3** |
| `src/orchestrator/pipeline.ts` | 1.2 | - | - | - | **1** |
| `src/core/cost-tracker.ts` | 1.3 | - | 3.3 | - | **2** |
| `src/messenger/slack.ts` | 1.2, 1.5 | 2.3 | - | - | **3** |
| `src/messenger/telegram.ts` | 1.2, 1.5 | - | - | - | **2** |
| `src/messenger/adapter.ts` | 1.2, 1.5 | 2.3 | - | 4.3 | **4** |
| `src/core/llm-router.ts` | - | - | 3.2 | 4.2, 4.3 | **3** |

**가장 위험한 파일**: `types.ts` (5회 변경), `engine.ts` (4회), `adapter.ts` (4회). 이 파일들의 변경은 인터페이스 안정화 후 진행해야 한다. Sprint 1에서 types.ts를 한번에 모든 필요 타입을 추가하는 것을 권장.

---

# 총 작업량 요약

| Sprint | 기간 | 신규 파일 | 수정 파일 | 신규 테스트 | 누적 테스트 |
|--------|------|----------|----------|------------|------------|
| 1 | Week 1-2 | 4 | 8 | ~46 | ~236 |
| 2 | Week 3-4 | 6 | 4 | ~20 | ~256 |
| 3 | Week 5-8 | 6 | 4 | ~40 | ~296 |
| 4 | Week 9-12 | 8 | 5 | ~50 | ~346 |
| **합계** | **12주** | **24** | **21** | **~156** | **~346** |
