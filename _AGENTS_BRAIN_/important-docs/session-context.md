# WingStar Session 2 — 개발 문맥

## 브랜치
`feat/figma-like-designer` (based on `main@8ed2cc7`)

## 현재 상태 요약
WingStar Web Builder → Figma/Illustrator 대용 하이브리드 툴

## 완료된 Phase
| Phase | 기능 | 커밋 |
|-------|------|------|
| A | 드로잉 도구 (선택/사각형/원/선) | b64667e |
| B | 레이어 패널 고도화 (전체 DOM 트리, vis/lock, 선택 연동) | 3455af6 |
| C | Undo/Redo 시스템 (50단계, Ctrl+Z/Y) | e5f9bbe |
| D | 정렬 도구 (좌/중/우/상/중앙/하, 툴바 버튼) | 8c28948 |
| E | 캔버스 줌 (Ctrl+휠, +/-/리셋, 25%~400%) | 4111cb1 |
| F | 단축키 (Ctrl+Z/Y, Delete 요소 삭제) | e5f9bbe |

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

## 핵심 원칙
1. **모든 포맷 = HTML** — 저장/내보내기/임포트 HTML-only, JSON/이진 금지
2. **문서는 세션 폴더** (`_AGENTS_BRAIN_/sessions/s2/`)
3. **중요 문서** → `_AGENTS_BRAIN_/important-docs/`에도 복사
4. **브랜치 개발, 머지는 명시적 명령 시에만**
5. HTML WYSIWYG 편집기이되 피그마/일러스트레이터로도 사용 가능하게

## 최근 구현 (feat/figma-like-designer 브랜치)
| 기능 | 커밋 |
|------|------|
| 레이어 패널 드래그 재정렬 + Shift 멀티 선택 | 35a2794 |
| 스마트 가이드 (Freeform absolute 드래그, Shift+드래그 리페어런트, Cyan 정렬 가이드라인) | 13a92b4 |
| Ctrl+C/V 복사/붙여넣기 | 63f0afd |
| 그룹/언그룹 (Ctrl+G, Ctrl+Shift+G) | cc50621 |
| Ctrl+A 전체 선택 | cc50621 |
| 컨텍스트 메뉴 (우클릭) | 8c98c36 |
| HTML-only 프로젝트 저장/열기 (Ctrl+S, Ctrl+O) | 1fbf442 |
| 단축키 도움말 모달 + Ctrl+D 토글 | 17f4c89 |

## 브랜치
`feat/figma-like-designer` — 머지 대기 중. 명령 시 `main`으로 머지 가능.

## 최종 빌드
- 19 modules transpiled
- 21.43 KB CSS, 93.97 KB JS
