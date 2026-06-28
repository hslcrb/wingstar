# WingStar — Figma-like Designer 작업 완료 보고서

## 브랜치: `feat/figma-like-designer` (main 기준 10 commits ahead)

### 새로 구현된 기능

| 도메인 | 기능 | 구현 방식 |
|--------|------|-----------|
| **레이어 패널** | 드래그 재정렬 | HTML5 Drag & Drop으로 레이어 순서 변경 |
| **레이어 패널** | Shift+멀티 선택 | `onMultiSelect` 콜백, 다중 요소 시각적 선택 |
| **자유 배치** | Freeform 드래그 | 라벨 드래그 → 요소 absolute positioning, top/left 이동 |
| **자유 배치** | 리페어런트 모드 | Shift+드래그 시 DOM 트리 내 부모 변경 |
| **스마트 가이드** | 정렬 스냅 | 6px 임계값 엣지/센터 스냅, Cyan 가이드라인 오버레이 |
| **복사/붙여넣기** | Ctrl+C/V | outerHTML 기반 클립보드, iframe doc에 요소 복제 |
| **그룹** | Ctrl+G / Ctrl+Shift+G | `wingstar-group` 컨테이너 래핑 / children 추출 |
| **전체 선택** | Ctrl+A | body.children 모두 multiSelectedElements에 할당 |
| **컨텍스트 메뉴** | 우클릭 | 복사/붙여넣기/그룹/삭제/정렬 14개 메뉴 |
| **프로젝트 저장** | Ctrl+S | `<!-- wingstar-page: Name -->` HTML 주석 기반 저장 |
| **프로젝트 열기** | Ctrl+O | HTML 주석 파싱 → 페이지 복원 |
| **단축키 도움말** | `?` 버튼 | 모달 테이블, 16개 단축키 표시 |
| **디자인/라이브** | Ctrl+D | Design ↔ Live 모드 전환 |

### 변경된 파일 (총 10개)

```
src/renderer/index.ts          (577→968 lines, +391)
src/renderer/index.css          (1303→1409 lines, +106)
src/renderer/index.html         (402→432 lines, +30)
src/renderer/editor/canvas.ts   (534→567 lines, +33)
src/renderer/editor/layer-panel.ts (175→195 lines, +20)
src/renderer/editor/smart-guide.ts   (신규, 143 lines)
src/renderer/editor/context-menu.ts  (신규, 118 lines)
_AGENTS_BRAIN_/sessions/s2/    (신규, 3 files)
_AGENTS_BRAIN_/important-docs/ (신규, 2 files)
```

### 커밋 로그

```
17f4c89  feat: 단축키 도움말 모달 + Ctrl+D 토글
1fbf442  feat: HTML-only 프로젝트 저장/열기
8c98c36  feat: 컨텍스트 메뉴 (우클릭)
cc50621  feat: 그룹/언그룹 + Ctrl+A 전체 선택
63f0afd  feat: Ctrl+C/V 복사/붙여넣기
13a92b4  feat: 스마트 가이드 + Freeform 드래그
35a2794  feat: 레이어 패널 드래그 재정렬 + 멀티 선택
b9321d3  docs: 세션 문서 저장
```

### 빌드 결과
- 19 modules transpiled
- 21.43 KB CSS, 93.97 KB JS
- 빌드 에러 없음

### 다음에 할 수 있는 것
- 컨텍스트 메뉴에 이미지 업로드, 배경색 등 추가
- 드로잉 도구로 그린 SVG에 속성 편집 (properties 패널 연동)
- 스마트 가이드에 margin/padding 가이드 추가
- 고급 내보내기 (HTML + CSS 분리)
