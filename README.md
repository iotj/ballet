# 🩰 Ballet Pose Checker

MediaPipe 기반 발레 자세 분석 PWA 서비스.  
카메라 또는 사진 업로드로 **턴아웃 · 플리에 · 아라베스크** 자세를 즉시 분석합니다.

## 주요 기능

- **실시간 분석** — 웹캠으로 자세를 취하면 자동 감지 및 피드백
- **사진 업로드** — JPG/PNG 업로드 후 정적 분석
- **골격 오버레이** — 관절 연결선을 통과(초록)/주의(노랑)/수정(빨강)으로 표시
- **항목별 점수** — 각 체크 항목의 0~100점 점수와 한국어 코멘트
- **결과 저장** — 오버레이가 합성된 PNG 다운로드
- **PWA** — iOS/Android 홈 화면에 추가해 앱처럼 사용, 오프라인 캐시 지원

## 분석 동작

| 동작 | 체크 항목 |
|---|---|
| 턴아웃 | 양발 외회전 각도, 무릎-발끝 정렬 |
| 플리에 | 무릎 굽힘, 무릎-발끝 방향, 상체 수직 |
| 아라베스크 | 후면 다리 높이, 어깨 수평 |

## 실행

```bash
python3 -m http.server 8080
# http://localhost:8080 접속
```

> 카메라 접근과 Service Worker는 **HTTPS** 또는 `localhost` 환경에서만 동작합니다.  
> 배포 시 HTTPS 정적 호스팅(GitHub Pages, Netlify 등)을 사용하세요.

## 기술 스택

- [MediaPipe Tasks Vision Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) — 클라이언트 사이드 포즈 추론 (영상 서버 전송 없음)
- Vanilla JS ES Module + Canvas API
- PWA (manifest + Service Worker)

## 구조

```
├── index.html
├── manifest.json        # PWA 설정
├── sw.js                # Service Worker (오프라인 캐시)
├── style.css
├── js/
│   ├── app.js           # 진입점, 모드 전환
│   ├── mediapipe.js     # PoseLandmarker 래퍼
│   ├── camera.js        # 웹캠 / 파일 업로드
│   ├── overlay.js       # Canvas 골격 렌더링
│   ├── scorer.js        # 각도 계산 공통 유틸
│   ├── poseRegistry.js  # 포즈 플러그인 등록
│   └── poses/
│       ├── turnout.js
│       ├── plie.js
│       └── arabesque.js
└── data/
    └── thresholds.js    # 각도 임계값 (패스/경고/실패 기준)
```

## 새 동작 추가

`js/poses/` 에 파일을 추가하고 `js/poseRegistry.js` 에 등록하면 UI에 자동 반영됩니다.

```js
// js/poses/my_pose.js
export default {
  id: 'my_pose',
  name: '동작 이름',
  camera: 'front',  // 'front' | 'side'
  analyze(landmarks) {
    return {
      scores:   { '항목': 85 },
      comments: { '항목': '피드백 텍스트' },
      status:   { '항목': 'pass' }  // 'pass' | 'warn' | 'fail'
    }
  }
}
```

```js
// js/poseRegistry.js
import myPose from './poses/my_pose.js'
export const POSES = [turnout, plie, arabesque, myPose]
```

## 주의 사항

- 이 서비스는 참고용이며 전문 교사의 지도를 대체하지 않습니다.
- 미성년자 영상 처리 시 보호자 동의가 필요합니다.
