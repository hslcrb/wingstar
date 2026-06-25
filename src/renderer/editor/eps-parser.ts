export interface ParsedVectorPath {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  id?: string;
}

export interface ParsedVector {
  width: number;
  height: number;
  paths: ParsedVectorPath[];
  title: string;
  rawSvg?: string;
}

/**
 * Parses EPS (Encapsulated PostScript) text contents and compiles vector elements.
 * Checks for embedded SVG XML first. If not found, runs a stack-based parser.
 */
export function parseEPS(content: string): ParsedVector {
  // 1. Check for embedded SVG XML metadata (common in Illustrator/Inkscape exported EPS files)
  const svgStart = content.indexOf('<svg');
  const svgEnd = content.indexOf('</svg>');
  
  if (svgStart !== -1 && svgEnd !== -1) {
    const rawSvg = content.substring(svgStart, svgEnd + 6);
    
    // Extract dimensions from raw SVG string if possible
    let width = 500;
    let height = 500;
    const widthMatch = rawSvg.match(/width=["']([\d.]+)["']/);
    const heightMatch = rawSvg.match(/height=["']([\d.]+)["']/);
    const viewBoxMatch = rawSvg.match(/viewBox=["'][\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)["']/);
    
    if (widthMatch && heightMatch) {
      width = parseFloat(widthMatch[1]);
      height = parseFloat(heightMatch[1]);
    } else if (viewBoxMatch) {
      width = parseFloat(viewBoxMatch[1]);
      height = parseFloat(viewBoxMatch[2]);
    }

    return {
      width,
      height,
      paths: [],
      title: 'Embedded SVG inside EPS',
      rawSvg
    };
  }

  // 2. Parse PostScript vector coordinates
  let bbox = [0, 0, 500, 500]; // Default fallback
  
  // Find BoundingBox in headers
  const bboxMatch = content.match(/%%BoundingBox:\s*(-?\d+)\s*(-?\d+)\s*(-?\d+)\s*(-?\d+)/);
  if (bboxMatch) {
    bbox = [
      parseInt(bboxMatch[1], 10),
      parseInt(bboxMatch[2], 10),
      parseInt(bboxMatch[3], 10),
      parseInt(bboxMatch[4], 10)
    ];
  } else {
    const hiresMatch = content.match(/%%HiResBoundingBox:\s*(-?[\d.]+)\s*(-?[\d.]+)\s*(-?[\d.]+)\s*(-?[\d.]+)/);
    if (hiresMatch) {
      bbox = [
        Math.floor(parseFloat(hiresMatch[1])),
        Math.floor(parseFloat(hiresMatch[2])),
        Math.ceil(parseFloat(hiresMatch[3])),
        Math.ceil(parseFloat(hiresMatch[4]))
      ];
    }
  }

  const [llx, lly, urx, ury] = bbox;
  const width = urx - llx || 500;
  const height = ury - lly || 500;

  // PostScript has origin (0,0) at bottom-left. SVG has it at top-left.
  // We flip coordinates vertically:
  const mapCoords = (x: number, y: number): string => {
    const svgX = x - llx;
    const svgY = ury - y; // vertical flip
    return `${svgX.toFixed(2)},${svgY.toFixed(2)}`;
  };

  const paths: ParsedVectorPath[] = [];
  let currentPathD = '';
  let fillColor = '#ffffff';
  let strokeColor = 'none';
  let strokeWidth = 1;
  let currentId = '';
  
  const stack: number[] = [];

  // Parse line by line to support comments scanning and easy token boundaries
  const lines = content.split(/\r?\n/);
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Detect Illustrator Layer/Object named groups
    const objectMatch = line.match(/^%%BeginObject:\s*"([^"]+)"/) || 
                        line.match(/^%AI5_BeginLayer:\s*(.*)/) || 
                        line.match(/^%%BeginGroup:\s*([^\s]+)/) ||
                        line.match(/^%AI8_BeginGroup:\s*([^\s]+)/);
    if (objectMatch) {
      currentId = objectMatch[1].replace(/[^a-zA-Z0-9-_]/g, '_');
      continue;
    }

    if (line.startsWith('%') && !line.startsWith('%%')) {
      continue; // Skip comments
    }

    // PostScript is space separated. Note: we might have brackets for arrays
    const tokens = line.split(/\s+/);
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;

      // Handle simple numbers
      const num = Number(token);
      if (!isNaN(num)) {
        stack.push(num);
      } else {
        // Evaluate Operator (handles standard PostScript & shortened Illustrator vector commands)
        switch (token) {
          case 'm':
          case 'moveto': {
            if (stack.length >= 2) {
              const y = stack.pop()!;
              const x = stack.pop()!;
              currentPathD += ` M ${mapCoords(x, y)}`;
            }
            break;
          }
          case 'l':
          case 'lineto': {
            if (stack.length >= 2) {
              const y = stack.pop()!;
              const x = stack.pop()!;
              currentPathD += ` L ${mapCoords(x, y)}`;
            }
            break;
          }
          case 'c':
          case 'curveto': {
            if (stack.length >= 6) {
              const y3 = stack.pop()!;
              const x3 = stack.pop()!;
              const y2 = stack.pop()!;
              const x2 = stack.pop()!;
              const y1 = stack.pop()!;
              const x1 = stack.pop()!;
              currentPathD += ` C ${mapCoords(x1, y1)} ${mapCoords(x2, y2)} ${mapCoords(x3, y3)}`;
            }
            break;
          }
          case 'h':
          case 'closepath': {
            currentPathD += ' Z';
            break;
          }
          case 'f':
          case 'fill':
          case 'F': {
            if (currentPathD) {
              paths.push({
                d: currentPathD.trim(),
                fill: fillColor,
                stroke: 'none',
                strokeWidth: 0,
                id: currentId || undefined
              });
              currentPathD = '';
            }
            break;
          }
          case 's':
          case 'stroke':
          case 'S': {
            if (currentPathD) {
              paths.push({
                d: currentPathD.trim(),
                fill: 'none',
                stroke: strokeColor === 'none' ? '#ffffff' : strokeColor,
                strokeWidth: strokeWidth,
                id: currentId || undefined
              });
              currentPathD = '';
            }
            break;
          }
          case 'b': // closepath, fill, stroke
          case 'B': // fill, stroke
            if (currentPathD) {
              if (token === 'b') currentPathD += ' Z';
              paths.push({
                d: currentPathD.trim(),
                fill: fillColor,
                stroke: strokeColor === 'none' ? '#ffffff' : strokeColor,
                strokeWidth: strokeWidth,
                id: currentId || undefined
              });
              currentPathD = '';
            }
            break;
          // RGB Color
          case 'rg': // fill rgb (PDF style)
          case 'setrgbcolor': {
            if (stack.length >= 3) {
              const b = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              const g = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              const r = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              fillColor = `rgb(${r},${g},${b})`;
              if (token === 'setrgbcolor') {
                strokeColor = fillColor;
              }
            }
            break;
          }
          case 'RG': { // stroke rgb
            if (stack.length >= 3) {
              const b = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              const g = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              const r = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              strokeColor = `rgb(${r},${g},${b})`;
            }
            break;
          }
          // Grayscale
          case 'g': // fill gray
          case 'setgray': {
            if (stack.length >= 1) {
              const gray = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              fillColor = `rgb(${gray},${gray},${gray})`;
              if (token === 'setgray') {
                strokeColor = fillColor;
              }
            }
            break;
          }
          case 'G': { // stroke gray
            if (stack.length >= 1) {
              const gray = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              strokeColor = `rgb(${gray},${gray},${gray})`;
            }
            break;
          }
          // CMYK Color
          case 'k': // fill cmyk
          case 'setcmykcolor': {
            if (stack.length >= 4) {
              const k = stack.pop()!;
              const y = stack.pop()!;
              const m = stack.pop()!;
              const c = stack.pop()!;
              const r = Math.round(255 * (1 - c) * (1 - k));
              const g = Math.round(255 * (1 - m) * (1 - k));
              const b = Math.round(255 * (1 - y) * (1 - k));
              fillColor = `rgb(${r},${g},${b})`;
              if (token === 'setcmykcolor') {
                strokeColor = fillColor;
              }
            }
            break;
          }
          case 'K': { // stroke cmyk
            if (stack.length >= 4) {
              const k = stack.pop()!;
              const y = stack.pop()!;
              const m = stack.pop()!;
              const c = stack.pop()!;
              const r = Math.round(255 * (1 - c) * (1 - k));
              const g = Math.round(255 * (1 - m) * (1 - k));
              const b = Math.round(255 * (1 - y) * (1 - k));
              strokeColor = `rgb(${r},${g},${b})`;
            }
            break;
          }
          // Line Width
          case 'w':
          case 'setlinewidth': {
            if (stack.length >= 1) {
              strokeWidth = stack.pop()!;
            }
            break;
          }
          default:
            // Skip unrecognized words or commands to keep execution flow clean
            break;
        }
      }
    }
  }

  return {
    width,
    height,
    paths,
    title: 'Compiled EPS Vector'
  };
}
