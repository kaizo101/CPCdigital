import { app, BrowserWindow, shell } from 'electron'
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
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
