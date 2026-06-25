import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openFile: () => Promise<{
    content: string;
    filePath: string;
    fileName: string;
    isEPS: boolean;
  } | null>;
  saveHTML: (defaultName: string, content: string) => Promise<{
    success: boolean;
    filePath: string;
  } | null>;
  exportProject: (html: string, css: string) => Promise<{
    success: boolean;
    dirPath: string;
  } | null>;
}

const api: ElectronAPI = {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveHTML: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:saveHTML', { defaultName, content }),
  exportProject: (html: string, css: string) => ipcRenderer.invoke('dialog:exportProject', { html, css }),
};

contextBridge.exposeInMainWorld('electronAPI', api);
