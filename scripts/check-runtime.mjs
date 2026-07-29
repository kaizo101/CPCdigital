import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number)
const supportsProject = (
  (nodeMajor === 20 && nodeMinor >= 19)
  || (nodeMajor === 22 && nodeMinor >= 12)
  || (nodeMajor > 22 && nodeMajor < 26)
)

if (!supportsProject) {
  console.warn(
    `[runtime] Node ${process.versions.node} is outside the supported range `
    + '(^20.19.0 || >=22.12.0 <26). Node 24 from .nvmrc is recommended.',
  )
}

const electronDir = path.join(ROOT_DIR, 'node_modules', 'electron')

try {
  const relativeBinaryPath = (await readFile(path.join(electronDir, 'path.txt'), 'utf8')).trim()
  if (!relativeBinaryPath) throw new Error('empty Electron path')
  await access(path.join(electronDir, 'dist', relativeBinaryPath), constants.X_OK)
} catch {
  console.error(`
[runtime] The Electron binary is missing or incomplete.

Use the supported Node 24 runtime from .nvmrc, then reinstall dependencies:

  npm install

If npm previously blocked dependency install scripts, remove only the incomplete
node_modules/electron directory and run npm install again. The project contains
a version-pinned allowScripts policy for the required native/build packages.
`.trim())
  process.exit(1)
}
