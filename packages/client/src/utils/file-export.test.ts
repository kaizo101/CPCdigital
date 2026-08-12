import { describe, expect, it, vi } from 'vitest'
import { exportTextFile, safeExportFilename } from './file-export'

describe('file export', () => {
  it('normalizes filenames before writing into the native cache', () => {
    expect(safeExportFilename('../../Session 8: PLO?.json')).toBe('Session_8__PLO_.json')
    expect(safeExportFilename('...')).toBe('cpcdigital-export.txt')
  })

  it('writes Android exports into the cache and opens the native share sheet', async () => {
    const writeCacheFile = vi.fn().mockResolvedValue({ uri: 'file:///cache/exports/session.json' })
    const appendCacheFile = vi.fn().mockResolvedValue(undefined)
    const shareFile = vi.fn().mockResolvedValue(undefined)

    await exportTextFile({
      data: '{"hands":8}',
      filename: 'session debug.json',
      mimeType: 'application/json',
      title: 'CPCdigital Debug-Session',
    }, 'android', { writeCacheFile, appendCacheFile, shareFile })

    expect(writeCacheFile).toHaveBeenCalledWith({
      path: 'exports/session_debug.json',
      data: '{"hands":8}',
    })
    expect(shareFile).toHaveBeenCalledWith({
      uri: 'file:///cache/exports/session.json',
      title: 'CPCdigital Debug-Session',
      dialogTitle: 'CPCdigital-Datei exportieren',
    })
    expect(appendCacheFile).not.toHaveBeenCalled()
  })

  it('writes streamed Android exports in order before opening the share sheet', async () => {
    const calls: string[] = []
    const writeCacheFile = vi.fn(async ({ data }: { path: string; data: string }) => {
      calls.push(`write:${data}`)
      return { uri: 'file:///cache/exports/session.jsonl' }
    })
    const appendCacheFile = vi.fn(async ({ data }: { path: string; data: string }) => {
      calls.push(`append:${data}`)
    })
    const shareFile = vi.fn(async () => { calls.push('share') })

    await exportTextFile({
      data: ['header\n', 'hand\n', 'end\n'],
      filename: 'session.jsonl',
      mimeType: 'application/x-ndjson',
    }, 'android', { writeCacheFile, appendCacheFile, shareFile })

    expect(calls).toEqual(['write:header\n', 'append:hand\n', 'append:end\n', 'share'])
    expect(appendCacheFile).toHaveBeenCalledTimes(2)
  })
})
