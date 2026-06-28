export interface ParsedVectorPath {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  id?: string;
}

export interface ParsedVector {
  width: number;
  height: number;
  paths: ParsedVectorPath[];
  title: string;
  rawSvg?: string;
}

interface ParserState {
  ctm: number[];
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  lineCap: number;
  lineJoin: number;
  dashArray: number[];
  dashOffset: number;
}

function createDefaultState(): ParserState {
  return {
    ctm: [1, 0, 0, 1, 0, 0],
    fillColor: '#ffffff',
    strokeColor: 'none',
    strokeWidth: 1,
    lineCap: 0,
    lineJoin: 0,
    dashArray: [],
    dashOffset: 0,
  };
}

function cloneState(s: ParserState): ParserState {
  return {
    ctm: [...s.ctm],
    fillColor: s.fillColor,
    strokeColor: s.strokeColor,
    strokeWidth: s.strokeWidth,
    lineCap: s.lineCap,
    lineJoin: s.lineJoin,
    dashArray: [...s.dashArray],
    dashOffset: s.dashOffset,
  };
}

function applyMatrix(ctm: number[], a: number, b: number, c: number, d: number, e: number, f: number): number[] {
  return [
    ctm[0] * a + ctm[2] * b,
    ctm[1] * a + ctm[3] * b,
    ctm[0] * c + ctm[2] * d,
    ctm[1] * c + ctm[3] * d,
    ctm[0] * e + ctm[2] * f + ctm[4],
    ctm[1] * e + ctm[3] * f + ctm[5],
  ];
}

