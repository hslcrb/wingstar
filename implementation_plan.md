# WingStar → Figma급 디자인 툴 로드맵

## 목표
WingStar를 HTML WYSIWYG 편집기를 넘어, 피그마/일러스트레이터 대용으로 사용 가능한
**하이브리드 디자인 & 코드 툴**로 진화시킨다.

## 단계별 로드맵

### Phase A: 캔버스 드로잉 & 자유 배치 모드
- 선택/이동 도구 + 도형 생성 도구 (사각형, 원, 선)
- Design 모드 내에 "Flow" ↔ "Freeform" 하위 모드
- Freeform 모드: absolute positioning, 드래그로 자유 배치
- 도형 생성 시 SVG 엘리먼트로 캔버스에 추가

### Phase B: 레이어 패널
- 현재 Vectors 탭을 범용 레이어 패널로 업그레이드
- 모든 DOM 요소를 트리로 표시, 드래그 재정렬
- 보이기/숨기기, 잠금, Z-index 컨트롤
- 더블클릭으로 이름 편집

### Phase C: Undo/Redo 시스템
- UndoManager 클래스: HTML 스냅샷 기반
- Ctrl+Z / Ctrl+Y 단축키
- 최대 50단계 히스토리

### Phase D: 정렬 & 분배 도구
- 상단/중앙/하단/좌측/우측 정렬
- 수평/수직 분배
- 캔버스 중앙 정렬 버튼

### Phase E: 캔버스 줌 & 팬
- Ctrl+마우스휠 줌 인/아웃
- Space+드래그 팬
- 줌 레벨 표시 & 리셋 버튼
- 디바이스 프리셋 (데스크탑/태블릿/모바일)

### Phase F: 단축키 시스템
- Delete: 선택 요소 삭제
- Ctrl+C/V: 복사/붙여넣기
- Ctrl+D: Design/Live 토글
- Ctrl+S: 저장 내보내기

### Phase G: 프로젝트 파일 (.wingstar)
- JSON 기반 프로젝트 파일 포맷
- 페이지 + CSS + 에셋 참조 저장
- 저장/열기 IPC 핸들러

---

## 현재 Phase: A — 캔버스 드로잉 & 자유 배치 모드
