import type { InitData } from '@telegram-apps/init-data-node'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import type { Api } from 'grammy'
import type { Config } from '~/common/config'
import type { CryptoPay } from '~/common/crypto-pay'
import type { Database } from '~/common/db/mongo'
import { en, type Locale } from '~/common/locales'
import type { Logger } from '~/common/logging'
import { extractTmaInitData } from './auth'

export type Context = {
  config: Config
  logger: Logger
  db: Database
  cryptoPay: CryptoPay
  tgApi: Api
  t: Locale
  tmaInitData?: InitData
}

export function contextBuilder({
  db,
  config,
  cryptoPay,
  tgApi,
}: {
  db: Database
  config: Config
  cryptoPay: CryptoPay
  tgApi: Api
}) {
  return async ({ req }: CreateFastifyContextOptions): Promise<Context> => {
    return {
      logger: req.log,
      db,
      cryptoPay,
      config,
      tgApi,
      t: en,
      tmaInitData: extractTmaInitData(req, config.BOT_TOKEN),
    }
  }
}
