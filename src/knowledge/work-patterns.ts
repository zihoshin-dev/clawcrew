// ---------------------------------------------------------------------------
// Work Patterns Knowledge Base
// ---------------------------------------------------------------------------

export type PatternCategory =
  | 'team-structure'
  | 'decision-framework'
  | 'communication-style'
  | 'innovation-process';

export interface WorkPattern {
  name: string;
  category: PatternCategory;
  description: string;
  origin: string;
  bestFor: string[];
  tradeoffs: string[];
  implementation: string[];
}

// ---------------------------------------------------------------------------
// Team Structure patterns
// ---------------------------------------------------------------------------

const TEAM_STRUCTURES: WorkPattern[] = [
  {
    name: 'Squad Model (Spotify)',
    category: 'team-structure',
    description:
      '각 Squad는 특정 제품 영역의 완전한 오너십을 갖는 자율적 소규모 팀(6-12명). ' +
      'Chapter(기술 전문성), Guild(관심사 커뮤니티), Tribe(연관 Squad 집합)로 지식 공유.',
    origin: 'Spotify',
    bestFor: ['제품 영역이 명확히 분리된 조직', '기술적으로 성숙한 팀', '자율성을 선호하는 문화'],
    tradeoffs: [
      '조율 비용 증가 — Squad 간 의존성 관리 필요',
      '기술 표준화 어려움 — 각 Squad가 다른 기술 선택 가능',
      '문서화에 규율 필요',
    ],
    implementation: [
      '제품 도메인 기준으로 Squad 경계 정의',
      '각 Squad에 PO(Product Owner) 배치',
      'Chapter Lead가 기술 표준 유지',
      '분기별 Guild 미팅으로 지식 공유',
    ],
  },
  {
    name: 'Cell Model (토스)',
    category: 'team-structure',
    description:
      '6명 이하의 극소수정예 셀이 특정 사용자 문제의 전체 라이프사이클을 담당. ' +
      'CEO 직접 보고 구조로 의사결정 경로 최소화. 셀 간 독립성 최대화.',
    origin: '토스 (비바리퍼블리카)',
    bestFor: ['빠른 실행이 필요한 스타트업', '명확한 제품 문제가 있는 조직', '자율과 책임 문화'],
    tradeoffs: [
      '셀 규모의 한계 — 대형 프로젝트는 여러 셀 조율 필요',
      '지식 사일로 위험 — 셀 간 학습 공유 메커니즘 필요',
      '높은 개인 역량 의존도',
    ],
    implementation: [
      '사용자 문제 단위로 셀 구성 (기능이 아닌 문제 기준)',
      '셀 리드가 기획·실행·측정 전담',
      '주간 전체 셀 싱크로 투명성 유지',
      '6개월 단위 셀 리뷰 및 재편',
    ],
  },
  {
    name: 'Two-Pizza Teams (Amazon)',
    category: 'team-structure',
    description:
      '피자 두 판으로 배부를 수 있는 크기(5-8명)의 팀. ' +
      '각 팀은 서비스 전체 오너십(build it, run it). ' +
      'API 계약으로 팀 간 인터페이스를 명확히 하고 내부 구현은 자율.',
    origin: 'Amazon (제프 베이조스)',
    bestFor: ['마이크로서비스 아키텍처', '독립적으로 배포 가능한 서비스 조직', '명확한 도메인 경계'],
    tradeoffs: [
      '작은 팀이 많아지면 조율 비용 급증',
      '공통 인프라 투자 어려움',
      'Undifferentiated heavy lifting 중복 위험',
    ],
    implementation: [
      '서비스 경계 = 팀 경계',
      '팀이 자체 배포 파이프라인 소유',
      'API 계약 우선 설계',
      '운영 메트릭의 팀 소유',
    ],
  },
  {
    name: 'Cross-functional Team (Apple)',
    category: 'team-structure',
    description:
      '하드웨어·소프트웨어·디자인·마케팅이 하나의 제품 팀으로 통합. ' +
      'DRI(Directly Responsible Individual)가 모든 결정의 명확한 책임자. ' +
      '기능 조직(function)보다 제품(product) 중심.',
    origin: 'Apple (스티브 잡스)',
    bestFor: [
      '하드웨어+소프트웨어 통합 제품',
      '사용자 경험이 핵심인 제품',
      '강한 비전 리더십이 있는 조직',
    ],
    tradeoffs: [
      '기능 전문성 개발 어려움 — 깊이보다 폭',
      'DRI 의존도 높음 — 핵심 인물 이탈 시 리스크',
      '비밀주의 문화와 함께 작동 — 투명성 제한',
    ],
    implementation: [
      '제품 라인 기준으로 팀 구성',
      'DRI를 모든 의사결정에 명시적으로 지정',
      '기능팀(Engineering, Design 등)과 매트릭스 구조',
      '주간 크로스펑셔널 리뷰',
    ],
  },
];

