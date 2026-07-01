import { allVisible, angleBetween, scoreFromAngle, statusFromScore, horizontalAngle } from '../scorer.js'
import { THRESHOLDS } from '../../data/thresholds.js'

const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_FOOT: 31, RIGHT_FOOT: 32
}

export default {
  id: 'plie',
  name: '플리에',
  camera: 'front',

  analyze(landmarks) {
    const required = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                      LM.LEFT_HIP, LM.RIGHT_HIP,
                      LM.LEFT_KNEE, LM.RIGHT_KNEE,
                      LM.LEFT_ANKLE, LM.RIGHT_ANKLE]
    if (!allVisible(landmarks, required)) {
      return { error: '상체부터 발목까지 화면에 모두 들어오도록 조정하세요.' }
    }

    // 무릎 굽힘 각도 (Hip-Knee-Ankle)
    const leftKneeBend  = angleBetween(landmarks[LM.LEFT_HIP],  landmarks[LM.LEFT_KNEE],  landmarks[LM.LEFT_ANKLE])
    const rightKneeBend = angleBetween(landmarks[LM.RIGHT_HIP], landmarks[LM.RIGHT_KNEE], landmarks[LM.RIGHT_ANKLE])
    const avgKneeBend = (leftKneeBend + rightKneeBend) / 2
    // 플리에는 굽힌 상태이므로 각도가 작을수록 더 굽힘 (90~150도가 일반적 범위)
    const kneeBendScore = avgKneeBend < 160 ? 100 : scoreFromAngle(avgKneeBend, 140, 20)

    // 무릎-발끝 X축 정렬 (무릎이 발끝 방향으로 열렸는지)
    const leftKneeX  = landmarks[LM.LEFT_KNEE].x
    const leftFootX  = landmarks[LM.LEFT_FOOT]?.x ?? landmarks[LM.LEFT_ANKLE].x
    const rightKneeX = landmarks[LM.RIGHT_KNEE].x
    const rightFootX = landmarks[LM.RIGHT_FOOT]?.x ?? landmarks[LM.RIGHT_ANKLE].x

    const leftAnkleX  = landmarks[LM.LEFT_ANKLE].x
    const rightAnkleX = landmarks[LM.RIGHT_ANKLE].x

    // 무릎이 발목보다 발끝 방향으로 나와 있어야 함 (X 오프셋)
    const leftAlignOk  = (leftKneeX  <= leftAnkleX  + 0.02) // 왼쪽은 무릎이 왼쪽으로
    const rightAlignOk = (rightKneeX >= rightAnkleX - 0.02) // 오른쪽은 무릎이 오른쪽으로

    // 무릎과 발 사이 수평 거리 비율로 점수 계산
    const leftDiff  = Math.abs(leftKneeX  - leftFootX)  * 100
    const rightDiff = Math.abs(rightKneeX - rightFootX) * 100
    const tolerance = THRESHOLDS.plie.kneeAlign.tolerance
    const alignScore = scoreFromAngle(Math.max(leftDiff, rightDiff), 0, tolerance)

    // 상체 수직 정렬 (어깨 중점 - 골반 중점 수직선)
    const shoulderMid = {
      x: (landmarks[LM.LEFT_SHOULDER].x + landmarks[LM.RIGHT_SHOULDER].x) / 2,
      y: (landmarks[LM.LEFT_SHOULDER].y + landmarks[LM.RIGHT_SHOULDER].y) / 2
    }
    const hipMid = {
      x: (landmarks[LM.LEFT_HIP].x + landmarks[LM.RIGHT_HIP].x) / 2,
      y: (landmarks[LM.LEFT_HIP].y + landmarks[LM.RIGHT_HIP].y) / 2
    }
    const trunkAngle = Math.abs(horizontalAngle(hipMid, shoulderMid) + 90) // 수직에서 편차
    const trunkScore = scoreFromAngle(trunkAngle, 0, THRESHOLDS.plie.trunkVertical.tolerance)

    const alignStatus = statusFromScore(alignScore)
    const trunkStatus = statusFromScore(trunkScore)
    const kneeBendStatus = statusFromScore(kneeBendScore)

    return {
      scores: {
        '무릎 굽힘': kneeBendScore,
        '무릎 정렬': alignScore,
        '상체 수직': trunkScore
      },
      comments: {
        '무릎 굽힘': kneeBendStatus === 'pass'
          ? '무릎을 잘 굽히고 있습니다.'
          : '더 깊이 굽혀보세요. 발뒤꿈치가 들리지 않게 주의하세요.',
        '무릎 정렬': alignStatus === 'pass'
          ? '무릎이 발끝 방향으로 잘 열려 있습니다.'
          : '무릎을 발끝 방향으로 더 밀어주세요. 무릎이 안쪽으로 모이지 않게 하세요.',
        '상체 수직': trunkStatus === 'pass'
          ? '상체가 수직으로 잘 유지되고 있습니다.'
          : `상체가 ${Math.round(trunkAngle)}° 기울어져 있습니다. 허리를 세우고 상체를 수직으로 유지하세요.`
      },
      status: {
        '무릎 굽힘': kneeBendStatus,
        '무릎 정렬': alignStatus,
        '상체 수직': trunkStatus
      }
    }
  }
}
