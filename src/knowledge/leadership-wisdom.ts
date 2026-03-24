// ---------------------------------------------------------------------------
// Leadership Wisdom Knowledge Base
// ---------------------------------------------------------------------------

export interface LeaderWisdom {
  leader: string;
  domain: string;
  principles: string[];
  quotes: string[];
  decisionFramework: string;
}

// ---------------------------------------------------------------------------
// Leader profiles
// ---------------------------------------------------------------------------

const WISDOM_PROFILES: LeaderWisdom[] = [
  {
    leader: 'Elon Musk',
    domain: 'Technology, Manufacturing, Space',
    principles: [
      'First principles thinking — 기존 가정을 버리고 물리 법칙부터 재설계',
      '5-step process: 요구사항 의심 → 삭제 → 단순화 → 가속화 → 자동화',
      '불가능은 협상 가능한 변수, 물리 법칙만이 진짜 한계',
      '10배 목표를 설정하면 완전히 다른 해법이 나온다',
      '엔지니어가 최종 결정권을 가져야 한다',
      '실패를 빠르게, 학습을 빠르게',
    ],
    quotes: [
      '"The first step is to establish that something is possible; then probability will occur."',
      '"If you need inspiring words, don\'t do it."',
      '"Failure is an option here. If things are not failing, you are not innovating enough."',
      '"Work like hell. Put in 80 to 100 hour weeks every week."',
      '"The best part is no part. The best process is no process."',
    ],
    decisionFramework:
      '1) 이 요구사항이 정말 필요한가? (최소 10%는 틀림) ' +
      '2) 삭제할 수 있는 단계·부품은? ' +
      '3) 남은 것을 단순화할 수 있는가? ' +
      '4) 속도를 높일 수 있는가? ' +
      '5) 이제 자동화할 수 있는가? (자동화는 마지막 단계)',
  },
  {
    leader: 'Sam Altman',
    domain: 'AI, Startups, Venture Capital',
    principles: [
      '컴파운딩이 전부다 — 작은 우위도 복리로 쌓이면 압도적이 된다',
      '올바른 사람에게 집중하라 — 팀이 전략보다 중요하다',
      '야망을 두려워하지 마라 — 큰 목표가 더 실행하기 쉬울 수 있다',
      '모멘텀을 유지하라 — 스타트업은 모멘텀 잃으면 죽는다',
      '자신을 믿되 피드백에 열려 있어라',
      'AGI는 인류 역사상 가장 중요한 전환점이다',
    ],
    quotes: [
      '"The most successful people I know read and think more than most people."',
      '"Refuse to accept failure as a final outcome."',
      '"The best startups generally come from someone needing something that doesn\'t exist."',
      '"The way to get rich is to find a way to do a lot of things fast."',
      '"Be optimistic. It\'s a self-fulfilling prophecy."',
    ],
    decisionFramework:
      '1) 이 결정이 10년 후에도 올바를까? ' +
      '2) 우리 팀의 best player는 이것을 지지할까? ' +
      '3) 모멘텀을 만들어낼 수 있는 선택인가? ' +
      '4) 빠르게 실험하고 검증할 수 있는가?',
  },
  {
    leader: 'Dario Amodei',
    domain: 'AI Safety, Research, Responsible AI',
    principles: [
      'AI 안전은 선택이 아니라 필수 — 능력 개발과 병렬로',
      '신중하지만 대담하게 — 위험을 직시하면서도 전진',
      '투명성이 신뢰의 기반 — 연구 결과를 공개',
      '장기적 사고 — 분기 실적보다 수십 년의 궤도',
      '최고의 인재들과 함께 — 팀의 집단 지성을 신뢰',
      'Constitutional AI — 명시적 원칙으로 AI 행동 제약',
    ],
    quotes: [
      '"We believe AI will be transformative, and we want to make sure that transformation is positive."',
      '"Safety and helpfulness are more complementary than they are at odds."',
      '"The best way to ensure AI is safe is to be at the frontier."',
      '"We take the risks of AI seriously, which is why we\'re working on it."',
    ],
    decisionFramework:
      '1) 이 결정이 AI 안전에 미치는 영향은? ' +
      '2) 충분한 연구와 검증이 이루어졌는가? ' +
      '3) 투명하게 공개할 수 있는 결정인가? ' +
      '4) 장기적으로 인류에게 이익이 되는가?',
  },
  {
    leader: 'Steve Jobs',
    domain: 'Product Design, Technology, Consumer Electronics',
    principles: [
      '"Stay hungry, stay foolish" — 현재에 안주하지 않는 갈증',
      '교차 기능팀 — 사일로 없이 하나의 제품 팀',
      'No 문화 — 천 가지 중 하나에 집중',
      '사용자 경험이 제품을 정의한다',
      '"A급 플레이어만이 A급을 고용한다"',
      '디자인은 어떻게 보이는 것이 아니라 어떻게 작동하는 것',
    ],
    quotes: [
      '"Simplicity is the ultimate sophistication."',
      '"Design is not just what it looks like and feels like. Design is how it works."',
      '"Innovation is saying no to 1,000 things."',
      '"The people who are crazy enough to think they can change the world are the ones who do."',
      '"Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work."',
    ],
    decisionFramework:
      '1) 이것이 사용자에게 마법 같은 경험을 주는가? ' +
      '2) 불필요한 것을 모두 제거했는가? ' +
      '3) 우리가 자랑스럽게 보여줄 수 있는 수준인가? ' +
      '4) 10년 후에도 아름다울 것인가?',
  },
  {
    leader: 'Jeff Bezos',
    domain: 'E-commerce, Cloud, Long-term Thinking',
    principles: [
      'Day 1 mentality — 항상 첫날처럼',
      '고객 집착(Customer Obsession) — 경쟁자가 아닌 고객에서 출발',
      'Two types of decisions — Type 1(되돌릴 수 없음) vs Type 2(빠르게)',
      'Working Backwards — 보도자료를 먼저 쓰고 역설계',
      'High standards are contagious — 기준을 타협하지 않는다',
      '"Disagree and commit" — 반대하되 결정이 나면 전력으로',
    ],
    quotes: [
      '"We are stubborn on vision, flexible on details."',
      '"If you double the number of experiments you do per year, you\'re going to double your inventiveness."',
      '"I knew that if I failed I wouldn\'t regret that, but I knew the one thing I might regret is not trying."',
      '"Your margin is my opportunity."',
      '"In the long run, your vision and your reputation will define you."',
    ],
    decisionFramework:
      '1) 고객이 원하는 결과는 무엇인가? (역산) ' +
      '2) 이것은 Type 1(신중) 결정인가 Type 2(빠르게) 결정인가? ' +
      '3) 6-page memo로 생각을 구조화했는가? ' +
      '4) Day 1 정신으로 보면 이 결정이 맞는가?',
  },
  {
    leader: 'Bill Gates',
    domain: 'Software, Philanthropy, Global Health',
    principles: [
      '기술이 세상의 문제를 해결할 수 있다',
      '지식의 복리 — 끊임없이 읽고 배운다(연간 50권)',
      '측정이 없으면 개선이 없다',
      '장기적 사고로 단기적 불편을 감수',
      '경쟁은 최고를 만든다 — 치열한 내부 토론 장려',
      '소프트웨어는 레버리지가 가장 높은 도구',
    ],
    quotes: [
      '"Success is a lousy teacher. It seduces smart people into thinking they can\'t lose."',
      '"We always overestimate the change that will occur in the next two years and underestimate the change that will occur in the next ten."',
      '"If you think your teacher is tough, wait till you get a boss."',
      '"It\'s fine to celebrate success but it is more important to heed the lessons of failure."',
    ],
    decisionFramework:
      '1) 측정 가능한 목표를 설정했는가? ' +
      '2) 장기적 관점에서 올바른 방향인가? ' +
      '3) 최고의 전문가와 데이터로 검증했는가? ' +
      '4) 실패 시 학습 메커니즘이 있는가?',
  },
  {
    leader: 'Jensen Huang',
    domain: 'Semiconductors, AI Hardware, GPU Computing',
    principles: [
      '"Pain + Reflection = Progress" — 고통은 성장의 신호',
      '수직 통합 — 하드웨어부터 소프트웨어 스택까지',
      '플랫폼 사고 — 제품이 아니라 생태계를 만든다',
      '50년 로드맵 — 단기 사이클을 초월한 비전',
      '엔지니어 문화 — CEO가 직접 기술을 이해하고 결정',
      'CUDA 생태계 — 기술적 해자를 소프트웨어로 구축',
    ],
    quotes: [
      '"I hope it\'s not too late. But if it is, we\'ll just have to outrun everybody."',
      '"The more you suffer, the more your company is going to thrive."',
      '"NVIDIA is a 30-year-old startup."',
      '"Great products are built by great teams who do great work."',
    ],
    decisionFramework:
      '1) 이것이 10년 후 플랫폼이 될 수 있는가? ' +
      '2) 소프트웨어 생태계와 결합할 수 있는가? ' +
      '3) 기술적으로 올바른 방향인가? (트렌드가 아닌 물리/수학) ' +
      '4) 우리가 이 분야를 수십 년 지속할 의지가 있는가?',
  },
  {
    leader: 'Peter Thiel',
    domain: 'Venture Capital, Contrarian Thinking, Startups',
    principles: [
      '"What important truth do very few people agree with you on?" — 반대 의견이 진실일 수 있다',
      'Zero to One — 경쟁이 아닌 독점을 목표로',
      '비밀 찾기 — 세상이 모르는 진실을 발견',
      '정의로운 독점 — 사회에 가치를 주면서 독점',
      '확정적 낙관주의 — 미래를 만들어내는 사람이 되어라',
      'Founder mode — 창업자 마인드를 유지하라',
    ],
    quotes: [
      '"Competition is for losers."',
      '"The best startups might seem like bad ideas."',
      '"Brilliant thinking is rare, but courage is in even shorter supply than genius."',
      '"Indefinite optimism doesn\'t build companies; definite optimism does."',
      '"If you want to create and capture lasting value, don\'t build an undifferentiated commodity business."',
    ],
    decisionFramework:
      '1) 이것이 진정한 독점을 만드는가, 아니면 단순한 경쟁인가? ' +
      '2) 대부분의 사람이 틀렸다고 생각하는 무엇을 우리는 옳다고 믿는가? ' +
      '3) 10x 더 나은 제품인가, 아니면 조금 더 나은 제품인가? ' +
      '4) 이 시장에서 마지막 이동자 우위(last mover advantage)를 가질 수 있는가?',
  },
  {
    leader: 'Reed Hastings',
    domain: 'Entertainment, Streaming, Culture Design',
    principles: [
      'Freedom & Responsibility — 규칙 대신 판단력을 신뢰',
      'Talent density — 평균이 아닌 최고 기준',
      'Keeper Test — 이 사람이 떠난다면 붙잡겠는가?',
      'No Brilliant Jerks — 성과보다 팀워크',
      'Context not Control — 맥락을 충분히 제공하면 통제 불필요',
      '투명성이 신뢰를 만든다',
    ],
    quotes: [
      'The best thing you can do for employees — a perk better than foosball — is hire only A players to work alongside them.',
      'Adequate performance gets a generous severance package.',
      'Rules are great until they are not.',
      'We want employees to have good judgment, not follow a rulebook.',
    ],
    decisionFramework:
      '1) 이 사람은 Keeper Test를 통과하는가? ' +
      '2) 충분한 맥락을 제공했는가, 아니면 통제를 시도하는가? ' +
      '3) 이 결정이 팀의 자유를 늘리는가 줄이는가? ' +
      '4) 결과를 측정하고 투명하게 공유할 수 있는가?',
  },
  {
    leader: '이승건 (토스/비바리퍼블리카)',
    domain: 'Fintech, Product, Korean Startup',
    principles: [
      '자율과 책임의 균형 — 권한을 줬으면 결과를 기대',
      '사용자를 진심으로 이해하라 — 겉으로 보이는 니즈 뒤의 진짜 불편을',
      '팀을 믿어라 — 뛰어난 사람들은 지시가 아닌 목표가 필요',
      '빠른 실행, 빠른 학습 — 완벽보다 출시 후 개선',
      '데이터와 직관의 균형 — 숫자가 전부는 아니다',
      '금융을 쉽게 — 복잡한 것을 단순하게 만드는 것이 혁신',
    ],
    quotes: [
      '"좋은 팀이 좋은 제품을 만든다. 좋은 팀을 만드는 것이 가장 중요한 일이다."',
      '"실패를 두려워하면 아무것도 시도하지 못한다."',
      '"사용자가 이해 못하는 건 우리의 실패다."',
      '"작은 팀이 큰 팀보다 빠르게 움직인다."',
    ],
    decisionFramework:
      '1) 사용자의 진짜 불편이 무엇인가? ' +
      '2) 가장 빠르게 실험할 수 있는 방법은? ' +
      '3) 이 결정이 팀의 자율성을 지원하는가? ' +
      '4) 데이터로 검증 가능한가?',
  },
  {
    leader: '김범수 (카카오)',
    domain: 'Platform, Messaging, Korean Tech',
    principles: [
      '플랫폼 사고 — 연결이 가치를 만든다',
      '수평적 조직 — 직급보다 역할과 책임',
      '실험과 실패를 장려 — 실패해도 책임을 묻지 않는 문화',
      '이용자 중심 — 광고주가 아닌 이용자를 위한 서비스',
      '사회적 책임 — 플랫폼 권력에 따른 책임',
      '글로벌 비전 — 국내를 넘어 글로벌 플랫폼으로',
    ],
    quotes: [
      '"카카오는 서비스를 만드는 회사가 아니라 세상을 연결하는 플랫폼을 만드는 회사다."',
      '"실패를 두려워하지 말고 빠르게 실험하라."',
      '"이용자가 즐거우면 사업은 따라온다."',
    ],
    decisionFramework:
      '1) 이 결정이 이용자를 연결하고 가치를 만드는가? ' +
      '2) 플랫폼 생태계 파트너에게 공정한가? ' +
      '3) 사회적 책임을 다하는가? ' +
      '4) 글로벌 확장 가능성이 있는가?',
  },
];

