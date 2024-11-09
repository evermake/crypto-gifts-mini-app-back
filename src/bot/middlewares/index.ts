import type { Bot } from 'grammy'
import type { Ctx } from '../context'

import auth from './auth'
import localization from './localization'
import logging from './logging'

export function installMiddlewares(bot: Bot<Ctx>) {
  bot.use(logging)
  bot.use(localization)
  bot.use(auth)
  return bot
}
