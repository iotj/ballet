export const THRESHOLDS = {
  turnout: {
    total: { pass: 170, warn: 140, fail: 110 }, // 양발 합산 외회전 각도
    kneeAlign: { tolerance: 15 }                // 무릎-발끝 방향 허용 편차 (도)
  },
  arabesque: {
    legAngle: { pass: 80, warn: 50, fail: 25 }, // 후면 다리 각도 (지면 기준)
    hipLevel: { tolerance: 8 },                 // 골반 수평 허용 편차 (도)
    trunkForward: { tolerance: 15 }             // 상체 전방 경사 허용 편차 (도)
  },
  plie: {
    kneeAlign: { tolerance: 12 },  // 무릎-발끝 X축 정렬 허용 편차 (정규화 좌표 *100 단위, 0~100 범위)
    trunkVertical: { tolerance: 8 } // 상체 수직 허용 편차 (도)
  },
  sequence: {
    holdSec: 3,               // 통과 상태 유지 시간 기본값 (초) — 스텝별 holdSec으로 오버라이드 가능
    transitionSec: 3,         // 통과 후 다음 동작까지 준비 시간 (초) — 향후 카메라 방향(front/side)이 바뀌는 전환은 더 길게 확장 여지
    passCondition: 'no-fail', // 'all-pass' | 'no-fail' (warn 허용, fail만 차단) — 발레전문가 확정
    graceSec: 0.5,            // 유지 중 순간 이탈 유예 (초) — 이 시간 미만의 흔들림은 hold 타이머 리셋 안 함
    plieMinBend: 150          // 시퀀스 한정 플리에 평균 무릎 각도 상한 (도) — 이 값 이하로 굽혀야 통과 (서 있기만 해도 통과 방지)
  }
}
