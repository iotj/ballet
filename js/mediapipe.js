const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task'
const WASM_URL  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

let poseLandmarker = null
let lastCallTime   = 0
const THROTTLE_MS  = 100 // 최대 10fps

export async function initMediaPipe(onProgress) {
  const { PoseLandmarker, FilesetResolver } = await import(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm'
  )

  onProgress?.('모델 파일 로딩 중...')
  const vision = await FilesetResolver.forVisionTasks(WASM_URL)

  onProgress?.('포즈 감지 초기화 중...')
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU'
    },
    runningMode: 'IMAGE',
    numPoses: 1
  })

  onProgress?.('준비 완료')
  return poseLandmarker
}

export async function detectImage(imageElement) {
  if (!poseLandmarker) throw new Error('MediaPipe가 초기화되지 않았습니다.')
  await setMode('IMAGE')
  const result = poseLandmarker.detect(imageElement)
  return result.landmarks[0] ?? null
}

export async function detectVideo(videoElement) {
  if (!poseLandmarker) return null
  if (!videoElement.videoWidth || !videoElement.videoHeight) return null
  if (videoElement.readyState < 2) return null

  const now = performance.now()
  if (now - lastCallTime < THROTTLE_MS) return null
  lastCallTime = now

  await setMode('VIDEO')
  const result = poseLandmarker.detectForVideo(videoElement, now)
  return result.landmarks[0] ?? null
}

let currentMode = null
async function setMode(mode) {
  if (currentMode === mode) return
  await poseLandmarker.setOptions({ runningMode: mode })
  currentMode = mode
}

export function isReady() {
  return poseLandmarker !== null
}