// ---------------------------------------------------------------------------
// Decision Framework patterns
// ---------------------------------------------------------------------------

const DECISION_FRAMEWORKS: WorkPattern[] = [
  {
    name: 'DACI',
    category: 'decision-framework',
    description:
      'Driver(추진자), Approver(승인자), Contributor(기여자), Informed(공유 대상)를 명확히 해 의사결정 책임을 구조화.',
    origin: 'Intuit / 실리콘밸리 일반',
    bestFor: ['여러 이해관계자가 관여하는 결정', '승인 권한이 불명확한 조직', '교차 기능팀'],
    tradeoffs: [
      'RACI 변형 — 익숙지 않은 조직에선 오버헤드',
      'Approver 병목 발생 가능',
    ],
    implementation: [
      '결정 시작 시 DACI 매트릭스 작성',
      'Driver가 프로세스를 주도하되 결정권은 Approver',
      'Informed는 결정 후 통보, 동의 불필요',
    ],
  },
  {
    name: 'RFC (Request for Comments)',
    category: 'decision-framework',
    description:
      '변경 제안을 문서화하고 팀 리뷰를 거쳐 결정. ' +
      '배경·문제·제안·대안·트레이드오프를 명확히 기술. ' +
      '비동기 협업과 결정의 추적성을 동시에 확보.',
    origin: 'IETF / 오픈소스 커뮤니티 → 테크 기업 채택',
    bestFor: ['아키텍처 결정', '팀 표준 변경', '리모트·비동기 조직'],
    tradeoffs: [
      '작성 비용 — 작은 결정에는 과함',
      '응답 없는 RFC는 결정 지연',
    ],
    implementation: [
      'RFC 템플릿 정의 (배경, 문제, 제안, 대안, 결정)',
      '리뷰 기간 명시 (일반적으로 1-2주)',
      '최종 결정과 이유를 RFC에 기록',
      '결정된 RFC는 ADR로 전환',
    ],
  },
  {
    name: 'ADR (Architecture Decision Record)',
    category: 'decision-framework',
    description:
      '아키텍처 결정과 그 맥락·결과를 영구 기록. ' +
      '상태(제안→수락→폐기)를 추적해 미래 팀이 결정 배경을 이해.',
    origin: 'Michael Nygard, ThoughtWorks',
    bestFor: ['장기 유지보수가 필요한 시스템', '팀 멤버 변동이 많은 조직', '아키텍처 거버넌스'],
    tradeoffs: [
      '유지 비용 — 오래된 ADR 관리 필요',
      '작성 습관화까지 초기 저항',
    ],
    implementation: [
      '코드 저장소 내 docs/decisions/ 디렉토리',
      '번호 + 날짜 + 제목 형식 (예: 0042-2024-01-15-use-postgresql.md)',
      '상태 필드로 생명주기 추적',
      'PR 리뷰 시 ADR 작성 체크',
    ],
  },
  {
    name: '6-Page Memo (Amazon)',
    category: 'decision-framework',
    description:
      '파워포인트 금지. 6페이지 산문 메모로 제안을 완전히 기술. ' +
      '회의 시작 30분은 침묵 독서. 생각의 명확성을 글쓰기로 검증.',
    origin: 'Amazon (제프 베이조스)',
    bestFor: ['복잡한 전략 결정', '다수 이해관계자 설득', '깊은 사고가 필요한 제안'],
    tradeoffs: [
      '작성 시간 투자 큼',
      '빠른 실험 문화와 충돌 가능',
      '글쓰기 능력 편차가 영향',
    ],
    implementation: [
      '섹션: 배경 → 문제 → 제안 → 대안 → 권장안 → 부록',
      '6페이지 엄수 — 짧게 쓰는 것이 더 어렵다',
      '회의 전 배포, 회의 시작 30분 독서',
      'Q&A 세션으로 마무리',
    ],
  },
  {
    name: 'First Principles (SpaceX/Tesla)',
    category: 'decision-framework',
    description:
      '기존 가정과 관행을 모두 제거하고 물리적·논리적 기초부터 재구성. ' +
      '"왜 이것이 사실인가?"를 반복해 근본 제약에 도달.',
    origin: 'Elon Musk / 아리스토텔레스 철학',
    bestFor: ['10배 혁신이 필요한 문제', '업계 관행이 의심스러운 영역', '비용·시간 획기적 절감'],
    tradeoffs: [
      '시간과 인지 비용 매우 큼',
      '모든 결정에 적용 불가 — 선택적 사용',
      '도메인 전문성 없으면 위험',
    ],
    implementation: [
      '현재 가정을 모두 나열',
      '각 가정에 "왜?"를 5번 반복',
      '물리/수학적 제약만 남기기',
      '제약 내에서 최적 솔루션 설계',
    ],
  },
];

