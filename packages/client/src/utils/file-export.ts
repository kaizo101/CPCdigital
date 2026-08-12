import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { getAppRuntime, type AppRuntime } from '../native-runtime'

export interface TextFileExport {
  data: string | Iterable<string>
  filename: string
  mimeType: string
  title?: string
  dialogTitle?: string
}

interface NativeExportAdapter {
  writeCacheFile(options: { path: string; data: string }): Promise<{ uri: string }>
  appendCacheFile(options: { path: string; data: string }): Promise<void>
  shareFile(options: { uri: string; title: string; dialogTitle: string }): Promise<void>
}

const capacitorExportAdapter: NativeExportAdapter = {
  writeCacheFile: ({ path, data }) => Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  }),
  appendCacheFile: async ({ path, data }) => {
    await Filesystem.appendFile({
      path,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
  },
  shareFile: async ({ uri, title, dialogTitle }) => {
    const supported = await Share.canShare()
    if (!supported.value) throw new Error('Android-Dateifreigabe wird auf diesem Gerät nicht unterstützt.')
    await Share.share({ title, files: [uri], dialogTitle })
  },
}

export function safeExportFilename(filename: string): string {
  const basename = filename.replace(/\\/g, '/').split('/').at(-1) ?? ''
  const safe = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 160)
  return safe || 'cpcdigital-export.txt'
}

export async function exportTextFile(
  file: TextFileExport,
  runtime: AppRuntime = getAppRuntime(),
  nativeAdapter: NativeExportAdapter = capacitorExportAdapter,
): Promise<void> {
  const filename = safeExportFilename(file.filename)

  if (runtime === 'android') {
    const parts = textParts(file.data)
    const first = parts.next()
    if (first.done) throw new Error('Cannot export an empty file')
    const result = await nativeAdapter.writeCacheFile({
      path: `exports/${filename}`,
      data: first.value,
    })
    for (let part = parts.next(); !part.done; part = parts.next()) {
      await nativeAdapter.appendCacheFile({ path: `exports/${filename}`, data: part.value })
    }
    await nativeAdapter.shareFile({
      uri: result.uri,
      title: file.title ?? filename,
      dialogTitle: file.dialogTitle ?? 'CPCdigital-Datei exportieren',
    })
    return
  }

  const blob = new Blob(Array.from(textParts(file.data)), { type: file.mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function requestTextFileExport(file: TextFileExport): Promise<void> {
  return exportTextFile(file).catch(error => {
    console.error('[export] Datei konnte nicht exportiert werden.', error)
    window.alert('Die Datei konnte nicht exportiert werden. Bitte versuche es erneut.')
  })
}

function *textParts(data: TextFileExport['data']): Generator<string> {
  if (typeof data === 'string') yield data
  else yield *data
}
