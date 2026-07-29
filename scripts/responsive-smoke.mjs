import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const BASE_URL = 'http://127.0.0.1:4173/'
const DEBUG_PORT = 9229
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000, portrait: false },
  { name: 'tablet', width: 1024, height: 768, portrait: false },
  { name: 'phone-landscape', width: 844, height: 390, portrait: false },
  { name: 'phone-portrait', width: 390, height: 844, portrait: true },
]

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean)
  const browser = candidates.find(candidate => existsSync(candidate))
  if (!browser) {
    throw new Error('No Chrome/Chromium executable found. Set CHROME_PATH explicitly.')
  }
  return browser
}

function startProcess(command, args) {
  return spawn(command, args, {
    cwd: ROOT_DIR,
    env: process.env,
    stdio: 'ignore',
  })
}

async function waitForHttp(url, attempts = 100) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`)
}

async function stopProcess(child) {
  if (!child || child.exitCode != null || child.signalCode != null) return
  child.kill('SIGTERM')
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 2_000)),
  ])
  if (child.exitCode == null && child.signalCode == null) child.kill('SIGKILL')
}

class DevToolsSession {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl)
    this.nextId = 0
    this.pending = new Map()
    this.socket.onmessage = event => {
      const message = JSON.parse(event.data)
      if (!message.id || !this.pending.has(message.id)) return
      this.pending.get(message.id)(message)
      this.pending.delete(message.id)
    }
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.onopen = resolve
      this.socket.onerror = reject
    })
  }

  send(method, params = {}) {
    return new Promise(resolve => {
      const id = ++this.nextId
      this.pending.set(id, resolve)
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    })
    if (response.result.exceptionDetails) {
      throw new Error(response.result.exceptionDetails.text)
    }
    return response.result.result.value
  }

  close() {
    this.socket.close()
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function validateLandscape(viewport, result) {
  const label = `${viewport.name} (${viewport.width}×${viewport.height})`
  assert(!result.guardVisible, `${label}: portrait guard must be hidden`)
  assert(result.gameVisible, `${label}: game must be visible`)
  assert(result.table, `${label}: table is missing`)
  assert(result.action, `${label}: action panel is missing`)
  assert(result.primaryActionsVisible, `${label}: primary actions are not fully visible`)
  assert(result.seats.length === 6, `${label}: expected 6 visible seats, got ${result.seats.length}`)
  assert(result.cards.length >= 2, `${label}: expected visible cards`)
  assert(result.seatActionOverlaps === 0, `${label}: action panel overlaps ${result.seatActionOverlaps} seat(s)`)
  assert(result.body.width <= viewport.width, `${label}: horizontal page overflow (${result.body.width}px)`)
  assert(result.body.height <= viewport.height, `${label}: vertical page overflow (${result.body.height}px)`)

  for (const [index, seat] of result.seats.entries()) {
    assert(seat.left >= 0, `${label}: seat ${index} leaves viewport on the left`)
    assert(seat.right <= viewport.width, `${label}: seat ${index} leaves viewport on the right`)
    assert(seat.top >= 0, `${label}: seat ${index} leaves viewport at the top`)
    assert(seat.bottom <= viewport.height, `${label}: seat ${index} leaves viewport at the bottom`)
  }

  for (const [index, card] of result.cards.entries()) {
    assert(card.left >= 0, `${label}: card ${index} leaves viewport on the left`)
    assert(card.right <= viewport.width, `${label}: card ${index} leaves viewport on the right`)
    assert(card.top >= 0, `${label}: card ${index} leaves viewport at the top`)
    assert(card.bottom <= viewport.height, `${label}: card ${index} leaves viewport at the bottom`)
  }

  assert(result.action.left >= 0 && result.action.right <= viewport.width, `${label}: action panel is clipped horizontally`)
  assert(result.action.top >= 0 && result.action.bottom <= viewport.height, `${label}: action panel is clipped vertically`)
}

function validatePortrait(viewport, result) {
  const label = `${viewport.name} (${viewport.width}×${viewport.height})`
  assert(result.guardVisible, `${label}: portrait guard must be visible`)
  assert(!result.gameVisible, `${label}: table UI must be hidden behind portrait guard`)
  assert(result.guardText.includes('Bitte ins Querformat drehen'), `${label}: guard explanation is missing`)
  assert(result.guardText.includes('Zurück zum Setup'), `${label}: setup escape is missing`)
  assert(result.body.width <= viewport.width, `${label}: horizontal page overflow (${result.body.width}px)`)
  assert(result.body.height <= viewport.height, `${label}: vertical page overflow (${result.body.height}px)`)
}

async function measureViewport(session, viewport, screenshotDir) {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.name.startsWith('phone'),
  })
  await new Promise(resolve => setTimeout(resolve, 200))

  const result = await session.evaluate(`(() => {
    const rect = element => {
      if (!element) return null
      const value = element.getBoundingClientRect()
      return {
        left: Math.round(value.left),
        top: Math.round(value.top),
        right: Math.round(value.right),
        bottom: Math.round(value.bottom),
        width: Math.round(value.width),
        height: Math.round(value.height),
      }
    }
    const visible = element => (
      !!element
      && getComputedStyle(element).display !== 'none'
      && element.getBoundingClientRect().width > 0
    )
    const action = document.querySelector('.bottom-dock > div')
    const seats = [...document.querySelectorAll('.player-seat')].filter(visible)
    const cards = [...document.querySelectorAll('.playing-card, .playing-card-back')].filter(visible)
    const actionRect = action?.getBoundingClientRect()
    const seatActionOverlaps = actionRect
      ? seats.filter(seat => {
          const seatRect = seat.getBoundingClientRect()
          return (
            seatRect.left < actionRect.right
            && seatRect.right > actionRect.left
            && seatRect.top < actionRect.bottom
            && seatRect.bottom > actionRect.top
          )
        }).length
      : 0
    const buttonLabels = [...document.querySelectorAll('.bottom-dock button')]
      .filter(visible)
      .map(button => button.textContent.trim())

    return {
      body: {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
      },
      guardVisible: visible(document.querySelector('.portrait-guard')),
      guardText: document.querySelector('.portrait-guard')?.textContent ?? '',
      gameVisible: visible(document.querySelector('.landscape-game')),
      table: rect(document.querySelector('.table-shell')),
      action: rect(action),
      seats: seats.map(rect),
      cards: cards.map(rect),
      seatActionOverlaps,
      primaryActionsVisible: (
        buttonLabels.some(label => label.startsWith('Fold'))
        && buttonLabels.some(label => label.startsWith('Call') || label.startsWith('Check'))
        && buttonLabels.some(label => (
          label.startsWith('Raise')
          || label.startsWith('Bet')
          || label.startsWith('All-in')
        ))
      ),
    }
  })()`)

  if (screenshotDir) {
    await mkdir(screenshotDir, { recursive: true })
    const screenshot = await session.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    await writeFile(
      path.join(screenshotDir, `${viewport.name}.png`),
      Buffer.from(screenshot.result.data, 'base64'),
    )
  }

  return result
}

async function main() {
  assert(
    existsSync(path.join(ROOT_DIR, 'packages/client/dist/index.html')),
    'Responsive smoke test requires a client build. Run `npm run build -w @cpc/client` first.',
  )

  const browserPath = findBrowser()
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'cpc-responsive-'))
  let preview
  let browser
  let session

  try {
    preview = startProcess('npm', [
      'run',
      'preview',
      '-w',
      '@cpc/client',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      '4173',
      '--strictPort',
    ])
    await waitForHttp(BASE_URL)

    browser = startProcess(browserPath, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${userDataDir}`,
      BASE_URL,
    ])
    const pages = await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json`).then(response => response.json())
    const page = pages.find(candidate => candidate.type === 'page')
    assert(page, 'Chromium did not expose a page target')

    session = new DevToolsSession(page.webSocketDebuggerUrl)
    await session.connect()
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    let setupReady = false
    for (let attempt = 0; attempt < 100 && !setupReady; attempt += 1) {
      setupReady = await session.evaluate(
        `[...document.querySelectorAll('button')].some(button => button.textContent.includes('Spiel starten'))`,
      )
      if (!setupReady) await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert(setupReady, 'Timed out waiting for the setup screen')
    await session.evaluate(`(() => {
      const startButton = [...document.querySelectorAll('button')]
        .find(button => button.textContent.includes('Spiel starten'))
      startButton.click()
    })()`)

    let heroTurn = false
    for (let attempt = 0; attempt < 300 && !heroTurn; attempt += 1) {
      heroTurn = await session.evaluate(
        `[...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Fold')`,
      )
      if (!heroTurn) await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert(heroTurn, 'Timed out waiting for the Hero action panel')

    const screenshotDir = process.env.CPC_RESPONSIVE_SCREENSHOT_DIR
    for (const viewport of VIEWPORTS) {
      const result = await measureViewport(session, viewport, screenshotDir)
      if (viewport.portrait) validatePortrait(viewport, result)
      else validateLandscape(viewport, result)
      console.log(`✓ ${viewport.name} ${viewport.width}×${viewport.height}`)
    }
  } finally {
    session?.close()
    await stopProcess(browser)
    await stopProcess(preview)
    await rm(userDataDir, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
