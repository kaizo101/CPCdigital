import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const rootDir = path.resolve(import.meta.dirname, '..')
const executable = process.platform === 'win32' ? 'java.exe' : 'java'
const androidStudioHome = process.env.CPC_ANDROID_STUDIO_HOME
const javaHomes = [
  process.env.CPC_ANDROID_JAVA_HOME,
  androidStudioHome ? path.join(androidStudioHome, 'jbr') : undefined,
  path.join(homedir(), 'android-studio', 'jbr'),
  '/opt/android-studio/jbr',
  process.env.JAVA_HOME,
].filter(Boolean)

const javaHome = javaHomes.find(candidate =>
  existsSync(path.join(candidate, 'bin', executable))
)

if (!javaHome) {
  console.error(
    '[android] Kein kompatibles Android-Studio-JDK gefunden. '
    + 'Setze CPC_ANDROID_JAVA_HOME auf den jbr-Ordner deiner Android-Studio-Installation.',
  )
  process.exit(1)
}

const sdkHomes = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(homedir(), 'Android', 'Sdk'),
].filter(Boolean)
const androidHome = sdkHomes.find(candidate => existsSync(candidate))

if (!androidHome) {
  console.error(
    '[android] Kein Android SDK gefunden. '
    + 'Setze ANDROID_HOME auf den SDK-Ordner deiner Android-Studio-Installation.',
  )
  process.exit(1)
}

const gradleWrapper = process.platform === 'win32'
  ? path.join(rootDir, 'android', 'gradlew.bat')
  : path.join(rootDir, 'android', 'gradlew')
const tasks = process.argv.slice(2)
const result = spawnSync(
  gradleWrapper,
  ['-p', path.join(rootDir, 'android'), ...(tasks.length > 0 ? tasks : ['assembleDebug'])],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      ANDROID_HOME: androidHome,
      JAVA_HOME: javaHome,
    },
    stdio: 'inherit',
  },
)

if (result.error) {
  console.error(`[android] Gradle konnte nicht gestartet werden: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
