import { POSES } from './poseRegistry.js'
import { initMediaPipe, detectImage, detectVideo, isReady } from './mediapipe.js'
import { startCamera, stopCamera, toggleFacing, loadImageFile } from './camera.js'
import { drawOverlay, syncCanvasSize, clearOverlay } from './overlay.js'

const POSE_META = {
  turnout:   { icon: '🦢', hint: '정면 촬영' },
  arabesque: { icon: '🩰', hint: '측면 촬영' },
  plie:      { icon: '🧘', hint: '정면 촬영' }
}

// DOM
const poseCardsEl    = document.getElementById('pose-cards')
const poseSelectEl   = document.getElementById('pose-select')
const analysisViewEl = document.getElementById('analysis-view')
const webcamEl       = document.getElementById('webcam')
const uploadedImgEl  = document.getElementById('uploaded-img')
const overlayEl      = document.getElementById('overlay')
const feedbackPanel  = document.getElementById('feedback-panel')
const feedbackEmpty  = document.getElementById('feedback-empty')
const lmNotice       = document.getElementById('lm-notice')
const loadingEl      = document.getElementById('loading-overlay')
const loadingMsg     = document.getElementById('loading-msg')
const btnWebcam      = document.getElementById('btn-webcam')
const btnUploadLabel = document.getElementById('btn-upload-label')
const fileInput      = document.getElementById('file-input')
const btnFlip        = document.getElementById('btn-flip')
const btnClose       = document.getElementById('btn-close')
const btnSave        = document.getElementById('btn-save')

let activePoseId  = POSES[0].id
let mode          = null // 'webcam' | 'upload'
let rafId         = null
let lastLandmarks = null

// ─── 포즈 카드 렌더링 ───
function renderPoseCards() {
  poseCardsEl.innerHTML = ''
  for (const pose of POSES) {
    const meta = POSE_META[pose.id] ?? { icon: '💃', hint: '' }
    const card = document.createElement('div')
    card.className = 'pose-card' + (pose.id === activePoseId ? ' active' : '')
    card.dataset.id = pose.id
    card.innerHTML = `<div class="icon">${meta.icon}</div><div class="name">${pose.name}</div><div class="hint">${meta.hint}</div>`
    card.addEventListener('click', () => selectPose(pose.id))
    poseCardsEl.appendChild(card)
  }
}

function selectPose(id) {
  activePoseId = id
  document.querySelectorAll('.pose-card').forEach(c => c.classList.toggle('active', c.dataset.id === id))
  clearFeedback()
  if (lastLandmarks) analyzeLandmarks(lastLandmarks)
}

// ─── 초기화 ───
async function init() {
  renderPoseCards()

  showLoading('MediaPipe 모델 로딩 중...')
  try {
    await initMediaPipe(msg => { loadingMsg.textContent = msg })
  } catch (e) {
    loadingMsg.textContent = '초기화 실패: ' + e.message
    return
  }
  hideLoading()

  // Service Worker 등록
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/ballet/sw.js').catch(() => {})
  }
}

// ─── 모드 전환 ───
function showAnalysis() {
  poseSelectEl.style.display = 'none'
  analysisViewEl.classList.add('active')
}

async function closeAnalysis() {
  cancelAnimationFrame(rafId)
  await stopCamera()
  mode = null
  lastLandmarks = null
  clearOverlay(overlayEl)
  clearFeedback()
  hideNotice()
  webcamEl.style.display = 'none'
  uploadedImgEl.style.display = 'none'
  analysisViewEl.classList.remove('active')
  poseSelectEl.style.display = ''
}

// ─── 웹캠 ───
btnWebcam.addEventListener('click', async () => {
  if (!isReady()) return
  showAnalysis()
  mode = 'webcam'
  webcamEl.style.display = 'block'
  uploadedImgEl.style.display = 'none'
  btnFlip.style.display = ''

  try {
    await startCamera(webcamEl)
  } catch (e) {
    showNotice('카메라를 사용할 수 없습니다: ' + e.message)
    return
  }
  requestVideoLoop()
})

