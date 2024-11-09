import type { FastifyBaseLogger, PinoLoggerOptions } from 'fastify/types/logger'
import type { Logger as PinoLogger } from 'pino'
import type { Config } from './config'

export function pinoOptionsForEnv(env: Config['ENVIRONMENT']): PinoLoggerOptions {
  switch (env) {
    case 'dev':
      return {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    case 'prod':
      return { level: 'info' }
  }
}

export type Logger = PinoLogger | FastifyBaseLogger
