# WYSIWYG Recovery & Panel Drag Resizing

This plan outlines the steps to recover the WYSIWYG editor selection/drag functionality and implement responsive draggable resizers for the editor panels.

## Proposed Changes

### 1. Style & Layout Enhancements

#### [MODIFY] [index.css](file:///d:/wingstar/src/renderer/index.css)
- **WYSIWYG Fix**: Remove `pointer-events: none` from `#editor-frame` and related `.live-mode` overrides so mouse clicks are received inside the iframe.
- **Panel Resizers**:
  - Add styles for `.panel-resizer` elements (separators) that sit between panels.
  - Visual: Give them a sleek cosmic dark look (subtle border/background) which highlights with a glowing purple transition (`var(--primary)`) on hover or during drag.
  - Interactive: Set cursor to `col-resize` (or `ew-resize`). Include a wider pseudo-element hit-area (e.g., 6px) to make grabbing easy without bloating the visual line (2px).
  - Add a temporary class (e.g. `.resizing`) to the `.main-container` or panels during drag to disable `transition` effects, ensuring smooth real-time rendering.

#### [MODIFY] [index.html](file:///d:/wingstar/src/renderer/index.html)
- Insert resizer handles (`<div class="panel-resizer" id="...">`) between panels in the `.main-container`:
  1. Between `.left-sidebar` and `#code-editor-panel`
  2. Between `#code-editor-panel` and `.workspace-root`
  3. Between `.workspace-root` and `.right-sidebar`

### 2. Frontend Interactivity

#### [MODIFY] [index.ts](file:///d:/wingstar/src/renderer/index.ts)
- Implement `initPanelResizers()` to manage panel resizing:
  - Add mouse event listeners (`mousedown`, `mousemove`, `mouseup`) to tracking handles.
  - Track active handle dragging states.
  - Update widths of `.left-sidebar`, `#code-editor-panel`, and `.right-sidebar` dynamically based on pixel deltas.
  - Apply minimum size constraints to prevent UI breaking:
    - Left Sidebar: Min 180px, Max 450px
    - Code Editor Panel: Min 200px (when visible)
    - Center Workspace: Min 300px
    - Right Sidebar: Min 240px, Max 500px
  - Synchronize canvas overlay bounds on resizing.
  - Ensure correct handling when Code Editor is toggled hidden/visible.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure TypeScript compilation succeeds.

### Manual Verification
- **WYSIWYG Editor Recovery**:
  - Verify double-clicking on elements works to edit text.
  - Verify selecting elements shows the dotted selection overlay and details in the properties panel.
- **Draggable Panels**:
  - Drag the left separator. Verify the Left Sidebar resizes smoothly and cursor reflects resize state.
  - Drag the center separator. Verify the Monaco HTML Code Editor resizes smoothly.
  - Drag the right separator. Verify the Right Property Inspector resizes.
  - Check constraints: sidebar cannot be compressed below its minimum width.
  - Toggle code editor visibility using the split button. Verify layout transitions correctly and resizers function as expected when toggled.
