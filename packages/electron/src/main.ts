import { app, BrowserWindow, shell, ipcMain } from 'electron'
import path from 'node:path'

const useDevServer = process.env.USE_DEV_SERVER === 'true'
const DEV_URL = process.env.VITE_URL ?? 'http://localhost:5173'

app.setName('CPCdigital')

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'CPCdigital',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.on('close', () => {
    // Close all replay child windows when main window closes
    for (const w of BrowserWindow.getAllWindows()) {
      if (w !== win) w.close()
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (useDevServer) {
    loadWithRetry(win, DEV_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    const clientDist = path.join(__dirname, '..', '..', 'client', 'dist', 'index.html')
    win.loadFile(clientDist)
  }

  return win
}

function loadWithRetry(win: BrowserWindow, url: string, attempts = 15): void {
  win.loadURL(url).catch(() => {
    if (attempts > 1) {
      setTimeout(() => loadWithRetry(win, url, attempts - 1), 1000)
    } else {
      win.loadURL(url)
    }
  })
}

app.whenReady().then(() => {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist', 'index.html')

  ipcMain.handle('open-replay', (_event, handNumber: number, _data: unknown) => {
    const win = new BrowserWindow({
      width: 1100, height: 800,
      title: `Hand #${handNumber} — Replay`,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    })

    if (useDevServer) {
      win.loadURL(`${DEV_URL}#replay/${handNumber}`)
    } else {
      win.loadFile(clientDist, { hash: `replay/${handNumber}` })
    }

    return true
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
