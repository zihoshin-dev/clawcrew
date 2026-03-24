// ---------------------------------------------------------------------------
// Organization Culture Knowledge Base
// ---------------------------------------------------------------------------

export interface OrgCulture {
  name: string;
  principles: string[];
  workStyle: string;
  decisionMaking: string;
  communication: string;
  hiring: string;
  innovation: string;
}

// ---------------------------------------------------------------------------
// Culture profiles
// ---------------------------------------------------------------------------

const CULTURES: OrgCulture[] = [
  {
    name: 'Toss (비바리퍼블리카)',
    principles: [
      '자율과 책임 — 권한은 실행하는 사람에게 있고 결과에 책임진다',
      '빠른 실행 — Done is better than perfect, 완벽보다 학습이 먼저',
      '동료 피드백 — 상하 관계 없이 솔직하고 직접적인 피드백 문화',
      '투명한 정보 공유 — 비즈니스 지표, 의사결정 배경을 전원 공개',
      '작은 팀(셀) 구조 — 독립적으로 의사결정하고 실행하는 소규모 셀',
      '성과 중심 — 연차·직급보다 실제 임팩트로 평가',
    ],
    workStyle:
      '소수정예 셀(cell) 단위로 운영. 각 셀은 오너십을 갖고 스스로 기획·실행·측정. ' +
      '불필요한 회의와 보고 최소화, 빠른 실험과 반복.',
    decisionMaking:
      '데이터와 사용자 임팩트 기반 의사결정. 상위 승인 없이 셀이 자율 결정. ' +
      '실패는 학습으로 처리하되 동일 실수 반복은 용납하지 않는다.',
    communication:
      '직접적이고 솔직한 피드백. 직급·연차에 관계없이 누구나 의견 제시. ' +
      '슬랙 중심의 비동기 소통, 불필요한 회의 금지.',
    hiring:
      '높은 기준의 채용 — 팀 평균을 높이는 사람만 채용. ' +
      '스킬보다 성장 가능성과 문화 핏을 중시. 퍼포먼스 기반 탈락도 명확.',
    innovation:
      '사용자 문제를 근본부터 재정의. 기존 금융 관행을 의심하고 UX로 혁신. ' +
      '작게 실험하고 데이터로 검증 후 빠르게 스케일.',
  },
  {
    name: 'Tesla / SpaceX (일론 머스크)',
    principles: [
      'First principles thinking — 기존 가정을 모두 버리고 물리 법칙부터 재설계',
      '5-step improvement process — 1.요구사항 의심 2.프로세스 삭제 3.단순화 4.가속화 5.자동화',
      '극한의 속도 — "If you are not failing, you are not innovating enough"',
      '수직 통합 — 핵심 기술은 외주 없이 내재화',
      '불가능을 가능으로 — 제약은 협상 가능한 변수, 물리 법칙만이 한계',
      '엔지니어가 의사결정 — 관리자가 아닌 실제 만드는 사람이 리드',
    ],
    workStyle:
      '밀도 높은 실행. 회의는 최소화하고 실제 제작에 시간 집중. ' +
      '현장(공장, 발사대)에서 의사결정. 슬라이드보다 실물 시제품.',
    decisionMaking:
      'First principles로 문제 분해. 전문가 합의보다 물리적 제약 확인. ' +
      '"이게 정말 필요한가?"를 먼저 묻고, 필요하다면 가장 빠른 방법으로.',
    communication:
      '직접적이고 짧게. 불필요한 형용사·부사 제거. ' +
      '이메일보다 직접 대화, 대규모 회의 금지, 필요 없으면 자리 떠도 됨.',
    hiring:
      '실제로 무언가를 만들어본 사람. 학위보다 구체적 성취. ' +
      '지능과 실행력이 검증된 올라운더 엔지니어 선호.',
    innovation:
      '제약 조건을 전제로 받아들이지 않는다. 재사용 로켓, 대량생산 전기차는 "불가능"이었음. ' +
      '10배 개선을 목표로 설정하면 10% 개선과 완전히 다른 해법이 나온다.',
  },
  {
    name: 'Anthropic (다리오 아모데이)',
    principles: [
      'AI safety first — 능력 개발과 안전 연구를 병렬 진행',
      'Responsible Scaling Policy — 위험 수준에 따른 단계적 배포',
      'Constitutional AI — 명시적 원칙으로 AI 행동 제약',
      '깊은 연구 문화 — 빠른 출시보다 이해를 우선',
      '신중하지만 대담한 실행 — 리스크를 인식하면서도 전진',
      '투명성 — 연구 결과와 위험 요소를 외부에 공개',
    ],
    workStyle:
      '연구 중심 조직. 논문 수준의 깊이로 문제를 파고들며 결과를 외부 공유. ' +
      '느리게 보이지만 올바른 방향으로 축적.',
    decisionMaking:
      '안전성 평가가 배포 결정의 게이팅 조건. 불확실할 때는 더 많은 연구가 답. ' +
      '내부 레드팀과 외부 감사를 통한 검증 후 출시.',
    communication:
      '글쓰기 중심 문화. 아이디어는 문서로 정교화. ' +
      '비동기 심층 토론을 선호, 반대 의견을 환영.',
    hiring:
      'AI safety와 능력 연구 양쪽을 이해하는 인재. ' +
      '최고 수준의 ML 연구자와 안전 전문가. 미션 얼라인먼트 필수.',
    innovation:
      '능력과 안전의 동시 발전이 혁신. Constitutional AI, RLHF 개선, 해석 가능성 연구. ' +
      '상업적 압력보다 장기적 AI 발전 궤도에 집중.',
  },
  {
    name: 'Palantir',
    principles: [
      'Forward-deployed engineering — 엔지니어가 고객 현장에 직접 투입',
      '문제는 현장에 있다 — 고객 데이터·운영을 직접 보고 솔루션 설계',
      '엔지니어 중심 문화 — 영업이 아닌 엔지니어가 가치 전달',
      '보안 우선 — 국방·정보기관 수준의 데이터 보호',
      '소수 정예 — 적은 인원으로 최대 임팩트',
      'Mission-driven — 서구 민주주의와 법치 수호를 명시적 목표로',
    ],
    workStyle:
      'FDE(Forward-Deployed Engineer)가 수개월씩 고객사에 상주하며 문제를 내부자로서 해결. ' +
      '프로덕트와 컨설팅의 경계가 없는 독특한 모델.',
    decisionMaking:
      '고객 현장 데이터와 관찰 기반. 가설보다 실제 운영 데이터로 결정. ' +
      '장기 계약 기반의 파트너십 모델로 단기 지표보다 장기 성과.',
    communication:
      '내부적으로 매우 직접적. FDE 현장 보고서가 핵심 정보 채널. ' +
      '외부에는 최소 공개 원칙.',
    hiring:
      '최고 수준의 엔지니어만. 고객 앞에서 문제 해결 능력과 커뮤니케이션 능력 모두 필요. ' +
      '미션과 가치관 정렬을 중요시.',
    innovation:
      '거버먼트 테크의 재정의. 복잡한 데이터를 운영 가능한 인사이트로. ' +
      '온톨로지 기반 데이터 모델링이 차별화 기술.',
  },
  {
    name: 'Apple (스티브 잡스)',
    principles: [
      '"Stay hungry, stay foolish" — 현재 성과에 안주하지 않는 끊임없는 갈증',
      '극한의 디테일 — 사용자가 보지 못하는 내부까지 완벽하게',
      '교차 기능팀(cross-functional) — 사일로 없이 하나의 제품 팀으로',
      '비밀주의 — 출시 전 완전한 보안, 서프라이즈 효과 유지',
      '사용자 경험 집착 — 기술이 아니라 경험이 제품을 정의',
      '"No" 문화 — 천 가지 중 하나에 집중하기 위해 나머지를 거절',
    ],
    workStyle:
      '소규모 핵심팀이 전체 제품을 책임. DRI(Directly Responsible Individual) 명확히 지정. ' +
      '타협보다 완벽, 일정보다 품질.',
    decisionMaking:
      '최종 결정자가 모든 디테일에 관여. 위원회보다 강한 개인 리더십. ' +
      '시장 조사보다 직관과 비전 — "고객은 자신이 원하는 것을 모른다".',
    communication:
      '극도의 보안 문화. 팀 간 need-to-know 원칙. ' +
      '내부는 키노트 수준의 명확한 스토리텔링 요구.',
    hiring:
      '"A급 플레이어만 A급을 고용한다." B급을 고용하면 C급이 따라온다. ' +
      '열정과 완벽주의를 동시에 갖춘 인재.',
    innovation:
      '기존 카테고리를 무시하고 새 카테고리를 창조. iPod→iPhone→iPad의 자기 잠식. ' +
      '하드웨어·소프트웨어·서비스 수직 통합으로 경험 제어.',
  },
  {
    name: 'OpenAI (샘 알트먼)',
    principles: [
      'Move fast — 스타트업 속도로 AGI를 향해',
      'Iterative deployment — 완성보다 배포 후 학습',
      'Safety + Capability — 안전과 능력은 트레이드오프가 아니다',
      '스타트업 스피드 + 연구소 깊이 — 빠른 실행과 깊은 연구의 결합',
      '미션 우선 — AGI가 전 인류에게 이익이 되어야',
      '제품으로 검증 — ChatGPT, API로 실제 세계에서 테스트',
    ],
    workStyle:
      '연구팀과 제품팀이 긴밀히 협력. 최신 모델을 빠르게 제품화하고 피드백 루프 가속. ' +
      '공격적인 채용과 파트너십.',
    decisionMaking:
      '샘 알트먼의 강한 비전 리더십. 이사회·투자자보다 미션 중심 판단. ' +
      '배포 vs 안전의 긴장을 내부 논의로 해소.',
    communication:
      '외부에는 적극적인 미디어 소통. 내부는 고속 실행 중심의 직접 커뮤니케이션. ' +
      '블로그와 연구 논문으로 투명성 유지.',
    hiring:
      '세계 최고의 AI 연구자와 엔지니어. 미션 얼라인먼트가 필수 조건. ' +
      '속도와 깊이를 동시에 갖춘 인재.',
    innovation:
      'GPT 시리즈로 NLP 패러다임 전환. ChatGPT로 AI 대중화. ' +
      '멀티모달, 에이전트 방향으로 지속 확장.',
  },
  {
    name: 'Stripe',
    principles: [
      '"Stripe Press" 지식 공유 — 깊은 독서와 사고를 장려하는 출판 문화',
      '개발자 경험 집착 — DX가 곧 제품 품질',
      '글로벌 리모트 — 위치에 관계없이 최고 인재',
      '장기적 사고 — 분기 실적보다 수십 년의 영향',
      '인프라로서의 금융 — 인터넷 경제의 GDP를 높이는 사명',
      '글쓰기 문화 — 모든 중요한 결정은 문서로',
    ],
    workStyle:
      '리모트 우선, 비동기 문화. 긴 문서로 생각을 공유. ' +
      '개발자가 API를 직접 사용해보며 DX를 검증.',
    decisionMaking:
      '문서 기반의 숙고된 의사결정. 장기 임팩트를 단기 지표보다 중시. ' +
      '엔지니어링 원칙에서 비즈니스 결정을 도출.',
    communication:
      '장문의 글쓰기 선호. RFC와 설계 문서가 핵심 커뮤니케이션 도구. ' +
      '비동기 우선으로 시간대 차이를 극복.',
    hiring:
      '"Extremely high talent density." 세계 어디서나 최고 인재. ' +
      '호기심, 글쓰기 능력, 장기적 사고를 중시.',
    innovation:
      '결제 인프라의 재발명. API 7줄로 결제 통합 — 개발자 경험이 혁신의 핵심. ' +
      'Atlas, Radar, Treasury 등 금융 스택 전체로 확장.',
  },
  {
    name: 'Netflix',
    principles: [
      'Freedom & Responsibility — 규칙 대신 맥락과 판단력',
      'Context not Control — 통제 대신 정보를 충분히 제공',
      'Keeper Test — "이 사람이 경쟁사로 간다면 붙잡겠는가?"',
      'No Brilliant Jerks — 최고 성과자도 팀워크 훼손하면 퇴출',
      'Highly aligned, loosely coupled — 방향은 맞추되 실행은 자율',
      'Sunshining — 실수를 투명하게 공유해 조직이 학습',
    ],
    workStyle:
      '엄격한 인재 밀도 유지. 성과 낮은 포지션은 후한 패키지로 빠르게 정리. ' +
      '승인 프로세스 최소화, 개인 판단을 신뢰.',
    decisionMaking:
      '충분한 맥락을 가진 개인이 자율 결정. 상위 승인 없이 실험 가능. ' +
      '결과로 판단, 과정은 각자의 판단에 맡김.',
    communication:
      'Keeper Test와 360 피드백을 통한 솔직한 문화. ' +
      '"농담처럼 말하지 말고 직접 말하라." 내부 투명성 극대화.',
    hiring:
      'Keeper Test 통과 기준으로 채용. A급 팀을 유지하기 위해 B급은 채용하지 않음. ' +
      '시장 최고 수준의 보상으로 최고 인재 유지.',
    innovation:
      'DVD → 스트리밍 → 오리지널 콘텐츠의 자기 혁신. ' +
      '추천 알고리즘과 글로벌 콘텐츠 전략으로 경쟁 차별화.',
  },
  {
    name: 'Amazon (제프 베이조스)',
    principles: [
      'Day 1 mentality — 항상 첫날처럼. Day 2는 쇠퇴의 시작',
      '6-page memo — 파워포인트 금지, 산문으로 생각을 강제',
      'Working Backwards — 보도자료를 먼저 쓰고 제품을 역설계',
      '14 Leadership Principles — 채용·평가·결정의 모든 기준',
      'Two-Pizza Teams — 피자 두 판으로 배부를 수 있는 팀 크기',
      '고객 집착(Customer Obsession) — 경쟁자가 아닌 고객에서 출발',
    ],
    workStyle:
      'Two-Pizza Team으로 자율적 소규모 팀. 각 팀이 서비스 전체 오너십. ' +
      '분기별 OKR과 14개 리더십 원칙으로 정렬.',
    decisionMaking:
      '"두 가지 결정 유형": 되돌릴 수 없는 Type 1(신중)과 되돌릴 수 있는 Type 2(빠르게). ' +
      '6-page memo로 생각을 먼저 구조화한 뒤 결정.',
    communication:
      '파워포인트 금지, 6-page narrative memo 필수. ' +
      '회의 시작 30분은 침묵 독서. 글쓰기로 사고의 질 검증.',
    hiring:
      '"Bar raiser" 제도 — 채용 기준을 올리는 전담 면접관. ' +
      'Leadership Principles 기반 행동 면접. "Will this person raise the bar?"',
    innovation:
      'AWS는 내부 인프라를 외부 서비스로. Working Backwards로 Kindle, Echo 탄생. ' +
      '실패를 장려 — "실험 규모에 비례한 실패는 혁신의 비용".',
  },
  {
    name: 'Kakao / Naver (한국 빅테크)',
    principles: [
      '애자일 전환 — 전통적 위계를 크루(crew)·셀(cell) 단위로 재편',
      '데이터 기반 의사결정 — A/B 테스트와 지표 중심 문화',
      'PM/CPO 문화 성장 — 제품 책임자 권한 강화',
      '수평적 호칭 — 닉네임·영어 이름 사용으로 위계 완화',
      '속도와 안정성 균형 — 대형 서비스 운영 안정성과 혁신 속도 조화',
      '플랫폼 생태계 — 파트너·크리에이터 생태계와 공생',
    ],
    workStyle:
      '대기업 규모이지만 스타트업식 셀 운영 시도. ' +
      '카카오: 독립 CIC 체제로 분권화. 네이버: 기술 플랫폼 중심 조직.',
    decisionMaking:
      '데이터 분석팀과 PM이 협업해 실험 설계 → 측정 → 결정. ' +
      '상위 의사결정은 여전히 리더 중심이나 데이터로 합리화.',
    communication:
      '슬랙/Teams 기반 비동기 소통 확대. ' +
      '주간 전사 타운홀, 팀 단위 스프린트 리뷰 보편화.',
    hiring:
      '국내 최고 수준의 개발자 처우. 카카오: 창업 경험자·스타트업 출신 우대. ' +
      '네이버: 연구소(NAVER Labs) 중심 AI 인재 확보.',
    innovation:
      '카카오: 금융(토스뱅크 대비 카카오뱅크)·모빌리티·콘텐츠 수직 확장. ' +
      '네이버: 하이퍼클로바X, 웹툰 글로벌화, 쇼핑 AI 추천.',
  },
];

