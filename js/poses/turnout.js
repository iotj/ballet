import { allVisible, vectorAngle, scoreFromAngle, statusFromScore } from '../scorer.js'
import { THRESHOLDS } from '../../data/thresholds.js'

const LM = {
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT: 31, RIGHT_FOOT: 32
}

export default {
  id: 'turnout',
  name: '턴아웃',
  camera: 'front',
  description: '양발을 바깥쪽으로 최대한 회전시켜 180도에 가깝게 벌리는 발레의 기본 자세. 고관절부터 시작된 외회전이 무릎, 발끝까지 이어져야 하며, 억지로 발만 벌리면 부상이 생긴다.',
  checkpoints: ['양발 외회전 각도 합산', '무릎-발끝 방향 일치', '고관절부터 정렬 유지'],
  tip: '정면 촬영 · 발 전체와 무릎이 보이도록 허리 높이에 카메라',

  analyze(landmarks) {
    const required = [LM.LEFT_HEEL, LM.LEFT_FOOT, LM.RIGHT_HEEL, LM.RIGHT_FOOT,
                      LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE]
    if (!allVisible(landmarks, required)) {
      return { error: '발과 무릎이 화면에 모두 들어오도록 조정하세요.' }
    }

    // 발 방향 벡터 각도 (heel→toe)
    const leftFootAngle  = vectorAngle(landmarks[LM.LEFT_HEEL],  landmarks[LM.LEFT_FOOT])
    const rightFootAngle = vectorAngle(landmarks[LM.RIGHT_HEEL], landmarks[LM.RIGHT_FOOT])

    // 외회전: 왼발은 왼쪽(-방향)으로, 오른발은 오른쪽(+방향)으로 벌어짐
    // 두 발이 이루는 각도 차이가 총 턴아웃량
    const totalTurnout = Math.abs(leftFootAngle - rightFootAngle)
    const normalizedTurnout = totalTurnout > 180 ? 360 - totalTurnout : totalTurnout

    const t = THRESHOLDS.turnout.total
    const turnoutScore = normalizedTurnout >= t.pass ? 100
      : normalizedTurnout >= t.warn ? Math.round(75 + (normalizedTurnout - t.warn) / (t.pass - t.warn) * 25)
      : normalizedTurnout >= t.fail ? Math.round(50 + (normalizedTurnout - t.fail) / (t.warn - t.fail) * 25)
      : Math.round((normalizedTurnout / t.fail) * 50)

    // 무릎-발끝 정렬 (무릎이 발끝 방향을 향하는지)
    const leftKneeAngle  = vectorAngle(landmarks[LM.LEFT_ANKLE],  landmarks[LM.LEFT_KNEE])
    const rightKneeAngle = vectorAngle(landmarks[LM.RIGHT_ANKLE], landmarks[LM.RIGHT_KNEE])
    let leftAlignDiff  = Math.abs(leftKneeAngle  - leftFootAngle)
    if (leftAlignDiff  > 180) leftAlignDiff  = 360 - leftAlignDiff
    let rightAlignDiff = Math.abs(rightKneeAngle - rightFootAngle)
    if (rightAlignDiff > 180) rightAlignDiff = 360 - rightAlignDiff
    const alignDiff = Math.max(leftAlignDiff, rightAlignDiff)
    const alignTolerance = THRESHOLDS.turnout.kneeAlign.tolerance
    const alignScore = scoreFromAngle(alignDiff, 0, alignTolerance)

    const turnoutStatus = statusFromScore(turnoutScore)
    const alignStatus   = statusFromScore(alignScore)

    const turnoutComment = turnoutStatus === 'pass'
      ? `양발 외회전 ${Math.round(normalizedTurnout)}°로 훌륭합니다.`
      : `양발 외회전 ${Math.round(normalizedTurnout)}°입니다. 엉덩이 옆 근육으로 무릎을 새끼발가락 방향으로 밀어주세요.`

    const alignComment = alignStatus === 'pass'
      ? '무릎이 발끝 방향으로 잘 정렬되어 있습니다.'
      : '엉덩이 옆 근육(외회전근)으로 무릎을 발끝 방향으로 열어주세요. 발만 억지로 벌리면 부상이 생깁니다.'

    return {
      scores:   { '외회전 각도': turnoutScore, '무릎 정렬': alignScore },
      comments: { '외회전 각도': turnoutComment, '무릎 정렬': alignComment },
      status:   { '외회전 각도': turnoutStatus, '무릎 정렬': alignStatus },
      raw:      { totalTurnout: Math.round(normalizedTurnout) }
    }
  }
}
