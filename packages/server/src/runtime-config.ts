import { readServerHost, readServerPort, requireJwtSecret } from './config.js'

export const serverConfig = Object.freeze({
  jwtSecret: requireJwtSecret(process.env.JWT_SECRET),
  host: readServerHost(process.env.HOST),
  port: readServerPort(process.env.PORT),
})
