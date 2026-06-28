const STORAGE_KEY = 'wingstar-style-presets';

interface StylePreset {
  name: string;
  styles: { [prop: string]: string };
}

export function loadPresets(): StylePreset[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function savePresets(list: StylePreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function savePreset(name: string, el: HTMLElement): StylePreset {
  const styles: { [prop: string]: string } = {};
  const computed = getComputedStyle(el);
  const props = [
    'color', 'background-color', 'background', 'font-size', 'font-weight',
    'font-family', 'text-align', 'border-radius', 'opacity',
    'display', 'width', 'height', 'margin', 'padding',
    'border', 'box-shadow', 'text-shadow', 'transform',
    'justify-content', 'align-items', 'gap', 'flex-direction',
    'overflow', 'cursor'
  ];
  for (const prop of props) {
    const val = el.style[prop as any] || computed.getPropertyValue(prop);
    if (val && val !== 'none' && val !== 'normal' && val !== '0px' && val !== 'auto') {
      styles[prop] = val;
    }
  }
  const list = loadPresets();
  const existing = list.findIndex(p => p.name === name);
  const preset: StylePreset = { name, styles };
  if (existing >= 0) list[existing] = preset;
  else list.push(preset);
  savePresets(list);
  return preset;
}

export function deletePreset(name: string) {
  const list = loadPresets().filter(p => p.name !== name);
  savePresets(list);
}

export function applyPreset(name: string, el: HTMLElement) {
  const list = loadPresets();
  const preset = list.find(p => p.name === name);
  if (!preset) return;
  for (const [prop, val] of Object.entries(preset.styles)) {
    (el.style as any)[prop] = val;
  }
}

export function renderPresetList(container: HTMLElement, onApply: (name: string) => void, onDelete: (name: string) => void) {
  const presets = loadPresets();
  container.innerHTML = presets.length === 0
    ? '<div class="preset-item" style="cursor:default;color:var(--text-muted);font-size:0.75rem;justify-content:center;">저장된 프리셋이 없습니다</div>'
    : presets.map(p => `
      <div class="preset-item" data-preset="${p.name}">
        <span class="preset-name">${p.name}</span>
        <button class="preset-delete-btn" data-preset-del="${p.name}">&times;</button>
      </div>
    `).join('');

  container.querySelectorAll('.preset-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.preset-delete-btn')) return;
      const name = (el as HTMLElement).getAttribute('data-preset');
      if (name) onApply(name);
    });
  });
  container.querySelectorAll('.preset-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = (btn as HTMLElement).getAttribute('data-preset-del');
      if (name) onDelete(name);
    });
  });
}
