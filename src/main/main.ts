import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'WingStar Web Builder',
    titleBarStyle: 'default', // Using standard titlebar for cross-platform compatibility
    backgroundColor: '#0c0c10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // Development: Load local Vite development server
    mainWindow.loadURL('http://localhost:5173');
    // DevTools는 수동으로 Ctrl+Shift+I 또는 F12 로만 열 수 있음
  } else {
    // Production: Load compiled index.html
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register IPC handlers
  
  // Handler for opening image files
  ipcMain.handle('dialog:openImage', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Image File',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images (*.png, *.jpg, *.jpeg, *.gif, *.svg, *.webp)', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const assets: { name: string; dataUrl: string; type: string }[] = [];
    for (const filePath of result.filePaths) {
      try {
        const ext = path.extname(filePath).toLowerCase().slice(1);
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        assets.push({ name: path.basename(filePath), dataUrl: `data:${mime};base64,${base64}`, type: ext });
      } catch (err: any) {
        console.error('Failed to read image:', err);
      }
    }
    return assets.length > 0 ? assets : null;
  });

  // Handler for opening files (SVG/EPS)
  ipcMain.handle('dialog:openFile', async () => {
    if (!mainWindow) return null;
    
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Vector Asset (SVG or EPS)',
      properties: ['openFile'],
      filters: [
        { name: 'Vector Graphics (*.svg, *.eps)', extensions: ['svg', 'eps'] },
        { name: 'SVG Graphics (*.svg)', extensions: ['svg'] },
        { name: 'EPS PostScript (*.eps)', extensions: ['eps'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();
      return {
        content,
        filePath,
        fileName: path.basename(filePath),
        isEPS: ext === '.eps'
      };
    } catch (error: any) {
      console.error('Failed to read file:', error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  });

  // Handler for saving/exporting HTML
  ipcMain.handle('dialog:saveHTML', async (_, { defaultName, content }: { defaultName: string; content: string }) => {
    if (!mainWindow) return null;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export HTML File',
      defaultPath: defaultName,
      filters: [
        { name: 'HTML Files (*.html)', extensions: ['html'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (error: any) {
      console.error('Failed to save HTML file:', error);
      throw new Error(`Failed to save file: ${error.message}`);
    }
  });

  // Handler for saving project bundles (multiple HTML pages + shared CSS)
  ipcMain.handle('dialog:exportProject', async (_, { pages, css }: { pages: { [filename: string]: string }; css: string }) => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Export Directory',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const dirPath = result.filePaths[0];
    try {
      const cssPath = path.join(dirPath, 'style.css');
      fs.writeFileSync(cssPath, css, 'utf-8');

      // Write each HTML page
      for (const [filename, html] of Object.entries(pages)) {
        const htmlPath = path.join(dirPath, filename);
        // Inject standard link to style.css in head if not present
        let finalHtml = html;
        if (!html.includes('style.css')) {
          finalHtml = html.replace('</head>', '  <link rel="stylesheet" href="style.css">\n</head>');
        }
        fs.writeFileSync(htmlPath, finalHtml, 'utf-8');
      }

      return { success: true, dirPath, pageCount: Object.keys(pages).length };
    } catch (error: any) {
      console.error('Failed to export project:', error);
      throw new Error(`Failed to export project: ${error.message}`);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
