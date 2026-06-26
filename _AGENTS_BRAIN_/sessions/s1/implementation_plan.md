# WingStar Web Builder - Implementation Plan (Phase 2)

We will build upon the existing desktop web builder application to introduce advanced Dreamweaver-style capabilities. 

## Proposed Features & Enhancements

1. **Live Preview Mode Toggle (Live vs. Design View)**
   - Introduce a toolbar toggle to switch between **Design View** (editing enabled, element clicks intercepted for selection and styling, drag-and-drop active) and **Live View** (visual overlay hidden, iframe interactions enabled so links, hover effects, custom scripts, and buttons function natively).
2. **Multi-Page Project Explorer**
   - Enhance the left sidebar's "Pages" tab to allow creating, switching, renaming, and deleting multiple HTML pages in the project.
   - Maintain the page states in-memory, updating Monaco Editor and the visual canvas dynamically on tab change.
   - Update the export system to bundle all pages under the project folder, linking each page to `style.css` correctly.
3. **Advanced Vector Styling in Property Inspector**
   - Provide direct controls in the Inspector for SVG element attributes (`fill`, `stroke`, `stroke-width`). Currently, editing background color or text color does not affect internal SVG path fills.
   - Detect when an SVG shape (`path`, `polygon`, `circle`, etc.) is selected and enable direct color pickers/range controls for SVGs.

---

## Proposed Changes

### 1. Electron Main & Preload IPC Extension

#### [MODIFY] [main.ts](file:///d:/wingstar/src/main/main.ts)
- Extend the `dialog:exportProject` handler to support writing multiple HTML files:
  - Input signature: `{ pages: { [filename: string]: string }, css: string }`
  - Logic: Write `style.css`, and for each page key in `pages` (e.g. `index.html`, `about.html`), inject the `<link rel="stylesheet" href="style.css">` reference if missing, and write the file.

#### [MODIFY] [preload.ts](file:///d:/wingstar/src/main/preload.ts)
- Update TypeScript types and preload API wrapper to pass the multi-page structure in `exportProject`.

---

### 2. Frontend UI Shell

#### [MODIFY] [index.html](file:///d:/wingstar/src/renderer/index.html)
- **Toolbar**: Add a toggle button for Live vs. Design Mode (e.g., `#btn-toggle-live`).
- **Sidebar (Pages Tab)**: Add a header section with a "+" button (`#btn-add-page`) to add pages, and modify `.pages-list` to support a delete button next to pages (excluding `index.html`).
- **Property Inspector**: Add a new `#group-svg-properties` panel containing:
  - Fill color text input + color picker.
  - Stroke color text input + color picker.
  - Stroke width number input.

#### [MODIFY] [index.css](file:///d:/wingstar/src/renderer/index.css)
- Add styling for the page deletion buttons.
- Define a class `.live-mode` on the workspace/wrapper that disables mouse overlays and resets pointer events on the iframe for native testing.
- Style the new SVG properties group.

---

### 3. Editor Core & Sync logic

#### [MODIFY] [canvas.ts](file:///d:/wingstar/src/renderer/editor/canvas.ts)
- Add a property `isLiveMode: boolean = false`.
- Add `setLiveMode(enabled: boolean)`:
  - If `true`, hide the selection overlay, set `pointer-events: auto` on the iframe, and temporarily disable editing event listeners (click, dblclick, drag-and-drop).
  - If `false`, restore Design Mode behavior.
- Ensure that switching page contents clears current iframe load states safely.

#### [MODIFY] [properties.ts](file:///d:/wingstar/src/renderer/editor/properties.ts)
- Add references to the new SVG property inputs.
- Extend `bindElement(el)`:
  - If the element is an SVG path, shape, or group (`path`, `polygon`, `circle`, `rect`, `ellipse`, `line`, `g`), display the SVG Properties group.
  - Load the attributes `fill`, `stroke`, and `stroke-width` from the DOM element.
  - Bind event listeners on input change to invoke `setAttribute(attr, value)` on the selected DOM element, then trigger the change callback to sync with Monaco and update the overlay.

#### [MODIFY] [index.ts](file:///d:/wingstar/src/renderer/index.ts)
- Maintain project pages state:
  ```typescript
  let projectPages: { [filename: string]: string } = {
    'index.html': defaultHTML
  };
  let activePageName = 'index.html';
  ```
- Implement switching pages:
  - On page list item click: save the current Monaco content to `projectPages[activePageName]`, switch `activePageName` to the target, load `projectPages[activePageName]` into Monaco and the Canvas, and rebuild the layers explorer and property selections.
- Implement adding pages:
  - Prompt user for a filename (must end with `.html` or be appended automatically).
  - Copy `defaultHTML` (or a blank starter page) into the pages state.
  - Refresh the sidebar page tree.
- Implement deleting pages (with prompt, ensuring `index.html` cannot be deleted).
- Link `#btn-toggle-live` to toggle between Live and Design modes using `canvasManager.setLiveMode`.
- Update export handlers to pass all `projectPages` and CSS assets.

---

## Verification Plan

### Automated Tests
- Build verification: Run `npm run build` to verify no compilation errors occur.

### Manual Verification
- **Live Mode Toggle**:
  - Activate Live mode. Verify selection border disappears and mouse events pass directly to the iframe (e.g. navigation links work, hover states trigger, and custom click scripts execute).
  - Return to Design mode. Verify clicking elements highlights them and inline double-click editing is re-enabled.
- **Multi-page Management**:
  - Add a page `about.html`, switch to it, write custom heading.
  - Switch back to `index.html`. Confirm original content is intact.
  - Export full project folder. Check if the output folder contains both pages, each referencing `style.css` correctly and working in a browser.
- **SVG Styling**:
  - Import an SVG vector logo.
  - Click on individual path nodes in the Vector layers tree.
  - Edit Fill and Stroke colors in the properties inspector. Confirm they update immediately on the canvas and in the code editor output.
