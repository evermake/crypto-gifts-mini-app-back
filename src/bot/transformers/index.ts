import type { Api } from 'grammy'
import { autoRetry } from '@grammyjs/auto-retry'
import { parseMode } from '@grammyjs/parse-mode'

export function installTransformers(api: Api): Api {
  api.config.use(autoRetry())
  api.config.use(parseMode('HTML'))
  return api
}
