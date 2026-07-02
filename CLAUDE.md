# Ballet Pose Checker

## 실행
```bash
python3 -m http.server 8080
# http://localhost:8080/ballet/
```
배포: https://iotj.github.io/ballet/ (main push 시 자동 반영)

## 아키텍처

### 핵심 흐름
`app.js` → `mediapipe.js` (추론) → `poses/*.js` (분석) → UI 피드백

### 디렉토리
```
js/poses/        — 포즈별 분석 모듈 (플러그인 구조)
js/scorer.js     — 각도 계산 공통 유틸
js/poseRegistry.js — 포즈 등록 (새 동작 추가 시 여기만)
data/thresholds.js — 모든 수치/임계값 (로직에 하드코딩 금지)
```

### 포즈 플러그인 인터페이스
```js
export default {
  id, name, camera,   // 'front' | 'side'
  analyze(landmarks) → { scores, comments, status }
}
```

## 개발팀 에이전트 구조

오케스트레이터 패턴: PM이 요청을 받아 팀을 조율.

```
사용자 → /pm [요청]
           ├── 개발자 에이전트    (코드 구현)
           ├── 발레전문가 에이전트 (기준값/피드백 검토)
           └── QA 에이전트       (구현 완료 후 검증)
```

에이전트 정의: `.claude/agents/*.md`
스킬 호출: `/pm [요청 내용]`

## 데이터/로직 분리 원칙
모든 수치(각도 임계값 등)는 `data/thresholds.js`에만 정의. 로직 파일 하드코딩 금지.
