import { POSES } from './poseRegistry.js'
import { initMediaPipe, detectImage, detectVideo, isReady } from './mediapipe.js'
import { startCamera, stopCamera, toggleFacing, loadImageFile } from './camera.js'
import { drawOverlay, syncCanvasSize, clearOverlay } from './overlay.js'

const POSE_META = {
  turnout: {
    icon: '🦢',
    hint: '정면 촬영',
    svg: `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg" fill="#c8a4c8">
      <!-- 머리 -->
      <circle cx="40" cy="12" r="7"/>
      <!-- 목 -->
      <rect x="37" y="19" width="6" height="8" rx="2"/>
      <!-- 몸통 -->
      <rect x="30" y="27" width="20" height="28" rx="4"/>
      <!-- 왼팔 -->
      <line x1="30" y1="32" x2="12" y2="44" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 오른팔 -->
      <line x1="50" y1="32" x2="68" y2="44" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 왼다리 (바깥쪽 벌림) -->
      <line x1="35" y1="55" x2="18" y2="85" stroke="#c8a4c8" stroke-width="5" stroke-linecap="round"/>
      <!-- 오른다리 (바깥쪽 벌림) -->
      <line x1="45" y1="55" x2="62" y2="85" stroke="#c8a4c8" stroke-width="5" stroke-linecap="round"/>
      <!-- 왼발 (외회전, 왼쪽 방향) -->
      <line x1="18" y1="85" x2="6" y2="90" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 오른발 (외회전, 오른쪽 방향) -->
      <line x1="62" y1="85" x2="74" y2="90" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
    </svg>`
  },
  plie: {
    icon: '🧘',
    hint: '정면 촬영',
    svg: `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg" fill="#c8a4c8">
      <!-- 머리 -->
      <circle cx="40" cy="10" r="7"/>
      <!-- 목 -->
      <rect x="37" y="17" width="6" height="7" rx="2"/>
      <!-- 몸통 (수직 유지) -->
      <rect x="30" y="24" width="20" height="24" rx="4"/>
      <!-- 왼팔 -->
      <line x1="30" y1="29" x2="14" y2="42" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 오른팔 -->
      <line x1="50" y1="29" x2="66" y2="42" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 왼허벅지 (굽힌 무릎, 바깥쪽으로) -->
      <line x1="35" y1="48" x2="18" y2="72" stroke="#c8a4c8" stroke-width="5" stroke-linecap="round"/>
      <!-- 오른허벅지 -->
      <line x1="45" y1="48" x2="62" y2="72" stroke="#c8a4c8" stroke-width="5" stroke-linecap="round"/>
      <!-- 왼종아리 (무릎 굽힘) -->
      <line x1="18" y1="72" x2="14" y2="100" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 오른종아리 -->
      <line x1="62" y1="72" x2="66" y2="100" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 왼발 -->
      <line x1="14" y1="100" x2="4" y2="105" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 오른발 -->
      <line x1="66" y1="100" x2="76" y2="105" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
    </svg>`
  },
  arabesque: {
    icon: '🩰',
    hint: '측면 촬영',
    svg: `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg" fill="#c8a4c8">
      <!-- 머리 -->
      <circle cx="22" cy="10" r="7"/>
      <!-- 목 -->
      <rect x="19" y="17" width="6" height="6" rx="2"/>
      <!-- 상체 (약간 앞으로 기울어짐) -->
      <line x1="22" y1="23" x2="28" y2="52" stroke="#c8a4c8" stroke-width="6" stroke-linecap="round"/>
      <!-- 앞으로 뻗은 팔 -->
      <line x1="22" y1="30" x2="4" y2="36" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 뒤로 뻗은 팔 -->
      <line x1="26" y1="32" x2="42" y2="38" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 지지발 다리 (수직) -->
      <line x1="28" y1="52" x2="28" y2="105" stroke="#c8a4c8" stroke-width="5" stroke-linecap="round"/>
      <!-- 지지발 발바닥 -->
      <line x1="20" y1="105" x2="36" y2="105" stroke="#c8a4c8" stroke-width="4" stroke-linecap="round"/>
      <!-- 후면 다리 (높이 들어올림) -->
      <line x1="28" y1="60" x2="70" y2="38" stroke="#c8a4c8" stroke-width="5" stroke-linecap="round"/>
    </svg>`
  }
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
let lastMode      = null // 분석 화면 닫은 후에도 마지막 입력 방식 기억
let rafId         = null
let lastLandmarks = null

// ─── 포즈 카드 렌더링 ───
function renderPoseCards() {
  poseCardsEl.innerHTML = ''
  for (const pose of POSES) {
    const meta = POSE_META[pose.id] ?? { icon: '💃', hint: '', svg: '' }
    const card = document.createElement('div')
    card.className = 'pose-card' + (pose.id === activePoseId ? ' active' : '')
    card.dataset.id = pose.id
    const checkpointsHtml = (pose.checkpoints ?? [])
      .map((cp, i) => `<li>${['①','②','③'][i] ?? '·'} ${cp}</li>`)
      .join('')
    card.innerHTML = `
      <div class="pose-svg">${meta.svg ?? ''}</div>
      <div class="pose-name">${pose.name}</div>
      <div class="pose-desc">${pose.description ?? ''}</div>
      <ul class="pose-checkpoints">${checkpointsHtml}</ul>
      <div class="pose-tip">📷 ${pose.tip ?? meta.hint}</div>
    `
    card.addEventListener('click', () => selectPose(pose.id))
    poseCardsEl.appendChild(card)
  }
}

function selectPose(id) {
  activePoseId = id
  document.querySelectorAll('.pose-card').forEach(c => c.classList.toggle('active', c.dataset.id === id))
  clearFeedback()
  if (lastLandmarks) {
    analyzeLandmarks(lastLandmarks)
    return
  }
  // 포즈 선택 화면에서 입력 방식이 이전에 선택된 경우 즉시 분석 시작
  if (!analysisViewEl.classList.contains('active') && lastMode !== null && isReady()) {
    if (lastMode === 'webcam') {
      btnWebcam.click()
    } else if (lastMode === 'upload') {
      fileInput.click()
    }
  }
}

// ─── 초기화 ───
async function init() {
  history.replaceState({ view: 'home' }, '')
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
  history.pushState({ view: 'analysis' }, '')
  poseSelectEl.style.display = 'none'
  analysisViewEl.classList.add('active')
}

async function closeAnalysis() {
  cancelAnimationFrame(rafId)
  await stopCamera()
  lastMode = mode  // 마지막 입력 방식 기억
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
function setInputButtonSelected(selectedMode) {
  btnWebcam.classList.toggle('selected', selectedMode === 'webcam')
  btnUploadLabel.classList.toggle('selected', selectedMode === 'upload')
}

btnWebcam.addEventListener('click', async () => {
  if (!isReady()) return
  showAnalysis()
  mode = 'webcam'
  lastMode = 'webcam'
  setInputButtonSelected('webcam')
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
  lastMode = 'upload'
  setInputButtonSelected('upload')

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

// ─── 물리 back 버튼 처리 ───
window.addEventListener('popstate', (e) => {
  if (analysisViewEl.classList.contains('active')) {
    closeAnalysis()
    // home으로 돌아왔으므로 다시 home state replace
    history.replaceState({ view: 'home' }, '')
  }
})

init()