// ---------------------------------------------------------------------------
// Lookup map
// ---------------------------------------------------------------------------

const CULTURE_MAP = new Map<string, OrgCulture>(
  CULTURES.map((c) => [c.name.toLowerCase(), c]),
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return the culture profile for a company (case-insensitive partial match). */
export function getCulture(companyName: string): OrgCulture | undefined {
  const lower = companyName.toLowerCase();
  // Exact key match first
  if (CULTURE_MAP.has(lower)) return CULTURE_MAP.get(lower);
  // Partial match
  for (const [key, culture] of CULTURE_MAP) {
    if (key.includes(lower) || lower.includes(key.split(' ')[0] ?? '')) {
      return culture;
    }
  }
  return undefined;
}

/** Return all culture profiles. */
export function getAllCultures(): OrgCulture[] {
  return [...CULTURES];
}

/**
 * Given a situation description, return applicable principles from all cultures
 * whose principles or workStyle text contains relevant keywords.
 */
export function getRelevantPrinciples(context: string): string[] {
  const lower = context.toLowerCase();
  const results: string[] = [];

  for (const culture of CULTURES) {
    for (const principle of culture.principles) {
      if (
        principle.toLowerCase().split(' ').some((word) => word.length > 3 && lower.includes(word))
      ) {
        results.push(`[${culture.name}] ${principle}`);
      }
    }
  }

  return results;
}
