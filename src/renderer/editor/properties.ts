export class PropertiesManager {
  private panelPlaceholder: HTMLElement;
  private controlsContainer: HTMLElement;
  private selectedElement: HTMLElement | null = null;
  private onStyleChangedCallback: (() => void) | null = null;

  // Control elements
  private tagBadge: HTMLElement;
  private idBadge: HTMLElement;
  private widthInput: HTMLInputElement;
  private heightInput: HTMLInputElement;
  private marginInput: HTMLInputElement;
  private paddingInput: HTMLInputElement;
  private bgColorInput: HTMLInputElement;
  private bgColorPicker: HTMLInputElement;
  private textColorInput: HTMLInputElement;
  private textColorPicker: HTMLInputElement;
  private borderRadiusInput: HTMLInputElement;
  private displaySelect: HTMLSelectElement;
  private fontSizeInput: HTMLInputElement;
  private fontWeightSelect: HTMLSelectElement;
  private contentTextarea: HTMLTextAreaElement;

  // Vector mapping controls
  private vectorGroup: HTMLElement;
  private vectorLayerIdText: HTMLElement;
  private convertBtn: HTMLElement;
  private convertLink: HTMLElement;
  private convertDiv: HTMLElement;
  private clickActionTextarea: HTMLTextAreaElement;
  private applyActionBtn: HTMLElement;

  // SVG attribute controls
  private svgGroup: HTMLElement;
  private svgFillInput: HTMLInputElement;
  private svgFillPicker: HTMLInputElement;
  private svgStrokeInput: HTMLInputElement;
  private svgStrokePicker: HTMLInputElement;
  private svgStrokeWidthInput: HTMLInputElement;
  private svgOpacityInput: HTMLInputElement;

  constructor() {
    this.panelPlaceholder = document.getElementById('inspector-no-selection') as HTMLElement;
    this.controlsContainer = document.getElementById('inspector-controls') as HTMLElement;

    // Cache elements
    this.tagBadge = document.getElementById('info-tag-name') as HTMLElement;
    this.idBadge = document.getElementById('info-tag-id') as HTMLElement;
    this.widthInput = document.getElementById('prop-width') as HTMLInputElement;
    this.heightInput = document.getElementById('prop-height') as HTMLInputElement;
    this.marginInput = document.getElementById('prop-margin') as HTMLInputElement;
    this.paddingInput = document.getElementById('prop-padding') as HTMLInputElement;
    this.bgColorInput = document.getElementById('prop-bg-color') as HTMLInputElement;
    this.bgColorPicker = document.getElementById('prop-bg-color-picker') as HTMLInputElement;
    this.textColorInput = document.getElementById('prop-text-color') as HTMLInputElement;
    this.textColorPicker = document.getElementById('prop-text-color-picker') as HTMLInputElement;
    this.borderRadiusInput = document.getElementById('prop-border-radius') as HTMLInputElement;
    this.displaySelect = document.getElementById('prop-display') as HTMLSelectElement;
    this.fontSizeInput = document.getElementById('prop-font-size') as HTMLInputElement;
    this.fontWeightSelect = document.getElementById('prop-font-weight') as HTMLSelectElement;
    this.contentTextarea = document.getElementById('prop-content') as HTMLTextAreaElement;

    // Vector Map
    this.vectorGroup = document.getElementById('group-vector-map') as HTMLElement;
    this.vectorLayerIdText = document.getElementById('vector-layer-id') as HTMLElement;
    this.convertBtn = document.getElementById('btn-convert-btn') as HTMLElement;
    this.convertLink = document.getElementById('btn-convert-link') as HTMLElement;
    this.convertDiv = document.getElementById('btn-convert-div') as HTMLElement;
    this.clickActionTextarea = document.getElementById('vector-click-action') as HTMLTextAreaElement;
    this.applyActionBtn = document.getElementById('btn-apply-action') as HTMLElement;

    // SVG Attributes
    this.svgGroup = document.getElementById('group-svg-properties') as HTMLElement;
    this.svgFillInput = document.getElementById('prop-svg-fill') as HTMLInputElement;
    this.svgFillPicker = document.getElementById('prop-svg-fill-picker') as HTMLInputElement;
    this.svgStrokeInput = document.getElementById('prop-svg-stroke') as HTMLInputElement;
    this.svgStrokePicker = document.getElementById('prop-svg-stroke-picker') as HTMLInputElement;
    this.svgStrokeWidthInput = document.getElementById('prop-svg-stroke-width') as HTMLInputElement;
    this.svgOpacityInput = document.getElementById('prop-svg-opacity') as HTMLInputElement;

    this.setupListeners();
  }

  public bindElement(el: HTMLElement | null) {
    this.selectedElement = el;

    if (!el) {
      this.panelPlaceholder.classList.remove('hidden');
      this.controlsContainer.classList.add('hidden');
      return;
    }

    this.panelPlaceholder.classList.add('hidden');
    this.controlsContainer.classList.remove('hidden');

    // Display basic info
    this.tagBadge.textContent = el.tagName;
    this.idBadge.textContent = el.id ? `#${el.id}` : '(no id)';

    // Check if it's an SVG path/shape/group OR an element carrying a vector id
    const isVectorElement = el.closest('svg') !== null || el.tagName.toLowerCase() === 'path' || el.tagName.toLowerCase() === 'g';
    const vectorId = el.getAttribute('id') || el.getAttribute('data-name');
    
    if (isVectorElement && vectorId) {
      this.vectorGroup.classList.remove('hidden');
      this.vectorLayerIdText.textContent = vectorId;
      this.clickActionTextarea.value = el.getAttribute('onclick') || '';
    } else {
      this.vectorGroup.classList.add('hidden');
    }

    // SVG Shape detection — show SVG attribute controls
    const svgShapeTags = ['path', 'polygon', 'polyline', 'circle', 'ellipse', 'rect', 'line', 'g', 'svg'];
    const isSvgShape = svgShapeTags.includes(el.tagName.toLowerCase());
    if (isSvgShape) {
      this.svgGroup.classList.remove('hidden');
      const fillVal = el.getAttribute('fill') || '';
      const strokeVal = el.getAttribute('stroke') || '';
      const strokeWidthVal = el.getAttribute('stroke-width') || '1';
      const opacityVal = el.getAttribute('opacity') || '1';

      this.svgFillInput.value = fillVal;
      this.svgStrokeInput.value = strokeVal;
      this.svgStrokeWidthInput.value = strokeWidthVal;
      this.svgOpacityInput.value = opacityVal;

      // Convert color string to hex for color pickers
      this.svgFillPicker.value = this.colorToHex(fillVal) || '#ffffff';
      this.svgStrokePicker.value = this.colorToHex(strokeVal) || '#000000';
    } else {
      this.svgGroup.classList.add('hidden');
    }

    // Read styles (use computed style for defaults, inline style for edits)
    const computed = window.getComputedStyle(el);
    this.widthInput.value = el.style.width || computed.width;
    this.heightInput.value = el.style.height || computed.height;
    this.marginInput.value = el.style.margin || computed.margin;
    this.paddingInput.value = el.style.padding || computed.padding;
    this.borderRadiusInput.value = el.style.borderRadius || computed.borderRadius;
    this.displaySelect.value = el.style.display || computed.display || 'block';
    
    this.fontSizeInput.value = el.style.fontSize || computed.fontSize;
    this.fontWeightSelect.value = el.style.fontWeight || computed.fontWeight || '400';

    // Color conversion (RGB to HEX helper for color picker inputs)
    const bgVal = computed.backgroundColor;
    this.bgColorInput.value = el.style.backgroundColor || bgVal;
    if (bgVal && bgVal !== 'rgba(0, 0, 0, 0)' && bgVal !== 'transparent') {
      this.bgColorPicker.value = this.colorToHex(bgVal) || '#ffffff';
    } else {
      this.bgColorPicker.value = '#ffffff';
    }

    const textVal = computed.color;
    this.textColorInput.value = el.style.color || textVal;
    this.textColorPicker.value = textVal ? (this.colorToHex(textVal) || '#000000') : '#000000';

    // Alignment buttons state
    const alignVal = el.style.textAlign || computed.textAlign;
    const alignButtons = this.controlsContainer.querySelectorAll('.btn-toggle[data-align]');
    alignButtons.forEach(btn => {
      if (btn.getAttribute('data-align') === alignVal) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Content Textarea (inner HTML/text)
    this.contentTextarea.value = el.innerHTML.trim();
  }

  public onStyleChanged(callback: () => void) {
    this.onStyleChangedCallback = callback;
  }

  /**
   * Converts various color formats (rgb(), rgba(), named colors, hex) to hex string.
   */
  private colorToHex(color: string): string | null {
    if (!color || color === 'none' || color === 'transparent') return null;
    // Already hex
    if (color.startsWith('#')) return color.length === 4
      ? '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      : color;
    // rgb() or rgba()
    const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return null;
  }

  private setupListeners() {
    const applyStyle = (property: string, value: string) => {
      if (!this.selectedElement) return;
      // @ts-ignore
      this.selectedElement.style[property] = value;
      this.triggerChange();
    };

    const applySvgAttr = (attr: string, value: string) => {
      if (!this.selectedElement) return;
      if (value && value !== 'none' && value !== '') {
        this.selectedElement.setAttribute(attr, value);
      } else {
        this.selectedElement.removeAttribute(attr);
      }
      this.triggerChange();
    };

    // Text inputs mapping
    this.widthInput.addEventListener('input', () => applyStyle('width', this.widthInput.value));
    this.heightInput.addEventListener('input', () => applyStyle('height', this.heightInput.value));
    this.marginInput.addEventListener('input', () => applyStyle('margin', this.marginInput.value));
    this.paddingInput.addEventListener('input', () => applyStyle('padding', this.paddingInput.value));
    this.borderRadiusInput.addEventListener('input', () => applyStyle('borderRadius', this.borderRadiusInput.value));
    this.fontSizeInput.addEventListener('input', () => applyStyle('fontSize', this.fontSizeInput.value));
    
    this.displaySelect.addEventListener('change', () => applyStyle('display', this.displaySelect.value));
    this.fontWeightSelect.addEventListener('change', () => applyStyle('fontWeight', this.fontWeightSelect.value));

    // Colors colorpicker link with text inputs
    this.bgColorInput.addEventListener('input', () => {
      applyStyle('backgroundColor', this.bgColorInput.value);
    });
    this.bgColorPicker.addEventListener('input', () => {
      this.bgColorInput.value = this.bgColorPicker.value;
      applyStyle('backgroundColor', this.bgColorPicker.value);
    });

    this.textColorInput.addEventListener('input', () => {
      applyStyle('color', this.textColorInput.value);
    });
    this.textColorPicker.addEventListener('input', () => {
      this.textColorInput.value = this.textColorPicker.value;
      applyStyle('color', this.textColorPicker.value);
    });

    // Text Alignment toggles
    const alignButtons = this.controlsContainer.querySelectorAll('.btn-toggle[data-align]');
    alignButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        alignButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const align = btn.getAttribute('data-align') || 'left';
        applyStyle('textAlign', align);
      });
    });

    // HTML Content textarea
    this.contentTextarea.addEventListener('input', () => {
      if (!this.selectedElement) return;
      this.selectedElement.innerHTML = this.contentTextarea.value;
      this.triggerChange();
    });

    // SVG Attribute Listeners
    this.svgFillInput.addEventListener('input', () => {
      this.svgFillPicker.value = this.colorToHex(this.svgFillInput.value) || '#ffffff';
      applySvgAttr('fill', this.svgFillInput.value);
    });
    this.svgFillPicker.addEventListener('input', () => {
      this.svgFillInput.value = this.svgFillPicker.value;
      applySvgAttr('fill', this.svgFillPicker.value);
    });

    this.svgStrokeInput.addEventListener('input', () => {
      this.svgStrokePicker.value = this.colorToHex(this.svgStrokeInput.value) || '#000000';
      applySvgAttr('stroke', this.svgStrokeInput.value);
    });
    this.svgStrokePicker.addEventListener('input', () => {
      this.svgStrokeInput.value = this.svgStrokePicker.value;
      applySvgAttr('stroke', this.svgStrokePicker.value);
    });

    this.svgStrokeWidthInput.addEventListener('input', () => {
      applySvgAttr('stroke-width', this.svgStrokeWidthInput.value);
    });

    this.svgOpacityInput.addEventListener('input', () => {
      applySvgAttr('opacity', this.svgOpacityInput.value);
    });

    // Vector Entity Conversions
    this.convertBtn.addEventListener('click', () => this.convertVector('button'));
    this.convertLink.addEventListener('click', () => this.convertVector('a'));
    this.convertDiv.addEventListener('click', () => this.convertVector('div'));

    // Apply inline actions scripts
    this.applyActionBtn.addEventListener('click', () => {
      if (!this.selectedElement) return;
      const scriptCode = this.clickActionTextarea.value.trim();
      if (scriptCode) {
        this.selectedElement.setAttribute('onclick', scriptCode);
      } else {
        this.selectedElement.removeAttribute('onclick');
      }
      this.triggerChange();
    });
  }

  private convertVector(tag: 'button' | 'a' | 'div') {
    if (!this.selectedElement) return;

    const parentSvg = this.selectedElement.closest('svg');
    if (!parentSvg) return;

    const viewBox = parentSvg.getAttribute('viewBox') || `0 0 ${parentSvg.clientWidth || 100} ${parentSvg.clientHeight || 100}`;
    const innerVectorMarkup = this.selectedElement.outerHTML;
    const elementId = this.selectedElement.id || this.selectedElement.getAttribute('data-name') || 'vector-component';

    // Build independent, responsive SVG inline wrapper
    const standaloneSvg = `
<svg viewBox="${viewBox}" width="32" height="32" style="display: inline-block; vertical-align: middle;">
  ${innerVectorMarkup}
</svg>`;

    let htmlReplacement = '';
    
    if (tag === 'button') {
      htmlReplacement = `<button id="${elementId}" class="btn btn-primary" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border: none; cursor: pointer; border-radius: 6px;">
  ${standaloneSvg}
  <span>Vector Action</span>
</button>`;
    } else if (tag === 'a') {
      htmlReplacement = `<a id="${elementId}" href="#" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; color: var(--primary);">
  ${standaloneSvg}
  <span>Vector Link</span>
</a>`;
    } else {
      htmlReplacement = `<div id="${elementId}" class="info-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center;">
  ${standaloneSvg}
  <h3>Vector Card</h3>
</div>`;
    }

    // Replace SVG element with new HTML tag in the iframe DOM
    const doc = this.selectedElement.ownerDocument;
    const tempDiv = doc.createElement('div');
    tempDiv.innerHTML = htmlReplacement.trim();
    const replacementNode = tempDiv.firstChild as HTMLElement;

    // Apply the replacement
    this.selectedElement.replaceWith(replacementNode);

    // Auto-select the newly created HTML component
    this.bindElement(replacementNode);
    this.triggerChange();
  }

  private triggerChange() {
    if (this.onStyleChangedCallback) {
      this.onStyleChangedCallback();
    }
  }
}
