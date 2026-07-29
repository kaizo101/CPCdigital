const MINIMUM_JWT_SECRET_BYTES = 32
const DEFAULT_PORT = 3001
const DEFAULT_HOST = '127.0.0.1'

export function requireJwtSecret(value: string | undefined): string {
  const secret = value?.trim()

  if (!secret) {
    throw new Error(
      '[auth] JWT_SECRET is required. Generate one with `openssl rand -hex 32`.'
    )
  }

  if (Buffer.byteLength(secret, 'utf8') < MINIMUM_JWT_SECRET_BYTES) {
    throw new Error(
      `[auth] JWT_SECRET must contain at least ${MINIMUM_JWT_SECRET_BYTES} bytes.`
    )
  }

  return secret
}

export function readServerPort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('[server] PORT must be an integer between 1 and 65535.')
  }

  return port
}

export function readServerHost(value: string | undefined): string {
  return value?.trim() || DEFAULT_HOST
}
