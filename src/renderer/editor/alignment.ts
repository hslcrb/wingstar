export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export function alignElement(el: HTMLElement, mode: AlignMode) {
  const parent = el.parentElement;
  if (!parent) return;

  const parentRect = parent.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  // If element is SVG (has no style.left/top in the usual sense), skip
  const isSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
  if (isSvg) return;

  const parentW = parentRect.width;
  const parentH = parentRect.height;
  const elW = elRect.width;
  const elH = elRect.height;

  // Ensure position is set for alignment to work
  if (el.style.position !== 'absolute' && el.style.position !== 'fixed') {
    el.style.position = 'relative';
  }

  // Reset any previous alignment margin auto that might interfere
  if (el.style.position === 'absolute') {
    el.style.left = '';
    el.style.right = '';
    el.style.top = '';
    el.style.bottom = '';
  }

  switch (mode) {
    case 'left':
      if (el.style.position === 'absolute') el.style.left = '0px';
      break;
    case 'center':
      if (el.style.position === 'absolute') {
        el.style.left = `${(parentW - elW) / 2}px`;
      } else {
        el.style.margin = '0 auto';
      }
      break;
    case 'right':
      if (el.style.position === 'absolute') {
        el.style.left = `${parentW - elW}px`;
      }
      break;
    case 'top':
      if (el.style.position === 'absolute') el.style.top = '0px';
      break;
    case 'middle':
      if (el.style.position === 'absolute') {
        el.style.top = `${(parentH - elH) / 2}px`;
      }
      break;
    case 'bottom':
      if (el.style.position === 'absolute') {
        el.style.top = `${parentH - elH}px`;
      }
      break;
  }
}