function requestVideoLoop() {
  cancelAnimationFrame(rafId)
  async function loop() {
    if (mode !== 'webcam') return
    syncCanvasSize(overlayEl, webcamEl)
    const lm = await detectVideo(webcamEl)
    if (lm) {
      lastLandmarks = lm
      analyzeLandmarks(lm)
    }
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

// ─── 사진 업로드 ───
fileInput.addEventListener('change', async () => {
  clearFeedback()
  const file = fileInput.files[0]
  if (!file || !isReady()) return
  fileInput.value = ''

  let img
  try {
    img = await loadImageFile(file)
  } catch (e) {
    alert(e.message)
    return
  }

  cancelAnimationFrame(rafId)
  await stopCamera()
  mode = 'upload'

  showAnalysis()
  webcamEl.style.display = 'none'
  uploadedImgEl.style.display = 'block'
  uploadedImgEl.src = img.src
  btnFlip.style.display = 'none'

  // img 로드 완료 후 분석
  uploadedImgEl.onload = async () => {
    syncCanvasSize(overlayEl, uploadedImgEl)
    showLoading('분석 중...')
    const lm = await detectImage(img)
    hideLoading()
    if (!lm) {
      showNotice('사람을 인식하지 못했습니다. 전신이 잘 보이는 사진을 사용하세요.')
      return
    }
    lastLandmarks = lm
    analyzeLandmarks(lm)
  }
  if (uploadedImgEl.complete) uploadedImgEl.onload()
})

// ─── 분석 ───
function analyzeLandmarks(landmarks) {
  const pose = POSES.find(p => p.id === activePoseId)
  if (!pose) return

  const result = pose.analyze(landmarks)

  if (result.error) {
    showNotice(result.error)
    clearFeedback()
    drawOverlay(overlayEl, landmarks, {})
    return
  }

  hideNotice()
  drawOverlay(overlayEl, landmarks, result.status)
  renderFeedback(result)
}

// ─── 피드백 렌더링 ───
function renderFeedback(result) {
  feedbackPanel.innerHTML = ''
  const { scores, comments, status } = result

  for (const key of Object.keys(scores)) {
    const score = scores[key]
    const st    = status[key]
    const label = { pass: '통과', warn: '주의', fail: '수정 필요' }[st] ?? st

    const item = document.createElement('div')
    item.className = 'feedback-item'
    item.innerHTML = `
      <div class="feedback-header">
        <span class="feedback-label">${key}</span>
        <span class="badge ${st}">${label} · ${score}점</span>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar ${st}" style="width:${score}%"></div>
      </div>
      <p class="feedback-comment">${comments[key]}</p>
    `
    feedbackPanel.appendChild(item)
  }
}

function clearFeedback() {
  feedbackPanel.innerHTML = ''
  feedbackPanel.appendChild(feedbackEmpty)
}

// ─── 결과 저장 ───
btnSave.addEventListener('click', () => {
  const source = mode === 'webcam' ? webcamEl : uploadedImgEl
  const tmpCanvas = document.createElement('canvas')
  tmpCanvas.width  = overlayEl.width  || source.videoWidth  || source.naturalWidth  || 640
  tmpCanvas.height = overlayEl.height || source.videoHeight || source.naturalHeight || 480
  const ctx = tmpCanvas.getContext('2d')
  ctx.drawImage(source, 0, 0, tmpCanvas.width, tmpCanvas.height)
  ctx.drawImage(overlayEl, 0, 0)

  const a = document.createElement('a')
  a.href = tmpCanvas.toDataURL('image/png')
  a.download = `ballet_${activePoseId}_${Date.now()}.png`
  a.click()
})

// ─── 카메라 전환 ───
btnFlip.addEventListener('click', async () => {
  if (mode !== 'webcam') return
  cancelAnimationFrame(rafId)
  toggleFacing()
  try {
    await startCamera(webcamEl)
  } catch (e) {
    showNotice('카메라 전환 실패: ' + e.message)
  }
  requestVideoLoop()
})

// ─── 닫기 ───
btnClose.addEventListener('click', closeAnalysis)

// ─── 유틸 ───
function showLoading(msg) {
  loadingMsg.textContent = msg
  loadingEl.classList.add('visible')
}
function hideLoading() { loadingEl.classList.remove('visible') }

function showNotice(msg) { lmNotice.textContent = msg; lmNotice.classList.add('visible') }
function hideNotice()     { lmNotice.classList.remove('visible') }

init()
