import { allVisible, landmarkVisible, scoreFromAngle, statusFromScore } from '../scorer.js'
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
  camera: 'side',
  description: '한쪽 다리로 서고 반대쪽 다리를 뒤로 높이 들어 올리는 발레 대표 포즈. 골반이 수평을 유지한 상태에서 후면 다리가 올라가야 하며 코어 근력과 균형 감각이 필요하다.',
  checkpoints: ['후면 다리 높이 (45° 이상)', '골반 수평 유지', '상체 전방 경사 적절'],
  tip: '측면 촬영 필수 · 허리 높이에서 몸의 정확한 측면(90°)에서 촬영',

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

    // 골반 수평 체크 (LEFT_HIP.y와 RIGHT_HIP.y 차이)
    const leftHip  = landmarks[LM.LEFT_HIP]
    const rightHip = landmarks[LM.RIGHT_HIP]
    const hipDy = Math.abs(leftHip.y - rightHip.y)
    // 정규화 좌표 차이를 각도로 환산 (atan2 사용)
    const hipHorizontalDiff = Math.atan2(Math.abs(leftHip.y - rightHip.y), Math.abs(leftHip.x - rightHip.x)) * (180 / Math.PI)
    const hipScore = scoreFromAngle(hipHorizontalDiff, 0, THRESHOLDS.arabesque.hipLevel.tolerance)

    // 상체 전방 경사 체크 (어깨-고관절 벡터의 수직 편차)
    const leftShoulder  = landmarks[LM.LEFT_SHOULDER]
    const rightShoulder = landmarks[LM.RIGHT_SHOULDER]
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
    const hipMidX = (leftHip.x + rightHip.x) / 2
    const hipMidY = (leftHip.y + rightHip.y) / 2
    // 어깨 중점 → 골반 중점 벡터와 수직(dy 기준)의 편차
    const trunkDx = shoulderMidX - hipMidX
    const trunkDy = shoulderMidY - hipMidY
    // 수직선(위쪽)으로부터의 각도: 완전 수직이면 0도
    const trunkAngle = Math.abs(Math.atan2(Math.abs(trunkDx), Math.abs(trunkDy)) * (180 / Math.PI))
    const trunkScore = scoreFromAngle(trunkAngle, 0, THRESHOLDS.arabesque.trunkForward.tolerance)

    const legStatus   = statusFromScore(legScore)
    const hipStatus   = statusFromScore(hipScore)
    const trunkStatus = statusFromScore(trunkScore)

    return {
      scores: {
        '다리 높이': legScore,
        '골반 수평': hipScore,
        '상체 경사': trunkScore
      },
      comments: {
        '다리 높이': legStatus === 'pass'
          ? `후면 다리 ${Math.round(legAngle)}°로 훌륭한 아라베스크입니다.`
          : `후면 다리 ${Math.round(legAngle)}°입니다. 엉덩이 근육을 조이며 허벅지 뒤쪽으로 다리를 밀어 올리세요.`,
        '골반 수평': hipStatus === 'pass'
          ? '골반이 수평으로 잘 유지되고 있습니다.'
          : '복사근(옆구리)에 힘을 주고 올라간 골반을 눌러 내리듯 의식하며 다리를 드세요.',
        '상체 경사': trunkStatus === 'pass'
          ? '상체가 바르게 유지되고 있습니다.'
          : '복부를 당기고 등 근육으로 상체를 잡아주세요.'
      },
      status: {
        '다리 높이': legStatus,
        '골반 수평': hipStatus,
        '상체 경사': trunkStatus
      },
      raw: { legAngle: Math.round(legAngle) }
    }
  }
}