// ---------------------------------------------------------------------------
// Communication Style patterns
// ---------------------------------------------------------------------------

const COMMUNICATION_STYLES: WorkPattern[] = [
  {
    name: 'Async-First',
    category: 'communication-style',
    description:
      '실시간 회의보다 비동기 문서·메시지를 기본으로. ' +
      '생각을 정리해서 전달하고 응답 시간 압박 제거. 분산 팀에 필수.',
    origin: 'GitLab, Stripe, 리모트 조직',
    bestFor: ['글로벌 분산 팀', '딥워크가 필요한 엔지니어링', '시간대 차이가 큰 조직'],
    tradeoffs: ['긴급 이슈 해결 지연', '관계 형성 어려움', '맥락 손실 위험'],
    implementation: [
      '회의 전 안건 문서 필수 배포',
      '채널별 응답 SLA 정의 (예: 슬랙 4시간 내)',
      'Loom/동영상으로 복잡한 내용 비동기 전달',
      '결정은 반드시 문서에 기록',
    ],
  },
  {
    name: 'Meeting-Minimal',
    category: 'communication-style',
    description:
      '회의는 의사결정·브레인스토밍·관계 형성에만. 상태 보고·정보 공유는 문서로. ' +
      '모든 회의에 명확한 목적과 결정 사항 기록.',
    origin: 'Amazon, 37signals',
    bestFor: ['생산성 중심 문화', '엔지니어 비중이 높은 팀', '딥워크 보호가 필요한 조직'],
    tradeoffs: ['팀 응집력 유지 노력 필요', '비공식 소통 채널 별도 필요'],
    implementation: [
      '주간 50% 회의 없는 시간 블록',
      '회의 안건 없으면 취소',
      '결정 없이 끝나는 회의 금지',
      '상태 보고는 슬랙 스레드로',
    ],
  },
  {
    name: 'Transparent',
    category: 'communication-style',
    description:
      '비즈니스 지표·의사결정 배경·실패 사례를 전 구성원에게 공개. ' +
      '정보 권력을 제거하고 자율 의사결정을 가능하게.',
    origin: 'Buffer, 토스, Netflix',
    bestFor: ['높은 자율성 문화', '신뢰 기반 조직', '플랫 구조'],
    tradeoffs: ['기밀 유지 어려움', '정보 과부하 위험', '미성숙한 직원에게 혼란 가능'],
    implementation: [
      '주간 비즈니스 지표 전체 공유',
      '중요 결정의 배경과 대안을 문서화',
      '실패 사례 공유 세션 (Blameless postmortem)',
      '급여·보상 기준 투명화 (선택적)',
    ],
  },
  {
    name: 'Need-to-Know',
    category: 'communication-style',
    description:
      '정보를 업무 수행에 필요한 사람에게만 공유. ' +
      '보안·경쟁사 대응·법적 요건에서 필수. 비밀주의 문화의 기반.',
    origin: 'Apple, 국방·정보기관',
    bestFor: ['보안 민감 제품', '출시 전 비밀 유지 필요', 'M&A·법적 민감 이슈'],
    tradeoffs: ['신뢰도 저하 위험', '정보 단절로 협업 비효율', '소문과 불안 유발 가능'],
    implementation: [
      '정보 분류 체계 명확화',
      '공유 기준을 역할 기반으로 정의',
      '출시 후 투명 공개 계획 수립',
    ],
  },
];

