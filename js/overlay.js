const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // 팔
  [11, 23], [12, 24], [23, 24],                       // 몸통
  [23, 25], [25, 27], [24, 26], [26, 28],             // 다리
  [27, 29], [29, 31], [28, 30], [30, 32]              // 발
]

const STATUS_COLOR = { pass: '#4ade80', warn: '#facc15', fail: '#f87171', default: '#94a3b8' }

export function drawOverlay(canvas, landmarks, statusMap = {}) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!landmarks || landmarks.length === 0) return

  const w = canvas.width
  const h = canvas.height

  // 전체 골격 색상 결정 (status 중 가장 나쁜 것)
  const statuses = Object.values(statusMap)
  const overallColor = statuses.includes('fail') ? STATUS_COLOR.fail
    : statuses.includes('warn') ? STATUS_COLOR.warn
    : statuses.length > 0 ? STATUS_COLOR.pass
    : STATUS_COLOR.default

  // 연결선
  ctx.lineWidth = 3
  ctx.strokeStyle = overallColor
  ctx.globalAlpha = 0.85
  for (const [a, b] of CONNECTIONS) {
    const lmA = landmarks[a]
    const lmB = landmarks[b]
    if (!lmA || !lmB) continue
    if ((lmA.visibility ?? 1) < 0.3 || (lmB.visibility ?? 1) < 0.3) continue
    ctx.beginPath()
    ctx.moveTo(lmA.x * w, lmA.y * h)
    ctx.lineTo(lmB.x * w, lmB.y * h)
    ctx.stroke()
  }

  // 관절 점
  ctx.globalAlpha = 1
  for (const lm of landmarks) {
    if (!lm || (lm.visibility ?? 1) < 0.3) continue
    ctx.beginPath()
    ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2)
    ctx.fillStyle = overallColor
    ctx.fill()
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

export function clearOverlay(canvas) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

export function syncCanvasSize(canvas, source) {
  const w = source.videoWidth || source.naturalWidth || source.offsetWidth
  const h = source.videoHeight || source.naturalHeight || source.offsetHeight
  if (w && h && (canvas.width !== w || canvas.height !== h)) {
    canvas.width  = w
    canvas.height = h
  }
}
