import { allVisible, landmarkVisible, scoreFromAngle, statusFromScore, horizontalAngle } from '../scorer.js'
import { THRESHOLDS } from '../../data/thresholds.js'

const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28
}

function legAngleFromGround(hip, ankle) {
  // 고관절에서 발목 방향 벡터의 지면(수평)으로부터 각도
  const dx = ankle.x - hip.x
  const dy = ankle.y - hip.y // y가 아래로 증가하는 좌표계
  // 위로 올라갈수록 dy < 0이므로 각도 양수
  return Math.atan2(-dy, Math.abs(dx)) * (180 / Math.PI)
}

export default {
  id: 'arabesque',
  name: '아라베스크',
  camera: 'front',

  analyze(landmarks) {
    const baseRequired = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                          LM.LEFT_HIP, LM.RIGHT_HIP]
    if (!allVisible(landmarks, baseRequired)) {
      return { error: '상체와 골반이 화면에 모두 들어오도록 조정하세요.' }
    }

    // 어느 쪽 다리가 뒤로 올라갔는지 판단 (y좌표가 낮을수록 올라간 것)
    const leftAnkleVisible  = landmarkVisible(landmarks[LM.LEFT_ANKLE])
    const rightAnkleVisible = landmarkVisible(landmarks[LM.RIGHT_ANKLE])

    if (!leftAnkleVisible && !rightAnkleVisible) {
      return { error: '발목이 화면에 들어오도록 뒤로 조금 물러서세요.' }
    }

    // 더 높이 올라간 쪽을 후면 다리로 판단
    let backHip, backAnkle, supportHip, supportAnkle
    const leftY  = leftAnkleVisible  ? landmarks[LM.LEFT_ANKLE].y  : 1
    const rightY = rightAnkleVisible ? landmarks[LM.RIGHT_ANKLE].y : 1

    if (leftY < rightY) {
      // 왼발이 올라간 경우
      backHip    = landmarks[LM.LEFT_HIP]
      backAnkle  = landmarks[LM.LEFT_ANKLE]
      supportHip = landmarks[LM.RIGHT_HIP]
      supportAnkle = rightAnkleVisible ? landmarks[LM.RIGHT_ANKLE] : null
    } else {
      backHip    = landmarks[LM.RIGHT_HIP]
      backAnkle  = landmarks[LM.RIGHT_ANKLE]
      supportHip = landmarks[LM.LEFT_HIP]
      supportAnkle = leftAnkleVisible ? landmarks[LM.LEFT_ANKLE] : null
    }

    // 후면 다리 각도 (지면 기준)
    const legAngle = legAngleFromGround(backHip, backAnkle)
    const t = THRESHOLDS.arabesque.legAngle
    const legScore = legAngle >= t.pass ? 100
      : legAngle >= t.warn ? Math.round(75 + (legAngle - t.warn) / (t.pass - t.warn) * 25)
      : legAngle >= t.fail ? Math.round(50 + (legAngle - t.fail) / (t.warn - t.fail) * 25)
      : Math.max(0, Math.round((legAngle / t.fail) * 50))

    // 어깨 수평 체크
    const shoulderAngle = Math.abs(horizontalAngle(landmarks[LM.LEFT_SHOULDER], landmarks[LM.RIGHT_SHOULDER]))
    const shoulderDiff  = Math.abs(shoulderAngle) // 수평에서 편차
    const shoulderScore = scoreFromAngle(shoulderDiff, 0, THRESHOLDS.arabesque.shoulderLevel.tolerance)

    const legStatus      = statusFromScore(legScore)
    const shoulderStatus = statusFromScore(shoulderScore)

    return {
      scores: {
        '다리 높이': legScore,
        '어깨 수평': shoulderScore
      },
      comments: {
        '다리 높이': legStatus === 'pass'
          ? `후면 다리 ${Math.round(legAngle)}°로 훌륭한 아라베스크입니다.`
          : legStatus === 'warn'
          ? `후면 다리 ${Math.round(legAngle)}°입니다. 골반을 정면으로 유지하며 조금 더 올려보세요.`
          : `후면 다리 ${Math.round(legAngle)}°입니다. 지지발 무릎을 살짝 굽혀 균형을 잡고 다리를 들어올리세요.`,
        '어깨 수평': shoulderStatus === 'pass'
          ? '어깨선이 수평으로 잘 유지되고 있습니다.'
          : `어깨가 ${Math.round(shoulderDiff)}° 기울어져 있습니다. 양쪽 어깨 높이를 같게 유지하세요.`
      },
      status: {
        '다리 높이': legStatus,
        '어깨 수평': shoulderStatus
      },
      raw: { legAngle: Math.round(legAngle) }
    }
  }
}
