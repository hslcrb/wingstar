# WingStar Session 3 — 개발 문맥

## 브랜치
`main` (세션 2 feat/figma-like-designer 머지 완료)

## 현재 상태 요약
WingStar Web Builder → Figma/Illustrator 대용 하이브리드 툴
세션 2에서 레이어 재정렬, 스마트 가이드, 복사/붙여넣기, 그룹, 컨텍스트 메뉴, 프로젝트 저장/열기, CSS 클래스 관리자, 컴포넌트 라이브러리, 룰러 가이드, 스타일 프리셋, 링크 편집기 구현 완료.

## 완료된 Phase
| Phase | 기능 | 세션 |
|-------|------|------|
| A | 드로잉 도구 (선택/사각형/원/선) | s1 |
| B | 레이어 패널 고도화 (전체 DOM 트리, vis/lock, 선택 연동) | s1 |
| C | Undo/Redo 시스템 (50단계, Ctrl+Z/Y) | s1 |
| D | 정렬 도구 (좌/중/우/상/중앙/하, 툴바 버튼) | s1 |
| E | 캔버스 줌 (Ctrl+휠, +/-/리셋, 25%~400%) | s1 |
| F | 단축키 (Ctrl+Z/Y, Delete 요소 삭제) | s1 |
| G | 레이어 드래그 재정렬 + 멀티 선택 | s2 |
| H | 스마트 가이드 + Freeform 드래그 + 리페어런트 | s2 |
| I | 복사/붙여넣기 (Ctrl+C/V) | s2 |
| J | 그룹/언그룹 (Ctrl+G, Ctrl+Shift+G) | s2 |
| K | 컨텍스트 메뉴 (우클릭) | s2 |
| L | HTML-only 프로젝트 저장/열기 | s2 |
| M | 단축키 도움말 모달 | s2 |
| N | CSS 클래스 관리자 | s2 |
| O | 컴포넌트 라이브러리 | s2 |
| P | 룰러 가이드 | s2 |
| Q | 스타일 프리셋 | s2 |
| R | 링크/URL 편집기 | s2 |

## 핵심 아키텍처
- **index.ts** (main orchestrator): 초기화, 동기화, 이벤트 바인딩, 페이지 관리, zoom
- **canvas.ts** (CanvasManager): iframe WYSIWYG + 선택 오버레이 + 드래그 리사이즈 + drawMode
- **drawing-tool.ts** (DrawingToolManager): SVG 드로잉 도구 (rect/ellipse/line 실시간 프리뷰)
- **layer-panel.ts** (LayerPanel): 범용 DOM 레이어 패널
- **undo-manager.ts** (UndoManager): HTML 스냅샷 기반 50단계
- **alignment.ts**: 정렬 유틸 6방향
- **properties.ts**: 속성 검사기 (스타일/SVG 속성/벡터 매핑/액션)
- **code-editor.ts**: Monaco Editor 래퍼
- **vector-compiler.ts**: SVG/EPS → pure HTML
- **eps-parser.ts**: EPS PostScript 파서
- **svg-parser.ts**: SVG → VectorNode 트리
- **panel-resizer.ts**: 3개 패널 드래그 리사이저
- **smart-guide.ts**: 스마트 가이드라인
- **context-menu.ts**: 우클릭 컨텍스트 메뉴
- **class-manager.ts**: CSS 클래스 관리자
- **component-library.ts**: 컴포넌트 라이브러리
- **ruler-guide.ts**: 룰러 가이드
- **style-preset.ts**: 스타일 프리셋
- **templates.ts**: 템플릿

## 핵심 원칙
1. **모든 포맷 = HTML** — 저장/내보내기/임포트 HTML-only, JSON/이진 금지
2. **문서는 세션 폴더** (`_AGENTS_BRAIN_/sessions/s3/`)
3. **중요 문서** → `_AGENTS_BRAIN_/important-docs/`에도 복사
4. **main 브랜치에서 직접 개발** (세션 2 머지 완료)
5. HTML WYSIWYG 편집기이되 피그마/일러스트레이터로도 사용 가능하게
