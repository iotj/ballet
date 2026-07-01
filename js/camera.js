let stream = null
let facingMode = 'user'

export async function startCamera(videoEl) {
  await stopCamera()
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  })
  videoEl.srcObject = stream
  await videoEl.play()
  return stream
}

export async function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}

export function toggleFacing() {
  facingMode = facingMode === 'user' ? 'environment' : 'user'
  return facingMode
}

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일만 업로드 가능합니다.'))
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsDataURL(file)
  })
}