function transformPoint(ctm: number[], x: number, y: number): [number, number] {
  return [
    ctm[0] * x + ctm[2] * y + ctm[4],
    ctm[1] * x + ctm[3] * y + ctm[5],
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const ri = Math.min(255, Math.max(0, Math.round(r * 255)));
  const gi = Math.min(255, Math.max(0, Math.round(g * 255)));
  const bi = Math.min(255, Math.max(0, Math.round(b * 255)));
  return `#${ri.toString(16).padStart(2, '0')}${gi.toString(16).padStart(2, '0')}${bi.toString(16).padStart(2, '0')}`;
}

export function parseEPS(content: string): ParsedVector {
  const svgStart = content.indexOf('<svg');
  const svgEnd = content.indexOf('</svg>');
  if (svgStart !== -1 && svgEnd !== -1) {
    const rawSvg = content.substring(svgStart, svgEnd + 6);
    let width = 500, height = 500;
    const wm = rawSvg.match(/width=["']([\d.]+)["']/);
    const hm = rawSvg.match(/height=["']([\d.]+)["']/);
    const vm = rawSvg.match(/viewBox=["'][\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)["']/);
    if (wm && hm) { width = parseFloat(wm[1]); height = parseFloat(hm[1]); }
    else if (vm) { width = parseFloat(vm[1]); height = parseFloat(vm[2]); }
    return { width, height, paths: [], title: 'Embedded SVG inside EPS', rawSvg };
  }

  let bbox = [0, 0, 500, 500];
  const bm = content.match(/%%BoundingBox:\s*(-?\d+)\s*(-?\d+)\s*(-?\d+)\s*(-?\d+)/);
  if (bm) bbox = [parseInt(bm[1]), parseInt(bm[2]), parseInt(bm[3]), parseInt(bm[4])];
  else {
    const hm = content.match(/%%HiResBoundingBox:\s*(-?[\d.]+)\s*(-?[\d.]+)\s*(-?[\d.]+)\s*(-?[\d.]+)/);
    if (hm) bbox = [Math.floor(+hm[1]), Math.floor(+hm[2]), Math.ceil(+hm[3]), Math.ceil(+hm[4])];
  }
  const [llx, lly, urx, ury] = bbox;
  const width = urx - llx || 500;
  const height = ury - lly || 500;

  const mapCoords = (x: number, y: number): string => {
    const [tx, ty] = transformPoint(state.ctm, x, y);
    return `${(tx - llx).toFixed(2)},${(ury - ty).toFixed(2)}`;
  };

  const paths: ParsedVectorPath[] = [];
  let currentPathD = '';
  let currentId = '';
  let inPath = false;

  let state = createDefaultState();
  const stateStack: ParserState[] = [];

  function emitPath(fill: string, stroke: string, sw: number) {
    if (!currentPathD) return;
    const op = parseFloat(state.dashOffset.toString()) || 0;
    const dashStr = state.dashArray.length > 0 ? ` stroke-dasharray="${state.dashArray.join(',')}" stroke-dashoffset="${op}"` : '';
    paths.push({
      d: currentPathD.trim(),
      fill,
      stroke,
      strokeWidth: sw,
      opacity: 1,
      id: currentId || undefined,
    });
    currentPathD = '';
    currentId = '';
  }

  const lines = content.split(/\r?\n/);
  for (let raw of lines) {
    let line = raw.trim();
    if (!line) continue;

    const objMatch = line.match(/^%%BeginObject:\s*"([^"]+)"/) ||
                     line.match(/^%AI5_BeginLayer:\s*(.*)/) ||
                     line.match(/^%%BeginGroup:\s*([^\s]+)/) ||
                     line.match(/^%AI8_BeginGroup:\s*([^\s]+)/);
    if (objMatch) {
      currentId = objMatch[1].replace(/[^a-zA-Z0-9-_]/g, '_');
      continue;
    }

    if (line.startsWith('%') && !line.startsWith('%%')) continue;

    const tokens = line.split(/\s+/);
    const stack: number[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (!t) continue;
      const num = Number(t);
      if (!isNaN(num)) { stack.push(num); continue; }

      switch (t) {
        case 'gsave': {
          stateStack.push(cloneState(state));
          break;
        }
        case 'grestore': {
          if (stateStack.length > 0) {
            emitPath(state.fillColor, state.strokeColor, state.strokeWidth);
            state = stateStack.pop()!;
          }
          break;
        }
        case 'newpath': {
          currentPathD = '';
          inPath = true;
          break;
        }
        case 'm': case 'moveto': {
          if (stack.length >= 2) {
            const y = stack.pop()!, x = stack.pop()!;
            currentPathD += ` M ${mapCoords(x, y)}`;
            inPath = true;
          }
          break;
        }
        case 'l': case 'lineto': {
          if (stack.length >= 2) {
            const y = stack.pop()!, x = stack.pop()!;
            currentPathD += ` L ${mapCoords(x, y)}`;
          }
          break;
        }
        case 'c': case 'curveto': {
          if (stack.length >= 6) {
            const y3 = stack.pop()!, x3 = stack.pop()!;
            const y2 = stack.pop()!, x2 = stack.pop()!;
            const y1 = stack.pop()!, x1 = stack.pop()!;
            currentPathD += ` C ${mapCoords(x1, y1)} ${mapCoords(x2, y2)} ${mapCoords(x3, y3)}`;
          }
          break;
        }
        case 'v': {
          if (stack.length >= 4) {
            const y2 = stack.pop()!, x2 = stack.pop()!;
            const y1 = stack.pop()!, x1 = stack.pop()!;
            currentPathD += ` Q ${mapCoords(x1, y1)} ${mapCoords(x2, y2)}`;
          }
          break;
        }
        case 'y': {
          if (stack.length >= 4) {
            const y2 = stack.pop()!, x2 = stack.pop()!;
            const y1 = stack.pop()!, x1 = stack.pop()!;
            currentPathD += ` T ${mapCoords(x1, y1)} ${mapCoords(x2, y2)}`;
          }
          break;
        }
        case 'h': case 'closepath': {
          currentPathD += ' Z';
          break;
        }
        case 'f': case 'fill': case 'F': {
          emitPath(state.fillColor, 'none', 0);
          break;
        }
        case 's': case 'stroke': case 'S': {
          emitPath('none', state.strokeColor !== 'none' ? state.strokeColor : '#ffffff', state.strokeWidth);
          break;
        }
        case 'b': {
          currentPathD += ' Z';
          emitPath(state.fillColor, state.strokeColor !== 'none' ? state.strokeColor : '#ffffff', state.strokeWidth);
          break;
        }
        case 'B': {
          emitPath(state.fillColor, state.strokeColor !== 'none' ? state.strokeColor : '#ffffff', state.strokeWidth);
          break;
        }
        case 'W': case 'clip': {
          break;
        }
        case 'n': {
          currentPathD = '';
          break;
        }
        case 'rg': case 'setrgbcolor': {
          if (stack.length >= 3) {
            const b = stack.pop()!, g = stack.pop()!, r = stack.pop()!;
            state.fillColor = rgbToHex(r, g, b);
          }
          break;
        }
        case 'RG': {
          if (stack.length >= 3) {
            const b = stack.pop()!, g = stack.pop()!, r = stack.pop()!;
            state.strokeColor = rgbToHex(r, g, b);
          }
          break;
        }
        case 'k': case 'setcmykcolor': {
          if (stack.length >= 4) {
            const k = stack.pop()!, y = stack.pop()!, m = stack.pop()!, c = stack.pop()!;
            const r = 255 * (1 - c) * (1 - k);
            const g = 255 * (1 - m) * (1 - k);
            const b2 = 255 * (1 - y) * (1 - k);
            state.fillColor = rgbToHex(r / 255, g / 255, b2 / 255);
          }
          break;
        }
        case 'K': {
          if (stack.length >= 4) {
            const k = stack.pop()!, y = stack.pop()!, m = stack.pop()!, c = stack.pop()!;
            const r = 255 * (1 - c) * (1 - k);
            const g = 255 * (1 - m) * (1 - k);
            const b2 = 255 * (1 - y) * (1 - k);
            state.strokeColor = rgbToHex(r / 255, g / 255, b2 / 255);
          }
          break;
        }
        case 'g': case 'setgray': {
          if (stack.length >= 1) {
            const gray = Math.min(1, Math.max(0, stack.pop()!));
            const hex = rgbToHex(gray, gray, gray);
            state.fillColor = hex;
          }
          break;
        }
        case 'G': {
          if (stack.length >= 1) {
            const gray = Math.min(1, Math.max(0, stack.pop()!));
            const hex = rgbToHex(gray, gray, gray);
            state.strokeColor = hex;
          }
          break;
        }
        case 'w': case 'setlinewidth': {
          if (stack.length >= 1) state.strokeWidth = Math.max(0, stack.pop()!);
          break;
        }
        case 'J': case 'setlinecap': {
          if (stack.length >= 1) state.lineCap = Math.min(2, Math.max(0, Math.round(stack.pop()!)));
          break;
        }
        case 'j': case 'setlinejoin': {
          if (stack.length >= 1) state.lineJoin = Math.min(2, Math.max(0, Math.round(stack.pop()!)));
          break;
        }
        case 'd': case 'setdash': {
          if (stack.length >= 2) {
            const offset = stack.pop()!;
            const dashLen = Math.round(stack.pop()!);
            state.dashArray = [];
            for (let di = 0; di < dashLen && stack.length > 0; di++) {
              state.dashArray.unshift(stack.pop()!);
            }
            state.dashOffset = offset;
          }
          break;
        }
        case 'translate': {
          if (stack.length >= 2) {
            const ty = stack.pop()!, tx = stack.pop()!;
            state.ctm = applyMatrix(state.ctm, 1, 0, 0, 1, tx, ty);
          }
          break;
        }
        case 'scale': {
          if (stack.length >= 2) {
            const sy = stack.pop()!, sx = stack.pop()!;
            state.ctm = applyMatrix(state.ctm, sx, 0, 0, sy, 0, 0);
          }
          break;
        }
        case 'rotate': {
          if (stack.length >= 1) {
            const angle = stack.pop()!;
            const c = Math.cos(angle), s = Math.sin(angle);
            state.ctm = applyMatrix(state.ctm, c, s, -s, c, 0, 0);
          }
          break;
        }
        case 'concat': {
          if (stack.length >= 6) {
            const f = stack.pop()!, e = stack.pop()!;
            const d = stack.pop()!, c = stack.pop()!;
            const b = stack.pop()!, a = stack.pop()!;
            state.ctm = applyMatrix(state.ctm, a, b, c, d, e, f);
          }
          break;
        }
        case 'matrix': {
          if (stack.length >= 6) {
            stack.pop(); stack.pop(); stack.pop();
            stack.pop(); stack.pop(); stack.pop();
          }
          break;
        }
        case 'initmatrix': {
          state.ctm = [1, 0, 0, 1, 0, 0];
          break;
        }
        case 'setmatrix': {
          if (stack.length >= 6) {
            const f = stack.pop()!, e = stack.pop()!;
            const d = stack.pop()!, c = stack.pop()!;
            const b = stack.pop()!, a = stack.pop()!;
            state.ctm = [a, b, c, d, e, f];
          }
          break;
        }
        case 'currentpoint': {
          stack.push(0); stack.push(0);
          break;
        }
        case 'pop': {
          if (stack.length >= 1) stack.pop();
          break;
        }
        case 'exch': {
          if (stack.length >= 2) {
            const a = stack.pop()!, b2 = stack.pop()!;
            stack.push(a); stack.push(b2);
          }
          break;
        }
        case 'dup': {
          if (stack.length >= 1) stack.push(stack[stack.length - 1]);
          break;
        }
        case 'copy': {
          if (stack.length >= 1) {
            const n = Math.round(stack.pop()!);
            const items = stack.slice(-n);
            stack.push(...items);
          }
          break;
        }
        case 'roll': {
          if (stack.length >= 2) {
            const j = Math.round(stack.pop()!);
            const n = Math.round(stack.pop()!);
            if (n > 0 && stack.length >= n) {
              const sub = stack.splice(stack.length - n);
              const shift = ((j % n) + n) % n;
              for (let ri = 0; ri < shift; ri++) sub.push(sub.shift()!);
              stack.push(...sub);
            }
          }
          break;
        }
        default: {
          if (['findfont', 'scalefont', 'setfont', 'fontsize', 'show', 'ashow', 'widthshow',
               'awidthshow', 'kshow', 'stringwidth', 'charpath', 'textclip',
               'definefont', 'makefont', 'selectfont', 'showpage',
               'setpagedevice', 'setcolorspace', 'uappend', 'ustroke',
               'ufill', 'ueofill', 'sethsbcolor', 'currentrgbcolor',
               'flattenpath', 'reversepath', 'strokepath', 'pathbbox',
               'arct', 'arcto', 'arcn', 'arc', 'ellipse', 'rectfill',
               'rectstroke', 'rectclip', 'xshow', 'yshow', 'xyshow',
               'setoverprint', 'settransfer', 'sethalftone',
               'setflat', 'setmiterlimit', 'vp', 'vpclip',
               'colormap', 'colorimage', 'image'].includes(t)) {
            const argCount = { 'arc': 5, 'arcn': 5, 'arcto': 5, 'rectfill': 4, 'rectstroke': 4,
                               'selectfont': 3, 'sethsbcolor': 3 }[t] || 0;
            for (let ri = 0; ri < argCount && stack.length > 0; ri++) stack.pop();
          }
          break;
        }
      }
    }
  }

  if (currentPathD) {
    emitPath(state.fillColor, state.strokeColor, state.strokeWidth);
  }

  return { width, height, paths, title: 'Compiled EPS Vector' };
}