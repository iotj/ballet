export function angleBetween(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2)
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2)
  if (magAB === 0 || magCB === 0) return 0
  return Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB)))) * (180 / Math.PI)
}

export function vectorAngle(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI)
}

export function landmarkVisible(lm, threshold = 0.5) {
  return lm && (lm.visibility ?? 1) >= threshold
}

export function allVisible(landmarks, indices, threshold = 0.5) {
  return indices.every(i => landmarkVisible(landmarks[i], threshold))
}

export function scoreFromAngle(angle, ideal, tolerance) {
  const diff = Math.abs(angle - ideal)
  if (diff <= tolerance * 0.3) return 100
  if (diff <= tolerance) return Math.round(100 - (diff / tolerance) * 40)
  return Math.max(0, Math.round(60 - ((diff - tolerance) / tolerance) * 60))
}

export function statusFromScore(score) {
  if (score >= 75) return 'pass'
  if (score >= 50) return 'warn'
  return 'fail'
}

export function horizontalAngle(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI)
}
