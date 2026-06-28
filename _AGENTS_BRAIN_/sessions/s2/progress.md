# 세션 2 진행 기록 (2026-06-28) — 2차

## 브랜치
`feat/figma-like-designer` (origin/main 기준, 기존 작업은 `save/ad390e5`에 보존)

## git 문제 해결
- origin/main과 로컬 main이 갈라진 문제 해결
- 기존 커밋 `ad390e5` → `save/ad390e5` 브랜치로 안전 보존
- local main을 origin/main으로 리셋
- 새 브랜치 `feat/figma-like-designer` 생성

## 변경 사항

### 버그 수정
- `renderLayersTree()` → `refreshLayerPanel()` (정의되지 않은 함수 호출)
- `refreshPageTabs()` → `renderPagesList()` (정의되지 않은 함수 호출)
- `showToast()` 함수 직접 구현
- `activeVectorRoot`, `parseSVG` 등 dead 코드 제거

### 신규 기능

#### 1. CSS 클래스 관리자 (`class-manager.ts`)
- 속성 검사기에 CSS 클래스 섹션 추가
- 현재 클래스 목록을 뱃지로 표시
- 입력창에 클래스명 입력 후 Enter로 추가
- × 버튼으로 클래스 제거
- 변경 시 자동 undo 푸시

#### 2. 컴포넌트 라이브러리 (`component-library.ts`)
- localStorage에 사용자 정의 컴포넌트 저장
- 사이드바 "내 컴포넌트" 섹션
- 선택 요소를 컴포넌트로 저장
- 드래그 앤 드롭 + 클릭으로 캔버스 삽입
- 컴포넌트 삭제 가능
- 컴포넌트 탭 전환 시 자동 새로고침

#### 3. 룰러 가이드 라인 (`ruler-guide.ts`)
- 상단/좌측 룰러에서 드래그하여 가이드 생성
- 가이드 더블클릭으로 제거
- 드래그 중 실시간 미리보기
- 동일 세션 내 가이드 유지

#### 4. 스타일 프리셋 (`style-preset.ts`)
- 선택 요소의 주요 스타일을 프리셋으로 저장
- 프리셋 클릭으로 재적용
- 프리셋 삭제 가능
- localStorage에 저장

#### 5. 링크/URL 편집기
- `<a>` 태그: href 편집
- `<img>` 태그: src, alt 편집
- 기타 태그: href 속성 편집
- 디바운스된 undo 푸시

## 빌드 상태
- `npm run build` 성공 ✅
- TypeScript 0 에러
- Vite 번들링 성공

## 다음 제안
- 히스토리 패널 (시각적 Undo/Redo 목록)
- 이미지 업로드/관리
- 컨텍스트 메뉴에 클래스/프리셋/라이브러리 액션 추가
- 키보드 단축키 모달 업데이트
- 폼 빌더
