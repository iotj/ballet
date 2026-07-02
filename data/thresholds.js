export const THRESHOLDS = {
  turnout: {
    total: { pass: 170, warn: 140, fail: 110 }, // 양발 합산 외회전 각도
    kneeAlign: { tolerance: 15 }                // 무릎-발끝 방향 허용 편차 (도)
  },
  arabesque: {
    legAngle: { pass: 80, warn: 50, fail: 25 }, // 후면 다리 각도 (지면 기준)
    shoulderLevel: { tolerance: 8 }             // 어깨 수평 허용 편차 (도)
  },
  plie: {
    kneeAlign: { tolerance: 12 },  // 무릎-발끝 X축 정렬 허용 편차 (정규화 좌표 *100 단위, 0~100 범위)
    trunkVertical: { tolerance: 8 } // 상체 수직 허용 편차 (도)
  }
}
