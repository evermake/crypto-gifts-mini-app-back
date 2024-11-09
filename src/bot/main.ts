import type { Ctx } from './context'
import process from 'node:process'
import { run } from '@grammyjs/runner'
import { Bot } from 'grammy'
import pino from 'pino'
import { loadConfig } from '~/common/config'
import { initMongo } from '~/common/db/mongo'
import { pinoOptionsForEnv } from '~/common/logging'
import { commands, inlineMode } from './handlers'
import { installMiddlewares } from './middlewares'
import { installTransformers } from './transformers'

async function main() {
  const config = loadConfig()
  const logger = pino(pinoOptionsForEnv(config.ENVIRONMENT))
  const db = await initMongo(config.MONGO_URL, logger)
  const bot = new Bot<Ctx>(config.BOT_TOKEN)

  // Provide context.
  bot.use((ctx, next) => {
    ctx.$db = db
    ctx.$config = config
    ctx.$logger = logger
    return next()
  })

  // Register plugins.
  installTransformers(bot.api)
  installMiddlewares(bot)

  // Register handlers.
  bot.use(commands)
  bot.use(inlineMode)

  // Run.
  const runner = run(bot)
  const stopRunner = () => {
    logger.info('Received signal, stopping runner...')
    if (runner.isRunning())
      runner.stop()
  }
  process.once('SIGTERM', stopRunner)
  process.once('SIGINT', stopRunner)
  logger.info('Bot is running.')
  await runner.task()
}

main()
  .then(() => void process.exit(0))
  .catch(console.error)