// ---------------------------------------------------------------------------
// Innovation Process patterns
// ---------------------------------------------------------------------------

const INNOVATION_PROCESSES: WorkPattern[] = [
  {
    name: '20% Time',
    category: 'innovation-process',
    description:
      '업무 시간의 20%를 자유 프로젝트에 투자. ' +
      'Gmail, Google Maps가 탄생. 내재적 동기로 혁신 아이디어 발굴.',
    origin: 'Google (3M에서 차용)',
    bestFor: ['혁신 문화 조성', '직원 자율성 존중', '장기 R&D 투자'],
    tradeoffs: ['생산성 측정 어려움', '관리자 저항', '실제로 20% 확보 어려움'],
    implementation: [
      '격주 금요일 자유 프로젝트 시간 보장',
      '분기별 데모데이로 결과 공유',
      '성공 프로젝트를 공식 제품화하는 경로 마련',
    ],
  },
  {
    name: 'Hackathon',
    category: 'innovation-process',
    description:
      '24-48시간 집중 해킹으로 아이디어를 프로토타입으로. ' +
      '일상 업무에서 벗어나 빠른 실험. 팀 결속력 강화 효과.',
    origin: 'OpenBSD → Facebook, 실리콘밸리',
    bestFor: ['신속한 아이디어 검증', '팀 빌딩', '새로운 조합의 실험'],
    tradeoffs: ['지속성 부족 — 핵업 후 관리 필요', '피로 누적', '결과물 품질 한계'],
    implementation: [
      '분기 1회 또는 연 2회 정기 해커톤',
      '판단 기준 명확화 (사용자 임팩트, 실행 가능성)',
      '상위 3개 프로젝트 다음 분기 실제 개발 기회',
    ],
  },
  {
    name: 'Skunkworks',
    category: 'innovation-process',
    description:
      '소수 최정예 팀을 본 조직에서 분리해 파격적 프로젝트 수행. ' +
      '관료주의와 기존 제약에서 자유롭게. SR-71, Mac 개발이 대표 사례.',
    origin: 'Lockheed Martin (1943) → Apple, Google X',
    bestFor: ['파괴적 혁신', '기존 조직이 방해가 되는 프로젝트', '긴 시간 지평의 R&D'],
    tradeoffs: ['본 조직과 격리로 통합 어려움', '높은 자원 투자', '실패 시 가시성 높음'],
    implementation: [
      '독립 팀 구성 (최소 인원, 최고 역량)',
      '별도 예산·공간·보고 라인',
      '6개월 단위 검문점으로 진행 검토',
      '성공 시 본 조직 통합 계획 사전 수립',
    ],
  },
  {
    name: 'Lean Startup',
    category: 'innovation-process',
    description:
      'Build-Measure-Learn 사이클로 최소 자원으로 최대 학습. ' +
      'MVP로 가정을 검증하고 데이터로 방향 조정(pivot).',
    origin: 'Eric Ries (2011)',
    bestFor: ['신제품 개발', '시장 불확실성이 높은 영역', '스타트업 또는 내부 스타트업'],
    tradeoffs: ['빠른 피벗이 팀 방향성 혼란', 'MVP 품질이 브랜드에 영향', '측정 지표 선정 어려움'],
    implementation: [
      '해결하려는 문제 가정 명확화',
      '2주 이내 테스트 가능한 MVP 정의',
      '측정 지표 사전 정의 (OMTM: One Metric That Matters)',
      'Build 2주 → Measure 1주 → Learn 1일 사이클',
    ],
  },
  {
    name: 'Design Sprint',
    category: 'innovation-process',
    description:
      '5일 내에 문제 정의→아이디어→프로토타입→사용자 테스트까지 완주. ' +
      'Jake Knapp(Google Ventures)이 개발. 불확실한 문제의 빠른 해소.',
    origin: 'Google Ventures (Jake Knapp, 2010)',
    bestFor: ['복잡한 디자인 문제', '새로운 제품 방향 탐색', '다학제 팀 협업'],
    tradeoffs: ['5일 전체 참여 비용 큼', '이후 실행 계획 미흡 시 낭비', '작은 문제엔 과함'],
    implementation: [
      'Day 1: 문제 이해·전문가 인터뷰·HMW(How Might We)',
      'Day 2: 경쟁사 벤치마크·개인 아이디에이션',
      'Day 3: 아이디어 투표·스토리보드',
      'Day 4: 프로토타입 제작',
      'Day 5: 실사용자 5명 테스트',
    ],
  },
];

