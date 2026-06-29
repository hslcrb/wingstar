export interface AssetItem {
  id: string;
  name: string;
  dataUrl: string;
  type: string;
}

let assets: AssetItem[] = [];
let assetIdCounter = 0;

const STORAGE_KEY = 'wingstar-assets';

function loadAssets(): AssetItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAssets() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch { }
}

export function getAssets(): AssetItem[] {
  return assets;
}

export function addAssets(newAssets: { name: string; dataUrl: string; type: string }[]) {
  for (const a of newAssets) {
    assets.push({ ...a, id: `asset-${Date.now()}-${assetIdCounter++}` });
  }
  saveAssets();
  renderAssetGrid();
}

export function deleteAsset(id: string) {
  assets = assets.filter(a => a.id !== id);
  saveAssets();
  renderAssetGrid();
}

export function initAssets() {
  assets = loadAssets();
  renderAssetGrid();

  document.getElementById('btn-import-image')?.addEventListener('click', async () => {
    try {
      const result = await (window as any).electronAPI.openImage();
      if (result && result.length > 0) {
        addAssets(result);
      }
    } catch (err: any) {
      console.error('Image import failed:', err);
    }
  });

  const dropZone = document.getElementById('assets-grid') as HTMLElement;
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const newAssets: { name: string; dataUrl: string; type: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const reader = new FileReader();
        reader.onload = () => {
          newAssets.push({ name: file.name, dataUrl: reader.result as string, type: file.type });
          if (i === files.length - 1) addAssets(newAssets);
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function renderAssetGrid() {
  const grid = document.getElementById('assets-grid') as HTMLElement;
  const count = document.getElementById('asset-count') as HTMLElement;
  if (!grid) return;
  if (count) count.textContent = String(assets.length);

  if (assets.length === 0) {
    grid.innerHTML = '<div class="asset-empty">이미지를 드래그하거나 가져오기 버튼을 클릭하세요</div>';
    return;
  }

  grid.innerHTML = '';
  for (const asset of assets) {
    const item = document.createElement('div');
    item.className = 'asset-item';
    item.draggable = true;
    item.setAttribute('data-asset-id', asset.id);
    item.innerHTML = `
      <img src="${asset.dataUrl}" alt="${asset.name}" class="asset-thumb" draggable="false">
      <span class="asset-name">${asset.name}</span>
      <button class="asset-delete-btn" data-asset-id="${asset.id}">&times;</button>
    `;
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/asset-id', asset.id);
      e.dataTransfer?.setData('text/asset-url', asset.dataUrl);
      e.dataTransfer!.effectAllowed = 'copy';
    });
    item.querySelector('.asset-delete-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAsset(asset.id);
    });
    grid.appendChild(item);
  }
}
