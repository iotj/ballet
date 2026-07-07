// 시퀀스 연습 모드 — 시퀀스 정의
// steps의 poseId는 js/poseRegistry.js에 등록된 포즈 id와 일치해야 함
// holdSec: 스텝별 유지 시간 오버라이드 (생략 시 THRESHOLDS.sequence.holdSec 사용)
// hint: 해당 동작 준비 안내 문구 (시작/전환 시 표시)
export const SEQUENCES = [
  {
    id: 'basic-front',
    name: '기초 정면 시퀀스',
    description: '턴아웃 → 플리에 순서 연습',
    steps: [
      { poseId: 'turnout', hint: '1번 포지션으로 서 주세요' },
      { poseId: 'plie', holdSec: 2, hint: '턴아웃을 유지한 채 준비하세요' } // 무릎 부담 고려해 2초 (발레전문가 권장)
    ]
  }
]