// ---------------------------------------------------------------------------
// Lookup map
// ---------------------------------------------------------------------------

const WISDOM_MAP = new Map<string, LeaderWisdom>(
  WISDOM_PROFILES.map((w) => [w.leader.toLowerCase(), w]),
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return wisdom profile for a leader (case-insensitive, partial match). */
export function getWisdom(leaderName: string): LeaderWisdom | undefined {
  const lower = leaderName.toLowerCase();
  if (WISDOM_MAP.has(lower)) return WISDOM_MAP.get(lower);
  for (const [key, wisdom] of WISDOM_MAP) {
    if (key.includes(lower) || lower.includes(key.split(' ')[0] ?? '')) {
      return wisdom;
    }
  }
  return undefined;
}

/** Return all leader profiles. */
export function getAllWisdom(): LeaderWisdom[] {
  return [...WISDOM_PROFILES];
}

/**
 * Given a situation description, return decision advice from selected leaders
 * (or all leaders if none specified).
 */
export function getDecisionAdvice(situation: string, leaders?: string[]): string[] {
  const profiles = leaders
    ? leaders.map((l) => getWisdom(l)).filter((w): w is LeaderWisdom => w !== undefined)
    : WISDOM_PROFILES;

  return profiles.map(
    (w) => `[${w.leader}] ${w.decisionFramework}`,
  );
}
