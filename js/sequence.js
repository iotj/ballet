// 시퀀스 연습 상태 머신
// idle → step(n) analyzing → step(n) holding → step(n) 통과(transition) → … → complete
// 모든 수치는 THRESHOLDS.sequence 참조 (하드코딩 금지)
import { THRESHOLDS } from '../data/thresholds.js'

export function createSequenceSession(sequence) {
  let stepIndex         = 0
  let phase             = 'idle' // 'idle' | 'analyzing' | 'holding' | 'transition' | 'complete'
  let holdStartMs       = null   // hold 시작 시각
  let lastMetMs         = null   // 마지막으로 통과 조건을 만족한 프레임 시각 (grace 유예 판정용)
  let transitionStartMs = null
  let stepStartMs       = null   // 현재 스텝 분석 시작 시각 (소요 시간 기록용, 전환 대기 제외)
  let pendingBreakKey   = null   // 유예 중 관찰된 이탈 항목명 (유예 초과 시 brokenKey로 확정)
  let brokenKey         = null   // 직전 hold 리셋 사유 항목명
  let stepTimes         = []     // 스텝별 소요 시간 (초)

  const cfg = () => THRESHOLDS.sequence
  const currentStep = () => sequence.steps[Math.min(stepIndex, sequence.steps.length - 1)]
  const holdMsOf = step => (step.holdSec ?? cfg().holdSec) * 1000

  // 통과 조건에 어긋나는 항목명 목록 (비어 있으면 통과 프레임)
  function getFailKeys(poseId, result) {
    const status = result.status ?? {}
    const keys = Object.keys(status)
    if (keys.length === 0) return ['분석 결과 없음']

    const fails = cfg().passCondition === 'all-pass'
      ? keys.filter(k => status[k] !== 'pass')
      : keys.filter(k => status[k] === 'fail') // 'no-fail': warn 허용, fail만 차단

    // 시퀀스 한정 추가 조건: 플리에는 충분히 굽혀야 통과 (단일 포즈 모드에는 영향 없음)
    if (poseId === 'plie') {
      const bend = result.raw?.avgKneeBend
      if (bend == null || bend > cfg().plieMinBend) fails.push('무릎 굽힘')
    }
    return fails
  }

  function passStep(nowMs) {
    stepTimes.push(Math.round((nowMs - stepStartMs) / 100) / 10) // 0.1초 단위 기록
    holdStartMs = null
    lastMetMs = null
    pendingBreakKey = null
    brokenKey = null
    if (stepIndex >= sequence.steps.length - 1) {
      phase = 'complete'
    } else {
      stepIndex += 1
      phase = 'transition' // 준비 시간 후 다음 스텝 analyzing 시작
      transitionStartMs = nowMs
    }
  }

  function snapshot(nowMs) {
    const step = currentStep()
    const holdMs = holdMsOf(step)
    const holding = phase === 'holding' && holdStartMs !== null
    return {
      phase,
      stepIndex,
      totalSteps: sequence.steps.length,
      poseId: step.poseId,
      stepHint: step.hint ?? '',
      holdSec: holdMs / 1000,
      holdProgress: holding ? Math.min(1, (nowMs - holdStartMs) / holdMs) : 0,
      holdRemainSec: holding ? Math.max(0, Math.ceil((holdStartMs + holdMs - nowMs) / 1000)) : 0,
      transitionRemainSec: phase === 'transition'
        ? Math.max(0, Math.ceil((transitionStartMs + cfg().transitionSec * 1000 - nowMs) / 1000))
        : 0,
      brokenKey,
      stepTimes: [...stepTimes]
    }
  }

  // 매 프레임 호출. analysisResult는 null(분석 프레임 없음) 가능
  function update(analysisResult, nowMs) {
    if (phase === 'complete') return snapshot(nowMs)

    if (phase === 'idle') {
      phase = 'analyzing'
      stepStartMs = nowMs
    }

    if (phase === 'transition') {
      if (nowMs - transitionStartMs >= cfg().transitionSec * 1000) {
        phase = 'analyzing'
        stepStartMs = nowMs
        holdStartMs = null
        lastMetMs = null
        pendingBreakKey = null
        brokenKey = null
      }
      return snapshot(nowMs)
    }

    // ─── analyzing / holding ───
    let frameMet = false // 이번 프레임이 통과 상태인지 (hold 완료 확정은 통과 프레임에서만)
    if (analysisResult && !analysisResult.error) {
      const fails = getFailKeys(currentStep().poseId, analysisResult)
      if (fails.length === 0) {
        frameMet = true
        if (holdStartMs === null) holdStartMs = nowMs
        lastMetMs = nowMs
        phase = 'holding'
        pendingBreakKey = null
        brokenKey = null
      } else if (phase === 'holding') {
        pendingBreakKey = fails[0] // 아직 리셋 아님 (grace 유예) — 사유만 기억
      }
    }

    // 유예(grace) 초과 시 hold 리셋 — 순간 이탈/프레임 공백은 허용
    if (phase === 'holding' && nowMs - lastMetMs > cfg().graceSec * 1000) {
      phase = 'analyzing'
      holdStartMs = null
      brokenKey = pendingBreakKey
      pendingBreakKey = null
    }

    // hold 완료 판정 — grace는 hold 진행 유지용일 뿐, 완료 확정은 통과 프레임에서만 (무너진 자세 인증 방지)
    if (phase === 'holding' && frameMet && nowMs - holdStartMs >= holdMsOf(currentStep())) {
      passStep(nowMs)
    }

    return snapshot(nowMs)
  }

  function getProgress() {
    return { phase, stepIndex, totalSteps: sequence.steps.length, stepTimes: [...stepTimes] }
  }

  function reset() {
    stepIndex = 0
    phase = 'idle'
    holdStartMs = null
    lastMetMs = null
    transitionStartMs = null
    stepStartMs = null
    pendingBreakKey = null
    brokenKey = null
    stepTimes = []
  }

  return { sequence, update, getProgress, reset }
}
