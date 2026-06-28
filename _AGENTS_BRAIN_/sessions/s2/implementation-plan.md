# 세션 2 구현 계획 — 완전 자유 WYSIWYG

## 목표
WingStar Web Builder를 Dreamweaver 급 완전 자유 WYSIWYG 에디터로 업그레이드

## 구현 항목

### 1. CSS 클래스 관리자 (`class-manager.ts`)
- 선택한 요소의 현재 클래스 목록 표시
- 클래스 추가 (input + Enter)
- 클래스 제거 (x 버튼)
- 클래스 토글 (체크박스)
- 속성 검사기에 `group-css-classes` 패널 추가
- index.html에 UI 마크업 추가

### 2. 컴포넌트 라이브러리 (`component-library.ts`)
- localStorage에 사용자 정의 컴포넌트 저장
- "내 컴포넌트" 섹션을 사이드바에 추가
- 선택한 요소를 라이브러리에 저장 (이름 입력)
- 라이브러리에서 드래그 앤 드롭으로 캔버스에 추가
- 컴포넌트 삭제/관리

### 3. 룰러 가이드 라인 (`ruler-guide.ts`)
- 상단/좌측 룰러에서 드래그하여 가이드 라인 생성
- 가이드 라인 드래그로 이동
- 가이드 라인 더블클릭으로 제거
- 스마트 가이드와 연동
- 가이드 라인 시각적 스타일 (cyan, 반투명)

### 4. 스타일 프리셋 (`style-preset.ts`)
- 현재 요소의 스타일을 프리셋으로 저장
- 프리셋 목록에서 선택하여 적용
- localStorage에 저장
- 속성 검사기에 UI 추가

### 5. 멀티 선택 일괄 작업 (`batch-operations.ts`)
- 멀티 선택된 요소들에 일괄 작업 지원
- 일괄 삭제, 일괄 정렬, 일괄 스타일 적용
- Shift+클릭 멀티 선택 연동 (layer-panel.ts 기존 기능 활용)

### 6. 링크/URL 편집기
- 속성 검사기에 `<a>` 태그의 `href` 편집 필드 추가
- `<img>` 태그의 `src` 와 `alt` 편집 필드 추가
- `<button>` 의 `onclick` 편집

### 7. 버그 수정
- `index.ts`의 `renderLayersTree()` → `refreshLayerPanel()` 로 변경
- `refreshPageTabs()` → `renderPagesList()` 로 변경
- `showToast()` 함수 구현

## 진행 순서
1. 버그 수정 (즉시 효과)
2. CSS 클래스 관리자
3. 링크/URL 편집기
4. 스타일 프리셋
5. 룰러 가이드 라인
6. 컴포넌트 라이브러리
7. 멀티 선택 일괄 작업