// ---------------------------------------------------------------------------
// Combined registry
// ---------------------------------------------------------------------------

const ALL_PATTERNS: WorkPattern[] = [
  ...TEAM_STRUCTURES,
  ...DECISION_FRAMEWORKS,
  ...COMMUNICATION_STYLES,
  ...INNOVATION_PROCESSES,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return a specific pattern by category and name (case-insensitive). */
export function getPattern(category: PatternCategory, name: string): WorkPattern | undefined {
  const lower = name.toLowerCase();
  return ALL_PATTERNS.find(
    (p) => p.category === category && p.name.toLowerCase().includes(lower),
  );
}

/** Return all patterns. */
export function getAllPatterns(): WorkPattern[] {
  return [...ALL_PATTERNS];
}

/** Return patterns by category. */
export function getPatternsByCategory(category: PatternCategory): WorkPattern[] {
  return ALL_PATTERNS.filter((p) => p.category === category);
}

/**
 * Recommend work patterns based on team size, domain, and urgency.
 * - teamSize: number of people in the team
 * - domain: e.g. 'product', 'platform', 'research', 'security'
 * - urgency: 'low' | 'medium' | 'high'
 */
export function recommendPattern(
  teamSize: number,
  domain: string,
  urgency: 'low' | 'medium' | 'high',
): WorkPattern[] {
  const results: WorkPattern[] = [];
  const lowerDomain = domain.toLowerCase();

  // Team structure recommendation
  if (teamSize <= 6) {
    results.push(
      TEAM_STRUCTURES.find((p) => p.name.includes('Cell')) ?? TEAM_STRUCTURES[0]!,
    );
  } else if (teamSize <= 10) {
    results.push(
      TEAM_STRUCTURES.find((p) => p.name.includes('Two-Pizza')) ?? TEAM_STRUCTURES[0]!,
    );
  } else {
    results.push(
      TEAM_STRUCTURES.find((p) => p.name.includes('Squad')) ?? TEAM_STRUCTURES[0]!,
    );
  }

  // Decision framework recommendation
  if (urgency === 'high') {
    results.push(
      DECISION_FRAMEWORKS.find((p) => p.name.includes('First Principles')) ??
        DECISION_FRAMEWORKS[0]!,
    );
  } else if (lowerDomain.includes('arch') || lowerDomain.includes('platform')) {
    results.push(
      DECISION_FRAMEWORKS.find((p) => p.name.includes('ADR')) ?? DECISION_FRAMEWORKS[0]!,
    );
  } else {
    results.push(
      DECISION_FRAMEWORKS.find((p) => p.name.includes('RFC')) ?? DECISION_FRAMEWORKS[0]!,
    );
  }

  // Communication style recommendation
  if (teamSize > 20) {
    results.push(
      COMMUNICATION_STYLES.find((p) => p.name.includes('Async')) ?? COMMUNICATION_STYLES[0]!,
    );
  } else {
    results.push(
      COMMUNICATION_STYLES.find((p) => p.name.includes('Transparent')) ??
        COMMUNICATION_STYLES[0]!,
    );
  }

  // Innovation process recommendation
  if (urgency === 'high') {
    results.push(
      INNOVATION_PROCESSES.find((p) => p.name.includes('Design Sprint')) ??
        INNOVATION_PROCESSES[0]!,
    );
  } else if (lowerDomain.includes('research') || lowerDomain.includes('r&d')) {
    results.push(
      INNOVATION_PROCESSES.find((p) => p.name.includes('Skunkworks')) ??
        INNOVATION_PROCESSES[0]!,
    );
  } else if (urgency === 'low') {
    results.push(
      INNOVATION_PROCESSES.find((p) => p.name.includes('20%')) ?? INNOVATION_PROCESSES[0]!,
    );
  } else {
    results.push(
      INNOVATION_PROCESSES.find((p) => p.name.includes('Lean')) ?? INNOVATION_PROCESSES[0]!,
    );
  }

  return results;
}
