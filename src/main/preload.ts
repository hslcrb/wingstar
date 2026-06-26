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
  exportProject: (payload: { pages: { [filename: string]: string }; css: string }) => Promise<{
    success: boolean;
    dirPath: string;
    pageCount: number;
  } | null>;
}

const api: ElectronAPI = {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveHTML: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:saveHTML', { defaultName, content }),
  exportProject: (payload: { pages: { [filename: string]: string }; css: string }) =>
    ipcRenderer.invoke('dialog:exportProject', payload),
};

contextBridge.exposeInMainWorld('electronAPI', api);
