# WingStar Web Builder - Walkthrough

This document summarizes the changes made to recover the WYSIWYG editor interactivity and implement the draggable split panel resizers.

## Changes Made

### 1. WYSIWYG Interactivity Recovery
- **File**: [index.css](file:///d:/wingstar/src/renderer/index.css)
- **Detail**: Removed `pointer-events: none` on `#editor-frame` and its `.live-mode` overrides. Clicks, double-clicks, and drag events are now properly routed to the iframe's DOM elements in Design Mode.

### 2. Layout Resizer Handlers
- **File**: [index.html](file:///d:/wingstar/src/renderer/index.html)
- **Detail**: Added three `<div class="panel-resizer">` separators in the `.main-container` representing drag targets between the panels:
  - `#resizer-left`: Between Left Sidebar & Code Editor
  - `#resizer-center`: Between Code Editor & Visual Canvas Workspace
  - `#resizer-right`: Between Visual Canvas Workspace & Right Property Inspector

### 3. Cosmic Styling & Transitions
- **File**: [index.css](file:///d:/wingstar/src/renderer/index.css)
- **Detail**:
  - Styled `.panel-resizer` with a cosmic border-color background. Hovering or active drag actions glow with a purple border gradient transition (`var(--primary)`).
  - Used absolute pseudo-elements (`::after`) to broaden the invisible grabbing hitbox (to 12px width) while keeping the visual divider thin (4px).
  - Added CSS rule to hide `#resizer-center` when `#code-editor-panel` has the `.hidden` class.
  - Formulated `.main-container.resizing` overrides to disable transitions temporarily for performance and set `pointer-events: none` on the iframe so drag events do not lag when crossing the iframe boundaries.

### 4. Interactive Drag Logic
- **File**: [index.ts](file:///d:/wingstar/src/renderer/index.ts)
- **Detail**:
  - Implemented `initPanelResizers()` inside the `DOMContentLoaded` callback.
  - Wired `mousedown` listener to dynamically capture the panel size and calculate dx changes on `mousemove`, then unbind on `mouseup`.
  - Configured strict min/max width constraints to protect layouts:
    - Left Sidebar: Min 180px, Max 450px
    - Code Editor Panel: Min 200px
    - Right Property Inspector Sidebar: Min 240px, Max 500px
  - Synchronized canvas selection overlays using `canvasManager.updateOverlayPosition()` inside drag frames.

---

## Verification & Testing

### 1. Build Compilation
- Executed `npm run build` successfully without TypeScript or Vite bundler failures.

### 2. Manual Test Guidance
1. **WYSIWYG Restored**: Click elements on the canvas inside the iframe in Design Mode; you will see the dotted outline select them again and the inspector load attributes. Double-click text blocks to edit them inline.
2. **Dragging Panels**:
   - Hover on the border between panels; the mouse cursor will change to `col-resize` and the divider line will glow purple.
   - Drag left or right. The panels resize smoothly.
   - Drag to the minimum constraint limits. Verify the sidebar stops compressing.
3. **Toggle Panel**: Click the "Toggle Split Code View" button on the toolbar. Verify the code editor closes, the center resizer disappears automatically, and the remaining canvas expands. Re-toggle to see the resizer return in place.
